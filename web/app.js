let currentLang = localStorage.getItem('stargazer_lang') || 'en';
window.currentLang = currentLang;

let isMetric = localStorage.getItem('stargazer_units') !== 'imperial';

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
let API_BASE = localStorage.getItem('stargazer_api_override');
if (!API_BASE) {
  if (window.location.hostname.includes('nick-t.net')) {
    API_BASE = 'https://stargazerapi.nick-t.net';
  } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_BASE = 'http://localhost:8181';
  } else {
    API_BASE = '/api'; // Fallback for Docker LAN self-hosting where Nginx is the proxy
  }
}

const DEFAULT_LOCATIONS = [];

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

let activeLocId = localStorage.getItem('stargazer_active_loc');
let activeLoc = savedLocations.find(l => l.id === activeLocId);
if (!activeLoc && savedLocations.length > 0) {
  activeLoc = savedLocations[0];
  activeLocId = activeLoc.id;
  localStorage.setItem('stargazer_active_loc', activeLocId);
}

let currentLat = activeLoc ? parseFloat(activeLoc.lat) : null;
let currentLon = activeLoc ? parseFloat(activeLoc.lon) : null;
window.currentBortle = localStorage.getItem('stargazer_bortle') || null;

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
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
  
  document.querySelectorAll('.clock-display').forEach(el => el.textContent = t);
  document.querySelectorAll('.date-display').forEach(el => el.textContent = d);
}
updateClock();
setInterval(updateClock, 1000);

// Set Dynamic Subtitle
const subtitle = document.getElementById('logo-sub');
const coords = document.getElementById('logo-coords');
if (subtitle) {
  subtitle.removeAttribute('data-i18n');
  subtitle.textContent = activeLoc ? activeLoc.name : 'Location Required';
}
if (coords) {
  if (activeLoc) {
    const latStr = Math.abs(activeLoc.lat).toFixed(3) + (activeLoc.lat >= 0 ? '°N' : '°S');
    const lonStr = Math.abs(activeLoc.lon).toFixed(3) + (activeLoc.lon >= 0 ? '°E' : '°W');
    coords.textContent = `${latStr}, ${lonStr}`;
  } else {
    coords.textContent = 'Please enable GPS';
  }
}

async function fetchAPI(path, fallback = null) {
  if (currentLat === null || currentLon === null) return fallback;
  const separator = path.includes('?') ? '&' : '?';
  let bortleStr = window.currentBortle ? `&bortle=${window.currentBortle}` : '';
  const finalPath = `${path}${separator}lat=${currentLat}&lon=${currentLon}&lang=${currentLang}${bortleStr}`;
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
  if (currentLat === null || currentLon === null) return;
  const separator = path.includes('?') ? '&' : '?';
  let bortleStr = window.currentBortle ? `&bortle=${window.currentBortle}` : '';
  const finalPath = `${path}${separator}lat=${currentLat}&lon=${currentLon}&lang=${currentLang}${bortleStr}`;
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
    
    // Only re-render if data has changed
    const freshString = JSON.stringify(data);
    if (!cached || cached !== freshString) {
      localStorage.setItem(cacheKey, freshString);
      renderFn(data); // Re-render with fresh data
    } else {
      // Data unchanged, no need to touch the DOM
      localStorage.setItem(cacheKey, freshString);
    }
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
      // Reset hero stats on error
      const hd = document.getElementById('hero-dark-in');
      const hb = document.getElementById('hero-bortle');
      const hs = document.getElementById('hero-github-stars');
      if (hd) hd.textContent = '--';
      if (hb) hb.textContent = '--';
      if (hs) hs.textContent = '--';
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
    updateHeroStats(data);

    // Fire off async AI fetch and GitHub stars now that the UI is rendered
    fetchAIAnalysis();
    fetchGitHubStars();
    fetchLatestVersion();
  });
}

