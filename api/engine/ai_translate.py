"""Dynamic AI Translation module for StarGazer backend responses."""

import os
import json
import hashlib
import logging
from typing import Dict, List, Union, Optional
from urllib.parse import urlparse
import requests

from config import (
    AI_API_URL, AI_API_KEY, AI_MODEL,
    FALLBACK_AI_API_URL, FALLBACK_AI_API_KEY, FALLBACK_AI_MODEL,
    CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET, AI_TIMEOUT
)

logger = logging.getLogger("stargazer.translate")

CACHE_FILE = os.path.join(os.path.dirname(__file__), "translation_cache.json")

# Quick dictionary for common astronomical terms to avoid AI calls for static names
ASTRO_DICTIONARY = {
    "pt": {
        "Waxing Crescent": "Crescente Cóncava",
        "Waning Crescent": "Minguante Cóncava",
        "First Quarter": "Quarto Crescente",
        "Last Quarter": "Quarto Minguante",
        "Full Moon": "Lua Cheia",
        "New Moon": "Lua Nova",
        "Waxing Gibbous": "Crescente Convexa",
        "Waning Gibbous": "Minguante Convexa",
        "🌑 New Moon": "🌑 Lua Nova",
        "🌒 Waxing Crescent": "🌒 Crescente Cóncava",
        "🌓 First Quarter": "🌓 Quarto Crescente",
        "🌔 Waxing Gibbous": "🌔 Crescente Convexa",
        "🌕 Full Moon": "🌕 Lua Cheia",
        "🌖 Waning Gibbous": "🌖 Minguante Convexa",
        "🌗 Last Quarter": "🌗 Quarto Minguante",
        "🌘 Waning Crescent": "🌘 Minguante Cóncava",
        "Star": "Estrela",
        "Red Giant": "Gigante Vermelha",
        "Blue Giant": "Gigante Azul",
        "Blue Supergiant": "Supergigante Azul",
        "Red Supergiant": "Supergigante Vermelha",
        "Star — Red Supergiant": "Estrela — Supergigante Vermelha",
        "Double Star": "Estrela Dupla",
        "Binary Star": "Estrela Binária",
        "Globular Cluster": "Aglomerado Globular",
        "Open Cluster": "Aglomerado Aberto",
        "Spiral Galaxy": "Galáxia Espiral",
        "Elliptical Galaxy": "Galáxia Elíptica",
        "Planetary Nebula": "Nebulosa Planetária",
        "Emission Nebula": "Nebulosa de Emissão",
        "Reflection Nebula": "Nebulosa de Reflexão",
        "Dark Nebula": "Nebulosa Escura",
        "Supernova Remnant": "Remanescente de Supernova",
        "Good — some sky glow": "Bom — algum brilho no céu",
        "Excellent — dark skies for deep sky objects": "Excelente — céu escuro para objetos do céu profundo",
        "Moderate — noticeable moon interference": "Moderado — interferência lunar perceptível",
        "Poor — bright moonlight washes out DSOs": "Fraco — luz lunar forte reduz visibilidade de DSOs",
        "🟢 Excellent — dark skies for DSOs": "🟢 Excelente — céu escuro para DSOs",
        "🟡 Good — some sky glow": "🟡 Bom — algum brilho no céu",
        "🟠 Fair — brighter objects only": "🟠 Razoável — apenas objetos mais brilhantes",
        "🔴 Poor — planets & stars only": "🔴 Fraco — apenas planetas e estrelas",
        "All night": "A noite toda",
        "Early evening (8–11 PM)": "Início da noite (20h–23h)",
        "Check hourly cloud forecast": "Verifique a previsão de nuvens por hora",
        "look for its phases through a telescope!": "observe suas fases com um telescópio!",
        "spot the 4 Galilean moons!": "observe as 4 luas Galileanas!",
        "the rings are spectacular right now!": "os anéis estão espetaculares agora!",
        "look for the polar ice caps!": "observe as calotas polares de gelo!",
        "catch it quickly before it sets!": "observe-o rapidamente antes de se pôr!",
        "a tiny blue-green disc in binoculars!": "um pequeno disco azul-esverdeado com binóculos!",
        "a faint blue dot, needs a telescope!": "um ponto azul fraco, requer um telescópio!"
    },
    "es": {
        "Waxing Crescent": "Creciente Cóncava",
        "Waning Crescent": "Menguante Cóncava",
        "First Quarter": "Cuarto Creciente",
        "Last Quarter": "Cuarto Menguante",
        "Full Moon": "Luna Llena",
        "New Moon": "Luna Nueva",
        "Waxing Gibbous": "Creciente Convexa",
        "Waning Gibbous": "Menguante Convexa",
        "🌑 New Moon": "🌑 Luna Nueva",
        "🌒 Waxing Crescent": "🌒 Creciente Cóncava",
        "🌓 First Quarter": "🌓 Cuarto Creciente",
        "🌔 Waxing Gibbous": "🌔 Creciente Convexa",
        "🌕 Full Moon": "🌕 Luna Llena",
        "🌖 Waning Gibbous": "🌖 Menguante Convexa",
        "🌗 Last Quarter": "🌗 Cuarto Menguante",
        "🌘 Waning Crescent": "🌘 Menguante Cóncava",
        "Star": "Estrella",
        "Red Giant": "Gigante Roja",
        "Blue Giant": "Gigante Azul",
        "Blue Supergiant": "Supergigante Azul",
        "Red Supergiant": "Supergigante Roja",
        "Star — Red Supergiant": "Estrella — Supergigante Roja",
        "Double Star": "Estrella Doble",
        "Binary Star": "Estrella Binaria",
        "Globular Cluster": "Cúmulo Globular",
        "Open Cluster": "Cúmulo Abierto",
        "Spiral Galaxy": "Galaxia Espiral",
        "Elliptical Galaxy": "Galaxia Elíptica",
        "Planetary Nebula": "Nebulosa Planetaria",
        "Emission Nebula": "Nebulosa de Emisión",
        "Reflection Nebula": "Nebulosa de Reflexión",
        "Dark Nebula": "Nebulosa Oscura",
        "Supernova Remnant": "Remanente de Supernova",
        "Good — some sky glow": "Bueno — algo de resplandor en el cielo",
        "Excellent — dark skies for deep sky objects": "Excelente — cielos oscuros para objetos de cielo profundo",
        "Moderate — noticeable moon interference": "Moderado — interferencia lunar perceptible",
        "Poor — bright moonlight washes out DSOs": "Deficiente — luz lunar intensa opaca los DSOs",
        "🟢 Excellent — dark skies for DSOs": "🟢 Excelente — cielos oscuros para DSOs",
        "🟡 Good — some sky glow": "🟡 Bueno — algo de resplandor en el cielo",
        "🟠 Fair — brighter objects only": "🟠 Aceptable — solo objetos más brillantes",
        "🔴 Poor — planets & stars only": "🔴 Deficiente — solo planetas y estrellas",
        "All night": "Toda la noche",
        "Early evening (8–11 PM)": "Primera hora de la noche (20:00–23:00)",
        "Check hourly cloud forecast": "Consulte el pronóstico de nubes por hora",
        "look for its phases through a telescope!": "¡observa sus fases a través de un telescopio!",
        "spot the 4 Galilean moons!": "¡observa las 4 lunas Galileanas!",
        "the rings are spectacular right now!": "¡los anillos están espectaculares ahora!",
        "look for the polar ice caps!": "¡observa los casquetes polares de hielo!",
        "catch it quickly before it sets!": "¡obsérvalo rápidamente antes de que se ponga!",
        "a tiny blue-green disc in binoculars!": "¡un pequeño disco azul verdoso en prismáticos!",
        "a faint blue dot, needs a telescope!": "¡un tenue punto azul, requiere telescópio!"
    }
}


