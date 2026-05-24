/*
 * SmartStress AI — Code ESP32 Complet
 * =====================================
 * Capteurs : MAX30102 (pouls + SpO2) + GSR (à ajouter)
 * Affichage : OLED SSD1306 I2C 0.96"
 * Connexion : WiFi → FastAPI Backend
 * 
 * Branchements :
 *   MAX30102 : VCC→3.3V | GND→GND | SDA→GPIO21 | SCL→GPIO22
 *   OLED     : VCC→3.3V | GND→GND | SDA→GPIO21 | SCL→GPIO22
 *   GSR      : VCC→3.3V | GND→GND | SIG→GPIO34  (quand disponible)
 */

#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "MAX30105.h"
#include "heartRate.h"

// ─── Configuration WiFi ────────────────────────────────────────────────────
const char* WIFI_SSID     ="ORANGE_B2C0";     
const char* WIFI_PASSWORD = "8UhtG873";  

// ─── Configuration Backend ─────────────────────────────────────────────────
const char* SERVER_IP   = "192.168.1.95";         
const int   SERVER_PORT = 8000;
String      SERVER_URL;

// ─── Pins ──────────────────────────────────────────────────────────────────
#define GSR_PIN       34    // GPIO34 (ADC) — pour quand le GSR arrive
#define LED_PIN        2    // LED intégrée ESP32

// ─── OLED ──────────────────────────────────────────────────────────────────
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT  64
#define OLED_RESET     -1
#define OLED_ADDR    0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ─── MAX30102 ──────────────────────────────────────────────────────────────
MAX30105 particleSensor;
const byte RATE_SIZE = 4;
byte   rates[RATE_SIZE];
byte   rateSpot = 0;
long   lastBeat = 0;
float  beatsPerMinute = 0;
int    beatAvg = 0;
bool   fingerDetected = false;

// ─── Variables globales ────────────────────────────────────────────────────
float   gsrValue     = 5.0;   // Valeur simulée jusqu'au vrai capteur
int     stressLevel  = 0;     // 0=calme, 1=modéré, 2=élevé
String  stressName   = "Calme";
float   confidence   = 0.85;
unsigned long lastSend     = 0;
unsigned long lastDisplay  = 0;
const long SEND_INTERVAL   = 3000;    // Envoie au backend toutes les 3 sec
const long DISPLAY_INTERVAL = 500;    // Rafraîchit l'écran toutes les 0.5 sec
bool   wifiConnected = false;
int    displayPage   = 0;             // Page affichée sur l'OLED (0 ou 1)

// ─── Setup ─────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  
  Serial.println("\n🧠 SmartStress AI — Démarrage...");

  // Initialiser I2C
  Wire.begin(21, 22);
  Wire.setClock(100000);

  // Initialiser OLED
  initOLED();
  delay(500);
  // Initialiser MAX30102
  initMAX30102();

  // Connecter au WiFi
  connectWiFi();

  SERVER_URL = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/predict";

  Serial.println("✅ Système prêt !");
  showOLEDMessage("Systeme pret!", "SmartStress AI");
  delay(1500);
}

// ─── Loop principal ─────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // 1. Lire le MAX30102 (pouls)
  readHeartRate();

  // 2. Lire le GSR (simulé pour l'instant)
  readGSR();

  // 3. Rafraîchir l'affichage OLED
  if (now - lastDisplay >= DISPLAY_INTERVAL) {
    updateDisplay();
    lastDisplay = now;
  }

  // 4. Envoyer au backend FastAPI
  if (now - lastSend >= SEND_INTERVAL && wifiConnected) {
    sendToBackend();
    lastSend = now;
  }

  // 5. Changer de page OLED toutes les 4 secondes
  if ((now / 4000) % 2 == 0) displayPage = 0;
  else displayPage = 1;
}

// ─── Initialisation OLED ───────────────────────────────────────────────────
void initOLED() {
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("❌ OLED non trouvé !");
    return;
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // Écran de démarrage
  display.setTextSize(2);
  display.setCursor(10, 8);
  display.print("SmartStress");
  display.setTextSize(1);
  display.setCursor(35, 30);
  display.print("AI v1.0");
  display.setCursor(20, 48);
  display.print("Initialisation...");
  display.display();
  delay(2000);
  Serial.println("✅ OLED initialisé");
}

