"""
Faza 5/5. Buduje public/dane/wisnicz.json oraz dane/buildings_outline.json:
 - houses: budynki wykryte na CALEJ mapie (_work/buildings_full.json),
 - residents: te same osoby co dotad (ksiega radziecka), ponownie przypisane
   round-robin do wiekszego zbioru domow (jak w build_app_data.mjs),
 - relations: bez zmian (odnosza sie do osob, nie domow).

Zachowuje format TownData (src/types.ts).

Uruchom (po detect_full.py):  python scripts/mapa/rebuild_json.py
"""
import json
from _paths import BUILDINGS_JSON, TOWN_JSON, OUTLINES_JSON

old = json.load(open(TOWN_JSON, encoding="utf-8"))
dets = json.load(open(BUILDINGS_JSON, encoding="utf-8"))

houses = [{
    "id": f"D{b['nr']}",
    "name": f"Dom nr {b['nr']}",
    "position": b["position"],   # [y, x] w przestrzeni 2397x2270
    "outline": b["outline"],     # [[y,x],...]
    "kind": b["type"],           # 'murowany' | 'drewniany'
} for b in dets]

nB = len(houses)
residents = []
for i, r in enumerate(old["residents"]):
    nd = dict(r)
    nd["houseId"] = f"D{(i % nB) + 1}"
    residents.append(nd)

town = {
    "mapImage": old["mapImage"],
    "mapSize": old["mapSize"],
    "houses": houses,
    "residents": residents,
    "relations": old["relations"],
}

with open(TOWN_JSON, "w", encoding="utf-8") as f:
    json.dump(town, f, ensure_ascii=False, indent=1)
# zapisz tez surowe obrysy (format jak dotad)
with open(OUTLINES_JSON, "w", encoding="utf-8") as f:
    json.dump(dets, f, ensure_ascii=False)

mur = sum(1 for h in houses if h["kind"] == "murowany")
print(f"Zapisano {TOWN_JSON}")
print(f"  domy: {len(houses)} (murowane {mur}, drewniane {len(houses)-mur})")
print(f"  mieszkancy: {len(residents)}  relacje: {len(town['relations'])}")
print(f"  srednio osob/dom: {len(residents)/nB:.2f}")
print(f"Zapisano {OUTLINES_JSON}")
