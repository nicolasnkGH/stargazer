import json
import urllib.request
import urllib.parse
import os
import time

def fetch_wikipedia_summary(name):
    # Some constellations might just use the name, others name_(constellation)
    title = f"{name}_(constellation)"
    # A few exceptions
    if name == "Scutum": title = "Scutum_(constellation)"
    
    url = f"https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles={urllib.parse.quote(title)}&format=json"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'StarGazerBot/1.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            pages = data['query']['pages']
            for page_id, page_data in pages.items():
                if page_id == "-1":
                    # Try without "_(constellation)" just in case
                    url2 = f"https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles={urllib.parse.quote(name)}&format=json"
                    req2 = urllib.request.Request(url2, headers={'User-Agent': 'StarGazerBot/1.0'})
                    with urllib.request.urlopen(req2) as resp2:
                        data2 = json.loads(resp2.read().decode())
                        pages2 = data2['query']['pages']
                        for p2_id, p2_data in pages2.items():
                            if p2_id != "-1":
                                ext = p2_data.get('extract', '')
                                return ext.split('\n')[0] # Return first paragraph
                    return "No description available."
                
                ext = page_data.get('extract', '')
                return ext.split('\n')[0] # Return first paragraph
    except Exception as e:
        print(f"Error fetching {name}: {e}")
        return ""

def enrich():
    base_dir = os.path.dirname(__file__)
    input_file = os.path.join(base_dir, "constellations.json")
    output_file = os.path.join(base_dir, "constellations_enriched.json")
    
    with open(input_file, 'r') as f:
        constellations = json.load(f)
        
    print(f"Enriching {len(constellations)} constellations...")
    
    for i, c in enumerate(constellations):
        print(f"[{i+1}/{len(constellations)}] Fetching data for {c['name']}...")
        summary = fetch_wikipedia_summary(c['name'])
        c['description'] = summary
        time.sleep(0.1) # Be nice to Wikipedia
        
    with open(output_file, 'w') as f:
        json.dump(constellations, f, indent=2)
        
    print(f"Done! Saved to {output_file}")

if __name__ == "__main__":
    enrich()