async function fetchAIAnalysis(pollCount = 0) {
  const aiTargetsCard = document.getElementById('card-ai-targets');
  const engineBadgeEl = document.getElementById('seeing-engine-badge');
  const moonFactEl = document.getElementById('moon-fact');

  const explanationEl = document.getElementById('seeing-explanation');

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


  try {
    const q = (currentLat != null && currentLon != null) ? `?lat=${currentLat}&lon=${currentLon}&lang=${currentLang}` : `?lang=${currentLang}`;
    const res = await fetch(`${API_BASE}/seeing/ai${q}`);
    if (!res.ok) throw new Error('AI API failed');
    const aiData = await res.json();
    if (aiData.status === 'processing') {
      // Background AI generation is running, poll every 10s
      // Give up after 30 polls (5 minutes) to avoid infinite spinning
      if (pollCount >= 30) {
        console.warn("AI analysis timed out after 5 minutes, falling back to rule-based");
        _showRuleBasedFallback(engineBadgeEl, explanationEl);
        return;
      }
      if (explanationEl) {
        explanationEl.classList.add('ai-loading-glow');
        const dict = window.i18n[currentLang] || window.i18n['en'];
        explanationEl.innerHTML = `✨ <span style="font-style:italic;">${dict.ai_analyzing || 'AI is analyzing the atmosphere (this takes a moment)...'}</span>`;
        explanationEl.style.display = 'block';
      }
      setTimeout(() => fetchAIAnalysis(pollCount + 1), 10000);
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
    _showRuleBasedFallback(engineBadgeEl, explanationEl);
  }
}

function _showRuleBasedFallback(engineBadgeEl, explanationEl) {
  if (engineBadgeEl) {
    engineBadgeEl.textContent = 'Fallback: Rule-based';
    engineBadgeEl.className = 'seeing-engine-badge rule';
    engineBadgeEl.title = 'All AI APIs were unavailable. Showing rule-based metrics.';
  }
  if (explanationEl) {
    explanationEl.classList.remove('ai-loading-glow');
  }
  const cachedMoonFact = localStorage.getItem(`stargazer_moon_fact_${currentLang}`);
  const moonWrapEl = document.getElementById('moon-fact-wrap');
  const moonTextEl = document.getElementById('moon-fact-text');
  if (cachedMoonFact && moonWrapEl) {
    if (moonTextEl) moonTextEl.textContent = cachedMoonFact;
    moonWrapEl.style.display = 'block';
  } else if (moonWrapEl) {
    moonWrapEl.style.display = 'none';
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
  if (windEl) {
    const wVal = seeing.tonight_wind_kmh;
    windEl.querySelector('.metric-val').textContent = wVal != null ? (isMetric ? `${wVal}` : `${Math.round(wVal * 0.621371)}`) : '—';
    const windLbl = document.querySelector('#m-wind .metric-label span[data-i18n="m_wind"]');
    if (windLbl) windLbl.textContent = isMetric ? 'Wind (km/h)' : 'Wind (mph)';
  }
  const precipEl = document.getElementById('m-precip');
  if (precipEl) precipEl.querySelector('.metric-val').textContent =
    seeing.tonight_precip_prob != null ? `${seeing.tonight_precip_prob}%` : '—';

  // Update HUD
  const hudWeather = document.getElementById('hud-weather');
  if (hudWeather) {
    const tVal = seeing.tonight_temp_c;
    const tempStr = tVal != null ? (isMetric ? `${tVal}°C` : `${Math.round(tVal * 9/5 + 32)}°F`) : '--';
    const wVal = seeing.tonight_wind_kmh;
    const windStr = wVal != null ? (isMetric ? `${wVal} km/h` : `${Math.round(wVal * 0.621371)} mph`) : '--';
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
    engineBadgeEl.textContent   = isAI ? '🤖 AI' : (seeing.source.includes('7Timer') ? '☁️ Blended' : '📐 Rule-based');
    engineBadgeEl.title         = seeing.source || (isAI
      ? 'Scored by Qwen3.5-9B (local AI)'
      : 'AI unavailable — using extended rule-based scorer');
    engineBadgeEl.className = `seeing-engine-badge ${isAI ? 'ai' : (seeing.source.includes('7Timer') ? 'blended' : 'rule')}`;
    engineBadgeEl.style.display = '';
  }

  // AI label (short label from the model)
  const aiLabelEl = document.getElementById('seeing-ai-label');
  if (aiLabelEl) {
    aiLabelEl.textContent = seeing.seeing_label_ai || '';
    aiLabelEl.style.display = seeing.seeing_label_ai ? '' : 'none';
  }

  // Explanation prose (Seeing card)
  const explanationEl = document.getElementById('seeing-explanation');
  if (explanationEl) {
    explanationEl.classList.remove('ai-loading-glow');
    explanationEl.textContent = seeing.seeing_explanation || '';
    explanationEl.style.display = seeing.seeing_explanation ? '' : 'none';
  }

  // ── Twilight Timeline ──
  const tlContainer = document.getElementById('twilight-timeline');
  if (tlContainer && data.twilight_timeline) {
    document.getElementById('tl-sunset').textContent = data.twilight_timeline.sunset || '--:--';
    document.getElementById('tl-astro-start').textContent = data.twilight_timeline.astro_start || '--:--';
    document.getElementById('tl-astro-end').textContent = data.twilight_timeline.astro_end || '--:--';
    document.getElementById('tl-sunrise').textContent = data.twilight_timeline.sunrise || '--:--';
    tlContainer.style.display = '';
  }

  // ── Hourly Cloud Forecast Bar Chart ──
  const hcContainer = document.getElementById('hourly-clouds-container');
  const hcChart = document.getElementById('hourly-clouds-chart');
  const hcLabels = document.getElementById('hourly-clouds-labels');
  if (hcContainer && hcChart && seeing.hourly_clouds && seeing.hourly_clouds.length > 0) {
    hcChart.innerHTML = '';
    if (hcLabels) hcLabels.innerHTML = '';
    
    // Get the current hour in the target timezone (or local as fallback)
    let startHour = new Date().getHours();
    if (data.location_timezone) {
      try {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: data.location_timezone,
          hour: 'numeric',
          hour12: false
        }).formatToParts(new Date());
        startHour = parseInt(parts.find(p => p.type === 'hour').value, 10);
      } catch (e) {
        console.warn("Timezone parse error:", e);
      }
    }

    // Draw 24 bars
    seeing.hourly_clouds.forEach((cloudPct, i) => {
      const bar = document.createElement('div');
      bar.style.flex = '1';
      // Map 0% cloud -> green, 100% -> red
      let color = '#22c55e'; // clear
      if (cloudPct > 20) color = '#eab308'; // partly cloudy
      if (cloudPct > 60) color = '#ef4444'; // overcast
      
      const h = Math.max(10, cloudPct); 
      bar.style.height = `${h}%`;
      bar.style.backgroundColor = color;
      bar.style.borderRadius = '2px 2px 0 0';
      bar.style.opacity = '0.9';
      
      const hourVal = (startHour + i) % 24;
      const ampm = hourVal >= 12 ? 'pm' : 'am';
      const hr12 = hourVal % 12 || 12;
      const timeStr = `${hr12}${ampm}`;
      
      bar.title = `${timeStr} - ${cloudPct}% cloud cover`;
      hcChart.appendChild(bar);
      
      // Add labels every 4 hours + last hour
      if (hcLabels) {
        if (i === 0 || i === 4 || i === 8 || i === 12 || i === 16 || i === 20 || i === 23) {
          const lbl = document.createElement('div');
          lbl.textContent = i === 0 ? "Now" : timeStr;
          lbl.style.flex = "1";
          lbl.style.textAlign = i === 0 ? "left" : (i === 23 ? "right" : "center");
          hcLabels.appendChild(lbl);
        }
      }
    });
    hcContainer.style.display = '';
  }

  // Also surface the AI explanation as the Observer's Briefing in the Must-See card
  if (seeing.seeing_explanation && seeing.ai_powered) {
    window.lastBriefing = {
      text: seeing.seeing_explanation,
      bestWindow: seeing.best_window || null,
    };
    updateUnifiedCard();
  }

  // Moon Fact — standardized fact card
  const moonWrap = document.getElementById('moon-fact-wrap');
  const moonText = document.getElementById('moon-fact-text');
  if (moonWrap && moonText) {
    if (seeing.moon_fact) {
      localStorage.setItem(`stargazer_moon_fact_${currentLang}`, seeing.moon_fact);
      moonText.textContent = seeing.moon_fact;
      moonWrap.style.display = 'block';
    } else {
      moonWrap.style.display = 'none';
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

  // Dark window (Legacy - replaced by Twilight Timeline)
  if (data && document.getElementById('dark-window')) {
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
    hudMoon.textContent = `${icon} ${phaseNameOnly} (${moon.illumination_pct ?? '?'}%)`;
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

// ── Hero Stats (dark-in time, bortle) ──────────────────────────────────────
function updateHeroStats(data) {
  // Dark In — hours until astronomical dusk
  const heroDarkIn = document.getElementById('hero-dark-in');
  if (heroDarkIn && data.astronomical_dusk) {
    try {
const now = new Date();
      const duskStr = data.astronomical_dusk; // e.g. "09:30 PM"
      // Parse "%I:%M %p" format (12-hour with AM/PM)
      const match = duskStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) throw new Error('bad format');
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      const duskToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
      if (duskToday < now) duskToday.setDate(duskToday.getDate() + 1);
      const diffHrs = ((duskToday - now) / (1000 * 60 * 60)).toFixed(1);
      heroDarkIn.textContent = `${diffHrs}h`;
    } catch {
      heroDarkIn.textContent = data.astronomical_dusk;
    }
  }

  const heroBortle = document.getElementById('hero-bortle');
  if (heroBortle && data.telescope?.bortle != null) {
    heroBortle.textContent = `B${data.telescope.bortle}`;
    
    // Auto-sync the dropdown if the user hasn't manually overridden it
    if (!window.currentBortle) {
      const selectBortle = document.getElementById('select-bortle');
      if (selectBortle) {
        selectBortle.value = data.telescope.bortle.toString();
      }
    }
  }
}

// ── GitHub stars (cached, fetched once) ──────────────────────────────────────
let _githubStarsFetched = false;
async function fetchGitHubStars() {
  if (_githubStarsFetched) return;
  _githubStarsFetched = true;
  const el = document.getElementById('hero-github-stars');
  if (!el) return;
  try {
    const res = await fetch('https://api.github.com/repos/nicolasnkGH/stargazer');
    const json = await res.json();
    if (json && json.stargazers_count != null) {
      el.textContent = json.stargazers_count.toLocaleString();
    } else {
      el.textContent = '629'; // fallback
    }
  } catch {
    el.textContent = '629'; // fallback
  }
}

// ── GitHub Version (fetched once) ────────────────────────────────────────────
let _versionFetched = false;
async function fetchLatestVersion() {
  if (_versionFetched) return;
  _versionFetched = true;
  const versionEl = document.getElementById('hero-version-tag');
  if (!versionEl) return;
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.version) {
        versionEl.innerHTML = `<span class="hero-badge-dot hero-badge-dot-green"></span>${json.version}`;
      }
    }
  } catch (e) {
    console.warn("Could not fetch latest version from API", e);
  }
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
    stars: { show: true, limit: 6.0, colors: true, names: false, propername: false },
    dsos: { show: true, limit: 4, names: false },
    adaptable: true,
    constellations: {
      show: true, names: true, namesType: "la", lines: true,
      lineStyle: { stroke: "#60a5fa", width: 1.5, opacity: 0.5 },
      nameStyle: { fill: "#94a3b8", align: "center", baseline: "middle", font: ["12px Space Grotesk, sans-serif"] }
    },
    mw: { show: false },
    lines: { graticule: { show: false }, equatorial: { show: false } },
    background: { fill: "#0a0f1c", stroke: "#1e293b", opacity: 1 }
  };

  if (!window.celestialInitialized) {
    // Only set up the UI once to avoid breaking Celestial's canvas references
    container.innerHTML = `
      <div id="ac-map-overlay" style="position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; z-index: 5; cursor: pointer; transition: opacity 0.3s;" onclick="this.style.pointerEvents='none'; this.style.opacity='0'; document.getElementById('ac-map-container').addEventListener('mouseleave', function() { document.getElementById('ac-map-overlay').style.pointerEvents='auto'; document.getElementById('ac-map-overlay').style.opacity='1'; }, {once: true});">
        <div style="background: rgba(15,23,42,0.9); padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(4px); display:flex; align-items:center; gap:6px;">
          <i data-lucide="mouse-pointer-click" style="width:16px;height:16px;"></i> Click to interact
        </div>
      </div>
      <button id="btn-map-expand" class="map-expand-btn" onclick="toggleMapFullscreen()" title="Toggle Fullscreen">⤢</button>
      <div id="ac-map-tooltip" style="position: absolute; opacity: 0; pointer-events: none; background: rgba(15,23,42,0.9); color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; border: 1px solid rgba(168,85,247,0.3); transition: opacity 0.2s; white-space: nowrap; z-index: 10;"></div>
    `;
    
    if (window.lucide) lucide.createIcons();
    
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
  if (!list) return; // Feature removed from UI
  
  if (!planets) {
    list.innerHTML = '<div class="no-data">Could not load planet data — API may be offline</div>';
    return;
  }
  if (planets.length === 0) {
    list.innerHTML = '<div class="no-data">No major planets visible above the horizon right now</div>';
    return;
  }

  const html = planets.map(p => {
    let isBlocked = false;
    if (typeof activeLoc !== 'undefined' && activeLoc && activeLoc.porchMode && p.azimuth_deg != null && !isNaN(p.azimuth_deg)) {
      const az = p.azimuth_deg;
      const min = activeLoc.minAz || 0;
      const max = activeLoc.maxAz || 360;
      if (min <= max) {
        isBlocked = (az < min || az > max);
      } else {
        isBlocked = !(az >= min || az <= max);
      }
    }
    const dict = window.i18n[currentLang] || window.i18n['en'];
    const pName = dict[`planet_${p.name.toLowerCase()}`] || p.name;
    const altColor = p.altitude_deg > 30 ? '#22c55e' : p.altitude_deg > 10 ? '#f59e0b' : '#f87171';
    const altLabel = p.altitude_deg > 30 ? 'High in sky' : p.altitude_deg > 10 ? 'Low in sky' : 'Near horizon';
    const magNote  = p.magnitude_approx < 0 ? ' (extremely bright)' : p.magnitude_approx < 3 ? ' (naked eye)' : p.magnitude_approx < 6 ? ' (binoculars)' : ' (telescope)';
    const azimuthStr = (p.azimuth_deg != null && !isNaN(p.azimuth_deg)) ? ` · Azimuth ${Math.round(p.azimuth_deg)}°` : '';
    return `
      <div class="planet-3d-card ${p.visible_tonight ? '' : 'not-visible'} ${isBlocked ? 'blocked-horizon' : ''}">
        <div class="planet-3d-canvas-container" data-planet="${p.name}"></div>
        <div class="planet-info-col">
          <div class="planet-name-row">
            <span class="planet-name">${p.emoji} ${pName}</span>
            <span class="planet-const-pill" title="Currently in this constellation">${p.constellation || ''}</span>
            ${isBlocked ? '<span class="blocked-badge" title="Hidden behind your custom horizon limits">Blocked by Horizon</span>' : ''}
          </div>
          <div class="planet-meta-row">
            <span class="planet-alt" style="color:${altColor}" title="How high above the horizon">📐 Altitude: ${p.altitude_deg}° — ${altLabel}</span>
            <span class="planet-alt" style="color:#94a3b8" title="Compass direction to look">🧭 ${p.direction}${azimuthStr}</span>
            <span class="planet-mag" title="Brightness scale: lower = brighter; negative = extremely bright">💡 Magnitude ${p.magnitude_approx}${magNote}</span>
            ${p.distance_mkm ? `<span class="planet-dist" title="Current distance from Earth">📏 ${p.distance_mkm}M km from Earth</span>` : ''}
            ${p.light_time_minutes ? `<span class="planet-dist" title="Light travel time">⚡ Light travel: ${p.light_time_minutes} min</span>` : ''}
          </div>
          <div class="planet-bottom-info">
            ${(p.rise_time && p.set_time && p.rise_time !== 'N/A' && p.set_time !== 'N/A') ? `<div class="planet-visible-window">🔭 Visible window: ${p.rise_time} – ${p.set_time}</div>` : ''}
            <div><strong>📍 How to find it:</strong> ${p.how_to_find || ''}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (factStr) {
    window.lastPlanetFact = factStr;
    updateUnifiedCard();
  }

  list.innerHTML = html;
  
  // Initialize 3D planets if available
  if (window.initPlanets3D) {
    window.initPlanets3D();
  }
}

function updateUnifiedCard() {
  const list = document.getElementById('ai-targets-list');
  const card = document.getElementById('card-ai-targets');
  if (!list || !card) return;
  
  const alertsHtml = window.lastAlertsHTML || '';
  const aiHtml = window.lastAIHTML || '';
  const factStr = window.lastPlanetFact || '';
  const briefing = window.lastBriefing || null;
  
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

  // Observer's Briefing — AI-generated prose at the top
  const briefingHtml = briefing ? `
    <div class="observer-briefing">
      <div class="observer-briefing-label">🤖 Observer's Briefing</div>
      <div class="observer-briefing-text">${briefing.text}</div>
      ${briefing.bestWindow ? `<div class="observer-briefing-window">🔭 Best window: <strong>${briefing.bestWindow}</strong></div>` : ''}
    </div>
  ` : '';

  const factHtml = factStr ? `
    <div class="planet-fact-strip">
      <span class="planet-fact-label">✨ Did You Know?</span>
      <span class="planet-fact-text">${factStr}</span>
    </div>
  ` : '';
  
  if (!alertsHtml && !aiHtml) {
    const fallbackMsg = `
      <div style="text-align: center; padding: 20px; color: var(--text-secondary); font-style: italic;">
        No targets visible right now. Conditions might be poor, or it's daytime!
      </div>
    `;
    list.innerHTML = briefingHtml + fallbackMsg + factHtml;
  } else {
    list.innerHTML = briefingHtml + alertsHtml + aiHtml + factHtml;
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
      
      const tVal = d.temp_c;
      const tempStr = tVal != null ? (isMetric ? `${Math.round(tVal)}°C` : `${Math.round(tVal * 9/5 + 32)}°F`) : '';
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

      let isBlocked = false;
      if (typeof activeLoc !== 'undefined' && activeLoc && activeLoc.porchMode && p.peak_az_deg != null && !isNaN(p.peak_az_deg)) {
        const az = p.peak_az_deg;
        const min = activeLoc.minAz;
        const max = activeLoc.maxAz;
        if (min <= max) {
          isBlocked = (az < min || az > max);
        } else {
          isBlocked = (az > max && az < min);
        }
      }

      const blockedClass = isBlocked ? 'blocked-horizon' : '';
      const visColor = isBlocked ? '#64748b' : (p.visible ? '#22c55e' : '#64748b');
      const visText = isBlocked ? '❌ BLOCKED' : (p.visible ? '✅ VISIBLE' : '🔭 Low pass');

      return `
        <div class="iss-pass-item ${p.visible ? 'visible' : ''} ${blockedClass}">
          <span class="iss-time">🚀 ${p.rise || 'N/A'}</span>
          <span>→ ${p.set || 'N/A'}</span>
          <span class="iss-alt">📐 ${p.peak_alt !== 'N/A' ? p.peak_alt + '°' : '?'} ${p.peak_az || ''}</span>
          <span class="iss-vis-label" style="color: ${visColor}">
            ${visText}
          </span>
        </div>
      `;
    }).join('');
  });
}

// ── Motion Card Tab Switching ───────────────────────────────────────────────
function initMotionTabs() {
  document.querySelectorAll('.motion-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.motion-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.motion-panel').forEach(p => { p.style.display = 'none'; });
      tab.classList.add('active');
      const panel = document.getElementById(tab.dataset.panel);
      if (panel) panel.style.display = 'block';
    });
  });
}

// ── Motion Fact Cards ──────────────────────────────────────────────────────
const MOTION_FACTS = {
  iss: [
    { icon: '⚡', text: 'The ISS travels at 7.66 km/s (17,150 mph) — fast enough to circle the entire Earth in just 92 minutes.' },
    { icon: '🌍', text: 'Astronauts on the ISS witness approximately 15–16 sunrises and sunsets every single day.' },
    { icon: '📅', text: 'The ISS has been continuously inhabited since November 2, 2000 — over 24 years of unbroken human presence in space.' },
    { icon: '🏟️', text: 'The ISS is larger than a American football field: 109 m × 73 m, with a pressurised volume of 916 m³.' },
    { icon: '💰', text: 'At ~$150 billion USD, the ISS is the most expensive object ever built by humanity.' },
    { icon: '✨', text: 'The ISS can reach magnitude −5.9 at its brightest — outshining Venus and visible in full daylight if you know where to look.' },
    { icon: '🚀', text: 'The ISS has hosted over 270 individuals from 21 countries, spending a combined 130+ person-years in orbit.' },
    { icon: '🔬', text: 'Over 3,000 research experiments have been conducted aboard the ISS across biology, physics, astronomy, and medicine.' },
    { icon: '🌐', text: 'The ISS orbits at an altitude of roughly 400 km — just high enough for the curvature of Earth to be clearly visible.' },
    { icon: '🛸', text: 'It took 42 flights and over 13 years (1998–2011) to fully assemble the ISS in orbit.' },
  ],
  comet: [
    { icon: '☄️', text: 'Comets are ancient time capsules — most formed 4.6 billion years ago when the solar system was born, preserving pristine primordial material.' },
    { icon: '🌊', text: 'Some scientists believe comets may have delivered water and complex organic molecules to early Earth, seeding the conditions for life.' },
    { icon: '💨', text: "A comet's tail always points away from the Sun, not behind it. There are actually two tails: a dust tail and an ion (plasma) tail." },
    { icon: '❄️', text: "Comets are sometimes called 'dirty snowballs' — their nuclei are typically dark, frozen masses of ice, rock, and organic compounds just a few km across." },
    { icon: '🌠', text: "Most meteor showers are caused by Earth passing through trails of debris left by comets. The Perseids come from comet Swift-Tuttle; the Leonids from Tempel-Tuttle." },
    { icon: '🔭', text: 'Edmond Halley realised in 1705 that comets seen in 1531, 1607, and 1682 were all the same object returning on a 75-year orbit — proving comets follow predictable paths.' },
    { icon: '🌡️', text: "Comet surfaces can reach temperatures of +90 °C near the Sun but their nuclei remain at around −273 °C — just 1 degree above absolute zero." },
    { icon: '🧪', text: "The Rosetta mission found the amino acid glycine on comet 67P — one of the building blocks of proteins — providing tantalising hints at the cosmic origins of life." },
    { icon: '📡', text: "The Oort Cloud, a theoretical shell of trillions of comet nuclei at the very edge of our solar system, extends up to 100,000 AU (1.6 light-years) from the Sun." },
    { icon: '🎇', text: "The Great Comet of 1882 was so bright it was visible in full daylight and cast shadows at night — rivalling the full Moon in brightness." },
  ]
};

const motionFactState = { iss: 0, comet: 0 };

function initMotionFacts() {
  ['iss', 'comet'].forEach(type => {
    const facts = MOTION_FACTS[type];
    // Render dots
    const dotsEl = document.getElementById(`${type}-fact-dots`);
    if (dotsEl) {
      dotsEl.innerHTML = facts.map((_, i) =>
        `<span class="motion-fact-dot${i === 0 ? ' active' : ''}" onclick="goMotionFact('${type}',${i})"></span>`
      ).join('');
    }
    // Show first fact
    showMotionFact(type, 0);
    // Auto-rotate every 8 seconds
    setInterval(() => nextMotionFact(type), 8000);
  });
}

function showMotionFact(type, idx) {
  const facts = MOTION_FACTS[type];
  const fact = facts[idx];
  const textEl = document.getElementById(`${type}-fact-text`);
  const iconEl = document.getElementById(`${type}-fact-icon`);
  const card   = document.getElementById(`${type}-fact-card`);
  if (!textEl || !iconEl) return;
  card.style.opacity = '0';
  setTimeout(() => {
    iconEl.textContent = fact.icon;
    textEl.textContent = fact.text;
    card.style.opacity = '1';
  }, 200);
  // Update dots
  document.querySelectorAll(`#${type}-fact-dots .motion-fact-dot`).forEach((dot, i) => {
    dot.classList.toggle('active', i === idx);
  });
  motionFactState[type] = idx;
}

