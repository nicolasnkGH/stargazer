import json

new_targets = [
    # Corona Borealis
    {"id": "t_crb", "name": "Blaze Star (T CrB)", "type": "Variable Star", "ra_h": 15, "ra_m": 59, "ra_s": 30, "dec_d": 25, "dec_m": 55, "dec_s": 12, "magnitude": 10.0, "constellation": "CrB", "difficulty": "moderate", "emoji": "🔥", "description": "A famous recurring nova that periodically erupts and becomes visible to the naked eye."},
    {"id": "r_crb", "name": "R Coronae Borealis", "type": "Variable Star", "ra_h": 15, "ra_m": 48, "ra_s": 34, "dec_d": 28, "dec_m": 9, "dec_s": 24, "magnitude": 6.0, "constellation": "CrB", "difficulty": "moderate", "emoji": "⭐", "description": "The prototype of a rare class of unpredictable variable stars that dramatically fade due to carbon dust."},
    
    # Serpens
    {"id": "m16", "name": "Eagle Nebula (M16)", "type": "Emission Nebula / Open Cluster", "ra_h": 18, "ra_m": 18, "ra_s": 48, "dec_d": -13, "dec_m": 49, "dec_s": 0, "magnitude": 6.0, "constellation": "Ser", "difficulty": "moderate", "emoji": "🦅", "description": "Famous for the 'Pillars of Creation'. Best seen with a UHC or OIII filter."},
    {"id": "m5", "name": "Rose Cluster (M5)", "type": "Globular Cluster", "ra_h": 15, "ra_m": 18, "ra_s": 33, "dec_d": 2, "dec_m": 4, "dec_s": 51, "magnitude": 5.6, "constellation": "Ser", "difficulty": "easy", "emoji": "✨", "description": "One of the most glorious globular clusters in the sky, arguably better than M13."},
    
    # Hercules
    {"id": "m13", "name": "Great Hercules Cluster (M13)", "type": "Globular Cluster", "ra_h": 16, "ra_m": 41, "ra_s": 41, "dec_d": 36, "dec_m": 27, "dec_s": 35, "magnitude": 5.8, "constellation": "Her", "difficulty": "easy", "emoji": "✨", "description": "The most famous globular cluster in the Northern Hemisphere. Easily resolved into hundreds of stars."},
    {"id": "m92", "name": "M92", "type": "Globular Cluster", "ra_h": 17, "ra_m": 17, "ra_s": 7, "dec_d": 43, "dec_m": 8, "dec_s": 9, "magnitude": 6.3, "constellation": "Her", "difficulty": "easy", "emoji": "✨", "description": "A magnificent globular cluster often overshadowed by M13, but brighter and more compact."},
    
    # Lyra
    {"id": "m57", "name": "Ring Nebula (M57)", "type": "Planetary Nebula", "ra_h": 18, "ra_m": 53, "ra_s": 35, "dec_d": 33, "dec_m": 1, "dec_s": 45, "magnitude": 8.8, "constellation": "Lyr", "difficulty": "easy", "emoji": "🍩", "description": "A textbook planetary nebula resembling a smoke ring. Easy to find between Sheliak and Sulafat."},
    
    # Cygnus
    {"id": "albireo", "name": "Albireo (β Cyg)", "type": "Double Star", "ra_h": 19, "ra_m": 30, "ra_s": 43, "dec_d": 27, "dec_m": 57, "dec_s": 34, "magnitude": 3.0, "constellation": "Cyg", "difficulty": "easy", "emoji": "🔵", "description": "One of the most beautiful double stars in the sky, featuring a striking gold and sapphire blue color contrast."},
    
    # Sagitta
    {"id": "m71", "name": "M71", "type": "Globular Cluster", "ra_h": 19, "ra_m": 53, "ra_s": 46, "dec_d": 18, "dec_m": 46, "dec_s": 42, "magnitude": 8.2, "constellation": "Sge", "difficulty": "moderate", "emoji": "✨", "description": "A loose, sparsely populated globular cluster that looks somewhat like a dense open cluster."},
    
    # Vulpecula
    {"id": "m27", "name": "Dumbbell Nebula (M27)", "type": "Planetary Nebula", "ra_h": 19, "ra_m": 59, "ra_s": 36, "dec_d": 22, "dec_m": 43, "dec_s": 16, "magnitude": 7.5, "constellation": "Vul", "difficulty": "easy", "emoji": "🍎", "description": "A massive, bright planetary nebula shaped like an apple core or dumbbell. Fantastic in binoculars or small scopes."},
    {"id": "cr399", "name": "Brocchi's Cluster (Coathanger)", "type": "Asterism", "ra_h": 19, "ra_m": 25, "ra_s": 24, "dec_d": 20, "dec_m": 11, "dec_s": 0, "magnitude": 3.6, "constellation": "Vul", "difficulty": "naked_eye", "emoji": "🧥", "description": "A fun asterism that looks exactly like an upside-down coat hanger in binoculars."},
    
    # Draco
    {"id": "ngc6543", "name": "Cat's Eye Nebula", "type": "Planetary Nebula", "ra_h": 17, "ra_m": 58, "ra_s": 33, "dec_d": 66, "dec_m": 37, "dec_s": 59, "magnitude": 9.8, "constellation": "Dra", "difficulty": "hard", "emoji": "👁️", "description": "A bright, structurally complex planetary nebula that appears blue-green in telescopes."},
    
    # Boötes
    {"id": "izar", "name": "Izar (ε Boo)", "type": "Double Star", "ra_h": 14, "ra_m": 44, "ra_s": 59, "dec_d": 27, "dec_m": 4, "dec_s": 27, "magnitude": 2.35, "constellation": "Boo", "difficulty": "moderate", "emoji": "🔵", "description": "Also known as Pulcherrima ('The Most Beautiful'). A tight, challenging double star requiring good seeing to split the orange and blue pair."},
    
    # Ophiuchus
    {"id": "m10", "name": "M10", "type": "Globular Cluster", "ra_h": 16, "ra_m": 57, "ra_s": 8, "dec_d": -4, "dec_m": 5, "dec_s": 58, "magnitude": 6.4, "constellation": "Oph", "difficulty": "easy", "emoji": "✨", "description": "A bright, easily resolved globular cluster near the center of Ophiuchus."},
    {"id": "m12", "name": "M12", "type": "Globular Cluster", "ra_h": 16, "ra_m": 47, "ra_s": 14, "dec_d": -1, "dec_m": 56, "dec_s": 54, "magnitude": 6.7, "constellation": "Oph", "difficulty": "moderate", "emoji": "✨", "description": "A looser, less concentrated globular cluster near M10."},
    
    # Scutum
    {"id": "m11", "name": "Wild Duck Cluster (M11)", "type": "Open Cluster", "ra_h": 18, "ra_m": 51, "ra_s": 5, "dec_d": -6, "dec_m": 16, "dec_s": 12, "magnitude": 5.8, "constellation": "Sct", "difficulty": "easy", "emoji": "🦆", "description": "One of the richest, most compact open clusters in the sky. It resembles a flock of wild ducks in flight."},
    
    # Aquila
    {"id": "ngc6709", "name": "NGC 6709", "type": "Open Cluster", "ra_h": 18, "ra_m": 51, "ra_s": 18, "dec_d": 10, "dec_m": 21, "dec_s": 0, "magnitude": 6.7, "constellation": "Aql", "difficulty": "moderate", "emoji": "⭐", "description": "A rich, loose open cluster that stands out nicely against the rich Milky Way background."},
    
    # Delphinus
    {"id": "gamma_del", "name": "Gamma Delphini", "type": "Double Star", "ra_h": 20, "ra_m": 46, "ra_s": 39, "dec_d": 16, "dec_m": 7, "dec_s": 27, "magnitude": 4.27, "constellation": "Del", "difficulty": "easy", "emoji": "🔵", "description": "A stunning golden-yellow and yellow-green double star easily split at moderate magnification."},
    
    # Canes Venatici
    {"id": "m51", "name": "Whirlpool Galaxy (M51)", "type": "Spiral Galaxy", "ra_h": 13, "ra_m": 29, "ra_s": 52, "dec_d": 47, "dec_m": 11, "dec_s": 43, "magnitude": 8.4, "constellation": "CVn", "difficulty": "moderate", "emoji": "🌀", "description": "A classic face-on spiral galaxy interacting with a smaller companion."},
    {"id": "m3", "name": "M3", "type": "Globular Cluster", "ra_h": 13, "ra_m": 42, "ra_s": 11, "dec_d": 28, "dec_m": 22, "dec_s": 38, "magnitude": 6.2, "constellation": "CVn", "difficulty": "easy", "emoji": "✨", "description": "An outstanding globular cluster, containing half a million stars. A fantastic sight in any telescope."},
]

with open('api/data/targets.json', 'r') as f:
    text = f.read()

# Fix the NaN issue that breaks Javascript parsing
text = text.replace('NaN', 'null')
data = json.loads(text)

# Append only if id not already present
existing_ids = {t.get("id") for t in data}
added_count = 0
for nt in new_targets:
    if nt["id"] not in existing_ids:
        data.append(nt)
        added_count += 1

with open('api/data/targets.json', 'w') as f:
    json.dump(data, f, indent=4)

print(f"Added {added_count} new deep-sky targets and fixed NaNs!")
