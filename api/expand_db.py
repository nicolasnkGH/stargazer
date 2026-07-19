import json
import csv
import urllib.request
import os

IAU_88 = ["And", "Ant", "Aps", "Aqr", "Aql", "Ara", "Ari", "Aur", "Boo", "Cae", "Cam", "Cnc", "CVn", "CMa", "CMi", "Cap", "Car", "Cas", "Cen", "Cep", "Cet", "Cha", "Cir", "Col", "Com", "CrA", "CrB", "Crv", "Crt", "Cru", "Cyg", "Del", "Dor", "Dra", "Equ", "Eri", "For", "Gem", "Gru", "Her", "Hor", "Hya", "Hyi", "Ind", "Lac", "Leo", "LMi", "Lep", "Lib", "Lup", "Lyn", "Lyr", "Men", "Mic", "Mon", "Mus", "Nor", "Oct", "Oph", "Ori", "Pav", "Peg", "Per", "Phe", "Pic", "Psc", "PsA", "Pup", "Pyx", "Ret", "Sge", "Sgr", "Sco", "Scl", "Sct", "Ser", "Sex", "Tau", "Tel", "Tri", "TrA", "Tuc", "UMa", "UMi", "Vel", "Vir", "Vol", "Vul"]

def main():
    print("Downloading HYG database...")
    csv_url = "https://raw.githubusercontent.com/astronexus/HYG-Database/master/hygdata_v3.csv"
    csv_file = "hygdata_v3.csv"
    if not os.path.exists(csv_file):
        urllib.request.urlretrieve(csv_url, csv_file)
        
    with open("data/targets.json", "r") as f:
        targets = json.load(f)
        
    existing_con = set(t["constellation"] for t in targets)
    missing = [c for c in IAU_88 if c not in existing_con]
    print(f"Missing {len(missing)} constellations.")
    
    # Read HYG
    stars_by_con = {c: [] for c in IAU_88}
    with open(csv_file, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            con = row.get("con", "").strip()
            mag_str = row.get("mag", "").strip()
            if con in missing and mag_str:
                try:
                    mag = float(mag_str)
                    stars_by_con[con].append(row)
                except:
                    pass
                    
    new_targets = []
    for con in missing:
        stars = stars_by_con[con]
        stars.sort(key=lambda x: float(x["mag"]))
        top_stars = stars[:3] # get top 3 brightest
        for idx, s in enumerate(top_stars):
            # Parse
            ra = float(s["ra"]) # decimal hours
            dec = float(s["dec"]) # decimal degrees
            mag = float(s["mag"])
            
            rh = int(ra)
            rm_float = (ra - rh) * 60
            rm = int(rm_float)
            rs = (rm_float - rm) * 60
            
            sign = -1 if dec < 0 else 1
            abs_dec = abs(dec)
            dd = int(abs_dec)
            dm_float = (abs_dec - dd) * 60
            dm = int(dm_float)
            ds = (dm_float - dm) * 60
            dd = dd * sign
            
            proper = s.get("proper", "").strip()
            bayer = s.get("bayer", "").strip()
            flam = s.get("flam", "").strip()
            
            name = proper
            if not name and bayer:
                name = f"{bayer} {con}"
            if not name and flam:
                name = f"{flam} {con}"
            if not name:
                name = f"HIP {s['hip']}" if s.get('hip') else f"HD {s['hd']}"
                
            target = {
                "id": f"{con.lower()}_{name.lower().replace(' ', '_')}",
                "name": name,
                "type": "Star",
                "ra_h": rh,
                "ra_m": rm,
                "ra_s": round(rs, 1),
                "dec_d": dd,
                "dec_m": dm,
                "dec_s": round(ds, 1),
                "magnitude": round(mag, 2),
                "constellation": con,
                "difficulty": "naked_eye" if mag <= 6 else "binoculars",
                "emoji": "⭐",
                "description": f"One of the brightest stars in the constellation {con}."
            }
            new_targets.append(target)
            
    targets.extend(new_targets)
    with open("data/targets.json", "w") as f:
        json.dump(targets, f, indent=4)
        
    print(f"Added {len(new_targets)} new targets for {len(missing)} constellations.")

if __name__ == "__main__":
    main()