def _load_cache() -> Dict[str, str]:
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _save_cache(cache: Dict[str, str]):
    try:
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"Failed to save translation cache: {e}")


_translation_cache = _load_cache()


def _call_ai(payload: dict, timeout: int = 15) -> Optional[str]:
    """Call primary AI API or fallback AI API to get text response."""
    auth_header = AI_API_KEY if AI_API_KEY else None
    fallback_auth = FALLBACK_AI_API_KEY if FALLBACK_AI_API_KEY else auth_header
    
    # 1. Try Primary API
    if AI_API_URL and AI_MODEL:
        try:
            headers = {"Content-Type": "application/json"}
            if auth_header:
                headers["Authorization"] = f"Bearer {auth_header}"
            parsed = urlparse(AI_API_URL)
            host = (parsed.hostname or "").lower()
            if host == "nick-t.net" or host.endswith(".nick-t.net"):
                if CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET:
                    headers["CF-Access-Client-Id"] = CF_ACCESS_CLIENT_ID
                    headers["CF-Access-Client-Secret"] = CF_ACCESS_CLIENT_SECRET
            
            p = payload.copy()
            p["model"] = AI_MODEL
            p["stream"] = False
            resp = requests.post(AI_API_URL, json=p, headers=headers, timeout=timeout)
            resp.raise_for_status()
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            if content:
                return content
        except Exception as e:
            logger.warning(f"Primary AI call for translation failed: {e}")
            
    # 2. Try Fallback API (e.g. Gemini)
    if FALLBACK_AI_API_URL and FALLBACK_AI_MODEL:
        try:
            headers = {"Content-Type": "application/json"}
            if fallback_auth:
                headers["Authorization"] = f"Bearer {fallback_auth}"
            p = payload.copy()
            p["model"] = FALLBACK_AI_MODEL
            p["stream"] = False
            resp = requests.post(FALLBACK_AI_API_URL, json=p, headers=headers, timeout=timeout)
            resp.raise_for_status()
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            if content:
                return content
        except Exception as e:
            logger.warning(f"Fallback AI call for translation failed: {e}")
            
    return None


