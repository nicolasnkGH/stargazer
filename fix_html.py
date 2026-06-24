with open("web/index.html", "r") as f:
    lines = f.readlines()

# Extract lines
# 210 to 269: active const (0-indexed: 209 to 269)
# 270: </div> (0-indexed: 269)
# 272 to 306: AI targets & Planets (0-indexed: 271 to 306)

active_const = lines[209:269]
active_const_str = "".join(active_const)
active_const_str = active_const_str.replace('height: 200px;', 'aspect-ratio: 1; max-height: 500px; height: auto;')

closing_div = lines[269]
ai_and_planets = lines[271:306]

new_lines = lines[:209] + [closing_div, "\n"] + ai_and_planets + ["\n"] + [active_const_str] + lines[306:]

with open("web/index.html", "w") as f:
    f.writelines(new_lines)
