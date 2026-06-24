from skyfield.api import load
from skyfield.api import load_constellation_map

ts = load.timescale()
t = ts.now()
eph = load('de421.bsp')
earth, mars = eph['earth'], eph['mars']
astrometric = earth.at(t).observe(mars)

constellation_at = load_constellation_map()
abbr = constellation_at(astrometric)
print("Mars is in:", abbr)
