let currentLang = localStorage.getItem('stargazer_lang') || 'en';

function translateDate(dateStr) {
  if (!dateStr || currentLang === 'en') return dateStr;
  const dict = window.i18n[currentLang];
  let res = dateStr;
  ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].forEach(d => {
    if (res.includes(d)) res = res.replace(d, dict['t_'+d.toLowerCase()] || d);
    const cap = d.charAt(0) + d.slice(1).toLowerCase();
    if (res.includes(cap)) res = res.replace(cap, dict['t_'+d.toLowerCase()] ? dict['t_'+d.toLowerCase()].charAt(0) + dict['t_'+d.toLowerCase()].slice(1).toLowerCase() : cap);
  });
  ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].forEach(m => {
    if (res.includes(m)) res = res.replace(m, dict['m_'+m.toLowerCase()] || m);
  });
  return res;
}
/* =====================================================================
   StarGazer Dashboard — app.js
   Handles: starfield animation, clock, API data loading, UI rendering
   ===================================================================== */

/**
 * Simple toast popup function for tooltips
 */
let toastTimeout;
window.showInfo = function(msg, event) {
  const t = document.getElementById('toast');
  const tm = document.getElementById('toast-msg');
  if (!t || !tm) return;
  tm.textContent = msg;
  
  if (event) {
    t.style.left = Math.min(event.pageX - 125, window.innerWidth - 260) + 'px';
    t.style.top = (event.pageY + 15) + 'px';
  } else {
    t.style.left = '50%';
    t.style.top = '20px';
    t.style.transform = 'translateX(-50%)';
  }
  
  t.style.display = 'block';
  t.style.opacity = '1';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => { t.style.display = 'none'; }, 200);
  }, 3500);
};

// ── Configuration ──────────────────────────────────────────────────────────
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8181'
  : 'https://stargazerapi.nick-t.net'; // Nginx Proxy Manager split-DNS URL

const DEFAULT_LOCATIONS = [
  { id: 'default', name: 'Mauna Kea Observatory', lat: 19.8206, lon: -155.4681 }
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
  const t = now.toLocaleTimeString(currentLang, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const d = now.toLocaleDateString(currentLang, { weekday: 'short', month: 'short', day: 'numeric' });
  
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
  subtitle.removeAttribute('data-i18n');
  subtitle.textContent = `${activeLoc.name} · ${activeLoc.lat.toFixed(3)}°N, ${activeLoc.lon.toFixed(3)}°W`;
}

async function fetchAPI(path, fallback = null) {
  const separator = path.includes('?') ? '&' : '?';
  const finalPath = `${path}${separator}lat=${currentLat}&lon=${currentLon}&lang=${currentLang}`;
  const cacheKey = `stargazer_cache_${finalPath}`;
  
  // Stale-while-revalidate: return cached data immediately if we have it
  const cached = localStorage.getItem(cacheKey);
  let parsedCache = null;
  if (cached) {
    try { parsedCache = JSON.parse(cached); } catch(e) {}
  }

  try {
    const resp = await fetch(`${API_BASE}${finalPath}`, { signal: AbortSignal.timeout(75000) });
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
  const finalPath = `${path}${separator}lat=${currentLat}&lon=${currentLon}&lang=${currentLang}`;
  const cacheKey = `stargazer_cache_${finalPath}`;
  
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try { renderFn(JSON.parse(cached)); } catch(e) {}
  }

  try {
    const resp = await fetch(`${API_BASE}${finalPath}`, { signal: AbortSignal.timeout(75000) });
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
    renderPlanets(data.visible_planets || []);
    renderAlerts(data.must_see || []);
    
    // Fire off async AI fetch now that the UI is rendered
    fetchAIAnalysis();
  });
}

async function fetchAIAnalysis() {
  const aiTargetsCard = document.getElementById('card-ai-targets');
  const engineBadgeEl = document.getElementById('seeing-engine-badge');
  const moonFactEl = document.getElementById('moon-fact');

  if (aiTargetsCard) {
    aiTargetsCard.style.display = 'none';
  }
  
  if (engineBadgeEl) {
    engineBadgeEl.style.display = '';
    engineBadgeEl.innerHTML = '<span class="spinner" style="display:inline-block; animation: spin 1s linear infinite;">⚙️</span> Loading...';
    engineBadgeEl.className = 'seeing-engine-badge rule';
  }

  if (moonFactEl) {
    moonFactEl.innerHTML = '<span class="spinner" style="display:inline-block; animation: spin 1s linear infinite;">⚙️</span> 🤖 Generating moon fun fact...';
    moonFactEl.style.display = 'block';
  }

  try {
    const q = (currentLat != null && currentLon != null) ? `?lat=${currentLat}&lon=${currentLon}&lang=${currentLang}` : `?lang=${currentLang}`;
    const res = await fetch(`${API_BASE}/seeing/ai${q}`);
    if (!res.ok) throw new Error('AI API failed');
    const aiData = await res.json();
    
    // Update the UI with the fresh AI data
    if (aiData.ai_powered) {
      renderSeeing(aiData, null); 
    } else {
      throw new Error('AI returned rule-based fallback');
    }
  } catch(e) {
    console.warn("AI Fetch failed", e);
    if (aiTargetsCard) aiTargetsCard.style.display = 'none';
    if (engineBadgeEl) {
      engineBadgeEl.textContent = 'Fallback: Rule-based';
      engineBadgeEl.className = 'seeing-engine-badge rule';
      engineBadgeEl.title = 'AI could not be reached. Showing rule-based metrics.';
    }
    if (moonFactEl) {
      moonFactEl.style.display = 'none';
    }
  }
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
    title.textContent = window.i18n[currentLang].go_title || gn;
    sub.textContent = `${seeing.seeing_label || ''} — ${translateDate(data.date || '')}`;
  } else if (gn.includes('MARGINAL')) {
    banner.classList.add('marginal');
    icon.textContent = '⚠️';
    title.textContent = window.i18n[currentLang].marginal_title || gn;
    sub.textContent = `${seeing.seeing_label || ''} — ${window.i18n[currentLang].marginal_sub || 'conditions marginal for tonight'}`;
  } else {
    banner.classList.add('nogo');
    icon.textContent = '❌';
    title.textContent = window.i18n[currentLang].nogo_title || gn || 'NO GO';
    sub.textContent = window.i18n[currentLang].poor_cond || 'Poor conditions — check again tomorrow';
  }

  const lblDark = window.i18n[currentLang].lbl_dark || 'Dark:';
  const lblWindow = window.i18n[currentLang].lbl_window || 'Window:';
  const lblHoursDark = window.i18n[currentLang].lbl_hours_dark || 'h of darkness';

  detail.innerHTML = `${lblDark} ${data.astronomical_dusk || '?'} → ${data.astronomical_dawn || '?'}<br>
    ${lblWindow} ${data.observing_window_hours || '?'} ${lblHoursDark}<br>
    ${translateDate(data.date || '')}`;
}

