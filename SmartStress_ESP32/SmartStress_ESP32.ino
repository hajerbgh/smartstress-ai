/*
 * SmartStress AI — Mode Simulation + OLED
 * =========================================
 * Affichage : OLED SSD1306 I2C 0.96"
 * Connexion : WiFi → HF Space (cloud, même DB que dashboard + mobile)
 *
 * Branchements OLED :
 *   VCC → 3.3V | GND → GND | SDA → GPIO21 | SCL → GPIO22
 */

#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ─── Configuration WiFi ────────────────────────────────────────────────────
const char* WIFI_SSID     = "ORANGE_B2C0";
const char* WIFI_PASSWORD = "8UhtG873";

// ─── Configuration Backend (HF Space cloud — même DB que dashboard + mobile)
const char* BASE_URL    = "https://hajerbgh-smartstress-api.hf.space";
const char* PREDICT_URL = "https://hajerbgh-smartstress-api.hf.space/predict";
const char* SLEEP_URL   = "https://hajerbgh-smartstress-api.hf.space/sleep/estimate";
const char* STEPS_URL   = "https://hajerbgh-smartstress-api.hf.space/steps/today";

// ─── LED intégrée ──────────────────────────────────────────────────────────
#define LED_PIN 2

// ─── OLED SSD1306 ──────────────────────────────────────────────────────────
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT  64
#define OLED_RESET     -1
#define OLED_ADDR    0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ─── Variables de simulation ───────────────────────────────────────────────
float  gsrValue    = 5.0;
float  heartRate   = 72.0;
int    stressLevel = 0;
String stressName  = "Calme";
float  confidence  = 0.85;

// ─── Données bien-être (depuis backend) ───────────────────────────────────
float  sleepHours  = 0.0;
int    stepsToday  = 0;

// ─── Timing ────────────────────────────────────────────────────────────────
unsigned long lastSend    = 0;
unsigned long lastDisplay = 0;
unsigned long lastSim     = 0;
unsigned long lastWellness = 0;
const long SEND_INTERVAL     = 4000;    // envoi backend toutes les 4 sec
const long DISPLAY_INTERVAL  =  500;    // rafraîchit OLED toutes les 0.5 sec
const long SIM_INTERVAL      = 2000;    // nouvelle valeur simulée toutes les 2 sec
const long WELLNESS_INTERVAL = 30000;   // fetch sommeil+pas toutes les 30 sec

bool wifiConnected = false;
int  displayPage   = 0;

// ─── Setup ─────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("\nSmartStress AI — Démarrage simulation...");

  Wire.begin(21, 22);
  Wire.setClock(100000);

  initOLED();
  connectWiFi();

  // Fetch sommeil + pas dès le démarrage
  if (wifiConnected) {
    showOLEDMessage("Chargement...", "donnees cloud");
    fetchWellnessData();
    lastWellness = millis();
  }

  showOLEDMessage("Systeme pret!", "Mode Simulation");
  delay(1500);
  Serial.println("Systeme pret !");
}

// ─── Loop ──────────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  if (now - lastSim >= SIM_INTERVAL) {
    simulateValues();
    lastSim = now;
  }

  if (now - lastDisplay >= DISPLAY_INTERVAL) {
    updateDisplay();
    lastDisplay = now;
  }

  if (now - lastSend >= SEND_INTERVAL && wifiConnected) {
    sendToBackend();
    lastSend = now;
  }

  if (now - lastWellness >= WELLNESS_INTERVAL && wifiConnected) {
    fetchWellnessData();
    lastWellness = now;
  }

  displayPage = (now / 5000) % 4;
}

// ─── Simulation valeurs GSR + HR ───────────────────────────────────────────
void simulateValues() {
  // HR entre 58 et 110 bpm, dérive lente
  float drift = random(-30, 30) / 10.0;
  heartRate = constrain(heartRate + drift, 58.0, 110.0);

  // GSR corrélé au HR
  float baseGSR;
  if (heartRate > 95)      baseGSR = 10.0 + random(-20, 20) / 10.0;
  else if (heartRate > 78) baseGSR = 6.5  + random(-15, 15) / 10.0;
  else                     baseGSR = 3.0  + random(-10, 10) / 10.0;
  gsrValue = constrain(baseGSR, 0.5, 25.0);
}