// ─── Initialisation MAX30102 ───────────────────────────────────────────────
void initMAX30102() {
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("❌ MAX30102 non trouvé !");
    showOLEDMessage("MAX30102", "Non trouve!");
    delay(2000);
    return;
  }

  // Configuration du capteur
  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(0x0A);   // LED rouge faible
  particleSensor.setPulseAmplitudeGreen(0);     // LED verte off

  Serial.println("✅ MAX30102 initialisé");
}

// ─── Connexion WiFi ─────────────────────────────────────────────────────────
void connectWiFi() {
  showOLEDMessage("WiFi...", String(WIFI_SSID));
  Serial.print("📶 Connexion à ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n✅ WiFi connecté !");
    Serial.print("   IP: ");
    Serial.println(WiFi.localIP());
    showOLEDMessage("WiFi OK!", WiFi.localIP().toString());
  } else {
    wifiConnected = false;
    Serial.println("\n⚠️ WiFi non connecté — mode hors ligne");
    showOLEDMessage("WiFi failed", "Mode offline");
  }
  delay(1500);
}

// ─── Lecture fréquence cardiaque ───────────────────────────────────────────
void readHeartRate() {
  long irValue = particleSensor.getIR();

  // Vérifier si un doigt est posé (IR > 50000)
  fingerDetected = (irValue > 50000);

  if (!fingerDetected) {
    beatsPerMinute = 0;
    beatAvg = 0;
    return;
  }

  if (checkForBeat(irValue)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();

    beatsPerMinute = 60 / (delta / 1000.0);

    if (beatsPerMinute < 255 && beatsPerMinute > 20) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= RATE_SIZE;

      // Moyenne sur les dernières mesures
      beatAvg = 0;
      for (byte x = 0; x < RATE_SIZE; x++) beatAvg += rates[x];
      beatAvg /= RATE_SIZE;
    }
  }
}

// ─── Lecture GSR ───────────────────────────────────────────────────────────
void readGSR() {
  // ⚠️ GSR simulé jusqu'à réception du vrai capteur
  // Quand le GSR Grove arrive, remplace par :
  // int rawGSR = analogRead(GSR_PIN);
  // gsrValue = map(rawGSR, 0, 4095, 0, 200) / 10.0;

  // Simulation réaliste basée sur le pouls
  float baseGSR = 4.0;
  if (beatAvg > 90) baseGSR = 10.0 + random(-20, 20) / 10.0;
  else if (beatAvg > 75) baseGSR = 6.5 + random(-15, 15) / 10.0;
  else baseGSR = 3.0 + random(-10, 10) / 10.0;
  
  gsrValue = constrain(baseGSR, 0.5, 25.0);
}

// ─── Mise à jour affichage OLED ─────────────────────────────────────────────
void updateDisplay() {
  display.clearDisplay();

  if (!fingerDetected) {
    // Pas de doigt détecté
    displayNoFinger();
  } else if (displayPage == 0) {
    // Page 1 : Métriques principales
    displayMetricsPage();
  } else {
    // Page 2 : Niveau de stress
    displayStressPage();
  }

  display.display();
}

void displayNoFinger() {
  // En-tête
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("SmartStress AI");
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);

  // Message
  display.setTextSize(1);
  display.setCursor(15, 20);
  display.print("Pose ton doigt");
  display.setCursor(20, 32);
  display.print("sur le capteur");
  display.setCursor(35, 48);
  display.print("MAX30102");

  // Animation points
  static int dotCount = 0;
  for (int i = 0; i < (dotCount % 4); i++) {
    display.fillCircle(52 + i * 8, 57, 2, SSD1306_WHITE);
  }
  dotCount++;
}