def translate_texts(texts: List[str], target_lang: str = "en") -> List[str]:
    """
    Translate a list of English texts into target_lang ('pt', 'es', etc.) using AI.
    Returns translated list of strings in the exact same order.
    Uses dictionary lookup & persistent cache to avoid unnecessary API calls.
    """
    if not target_lang or target_lang.lower() == "en" or not texts:
        return texts

    lang_code = target_lang.lower()
    dict_for_lang = ASTRO_DICTIONARY.get(lang_code, {})

    lang_names = {
        "pt": "Portuguese (Português)",
        "es": "Spanish (Español)",
        "fr": "French (Français)",
        "de": "German (Deutsch)",
        "it": "Italian (Italiano)"
    }
    lang_full = lang_names.get(lang_code, target_lang)

    results = [None] * len(texts)
    missing_indices = []
    missing_texts = []

    for i, t in enumerate(texts):
        if not t or not isinstance(t, str) or not t.strip():
            results[i] = t
            continue

        clean_t = t.strip()
        # 1. Dictionary lookup
        if clean_t in dict_for_lang:
            results[i] = dict_for_lang[clean_t]
            continue

        # 2. Disk Cache lookup
        key = hashlib.md5(f"{lang_code}:{clean_t}".encode("utf-8"), usedforsecurity=False).hexdigest()
        if key in _translation_cache:
            results[i] = _translation_cache[key]
        else:
            missing_indices.append(i)
            missing_texts.append(clean_t)

    if not missing_texts:
        return results

    # Batch translate missing texts via AI API
    prompt = f"""You are a professional astronomical translator. Translate the following array of English texts into {lang_full}.
Maintain astronomical accuracy, natural phrasing, numbers, units, and formatting (e.g. °C, km/h, Mag, RA, Dec).
Return ONLY a valid JSON array of strings containing the translations in the exact same order. No markdown code blocks, no text outside the JSON array.

Texts to translate:
{json.dumps(missing_texts, ensure_ascii=False)}
"""

    payload = {
        "messages": [
            {"role": "system", "content": f"You are a translator outputting valid JSON array of strings translated to {lang_full}."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1
    }

    ai_raw = _call_ai(payload, timeout=12)
    parsed_translations = None
    if ai_raw:
        try:
            raw_str = ai_raw.strip()
            if "```json" in raw_str:
                raw_str = raw_str.split("```json")[-1].split("```")[0].strip()
            elif "```" in raw_str:
                raw_str = raw_str.split("```")[1].strip()

            start = raw_str.find("[")
            end = raw_str.rfind("]") + 1
            if start != -1 and end != -1:
                parsed_translations = json.loads(raw_str[start:end])
        except Exception as e:
            logger.warning(f"Failed to parse AI translation JSON: {e}")

    if isinstance(parsed_translations, list) and len(parsed_translations) == len(missing_texts):
        cache_updated = False
        for idx, trans in zip(missing_indices, parsed_translations):
            if isinstance(trans, str) and trans.strip():
                clean_trans = trans.strip()
                results[idx] = clean_trans
                orig = missing_texts[missing_indices.index(idx)]
                key = hashlib.md5(f"{lang_code}:{orig}".encode("utf-8"), usedforsecurity=False).hexdigest()
                _translation_cache[key] = clean_trans
                cache_updated = True
            else:
                results[idx] = texts[idx]
        if cache_updated:
            _save_cache(_translation_cache)
    else:
        # Fallback: if AI failed, return original missing texts
        for idx in missing_indices:
            if results[idx] is None:
                results[idx] = texts[idx]

    return results


def translate_text(text: str, target_lang: str = "en") -> str:
    """Translate a single string."""
    if not text or target_lang.lower() == "en":
        return text
    return translate_texts([text], target_lang)[0]


# ── High-Level Entity Translators ──────────────────────────────────────────────

def translate_seeing(seeing: dict, lang: str = "en") -> dict:
    if not seeing or lang.lower() == "en":
        return seeing

    s = dict(seeing)
    fields = [
        s.get("seeing_explanation", ""),
        s.get("label", ""),
        s.get("best_window", ""),
        s.get("moon_fact", ""),
        s.get("fallback_message", ""),
    ]
    warnings = s.get("warnings") or []
    if isinstance(warnings, list):
        fields.extend(warnings)

    translated = translate_texts(fields, lang)
    s["seeing_explanation"] = translated[0]
    s["label"] = translated[1]
    s["best_window"] = translated[2]
    s["moon_fact"] = translated[3]
    s["fallback_message"] = translated[4]

    if isinstance(warnings, list) and len(warnings) > 0:
        s["warnings"] = translated[5:5 + len(warnings)]

    return s


def translate_moon(moon: dict, lang: str = "en") -> dict:
    if not moon or lang.lower() == "en":
        return moon

    m = dict(moon)
    phase_name = m.get("phase_name", "")
    dso_impact = m.get("dso_impact", "")
    fact = m.get("fact", "")

    translated = translate_texts([phase_name, dso_impact, fact], lang)
    m["phase_name"] = translated[0]
    m["dso_impact"] = translated[1]
    if fact:
        m["fact"] = translated[2]

    return m


def translate_planets(planets: list, lang: str = "en") -> list:
    if not planets or lang.lower() == "en":
        return planets

    texts_to_trans = []
    for p in planets:
        texts_to_trans.append(p.get("how_to_find", ""))
        texts_to_trans.append(p.get("obs_tip", ""))

    translated = translate_texts(texts_to_trans, lang)

    res = []
    for i, p in enumerate(planets):
        p_copy = dict(p)
        p_copy["how_to_find"] = translated[i * 2]
        if "obs_tip" in p_copy:
            p_copy["obs_tip"] = translated[i * 2 + 1]
        res.append(p_copy)

    return res


def translate_targets(targets: list, lang: str = "en") -> list:
    if not targets or lang.lower() == "en":
        return targets

    texts_to_trans = []
    for t in targets:
        texts_to_trans.append(t.get("type", ""))
        texts_to_trans.append(t.get("description", ""))
        texts_to_trans.append(t.get("how_to_find", ""))
        texts_to_trans.append(t.get("eyepiece_rec", ""))

    translated = translate_texts(texts_to_trans, lang)

    res = []
    for i, t in enumerate(targets):
        t_copy = dict(t)
        t_copy["type"] = translated[i * 4]
        t_copy["description"] = translated[i * 4 + 1]
        t_copy["how_to_find"] = translated[i * 4 + 2]
        t_copy["eyepiece_rec"] = translated[i * 4 + 3]
        res.append(t_copy)

    return res


def translate_apod(apod: dict, lang: str = "en") -> dict:
    if not apod or lang.lower() == "en":
        return apod

    a = dict(apod)
    title = a.get("title", "")
    explanation = a.get("explanation", "")

    translated = translate_texts([title, explanation], lang)
    a["title"] = translated[0]
    a["explanation"] = translated[1]

    return a


def translate_bortle(bortle: dict, lang: str = "en") -> dict:
    if not bortle or lang.lower() == "en":
        return bortle

    b = dict(bortle)
    name = b.get("name", "")
    description = b.get("description", "")

    translated = translate_texts([name, description], lang)
    b["name"] = translated[0]
    b["description"] = translated[1]

    return b


def translate_tonight_report(report: dict, lang: str = "en") -> dict:
    if not report or lang.lower() == "en":
        return report

    rep = dict(report)

    if "seeing" in rep and isinstance(rep["seeing"], dict):
        rep["seeing"] = translate_seeing(rep["seeing"], lang)

    if "moon" in rep and isinstance(rep["moon"], dict):
        rep["moon"] = translate_moon(rep["moon"], lang)

    if "planets" in rep and isinstance(rep["planets"], list):
        rep["planets"] = translate_planets(rep["planets"], lang)

    if "visible_planets" in rep and isinstance(rep["visible_planets"], list):
        rep["visible_planets"] = translate_planets(rep["visible_planets"], lang)

    if "best_targets_tonight" in rep and isinstance(rep["best_targets_tonight"], list):
        rep["best_targets_tonight"] = translate_targets(rep["best_targets_tonight"], lang)

    if "must_see" in rep and isinstance(rep["must_see"], list):
        subtitles = [m.get("subtitle", "") for m in rep["must_see"]]
        trans_subs = translate_texts(subtitles, lang)
        new_must_see = []
        for m, ts in zip(rep["must_see"], trans_subs):
            m_copy = dict(m)
            m_copy["subtitle"] = ts
            new_must_see.append(m_copy)
        rep["must_see"] = new_must_see

    if "planet_fact" in rep and isinstance(rep["planet_fact"], str):
        rep["planet_fact"] = translate_text(rep["planet_fact"], lang)

    return rep
