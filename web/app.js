/* =====================================================================
   StarGazer Dashboard — app.js
   Handles: starfield animation, clock, API data loading, UI rendering
   ===================================================================== */

// ── Configuration ──────────────────────────────────────────────────────────
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8181'
  : '/api'; // nginx proxy path in production

const DEFAULT_LOCATIONS = [
  { id: 'default', name: 'Columbus (Home)', lat: 40.126, lon: -83.037 }
];

let savedLocations = DEFAULT_LOCATIONS;
try {
  const parsed = JSON.parse(localStorage.getItem('stargazer_locations'));
  if (Array.isArray(parsed) && parsed.length > 0) {
    savedLocations = parsed;
  }
} catch (e) {
  console.error("Failed to parse saved locations", e);
}

let activeLocId = localStorage.getItem('stargazer_active_loc') || 'default';
let activeLoc = savedLocations.find(l => l.id === activeLocId);
if (!activeLoc) {
  activeLoc = savedLocations[0];
  activeLocId = activeLoc.id;
  localStorage.setItem('stargazer_active_loc', activeLocId);
}

let currentLat = parseFloat(activeLoc.lat) || 40.126;
let currentLon = parseFloat(activeLoc.lon) || -83.037;

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

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.alpha;
      ctx.fillRect(s.x, s.y, s.r * 2, s.r * 2);
    });
    ctx.globalAlpha = 1;
    // Milky Way subtle glow
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, 'rgba(20,20,40,0.0)');
    grad.addColorStop(0.5, 'rgba(50,50,90,0.06)');
    grad.addColorStop(1, 'rgba(20,20,40,0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();

// ── Clock & Subtitle ────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const t = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const d = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  
  const clockEl = document.getElementById('clock');
  const dateEl = document.getElementById('date-display');
  
  if (clockEl) clockEl.textContent = t;
  if (dateEl) dateEl.textContent = d;
}
updateClock();
setInterval(updateClock, 1000);

// Set Dynamic Subtitle
const subtitle = document.getElementById('logo-sub');
if (subtitle) {
  subtitle.textContent = `${activeLoc.name} · ${activeLoc.lat.toFixed(3)}°N, ${activeLoc.lon.toFixed(3)}°W`;
}

