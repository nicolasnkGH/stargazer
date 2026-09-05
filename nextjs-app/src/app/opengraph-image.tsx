import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function starfieldSvg(width: number, height: number, count: number) {
  const dots = Array.from({ length: count }, () => {
    const x = (Math.random() * width).toFixed(1);
    const y = (Math.random() * height).toFixed(1);
    const r = (Math.random() * 1.8 + 0.3).toFixed(1);
    const o = (Math.random() * 0.5 + 0.15).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="${o}"/>`;
  }).join("");
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${dots}</svg>`
  )}`;
}

export default async function OpengraphImage() {
  const mascotBuffer = await readFile(join(process.cwd(), "public/assets/ai_stargazer_mascot.png"));
  const mascotSrc = `data:image/png;base64,${mascotBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          backgroundColor: "#05050f",
          backgroundImage: `url(${starfieldSvg(size.width, size.height, 220)})`,
        }}
      >
        <img
          src={mascotSrc}
          width={260}
          height={260}
          alt=""
          style={{ position: "absolute", right: 50, bottom: 30 }}
        />

        <div style={{ display: "flex", flexDirection: "column", padding: "90px 0 0 60px" }}>
          <div style={{ display: "flex", fontSize: 15, color: "#38bdf8", letterSpacing: 3, opacity: 0.8 }}>
            OBSERVATORY · DASHBOARD
          </div>
          <div style={{ display: "flex", fontSize: 70, color: "#ffffff", fontWeight: 700, marginTop: 12 }}>
            StarGazer
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#94a3b8", marginTop: 4 }}>
            Astronomy made simple.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: 50,
            alignItems: "center",
            paddingLeft: 60,
            fontSize: 14,
            color: "#64748b",
            backgroundColor: "rgba(15,23,42,0.7)",
          }}
        >
          Nightly sky conditions · Planet tracker · ISS alerts · Target database
        </div>
      </div>
    ),
    { ...size }
  );
}