function nextMotionFact(type) {
  const facts = MOTION_FACTS[type];
  const next = (motionFactState[type] + 1) % facts.length;
  showMotionFact(type, next);
}

function goMotionFact(type, idx) {
  showMotionFact(type, idx);
}

// ── Render: Constellations Tonight ─────────────────────────────────────────
async function loadConstellations() {
  await fetchAndRender('/constellations?filter_famous=true', (data) => {
    const list = document.getElementById('constellations-grid');
    if (!data || !data.constellations) {
      list.innerHTML = '<div class="no-data">Could not load constellation data</div>';
      return;
    }
    if (data.constellations.length === 0) {
      list.innerHTML = '<div class="no-data">No famous constellations visible tonight</div>';
      return;
    }

    const visibleConst = data.constellations.filter(c => c.visible).slice(0, 16);
    if (visibleConst.length === 0) {
      list.innerHTML = '<div class="no-data">No famous constellations visible tonight</div>';
      return;
    }

    list.innerHTML = '';
    visibleConst.forEach(c => {
      const alt = c.altitude_deg;
      const az  = c.azimuth_deg;
      const azStr = (az != null && !isNaN(az)) ? ` (${Math.round(az)}°)` : '';
      const color = alt > 30 ? '#22c55e' : alt > 10 ? '#f59e0b' : '#f87171';
      const barPct = Math.min(100, Math.max(0, Math.round((alt / 90) * 100)));
      const barColor = alt > 30 ? '#22c55e' : alt > 10 ? '#f59e0b' : '#ef4444';

      const qualityLabel = alt > 30 ? 'High in sky' : alt > 10 ? 'Low in sky' : 'Near horizon';
      const qualityIcon  = alt > 30 ? '🟢' : alt > 10 ? '🟡' : '🔴';

      const div = document.createElement('div');
      div.className = 'const-card';
      div.dataset.const = c.abbr;
      div.setAttribute('aria-label', `${c.name} — ${qualityLabel}. Click to explore targets.`);
      div.innerHTML = `
        <div class="c-name">${c.emoji || '✨'} ${c.name} <span class="c-abbr-inline">${c.abbr}</span></div>
        <div class="c-alt-header">
          <span class="c-alt-label">Altitude above horizon</span>
          <span class="c-alt-value" style="color:${color}">${alt}°</span>
        </div>
        <div class="c-alt-bar-wrap">
          <div class="c-alt-bar" style="width:${barPct}%; background:${barColor};"></div>
        </div>
        <div class="c-meta">
          <span style="color:${color}">${qualityIcon} ${qualityLabel}</span>
          <span class="c-direction">${c.direction}${azStr}</span>
        </div>
      `;
      div.addEventListener('click', () => {
        // 1. Set the active constellation
        currentConstellation = c.abbr;
        localStorage.setItem('sg_constellation', c.abbr);

        // 2. Sync the tab bar (if this constellation has a tab)
        document.querySelectorAll('.const-tab').forEach(b => b.classList.remove('active'));
        const tab = document.querySelector(`.const-tab[data-const="${c.abbr}"]`);
        if (tab) tab.classList.add('active');

        // 3. Sync the dropdown
        const selectEl = document.getElementById('ac-select');
        if (selectEl) selectEl.value = c.abbr;
        //RESET COUNTER WHEN SWITCHING CONSTELLATIONS
        window.targetDisplayedCount = 12;

        // 4. Update the section title
        const titleEl = document.getElementById('target-db-title');
        const suffix = window.i18n[currentLang].targets_title_suffix || 'Targets';
        if (titleEl) titleEl.textContent = `${c.emoji || ''} ${c.name} ${suffix}`;

        // 5. Load targets for this constellation
        loadTargets();
        if (typeof loadActiveConstellation === 'function') loadActiveConstellation(c.abbr);

        // 6. Scroll the target card into view
        document.getElementById('card-targets').scrollIntoView({ behavior: 'smooth' });
      });
      list.appendChild(div);
    });
  });
}

