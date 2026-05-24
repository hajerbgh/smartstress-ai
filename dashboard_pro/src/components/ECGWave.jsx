import React, { useEffect, useRef } from 'react';

export default function ECGWave({ stressLevel = 0, gsr = 5, heartRate = 70 }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const offsetRef = useRef(0);

  // ChillWaves Colors
  const color = stressLevel === 2 ? '#F28C7E' : stressLevel === 1 ? '#F5C6A5' : '#5BB5B5';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const mid = H / 2;

    // Amplitude based on stress
    const amp = 20 + stressLevel * 25 + (gsr / 20) * 15;
    // Frequency based on heart rate
    const freq = 0.03 + (heartRate - 60) * 0.0003;

    function generateECG(x, offset) {
      const t = (x + offset) * freq;
      const phase = t % (Math.PI * 2);

      // Simulate ECG shape: flat → P wave → QRS complex → T wave
      if (phase < 0.8) return Math.sin(phase * 2) * amp * 0.15;           // P wave
      if (phase < 1.0) return -amp * 0.3;                                   // Q dip
      if (phase < 1.1) return amp * (1 + stressLevel * 0.5);               // R peak
      if (phase < 1.2) return -amp * 0.2;                                   // S dip
      if (phase < 2.5) return Math.sin((phase - 1.2) * 1.5) * amp * 0.3;  // T wave
      return 0;                                                               // flat
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Background grid (cw-neutral-100)
      ctx.strokeStyle = '#F3F4F6';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Glow effect
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;

      // Main ECG line
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      for (let x = 0; x < W; x++) {
        const y = mid + generateECG(x, offsetRef.current);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Gradient fill under curve
      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, color + '33');
      gradient.addColorStop(1, color + '00');

      ctx.beginPath();
      for (let x = 0; x < W; x++) {
        const y = mid + generateECG(x, offsetRef.current);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Scrolling dot indicator
      const dotX = W * 0.85;
      const dotY = mid + generateECG(dotX, offsetRef.current);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;

      offsetRef.current += 2 + stressLevel * 0.5 + heartRate * 0.02;
      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [stressLevel, gsr, heartRate, color]);

  return (
    <canvas
      ref={canvasRef}
      width={700} height={140}
      className="w-full h-[140px] rounded-[16px] bg-white border border-cw-neutral-100"
    />
  );
}
