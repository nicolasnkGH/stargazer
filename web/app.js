/* =====================================================================
   StarGazer Dashboard — app.js
   Handles: starfield animation, clock, API data loading, UI rendering
   ===================================================================== */

// ── Configuration ──────────────────────────────────────────────────────────
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8181'
  : '/api'; // nginx proxy path in production

const LAT = 40.126;
const LON = -83.037;

// ── Scorpius Target Database (static, always available) ─────────────────────
const SCORPIUS_TARGETS = [
  {
    id: "antares", name: "Antares (α Scorpii)", emoji: "🔴",
    type: "Star — Red Supergiant", magnitude: 1.06, difficulty: "naked_eye",
    bortle_min: 1, eyepiece_rec: "Any — try 10mm for color contrast",
    description: "The 'heart of the scorpion' — brilliant red-orange supergiant 700× the Sun's diameter. Gorgeous orange-red color, sometimes shows a slight disc at high power. Your porch star.",
    season_peak: "July"
  },
  {
    id: "m4", name: "M4 (NGC 6121)", emoji: "✨",
    type: "Globular Cluster", magnitude: 5.6, difficulty: "easy",
    bortle_min: 4, eyepiece_rec: "25mm → 10mm for resolution",
    description: "One of the nearest globulars (~7,200 ly). 1.3° west of Antares — start here! Large, loose, and resolves into individual stars. A central bar of stars is a unique feature.",
    season_peak: "July"
  },
  {
    id: "m80", name: "M80 (NGC 6093)", emoji: "💫",
    type: "Globular Cluster", magnitude: 7.3, difficulty: "easy",
    bortle_min: 5, eyepiece_rec: "10mm at ~65× — compact bright core",
    description: "Compact, bright globular between Antares and Graffias. Dense, almost star-like core at low power. One of the most densely packed globulars in the Milky Way.",
    season_peak: "July"
  },
  {
    id: "m6", name: "M6 — Butterfly Cluster", emoji: "🦋",
    type: "Open Cluster", magnitude: 4.2, difficulty: "easy",
    bortle_min: 3, eyepiece_rec: "25mm — cluster fills the field beautifully",
    description: "The 'Butterfly Cluster' near the scorpion's tail. At low power, the star arrangement clearly resembles a butterfly in flight. Over 80 stars, bright and rewarding.",
    season_peak: "August"
  },
  {
    id: "m7", name: "M7 — Ptolemy Cluster", emoji: "⭐",
    type: "Open Cluster", magnitude: 3.3, difficulty: "naked_eye",
    bortle_min: 2, eyepiece_rec: "25mm wide-field or binoculars",
    description: "Ptolemy's Cluster — visible to the naked eye even from Columbus on good nights! Huge, sprawling cluster of ~80 bright stars. Use your widest field eyepiece. Known since 130 AD.",
    season_peak: "August"
  },
  {
    id: "ngc6231", name: "NGC 6231", emoji: "💎",
    type: "Open Cluster", magnitude: 2.6, difficulty: "easy",
    bortle_min: 3, eyepiece_rec: "25mm — packed bright cluster",
    description: "The 'Northern Jewel Box' — stunning, compact open cluster at the scorpion's tail. Very bright and concentrated. Note: very low (~8°) from Columbus — needs clear southern horizon.",
    season_peak: "July", horizon_note: "⚠️ Very low (~8° max) — needs clear S horizon"
  },
  {
    id: "graffias", name: "Graffias (β Scorpii)", emoji: "🔵",
    type: "Double Star", magnitude: 2.62, difficulty: "easy",
    bortle_min: 1, eyepiece_rec: "10mm at ~65× — easy clean split",
    description: "Beautiful double star at the scorpion's head. Easily split at low magnification — blue-white primary with a companion. Actually a 6-star system! One of the finest summer doubles.",
    season_peak: "July"
  },
  {
    id: "nu_sco", name: "Nu Scorpii (Jabbah)", emoji: "🌟",
    type: "Multiple Star System", magnitude: 4.0, difficulty: "moderate",
    bortle_min: 1, eyepiece_rec: "10mm first, then 6mm for the close pair",
    description: "A quadruple (4-star) system! At low power it appears double, but increase magnification to split the close pair. A fun challenge — 4 suns visible in one field.",
    season_peak: "July"
  },
  {
    id: "ngc6144", name: "NGC 6144", emoji: "🌫️",
    type: "Globular Cluster", magnitude: 9.0, difficulty: "moderate",
    bortle_min: 6, eyepiece_rec: "10mm — look 0.5° NW of Antares",
    description: "A faint globular just ½° northwest of Antares. Often overlooked due to Antares glare. On new moon nights look for a faint fuzzy patch NW of Antares. Rewarding challenge for your 5-inch.",
    season_peak: "July", horizon_note: "Requires new moon and best transparency"
  },
  {
    id: "shaula", name: "Shaula & Lesath (λ & υ Sco)", emoji: "🦂",
    type: "Naked Eye Pair", magnitude: 1.62, difficulty: "naked_eye",
    bortle_min: 1, eyepiece_rec: "Naked eye or binoculars",
    description: "The 'Stinger' — two bright stars at the scorpion's tail tip. Shaula is the 25th brightest star in the sky. Not physically related — a beautiful line-of-sight coincidence.",
    season_peak: "August", horizon_note: "⚠️ Very low (~5-10°) — crystal-clear S horizon needed"
  },
  {
    id: "m19", name: "M19 (NGC 6273)", emoji: "🌀",
    type: "Globular Cluster", magnitude: 6.8, difficulty: "easy",
    bortle_min: 5, eyepiece_rec: "10mm",
    description: "Ophiuchus globular just north of the Scorpius border. One of the most oblate (flattened) globulars in the sky — noticeably elongated at high power. Bright and rewarding.",
    season_peak: "July"
  },
];