function renderSeeing(seeing, data) {
  if (!seeing) {
    document.getElementById('seeing-label').textContent = 'API offline — check Clear Outside below';
    return;
  }

  const scoreEl = document.getElementById('seeing-score-badge');
  const score   = seeing.seeing_score;    // 1-5 stars
  const scoreRaw = seeing.seeing_score_raw; // 1-10

  // 5-star colour coding
  const isGood     = score >= 4;
  const isAvg      = score >= 3;
  const colorGreen = 'rgba(34,197,94,0.15)';
  const colorBlue  = 'rgba(74,158,255,0.15)';
  const colorRed   = 'rgba(239,68,68,0.15)';
  const borderGreen = 'rgba(34,197,94,0.4)';
  const borderBlue  = 'rgba(74,158,255,0.4)';
  const borderRed   = 'rgba(239,68,68,0.4)';
  const textGreen   = '#22c55e';
  const textBlue    = '#4a9eff';
  const textRed     = '#f87171';

  scoreEl.textContent = score ? `${score}/5 ⭐` : '—';
  if (scoreRaw != null) scoreEl.title = `AI score: ${scoreRaw}/10`;
  scoreEl.style.background   = isGood ? colorGreen : isAvg ? colorBlue : colorRed;
  scoreEl.style.borderColor  = isGood ? borderGreen : isAvg ? borderBlue : borderRed;
  scoreEl.style.color        = isGood ? textGreen   : isAvg ? textBlue  : textRed;

  // Weather metrics
  document.getElementById('m-cloud').querySelector('.metric-val').textContent =
    seeing.tonight_cloud_pct != null ? `${seeing.tonight_cloud_pct}%` : '—';
  document.getElementById('m-wind').querySelector('.metric-val').textContent =
    seeing.tonight_wind_kmh != null ? `${seeing.tonight_wind_kmh}` : '—';
  document.getElementById('m-precip').querySelector('.metric-val').textContent =
    seeing.tonight_precip_prob != null ? `${seeing.tonight_precip_prob}%` : '—';

  // Seeing label (5-star text)
  let sl = seeing.seeing_label || '—';
  if (sl !== '—') {
    const dict = window.i18n[currentLang] || window.i18n['en'];
    if (sl.includes('Excellent')) sl = sl.replace('Excellent', dict.excellent || 'Excellent');
    else if (sl.includes('Good')) sl = sl.replace('Good', dict.good || 'Good');
    else if (sl.includes('Fair')) sl = sl.replace('Fair', dict.fair || 'Fair');
    else if (sl.includes('Poor')) sl = sl.replace('Poor', dict.poor || 'Poor');
  }
  document.getElementById('seeing-label').textContent = sl;

  // ── AI-powered extras ─────────────────────────────────────────────────────

  // Engine badge (🤖 AI | 📐 Rule-based)
  const engineBadgeEl = document.getElementById('seeing-engine-badge');
  if (engineBadgeEl) {
    const isAI = seeing.ai_powered;
    engineBadgeEl.textContent   = isAI ? '🤖 AI' : '📐 Rule-based';
    engineBadgeEl.title         = isAI
      ? 'Scored by Qwen3.5-9B (local AI)'
      : 'AI unavailable — using extended rule-based scorer';
    engineBadgeEl.className = `seeing-engine-badge ${isAI ? 'ai' : 'rule'}`;
    engineBadgeEl.style.display = '';
  }

  // AI label (short label from the model)
  const aiLabelEl = document.getElementById('seeing-ai-label');
  if (aiLabelEl) {
    aiLabelEl.textContent = seeing.seeing_label_ai || '';
    aiLabelEl.style.display = seeing.seeing_label_ai ? '' : 'none';
  }

  // Explanation prose
  const explanationEl = document.getElementById('seeing-explanation');
  if (explanationEl) {
    explanationEl.textContent = seeing.seeing_explanation || '';
    explanationEl.style.display = seeing.seeing_explanation ? '' : 'none';
  }

  // Moon Fact
  const moonFactEl = document.getElementById('moon-fact');
  if (moonFactEl) {
    if (seeing.moon_fact) {
      moonFactEl.innerHTML = `✨ <strong>Moon Fact:</strong> ${seeing.moon_fact}`;
      moonFactEl.style.display = 'block';
    } else {
      moonFactEl.style.display = 'none';
    }
  }

  // Best window badge
  const windowEl = document.getElementById('seeing-best-window');
  if (windowEl) {
    if (seeing.best_window) {
      windowEl.textContent = `🔭 Best window: ${seeing.best_window}`;
      windowEl.style.display = '';
    } else {
      windowEl.style.display = 'none';
    }
  }

  // Warning chips
  const warningsEl = document.getElementById('seeing-warnings');
  if (warningsEl) {
    warningsEl.innerHTML = '';
    const warnings = seeing.warnings || [];
    if (warnings.length > 0) {
      warnings.forEach(w => {
        const chip = document.createElement('span');
        chip.className = 'seeing-warning-chip';
        chip.textContent = `⚠️ ${w}`;
        warningsEl.appendChild(chip);
      });
      warningsEl.style.display = '';
    } else {
      warningsEl.style.display = 'none';
    }
  }

  // AI Recommended Targets
  const aiTargetsCard = document.getElementById('card-ai-targets');
  const aiTargetsList = document.getElementById('ai-targets-list');
  if (aiTargetsCard && aiTargetsList) {
    if (seeing.ai_powered && seeing.recommended_targets && seeing.recommended_targets.length > 0) {
      aiTargetsList.innerHTML = '';
      seeing.recommended_targets.forEach(t => {
        const wrap = document.createElement('div');
        wrap.style.background = 'rgba(168, 85, 247, 0.05)';
        wrap.style.border = '1px solid rgba(168, 85, 247, 0.2)';
        wrap.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        wrap.style.padding = '12px 16px';
        wrap.style.borderRadius = '8px';
        wrap.style.transition = 'transform 0.2s ease, background 0.2s ease';
        wrap.style.cursor = 'default';
        wrap.onmouseover = () => { wrap.style.background = 'rgba(168, 85, 247, 0.1)'; wrap.style.transform = 'translateY(-2px)'; wrap.style.border = '1px solid rgba(168, 85, 247, 0.4)'; };
        wrap.onmouseout = () => { wrap.style.background = 'rgba(168, 85, 247, 0.05)'; wrap.style.transform = 'none'; wrap.style.border = '1px solid rgba(168, 85, 247, 0.2)'; };
        
        const title = document.createElement('div');
        title.style.fontWeight = '600';
        title.style.color = '#e2e8f0';
        title.style.fontSize = '1.05rem';
        title.innerHTML = `✨ ${t.name}`;
        
        const reason = document.createElement('div');
        reason.style.fontSize = '0.85rem';
        reason.style.color = '#94a3b8';
        reason.style.marginTop = '6px';
        reason.style.lineHeight = '1.4';
        reason.textContent = t.reason;
        
        wrap.appendChild(title);
        wrap.appendChild(reason);
        aiTargetsList.appendChild(wrap);
      });
      aiTargetsCard.style.display = 'block';
    } else {
      aiTargetsCard.style.display = 'none';
    }
  }

  // Dark window
  if (data) {
    const lblDark = window.i18n[currentLang].lbl_dark || 'Dark:';
    document.getElementById('dark-window').textContent =
      `${lblDark} ${data.astronomical_dusk || '?'} → ${data.astronomical_dawn || '?'} (${data.observing_window_hours || '?'}h)`;
  }
}



