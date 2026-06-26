"use client";

import { useEffect, useRef } from "react";

const STAR_COUNT = 300;

const STAR_COLORS = [
  "rgba(255,255,255,0.9)",
  "rgba(200,220,255,0.8)",
  "rgba(255,240,200,0.7)",
  "rgba(255,200,150,0.6)",
  "rgba(180,200,255,0.7)",
];

export default function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < STAR_COUNT; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 1.5 + 0.3;
        const color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
        const alpha = Math.random() * 0.5 + 0.3;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = color.replace(/[\d.]+\)$/, `${alpha})`);
        ctx.fill();
      }
    };

    window.addEventListener("resize", resize);
    resize();

    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
