#!/usr/bin/env python3
import json

pt_facts = {
    "motion_iss_0": "A ISS viaja a 7,66 km/s (27.600 km/h) — rápido o suficiente para orbitar a Terra inteira em apenas 92 minutos.",
    "motion_iss_1": "Os astronautas na ISS presenciam cerca de 15 a 16 nascer e pôr do sol todos os dias.",
    "motion_iss_2": "A ISS é habitada continuamente desde 2 de novembro de 2000 — mais de 24 anos de presença humana ininterrupta no espaço.",
    "motion_iss_3": "A ISS é maior do que um campo de futebol americano: 109 m × 73 m, com volume pressurizado de 916 m³.",
    "motion_iss_4": "Com cerca de 150 bilhões de dólares, a ISS é o objeto mais caro já construído pela humanidade.",
    "motion_iss_5": "A ISS pode atingir magnitude -5,9 no seu brilho máximo — superando Vênus e visível à luz do dia.",
    "motion_iss_6": "A ISS já recebeu mais de 270 pessoas de 21 países, totalizando mais de 130 anos-pessoa em órbita.",
    "motion_iss_7": "Mais de 3.000 experimentos foram realizados a bordo da ISS em biologia, física, astronomia e medicina.",
    "motion_iss_8": "A ISS orbita a cerca de 400 km de altitude — suficiente para a curvatura da Terra ser claramente visível.",
    "motion_iss_9": "Foram necessários 42 voos e mais de 13 anos (1998-2011) para montar completamente a ISS em órbita.",
    "motion_comet_0": "Os cometas são cápsulas do tempo antigas — a maioria se formou há 4,6 bilhões de anos quando o sistema solar nasceu.",
    "motion_comet_1": "Alguns cientistas acreditam que os cometas trouxeram água e moléculas orgânicas à Terra primitiva, criando condições para a vida.",
    "motion_comet_2": "A cauda de um cometa sempre aponta para longe do Sol. Existem duas caudas: uma de poeira e uma iônica.",
    "motion_comet_3": "Os cometas às vezes são chamados de bolas de neve sujas — massas geladas de gelo, rocha e compostos orgânicos.",
    "motion_comet_4": "A maioria das chuvas de meteoros é causada pela Terra passando por trilhas de detritos deixados por cometas.",
    "motion_comet_5": "Edmond Halley percebeu em 1705 que os cometas vistos em 1531, 1607 e 1682 eram o mesmo objeto com órbita de 75 anos.",
    "motion_comet_6": "A superfície dos cometas pode atingir +90 °C perto do Sol, mas o núcleo permanece a -273 °C.",
    "motion_comet_7": "A missão Rosetta encontrou o aminoácido glicina no cometa 67P — um bloco construtor das proteínas.",
    "motion_comet_8": "A Nuvem de Oort estende-se a até 100.000 UA do Sol e contém trilhões de núcleos de cometas.",
    "motion_comet_9": "O Grande Cometa de 1882 era tão brilhante que era visível à luz do dia e projetava sombras à noite.",
}