function renderMoon(moon) {
  if (!moon) {
    document.getElementById('moon-phase-name').textContent = 'Loading failed';
    return;
  }
  const dict = window.i18n[currentLang] || window.i18n['en'];
  const phaseMap = {
    "New Moon": dict.p_new || "New Moon",
    "Waxing Crescent": dict.p_wax_c || "Waxing Crescent",
    "First Quarter": dict.p_1q || "First Quarter",
    "Waxing Gibbous": dict.p_wax_g || "Waxing Gibbous",
    "Full Moon": dict.p_full || "Full Moon",
    "Waning Gibbous": dict.p_wan_g || "Waning Gibbous",
    "Last Quarter": dict.p_3q || "Last Quarter",
    "Waning Crescent": dict.p_wan_c || "Waning Crescent"
  };

  document.getElementById('moon-phase-icon').textContent = moon.phase_name ? moon.phase_name.split(' ')[0] : '🌙';
  let pName = moon.phase_name || '—';
  if (pName !== '—') {
    const rawPhase = pName.replace(/[^a-zA-Z\s]/g, '').trim();
    if (phaseMap[rawPhase]) {
      pName = pName.replace(rawPhase, phaseMap[rawPhase]);
    }
  }
  document.getElementById('moon-phase-name').textContent = pName;
  document.getElementById('moon-illum-badge').textContent = `${moon.illumination_pct ?? '?'}%`;
  document.getElementById('moon-arc-fill').style.width = `${moon.illumination_pct || 0}%`;
  document.getElementById('moon-arc-label').textContent = `${moon.illumination_pct ?? 0}%`;
  document.getElementById('moon-rise').textContent = moon.moonrise || '—';
  document.getElementById('moon-set').textContent = moon.moonset || '—';
  document.getElementById('moon-alt').textContent = `${moon.altitude_deg ?? '?'}°`;

  let impact = moon.dso_impact || '—';
  if (impact !== '—') {
    if (impact.includes('Good')) impact = dict.moon_good || impact;
    else if (impact.includes('Fair')) impact = dict.moon_fair || impact;
    else if (impact.includes('Poor')) impact = dict.moon_poor || impact;
    else if (impact.includes('Excellent')) impact = dict.moon_exc || impact;
    else if (impact.includes('below horizon')) impact = dict.moon_below || impact;
  }
  document.getElementById('dso-impact').textContent = impact;
}

