import re

with open("web/index.html", "r") as f:
    html = f.read()

# Find the active constellation block
active_const_pattern = re.compile(r'( {6}<!-- ── Active Constellation Card ──.*? {6}</section>\n)', re.DOTALL)
match = active_const_pattern.search(html)
active_const_html = match.group(1)

# Remove it from its current position
html = html.replace(active_const_html, "")

# Find the planets block
planets_pattern = re.compile(r'( {4}<!-- Planets Tonight -->.*? {4}</div>\n)', re.DOTALL)
match_planets = planets_pattern.search(html)
planets_html = match_planets.group(1)

# Insert active constellation right after planets block
# Need to replace the map container hardcoded height first
active_const_html = active_const_html.replace('height: 200px;', 'aspect-ratio: 1; max-height: 500px; height: auto;')

html = html.replace(planets_html, planets_html + "\n" + active_const_html)

with open("web/index.html", "w") as f:
    f.write(html)