async function fetchAPI(path, fallback = null) {
  const separator = path.includes('?') ? '&' : '?';
  const finalPath = `${path}${separator}lat=${currentLat}&lon=${currentLon}`;
  const cacheKey = `stargazer_cache_${finalPath}`;
  
  // Stale-while-revalidate: return cached data immediately if we have it
  const cached = localStorage.getItem(cacheKey);
  let parsedCache = null;
  if (cached) {
    try { parsedCache = JSON.parse(cached); } catch(e) {}
  }

  try {
    const resp = await fetch(`${API_BASE}${finalPath}`, { signal: AbortSignal.timeout(12000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    localStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
  } catch (e) {
    console.warn(`API ${path} failed:`, e.message);
    return parsedCache || fallback;
  }
}

// SWR wrapper for immediate render
async function fetchAndRender(path, renderFn, fallback = null) {
  const separator = path.includes('?') ? '&' : '?';
  const finalPath = `${path}${separator}lat=${currentLat}&lon=${currentLon}`;
  const cacheKey = `stargazer_cache_${finalPath}`;
  
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try { renderFn(JSON.parse(cached)); } catch(e) {}
  }

  try {
    const resp = await fetch(`${API_BASE}${finalPath}`, { signal: AbortSignal.timeout(12000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    localStorage.setItem(cacheKey, JSON.stringify(data));
    renderFn(data); // Re-render with fresh data
  } catch (e) {
    console.warn(`API ${path} failed:`, e.message);
    if (!cached) renderFn(fallback);
  }
}

// ── Render: Tonight Report ──────────────────────────────────────────────────
async function loadTonightReport() {
  await fetchAndRender('/tonight', (data) => {
    if (!data) {
      renderGoNogo(null);
      renderMoon(null);
      renderSeeing(null);
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
  });
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
  await fetchAndRender('/weekly', (data) => {
    const grid = document.getElementById('weekly-grid');
    if (!data || !data.days) {
      grid.innerHTML = '<div class="no-data" style="padding:30px">Could not load weekly data</div>';
      return;
    }

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
        </div>
        <marquee scrollamount="3" scrolldelay="100" style="width: 100%;">
          ${highlights.map(h => `<span class="day-highlight" style="margin-right: 15px;">${h}</span>`).join('')}
        </marquee>
      </div>
      `;
    }).join('');
  });
}

// ── Render: ISS Passes ──────────────────────────────────────────────────────
async function loadISS() {
  await fetchAndRender('/iss?count=4', (data) => {
    const container = document.getElementById('iss-passes');
    if (!data || !data.passes || data.passes.length === 0) {
      container.innerHTML = `
        <div class="no-data">
          Could not fetch ISS data automatically.<br>
          <a href="https://www.heavens-above.com/PassSummary.aspx?lat=${currentLat}&lng=${currentLon}&loc=Custom&alt=240&tz=ET" 
             target="_blank" style="color: #4a9eff">
            Check Heavens-Above.com for passes ↗
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
  });
}

// ── Render: Constellations ──────────────────────────────────────────────────
async function loadConstellations() {
  await fetchAndRender('/constellations', (data) => {
    const grid = document.getElementById('constellations-grid');
    if (!data || !data.constellations) return;
    
    // Only show visible ones
    const visible = data.constellations.filter(c => c.visible);
    
    grid.innerHTML = visible.map(c => `
      <div class="day-card" style="min-width: 100px;">
        <div class="day-name" style="font-size: 0.85rem; color: #a855f7;">${c.name}</div>
        <div class="day-date" style="font-family: var(--font-mono); margin-bottom: 2px;">${c.abbr}</div>
        <div class="day-weather" style="margin: 6px 0;">Alt: ${c.altitude_deg}°</div>
        <div class="day-highlight">${c.direction}</div>
      </div>
    `).join('');
  });
}

// ── Render: Target Database ─────────────────────────────────────────────────
let currentConstellation = 'Sco';

async function loadTargets() {
  await fetchAndRender(`/targets?constellation=${currentConstellation}`, (liveData) => {
    if (!liveData || !liveData.targets) return;
    const targets = liveData.targets;

    const filterBtn = document.querySelector('.filter-btn.active');
    const filter = filterBtn ? filterBtn.dataset.filter : 'all';

    renderTargetGrid(targets, filter);

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      // Remove old listeners to prevent duplicates on SWR re-render
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      
      newBtn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        newBtn.classList.add('active');
        const filter = newBtn.dataset.filter;
        renderTargetGrid(SCORPIUS_TARGETS, liveMap, filter);
      });
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

function updateClearOutside() {
  const img = document.getElementById('clearoutside-img');
  if (img) {
    img.src = `https://clearoutside.com/forecast_image_large/${currentLat.toFixed(2)}/${currentLon.toFixed(2)}/forecast.png`;
  }
}

// ── Location Modal UI ───────────────────────────────────────────────────────
function initLocationUI() {
  const modal = document.getElementById('location-modal');
  const btnLoc = document.getElementById('btn-location');
  const listEl = document.getElementById('saved-locations-list');
  const inputName = document.getElementById('input-loc-name');
  const inputLat = document.getElementById('input-lat');
  const inputLon = document.getElementById('input-lon');
  
  function renderList() {
    listEl.innerHTML = savedLocations.map(l => `
      <div class="loc-item ${l.id === activeLocId ? 'active' : ''}">
        <div class="loc-info" onclick="activateLocation('${l.id}')">
          <div class="loc-name">${l.name}</div>
          <div class="loc-coords">${l.lat.toFixed(4)}, ${l.lon.toFixed(4)}</div>
        </div>
        ${l.id !== 'default' ? `<button class="loc-del" onclick="deleteLocation('${l.id}')">✕</button>` : ''}
      </div>
    `).join('');
  }

  window.activateLocation = (id) => {
    localStorage.setItem('stargazer_active_loc', id);
    location.reload(); // Refresh to apply changes instantly everywhere
  };

  window.deleteLocation = (id) => {
    savedLocations = savedLocations.filter(l => l.id !== id);
    localStorage.setItem('stargazer_locations', JSON.stringify(savedLocations));
    if (activeLocId === id) activateLocation('default');
    else renderList();
  };

  btnLoc.addEventListener('click', () => {
    renderList();
    modal.classList.remove('hidden');
  });

  document.getElementById('btn-close-loc').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  document.getElementById('btn-save-loc').addEventListener('click', () => {
    const lat = parseFloat(inputLat.value);
    const lon = parseFloat(inputLon.value);
    const name = inputName.value.trim() || 'Custom Location';
    if (isNaN(lat) || isNaN(lon)) return alert('Invalid coordinates');
    
    const newLoc = { id: 'loc_' + Date.now(), name, lat, lon };
    savedLocations.push(newLoc);
    localStorage.setItem('stargazer_locations', JSON.stringify(savedLocations));
    activateLocation(newLoc.id);
  });

  document.getElementById('btn-gps').addEventListener('click', () => {
    const btn = document.getElementById('btn-gps');
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      alert("Browser Geolocation requires HTTPS. Since you are accessing via HTTP on your local network, this will fail. Please enter coordinates manually.");
    }
    btn.textContent = '📡 Locating...';
    navigator.geolocation.getCurrentPosition(
      pos => {
        inputLat.value = pos.coords.latitude.toFixed(4);
        inputLon.value = pos.coords.longitude.toFixed(4);
        if (!inputName.value) inputName.value = "GPS Location";
        btn.textContent = '📡 Try Device GPS';
      },
      err => {
        alert('Geolocation failed: ' + err.message);
        btn.textContent = '📡 Try Device GPS';
      }
    );
  });
}

// ── Init ────────────────────────────────────────────────────────────────────
async function init() {
  initLocationUI();
  updateClearOutside();

  // Setup Constellation Tabs
  document.querySelectorAll('.const-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.const-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentConstellation = btn.dataset.const;
      document.getElementById('target-db-title').textContent = `${btn.textContent} Target Database`;
      loadTargets();
    });
  });

  // Load everything in parallel
  await Promise.allSettled([
    checkAPIStatus(),
    loadTonightReport(),
    loadWeekly(),
    loadISS(),
    loadConstellations()
  ]);

  // Refresh live data every 10 minutes
  setInterval(async () => {
    await loadTonightReport();
    await loadISS();
  }, 10 * 60 * 1000);
}

document.addEventListener('DOMContentLoaded', init);