function loadActiveConstellation(abbr) {
  const select = document.getElementById('ac-select');
  if (select && select.value !== abbr) select.value = abbr;
  
  const statusEl = document.getElementById('ac-status');
  if (statusEl) {
    statusEl.textContent = 'Loading...';
    statusEl.style.color = 'var(--text-primary)';
    statusEl.style.borderColor = 'var(--border)';
  }
  fetchAndRender(`/constellation_window?abbr=${abbr}`, renderActiveConstellation, { status: "Network error" });
  
  // Concurrently fetch targets to plot on map
  fetchAPI(`/targets?constellation=${abbr}`).then(res => {
    if (res && res.targets) {
      renderConstellationMap(res.targets);
    }
  });
}

function renderConstellationMap(targets) {
  const container = document.getElementById('ac-map-container');
  const svg = d3.select('#ac-map-svg');
  const tooltip = d3.select('#ac-map-tooltip');
  const detailsPanel = document.getElementById('ac-details-panel');
  
  if (!container || !svg.node()) return;
  
  // Clear previous
  svg.selectAll('*').remove();
  detailsPanel.style.display = 'none';

  if (!targets || targets.length === 0) {
    svg.append('text')
       .attr('x', '50%').attr('y', '50%')
       .attr('text-anchor', 'middle').attr('fill', '#a1a1aa')
       .attr('font-size', '0.8rem').text('No map data available');
    return;
  }

  // Filter out targets missing ra/dec
  const validTargets = targets.filter(t => t.ra_hours != null && t.dec_degrees != null);
  if (validTargets.length === 0) return;

  const width = container.clientWidth || 300;
  const height = container.clientHeight || 200;

  // Calculate center of all targets
  const centerRa = d3.mean(validTargets, d => d.ra_hours) * 15; // convert hours to degrees
  const centerDec = d3.mean(validTargets, d => d.dec_degrees);

  // Projection setup
  const projection = d3.geoStereographic()
      .rotate([-centerRa, -centerDec])
      .scale(width * 1.5)
      .translate([width / 2, height / 2]);

  // Draw targets
  const nodes = svg.selectAll('g.target')
    .data(validTargets)
    .enter()
    .append('g')
    .attr('class', 'target')
    .attr('transform', d => {
        const [x, y] = projection([d.ra_hours * 15, d.dec_degrees]);
        return `translate(${x},${y})`;
    })
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
        d3.select(this).select('circle').attr('stroke', '#fff').attr('stroke-width', 2);
        tooltip.style('opacity', 1)
               .html(`<strong>${d.name}</strong><br>Mag ${d.magnitude || '?'}`)
               .style('left', (event.pageX + 10) + 'px')
               .style('top', (event.pageY - 20) + 'px');
    })
    .on('mousemove', function(event) {
        tooltip.style('left', (event.pageX + 10) + 'px')
               .style('top', (event.pageY - 20) + 'px');
    })
    .on('mouseout', function(event, d) {
        d3.select(this).select('circle').attr('stroke', null);
        tooltip.style('opacity', 0);
    })
    .on('click', function(event, d) {
        // Show details panel
        detailsPanel.style.display = 'block';
        document.getElementById('acd-name').textContent = d.name;
        document.getElementById('acd-type').textContent = `${d.type || 'Object'} • Mag ${d.magnitude || '?'}`;
        document.getElementById('acd-desc').textContent = d.description || 'No description available.';
        
        let diffColor = 'rgba(255,255,255,0.1)';
        let diffText = '#fff';
        const diffStr = (d.difficulty || '').toLowerCase();
        if (diffStr.includes('easy') || diffStr.includes('naked')) { diffColor = 'rgba(34,197,94,0.15)'; diffText = '#4ade80'; }
        else if (diffStr.includes('medium')) { diffColor = 'rgba(245,158,11,0.15)'; diffText = '#f59e0b'; }
        else if (diffStr.includes('hard')) { diffColor = 'rgba(248,113,113,0.15)'; diffText = '#f87171'; }
        
        const diffEl = document.getElementById('acd-diff');
        diffEl.textContent = (d.difficulty || 'Unknown').replace('_', ' ');
        diffEl.style.background = diffColor;
        diffEl.style.color = diffText;
        
        document.getElementById('acd-alt').textContent = d.altitude_deg != null ? `${d.altitude_deg}° ${d.direction} • ${d.visible ? 'In view' : 'Below horizon'}` : '';
    });

  // Plot circle
  nodes.append('circle')
    .attr('r', d => {
        const mag = d.magnitude || 5;
        // Brighter (lower mag) = bigger radius
        return Math.max(2, 6 - (mag / 2));
    })
    .attr('fill', d => {
        const t = (d.type || '').toLowerCase();
        if (t.includes('star')) return '#fbbf24'; // yellow-ish
        if (t.includes('cluster')) return '#38bdf8'; // blue-ish
        if (t.includes('nebula')) return '#f472b6'; // pink-ish
        if (t.includes('galaxy')) return '#a855f7'; // purple
        return '#cbd5e1';
    })
    .style('filter', 'drop-shadow(0 0 4px rgba(255,255,255,0.4))');
}

