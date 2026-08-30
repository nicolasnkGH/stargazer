import * as THREE from "three";

/**
 * Shared Three.js helpers ported from the legacy vanilla build
 * (web/planets3d.js v10 / web/moon3d.js v6) so the Next.js cards can
 * restore the same surface detail and interactivity.
 */

/* ── Procedural canvas fallbacks (only used if a texture file fails to load) ── */

function drawEarth(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const og = ctx.createLinearGradient(0, 0, 0, H);
  og.addColorStop(0, "#0e3870"); og.addColorStop(0.5, "#1a6ab8"); og.addColorStop(1, "#0e3870");
  ctx.fillStyle = og; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#4a8a3a";
  ctx.beginPath(); ctx.ellipse(W*0.60, H*0.28, W*0.20, H*0.14, -0.15, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(W*0.55, H*0.52, W*0.07, H*0.22, 0,    0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(W*0.19, H*0.32, W*0.09, H*0.20, 0.1,  0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#3a7a2a";
  ctx.beginPath(); ctx.ellipse(W*0.24, H*0.62, W*0.06, H*0.18, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#8a7a40";
  ctx.beginPath(); ctx.ellipse(W*0.79, H*0.66, W*0.066, H*0.09, 0.2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(220,235,255,0.88)";
  ctx.fillRect(0, 0, W, H*0.06); ctx.fillRect(0, H*0.92, W, H);
  ctx.save(); ctx.globalAlpha = 0.44;
  for (let i = 0; i < 14; i++) {
    const cy = Math.random() * H;
    const cg = ctx.createLinearGradient(0, cy-10, 0, cy+10);
    cg.addColorStop(0, "rgba(255,255,255,0)"); cg.addColorStop(0.5, "rgba(255,255,255,0.65)"); cg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.moveTo(0, cy);
    for (let x = 0; x <= W; x += 10) ctx.lineTo(x, cy + Math.sin(x*0.02+i)*11);
    ctx.lineTo(W, cy+22); ctx.lineTo(0, cy+22); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawSun(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const bg = ctx.createRadialGradient(W*0.42,H*0.42,0,W*0.5,H*0.5,W*0.55);
  bg.addColorStop(0,"#fff8d0"); bg.addColorStop(0.3,"#ffe060"); bg.addColorStop(0.7,"#ff8800"); bg.addColorStop(1,"#cc3300");
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.globalAlpha=0.12;
  for(let i=0;i<280;i++){
    const gx=Math.random()*W, gy=Math.random()*H, gr=Math.random()*8+3;
    ctx.fillStyle="rgba(255,195,50,0.85)";
    ctx.beginPath(); ctx.arc(gx,gy,gr,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawPluto(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#987860"); bg.addColorStop(0.5,"#a88870"); bg.addColorStop(1,"#886858");
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.globalAlpha=0.55; ctx.fillStyle="#e8ddc0";
  ctx.beginPath(); ctx.ellipse(W*0.55,H*0.50,W*0.13,H*0.13,0.3,0,Math.PI*2); ctx.fill(); ctx.restore();
  for(let i=0;i<30;i++){
    ctx.save(); ctx.globalAlpha=0.22+Math.random()*0.22;
    ctx.fillStyle=Math.random()>0.5?"#6a5848":"#ccc0a8";
    ctx.beginPath(); ctx.arc(Math.random()*W,Math.random()*H,Math.random()*W*0.022+W*0.005,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

/** Procedural texture fallback for a planet that has no (or failed) texture file. */
export function makeProceduralTexture(name: string): THREE.CanvasTexture {
  const W=512, H=256, cv=document.createElement("canvas");
  cv.width=W; cv.height=H;
  const ctx=cv.getContext("2d")!;
  if (name==="earth" || name==="Earth") drawEarth(ctx,W,H);
  else if (name==="sun" || name==="Sun") drawSun(ctx,W,H);
  else drawPluto(ctx,W,H);
  return new THREE.CanvasTexture(cv);
}

/* ── Procedural bump maps — per-planet surface relief ─────────────────────── */

/**
 * Generates a 512×256 grayscale canvas with per-planet surface detail
 * (craters for rocky worlds, bands for gas giants). Ported verbatim from
 * the legacy `makePlanetBump()` in web/planets3d.js.
 */
export function makePlanetBump(name: string): HTMLCanvasElement {
  const W = 512, H = 256;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;

  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, W, H);

  const key = name.toLowerCase();
  switch (key) {
    case "mercury":
      for (let i = 0; i < 60; i++) {
        const cx = Math.random() * W, cy = Math.random() * H;
        const r = Math.random() * W * 0.025 + W * 0.003;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, "rgba(30,30,30,0.5)");
        g.addColorStop(0.6, "rgba(30,30,30,0.3)");
        g.addColorStop(0.8, "rgba(180,180,180,0.25)");
        g.addColorStop(1, "rgba(128,128,128,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2); ctx.fill();
      }
      break;

    case "venus":
      ctx.save(); ctx.globalAlpha = 0.15;
      for (let y = 0; y < H; y += 6) {
        const offset = Math.sin(y * 0.03) * 30;
        ctx.fillStyle = (y % 12 < 6) ? "#999" : "#666";
        ctx.fillRect(offset, y, W, 6);
      }
      ctx.restore();
      break;

    case "earth":
      ctx.save(); ctx.globalAlpha = 0.12;
      for (let i = 0; i < 200; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? "#999" : "#666";
        ctx.beginPath();
        ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 12 + 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;

    case "mars":
      ctx.save(); ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#aaa";
      ctx.fillRect(0, 0, W, H * 0.05);
      ctx.fillRect(0, H * 0.95, W, H * 0.05);
      ctx.restore();
      for (let i = 0; i < 35; i++) {
        const cx = Math.random() * W, cy = Math.random() * H;
        const r = Math.random() * W * 0.03 + W * 0.004;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, "rgba(40,40,40,0.4)");
        g.addColorStop(0.7, "rgba(40,40,40,0.2)");
        g.addColorStop(1, "rgba(128,128,128,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2); ctx.fill();
      }
      break;

    case "jupiter":
      ctx.save(); ctx.globalAlpha = 0.25;
      for (let y = 0; y < H; y += 4) {
        const band = Math.sin(y / H * Math.PI * 12) * 0.5 + 0.5;
        ctx.fillStyle = band > 0.5 ? "#a0a0a0" : "#606060";
        ctx.fillRect(0, y, W, 4);
      }
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#555";
      ctx.beginPath();
      ctx.ellipse(W * 0.65, H * 0.58, W * 0.06, H * 0.04, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;

    case "saturn":
      ctx.save(); ctx.globalAlpha = 0.2;
      for (let y = 0; y < H; y += 5) {
        const band = Math.sin(y / H * Math.PI * 8) * 0.5 + 0.5;
        ctx.fillStyle = band > 0.5 ? "#a8a8a8" : "#585858";
        ctx.fillRect(0, y, W, 5);
      }
      ctx.restore();
      break;

    case "uranus":
      ctx.save(); ctx.globalAlpha = 0.08;
      for (let y = 0; y < H; y += 8) {
        ctx.fillStyle = (y % 16 < 8) ? "#909090" : "#707070";
        ctx.fillRect(0, y, W, 8);
      }
      ctx.restore();
      break;

    case "neptune":
      ctx.save(); ctx.globalAlpha = 0.22;
      for (let y = 0; y < H; y += 5) {
        const band = Math.sin(y / H * Math.PI * 10) * 0.5 + 0.5;
        ctx.fillStyle = band > 0.5 ? "#888" : "#444";
        ctx.fillRect(0, y, W, 5);
      }
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.ellipse(W * 0.4, H * 0.4, W * 0.05, H * 0.03, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;

    case "sun":
      ctx.save(); ctx.globalAlpha = 0.18;
      for (let i = 0; i < 400; i++) {
        const gx = Math.random() * W, gy = Math.random() * H;
        const gr = Math.random() * 5 + 1;
        ctx.fillStyle = Math.random() > 0.5 ? "#aaa" : "#666";
        ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      break;

    case "pluto":
      ctx.save(); ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#aaa";
      ctx.beginPath();
      ctx.ellipse(W * 0.55, H * 0.5, W * 0.1, H * 0.1, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      for (let i = 0; i < 20; i++) {
        const cx = Math.random() * W, cy = Math.random() * H;
        const r = Math.random() * W * 0.025 + W * 0.004;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, "rgba(35,35,35,0.4)");
        g.addColorStop(0.7, "rgba(35,35,35,0.2)");
        g.addColorStop(1, "rgba(128,128,128,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2); ctx.fill();
      }
      break;

    case "moon":
      for (let i = 0; i < 80; i++) {
        const cx = Math.random() * W, cy = Math.random() * H;
        const r = Math.random() * W * 0.04 + W * 0.005;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, "rgba(20,20,20,0.55)");
        g.addColorStop(0.65, "rgba(20,20,20,0.35)");
        g.addColorStop(0.85, "rgba(200,200,200,0.30)");
        g.addColorStop(1, "rgba(128,128,128,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2); ctx.fill();
      }
      break;
  }

  // Fine surface noise overlay for all planets
  const imgData = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    imgData.data[i]   = Math.min(255, Math.max(0, imgData.data[i]   + n));
    imgData.data[i+1] = imgData.data[i];
    imgData.data[i+2] = imgData.data[i];
  }
  ctx.putImageData(imgData, 0, 0);

  return cv;
}

/* ── Saturn ring geometry with radial UV remap ───────────────────────────── */

/**
 * Ring geometry whose UVs are remapped radially so a 1D ring texture
 * (inner→outer edge) maps correctly across the annulus. Ported from the
 * legacy `makeSaturnRingGeo()` in web/planets3d.js.
 */
export function makeSaturnRingGeo(inner: number, outer: number): THREE.RingGeometry {
  const ringGeo = new THREE.RingGeometry(inner, outer, 128);
  const pos = ringGeo.attributes.position;
  const uv  = ringGeo.attributes.uv;
  const v3  = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    const r = v3.length();
    uv.setXY(i, (r - inner) / (outer - inner), 0.5);
  }
  uv.needsUpdate = true;
  return ringGeo;
}
