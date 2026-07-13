"""Seeing forecast: AI analysis, rule-based scoring, and weather fetching."""

from __future__ import annotations

import logging
import math
import requests
import threading
import time
from datetime import date, timedelta
from typing import Optional

from config import AI_API_KEY, AI_API_URL, AI_MODEL, FALLBACK_AI_API_URL, FALLBACK_AI_MODEL, LOCAL_AI_URL, LOCAL_AI_MODEL, LATITUDE, LONGITUDE, AI_TIMEOUT

from .cache import _load_ai_cache, _save_ai_cache
from .moon import get_moon_info
from .moon_facts import get_moon_fact
from .targets import get_visible_targets
from .skyfield import now_local


def _call_ai_api(api_url, api_model, payload, auth_header, timeout_sec):
    """Call an AI API and return the parsed response dict, or None on failure."""
    headers = {"Content-Type": "application/json"}
    if auth_header:
        headers["Authorization"] = f"Bearer {auth_header}"
    payload = payload.copy()
    payload["model"] = api_model
    resp = requests.post(api_url, json=payload, headers=headers, timeout=timeout_sec)
    resp.raise_for_status()
    return resp.json()


def _parse_ai_response(data):
    """Extract JSON from AI response. Returns dict with score or None."""
    try:
        msg = data["choices"][0]["message"]
    except (KeyError, IndexError):
        return None
    content_txt = msg.get("content", "").strip()
    reasoning = msg.get("reasoning_content", "").strip()
    raw = content_txt if content_txt else reasoning
    if not raw:
        return None

    result = None
    if "```json" in raw:
        block = raw.split("```json")[-1].split("```")[0]
        try:
            result = __import__("json").loads(block.strip())
        except Exception:
            pass
    if result is None:
        first_brace = raw.find("{")
        if first_brace != -1:
            candidate = raw[first_brace:].strip()
            for suffix in ["", "}", "]}", '"]}', '"}']:
                try:
                    result = __import__("json").loads(candidate + suffix)
                    break
                except Exception:
                    pass
                try:
                    result = __import__("json").loads(candidate + '"' + suffix)
                    break
                except Exception:
                    pass
    if result and "score" in result:
        score = int(result.get("score", 0))
        if 1 <= score <= 10:
            return {
                "score": score,
                "label": str(result.get("label", ""))[:60],
                "explanation": str(result.get("explanation", ""))[:300],
                "best_window": str(result.get("best_window", "Check conditions"))[:60],
                "warnings": [str(w)[:80] for w in result.get("warnings", [])[:4]],
                "recommended_targets": result.get("recommended_targets", []),
                "ai_powered": True,
            }
    return None


def _save_result(current_hash, result, fallback_args):
    """Save a result to cache, or fall back to rule-based on failure."""
    db = _load_ai_cache()
    if result:
        if fallback_args:
            weather, moon_illum, moon_alt, moon_dist = fallback_args
            if moon_illum < 3: phase_name = "🌑 New Moon"
            elif moon_illum < 45: phase_name = "🌒 Waxing Crescent"
            elif moon_illum < 55: phase_name = "🌓 First Quarter"
            elif moon_illum < 95: phase_name = "🌔 Waxing Gibbous"
            elif moon_illum > 97: phase_name = "🌕 Full Moon"
            elif moon_illum > 55: phase_name = "🌖 Waning Gibbous"
            elif moon_illum > 45: phase_name = "🌗 Last Quarter"
            else: phase_name = "🌘 Waning Crescent"
            result["moon_fact"] = get_moon_fact(phase_name, moon_illum, moon_dist, today=date.today())
            
        db[current_hash] = {"timestamp": int(time.time()), "data": result}
        _save_ai_cache(db)
    elif current_hash in db and db[current_hash].get("data", {}).get("status") == "processing":
        if fallback_args:
            weather, moon_illum, moon_alt, moon_dist = fallback_args
            fb = _rule_based_seeing_score(weather, moon_illum, moon_alt, moon_dist)
            fb["ai_powered"] = False
            db[current_hash] = {"timestamp": int(time.time()), "data": fb}
            _save_ai_cache(db)
        else:
            del db[current_hash]
            _save_ai_cache(db)