// ── Render: Target Database ─────────────────────────────────────────────────
let currentConstellation = localStorage.getItem('sg_constellation') || 'Sco';

let targetDisplayedCount = 12; 
let activeFilter = 'all';

async function loadTargets() {
  await fetchAndRender(`/targets?constellation=${currentConstellation}`, (liveData) => {
    if (!liveData || !liveData.targets) return;
    const targets = liveData.targets;

    // Build a live altitude map from API data
    const liveMap = {};
    targets.forEach(t => { liveMap[t.id] = t; });

    const typeBtn = document.querySelector('.type-btn.active');
    const typeFilter = typeBtn ? typeBtn.dataset.filter : 'all';
    const equipBtn = document.querySelector('.equip-btn.active');
    const equipFilter = equipBtn ? equipBtn.dataset.equip : 'all';

    renderTargetGrid(targets, liveMap, typeFilter, equipFilter);

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      // Remove old listeners to prevent duplicates on SWR re-render
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      
      newBtn.addEventListener('click', () => {
        if (newBtn.classList.contains('equip-btn')) {
          document.querySelectorAll('.equip-btn').forEach(b => b.classList.remove('active'));
          newBtn.classList.add('active');
        } else if (newBtn.classList.contains('type-btn')) {
          document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
          newBtn.classList.add('active');
        }

        const activeEquip = document.querySelector('.equip-btn.active');
        const ef = activeEquip ? activeEquip.dataset.equip : 'all';

        const activeType = document.querySelector('.type-btn.active');
        const tf = activeType ? activeType.dataset.filter : 'all';

        renderTargetGrid(targets, liveMap, tf, ef);
      });
    });
  });
}

