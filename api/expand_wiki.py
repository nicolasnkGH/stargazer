import json
import pandas as pd
import time
import requests
from bs4 import BeautifulSoup
import re
import warnings
warnings.filterwarnings('ignore')

IAU_88 = {
    "And": "Andromeda", "Ant": "Antlia", "Aps": "Apus", "Aqr": "Aquarius", "Aql": "Aquila", "Ara": "Ara",
    "Ari": "Aries", "Aur": "Auriga", "Boo": "Boötes", "Cae": "Caelum", "Cam": "Camelopardalis", "Cnc": "Cancer",
    "CVn": "Canes_Venatici", "CMa": "Canis_Major", "CMi": "Canis_Minor", "Cap": "Capricornus", "Car": "Carina",
    "Cas": "Cassiopeia", "Cen": "Centaurus", "Cep": "Cepheus", "Cet": "Cetus", "Cha": "Chamaeleon",
    "Cir": "Circinus", "Col": "Columba", "Com": "Coma_Berenices", "CrA": "Corona_Australis",
    "CrB": "Corona_Borealis", "Crv": "Corvus", "Crt": "Crater", "Cru": "Crux", "Cyg": "Cygnus",
    "Del": "Delphinus", "Dor": "Dorado", "Dra": "Draco", "Equ": "Equuleus", "Eri": "Eridanus",
    "For": "Fornax", "Gem": "Gemini", "Gru": "Grus", "Her": "Hercules", "Hor": "Horologium",
    "Hya": "Hydra", "Hyi": "Hydrus", "Ind": "Indus", "Lac": "Lacerta", "Leo": "Leo",
    "LMi": "Leo_Minor", "Lep": "Lepus", "Lib": "Libra", "Lup": "Lupus", "Lyn": "Lynx",
    "Lyr": "Lyra", "Men": "Mensa", "Mic": "Microscopium", "Mon": "Monoceros", "Mus": "Musca",
    "Nor": "Norma", "Oct": "Octans", "Oph": "Ophiuchus", "Ori": "Orion", "Pav": "Pavo",
    "Peg": "Pegasus", "Per": "Perseus", "Phe": "Phoenix", "Pic": "Pictor", "Psc": "Pisces",
    "PsA": "Piscis_Austrinus", "Pup": "Puppis", "Pyx": "Pyxis", "Ret": "Reticulum", "Sge": "Sagitta",
    "Sgr": "Sagittarius", "Sco": "Scorpius", "Scl": "Sculptor", "Sct": "Scutum", "Ser": "Serpens",
    "Sex": "Sextans", "Tau": "Taurus", "Tel": "Telescopium", "Tri": "Triangulum", "TrA": "Triangulum_Australe",
    "Tuc": "Tucana", "UMa": "Ursa_Major", "UMi": "Ursa_Minor", "Vel": "Vela", "Vir": "Virgo",
    "Vol": "Volans", "Vul": "Vulpecula"
}

def parse_ra(ra_str):
    if not isinstance(ra_str, str): return 0, 0, 0
    m = re.search(r'(\d+)[hʰ\s]\s*(\d+)[mᵐ\s]\s*([\d\.]+)[sˢ]?', ra_str)
    if m:
        return int(m.group(1)), int(m.group(2)), float(m.group(3))
    return 0, 0, 0

def parse_dec(dec_str):
    if not isinstance(dec_str, str): return 0, 0, 0
    m = re.search(r'([+\-−]?\d+)[°\s]\s*(\d+)[′\'\s]\s*([\d\.]+)[″\"]?', dec_str)
    if m:
        d = m.group(1).replace('−', '-')
        return int(d), int(m.group(2)), float(m.group(3))
    return 0, 0, 0

def get_missing_constellations():
    with open("data/targets.json", "r") as f:
        targets = json.load(f)
    existing = set(t["constellation"] for t in targets)
    missing = [c for c in IAU_88.keys() if c not in existing]
    return missing, targets

def fetch_wiki_targets(abbr):
    name = IAU_88[abbr]
    url = f"https://en.wikipedia.org/wiki/List_of_stars_in_{name}"
    print(f"Fetching {name}...")
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        req = requests.get(url, headers=headers)
        soup = BeautifulSoup(req.text, 'html.parser')
        table = soup.find('table', {'class': 'wikitable sortable'})
        if not table:
            return []
        
        df = pd.read_html(str(table))[0]
        
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        cols = [str(c).lower().strip() for c in df.columns]
        df.columns = cols
        
        mag_col = next((c for c in cols if 'vis.' in c or 'mag' in c or 'app.' in c), None)
        name_col = next((c for c in cols if 'name' in c), cols[0])
        ra_col = next((c for c in cols if 'ra' in c), None)
        dec_col = next((c for c in cols if 'dec' in c), None)
        
        if not all([mag_col, name_col, ra_col, dec_col]):
            return []
            
        df[mag_col] = pd.to_numeric(df[mag_col].astype(str).str.extract(r'([+\-−]?\d+\.?\d*)')[0], errors='coerce')
        df = df.dropna(subset=[mag_col, ra_col, dec_col])
        df = df.sort_values(by=mag_col).head(3)
        
        results = []
        for idx, row in df.iterrows():
            mag = float(row[mag_col])
            r_str = str(row[ra_col])
            d_str = str(row[dec_col])
            n_str = str(row[name_col]).strip()
            
            if not n_str or n_str == 'nan':
                bayer = next((c for c in cols if 'bayer' in c or 'b' == c), None)
                if bayer and str(row[bayer]) != 'nan':
                    n_str = f"{row[bayer]} {abbr}"
                else:
                    flam = next((c for c in cols if 'flamsteed' in c or 'f' == c or 'f.' == c), None)
                    if flam and str(row[flam]) != 'nan':
                        n_str = f"{row[flam]} {abbr}"
                    else:
                        hd = next((c for c in cols if 'hd' in c), None)
                        if hd and str(row[hd]) != 'nan':
                            n_str = f"HD {row[hd]}"
                            
            if not n_str or n_str == 'nan':
                continue
                
            rh, rm, rs = parse_ra(r_str)
            dd, dm, ds = parse_dec(d_str)
            
            if rh == 0 and rm == 0 and dd == 0 and dm == 0:
                continue
            
            target = {
                "id": f"{abbr.lower()}_{n_str.lower().replace(' ', '_').replace('*', '')}",
                "name": n_str,
                "type": "Star",
                "ra_h": rh,
                "ra_m": rm,
                "ra_s": round(rs, 1),
                "dec_d": dd,
                "dec_m": dm,
                "dec_s": round(ds, 1),
                "magnitude": round(mag, 2),
                "constellation": abbr,
                "difficulty": "naked_eye" if mag <= 6 else "binoculars",
                "emoji": "⭐",
                "description": f"One of the brightest stars in {IAU_88[abbr]}."
            }
            results.append(target)
        return results
    except Exception as e:
        print(f"Error {name}: {e}")
        return []

def main():
    missing, targets = get_missing_constellations()
    new_targets = []
    for c in missing:
        res = fetch_wiki_targets(c)
        new_targets.extend(res)
        time.sleep(0.5)
        
    targets.extend(new_targets)
    with open("data/targets.json", "w") as f:
        json.dump(targets, f, indent=4)
        
    print(f"Added {len(new_targets)} targets.")

if __name__ == "__main__":
    main()