function renderActiveConstellation(s) {
  const statusEl = document.getElementById('ac-status');
  
  if (!s || s.error) {
    if (statusEl) statusEl.textContent = 'Could not load data';
    return;
  }
  
  if (statusEl) {
    let rawStat = s.status || '—';
    const dict = window.i18n[currentLang] || window.i18n['en'];
    if (rawStat.includes('NOT VISIBLE')) rawStat = `🔴 ${dict.not_vis || 'NOT VISIBLE'} — ${dict.not_vis_sub || 'Below horizon or in twilight'}`;
    else if (rawStat.includes('VISIBLE NOW')) rawStat = `🟢 ${dict.vis_now || 'VISIBLE NOW'} — ${dict.highest_at || 'Highest point at'} ${s.culmination_time}`;
    else if (rawStat.includes('LOW')) rawStat = `🟡 ${dict.low_vis || 'LOW'} — ${dict.best_later || 'Visible, but best later at'} ${s.culmination_time}`;
    
    statusEl.innerHTML = rawStat;
    if (s.current_altitude_deg > 15) {
      statusEl.style.borderColor = 'rgba(34,197,94,0.4)';
      statusEl.style.color = '#22c55e';
    } else if (s.current_altitude_deg > 0) {
      statusEl.style.borderColor = 'rgba(245,158,11,0.4)';
      statusEl.style.color = '#f59e0b';
    } else {
      statusEl.style.borderColor = 'rgba(248,113,113,0.4)';
      statusEl.style.color = '#f87171';
    }
  }

  const badgeEl = document.getElementById('ac-status-badge');
  if (badgeEl) {
    const dict = window.i18n[currentLang] || window.i18n['en'];
    if (s.current_altitude_deg > 15) {
      badgeEl.textContent = dict.up_now || 'UP NOW';
      badgeEl.style.background = 'rgba(34,197,94,0.15)';
      badgeEl.style.borderColor = 'rgba(34,197,94,0.4)';
      badgeEl.style.color = '#22c55e';
    } else if (s.current_altitude_deg > 0) {
      badgeEl.textContent = dict.low || 'LOW';
      badgeEl.style.background = 'rgba(245,158,11,0.15)';
      badgeEl.style.borderColor = 'rgba(245,158,11,0.4)';
      badgeEl.style.color = '#f59e0b';
    } else {
      badgeEl.textContent = dict.down || 'DOWN';
      badgeEl.style.background = 'rgba(248,113,113,0.15)';
      badgeEl.style.borderColor = 'rgba(248,113,113,0.4)';
      badgeEl.style.color = '#f87171';
    }
  }

  document.getElementById('ac-rise').textContent = s.rise_time || '—';
  
  // Set time (using set if available, else derive from best_time loosely or NA)
  document.getElementById('ac-set').textContent = s.set_time || '—';
  
  // Calculate Arc progress
  const fillEl = document.getElementById('ac-arc-fill');
  const labelEl = document.getElementById('ac-arc-label');
  if (fillEl && labelEl && s.current_altitude_deg != null && s.culmination_altitude_deg != null) {
      let pct = 0;
      if (s.current_altitude_deg > 0) {
          pct = Math.min(100, Math.max(0, (s.current_altitude_deg / s.culmination_altitude_deg) * 100));
      }
      fillEl.style.width = `${pct}%`;
      labelEl.textContent = `${s.current_altitude_deg}°`;
  }
    
  const dict = window.i18n[currentLang] || window.i18n['en'];
  const constName = dict[`const_${s.abbr ? s.abbr.toLowerCase() : ''}`] || s.name;
  
  const lblBestTime = dict.best_viewing || 'Best viewing time for';
  const lblTonightAround = dict.tonight_around || 'tonight is around';
  
  document.getElementById('ac-note').innerHTML = `💡 ${lblBestTime} <strong>${constName}</strong> ${lblTonightAround} <strong>${s.best_time}</strong>.`;
}

function renderPlanets(planets) {
  const list = document.getElementById('planet-list');
  if (!planets) {
    list.innerHTML = '<div class="no-data">Could not load planet data — API may be offline</div>';
    return;
  }
  if (planets.length === 0) {
    list.innerHTML = '<div class="no-data">No major planets visible above the horizon right now</div>';
    return;
  }

  list.innerHTML = planets.map(p => {
    const dict = window.i18n[currentLang] || window.i18n['en'];
    const pName = dict[`planet_${p.name.toLowerCase()}`] || p.name;
    return `
      <div class="planet-item ${p.visible_tonight ? '' : 'not-visible'}">
        <div class="planet-vis-dot ${p.visible_tonight ? 'visible' : 'hidden'}"></div>
        <span class="planet-emoji">${p.emoji}</span>
        <span class="planet-name">${pName}</span>
        <span class="planet-alt">${p.altitude_deg}°</span>
        <span class="planet-dir">${p.direction}</span>
      </div>
    `;
  }).join('');
}