function renderTargetGrid(targets, liveMap, typeFilter = 'all', equipFilter = 'all') {
  const grid = document.getElementById('target-grid');
  if (!grid) return;

  // 1. Reset display chunk counter if the user switches active filter tabs
  const cacheKey = typeFilter + '-' + equipFilter;
  if (window.activeTargetFilter !== cacheKey) {
    window.activeTargetFilter = cacheKey;
    window.targetDisplayedCount = 12;
  }

  // 2. Filter targets array first
  const filtered = targets.filter(t => {
    let typeMatch = true;
    if (typeFilter !== 'all') {
      typeMatch = t.type.toLowerCase().includes(typeFilter);
    }
    
    let equipMatch = true;
    if (equipFilter !== 'all') {
      if (equipFilter === 'seestar') {
        // Seestar is great at galaxies, nebulae, clusters.
        equipMatch = ['galaxy', 'nebula', 'globular cluster', 'open cluster'].some(k => t.type.toLowerCase().includes(k));
      } else if (equipFilter === 'dslr') {
        // DSLR is great for wide-field, big clusters, and bright objects.
        equipMatch = t.magnitude <= 6 || t.type.toLowerCase().includes('open cluster');
      } else if (equipFilter === 'binos') {
        // Binoculars need bright, easy targets or large clusters.
        equipMatch = t.difficulty === 'naked_eye' || t.difficulty === 'easy' || t.magnitude <= 7;
      }
    }
    return typeMatch && equipMatch && t.observable !== false;
  });

  // 3. Smoothly slice the processed filtered data for chunked rendering
  const displayedTargets = filtered.slice(0, window.targetDisplayedCount || 12);

  // 4. Map the visible slice into HTML layout strings
  grid.innerHTML = displayedTargets.map(t => {
    const live = liveMap[t.id] || {};
    const visibleNow = live.in_fov === true;
    const altText = live.altitude_deg != null
      ? `${live.altitude_deg}° ${live.direction || ''} ${live.azimuth_deg ? '(' + Math.round(live.azimuth_deg) + '°)' : ''}`
      : null;

    const dict = window.i18n[currentLang] || window.i18n['en'];
    const tName = dict[`target_${t.id}_name`] || t.name;
    const tType = dict[`target_${t.id}_type`] || t.type;
    const tDesc = dict[`target_${t.id}_desc`] || t.description;

    let isBlocked = false;
    if (typeof activeLoc !== 'undefined' && activeLoc && activeLoc.porchMode && live.azimuth_deg != null && !isNaN(live.azimuth_deg)) {
      const az = live.azimuth_deg;
      const min = activeLoc.minAz || 0;
      const max = activeLoc.maxAz || 360;
      if (min <= max) {
        isBlocked = (az < min || az > max);
      } else {
        isBlocked = !(az >= min || az <= max);
      }
    }

    return `
      <div class="target-card ${visibleNow ? 'visible-now' : ''} ${isBlocked ? 'blocked-horizon' : ''}" data-type="${t.type}">
        <div class="tc-header">
          <span class="tc-emoji">${t.emoji}</span>
          <div>
            <div class="tc-name">${tName}</div>
            <div class="tc-type">${tType}</div>
            ${isBlocked ? '<div class="blocked-badge" title="Hidden behind your custom horizon limits">Blocked by Horizon</div>' : ''}
          </div>
          <span class="tc-mag">mag ${t.magnitude}</span>
        </div>
        ${['m1', 'm31', 'm4', 'm42', 'm7', 'm8', 'omega_cen', 'pleiades'].includes(t.id) ? `<img class="target-thumb" src="/assets/targets/${t.id}.jpg" alt="${tName}">` : ''}
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

  // 5. Append or clean up the DOM "Load More" pagination element
  let loadMoreBtn = document.getElementById('load-more-targets-btn');
  
  if (!loadMoreBtn && filtered.length > (window.targetDisplayedCount || 12)) {
    loadMoreBtn = document.createElement('button');
    loadMoreBtn.id = 'load-more-targets-btn';
    loadMoreBtn.textContent = 'Load More Targets 🔭';
    loadMoreBtn.style.cssText = 'display:block; margin:20px auto; padding:10px 24px; background:#a855f7; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold; transition: background 0.2s;';
    loadMoreBtn.onmouseover = () => loadMoreBtn.style.background = '#9333ea';
    loadMoreBtn.onmouseout = () => loadMoreBtn.style.background = '#a855f7';
    grid.after(loadMoreBtn);
  }

  if (loadMoreBtn) {
    if ((window.targetDisplayedCount || 12) >= filtered.length) {
      loadMoreBtn.remove();
    } else {
      loadMoreBtn.onclick = () => {
        window.targetDisplayedCount = (window.targetDisplayedCount || 12) + 12;
        renderTargetGrid(targets, liveMap, filter);
      };
    }
  }
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
  
  const inputPorchMode = document.getElementById('input-porch-mode');
  const porchModeInputs = document.getElementById('porch-mode-inputs');
  const inputPorchMin = document.getElementById('input-porch-min');
  const inputPorchMax = document.getElementById('input-porch-max');

  inputPorchMode?.addEventListener('change', (e) => {
    porchModeInputs.style.display = e.target.checked ? 'flex' : 'none';
  });
  
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
  
  // Data & Settings Modal
  const btnDataSettings = document.getElementById('btn-data-settings');
  const modalData = document.getElementById('data-modal');
  const btnCloseData = document.getElementById('btn-close-data');
  const btnExport = document.getElementById('btn-export-data');
  const btnTriggerImport = document.getElementById('btn-trigger-import');
  const inputImport = document.getElementById('input-import-data');

  if (btnDataSettings) {
    btnDataSettings.addEventListener('click', () => {
      const navDropdown = document.getElementById('nav-dropdown');
      if (navDropdown) navDropdown.classList.add('hidden'); // Close nav
      
      const selectBortle = document.getElementById('select-bortle');
      if (selectBortle) {
        selectBortle.value = window.currentBortle || "6";
      }
      
      modalData.classList.remove('hidden');
    });
  }
  
  const selectBortle = document.getElementById('select-bortle');
  if (selectBortle) {
    selectBortle.addEventListener('change', (e) => {
      window.currentBortle = e.target.value;
      localStorage.setItem('stargazer_bortle', window.currentBortle);
      // Reload targets and tonight report
      loadTonightReport();
      loadTargets();
    });
  }

  // API Server Override logic
  const inputApiOverride = document.getElementById('input-api-override');
  const btnSaveApi = document.getElementById('btn-save-api');
  
  if (inputApiOverride && btnSaveApi) {
    // Init value
    inputApiOverride.value = localStorage.getItem('stargazer_api_override') || '';
    
    btnSaveApi.addEventListener('click', () => {
      const val = inputApiOverride.value.trim();
      if (val) {
        // Basic validation: ensure it doesn't end with a slash
        const cleanVal = val.replace(/\/$/, '');
        localStorage.setItem('stargazer_api_override', cleanVal);
      } else {
        localStorage.removeItem('stargazer_api_override');
      }
      
      // We must reload the page so the API_BASE constant is re-evaluated globally
      window.location.reload();
    });
  }
  if (btnCloseData) {
    btnCloseData.addEventListener('click', () => {
      modalData.classList.add('hidden');
    });
  }

  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('stargazer_') || key.startsWith('sg_')) {
          data[key] = localStorage.getItem(key);
        }
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stargazer_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // PWA Push Notifications
  const btnSubscribeAlerts = document.getElementById('btn-subscribe-alerts');
  const btnTestAlert = document.getElementById('btn-test-alert');

  // Helper: convert base64url VAPID public key to Uint8Array
  function _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
  }

  async function _getPushSubscription() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
    const reg = await navigator.serviceWorker.ready;

    // Fetch VAPID public key from server
    let vapidKey = null;
    try {
      const resp = await fetch(`${API_BASE}/api/push/vapid-key`);
      if (resp.ok) {
        const data = await resp.json();
        vapidKey = data.publicKey;
      }
    } catch (e) { /* VAPID not configured — fallback to local-only notifications */ }

    const options = { userVisibleOnly: true };
    if (vapidKey) {
      options.applicationServerKey = _urlBase64ToUint8Array(vapidKey);
    }

    try {
      const sub = await reg.pushManager.subscribe(options);
      return sub;
    } catch (e) {
      console.warn('pushManager.subscribe failed:', e);
      return null;
    }
  }

  async function _sendSubscriptionToServer(sub) {
    try {
      await fetch(`${API_BASE}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON())
      });
    } catch (e) {
      console.warn('Failed to register subscription with server:', e);
    }
  }

  function _markAlertsEnabled() {
    if (btnSubscribeAlerts) {
      btnSubscribeAlerts.textContent = 'Alerts Enabled ✅';
      btnSubscribeAlerts.disabled = true;
    }
    if (btnTestAlert) btnTestAlert.style.display = 'block';
  }

  if (btnSubscribeAlerts) {
    // If already granted, reflect state immediately
    if (Notification.permission === 'granted') {
      _markAlertsEnabled();
    }

    btnSubscribeAlerts.addEventListener('click', async () => {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        _markAlertsEnabled();
        const sub = await _getPushSubscription();
        if (sub) {
          await _sendSubscriptionToServer(sub);
        }
      } else {
        alert('Notification permission denied. Check your browser settings to allow notifications for this site.');
      }
    });
  }

  if (btnTestAlert) {
    btnTestAlert.addEventListener('click', async () => {
      // Try server-side push first (works in prod with VAPID)
      try {
        const resp = await fetch(`${API_BASE}/api/push/test`, { method: 'POST' });
        if (resp.ok) return; // server sent it
      } catch (e) { /* fall through to local notification */ }

      // Fallback: local notification via SW (works on localhost without VAPID)
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification('🌌 StarGazer Test Alert', {
          body: 'Push notifications are working! You\'ll be alerted about ISS passes, auroras, and clear skies.',
          icon: './assets/ai_stargazer_mascot.png',
          badge: './assets/ai_stargazer_mascot.png',
          data: window.location.origin
        });
      }
    });
  }

  if (btnTriggerImport && inputImport) {
    btnTriggerImport.addEventListener('click', () => {
      inputImport.click();
    });

    inputImport.addEventListener('change', (evt) => {
      const file = evt.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          if (confirm('Are you sure you want to import this backup? It will overwrite your current locations and observation logs.')) {
            for (const key in data) {
              if (key.startsWith('stargazer_') || key.startsWith('sg_')) {
                localStorage.setItem(key, data[key]);
              }
            }
            alert('Backup successfully imported! Reloading...');
            location.reload();
          }
        } catch (err) {
          alert('Error: Invalid JSON backup file.');
        }
      };
      reader.readAsText(file);
      // Reset input
      inputImport.value = '';
    });
  }

  // Onboarding Tour
  window.startOnboardingTour = function() {
    if (!window.driver || !window.driver.js || !window.driver.js.driver) {
      console.warn('Driver.js not loaded yet');
      return;
    }
    const driverObj = window.driver.js.driver({
      showProgress: true,
      steps: [
        { popover: { title: 'Welcome to StarGazer! ✨', description: 'Your personal dashboard for stargazing and astronomy planning. Let\'s take a quick tour of all the features!', align: 'center' } },
        { element: '#btn-location', popover: { title: '📍 Location Setup', description: 'Your location is set! You can add more observing spots here any time, including a porch mode to restrict visibility angles.', side: 'bottom', align: 'start' } },
        { element: '#card-live-sky', popover: { title: '🌤 Live Sky Conditions', description: 'Real-time weather, astronomical seeing, and moon phase for your location — updated every 10 minutes.', side: 'bottom', align: 'start' } },
        { element: '#card-active-const', popover: { title: '🗺 Active Constellation', description: 'Interactive sky map of constellations currently above you. Click any star to look it up in the SIMBAD database!', side: 'top', align: 'start' } },
        { element: '#card-targets', popover: { title: '🔭 Tonight\'s Targets', description: 'Galaxies, nebulae, and planets visible tonight, ranked by altitude. Filtered automatically to your sky darkness (Bortle class).', side: 'top', align: 'start' } },
        { element: '#card-motion', popover: { title: '🚀 Sky Objects in Motion', description: 'Track the ISS, near-Earth asteroids, comets, and meteor showers — all calculated for your exact location.', side: 'top', align: 'start' } },
        { element: '#btn-menu', popover: { title: '🔔 Push Notifications & Settings', description: 'Click this menu → then “💾 Data & Settings” to enable native push alerts for ISS passes, auroras, and clearing skies. Also set your Bortle Class and back up your data here!', side: 'left', align: 'start' } },
        { element: '#btn-night-mode', popover: { title: '🔴 Night Vision Mode', description: 'Enable the red overlay to preserve your dark-adapted eyes while observing. Essential for real sessions!', side: 'left', align: 'end' } },
        { popover: { title: '📱 Install StarGazer as an App', description: 'Get the full PWA experience! In Chrome: tap the install icon (⭳) in the address bar. On iOS Safari: tap Share → “Add to Home Screen”. Once installed, you\'ll get native push notifications directly on your device!', align: 'center' } },
      ]
    });
    driverObj.drive();
  };
  
  document.getElementById('btn-about').addEventListener('click', window.startOnboardingTour);
  
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

  document.getElementById('close-about-btn').addEventListener('click', () => {
    aboutModal.classList.add('hidden');
  });

  document.getElementById('btn-save-loc').addEventListener('click', async () => {
    const lat = parseFloat(inputLat.value);
    let lon = parseFloat(inputLon.value);
    let name = inputName.value.trim();
    
    if (isNaN(lat) || isNaN(lon)) return alert('Invalid coordinates. Please enter a valid number.');
    if (lat < -90 || lat > 90) return alert('Latitude must be between -90 and 90 degrees.');
    
    // Normalize longitude if someone enters 0-360 instead of -180 to 180
    if (lon > 180) lon -= 360;
    if (lon < -180) lon += 360;
    
    if (lon < -180 || lon > 180) return alert('Longitude must be between -180 and 180 degrees.');
    
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
    
    let porchMode = false;
    let minAz = 0;
    let maxAz = 360;
    
    if (inputPorchMode && inputPorchMode.checked) {
      porchMode = true;
      minAz = parseFloat(inputPorchMin.value) || 0;
      maxAz = parseFloat(inputPorchMax.value) || 360;
    }
    
    const newLoc = { id: 'loc_' + Date.now(), name, lat, lon, porchMode, minAz, maxAz };
    savedLocations.push(newLoc);
    localStorage.setItem('stargazer_locations', JSON.stringify(savedLocations));
    
    btn.textContent = oldText;
    btn.disabled = false;
    activateLocation(newLoc.id);
  });

  let citySearchTimeout = null;
  const cityInput = document.getElementById('input-city-search');
  const btnCitySearch = document.getElementById('btn-city-search');
  const suggestionsBox = document.getElementById('city-search-suggestions');
  
  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (suggestionsBox && !suggestionsBox.contains(e.target) && e.target !== cityInput) {
      suggestionsBox.style.display = 'none';
    }
  });
  
  const performCitySearch = () => {
    const query = cityInput.value.trim();
    if (!query) {
      if (suggestionsBox) suggestionsBox.style.display = 'none';
      return;
    }
    
    const oldText = btnCitySearch.textContent;
    btnCitySearch.textContent = '⏳';
    btnCitySearch.disabled = true;
    
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
      .then(res => res.json())
      .then(data => {
        if (!suggestionsBox) return;
        
        suggestionsBox.innerHTML = '';
        if (data && data.length > 0) {
          data.forEach(result => {
            const item = document.createElement('div');
            item.style.padding = '8px 12px';
            item.style.cursor = 'pointer';
            item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            item.style.fontSize = '0.9rem';
            item.textContent = result.display_name;
            
            // Hover effect
            item.addEventListener('mouseenter', () => item.style.backgroundColor = 'rgba(255,255,255,0.1)');
            item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');
            
            item.addEventListener('click', () => {
              inputLat.value = parseFloat(result.lat).toFixed(4);
              inputLon.value = parseFloat(result.lon).toFixed(4);
              
              const parts = result.display_name.split(',');
              if (parts.length > 1) {
                 inputName.value = `${parts[0].trim()}, ${parts[1].trim()}`;
              } else {
                 inputName.value = parts[0].trim();
              }
              
              cityInput.value = result.display_name;
              suggestionsBox.style.display = 'none';
            });
            
            suggestionsBox.appendChild(item);
          });
          suggestionsBox.style.display = 'block';
        } else {
          const item = document.createElement('div');
          item.style.padding = '8px 12px';
          item.style.fontSize = '0.9rem';
          item.style.color = 'var(--text-secondary)';
          item.textContent = 'No results found.';
          suggestionsBox.appendChild(item);
          suggestionsBox.style.display = 'block';
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

  // --- Auto-detect GPS from Header ---
  const headerGpsBtn = document.getElementById('btn-gps-header');
  if (headerGpsBtn && !headerGpsBtn.dataset.bound) {
    headerGpsBtn.dataset.bound = "true";
    headerGpsBtn.addEventListener('click', () => {
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        alert("Browser Geolocation requires HTTPS. Please enter coordinates manually in the location settings.");
        return;
      }
      const icon = headerGpsBtn.querySelector('i');
      if (icon) icon.style.stroke = 'var(--accent-blue)';
      
      navigator.geolocation.getCurrentPosition(
        pos => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
            .then(res => res.json())
            .then(data => {
              let locName = 'GPS Location';
              if (data && data.address) {
                locName = data.address.city || data.address.town || data.address.village || data.address.county || locName;
              }
              const newId = 'loc_' + Date.now();
              const newLoc = { id: newId, name: locName, lat: lat, lon: lon };
              savedLocations.push(newLoc);
              localStorage.setItem('stargazer_locations', JSON.stringify(savedLocations));
              // Mark tour to run after reload (first visit)
              if (!localStorage.getItem('sg_tour_seen')) {
                localStorage.setItem('sg_tour_pending', '1');
              }
              activateLocation(newId); // triggers reload
              if (icon) icon.style.stroke = 'currentColor';
            })
            .catch(() => {
              const newId = 'loc_' + Date.now();
              const newLoc = { id: newId, name: 'GPS Location', lat: lat, lon: lon };
              savedLocations.push(newLoc);
              localStorage.setItem('stargazer_locations', JSON.stringify(savedLocations));
              if (!localStorage.getItem('sg_tour_seen')) {
                localStorage.setItem('sg_tour_pending', '1');
              }
              activateLocation(newId);
              if (icon) icon.style.stroke = 'currentColor';
            });
        },
        err => {
          alert('Geolocation failed: ' + err.message);
          if (icon) icon.style.stroke = 'currentColor';
        }
      );
    });
  }
  
  if (currentLat === null || currentLon === null) {
    document.getElementById('logo-sub').textContent = 'Location Required';
    document.getElementById('logo-coords').textContent = 'Please enable GPS';
    
    // First visit: auto-trigger GPS then continue init + show tour
    if (headerGpsBtn) {
      // Listen for location being set (activateLocation fires a custom event)
      const onLocationSet = () => {
        window.removeEventListener('stargazer:locationSet', onLocationSet);
        // Re-run init now that we have coords
        init();
        // Start tour after a short delay so the dashboard renders first
        setTimeout(() => {
          if (window.startOnboardingTour) window.startOnboardingTour();
        }, 800);
      };
      window.addEventListener('stargazer:locationSet', onLocationSet);
      headerGpsBtn.click();
    }
    return;
  }

  // Auto-start tour after first GPS location set (flag was set before reload)
  const tourPending = localStorage.getItem('sg_tour_pending');
  if (tourPending) {
    localStorage.removeItem('sg_tour_pending');
    localStorage.setItem('sg_tour_seen', '1');
    setTimeout(() => {
      if (window.startOnboardingTour) window.startOnboardingTour();
    }, 1200);
  }

  updateClearOutside();

  // Setup Constellation Tabs
  document.querySelectorAll('.const-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.const-tab').forEach(b => b.classList.remove('active'));
      const btn = e.target;
      btn.classList.add('active');
      currentConstellation = btn.dataset.const;
      localStorage.setItem('sg_constellation', currentConstellation);
      window.targetDisplayedCount = 12;
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
      window.targetDisplayedCount = 12;
      
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

  // Wire up the Sky Objects in Motion sub-tabs and fact cards
  initMotionTabs();
  initMotionFacts();

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
    // Re-render any new Lucide icons injected by data loads
    if (window.lucide) lucide.createIcons();
  }, 10 * 60 * 1000);

  // --- Register Service Worker for PWA ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker registered', reg))
      .catch(err => console.error('Service Worker registration failed', err));
  }

  // Init Lucide icons after all data has loaded
  if (window.lucide) lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', () => {
  init();
  // Fallback: re-run Lucide after a short delay to catch any late-injected icons
  setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 1500);
});


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
  
  document.querySelectorAll('.lang-select').forEach(langSelect => {
    langSelect.value = currentLang;
  });
  
  const unitBtn = document.getElementById('btn-unit-toggle');
  if (unitBtn) {
    unitBtn.textContent = isMetric ? '°C / km' : '°F / mi';
    unitBtn.addEventListener('click', () => {
      isMetric = !isMetric;
      localStorage.setItem('stargazer_units', isMetric ? 'metric' : 'imperial');
      window.location.reload();
    });
  }
  
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
        document.querySelectorAll('.lang-select').forEach(langSelect => {
            langSelect.addEventListener('change', (e) => {
                setLanguage(e.target.value);
                window.location.reload();
            });
        });
        setLanguage(currentLang);
    }, 100);
});


