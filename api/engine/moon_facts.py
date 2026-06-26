"""Curated moon facts based on phase, illumination, distance, and date.

Facts are date-aware and distance-specific, so they reflect what is actually
happening with the moon on the user's observing night — not generic trivia.
"""

from __future__ import annotations

import random
from datetime import date

# Distance thresholds (km) — perigee < 369 000, apogee > 404 000
_SUPERMOON_KM = 369000
_MICROMOON_KM = 404000
_AVERAGE_KM = 384400

# How far from perigee/apogee counts as "approaching" or "near"
_NEAR_THRESHOLD = 10000  # ±10 000 km from extreme


def _phase_group(illumination: float, phase_name: str = "") -> str:
    """Map illumination + phase name to a phase group.

    The phase name disambiguates waxing vs waning halves, since the same
    illumination (e.g. 40%) can be Waxing Crescent or Waning Gibbous.
    """
    # Phase name takes priority for disambiguation
    if "New Moon" in phase_name:
        return "new"
    if "First Quarter" in phase_name or "Last Quarter" in phase_name:
        return "quarter"
    if "Full Moon" in phase_name:
        return "full"
    if "Waxing" in phase_name:
        if illumination < 25:
            return "waxing_crescent"
        return "waxing_gibbous"
    if "Waning" in phase_name:
        if illumination < 25:
            return "waning_crescent"
        return "waning_gibbous"
    # Fallback to illumination-only heuristic
    if illumination < 3:
        return "new"
    elif illumination < 25:
        return "crescent"
    elif illumination < 50:
        return "waxing"
    elif illumination < 55:
        return "quarter"
    elif illumination < 75:
        return "gibbous"
    elif illumination < 97:
        return "waning"
    else:
        return "full"


def _format_distance(km: int) -> str:
    """Return a human-readable distance string with context."""
    if km < _AVERAGE_KM:
        diff = _AVERAGE_KM - km
        return f"{km:,} km ({diff:,} km closer than average)"
    elif km > _AVERAGE_KM:
        diff = km - _AVERAGE_KM
        return f"{km:,} km ({diff:,} km farther than average)"
    return f"{km:,} km"


def _illumination_description(illumination: float, waxing: bool = True) -> str:
    """Return a natural-language description of the illumination percentage."""
    direction = "and growing" if waxing else "and shrinking"
    if illumination < 3:
        return "virtually unlit"
    elif illumination < 10:
        return f"just {illumination:.0f}% lit"
    elif illumination < 50:
        return f"{illumination:.0f}% lit {direction}"
    elif illumination < 55:
        return f"half-lit at {illumination:.0f}%"
    elif illumination < 95:
        return f"{illumination:.0f}% lit {direction}"
    elif illumination < 97:
        return f"nearly full at {illumination:.0f}%"
    else:
        return f"fully illuminated at {illumination:.0f}%"


def _distance_context(distance_km: int) -> str:
    """Return a short phrase describing the moon's orbital position."""
    if distance_km < _SUPERMOON_KM:
        return "at perigee (its closest point to Earth)"
    elif distance_km > _MICROMOON_KM:
        return "at apogee (its farthest point from Earth)"
    elif distance_km < _AVERAGE_KM - _NEAR_THRESHOLD:
        return "approaching perigee this week"
    elif distance_km < _AVERAGE_KM:
        return "slightly closer than average"
    elif distance_km > _AVERAGE_KM + _NEAR_THRESHOLD:
        return "approaching apogee this week"
    elif distance_km > _AVERAGE_KM:
        return "slightly farther than average"
    return "near the middle of its orbit"


# ── Phase-based curated facts ────────────────────────────────────────────────

