// generate-og.js — Creates og-preview.png (1200×630) for social sharing
const sharp = require('sharp');
const path = require('path');

const WIDTH = 1200;
const HEIGHT = 630;

async function generate() {
  const outDir = path.join(__dirname);

  // Step 1: Create dark space background as PNG
  const bgPng = await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 3,
      background: { r: 5, g: 5, b: 16 },
    },
  })
    .png()
    .toBuffer();

  // Step 2: Create star field SVG
  const starCanvas = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${Array.from({ length: 300 }, () => {
      const x = Math.random() * WIDTH;
      const y = Math.random() * HEIGHT;
      const r = Math.random() * 1.8 + 0.3;
      const o = (Math.random() * 0.5 + 0.15).toFixed(2);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="white" opacity="${o}"/>`;
    }).join('\n    ')}
  </svg>`;

  const bg = await sharp(bgPng)
    .composite([{
      input: Buffer.from(starCanvas),
      blend: 'over',
    }])
    .toBuffer();

  // Step 3: Load and place mascot
  const mascotPath = path.join(__dirname, 'assets', 'ai_stargazer_mascot.png');
  const mascot = await sharp(mascotPath)
    .resize(260, 260)
    .toBuffer();

  const withMascot = await sharp(bg)
    .composite([{
      input: mascot,
      top: HEIGHT - 260 - 30,
      left: WIDTH - 260 - 50,
      blend: 'over',
    }])
    .toBuffer();

  // Step 4: Add text overlay
  const textSvg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg" font-family="'Space Grotesk', 'Segoe UI', Arial, sans-serif">
    <defs>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <!-- Eyebrow -->
    <text x="60" y="110" font-size="15" fill="#38bdf8" font-weight="500" letter-spacing="3" opacity="0.8">
      OBSERVATORY · DASHBOARD
    </text>

    <!-- Main title -->
    <text x="60" y="180" font-size="70" fill="#ffffff" font-weight="700" filter="url(#glow)">
      StarGazer
    </text>

    <!-- Tagline -->
    <text x="60" y="225" font-size="26" fill="#94a3b8" font-weight="300">
      Astronomy made simple.
    </text>

    <!-- Stats -->
    <text x="60" y="310" font-size="44" fill="#38bdf8" font-weight="600">
      --
    </text>
    <text x="60" y="340" font-size="15" fill="#64748b">
      Dark In
    </text>

    <text x="190" y="310" font-size="44" fill="#fbbf24" font-weight="600">
      --
    </text>
    <text x="190" y="340" font-size="15" fill="#64748b">
      Bortle Scale
    </text>

    <!-- Bottom bar -->
    <rect x="0" y="580" width="${WIDTH}" height="50" fill="rgba(15,23,42,0.7)"/>
    <text x="60" y="612" font-size="14" fill="#64748b">
      Nightly sky conditions · Planet tracker · ISS alerts · Target database
    </text>
  </svg>`;

  const final = await sharp(withMascot)
    .composite([{ input: Buffer.from(textSvg), blend: 'over' }])
    .png()
    .toFile(path.join(outDir, 'og-preview.png'));

  console.log(`OG preview generated: ${final.width}×${final.height}, ${Math.round(final.size / 1024)}KB`);
}

generate().catch(err => { console.error(err); process.exit(1); });