es_facts = {
    "motion_iss_0": "La ISS viaja a 7,66 km/s (27.600 km/h) — lo suficientemente rápido para orbitar toda la Tierra en 92 minutos.",
    "motion_iss_1": "Los astronautas en la ISS presencian aproximadamente 15 a 16 amaneceres y atardeceres cada día.",
    "motion_iss_2": "La ISS ha sido habitada continuamente desde el 2 de noviembre de 2000 — más de 24 años de presencia humana en el espacio.",
    "motion_iss_3": "La ISS es más grande que un campo de fútbol americano: 109 m × 73 m, con un volumen presurizado de 916 m³.",
    "motion_iss_4": "Con unos 150.000 millones de dólares, la ISS es el objeto más caro jamás construido por la humanidad.",
    "motion_iss_5": "La ISS puede alcanzar magnitud -5,9 en su punto más brillante — superando a Venus y visible a plena luz del día.",
    "motion_iss_6": "La ISS ha albergado a más de 270 personas de 21 países, acumulando más de 130 años-persona en órbita.",
    "motion_iss_7": "Más de 3.000 experimentos se han realizado a bordo de la ISS en biología, física, astronomía y medicina.",
    "motion_iss_8": "La ISS orbita a unos 400 km de altitud — suficiente para que la curvatura de la Tierra sea claramente visible.",
    "motion_iss_9": "Se necesitaron 42 vuelos y más de 13 años (1998-2011) para ensamblar completamente la ISS en órbita.",
    "motion_comet_0": "Los cometas son cápsulas del tiempo antiguas — la mayoría se formaron hace 4.600 millones de años.",
    "motion_comet_1": "Algunos científicos creen que los cometas pudieron haber traído agua y moléculas orgánicas a la Tierra primitiva.",
    "motion_comet_2": "La cola de un cometa siempre apunta alejándose del Sol. En realidad hay dos colas: una de polvo y una iónica.",
    "motion_comet_3": "Los cometas a veces se llaman bolas de nieve sucia — masas heladas de hielo, roca y compuestos orgánicos.",
    "motion_comet_4": "La mayoría de las lluvias de meteoros son causadas por la Tierra atravesando estelas de escombros de cometas.",
    "motion_comet_5": "Edmond Halley se dio cuenta en 1705 de que los cometas de 1531, 1607 y 1682 eran el mismo objeto con órbita de 75 años.",
    "motion_comet_6": "La superficie de los cometas puede alcanzar +90 °C cerca del Sol, pero su núcleo permanece a -273 °C.",
    "motion_comet_7": "La misión Rosetta encontró el aminoácido glicina en el cometa 67P — un bloque constructor de las proteínas.",
    "motion_comet_8": "La Nube de Oort se extiende hasta 100.000 UA del Sol y contiene billones de núcleos de cometas.",
    "motion_comet_9": "El Gran Cometa de 1882 era tan brillante que se veía a plena luz del día y proyectaba sombras de noche.",
}

en_facts = {
    "motion_iss_0": "The ISS travels at 7.66 km/s (17,150 mph) — fast enough to circle the entire Earth in just 92 minutes.",
    "motion_iss_1": "Astronauts on the ISS witness approximately 15-16 sunrises and sunsets every single day.",
    "motion_iss_2": "The ISS has been continuously inhabited since November 2, 2000 — over 24 years of unbroken human presence in space.",
    "motion_iss_3": "The ISS is larger than an American football field: 109 m x 73 m, with a pressurised volume of 916 cubic metres.",
    "motion_iss_4": "At ~$150 billion USD, the ISS is the most expensive object ever built by humanity.",
    "motion_iss_5": "The ISS can reach magnitude -5.9 at its brightest — outshining Venus and visible in full daylight if you know where to look.",
    "motion_iss_6": "The ISS has hosted over 270 individuals from 21 countries, spending a combined 130+ person-years in orbit.",
    "motion_iss_7": "Over 3,000 research experiments have been conducted aboard the ISS across biology, physics, astronomy, and medicine.",
    "motion_iss_8": "The ISS orbits at an altitude of roughly 400 km — just high enough for the curvature of Earth to be clearly visible.",
    "motion_iss_9": "It took 42 flights and over 13 years (1998-2011) to fully assemble the ISS in orbit.",
    "motion_comet_0": "Comets are ancient time capsules — most formed 4.6 billion years ago when the solar system was born.",
    "motion_comet_1": "Some scientists believe comets may have delivered water and complex organic molecules to early Earth, seeding the conditions for life.",
    "motion_comet_2": "A comet's tail always points away from the Sun, not behind it. There are actually two tails: a dust tail and an ion tail.",
    "motion_comet_3": "Comets are sometimes called dirty snowballs — their nuclei are dark, frozen masses of ice, rock, and organic compounds.",
    "motion_comet_4": "Most meteor showers are caused by Earth passing through trails of debris left by comets.",
    "motion_comet_5": "Edmond Halley realised in 1705 that comets seen in 1531, 1607, and 1682 were all the same object on a 75-year orbit.",
    "motion_comet_6": "Comet surfaces can reach temperatures of +90C near the Sun but their nuclei remain at around -273C.",
    "motion_comet_7": "The Rosetta mission found the amino acid glycine on comet 67P — one of the building blocks of proteins.",
    "motion_comet_8": "The Oort Cloud, a theoretical shell of trillions of comet nuclei, extends up to 100,000 AU from the Sun.",
    "motion_comet_9": "The Great Comet of 1882 was so bright it was visible in full daylight and cast shadows at night.",
}

for lang, facts in [("en", en_facts), ("pt", pt_facts), ("es", es_facts)]:
    path = f"nextjs-app/messages/{lang}.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    data.update(facts)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Done. Added motion fact translations to en.json, pt.json, es.json.")