_FACTS: dict[str, list[str]] = {
    "new": [
        "The moon is {distance_text} tonight — with {illum} illumination, the sky is at its darkest for deep-sky observing.",
        "A new moon ({distance_text}) means no moonlight pollution — the Milky Way will be spectacular tonight.",
        "The moon is up during the day and sets by early evening, leaving the night sky completely dark.",
        "This is the moon's 'rest day' — it's between two lunar cycles, and astronomers use this time for faint galaxies and nebulae.",
        "With only {illum} illumination, tonight offers the darkest skies of the month — perfect for spotting the Andromeda Galaxy.",
        "Ancient cultures marked the start of their months with the new moon, when the sky was darkest and stars shone brightest.",
        "The moon is {distance_text} — its darkness is a gift to astronomers hunting for faint deep-sky objects.",
    ],
    "crescent": [
        "A sliver of moon ({illum}) sets shortly after sunset, giving you about an hour of near-dark skies before twilight fades.",
        "The moon is less than a quarter lit, so most of the night will have excellent dark-sky conditions for DSOs.",
        "This waxing crescent is one of the easiest phases to spot — just look west after sunset for a thin silver arc.",
        "The faint glow on the rest of the moon (earthshine) may be visible to the naked eye on a clear night — look for the ghostly outline of the full disk.",
        "Early evening is prime time tonight — the moon sets early, leaving the rest of the night beautifully dark.",
        "At this slim crescent phase, the moon is a great beginner target through binoculars — you can see the terminator line where craters cast long shadows.",
        "The crescent moon rises in the late afternoon and sets before midnight, giving you most of the night for stargazing.",
    ],
    "waxing_crescent": [
        "A sliver of waxing crescent ({illum}) sets shortly after sunset, giving you about an hour of near-dark skies before twilight fades.",
        "The moon is less than a quarter lit, so most of the night will have excellent dark-sky conditions for DSOs.",
        "This waxing crescent is one of the easiest phases to spot — just look west after sunset for a thin silver arc.",
        "The faint glow on the rest of the moon (earthshine) may be visible to the naked eye on a clear night — look for the ghostly outline of the full disk.",
        "Early evening is prime time tonight — the moon sets early, leaving the rest of the night beautifully dark.",
        "At this slim crescent phase, the moon is a great beginner target through binoculars — you can see the terminator line where craters cast long shadows.",
        "The waxing crescent rises in the late afternoon and sets before midnight, giving you most of the night for stargazing.",
    ],
    "waning_crescent": [
        "A sliver of waning crescent ({illum}) rises shortly before sunrise, giving you dark skies until dawn approaches.",
        "The moon is less than a quarter lit, so most of the night will have excellent dark-sky conditions for DSOs.",
        "This waning crescent is one of the easiest phases to spot — just look east before sunrise for a thin silver arc.",
        "The faint glow on the rest of the moon (earthshine) may be visible to the naked eye on a clear night — look for the ghostly outline of the full disk.",
        "Pre-dawn is prime time tonight — the moon rises in the east just before dawn, leaving the rest of the night beautifully dark.",
        "At this slim crescent phase, the moon is a great beginner target through binoculars — you can see the terminator line where craters cast long shadows.",
        "The waning crescent rises in the pre-dawn hours and sets by mid-afternoon, giving you the entire night for stargazing.",
    ],
    "waxing": [
        "The moon is growing each night ({illum}) and will be up for most of the evening, but the first half of the night remains dark.",
        f"A third or more of the moon is lit — expect some sky glow, but deep-sky objects are still visible in the early hours.",
        "This waxing moon is a great target for binoculars — you can see craters along the terminator (day/night boundary).",
        "The moon rises later each night, so the late evening and early morning hours offer increasingly dark skies.",
        "At this stage, the moon won't interfere too much with observing — plan your DSO session for after midnight.",
        "The waxing moon is a photographer's dream tonight, but astronomers should wait until it sets for the best views of faint objects.",
        "Each night the moon stays up later — by the time it reaches full, it will be visible all night long.",
    ],
    "quarter": [
        "Exactly half the moon is lit ({illum}) — astronomers love this phase for observing craters and mountains along the terminator line.",
        "The first or last quarter moon rises around noon or midnight, giving you a perfectly dark sky for most of the night.",
        "The sharp shadow line (terminator) on the moon reveals dramatic mountain shadows — a great telescopic target tonight.",
        "Quarter moons are the best phase for detailed lunar observation — features along the terminator appear at their most dramatic due to elongated shadows.",
        "This half-lit moon sets around midnight, leaving the second half of the night completely dark for deep-sky work.",
        "Galileo first observed the moon's mountains by studying the terminator during quarter phases — try it yourself tonight with even a small telescope.",
        "The terminator is a landscape of extremes — mountains here cast shadows over 3 km long, revealing relief that full moon light washes out.",
    ],
    "gibbous": [
        "More than three-quarters of the moon is lit ({illum}), so the early evening will be bright — save deep-sky observing for after midnight.",
        "The bright moon dominates the sky tonight, making it a great time for lunar detail but challenging for faint objects.",
        "A gibbous moon sets in the early morning hours, so the pre-dawn sky offers the best dark-sky window tonight.",
        "The moon's brightness washes out many deep-sky objects, but planets and double stars remain excellent targets tonight.",
        "This near-full moon is perfect for studying surface features through a telescope — craters and maria are clearly visible across most of the disk.",
        "The moon will outshine most deep-sky objects tonight, but its beauty more than makes up for the lost darkness.",
        "With {illum} illumination, the moon is bright enough to reveal subtle color variations in the lunar maria — look for the darker patches through a telescope.",
    ],
    "waxing_gibbous": [
        "More than three-quarters of the moon is lit ({illum}) and growing — the early evening will be bright, but deep-sky observing is still possible after midnight.",
        "The bright moon dominates the sky tonight, making it a great time for lunar detail but challenging for faint objects.",
        "A waxing gibbous moon sets in the early morning hours, so the pre-dawn sky offers the best dark-sky window tonight.",
        "The moon's brightness washes out many deep-sky objects, but planets and double stars remain excellent targets tonight.",
        "This near-full moon is perfect for studying surface features through a telescope — craters and maria are clearly visible across most of the disk.",
        "The moon will outshine most deep-sky objects tonight, but its beauty more than makes up for the lost darkness.",
        "With {illum} illumination, the moon is bright enough to reveal subtle color variations in the lunar maria — look for the darker patches through a telescope.",
    ],
    "waning_gibbous": [
        "More than three-quarters of the moon is lit ({illum}) and shrinking — the early evening will be bright, but deep-sky observing improves each night.",
        "The bright moon dominates the sky tonight, making it a great time for lunar detail but challenging for faint objects.",
        "A waning gibbous moon rises in the late evening and sets in the late morning, so the early evening offers the best dark-sky window.",
        "The moon's brightness washes out many deep-sky objects, but planets and double stars remain excellent targets tonight.",
        "This near-full moon is perfect for studying surface features through a telescope — craters and maria are clearly visible across most of the disk.",
        "The moon will outshine most deep-sky objects tonight, but its decreasing illumination means conditions improve each night.",
        "With {illum} illumination, the moon is bright enough to reveal subtle color variations in the lunar maria — look for the darker patches through a telescope.",
    ],
    "waning": [
        "The waning moon rises late, giving you several hours of dark skies before it brightens the eastern horizon.",
        "After midnight, the moon will start to interfere, so plan your best observations for the early evening hours.",
        "The moon is shrinking each night — each dawn it will be slightly less bright, giving you more dark-sky time.",
        "Late evening is your golden window tonight — the moon hasn't risen yet, offering pristine dark skies.",
        "A waning moon means improving conditions each night — tomorrow will be even better for deep-sky observing.",
        "The moon's decreasing illumination is a gift to astronomers — the nights ahead will grow progressively darker.",
        "The moon rises about 50 minutes later each day — enjoy the dark skies while they last.",
    ],
    "full": [
        "The full moon is the brightest object in the night sky — about 400,000 times brighter than the faintest visible star.",
        "Tonight's full moon outshines all 6,000 naked-eye stars combined — a spectacular sight, if not ideal for galaxies.",
        "The full moon reveals every crater and mare in stunning detail through any telescope — a night for lunar observation.",
        "Ancient cultures held full moon festivals worldwide — tonight, you can appreciate why the moon has captivated humanity for millennia.",
        "A full moon night is perfect for planetary observation — the bright sky makes planets stand out even more against the dark backdrop.",
        "The full moon illuminates the landscape like daylight — you could easily read a book outside on a clear night.",
        "While the full moon washes out the Milky Way, it's the best time to study the moon's surface through a telescope.",
        "The full moon reflects about 12% of the sunlight that hits it — that's surprisingly dim for something so bright!",
        "At {distance_text}, tonight's full moon appears {size_desc} in the sky.",
    ],
}