void displayMetricsPage() {
  // En-tête
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("SmartStress AI");
  
  // WiFi indicator
  if (wifiConnected) {
    display.setCursor(108, 0);
    display.print("W");
  }
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);

  // Pouls
  display.setCursor(0, 14);
  display.print("Pouls:");
  display.setTextSize(2);
  display.setCursor(0, 24);
  if (beatAvg > 0) {
    display.print(beatAvg);
    display.setTextSize(1);
    display.setCursor(30, 30);
    display.print("bpm");
  } else {
    display.print("--");
    display.setTextSize(1);
    display.setCursor(30, 30);
    display.print("bpm");
  }

  // Séparateur
  display.drawLine(70, 12, 70, 54, SSD1306_WHITE);

  // GSR
  display.setTextSize(1);
  display.setCursor(74, 14);
  display.print("GSR:");
  display.setTextSize(2);
  display.setCursor(74, 24);
  display.print(gsrValue, 1);
  display.setTextSize(1);
  display.setCursor(110, 30);
  display.print("uS");

  // Barre progression pouls
  display.setCursor(0, 48);
  display.setTextSize(1);
  display.print("HR:");
  int barW = constrain(map(beatAvg, 40, 160, 0, 90), 0, 90);
  display.drawRect(20, 49, 90, 8, SSD1306_WHITE);
  display.fillRect(20, 49, barW, 8, SSD1306_WHITE);
}

void displayStressPage() {
  // En-tête
  display.setTextSize(1);
  display.setCursor(25, 0);
  display.print("Niveau Stress");
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);

  // Emoji niveau de stress
  display.setTextSize(1);
  display.setCursor(54, 15);
  if (stressLevel == 0) display.print(":)");
  else if (stressLevel == 1) display.print(":|");
  else display.print(":(");

  // Nom du niveau
  display.setTextSize(2);
  int nameX = (128 - stressName.length() * 12) / 2;
  display.setCursor(nameX > 0 ? nameX : 0, 28);
  display.print(stressName);

  // Barre de stress
  display.setTextSize(1);
  display.setCursor(0, 50);
  display.print("0");
  display.setCursor(58, 50);
  display.print("1");
  display.setCursor(118, 50);
  display.print("2");
  
  display.drawRect(8, 56, 112, 6, SSD1306_WHITE);
  int stressBarW = map(stressLevel, 0, 2, 0, 112);
  display.fillRect(8, 56, stressBarW, 6, SSD1306_WHITE);

  // Confiance ML
  display.setCursor(85, 14);
  display.print("ML:");
  display.setCursor(85, 23);
  display.print((int)(confidence * 100));
  display.print("%");
}

// ─── Envoi au backend FastAPI ───────────────────────────────────────────────
void sendToBackend() {
  // Ne pas envoyer si pas de doigt ou HR invalide
  float hrToSend = (beatAvg > 0) ? beatAvg : 72.0;   // 72 bpm par défaut

  // Construire le JSON
  StaticJsonDocument<200> doc;
  doc["gsr"]        = gsrValue;
  doc["heart_rate"] = hrToSend;
  doc["source"]     = "esp32";

  String jsonBody;
  serializeJson(doc, jsonBody);

  // Envoyer la requête
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000);

  int httpCode = http.POST(jsonBody);

  if (httpCode == 200) {
    String response = http.getString();

    // Parser la réponse
    StaticJsonDocument<300> resp;
    DeserializationError error = deserializeJson(resp, response);

    if (!error) {
      stressLevel = resp["stress_label"] | 0;
      stressName  = resp["stress_name"]  | "calme";
      confidence  = resp["confidence"]   | 0.85;

      // Majuscule première lettre
      if (stressName.length() > 0) {
        stressName[0] = toupper(stressName[0]);
      }

      // LED selon le stress
      digitalWrite(LED_PIN, stressLevel == 2 ? HIGH : LOW);

      Serial.printf("✅ Envoi OK | GSR: %.1f µS | HR: %d bpm | Stress: %s (%.0f%%)\n",
        gsrValue, beatAvg, stressName.c_str(), confidence * 100);
    }
  } else {
    Serial.printf("❌ Erreur HTTP: %d\n", httpCode);
    // Reconnexion WiFi si nécessaire
    if (WiFi.status() != WL_CONNECTED) {
      wifiConnected = false;
      connectWiFi();
    }
  }

  http.end();
}

// ─── Utilitaire : message OLED ─────────────────────────────────────────────

void showOLEDMessage(String line1, String line2) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);   // ← ligne manquante !
  display.setTextSize(1);
  display.setCursor(10, 16);
  display.print(line1);
  display.setCursor(10, 32);
  display.print(line2);
  display.display();
}