def _background_ai_task(payload, headers, current_hash, fallback_args=None):
    """Run in a background thread: try primary API → fallback remote → local llama.cpp → rule-based."""
    auth_header = AI_API_KEY if AI_API_KEY else None
    timeout_sec = max(AI_TIMEOUT, 15)  # at least 15s per API

    # 1. Primary remote API
    if AI_API_URL and AI_MODEL:
        try:
            logging.info("AI Seeing: Trying primary API %s", AI_API_URL)
            data = _call_ai_api(AI_API_URL, AI_MODEL, payload, auth_header, timeout_sec)
            result = _parse_ai_response(data)
            if result:
                logging.info("AI Seeing: Primary API succeeded")
                _save_result(current_hash, result, fallback_args)
                return
            logging.warning("AI Seeing: Primary API returned unparseable response")
        except Exception as e:
            logging.warning("AI Seeing: Primary API failed: %s", e)

    # 2. Fallback remote API
    if FALLBACK_AI_API_URL and FALLBACK_AI_MODEL:
        try:
            logging.info("AI Seeing: Trying fallback remote API %s", FALLBACK_AI_API_URL)
            data = _call_ai_api(FALLBACK_AI_API_URL, FALLBACK_AI_MODEL, payload, None, timeout_sec)
            result = _parse_ai_response(data)
            if result:
                logging.info("AI Seeing: Fallback remote API succeeded")
                _save_result(current_hash, result, fallback_args)
                return
            logging.warning("AI Seeing: Fallback remote API returned unparseable response")
        except Exception as e:
            logging.warning("AI Seeing: Fallback remote API failed: %s", e)

    # 3. Local llama.cpp
    if LOCAL_AI_URL and LOCAL_AI_MODEL:
        try:
            logging.info("AI Seeing: Trying local model %s", LOCAL_AI_URL)
            data = _call_ai_api(LOCAL_AI_URL, LOCAL_AI_MODEL, payload, None, timeout_sec)
            result = _parse_ai_response(data)
            if result:
                logging.info("AI Seeing: Local model succeeded")
                _save_result(current_hash, result, fallback_args)
                return
            logging.warning("AI Seeing: Local model returned unparseable response")
        except Exception as e:
            logging.warning("AI Seeing: Local model failed: %s", e)

    # 4. All APIs failed — fall back to rule-based
    logging.warning("AI Seeing: All APIs failed, using rule-based fallback")
    _save_result(current_hash, None, fallback_args)