# ── Special event facts (distance-based) ─────────────────────────────────────

def _supermoon_fact(distance_km: int, today: date) -> str:
    """Generate a specific supermoon fact with actual distance and date."""
    diff_from_avg = _AVERAGE_KM - distance_km
    brightness_boost = min(30, round(diff_from_avg / _AVERAGE_KM * 100 * 3))
    size_boost = min(14, round(diff_from_avg / _AVERAGE_KM * 100 * 1.5))
    templates = [
        f"Supermoon on {today.strftime('%B %d')}! The moon is at perigee, just "
        f"{distance_km:,} km from Earth ({diff_from_avg:,} km closer than average) — "
        f"making it appear up to {size_boost}% larger and {brightness_boost}% brighter "
        f"than when it's at its farthest.",
        f"Tonight's supermoon ({today.strftime('%B %d')}) is at perigee — the moon is "
        f"just {distance_km:,} km away, {diff_from_avg:,} km closer than average. "
        f"Look how much bigger it appears near the horizon!",
        f"The moon is at its closest point to Earth today ({distance_km:,} km) — a "
        f"supermoon that makes it appear {size_boost}% larger and {brightness_boost}% "
        f"brighter than at apogee.",
    ]
    return random.choice(templates)


def _micromoon_fact(distance_km: int, today: date) -> str:
    """Generate a specific micromoon fact with actual distance and date."""
    diff_from_avg = distance_km - _AVERAGE_KM
    size_reduction = min(14, round(diff_from_avg / _AVERAGE_KM * 100 * 1.5))
    templates = [
        f"Micromoon on {today.strftime('%B %d')}! The moon is at apogee, over "
        f"{distance_km:,} km from Earth ({diff_from_avg:,} km farther than average) — "
        f"making it appear up to {size_reduction}% smaller than at its closest.",
        f"Tonight's micromoon ({today.strftime('%B %d')}) is at apogee — the moon is "
        f"{distance_km:,} km away, {diff_from_avg:,} km farther than average. "
        f"It's the smallest the moon will appear until its next perigee.",
        f"The moon is at its most distant point from Earth today ({distance_km:,} km) — "
        f"a micromoon that makes it appear {size_reduction}% smaller than at perigee.",
    ]
    return random.choice(templates)