function renderAlerts(alerts) {
  const list = document.getElementById('alert-list');
  if (!alerts || alerts.length === 0) {
    list.innerHTML = '<div class="no-data">No special alerts for tonight</div>';
    return;
  }
  list.innerHTML = alerts.map((a, i) => {
    const dict = window.i18n[currentLang] || window.i18n['en'];
    let str = a;
    if (str.includes('is UP')) str = str.replace('is UP', dict.is_up || 'is UP');
    if (str.includes('EXCELLENT')) str = str.replace('EXCELLENT', dict.excellent || 'EXCELLENT');
    if (str.includes(' at ')) str = str.replace(' at ', ` ${dict.at || 'at'} `);
    // Try to translate planets and constellations in the string
    ['Venus', 'Mars', 'Jupiter', 'Saturn', 'Mercury'].forEach(pl => {
      if (str.includes(pl)) str = str.replace(pl, dict[`planet_${pl.toLowerCase()}`] || pl);
    });
    for (const key in dict) {
      if (key.startsWith('const_')) {
        const en_name = window.i18n['en'][key];
        if (en_name && str.includes(en_name)) {
          str = str.replace(en_name, dict[key]);
        }
      }
    }
    return `
      <div class="alert-item" style="animation-delay: ${i * 0.08}s">
        ${str}
      </div>
    `;
  }).join('');
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
      let dDateRaw = d.date.split(',')[0];
      let dMonthRaw = d.date.split(', ')[1] || '';
      let dRatingRaw = d.rating || '—';
      let dWeatherRaw = d.weather || '—';
      
      const dict = window.i18n[currentLang] || window.i18n['en'];
      let dDate = translateDate(dDateRaw);
      let dMonth = translateDate(dMonthRaw);
      
      if (dRatingRaw.includes('Poor')) dRatingRaw = dRatingRaw.replace('Poor', dict.poor || 'Poor');
      if (dRatingRaw.includes('Good')) dRatingRaw = dRatingRaw.replace('Good', dict.good || 'Good');
      if (dRatingRaw.includes('Fair')) dRatingRaw = dRatingRaw.replace('Fair', dict.fair || 'Fair');
      if (dRatingRaw.includes('Excellent')) dRatingRaw = dRatingRaw.replace('Excellent', dict.excellent || 'Excellent');
      
      if (dWeatherRaw.includes('Cloudy')) dWeatherRaw = dWeatherRaw.replace('Cloudy', dict.w_cloudy || 'Cloudy');
      if (dWeatherRaw.includes('Clear')) dWeatherRaw = dWeatherRaw.replace('Clear', dict.w_clear || 'Clear');
      if (dWeatherRaw.includes('Rain')) dWeatherRaw = dWeatherRaw.replace('Rain', dict.w_rain || 'Rain');
      if (dWeatherRaw.includes('Snow')) dWeatherRaw = dWeatherRaw.replace('Snow', dict.w_snow || 'Snow');

      const moonEmoji = d.moon_phase ? d.moon_phase.split(' ')[0] : '🌙';
      let highlights = (d.highlights || []).slice(0, 2);
      highlights = highlights.map(h => {
        let res = h;
        if (res.includes('Clear skies')) res = res.replace('Clear skies (no major events)', dict.clear_skies || 'Clear skies (no major events)');
        return res;
      });
      return `
        <div class="day-card ${isToday ? 'today' : ''}">
          <div class="day-name">${dDate}</div>
          <div class="day-date">${dMonth}</div>
          <div class="day-rating">${dRatingRaw}</div>
          <div class="day-moon">${moonEmoji}</div>
          <div class="day-weather">${dWeatherRaw}</div>
          ${highlights.length > 0 ? `
          <div style="margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
            <marquee scrollamount="2" scrolldelay="100" style="width: 100%; font-size: 0.75rem; color: var(--accent-scorpius);">
              ${highlights.map(h => `<span class="day-highlight" style="margin-right: 15px;">${h}</span>`).join('')}
            </marquee>
          </div>
          ` : ''}
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
          <a href="https://heavens-above.com/PassSummary.aspx?satid=25544&lat=${currentLat}&lng=${currentLon}" 
             target="_blank" style="color: #4a9eff">
            Check Heavens-Above.com for passes ↗
          </a>
        </div>`;
      return;
    }

    container.innerHTML = data.passes.map(p => {
      if (p.rise === 'Check Heavens-Above.com' || p.rise === 'N/A' || p.error) {
        return `
        <div class="no-data" style="padding: 15px; margin: 0;">
          API Connection Error (Could not fetch TLE data)<br><br>
          <a href="https://heavens-above.com/PassSummary.aspx?satid=25544&lat=${currentLat}&lng=${currentLon}" 
             target="_blank" style="color: #4a9eff; font-size: 0.9em;">
            Check Heavens-Above.com directly ↗
          </a>
        </div>`;
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

// ── Render: Constellations Tonight ─────────────────────────────────────────
async function loadConstellations() {
  await fetchAndRender('/constellations?filter_famous=true', (data) => {
    const list = document.getElementById('constellations-grid');
    if (!data || !data.constellations || data.constellations.length === 0) {
      list.innerHTML = '<div class="no-data">Could not load constellation data</div>';
      return;
    }

    const visibleConst = data.constellations.filter(c => c.visible).slice(0, 16);
    if (visibleConst.length === 0) {
      list.innerHTML = '<div class="no-data">No famous constellations visible tonight</div>';
      return;
    }

    list.innerHTML = '';
    visibleConst.forEach(c => {
      const div = document.createElement('div');
      const color = c.altitude_deg > 15 ? '#22c55e' : c.altitude_deg > 0 ? '#f59e0b' : '#f87171';
      div.className = 'const-card';
      div.dataset.const = c.abbr;
      div.innerHTML = `
        <div class="c-name">${c.emoji || '✨'} ${c.name}</div>
        <div class="c-abbr">${c.abbr}</div>
        <div class="c-alt" style="color: ${color}">● ${c.altitude_deg}° ${c.direction}</div>
      `;
      div.addEventListener('click', () => {
        // Find corresponding tab and click it
        const tab = document.querySelector(`.const-tab[data-const="${c.abbr}"]`);
        if (tab) tab.click();
        
        // Scroll target database into view
        document.getElementById('card-targets').scrollIntoView({ behavior: 'smooth' });
      });
      list.appendChild(div);
    });
  });
}

// ── Render: Target Database ─────────────────────────────────────────────────
let currentConstellation = 'Sco';

async function loadTargets() {
  await fetchAndRender(`/targets?constellation=${currentConstellation}`, (liveData) => {
    if (!liveData || !liveData.targets) return;
    const targets = liveData.targets;

    // Build a live altitude map from API data
    const liveMap = {};
    targets.forEach(t => { liveMap[t.id] = t; });

    const filterBtn = document.querySelector('.filter-btn.active');
    const filter = filterBtn ? filterBtn.dataset.filter : 'all';

    renderTargetGrid(targets, liveMap, filter);

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      // Remove old listeners to prevent duplicates on SWR re-render
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      
      newBtn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        newBtn.classList.add('active');
        const f = newBtn.dataset.filter;
        renderTargetGrid(targets, liveMap, f);
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

    const dict = window.i18n[currentLang] || window.i18n['en'];
    const tName = dict[`target_${t.id}_name`] || t.name;
    const tType = dict[`target_${t.id}_type`] || t.type;
    const tDesc = dict[`target_${t.id}_desc`] || t.description;

    return `
      <div class="target-card ${visibleNow ? 'visible-now' : ''}" data-type="${t.type}">
        <div class="tc-header">
          <span class="tc-emoji">${t.emoji}</span>
          <div>
            <div class="tc-name">${tName}</div>
            <div class="tc-type">${tType}</div>
          </div>
          <span class="tc-mag">mag ${t.magnitude}</span>
        </div>
        <div class="tc-desc">${tDesc}</div>
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
      badge.innerHTML = '<span class="pulse-dot"></span> <span data-i18n="live_badge">' + window.i18n[currentLang].live_badge + '</span>';
      badge.style.background = 'rgba(34,197,94,0.1)';
      badge.style.borderColor = 'rgba(34,197,94,0.3)';
      badge.style.color = '#22c55e';
    } else { throw new Error(); }
  } catch {
    badge.innerHTML = '📡 <span data-i18n="offline_badge">' + window.i18n[currentLang].offline_badge + '</span>';
    badge.style.background = 'rgba(239,68,68,0.1)';
    badge.style.borderColor = 'rgba(239,68,68,0.3)';
    badge.style.color = '#f87171';
  }
}

function updateClearOutside() {
  const lat = currentLat.toFixed(2);
  const lon = currentLon.toFixed(2);
  const forecastUrl = `https://clearoutside.com/forecast/${lat}/${lon}`;

  const img = document.getElementById('clearoutside-img');
  if (img) {
    img.src = `https://clearoutside.com/forecast_image_large/${lat}/${lon}/forecast.png`;
  }

  const headerLink = document.getElementById('clearoutside-link');
  if (headerLink) headerLink.href = forecastUrl;

  const resourceLink = document.getElementById('clearoutside-resource-link');
  if (resourceLink) resourceLink.href = forecastUrl;
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
  
  // About Modal
  const aboutModal = document.getElementById('about-modal');
  const openAbout = () => aboutModal.classList.remove('hidden');
  
  document.getElementById('btn-about').addEventListener('click', openAbout);
  document.getElementById('logo-slogan').addEventListener('click', openAbout);
  
  document.getElementById('close-about-btn').addEventListener('click', () => {
    aboutModal.classList.add('hidden');
  });

  document.getElementById('btn-save-loc').addEventListener('click', async () => {
    const lat = parseFloat(inputLat.value);
    const lon = parseFloat(inputLon.value);
    let name = inputName.value.trim();
    if (isNaN(lat) || isNaN(lon)) return alert('Invalid coordinates');
    
    const btn = document.getElementById('btn-save-loc');
    const oldText = btn.textContent;
    btn.textContent = 'Locating...';
    btn.disabled = true;

    // Reverse geocode if no custom name provided
    if (!name || name === 'GPS Location' || name === 'Custom Location') {
      try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
        const data = await res.json();
        const parts = [];
        if (data.city || data.locality) parts.push(data.city || data.locality);
        if (data.principalSubdivision) parts.push(data.principalSubdivision);
        
        if (parts.length > 0) {
            name = parts.join(', ');
        } else if (data.countryName) {
            name = data.countryName;
        } else {
            name = 'Custom Location';
        }
      } catch (e) {
        console.warn('Reverse geocode failed:', e);
        name = name || 'Custom Location';
      }
    }
    
    const newLoc = { id: 'loc_' + Date.now(), name, lat, lon };
    savedLocations.push(newLoc);
    localStorage.setItem('stargazer_locations', JSON.stringify(savedLocations));
    
    btn.textContent = oldText;
    btn.disabled = false;
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
  document.querySelectorAll('.const-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.const-tab').forEach(b => b.classList.remove('active'));
      const btn = e.target;
      btn.classList.add('active');
      currentConstellation = btn.dataset.const;
      document.getElementById('target-db-title').textContent = `${btn.textContent.trim()} ${window.i18n[currentLang].targets_title_suffix}`;
      loadTargets();
      loadActiveConstellation(currentConstellation);
    });
  });

  // Setup Active Constellation Dropdown
  const selectEl = document.getElementById('ac-select');
  if (selectEl) {
    selectEl.addEventListener('change', (e) => {
      currentConstellation = e.target.value;
      
      // Update the active tab if it exists
      document.querySelectorAll('.const-tab').forEach(b => b.classList.remove('active'));
      const matchingTab = document.querySelector(`.const-tab[data-const="${currentConstellation}"]`);
      if (matchingTab) {
        matchingTab.classList.add('active');
        document.getElementById('target-db-title').textContent = `${matchingTab.textContent.trim()} ${window.i18n[currentLang].targets_title_suffix}`;
      } else {
        // Fallback title update if no tab exists for this constellation
        const text = e.target.options[e.target.selectedIndex].text.replace(/^[^\s]+\s/, ''); // Remove emoji
        document.getElementById('target-db-title').textContent = `${text} ${window.i18n[currentLang].targets_title_suffix}`;
      }
      
      loadTargets();
      loadActiveConstellation(currentConstellation);
    });
  }

  // Load everything in parallel
  await Promise.allSettled([
    checkAPIStatus(),
    loadTonightReport(),
    loadWeekly(),
    loadISS(),
    loadConstellations(),
    loadTargets(),
    loadActiveConstellation(currentConstellation)
  ]);

  // Night Mode Toggle
  const nightBtn = document.getElementById('btn-night-mode');
  if (nightBtn) {
    nightBtn.addEventListener('click', () => {
      document.body.classList.toggle('night-mode');
    });
  }

  // Back to top smooth scroll
  const backToTopBtn = document.querySelector('.back-to-top');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Refresh live data every 10 minutes
  setInterval(async () => {
    await loadTonightReport();
    await loadISS();
    await loadActiveConstellation(currentConstellation);
  }, 10 * 60 * 1000);
}

document.addEventListener('DOMContentLoaded', init);


// ── i18n ────────────────────────────────────────────────────────────────────

function setLanguage(lang) {
  if(!window.i18n[lang]) lang = 'en';
  currentLang = lang;
  localStorage.setItem('stargazer_lang', lang);
  
  const dict = window.i18n[currentLang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (dict[key]) {
      el.innerHTML = dict[key];
    }
  });
  
  const langSelect = document.getElementById('lang-select');
  if(langSelect) langSelect.value = currentLang;
  
  // Update dynamic titles
  const targetTitle = document.getElementById('target-db-title');
  if(targetTitle && document.querySelector('.const-tab.active')) {
    const tabTxt = document.querySelector('.const-tab.active').textContent.trim();
    targetTitle.textContent = `${tabTxt} ${dict.targets_title_suffix}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const langSelect = document.getElementById('lang-select');
        if(langSelect) {
            langSelect.addEventListener('change', (e) => {
                setLanguage(e.target.value);
                window.location.reload();
            });
        }
        setLanguage(currentLang);
    }, 100);
});


const closeNightTooltip = document.getElementById('close-night-tooltip');
if (closeNightTooltip) {
  closeNightTooltip.addEventListener('click', () => {
    document.getElementById('night-tooltip').style.display = 'none';
  });
}

// --- Interactive Tour ---
function initTour() {
  if (typeof window.driver === 'undefined') return;
  const getTrans = (key) => window.i18n[currentLang][key] || key;
  
  const driver = window.driver.js.driver({
    showProgress: true,
    animate: true,
    steps: [
      { element: '#btn-location', popover: { title: getTrans('tour_loc_title'), description: getTrans('tour_loc_desc'), side: "bottom", align: 'start' }},
      { element: '.card-conditions', popover: { title: getTrans('tour_cond_title'), description: getTrans('tour_cond_desc'), side: "bottom", align: 'start' }},
      { element: '#card-targets', popover: { title: getTrans('tour_targets_title'), description: getTrans('tour_targets_desc'), side: "top", align: 'start' }},
      { element: '#btn-night-mode', popover: { title: getTrans('tour_night_title'), description: getTrans('tour_night_desc'), side: "top", align: 'end' }}
    ]
  });

  const btnTour = document.getElementById('btn-tour');
  if (btnTour) {
    btnTour.addEventListener('click', () => {
      driver.drive();
    });
  }

  // Auto-start on first load
  if (!localStorage.getItem('stargazer_tour_seen')) {
    localStorage.setItem('stargazer_tour_seen', 'true');
    setTimeout(() => { driver.drive(); }, 1500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => initTour(), 500);
});