def _ai_seeing_analysis(weather: dict, moon_illum: float, moon_alt: float, visible_targets: list = None, window_label: str = "averaged 8 PM – 4 AM local time", lat: float = 0.0, lon: float = 0.0, lang: str = "en", moon_dist: int = 384400) -> Optional[dict]:
    """
    Call Qwen3.5-9B with a structured astronomy seeing prompt.
    Returns dict with score (1-10), label, explanation, best_window, warnings[].
    Returns None on timeout or any failure — caller falls back to rule-based scorer.
    """
    if not AI_API_URL or not AI_MODEL:
        raise ValueError("AI_API_URL or AI_MODEL is not configured in .env")

    # Cache key: lat, lon, and a 3-hour time block (10800 seconds)
    # This ensures stability across minor weather float changes and page refreshes.
    import time
    time_block = int(time.time()) // 10800
    current_hash = f"{round(float(lat), 2)}_{round(float(lon), 2)}_{time_block}_{lang}_v2"
    
    # Cache Hit
    cache_db = _load_ai_cache()
    if current_hash in cache_db:
        entry = cache_db[current_hash]
        # Evict stale processing locks (e.g. if the thread died)
        if entry.get("data", {}).get("status") == "processing" and int(time.time()) - entry.get("timestamp", 0) > 240:
            import logging
            logging.getLogger("stargazer").warning("AI Seeing: Found stale processing cache. Evicting.")
            del cache_db[current_hash]
            _save_ai_cache(cache_db)
        else:
            import logging
            logging.getLogger("stargazer").info("AI Seeing: Returning fresh cached response from disk")
            return entry["data"]
            
    if visible_targets:
        # Just grab the top 15 highest altitude targets so we don't blow up the prompt context
        targets_str = ", ".join([f"{t['name']} (Mag {t.get('magnitude', '?')})" for t in visible_targets[:15]])
        target_prompt = f"\n- Top visible deep-sky targets tonight: {targets_str}\nSelect up to 3 of these as 'recommended_targets' considering the moon and weather."
    else:
        target_prompt = ""

    lang_instruction = f"\nCRITICAL: All string values in your JSON response (label, explanation, warnings, recommended_targets names and reasons) MUST be written in the ISO language code '{lang}'. Do not use English unless '{lang}' is 'en'." if lang != "en" else ""

    prompt = f"""You are an expert astronomical seeing forecaster helping amateur astronomers decide whether to observe tonight.

Tonight's atmospheric data ({window_label}):
- Cloud cover: {weather.get('cloud_total', '?')}% (low: {weather.get('cloud_low', '?')}%, mid: {weather.get('cloud_mid', '?')}%, high/cirrus: {weather.get('cloud_high', '?')}%)
- Surface wind: {weather.get('wind_surface', '?')} km/h
- Upper-atmosphere wind (500hPa jet stream proxy): {weather.get('wind_upper', '?')} km/h
- Precipitation probability: {weather.get('precip', '?')}%
- Relative humidity: {weather.get('humidity', '?')}%
- Dew point spread (temp − dewpoint): {weather.get('dew_spread', '?')}°C  [<3°C = fogging risk]
- Surface pressure: {weather.get('pressure', '?')} hPa
- Visibility: {weather.get('visibility_km', '?')} km
- High cirrus clouds present: {'Yes' if (weather.get('cloud_high') or 0) > 20 else 'No'}
- Moon: {moon_illum:.0f}% illuminated, currently {moon_alt:.1f}° above horizon{target_prompt}

Rate the astronomical seeing quality on a scale of 1–10 (10 = perfect, 1 = stay inside).
Consider: transparency (cloud/humidity/cirrus), atmospheric stability (jet stream), dew risk, moon interference, and overall observing potential.

Respond ONLY with valid JSON — no markdown, no explanation outside the JSON:
{{"score": <int 1-10>, "label": "<short label e.g. Exceptional transparency>", "explanation": "<2 sentences for a beginner astronomer>", "best_window": "<e.g. 10 PM – Midnight or All night>", "warnings": [<list of short warning strings, empty list if none>], "recommended_targets": [{{"name": "<Target Name>", "constellation": "<Constellation>", "magnitude": "<e.g., 1.5 or N/A>", "distance_ly": "<e.g., 400 Light Years>", "equipment": "<Naked Eye / Binoculars / Telescope>", "how_to_find": "<1 sentence star-hopping guide>", "reason": "<Why it's good tonight>"}}]}}{lang_instruction}"""

    headers = {"Content-Type": "application/json"}
    if AI_API_KEY:
        headers["Authorization"] = f"Bearer {AI_API_KEY}"

    payload = {
        "model": AI_MODEL,
        "messages": [
            {"role": "system", "content": f"You are a precise astronomical seeing forecaster. Always respond with valid JSON only. CRITICAL: All string values in your JSON response must be written in the ISO language code: '{lang}'."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 4000,
        "stream": False,
    }

    try:
        # Mark as processing in cache immediately and start thread to bypass NGINX/Cloudflare timeouts
        import threading, time
        cache_db = _load_ai_cache()
        cache_db[current_hash] = {"timestamp": int(time.time()), "data": {"status": "processing"}}
        _save_ai_cache(cache_db)
        
        t = threading.Thread(target=_background_ai_task, args=(payload, headers, current_hash, (weather, moon_illum, moon_alt, moon_dist)))
        t.start()
        
        return {"status": "processing"}
        
    except Exception as e:
        import logging
        logging.getLogger("stargazer").error(f"AI Seeing error: {e}")
        return None


def _rule_based_seeing_score(weather: dict, moon_illum: float, moon_alt: float, moon_distance_km: int = 384400) -> dict:
    """
    Improved deterministic fallback scorer on 1–10 scale.
    Used when Qwen is unreachable or times out.
    """
    cloud  = weather.get("cloud_total") or 50
    wind_s = weather.get("wind_surface") or 0
    wind_u = weather.get("wind_upper") or 0
    precip = weather.get("precip") or 0
    humid  = weather.get("humidity") or 50
    spread = weather.get("dew_spread")   # may be None
    cirrus = weather.get("cloud_high") or 0

    score = 10

    # Cloud cover — biggest factor
    if cloud > 80:   score -= 4
    elif cloud > 50: score -= 2
    elif cloud > 20: score -= 1

    # Jet stream / upper wind — seeing turbulence
    if wind_u > 80:   score -= 2
    elif wind_u > 50: score -= 1

    # Surface wind
    if wind_s > 40:   score -= 1

    # Rain risk
    if precip > 50:   score -= 1

    # Dew / fogging risk
    if spread is not None and spread < 2:  score -= 2
    elif spread is not None and spread < 4: score -= 1

    # Humidity
    if humid > 90:    score -= 1

    # High cirrus — kills transparency
    if cirrus > 50:   score -= 1

    # Moon interference (only counts when moon is above horizon)
    if moon_illum > 80 and moon_alt > 20: score -= 1

    score = max(1, min(10, score))

    labels = {
        10: "Perfect — rare, exceptional night",
        9:  "Excellent transparency",
        8:  "Very good conditions",
        7:  "Good — solid observing night",
        6:  "Decent — most targets reachable",
        5:  "Average — bright objects only",
        4:  "Below average — limiting",
        3:  "Poor — consider waiting",
        2:  "Very poor conditions",
        1:  "Bad — stay in",
    }

    warnings = []
    if spread is not None and spread < 4:
        warnings.append(f"Dew risk — spread only {spread:.1f}°C, bring dew heater")
    if wind_u > 50:
        warnings.append(f"Jet stream turbulence likely ({wind_u:.0f} km/h at altitude)")
    if cirrus > 30:
        warnings.append(f"High cirrus clouds ({cirrus:.0f}%) — affects transparency")
    if moon_illum > 60 and moon_alt > 10:
        warnings.append(f"Moon {moon_illum:.0f}% lit — DSO contrast reduced")
    if precip > 30:
        warnings.append(f"Rain chance {precip:.0f}% — watch the sky")

    # Rough best window suggestion
    if cloud < 30 and precip < 20:
        best_window = "All night"
    elif cloud < 60:
        best_window = "Early evening (8–11 PM)"
    else:
        best_window = "Check hourly cloud forecast"

    # Get phase name from illumination for fact lookup
    phase_pct = moon_illum / 100
    if moon_illum < 3:
        phase_name = "🌑 New Moon"
    elif moon_illum < 45:
        phase_name = "🌒 Waxing Crescent"
    elif moon_illum < 55:
        phase_name = "🌓 First Quarter"
    elif moon_illum < 95:
        phase_name = "🌔 Waxing Gibbous"
    elif moon_illum > 97:
        phase_name = "🌕 Full Moon"
    elif moon_illum > 55:
        phase_name = "🌖 Waning Gibbous"
    elif moon_illum > 45:
        phase_name = "🌗 Last Quarter"
    else:
        phase_name = "🌘 Waning Crescent"

    moon_fact = get_moon_fact(phase_name, moon_illum, moon_distance_km, today=date.today())

    return {
        "score": score,
        "label": labels[score],
        "explanation": "",   # rule-based doesn't generate prose
        "moon_fact": moon_fact,
        "best_window": best_window,
        "warnings": warnings,
        "recommended_targets": [],
        "ai_powered": False,
    }


def get_seeing_forecast(lat=None, lon=None, ai_enabled: bool = False, lang: str = "en") -> dict:
    """
    Fetch astronomical seeing forecast from Open-Meteo (expanded parameters)
    and conditionally analyse with Qwen3.5-9B AI.
    """
    import json as _json

    use_lat = lat if lat is not None else LATITUDE
    use_lon = lon if lon is not None else LONGITUDE

    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={use_lat}&longitude={use_lon}"
        # Surface
        f"&hourly=cloudcover,cloudcover_low,cloudcover_mid,cloudcover_high,"
        f"visibility,windspeed_10m,winddirection_10m,"
        f"precipitation_probability,temperature_2m,dewpoint_2m,"
        f"relativehumidity_2m,surface_pressure"
        # Upper atmosphere (jet stream proxy)
        f"&hourly=windspeed_500hPa"
        f"&daily=sunrise,sunset,precipitation_sum"
        f"&timezone=auto&forecast_days=7"
    )

    try:
        resp = requests.get(url, timeout=8)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        return {
            "seeing_score": None,
            "seeing_label": "Could not fetch weather",
            "seeing_explanation": "",
            "best_window": "Unknown",
            "warnings": [],
            "ai_powered": False,
            "go_nogo": "❓ UNKNOWN",
            "clearoutside_embed": f"https://clearoutside.com/forecast_embed/{use_lat}/{use_lon}",
            "error": str(e),
        }
        
    # ── Fetch 7Timer! Seeing Data ──
    seeing_arcsec = "N/A"
    try:
        url_7t = f"http://www.7timer.info/bin/astro.php?lon={use_lon}&lat={use_lat}&ac=0&unit=metric&output=json"
        resp_7t = requests.get(url_7t, timeout=5)
        resp_7t.raise_for_status()
        data_7t = resp_7t.json()
        s_val = data_7t["dataseries"][0]["seeing"]
        seeing_map = {1: "<0.5\"", 2: "0.5\"-0.75\"", 3: "0.75\"-1\"", 4: "1\"-1.5\"", 5: "1.5\"-2\"", 6: "2\"-2.5\"", 7: "2.5\"-3\"", 8: ">3\""}
        seeing_arcsec = seeing_map.get(s_val, "N/A")
    except Exception:
        pass

    hourly = data.get("hourly", {})
    daily  = data.get("daily",  {})

    # ── Average the overnight observing window (dynamic 8-hour block) ──
    current_hour = now_local(lat=lat, lon=lon).hour
    if current_hour < 12:
        # After midnight: observing right now
        tonight_start = current_hour
    elif current_hour < 20:
        # Daytime/afternoon: planning for tonight
        tonight_start = 20
    else:
        # Evening: observing right now
        tonight_start = current_hour
        
    tonight_end = tonight_start + 8
    
    start_h = tonight_start % 24
    end_h = tonight_end % 24
    start_str = f"{start_h % 12 or 12} {'AM' if start_h < 12 else 'PM'}"
    end_str = f"{end_h % 12 or 12} {'AM' if end_h < 12 else 'PM'}"
    window_label = f"averaged {start_str} – {end_str} local time"

    def avg(field, start=tonight_start, end=tonight_end):
        vals = [v for v in (hourly.get(field, []) or [])[start:end] if v is not None]
        return round(sum(vals) / len(vals), 1) if vals else None

    cloud_total = avg("cloudcover")
    cloud_low   = avg("cloudcover_low")
    cloud_mid   = avg("cloudcover_mid")
    cloud_high  = avg("cloudcover_high")
    wind_s      = avg("windspeed_10m")
    wind_u      = avg("windspeed_500hPa")
    precip      = avg("precipitation_probability")
    temp        = avg("temperature_2m")
    dewpoint    = avg("dewpoint_2m")
    humidity    = avg("relativehumidity_2m")
    pressure    = avg("surface_pressure")
    visibility  = avg("visibility")

    dew_spread = round(temp - dewpoint, 1) if (temp is not None and dewpoint is not None) else None
    visibility_km = round(visibility / 1000, 1) if visibility is not None else None

    weather_snapshot = {
        "cloud_total": cloud_total,
        "cloud_low":   cloud_low,
        "cloud_mid":   cloud_mid,
        "cloud_high":  cloud_high,
        "wind_surface": wind_s,
        "wind_upper":  wind_u,
        "precip":      precip,
        "humidity":    humidity,
        "dew_spread":  dew_spread,
        "pressure":    pressure,
        "visibility_km": visibility_km,
        "tonight_temp_c": temp,
    }

    # Moon context for AI/fallback scoring
    try:
        moon_now = get_moon_info(lat=lat, lon=lon)
        moon_illum = moon_now.get("illumination_pct", 50)
        moon_alt   = moon_now.get("altitude_deg", 0)
        moon_dist  = moon_now.get("distance_km", 384400)
    except Exception:
        moon_illum, moon_alt, moon_dist = 50, 0, 384400
        
    try:
        targets = get_visible_targets(constellation="All", lat=lat, lon=lon)
    except Exception:
        targets = []

    # ── AI analysis (Qwen3.5-9B) → fallback to rule-based ────────────────────
    if ai_enabled:
        try:
            analysis = _ai_seeing_analysis(weather_snapshot, moon_illum, moon_alt, targets, window_label, lat=use_lat, lon=use_lon, lang=lang, moon_dist=moon_dist)
            if analysis and analysis.get("status") == "processing":
                return {"status": "processing"}
        except Exception:
            analysis = None
    else:
        analysis = None

    if analysis is None:
        analysis = _rule_based_seeing_score(weather_snapshot, moon_illum, moon_alt, moon_dist)

    score = analysis["score"]

    # Map 1-10 AI score → 1-5 stars for legacy badge compatibility
    stars = max(1, round(score / 2))

    seeing_labels_5 = {
        5: "⭐⭐⭐⭐⭐ Exceptional",
        4: "⭐⭐⭐⭐ Good",
        3: "⭐⭐⭐ Average",
        2: "⭐⭐ Poor",
        1: "⭐ Bad — stay in",
    }

    go_nogo = "✅ GO" if score >= 6 else ("⚠️ MARGINAL" if score >= 4 else "❌ NO GO")

    # ── 7-day summary (unchanged logic, extended field) ───────────────────────
    week_summary = []
    for i in range(7):
        idx_s = i * 24 + tonight_start
        idx_e = idx_s + 8
        day_cloud  = avg("cloudcover", idx_s, idx_e)
        day_precip = avg("precipitation_probability", idx_s, idx_e)
        day_temp = avg("temperature_2m", idx_s, idx_e)
        _c = day_cloud if day_cloud is not None else 100
        label = "🟢 Clear" if _c < 30 else ("🟡 Partly Cloudy" if _c < 70 else "🔴 Cloudy")
        from datetime import date as _date
        day_date = (_date.today() + timedelta(days=i)).strftime("%a %b %d")
        week_summary.append({
            "date":        day_date,
            "cloud_pct":   day_cloud,
            "precip_prob": day_precip,
            "temp":        day_temp,
            "status":      label,
        })

    return {
        # Core score (1-10) and 5-star display
        "seeing_score":       stars,          # 1-5 for badge/stars UI
        "seeing_score_raw":   score,          # 1-10 for display/tooltip
        "seeing_label":       seeing_labels_5[stars],
        "seeing_label_ai":    analysis["label"],       # AI's own short label
        "seeing_explanation": analysis["explanation"], # prose for beginners
        "moon_fact":          analysis.get("moon_fact", ""), # fun fact
        "best_window":        analysis["best_window"],
        "warnings":           analysis["warnings"],
        "recommended_targets": analysis.get("recommended_targets", []),
        "ai_powered":         analysis["ai_powered"],
        # Weather snapshot (kept for frontend metrics)
        "tonight_cloud_pct":     cloud_total,
        "tonight_cloud_low_pct": cloud_low,
        "tonight_wind_kmh":      wind_s,
        "tonight_precip_prob":   precip,
        "tonight_humidity":      humidity,
        "tonight_dew_spread":    dew_spread,
        "tonight_visibility_km": visibility_km,
        "tonight_temp_c":        temp,
        # Go/No-Go
        "go_nogo":  go_nogo,
        "source":   "Blended (7Timer! + Open-Meteo)",
        "clearoutside_embed": f"https://clearoutside.com/forecast_embed/{use_lat}/{use_lon}",
        "week_forecast": week_summary,
        "seeing_arcsec": seeing_arcsec,
        "hourly_clouds": hourly.get("cloudcover", [])[:24],
    }