# ── Public API ───────────────────────────────────────────────────────────────

def _is_waxing(phase_name: str) -> bool:
    """Determine if the moon is waxing from its emoji-prefixed phase name."""
    return "Waxing" in phase_name or "First Quarter" in phase_name


def get_moon_fact(
    phase_name: str,
    illumination: float,
    distance_km: int,
    today: date | None = None,
) -> str:
    """Return a curated moon fact based on phase, illumination, distance, and date.

    The fact is specific to the actual observing conditions — it includes the
    real distance, the date, and contextual descriptions rather than generic
    trivia.
    """
    if today is None:
        today = date.today()

    waxing = _is_waxing(phase_name)
    illum_desc = _illumination_description(illumination, waxing)
    dist_text = _format_distance(distance_km)

    # Special event overrides with specific data
    if distance_km < _SUPERMOON_KM:
        return _supermoon_fact(distance_km, today)
    if distance_km > _MICROMOON_KM:
        return _micromoon_fact(distance_km, today)

    # Phase-based facts with interpolation
    group = _phase_group(illumination, phase_name)
    facts = _FACTS.get(group, _FACTS["crescent"])
    template = random.choice(facts)

    # Fill in {illum}, {distance_text}, {size_desc} placeholders
    result = template.format(
        illum=illum_desc,
        distance_text=dist_text,
        size_desc="slightly smaller" if distance_km > _AVERAGE_KM else "slightly larger",
    )
    return result
