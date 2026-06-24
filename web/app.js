let currentLang = localStorage.getItem('stargazer_lang') || 'en';
window.currentLang = currentLang;

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
window.showInfo = function(msg, event, sticky = false) {
  const t = document.getElementById('toast');
  const tm = document.getElementById('toast-msg');
  if (!t || !tm) return;
  
  // Allow clicking the close button if sticky
  t.style.pointerEvents = sticky ? 'auto' : 'none';
  
  if (sticky) {
    tm.innerHTML = `
      <div style="position:relative; padding-right:12px;">
        <div onclick="document.getElementById('toast').style.opacity='0'; setTimeout(()=>document.getElementById('toast').style.display='none',200)" style="position:absolute; top:-12px; right:-14px; cursor:pointer; color:#94a3b8; font-weight:bold; font-size:1.2rem; padding:4px; z-index:10001;">&times;</div>
        ${msg}
      </div>
    `;
  } else {
    tm.innerHTML = msg;
  }
  
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
  if (!sticky) {
    toastTimeout = setTimeout(() => {
      t.style.opacity = '0';
      setTimeout(() => { t.style.display = 'none'; }, 200);
    }, 3500);
  }
};

// ── Configuration ──────────────────────────────────────────────────────────
let API_BASE;
if (window.location.hostname.includes('nick-t.net')) {
  API_BASE = 'https://stargazerapi.nick-t.net';
} else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  API_BASE = 'http://localhost:8181';
} else {
  API_BASE = '/api'; // Fallback for Docker LAN self-hosting where Nginx is the proxy
}

const DEFAULT_LOCATIONS = [
  { id: 'default', name: 'Mauna Kea Observatory', lat: 19.8206, lon: -155.4681 }
];

let savedLocations = DEFAULT_LOCATIONS;
try {
  const parsed = JSON.parse(localStorage.getItem('stargazer_locations'));
  if (Array.isArray(parsed) && parsed.length > 0) {
    const valid = parsed.filter(loc => typeof loc.lat === 'number' && typeof loc.lon === 'number' && loc.name);
    if (valid.length > 0) savedLocations = valid;
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
  const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  const optionsDate = { weekday: 'short', month: 'short', day: 'numeric' };
  
  if (window.currentLocationTimezone) {
    optionsTime.timeZone = window.currentLocationTimezone;
    optionsDate.timeZone = window.currentLocationTimezone;
  }
  
  const t = now.toLocaleTimeString(currentLang, optionsTime);
  const d = now.toLocaleDateString(currentLang, optionsDate);
  
  const clockEl = document.getElementById('clock');
  const dateEl = document.getElementById('date-display');
  
  if (clockEl) clockEl.textContent = t;
  if (dateEl) dateEl.textContent = d;
}
updateClock();
setInterval(updateClock, 1000);

// Set Dynamic Subtitle
const subtitle = document.getElementById('logo-sub');
const coords = document.getElementById('logo-coords');
if (subtitle) {
  subtitle.removeAttribute('data-i18n');
  subtitle.textContent = activeLoc.name;
}
if (coords) {
  const latStr = Math.abs(activeLoc.lat).toFixed(3) + (activeLoc.lat >= 0 ? '°N' : '°S');
  const lonStr = Math.abs(activeLoc.lon).toFixed(3) + (activeLoc.lon >= 0 ? '°E' : '°W');
  coords.textContent = `${latStr}, ${lonStr}`;
}

async function fetchAPI(path, fallback = null) {
  const separator = path.includes('?') ? '&' : '?';
  const finalPath = `${path}${separator}lat=${currentLat}&lon=${currentLon}&lang=${currentLang}`;
  const cacheKey = `stargazer_cache_${finalPath}`;
  
  // Stale-while-revalidate: return cached data immediately if we have it
  const cached = localStorage.getItem(cacheKey);
  let parsedCache = null;
  if (cached) {
    try { 
      const p = JSON.parse(cached); 
      if (p !== null && typeof p === 'object') parsedCache = p;
    } catch(e) {}
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
    try { 
      const p = JSON.parse(cached); 
      if (p !== null && typeof p === 'object') renderFn(p); 
    } catch(e) {}
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
    window.lastTonightData = data;
    window.currentLocationTimezone = data.location_timezone || null;
    updateClock(); // Force immediate update with new timezone
    
    renderGoNogo(data);
    renderSeeing(data.seeing, data);
    renderMoon(data.moon);
    renderPlanets(data.visible_planets || [], data.planet_fact);
    renderAlerts(data.must_see || []);
    
    // Fire off async AI fetch now that the UI is rendered
    fetchAIAnalysis();
  });
}

