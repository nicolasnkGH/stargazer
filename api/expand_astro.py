import json
from astroquery.simbad import Simbad
import time

Simbad.add_votable_fields('V')

IAU_88 = ["Ant", "Aps", "Aql", "Ara", "Cae", "Car", "Cep", "Cet", "Cha", "Cir", "Com", "CrA", "CrB", "Crv", "Crt", "Del", "Dor", "Dra", "Equ", "Eri", "For", "Gru", "Hor", "Hya", "Hyi", "Ind", "Lac", "Lup", "Men", "Mic", "Mus", "Nor", "Oct", "Oph", "Pav", "Peg", "Phe", "Pic", "PsA", "Pyx", "Ret", "Sge", "Scl", "Sex", "Tel", "TrA", "Tuc", "Vel", "Vol"]

with open("data/targets.json", "r") as f:
    targets = json.load(f)

new_targets = []
for c in IAU_88:
    print(f"Fetching {c}...")
    for bayer in ['alp', 'bet']:
        try:
            res = Simbad.query_object(f"* {bayer} {c}")
            if res is not None and len(res) > 0:
                ra_deg = float(res['ra'][0])
                dec_deg = float(res['dec'][0])
                
                try:
                    mag = float(res['V'][0])
                except:
                    mag = 3.0
                
                ra_hours = ra_deg / 15.0
                rh = int(ra_hours)
                rm_float = (ra_hours - rh) * 60
                rm = int(rm_float)
                rs = (rm_float - rm) * 60
                
                sign = -1 if dec_deg < 0 else 1
                abs_dec = abs(dec_deg)
                dd = int(abs_dec)
                dm_float = (abs_dec - dd) * 60
                dm = int(dm_float)
                ds = (dm_float - dm) * 60
                dd = dd * sign
                
                name = f"{bayer.capitalize()} {c}"
                
                target = {
                    "id": f"{c.lower()}_{name.lower().replace(' ', '_')}",
                    "name": name,
                    "type": "Star",
                    "ra_h": rh,
                    "ra_m": rm,
                    "ra_s": round(rs, 1),
                    "dec_d": dd,
                    "dec_m": dm,
                    "dec_s": round(ds, 1),
                    "magnitude": round(mag, 2),
                    "constellation": c,
                    "difficulty": "naked_eye" if mag <= 6 else "binoculars",
                    "emoji": "⭐",
                    "description": f"One of the brightest stars in {c}."
                }
                new_targets.append(target)
            time.sleep(0.3)
        except Exception as e:
            print(f"Error {c} {bayer}: {e}")

targets.extend(new_targets)
with open("data/targets.json", "w") as f:
    json.dump(targets, f, indent=4)
print(f"Added {len(new_targets)} targets.")