// ─── OLED : initialisation ─────────────────────────────────────────────────
void initOLED() {
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("OLED non trouve !");
    return;
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(2);
  display.setCursor(10, 8);
  display.print("SmartStress");
  display.setTextSize(1);
  display.setCursor(38, 30);
  display.print("AI v1.0");
  display.setCursor(18, 48);
  display.print("Simulation...");
  display.display();
  delay(2000);
  Serial.println("OLED OK");
}

// ─── OLED : mise à jour ────────────────────────────────────────────────────
void updateDisplay() {
  display.clearDisplay();
  if      (displayPage == 0) displayMetricsPage();
  else if (displayPage == 1) displayStressPage();
  else if (displayPage == 2) displayTipsPage();
  else                       displayWellnessPage();
  display.display();
}

void displayMetricsPage() {
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("SmartStress AI");
  if (wifiConnected) { display.setCursor(108, 0); display.print("W"); }
  display.setCursor(92, 0);
  display.print("SIM");
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);

  // Pouls
  display.setCursor(0, 14);
  display.print("Pouls:");
  display.setTextSize(2);
  display.setCursor(0, 24);
  display.print((int)heartRate);
  display.setTextSize(1);
  display.setCursor(30, 30);
  display.print("bpm");

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

  // Barre HR
  display.setCursor(0, 48);
  display.setTextSize(1);
  display.print("HR:");
  int barW = constrain(map((int)heartRate, 40, 160, 0, 90), 0, 90);
  display.drawRect(20, 49, 90, 8, SSD1306_WHITE);
  display.fillRect(20, 49, barW, 8, SSD1306_WHITE);
}

void displayStressPage() {
  display.setTextSize(1);
  display.setCursor(25, 0);
  display.print("Niveau Stress");
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);

  // Emoji
  display.setCursor(54, 15);
  if (stressLevel == 0)      display.print(":)");
  else if (stressLevel == 1) display.print(":|");
  else                       display.print(":(");

  // Nom
  display.setTextSize(2);
  int nameX = (128 - stressName.length() * 12) / 2;
  display.setCursor(max(nameX, 0), 28);
  display.print(stressName);

  // Barre
  display.setTextSize(1);
  display.setCursor(0, 50);  display.print("0");
  display.setCursor(58, 50); display.print("1");
  display.setCursor(118, 50); display.print("2");
  display.drawRect(8, 56, 112, 6, SSD1306_WHITE);
  display.fillRect(8, 56, map(stressLevel, 0, 2, 0, 112), 6, SSD1306_WHITE);

}

// ─── OLED : conseils bien-être ────────────────────────────────────────────
void displayTipsPage() {
  display.setTextSize(1);
  display.setCursor(28, 0);
  display.print("Conseil ChillBot");
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);

  // Icône selon niveau
  display.setTextSize(2);
  display.setCursor(56, 13);
  if      (stressLevel == 0) display.print(":)");
  else if (stressLevel == 1) display.print(":|");
  else                       display.print(":(");

  display.setTextSize(1);

  if (stressLevel == 0) {
    display.setCursor(8, 34);
    display.print("Vous etes calme!");
    display.setCursor(8, 46);
    display.print("Gardez ce rythme.");
    display.setCursor(8, 56);
    display.print("Continuez ainsi :)");
  }
  else if (stressLevel == 1) {
    display.setCursor(8, 34);
    display.print("Stress modere.");
    display.setCursor(8, 46);
    display.print("Respirez lentement.");
    display.setCursor(8, 56);
    display.print("Faites une pause.");
  }
  else {
    display.setCursor(8, 34);
    display.print("Stress eleve!");
    display.setCursor(8, 46);
    display.print("Arretez-vous 5 min.");
    display.setCursor(8, 56);
    display.print("Buvez de l'eau.");
  }
}