// ── Starfield Canvas ────────────────────────────────────────────────────────
(function initStarfield() {
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  let stars = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initStars();
  }

  function initStars() {
    stars = [];
    const n = Math.floor((canvas.width * canvas.height) / 3000);
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.4 + 0.2,
        alpha: Math.random() * 0.7 + 0.1,
        speed: Math.random() * 0.004 + 0.001,
        phase: Math.random() * Math.PI * 2,
        color: randomStarColor(),
      });
    }
  }

  function randomStarColor() {
    const r = Math.random();
    if (r < 0.1) return '#ffd0a0'; // orange giants
    if (r < 0.2) return '#a0c8ff'; // blue-white
    if (r < 0.25) return '#ffe8a0'; // yellow
    return '#e8ecff'; // white
  }

  function draw(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      const alpha = s.alpha * (0.6 + 0.4 * Math.sin(t * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    // Milky Way subtle glow
    const grad = ctx.createLinearGradient(0, canvas.height * 0.2, canvas.width, canvas.height * 0.9);
    grad.addColorStop(0, 'rgba(60,40,120,0)');
    grad.addColorStop(0.3, 'rgba(60,40,120,0.04)');
    grad.addColorStop(0.7, 'rgba(40,60,100,0.06)');
    grad.addColorStop(1, 'rgba(60,40,120,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
})();

// ── Clock ───────────────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true, timeZone: 'America/New_York'
  });
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    timeZone: 'America/New_York'
  });
  document.getElementById('clock').textContent = timeStr + ' ET';
  document.getElementById('date-display').textContent = dateStr;
}
updateClock();
setInterval(updateClock, 1000);

