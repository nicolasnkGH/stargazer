import urllib.request
import re

url = "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.json"
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    html = urllib.request.urlopen(req).read().decode('utf-8')
    import json
    data = json.loads(html)
    constellations = []
    # This repo usually has geojson
    for feature in data['features']:
        name = feature['properties']['name']
        abbr = feature['id']
        # D3-celestial doesn't have centers in the main feature, they have boundaries
        pass
except:
    pass

# Alternative: let's just make a script that downloads a known CSV from Wikipedia directly by regexing the HTML source
import json
url = "https://en.wikipedia.org/wiki/88_modern_constellations"
html = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8')

# Grab the table rows using regex
rows = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL)

constellations = []
for row in rows:
    cols = re.findall(r'<(?:td|th)[^>]*>(.*?)</(?:td|th)>', row, re.DOTALL)
    if len(cols) >= 8:
        name_match = re.search(r'title="([^"]+)"', cols[0])
        if not name_match:
            continue
        name = name_match.group(1).replace(' (constellation)', '')
        
        abbr = re.sub(r'<[^>]+>', '', cols[1]).strip()
        
        # RA and Dec are around index 6,7 but sometimes index shifts. 
        text_cols = [re.sub(r'<[^>]+>', '', c).strip() for c in cols]
        
        # Extract RA
        ra_match = re.search(r'(\d{1,2})\s*[h:]\s*(\d{1,2})', " ".join(text_cols))
        dec_match = re.search(r'([+−-]?\d{1,2})\s*[°:]\s*(\d{1,2})', " ".join(text_cols).replace('−', '-'))
        
        if ra_match and dec_match and len(abbr) == 3:
            ra = int(ra_match.group(1)) + int(ra_match.group(2)) / 60.0
            deg_str = dec_match.group(1).replace('−', '-')
            deg = int(deg_str)
            mn = int(dec_match.group(2))
            sign = -1 if deg < 0 or deg_str.startswith('-') else 1
            dec = sign * (abs(deg) + mn / 60.0)
            
            constellations.append({
                "name": name,
                "abbr": abbr,
                "ra": round(ra, 2),
                "dec": round(dec, 2)
            })

with open('constellations_data.json', 'w') as f:
    json.dump(constellations, f, indent=2)

print(f"Saved {len(constellations)} constellations")