// ─── OLED : sommeil + pas ────────────────────────────────────────────────
void displayWellnessPage() {
  display.setTextSize(1);
  display.setCursor(22, 0);
  display.print("Sante & Activite");
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);

  // Sommeil
  display.setCursor(0, 15);
  display.print("Sommeil:");
  display.setTextSize(2);
  display.setCursor(0, 25);
  if (sleepHours > 0) {
    display.print(sleepHours, 1);
    display.setTextSize(1);
    display.setCursor(42, 31);
    display.print("h");
  } else {
    display.print("--");
    display.setTextSize(1);
    display.setCursor(30, 31);
    display.print("h");
  }

  // Séparateur vertical
  display.drawLine(70, 12, 70, 54, SSD1306_WHITE);

  // Pas
  display.setTextSize(1);
  display.setCursor(74, 15);
  display.print("Pas:");
  display.setTextSize(2);
  display.setCursor(74, 25);
  if (stepsToday >= 1000) {
    display.print(stepsToday / 1000);
    display.print(".");
    display.print((stepsToday % 1000) / 100);
    display.setTextSize(1);
    display.setCursor(118, 31);
    display.print("k");
  } else {
    display.print(stepsToday);
    display.setTextSize(1);
  }

  // Objectif 10k
  display.setTextSize(1);
  display.setCursor(0, 48);
  display.print("Objectif 10000 pas");
  int barW = constrain(map(stepsToday, 0, 10000, 0, 118), 0, 118);
  display.drawRect(0, 57, 118, 5, SSD1306_WHITE);
  display.fillRect(0, 57, barW, 5, SSD1306_WHITE);
}

// ─── Fetch sommeil + pas depuis backend (HTTPS) ───────────────────────────
void fetchWellnessData() {
  // Fetch sommeil
  {
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    http.begin(client, SLEEP_URL);
    http.setTimeout(6000);
    if (http.GET() == 200) {
      StaticJsonDocument<300> doc;
      if (!deserializeJson(doc, http.getString())) {
        float h = doc["sleep_hours"] | 0.0;
        if (h > 0) sleepHours = h;
      }
    }
    http.end();
  }

  delay(200);

  // Fetch pas
  {
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    http.begin(client, STEPS_URL);
    http.setTimeout(6000);
    if (http.GET() == 200) {
      StaticJsonDocument<100> doc;
      if (!deserializeJson(doc, http.getString())) {
        stepsToday = doc["steps"] | 0;
      }
    }
    http.end();
  }

  Serial.printf("Wellness | Sommeil:%.1fh | Pas:%d\n", sleepHours, stepsToday);
}

// ─── WiFi ──────────────────────────────────────────────────────────────────
void connectWiFi() {
  showOLEDMessage("WiFi...", String(WIFI_SSID));
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\nWiFi OK : " + WiFi.localIP().toString());
    showOLEDMessage("WiFi OK!", WiFi.localIP().toString());
  } else {
    wifiConnected = false;
    Serial.println("\nWiFi echoue — mode offline");
    showOLEDMessage("WiFi failed", "Mode offline");
  }
  delay(1500);
}

// ─── Envoi backend (HTTPS → HF Space) ─────────────────────────────────────
void sendToBackend() {
  StaticJsonDocument<200> doc;
  doc["gsr"]        = gsrValue;
  doc["heart_rate"] = heartRate;
  doc["source"]     = "esp32";

  String jsonBody;
  serializeJson(doc, jsonBody);

  WiFiClientSecure client;
  client.setInsecure();   // demo : pas de vérif certificat SSL

  HTTPClient http;
  http.begin(client, PREDICT_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  int httpCode = http.POST(jsonBody);

  if (httpCode == 200) {
    StaticJsonDocument<300> resp;
    if (!deserializeJson(resp, http.getString())) {
      stressLevel = resp["stress_label"] | 0;
      confidence  = resp["confidence"]   | 0.85;
      if      (stressLevel == 0) stressName = "Calme";
      else if (stressLevel == 1) stressName = "Modere";
      else                       stressName = "Eleve";
      digitalWrite(LED_PIN, stressLevel == 2 ? HIGH : LOW);
      Serial.printf("OK | GSR:%.1f HR:%.0f Stress:%s (%.0f%%)\n",
        gsrValue, heartRate, stressName.c_str(), confidence * 100);
    }
  } else {
    Serial.printf("Erreur HTTP: %d\n", httpCode);
    if (WiFi.status() != WL_CONNECTED) { wifiConnected = false; connectWiFi(); }
  }
  http.end();
}

// ─── Message OLED ──────────────────────────────────────────────────────────
void showOLEDMessage(String line1, String line2) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(10, 16);
  display.print(line1);
  display.setCursor(10, 32);
  display.print(line2);
  display.display();
}