const closeNightTooltip = document.getElementById('close-night-tooltip');
if (closeNightTooltip) {
  closeNightTooltip.addEventListener('click', () => {
    document.getElementById('night-tooltip').style.display = 'none';
  });
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
  
  // Fix Aladin Lite throwing resize errors when its container is display: none
  if (aladinInstance) {
    document.getElementById('aladin-lite-div').innerHTML = '';
    aladinInstance = null;
  }
});

document.getElementById('close-star-btn')?.addEventListener('click', () => {
  document.getElementById('star-modal').classList.add('hidden');
});

document.addEventListener('DOMContentLoaded', () => {

  
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
              <div style="color: #94a3b8; font-size: 0.75rem;">${diamText} ~${isMetric ? a.diameter_m : Math.round(a.diameter_m * 3.28084)}${isMetric ? 'm' : 'ft'} • ${speedText} ${isMetric ? a.velocity_kmh.toLocaleString() : Math.round(a.velocity_kmh * 0.621371).toLocaleString()} ${isMetric ? 'km/h' : 'mph'}</div>
            </div>
            <div style="text-align: right; color: #a855f7; font-size: 0.85rem; font-family: var(--font-mono);">
              <div style="font-size: 0.6rem; color: #94a3b8; font-family: var(--font-sans); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">${missDistText}</div>
              ${isMetric ? a.miss_distance_km.toLocaleString() : Math.round(a.miss_distance_km * 0.621371).toLocaleString()} ${isMetric ? 'km' : 'mi'}
            </div>
          </div>
        `;
      });
    })
    .finally(() => {
      // Add fun facts — standardized fact card
      const facts = [
        "Asteroids are rocky remnants left over from the early formation of our solar system about 4.6 billion years ago.",
        "Most asteroids in our solar system can be found in the main asteroid belt between Mars and Jupiter.",
        "Some asteroids have their own moons! For example, the asteroid Ida has a tiny moon called Dactyl.",
        "If all the asteroids in the solar system were combined, their total mass would still be less than that of Earth's Moon.",
        "Ceres is the largest object in the asteroid belt, and it's so big it's actually classified as a dwarf planet!",
        "Asteroid 433 Eros was the first asteroid to be orbited and landed on by a spacecraft — NASA's NEAR Shoemaker in 2001.",
        "Some asteroids contain trillions of dollars worth of rare metals like platinum and nickel-iron."
      ];
      const randomFact = facts[Math.floor(Math.random() * facts.length)];
      
      const list = document.getElementById('asteroids-list');
      if (list) {
        list.innerHTML += `
          <div class="motion-facts-wrap" style="margin-top:12px;">
            <div class="motion-facts-header"><span>☄️ Asteroid Fact</span></div>
            <div class="motion-fact-card">
              <span class="motion-fact-icon">🪨</span>
              <span>${randomFact}</span>
            </div>
          </div>
        `;
      }
    });

  // Fetch Meteor Showers
  fetch(`${API_BASE}/api/meteors?count=5`)
    .then(r => {
      if (!r.ok) throw new Error('API Error');
      return r.json();
    })
    .catch(err => {
      console.warn("Meteor showers API failed, falling back to cache.", err);
      return null;
    })
    .then(data => {
      const list = document.getElementById('meteors-list');
      if (!list) return;

      let showers = data && data.showers;
      if (!showers || showers.length === 0) {
        const cachedStr = localStorage.getItem('stargazer_meteors_cache');
        if (cachedStr) {
          try { showers = JSON.parse(cachedStr); } catch(e) {}
        }
      }

      if (!showers || showers.length === 0) {
        list.innerHTML = `<div style="color:#ef4444; font-size:0.85rem; padding:10px;">Failed to load meteor shower schedule.</div>`;
        return;
      }

      localStorage.setItem('stargazer_meteors_cache', JSON.stringify(showers));

      list.innerHTML = showers.map((s, i) => {
        const peak = new Date(s.peak_date + 'T00:00:00Z');
        const peakLabel = peak.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const days = s.days_until_peak;
        let countdown;
        if (days === 0) countdown = 'Peaks tonight';
        else if (days === 1) countdown = 'Peaks tomorrow';
        else countdown = `Peaks in ${days} days`;
        const highlight = i === 0
          ? 'border: 1px solid rgba(56,189,248,0.4); box-shadow: 0 0 12px rgba(56,189,248,0.15);'
          : 'border: 1px solid rgba(255,255,255,0.08);';
        const nextBadge = i === 0
          ? `<span style="background:rgba(56,189,248,0.15); color:#38bdf8; font-size:0.65rem; padding:2px 6px; border-radius:4px; margin-left:6px; text-transform:uppercase; letter-spacing:0.05em;">Next</span>`
          : '';
        return `
          <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 6px; ${highlight}">
            <div style="display:flex; justify-content:space-between; align-items:baseline; gap:8px; flex-wrap:wrap;">
              <div style="color:#e2e8f0; font-weight:bold; font-size:0.95rem;">💫 ${s.name}${nextBadge}</div>
              <div style="color:#a855f7; font-size:0.85rem; font-family: var(--font-mono);">ZHR ~${s.zhr}/hr</div>
            </div>
            <div style="color:#cbd5e1; font-size:0.8rem; margin-top:4px;">
              <span style="color:#38bdf8;">${peakLabel}</span> · <span style="color:#94a3b8;">${countdown}</span>
            </div>
            <div style="color:#94a3b8; font-size:0.75rem; margin-top:4px;">
              Active: ${s.activity_period} · Best: ${s.hemisphere} Hem. · Parent: ${s.parent_body}
            </div>
            <div style="color:#cbd5e1; font-size:0.75rem; margin-top:6px; font-style:italic;">${s.notes}</div>
          </div>
        `;
      }).join('');
    });

  // Observation Notes Local Storage
  const obsNotes = document.getElementById('observation-notes');
  if (obsNotes) {
    const savedNotes = localStorage.getItem('stargazer_obs_notes');
    if (savedNotes) {
      obsNotes.value = savedNotes;
    }
    
    const autoResize = () => {
      obsNotes.style.height = '120px'; // Reset to min-height first
      obsNotes.style.height = Math.max(120, obsNotes.scrollHeight) + 'px';
    };
    
    // Auto-resize on load
    setTimeout(autoResize, 50);

    // Save on input with simple debounce
    let timeoutId;
    obsNotes.addEventListener('input', () => {
      autoResize();
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        localStorage.setItem('stargazer_obs_notes', obsNotes.value);
      }, 500);
    });
  }

  // Initialize 3D Moon if present
  if (window.initMoon3D) setTimeout(window.initMoon3D, 500);

  // ── Draggable Floating Buttons ───────────────────────────────────────────
  function makeDraggable(el) {
    let isDragging = false;
    let startX, startY, startLeft, startTop, startRight, startBottom;
    let hasMoved = false;

    function onStart(e) {
      // Don't drag if clicking dismiss button
      if (e.target.classList.contains('floating-btn-dismiss')) return;
      // Don't drag if clicking inner buttons
      if (e.target.tagName === 'BUTTON' && e.target.id !== '') {
        // Allow dragging when clicking the main button
      }
      isDragging = true;
      hasMoved = false;
      el.classList.add('dragging');

      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;

      const rect = el.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      startRight = window.innerWidth - rect.right;
      startBottom = window.innerHeight - rect.bottom;

      if (e.touches) e.preventDefault();
    }

    function onMove(e) {
      if (!isDragging) return;
      const touch = e.touches ? e.touches[0] : e;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;

      el.style.left = (startLeft + dx) + 'px';
      el.style.top = (startTop + dy) + 'px';
      el.style.bottom = 'auto';
      el.style.right = 'auto';

      if (e.touches) e.preventDefault();
    }

    function onEnd() {
      if (!isDragging) return;
      isDragging = false;
      el.classList.remove('dragging');

      // Clamp to viewport
      const rect = el.getBoundingClientRect();
      const clampedLeft = Math.max(0, Math.min(rect.left, window.innerWidth - 50));
      const clampedTop = Math.max(0, Math.min(rect.top, window.innerHeight - 50));
      el.style.left = clampedLeft + 'px';
      el.style.top = clampedTop + 'px';
      el.style.bottom = 'auto';
      el.style.right = 'auto';

      // Save position
      try {
        localStorage.setItem('stargazer_' + el.id + '_pos', JSON.stringify({
          left: clampedLeft, top: clampedTop
        }));
      } catch {}
    }

    // Touch events
    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);

    // Mouse events
    el.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
  }

  // Restore saved positions and make buttons draggable
  ['floating-tour', 'floating-night'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    // Restore saved position
    try {
      const saved = localStorage.getItem('stargazer_' + id + '_pos');
      if (saved) {
        const pos = JSON.parse(saved);
        el.style.left = pos.left + 'px';
        el.style.top = pos.top + 'px';
        el.style.bottom = 'auto';
        el.style.right = 'auto';
      }
    } catch {}

    // Hide if previously dismissed
    if (localStorage.getItem(id + '_dismissed') === '1') {
      el.style.display = 'none';
    }

    makeDraggable(el);
  });
  
  // CPU Optimization: Pause heavy 3D solar system when out of view
  const solarWrapper = document.getElementById('css-solar-system-wrapper');
  if (solarWrapper) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          solarWrapper.style.display = 'block';
        } else {
          solarWrapper.style.display = 'none'; // Completely stops CSS animations & GPU usage
        }
      });
    }, { rootMargin: '100px' });
    
    const heroSection = document.getElementById('hero-section');
    if (heroSection) observer.observe(heroSection);
  }

  // Auto-start tour on first visit
  setTimeout(() => {
    if (!localStorage.getItem('stargazer_tour_seen')) {
      localStorage.setItem('stargazer_tour_seen', 'true');
      if (typeof window.startOnboardingTour === 'function') {
        window.startOnboardingTour();
      }
    }
  }, 1000);
});

// ── Optics Calculator ───────────────────────────────────────────────────────
window.updateOptics = function() {
  const scopeFl = parseFloat(document.getElementById('calc-scope-fl').value) || 650;
  const scopeAp = parseFloat(document.getElementById('calc-scope-ap').value) || 130;
  const epFl = parseFloat(document.getElementById('calc-ep-fl').value) || 25;
  const epAfov = parseFloat(document.getElementById('calc-ep-afov').value) || 52;
  const targetType = document.getElementById('calc-target-type').value;

  const mag = scopeFl / epFl;
  const tfov = epAfov / mag;
  const max = scopeAp * 2;

  let recText = "";
  if (targetType === 'planets') {
    recText = `<strong>Planets are tiny.</strong> You need at least <strong>100x - 150x</strong> magnification to see details like Jupiter's bands or Saturn's rings. Try an eyepiece around <strong>${Math.max(4, Math.round(scopeFl/150))}mm to ${Math.round(scopeFl/100)}mm</strong>.`;
  } else if (targetType === 'moon') {
    recText = `<strong>The Moon is huge (~0.5° wide).</strong> To see the whole Moon at once, your True FOV must be &gt; 0.5°. For zooming into craters, push the magnification to <strong>100x+</strong>!`;
  } else if (targetType === 'clusters') {
    recText = `<strong>Star clusters vary in size.</strong> A moderate magnification of <strong>40x - 80x</strong> is usually best to resolve individual stars while keeping the cluster framed beautifully.`;
  } else if (targetType === 'nebulae') {
    recText = `<strong>Nebulae are faint and sprawling.</strong> You want a very wide True FOV (<strong>&gt; 1.5°</strong>) and low magnification to concentrate their faint light. Stick to your <strong>25mm or 32mm</strong> eyepiece!`;
  }
  
  document.getElementById('calc-recommendation').innerHTML = recText;

  document.getElementById('calc-out-mag').innerText = Math.round(mag) + 'x';
  document.getElementById('calc-out-tfov').innerText = tfov.toFixed(2) + '°';
  document.getElementById('calc-out-max').innerText = Math.round(max) + 'x';
};

// Initialize optics on load
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('calc-target-type')) {
    window.updateOptics();
  }
});

// Telescope Calculator Metric Clipboard Copier
document.querySelectorAll('.copy-metric-btn').forEach(btn => {
  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    
    const targetId = btn.getAttribute('data-target');
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
      const valueText = targetElement.innerText.trim();
      let labelText = '';
      
      if (targetId === 'calc-out-mag') labelText = 'Magnification';
      if (targetId === 'calc-out-tfov') labelText = 'True FOV';
      if (targetId === 'calc-out-max') labelText = 'Max Useful Magnification';
      
      const copyString = `${labelText}: ${valueText}`;
      
      navigator.clipboard.writeText(copyString)
        .then(() => {
          if (typeof showInfo === 'function') {
            showInfo(`Copied to clipboard: ${valueText}`, event);
          }
        })
        .catch(err => {
          console.error('Failed to copy text layout: ', err);
        });
    }
  });
});