async function fetchAIAnalysis() {
  const aiTargetsCard = document.getElementById('card-ai-targets');
  const engineBadgeEl = document.getElementById('seeing-engine-badge');
  const moonFactEl = document.getElementById('moon-fact');

  const explanationEl = document.getElementById('seeing-explanation');
  
  if (explanationEl) {
    const dict = window.i18n[currentLang] || window.i18n['en'];
    explanationEl.innerHTML = `✨ <span style="font-style:italic;">${dict.ai_analyzing || 'AI is analyzing the atmosphere (this takes a moment)...'}</span>`;
    explanationEl.classList.add('ai-loading-glow');
    explanationEl.style.display = 'block';
  }

  if (aiTargetsCard) {
    // DO NOT hide the card, because it contains Must-See targets too!
    // Just ensure we update it.
    updateUnifiedCard();
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
    if (aiData.status === 'processing') {
      // Background AI generation is running, poll every 10s
      if (explanationEl) {
        explanationEl.classList.add('ai-loading-glow');
        const dict = window.i18n[currentLang] || window.i18n['en'];
        explanationEl.innerHTML = `✨ <span style="font-style:italic;">${dict.ai_analyzing || 'AI is analyzing the atmosphere (this takes a moment)...'}</span>`;
        explanationEl.style.display = 'block';
      }
      setTimeout(fetchAIAnalysis, 10000);
      return;
    }
    
    if (explanationEl) {
      explanationEl.classList.remove('ai-loading-glow');
    }
    
    // Update the UI with the fresh AI data
    if (aiData.ai_powered) {
      if (window.lastTonightData) {
        window.lastTonightData.seeing = aiData;
        renderGoNogo(window.lastTonightData);
        renderSeeing(aiData, window.lastTonightData);
      } else {
        renderSeeing(aiData, null);
      }
    } else {
      throw new Error('AI returned rule-based fallback');
    }
  } catch(e) {
    console.warn("AI Fetch failed", e);
    window.lastAIHTML = '';
    updateUnifiedCard();
    if (engineBadgeEl) {
      engineBadgeEl.textContent = 'Fallback: Rule-based';
      engineBadgeEl.className = 'seeing-engine-badge rule';
      engineBadgeEl.title = 'AI could not be reached. Showing rule-based metrics.';
    }
    const explanationEl = document.getElementById('seeing-explanation');
    if (explanationEl) {
      explanationEl.classList.remove('ai-loading-glow');
    }
    const cachedMoonFact = localStorage.getItem(`stargazer_moon_fact_${currentLang}`);
    if (cachedMoonFact && moonFactEl) {
      moonFactEl.innerHTML = `✨ <strong>${window.i18n[currentLang]?.moon_fact_title || 'Moon Fact'}:</strong> ${cachedMoonFact}`;
      moonFactEl.style.display = 'block';
    } else if (moonFactEl) {
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
  const cloudEl = document.getElementById('m-cloud');
  if (cloudEl) cloudEl.querySelector('.metric-val').textContent =
    seeing.tonight_cloud_pct != null ? `${seeing.tonight_cloud_pct}%` : '—';
  const windEl = document.getElementById('m-wind');
  if (windEl) windEl.querySelector('.metric-val').textContent =
    seeing.tonight_wind_kmh != null ? `${seeing.tonight_wind_kmh}` : '—';
  const precipEl = document.getElementById('m-precip');
  if (precipEl) precipEl.querySelector('.metric-val').textContent =
    seeing.tonight_precip_prob != null ? `${seeing.tonight_precip_prob}%` : '—';

  // Update HUD
  const hudWeather = document.getElementById('hud-weather');
  if (hudWeather) {
    const tempStr = seeing.tonight_temp_c != null ? `${seeing.tonight_temp_c}°C` : '--°C';
    const windStr = seeing.tonight_wind_kmh != null ? `${seeing.tonight_wind_kmh} km/h` : '-- km/h';
    hudWeather.textContent = `🌡️ ${tempStr} | 💨 ${windStr}`;
  }

  // Format Seeing Label
  let sl = seeing.seeing_label || 'Unknown';
  if (sl.includes('Exceptional')) sl = sl.replace('Exceptional', window.i18n[currentLang].seeing_exceptional || 'Exceptional');
  else if (sl.includes('Good')) sl = sl.replace('Good', window.i18n[currentLang].seeing_good || 'Good');
  else if (sl.includes('Average')) sl = sl.replace('Average', window.i18n[currentLang].seeing_average || 'Average');
  else if (sl.includes('Poor')) sl = sl.replace('Poor', window.i18n[currentLang].seeing_poor || 'Poor');
  else if (sl.includes('Bad — stay in')) sl = sl.replace('Bad — stay in', window.i18n[currentLang].bad_stay_in || 'Bad — stay in');

  const conditionsDesc = seeing.conditions_desc || '';
  let condFinal = conditionsDesc;
  if (conditionsDesc === 'Cloudy / Poor') condFinal = window.i18n[currentLang].cloudy_poor || 'Cloudy / Poor';

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
    explanationEl.classList.remove('ai-loading-glow');
    explanationEl.textContent = seeing.seeing_explanation || '';
    explanationEl.style.display = seeing.seeing_explanation ? '' : 'none';
  }

  // Moon Fact
  const moonFactEl = document.getElementById('moon-fact');
  if (moonFactEl) {
    if (seeing.moon_fact) {
      localStorage.setItem(`stargazer_moon_fact_${currentLang}`, seeing.moon_fact);
      moonFactEl.innerHTML = `✨ <strong>${window.i18n[currentLang]?.moon_fact_title || 'Moon Fact'}:</strong> ${seeing.moon_fact}`;
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
        const text = w.text || w;
        let translatedText = text;
        if (text.includes('100% cloud cover blocks all views')) translatedText = window.i18n[currentLang].cloud_cover_100 || text;
        else if (text.includes('High cirrus clouds reduce transparency')) translatedText = window.i18n[currentLang].high_cirrus_transparency || text;
        const chip = document.createElement('span');
        chip.className = 'seeing-warning-chip';
        chip.textContent = `⚠️ ${translatedText}`;
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
      window.lastAIHTML = '';
      const dummyContainer = document.createElement('div');
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
        
        const titleRow = document.createElement('div');
        titleRow.style.display = 'flex';
        titleRow.style.justifyContent = 'space-between';
        titleRow.style.alignItems = 'center';
        titleRow.style.marginBottom = '6px';
        
        const title = document.createElement('div');
        title.style.fontWeight = '600';
        title.style.color = '#e2e8f0';
        title.style.fontSize = '1.05rem';
        title.innerHTML = `✨ ${t.name}`;
        
        const badgeContainer = document.createElement('div');
        badgeContainer.style.display = 'flex';
        badgeContainer.style.gap = '6px';
        badgeContainer.style.flexWrap = 'wrap';
        
        if (t.constellation) {
            const constBadge = document.createElement('span');
            constBadge.className = 'ai-badge const-badge';
            constBadge.textContent = t.constellation;
            badgeContainer.appendChild(constBadge);
        }
        if (t.equipment) {
            const equipBadge = document.createElement('span');
            equipBadge.className = 'ai-badge equip-badge';
            equipBadge.textContent = t.equipment;
            badgeContainer.appendChild(equipBadge);
        }
        if (t.magnitude && t.magnitude !== "N/A") {
            const magBadge = document.createElement('span');
            magBadge.className = 'ai-badge mag-badge';
            magBadge.textContent = `Mag: ${t.magnitude}`;
            badgeContainer.appendChild(magBadge);
        }
        if (t.distance_ly) {
            const distBadge = document.createElement('span');
            distBadge.className = 'ai-badge dist-badge';
            distBadge.textContent = t.distance_ly;
            badgeContainer.appendChild(distBadge);
        }

        titleRow.appendChild(title);
        titleRow.appendChild(badgeContainer);
        
        const reason = document.createElement('div');
        reason.style.fontSize = '0.85rem';
        reason.style.color = '#94a3b8';
        reason.style.lineHeight = '1.4';
        reason.textContent = t.reason;
        
        wrap.appendChild(titleRow);
        wrap.appendChild(reason);
        
        if (t.how_to_find) {
            const howTo = document.createElement('div');
            howTo.style.fontSize = '0.8rem';
            howTo.style.color = '#cbd5e1';
            howTo.style.marginTop = '8px';
            howTo.style.paddingTop = '8px';
            howTo.style.borderTop = '1px dashed rgba(168, 85, 247, 0.2)';
            howTo.innerHTML = `<strong>📍 How to find it:</strong> ${t.how_to_find}`;
            wrap.appendChild(howTo);
        }
        
        dummyContainer.appendChild(wrap);
      });
      window.lastAIHTML = dummyContainer.innerHTML;
      aiTargetsCard.style.display = 'flex';
      updateUnifiedCard();
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
  
  const hudMoon = document.getElementById('hud-moon');
  if (hudMoon) {
    const icon = moon.phase_name ? moon.phase_name.split(' ')[0] : '🌙';
    const phaseNameOnly = pName.replace(icon, '').trim();
    hudMoon.textContent = `${icon} ${phaseNameOnly} (~${moon.illumination_pct ?? '?'}%)`;
  }
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

  // Fetch constellation info first, then targets, to ensure we have RA/Dec for the map center
  fetchAPI(`/constellation_window?abbr=${abbr}`).then(constRes => {
    if (constRes && !constRes.error) {
      renderActiveConstellation(constRes);
      // Cache this for the map
      window.lastConstInfo = constRes;
    } else {
      renderActiveConstellation({ status: "Network error" });
      window.lastConstInfo = null;
    }
    
    fetchAPI(`/targets?constellation=${abbr}`).then(targetRes => {
      const targets = (targetRes && targetRes.targets) ? targetRes.targets : [];
      renderConstellationMap(targets, window.lastConstInfo);
    });
  });
}

window.celestialInitialized = false;
window.currentMapTargets = [];

function renderConstellationMap(targets, constInfo) {
  const container = document.getElementById('ac-map-container');
  const detailsPanel = document.getElementById('ac-details-panel');
  
  if (!container || typeof Celestial === 'undefined') return;
  
  // Set the global targets so the Celestial callback uses them
  window.currentMapTargets = targets ? targets.filter(t => t.ra_hours != null && t.dec_degrees != null) : [];
  detailsPanel.style.display = 'none';

  let centerRa = 0;
  let centerDec = 0;

  if (constInfo && constInfo.ra_hours != null && constInfo.dec_degrees != null) {
    centerRa = constInfo.ra_hours * 15;
    centerDec = constInfo.dec_degrees;
  } else if (window.currentMapTargets.length > 0) {
    centerRa = d3.mean(window.currentMapTargets, d => d.ra_hours) * 15;
    centerDec = d3.mean(window.currentMapTargets, d => d.dec_degrees);
  } else {
    return; // Cannot render without a center
  }

  const config = {
    container: "ac-map-container",
    width: 0,
    projection: "stereographic",
    transform: "equatorial",
    center: [centerRa, centerDec],
    zoomlevel: 4,
    interactive: true,
    controls: false,
    datapath: "https://cdn.jsdelivr.net/npm/d3-celestial@0.7.32/data/",
    stars: { show: true, limit: 5.5, colors: true, names: true, propername: true, size: 4 },
    dsos: { show: true, limit: 6, names: true },
    constellations: {
      show: true, names: true, namesType: "la", lines: true,
      lineStyle: { stroke: "#60a5fa", width: 1.5, opacity: 0.5 },
      nameStyle: { fill: "#94a3b8", align: "center", baseline: "middle", font: ["12px Space Grotesk, sans-serif"] }
    },
    mw: { show: true, style: { fill: "#ffffff", opacity: 0.08 } },
    lines: { graticule: { show: false }, equatorial: { show: false } },
    background: { fill: "#0a0f1c", stroke: "#1e293b", opacity: 1 }
  };

  if (!window.celestialInitialized) {
    // Only set up the UI once to avoid breaking Celestial's canvas references
    container.innerHTML = `
      <button id="btn-map-expand" class="map-expand-btn" onclick="toggleMapFullscreen()" title="Toggle Fullscreen">⤢</button>
      <div id="ac-map-tooltip" style="position: absolute; opacity: 0; pointer-events: none; background: rgba(15,23,42,0.9); color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; border: 1px solid rgba(168,85,247,0.3); transition: opacity 0.2s; white-space: nowrap; z-index: 10;"></div>
    `;
    
    Celestial.display(config);
    window.celestialInitialized = true;

    // Add custom targets layer once
    Celestial.add({
      type: "raw",
      callback: function(error, json) {
        if (error) return;
        // Initial setup can be empty since redraw will be called immediately
      },
      redraw: function() {
        const proj = Celestial.mapProjection;
        const svg = Celestial.container;
        const tooltip = d3.select('#ac-map-tooltip');
        const detailsPanel = document.getElementById('ac-details-panel');

        const nodes = svg.selectAll('.custom-target')
          .data(window.currentMapTargets, d => d.name);
          
        nodes.enter().append('circle')
          .attr('class', 'custom-target')
          .attr('r', d => Math.max(3, 7 - (d.magnitude || 5)/2))
          .attr('fill', d => {
              const t = (d.type || '').toLowerCase();
              if (t.includes('star')) return '#fbbf24';
              if (t.includes('cluster')) return '#38bdf8';
              if (t.includes('nebula')) return '#f472b6';
              if (t.includes('galaxy')) return '#a855f7';
              return '#cbd5e1';
          })
          .style('stroke', 'rgba(255,255,255,0.8)')
          .style('stroke-width', 1)
          .style('cursor', 'pointer')
          .style('filter', 'drop-shadow(0 0 6px rgba(255,255,255,0.5))')
          .on('mouseover', function(d, i) {
              d3.select(this).attr('stroke', '#fff').attr('stroke-width', 2);
              tooltip.style('opacity', 1)
                     .html(`<strong>${d.name}</strong><br>Mag ${d.magnitude || '?'}`)
                     .style('left', (d3.event.pageX + 10) + 'px')
                     .style('top', (d3.event.pageY - 20) + 'px');
          })
          .on('mousemove', function(d, i) {
              tooltip.style('left', (d3.event.pageX + 10) + 'px')
                     .style('top', (d3.event.pageY - 20) + 'px');
          })
          .on('mouseout', function(d, i) {
              d3.select(this).attr('stroke', 'rgba(255,255,255,0.8)').attr('stroke-width', 1);
              tooltip.style('opacity', 0);
          })
          .on('click', function(d, i) {
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
              
              document.getElementById('acd-alt').textContent = d.altitude_deg != null ? `${d.altitude_deg}° ${d.direction} (${Math.round(d.azimuth_deg)}°) • ${d.visible ? 'In view' : 'Below horizon'}` : '';
          });
          
        nodes.attr('cx', d => {
              const pt = proj([d.ra_hours * 15, d.dec_degrees]);
              return pt ? pt[0] : -100;
          })
          .attr('cy', d => {
              const pt = proj([d.ra_hours * 15, d.dec_degrees]);
              return pt ? pt[1] : -100;
          });
          
        nodes.exit().remove();
      }
    });
  } else {
    // If already initialized, smoothly animate the rotation to the new center
    const proj = Celestial.mapProjection;
    if (proj) {
      const currentRot = proj.rotate();
      const targetRot = [-centerRa, -centerDec, 0];
      
      d3.select('#ac-map-container canvas').transition().duration(1200).tween("rotate", function() {
        const r = d3.interpolate(currentRot, targetRot);
        return function(t) {
          proj.rotate(r(t));
          Celestial.redraw();
        };
      });
    }
  }

  // Hook up canvas click
  d3.select('#ac-map-container canvas').on('click', function() {
    const proj = Celestial.mapProjection;
    if(!proj) return;
    const p = d3.mouse(this);
    const coords = proj.invert(p); // [ra_deg, dec_deg]
    if(!coords) return;
    
    // Show loading tooltip immediately
    const dict = window.i18n[currentLang] || window.i18n['en'];
    showInfo(`<span style="color:#a855f7;">${dict.simbad_scanning || 'Scanning SIMBAD Database...'}</span>`, d3.event);
    
    // Convert D3's longitude (-180 to 180 or 0 to 360) to standard RA (0 to 360)
    let ra = coords[0];
    if (ra < 0) ra += 360;
    const dec = coords[1];

    const clickEvent = d3.event; // Capture the event for positioning the async result

    fetch(`${API_BASE}/api/star?ra=${ra}&dec=${dec}`)
      .then(r => r.json())
      .then(data => {
        if(data.error) throw new Error();
        const dict = window.i18n[currentLang] || window.i18n['en'];
        
        let spType = data.spectral_type === 'Unknown' ? (dict.simbad_unknown || 'Unknown') : data.spectral_type;
        let dist = data.distance === 'Unknown' ? (dict.simbad_unknown || 'Unknown') : data.distance;
        
        const html = `
          <div style="font-size: 1.05rem; color: #fff; margin-bottom: 6px; font-weight: bold;">${data.name.replace('* ', '')}</div>
          <div style="display:flex; justify-content:space-between; margin-bottom:4px; gap: 15px;">
            <span style="color:#94a3b8;">${dict.simbad_spectral || 'Spectral Type'}</span>
            <span style="color:#4ade80; font-family:var(--font-mono);">${spType}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#94a3b8;">${dict.simbad_dist || 'Distance'}</span>
            <span style="color:#60a5fa; font-family:var(--font-mono);">${dist}</span>
          </div>
        `;
        showInfo(html, clickEvent, true);
      })
      .catch(e => {
        const dict = window.i18n[currentLang] || window.i18n['en'];
        showInfo(`<span style="color:#ef4444;">${dict.simbad_error || 'Could not resolve star data at this location.'}</span>`, clickEvent, true);
      });
  });
}

function toggleMapFullscreen() {
  const abbr = currentConstellation || 'Sco';
  window.open(`/planetarium.html?c=${abbr}`, '_blank');
}

function renderActiveConstellation(constInfo) {
  const statusBadge = document.getElementById('ac-status-badge');
  const statusEl = document.getElementById('ac-status');
  
  if (!constInfo || constInfo.error) {
    if (statusEl) statusEl.textContent = 'Could not load data';
    return;
  }
  
  const dict = window.i18n[currentLang] || window.i18n['en'];
  let statusText = constInfo.status;
  if (statusText) {
    if (statusText.includes('EXCELLENT')) {
      statusText = `🟢 ${dict.const_status_excellent || 'EXCELLENT'} — ${dict['const_'+constInfo.abbr.toLowerCase()] || constInfo.name} ${dict.const_status_high || 'is high and well-placed'}`;
    } else if (statusText.includes('VISIBLE')) {
      statusText = `🟡 ${dict.const_status_visible || 'VISIBLE'} — ${dict['const_'+constInfo.abbr.toLowerCase()] || constInfo.name} ${dict.const_status_low || 'is above horizon (low)'}`;
    } else if (statusText.includes('NOT VISIBLE')) {
      statusText = `🔴 ${dict.const_status_hidden || 'NOT VISIBLE'} — ${dict.const_status_below || 'Below horizon or in twilight'}`;
    }
  }
  
  if (statusEl) {
    statusEl.innerHTML = statusText || '...';
    if (constInfo.current_altitude_deg > 15) {
      statusEl.style.borderColor = 'rgba(34,197,94,0.4)';
      statusEl.style.color = '#22c55e';
    } else if (constInfo.current_altitude_deg > 0) {
      statusEl.style.borderColor = 'rgba(245,158,11,0.4)';
      statusEl.style.color = '#f59e0b';
    } else {
      statusEl.style.borderColor = 'rgba(248,113,113,0.4)';
      statusEl.style.color = '#f87171';
    }
  }

  if (statusBadge) {
    let badgeShort = '...';
    if (statusText) {
      if (statusText.includes('EXCELLENT')) badgeShort = dict.const_status_up || 'UP NOW';
      else if (statusText.includes('VISIBLE')) badgeShort = dict.const_status_low || 'LOW';
      else badgeShort = dict.const_status_down || 'DOWN';
    }
    
    statusBadge.textContent = badgeShort;
    if (constInfo.current_altitude_deg > 15) {
      statusBadge.style.background = 'rgba(34,197,94,0.15)';
      statusBadge.style.borderColor = 'rgba(34,197,94,0.4)';
      statusBadge.style.color = '#22c55e';
    } else if (constInfo.current_altitude_deg > 0) {
      statusBadge.style.background = 'rgba(245,158,11,0.15)';
      statusBadge.style.borderColor = 'rgba(245,158,11,0.4)';
      statusBadge.style.color = '#f59e0b';
    } else {
      statusBadge.style.background = 'rgba(248,113,113,0.15)';
      statusBadge.style.borderColor = 'rgba(248,113,113,0.4)';
      statusBadge.style.color = '#f87171';
    }
  }

  document.getElementById('ac-rise').textContent = constInfo.rise_time || '—';
  
  // Set time (using set if available, else derive from best_time loosely or NA)
  document.getElementById('ac-set').textContent = constInfo.set_time || '—';
  
  // Calculate Arc progress
  const fillEl = document.getElementById('ac-arc-fill');
  const labelEl = document.getElementById('ac-arc-label');
  if (fillEl && labelEl && constInfo.current_altitude_deg != null && constInfo.culmination_altitude_deg != null) {
      let pct = 0;
      if (constInfo.current_altitude_deg > 0) {
          pct = Math.min(100, Math.max(0, (constInfo.current_altitude_deg / constInfo.culmination_altitude_deg) * 100));
      }
      fillEl.style.width = `${pct}%`;
      labelEl.textContent = `${constInfo.current_altitude_deg}°`;
  }
    
  const constName = dict[`const_${constInfo.abbr ? constInfo.abbr.toLowerCase() : ''}`] || constInfo.name;
  
  const lblBestTime = dict.best_viewing || 'Best viewing time for';
  const lblTonightAround = dict.tonight_around || 'tonight is around';
  
  const noteEl = document.getElementById('ac-note');
  if (noteEl) {
    noteEl.innerHTML = `💡 ${lblBestTime} <strong>${constName}</strong> ${lblTonightAround} <strong>${constInfo.best_time}</strong>.`;
  }
}

function renderPlanets(planets, factStr) {
  const list = document.getElementById('planet-list');
  if (!planets) {
    list.innerHTML = '<div class="no-data">Could not load planet data — API may be offline</div>';
    return;
  }
  if (planets.length === 0) {
    list.innerHTML = '<div class="no-data">No major planets visible above the horizon right now</div>';
    return;
  }

  let html = planets.map(p => {
    const dict = window.i18n[currentLang] || window.i18n['en'];
    const pName = dict[`planet_${p.name.toLowerCase()}`] || p.name;
    return `
      <div class="planet-item ${p.visible_tonight ? '' : 'not-visible'}">
        <div class="planet-vis-dot ${p.visible_tonight ? 'visible' : 'hidden'}"></div>
        <span class="planet-emoji">${p.emoji}</span>
        <div class="planet-info-col">
          <div class="planet-name-row">
            <span class="planet-name">${pName}</span>
            <span class="planet-const-pill" title="Current Constellation">${p.constellation || ''}</span>
          </div>
          <div class="planet-meta-row">
            <span class="planet-alt">${p.altitude_deg}° ${p.direction} (${Math.round(p.azimuth_deg)}°)</span>
            <span class="planet-mag">Mag: ${p.magnitude_approx}</span>
            <span class="planet-dist" title="Light Travel Time">${p.distance_mkm ? p.distance_mkm + 'M km' : ''} ${p.light_time_minutes ? '(' + p.light_time_minutes + ' lt-min)' : ''}</span>
          </div>
          <div style="font-size: 0.8rem; color: #cbd5e1; margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(168, 85, 247, 0.2);">
             <div style="color: #d8b4fe; font-weight: bold; margin-bottom: 4px;">🔭 Visible: ${p.rise_time || '?'} – ${p.set_time || '?'}</div>
             <div><strong>📍 How to find it:</strong> ${p.how_to_find || ''}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (factStr) {
    html += `
      <div style="margin-top: auto; padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 6px; color: #cbd5e1; font-size: 0.85rem; line-height: 1.5; align-self: flex-end; width: 100%; box-sizing: border-box;">
        <div style="color: #d8b4fe; font-weight: bold; margin-bottom: 4px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">✨ Planet Fact</div>
        ${factStr}
      </div>
    `;
  }

  // Ensure the planet-list itself can push the fact down via flex
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.height = '100%';
  list.style.gap = '8px';

  list.innerHTML = html;
}

function updateUnifiedCard() {
  const list = document.getElementById('ai-targets-list');
  const card = document.getElementById('card-ai-targets');
  if (!list || !card) return;
  
  const alertsHtml = window.lastAlertsHTML || '';
  const aiHtml = window.lastAIHTML || '';
  
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  
  // Setup GSAP glow
  const astroGlow = document.getElementById('astro-glow');

  if (astroGlow) {
    const seeing = window.lastTonightData?.seeing?.go_nogo || 'MARGINAL';
    const isNoGo = seeing === 'NO GO';
    
    if (isNoGo) {
      astroGlow.style.background = 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)';
    } else {
      astroGlow.style.background = 'radial-gradient(circle, rgba(45,212,191,0.2) 0%, transparent 70%)';
    }
  }
  
  if (!alertsHtml && !aiHtml) {
    const fallbackMsg = `
      <div style="text-align: center; padding: 20px; color: var(--text-secondary); font-style: italic;">
        No targets visible right now. Conditions might be poor, or it's daytime!
      </div>
    `;
    list.innerHTML = fallbackMsg;
  } else {
    list.innerHTML = alertsHtml + aiHtml;
  }
}

function renderAlerts(alerts) {
  if (!alerts || alerts.length === 0) {
    window.lastAlertsHTML = '';
    updateUnifiedCard();
    return;
  }
  window.lastAlertsHTML = alerts.map((a, i) => {
    // Graceful fallback for old cached strings
    if (typeof a === 'string') {
      const dict = window.i18n[currentLang] || window.i18n['en'];
      let str = a;
      if (str.includes('is UP')) str = str.replace('is UP', dict.is_up || 'is UP');
      if (str.includes('EXCELLENT')) str = str.replace('EXCELLENT', dict.excellent || 'EXCELLENT');
      if (str.includes(' at ')) str = str.replace(' at ', ` ${dict.at || 'at'} `);
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
    }

    // New Structured Object UI
    const dict = window.i18n[currentLang] || window.i18n['en'];
    let title = a.title;
    if (title.includes('is UP')) title = title.replace('is UP', dict.is_up || 'is UP');
    ['Venus', 'Mars', 'Jupiter', 'Saturn', 'Mercury'].forEach(pl => {
      if (title.includes(pl)) title = title.replace(pl, dict[`planet_${pl.toLowerCase()}`] || pl);
    });

    return `
      <div class="must-see-item" style="animation-delay: ${i * 0.08}s; flex-shrink: 0;">
        <div class="must-see-icon">${a.icon}</div>
        <div class="must-see-content">
          <div class="must-see-title-row">
            <span class="must-see-title">${title}</span>
            ${a.meta ? `<span class="must-see-meta">${a.meta}</span>` : ''}
          </div>
          <div class="must-see-subtitle">${a.subtitle}</div>
        </div>
      </div>
    `;
  }).join('');
  updateUnifiedCard();
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
        if (res.includes('Clear skies')) {
            res = res.replace('✨ Clear skies (no major events)', dict.clear_skies || '✨ Clear skies (no major events)');
        }
        return res;
      });
      
      const tempStr = d.temp_c != null ? `${Math.round(d.temp_c)}°C / ${Math.round(d.temp_c * 9/5 + 32)}°F` : '';
      const cloudStr = d.cloud_pct != null ? `${Math.round(d.cloud_pct)}% Clouds` : '';

      return `
        <div class="day-card ${isToday ? 'today' : ''}">
          <div class="day-name">${dDate}</div>
          <div class="day-date">${dMonth}</div>
          <div class="day-rating">${dRatingRaw}</div>
          <div class="day-moon">${moonEmoji}</div>
          <div class="day-weather">${dWeatherRaw}</div>
          <div style="font-size: 0.8rem; color: #cbd5e1; margin-top: 4px; text-align: center;">${tempStr}</div>
          <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px; text-align: center;">${cloudStr}</div>
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
        <div class="c-alt" style="color: ${color}">● ${c.altitude_deg}° ${c.direction} (${Math.round(c.azimuth_deg)}°)</div>
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
let currentConstellation = localStorage.getItem('sg_constellation') || 'Sco';

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
      ? `${live.altitude_deg}° ${live.direction || ''} ${live.azimuth_deg ? '(' + Math.round(live.azimuth_deg) + '°)' : ''}`
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
          <button class="btn-fov" onclick="openFovModal(${t.ra_hours * 15}, ${t.dec_degrees}, '${t.name.replace(/'/g, "\\'")}')">Simulate View 🔭</button>
          <span class="tc-equipment">${t.equipment || '🔭 Telescope'}</span>
          ${(t.difficulty && t.difficulty.replace('_', ' ') !== 'NAKED EYE') ? `<span class="tc-difficulty ${t.difficulty.replace(' ', '_')}">${t.difficulty.replace('_', ' ')}</span>` : ''}
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
  
  // Navigation Menu Toggle
  const btnMenu = document.getElementById('btn-menu');
  const navDropdown = document.getElementById('nav-dropdown');
  if (btnMenu && navDropdown) {
    btnMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      navDropdown.classList.toggle('hidden');
    });
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!btnMenu.contains(e.target) && !navDropdown.contains(e.target)) {
        navDropdown.classList.add('hidden');
      }
    });
    // Close dropdown when clicking a link
    navDropdown.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navDropdown.classList.add('hidden');
      });
    });
  }
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

  let citySearchTimeout = null;
  const cityInput = document.getElementById('input-city-search');
  const btnCitySearch = document.getElementById('btn-city-search');
  
  const performCitySearch = () => {
    const query = cityInput.value.trim();
    if (!query) return;
    
    const oldText = btnCitySearch.textContent;
    btnCitySearch.textContent = '⏳';
    btnCitySearch.disabled = true;
    
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const result = data[0];
          inputLat.value = parseFloat(result.lat).toFixed(4);
          inputLon.value = parseFloat(result.lon).toFixed(4);
          
          // Clean up the display name for the profile name
          const parts = result.display_name.split(',');
          if (parts.length > 1) {
             inputName.value = `${parts[0].trim()}, ${parts[1].trim()}`;
          } else {
             inputName.value = parts[0].trim();
          }
        }
      })
      .catch(err => {
        console.error("Geocoding failed:", err);
      })
      .finally(() => {
        btnCitySearch.textContent = oldText;
        btnCitySearch.disabled = false;
      });
  };

  btnCitySearch?.addEventListener('click', performCitySearch);
  
  cityInput?.addEventListener('input', () => {
    clearTimeout(citySearchTimeout);
    if (cityInput.value.trim().length > 2) {
       citySearchTimeout = setTimeout(performCitySearch, 800);
    }
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
      localStorage.setItem('sg_constellation', currentConstellation);
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
      localStorage.setItem('sg_constellation', currentConstellation);
      
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
  window.currentLang = lang;
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
  
  // Translate dropdown options
  const acSelect = document.getElementById('ac-select');
  if (acSelect) {
    Array.from(acSelect.options).forEach(opt => {
      const abbr = opt.value;
      const key = `const_${abbr.toLowerCase()}`;
      if (dict[key]) {
        const emojiMatch = opt.text.match(/^[^\s]+/);
        const emoji = emojiMatch ? emojiMatch[0] : '';
        opt.text = `${emoji} ${dict[key]}`;
      }
    });
  }
  
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

// ── FOV Simulator (Aladin Lite) ──
let aladinInstance = null;

window.openFovModal = function(ra_deg, dec_deg, targetName) {
  const modal = document.getElementById('fov-modal');
  document.getElementById('fov-target-name').textContent = "FOV Simulator: " + targetName;
  modal.classList.remove('hidden');

  if (!aladinInstance) {
    aladinInstance = A.aladin('#aladin-lite-div', {
      survey: "P/DSS2/color",
      fov: 1.5,
      target: ra_deg + " " + dec_deg,
      showReticle: false,
      showZoomControl: true,
      showFullscreenControl: false,
      showLayersControl: false
    });
  } else {
    aladinInstance.gotoRaDec(ra_deg, dec_deg);
  }

  // Draw 1.2 deg FOV ring
  if (window.aladinOverlay) {
    aladinInstance.removeCatalog(window.aladinOverlay);
  }
  window.aladinOverlay = A.graphicOverlay({color: '#ef4444', lineWidth: 2});
  aladinInstance.addCatalog(window.aladinOverlay);
  
  window.aladinOverlay.add(A.circle(ra_deg, dec_deg, 0.6)); // 0.6 deg radius = 1.2 deg FOV
};

document.getElementById('close-fov-btn')?.addEventListener('click', () => {
  document.getElementById('fov-modal').classList.add('hidden');
});

document.getElementById('close-star-btn')?.addEventListener('click', () => {
  document.getElementById('star-modal').classList.add('hidden');
});

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => initTour(), 500);
  
  // Fetch Asteroids
  fetch(`${API_BASE}/api/asteroids`)
    .then(r => {
      if (!r.ok) throw new Error('API Error');
      return r.json();
    })
    .catch(err => {
      console.warn("Asteroid API failed, falling back to cache.", err);
      return [];
    })
    .then(data => {
      const list = document.getElementById('asteroids-list');
      if (!list) return;
      const dict = window.i18n[currentLang] || window.i18n['en'];
      
      if (!data || data.length === 0) {
        const cachedStr = localStorage.getItem('stargazer_asteroids_cache');
        if (cachedStr) {
          try { data = JSON.parse(cachedStr); } catch(e) {}
        }
      }
      
      if (!data || data.length === 0) {
        list.innerHTML = `<div style="color:#ef4444; font-size:0.85rem; padding:10px;">Failed to load Asteroid data. The API might be rate limited.</div>`;
        return;
      }
      
      // Save valid data to cache
      localStorage.setItem('stargazer_asteroids_cache', JSON.stringify(data));
      
      list.innerHTML = '';
      data.forEach(a => {
        const hazardText = dict.asteroid_hazard || 'POTENTIALLY HAZARDOUS';
        const diamText = dict.asteroid_diam || 'Diameter:';
        const speedText = dict.asteroid_speed || 'Speed:';
        const missDistText = dict.asteroid_miss_distance || 'Miss Distance';
        
        const haz = a.is_hazardous ? `<span style="color:#ef4444; font-size:0.75rem;">⚠️ ${hazardText}</span>` : '';
        list.innerHTML += `
          <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="color: #e2e8f0; font-weight: bold; font-size: 0.9rem;">${a.name} ${haz}</div>
              <div style="color: #94a3b8; font-size: 0.75rem;">${diamText} ~${a.diameter_m}m • ${speedText} ${a.velocity_kmh.toLocaleString()} km/h</div>
            </div>
            <div style="text-align: right; color: #a855f7; font-size: 0.85rem; font-family: var(--font-mono);">
              <div style="font-size: 0.6rem; color: #94a3b8; font-family: var(--font-sans); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">${missDistText}</div>
              ${(a.miss_distance_km).toLocaleString()} km
            </div>
          </div>
        `;
      });
    })
    .finally(() => {
      // Add fun facts!
      const facts = [
        "Asteroids are rocky remnants left over from the early formation of our solar system about 4.6 billion years ago.",
        "Most asteroids in our solar system can be found in the main asteroid belt between Mars and Jupiter.",
        "Some asteroids have their own moons! For example, the asteroid Ida has a tiny moon called Dactyl.",
        "If all the asteroids in the solar system were combined, their total mass would still be less than that of Earth's Moon.",
        "Ceres is the largest object in the asteroid belt, and it's so big it's actually classified as a dwarf planet!"
      ];
      const randomFact = facts[Math.floor(Math.random() * facts.length)];
      
      const list = document.getElementById('asteroids-list');
      if (list) {
        list.innerHTML += `
          <div style="margin-top: 20px; padding: 15px; background: rgba(168, 85, 247, 0.05); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 8px;">
            <div style="color: #d8b4fe; font-size: 0.8rem; font-weight: bold; margin-bottom: 5px;">✨ ASTEROID FACT</div>
            <div style="color: #94a3b8; font-size: 0.8rem; line-height: 1.4;">${randomFact}</div>
          </div>
        `;
      }
    });

  // Observation Notes Local Storage
  const obsNotes = document.getElementById('observation-notes');
  if (obsNotes) {
    const savedNotes = localStorage.getItem('stargazer_obs_notes');
    if (savedNotes) obsNotes.value = savedNotes;
    
    // Save on input with simple debounce
    let timeoutId;
    obsNotes.addEventListener('input', () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        localStorage.setItem('stargazer_obs_notes', obsNotes.value);
      }, 500);
    });
  }

  // Initialize 3D Moon if present
  if (window.initMoon3D) setTimeout(window.initMoon3D, 500);
});