// ── API Loader ──────────────────────────────────────────────────────────────
async function fetchAPI(path, fallback = null) {
  try {
    const resp = await fetch(`${API_BASE}${path}`, { signal: AbortSignal.timeout(12000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (e) {
    console.warn(`API ${path} failed:`, e.message);
    return fallback;
  }
}

// ── Render: Tonight Report ──────────────────────────────────────────────────
async function loadTonightReport() {
  const data = await fetchAPI('/tonight');
  if (!data) {
    renderGoNogo(null);
    renderMoon(null);
    renderSeeing(null);
    renderScorpius(null);
    renderPlanets(null);
    renderAlerts(null);
    return;
  }

  renderGoNogo(data);
  renderSeeing(data.seeing, data);
  renderMoon(data.moon);
  renderScorpius(data.scorpius);
  renderPlanets(data.visible_planets || []);
  renderAlerts(data.must_see || []);
}

function renderGoNogo(data) {
  const banner = document.getElementById('gonogo-banner');
  const icon = document.getElementById('gonogo-icon');
  const title = document.getElementById('gonogo-title');
  const sub = document.getElementById('gonogo-sub');
  const detail = document.getElementById('gonogo-detail');

  banner.classList.remove('loading-state', 'go', 'marginal', 'nogo');

  if (!data) {
    icon.textContent = '❓';
    title.textContent = 'Could not connect to StarGazer API';
    sub.textContent = 'Make sure the Python API is running on port 8181';
    banner.classList.add('loading-state');
    return;
  }

  const seeing = data.seeing || {};
  const gn = seeing.go_nogo || '';

  if (gn.includes('GO') && !gn.includes('NO')) {
    banner.classList.add('go');
    icon.textContent = '✅';
    title.textContent = gn;
    sub.textContent = `${seeing.seeing_label || ''} — ${data.date || ''}`;
  } else if (gn.includes('MARGINAL')) {
    banner.classList.add('marginal');
    icon.textContent = '⚠️';
    title.textContent = gn;
    sub.textContent = `${seeing.seeing_label || ''} — conditions marginal for tonight`;
  } else {
    banner.classList.add('nogo');
    icon.textContent = '❌';
    title.textContent = gn || 'NO GO';
    sub.textContent = 'Poor conditions — check again tomorrow';
  }

  detail.innerHTML = `Dark: ${data.astronomical_dusk || '?'} → ${data.astronomical_dawn || '?'}<br>
    Window: ${data.observing_window_hours || '?'}h of darkness<br>
    ${data.date || ''}`;
}

function renderSeeing(seeing, data) {
  if (!seeing) {
    document.getElementById('seeing-label').textContent = 'API offline — check Clear Outside below';
    return;
  }

  const scoreEl = document.getElementById('seeing-score-badge');
  const score = seeing.seeing_score;
  scoreEl.textContent = score ? `${score}/5 ⭐` : '—';
  scoreEl.style.background = score >= 4 ? 'rgba(34,197,94,0.15)' : score >= 3 ? 'rgba(74,158,255,0.15)' : 'rgba(239,68,68,0.15)';
  scoreEl.style.borderColor = score >= 4 ? 'rgba(34,197,94,0.4)' : score >= 3 ? 'rgba(74,158,255,0.4)' : 'rgba(239,68,68,0.4)';
  scoreEl.style.color = score >= 4 ? '#22c55e' : score >= 3 ? '#4a9eff' : '#f87171';

  document.getElementById('m-cloud').querySelector('.metric-val').textContent =
    seeing.tonight_cloud_pct != null ? `${seeing.tonight_cloud_pct}%` : '—';
  document.getElementById('m-wind').querySelector('.metric-val').textContent =
    seeing.tonight_wind_kmh != null ? `${seeing.tonight_wind_kmh}` : '—';
  document.getElementById('m-precip').querySelector('.metric-val').textContent =
    seeing.tonight_precip_prob != null ? `${seeing.tonight_precip_prob}%` : '—';
  document.getElementById('seeing-label').textContent = seeing.seeing_label || '—';

  if (data) {
    document.getElementById('dark-window').textContent =
      `Dark: ${data.astronomical_dusk || '?'} → ${data.astronomical_dawn || '?'} (${data.observing_window_hours || '?'}h)`;
  }
}

function renderMoon(moon) {
  if (!moon) {
    document.getElementById('moon-phase-name').textContent = 'Loading failed';
    return;
  }
  document.getElementById('moon-phase-icon').textContent = moon.phase_name ? moon.phase_name.split(' ')[0] : '🌙';
  document.getElementById('moon-phase-name').textContent = moon.phase_name || '—';
  document.getElementById('moon-illum-badge').textContent = `${moon.illumination_pct ?? '?'}%`;
  document.getElementById('moon-arc-fill').style.width = `${moon.illumination_pct || 0}%`;
  document.getElementById('moon-arc-label').textContent = `${moon.illumination_pct ?? 0}%`;
  document.getElementById('moon-rise').textContent = moon.moonrise || '—';
  document.getElementById('moon-set').textContent = moon.moonset || '—';
  document.getElementById('moon-alt').textContent = `${moon.altitude_deg ?? '?'}°`;
  document.getElementById('dso-impact').textContent = moon.dso_impact || '—';
}

function renderScorpius(s) {
  if (!s) {
    document.getElementById('scorpius-status').textContent = 'Could not load Scorpius data';
    return;
  }
  document.getElementById('scorpius-status').textContent = s.status || '—';

  const badgeEl = document.getElementById('scorpius-status-badge');
  if (s.current_altitude_deg > 15) {
    badgeEl.textContent = 'UP NOW';
    badgeEl.style.background = 'rgba(34,197,94,0.15)';
    badgeEl.style.borderColor = 'rgba(34,197,94,0.4)';
    badgeEl.style.color = '#22c55e';
  } else if (s.current_altitude_deg > 0) {
    badgeEl.textContent = 'LOW';
    badgeEl.style.color = '#f59e0b';
  } else {
    badgeEl.textContent = 'DOWN';
    badgeEl.style.color = '#f87171';
  }

  document.getElementById('sc-rise').textContent = s.rise_time || '—';
  document.getElementById('sc-culm').textContent = s.culmination_time || '—';
  document.getElementById('sc-peak-alt').textContent = s.culmination_altitude_deg ? `${s.culmination_altitude_deg}°` : '—';
  document.getElementById('sc-now').textContent = s.current_altitude_deg != null
    ? `${s.current_altitude_deg}° ${s.current_direction || ''}`
    : '—';
}

function renderPlanets(planets) {
  const list = document.getElementById('planet-list');
  if (!planets || planets.length === 0) {
    list.innerHTML = '<div class="no-data">Could not load planet data — API may be offline</div>';
    return;
  }

  list.innerHTML = planets.map(p => `
    <div class="planet-item ${p.visible_tonight ? '' : 'not-visible'}">
      <div class="planet-vis-dot ${p.visible_tonight ? 'visible' : 'hidden'}"></div>
      <span class="planet-emoji">${p.emoji}</span>
      <span class="planet-name">${p.name}</span>
      <span class="planet-alt">${p.altitude_deg}°</span>
      <span class="planet-dir">${p.direction}</span>
    </div>
  `).join('');
}

function renderAlerts(alerts) {
  const list = document.getElementById('alert-list');
  if (!alerts || alerts.length === 0) {
    list.innerHTML = '<div class="no-data">No special alerts for tonight</div>';
    return;
  }
  list.innerHTML = alerts.map((a, i) => `
    <div class="alert-item" style="animation-delay: ${i * 0.08}s">
      ${a}
    </div>
  `).join('');
}

// ── Render: Weekly ──────────────────────────────────────────────────────────
async function loadWeekly() {
  const data = await fetchAPI('/weekly');
  const grid = document.getElementById('weekly-grid');
  if (!data || !data.days) {
    grid.innerHTML = '<div class="no-data" style="padding:30px">Could not load weekly data</div>';
    return;
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' });

  grid.innerHTML = data.days.map((d, i) => {
    const isToday = i === 0;
    const moonEmoji = d.moon_phase ? d.moon_phase.split(' ')[0] : '🌙';
    const highlights = (d.highlights || []).slice(0, 2);
    return `
      <div class="day-card ${isToday ? 'today' : ''}">
        <div class="day-name">${d.date.split(',')[0]}</div>
        <div class="day-date">${d.date.split(', ')[1] || ''}</div>
        <div class="day-rating">${d.rating || '—'}</div>
        <div class="day-moon">${moonEmoji}</div>
        <div class="day-weather">${d.weather || '—'}</div>
        ${highlights.map(h => `<div class="day-highlight">${h}</div>`).join('')}
      </div>
    `;
  }).join('');
}

// ── Render: ISS Passes ──────────────────────────────────────────────────────
async function loadISS() {
  const data = await fetchAPI('/iss?count=4');
  const container = document.getElementById('iss-passes');
  if (!data || !data.passes || data.passes.length === 0) {
    container.innerHTML = `
      <div class="no-data">
        Could not fetch ISS data automatically.<br>
        <a href="https://www.heavens-above.com/PassSummary.aspx?lat=${LAT}&lng=${LON}&loc=Columbus&alt=240&tz=ET" 
           target="_blank" style="color: #4a9eff">
          Check Heavens-Above.com for Columbus passes ↗
        </a>
      </div>`;
    return;
  }

  container.innerHTML = data.passes.map(p => {
    if (p.rise === 'Check Heavens-Above.com') {
      return `<div class="iss-pass-item"><a href="https://heavens-above.com" target="_blank" style="color:#4a9eff">Check Heavens-Above.com for pass times ↗</a></div>`;
    }
    return `
      <div class="iss-pass-item ${p.visible ? 'visible' : ''}">
        <span class="iss-time">🚀 ${p.rise || 'N/A'}</span>
        <span>→ ${p.set || 'N/A'}</span>
        <span class="iss-alt">📐 ${p.peak_alt !== 'N/A' ? p.peak_alt + '°' : '?'} ${p.peak_az || ''}</span>
        <span class="iss-vis-label" style="color: ${p.visible ? '#22c55e' : '#64748b'}">
          ${p.visible ? '✅ VISIBLE' : '🔭 Low pass'}
        </span>
      </div>
    `;
  }).join('');
}

// ── Render: Target Database ─────────────────────────────────────────────────
async function loadTargets() {
  // Fetch live altitude data if API is available
  let liveData = await fetchAPI('/targets');
  const liveMap = {};
  if (liveData && liveData.targets) {
    liveData.targets.forEach(t => { liveMap[t.id] = t; });
  }

  renderTargetGrid(SCORPIUS_TARGETS, liveMap, 'all');

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      renderTargetGrid(SCORPIUS_TARGETS, liveMap, filter);
    });
  });
}

function renderTargetGrid(targets, liveMap, filter) {
  const grid = document.getElementById('target-grid');
  const filtered = filter === 'all'
    ? targets
    : targets.filter(t => t.type.toLowerCase().includes(filter));

  grid.innerHTML = filtered.map(t => {
    const live = liveMap[t.id] || {};
    const visibleNow = live.in_fov === true;
    const altText = live.altitude_deg != null
      ? `${live.altitude_deg}° ${live.direction || ''}`
      : null;

    return `
      <div class="target-card ${visibleNow ? 'visible-now' : ''}" data-type="${t.type}">
        <div class="tc-header">
          <span class="tc-emoji">${t.emoji}</span>
          <div>
            <div class="tc-name">${t.name}</div>
            <div class="tc-type">${t.type}</div>
          </div>
          <span class="tc-mag">mag ${t.magnitude}</span>
        </div>
        <div class="tc-desc">${t.description}</div>
        ${t.horizon_note ? `<div class="tc-horizon-note">${t.horizon_note}</div>` : ''}
        <div class="tc-footer">
          <span class="tc-difficulty ${t.difficulty}">${t.difficulty.replace('_', ' ')}</span>
          <span class="tc-eyepiece">🔭 ${t.eyepiece_rec || ''}</span>
          ${altText ? `<span class="tc-altitude">${altText}</span>` : ''}
          ${visibleNow ? '<span class="tc-visible-now"><span style="width:6px;height:6px;border-radius:50%;background:#22c55e;display:inline-block"></span> In view now</span>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ── API Status Check ────────────────────────────────────────────────────────
async function checkAPIStatus() {
  const badge = document.getElementById('live-badge');
  try {
    const resp = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(4000) });
    if (resp.ok) {
      badge.innerHTML = '<span class="pulse-dot"></span> LIVE';
      badge.style.background = 'rgba(34,197,94,0.1)';
      badge.style.borderColor = 'rgba(34,197,94,0.3)';
      badge.style.color = '#22c55e';
    } else { throw new Error(); }
  } catch {
    badge.innerHTML = '📡 API OFFLINE';
    badge.style.background = 'rgba(239,68,68,0.1)';
    badge.style.borderColor = 'rgba(239,68,68,0.3)';
    badge.style.color = '#f87171';
  }
}

// ── Init ────────────────────────────────────────────────────────────────────
async function init() {
  // Always render the static target database first (no API needed)
  await loadTargets();

  // Then kick off all API-dependent loads in parallel
  await Promise.allSettled([
    checkAPIStatus(),
    loadTonightReport(),
    loadWeekly(),
    loadISS(),
  ]);

  // Refresh live data every 10 minutes
  setInterval(async () => {
    await loadTonightReport();
    await loadISS();
  }, 10 * 60 * 1000);
}

document.addEventListener('DOMContentLoaded', init);
