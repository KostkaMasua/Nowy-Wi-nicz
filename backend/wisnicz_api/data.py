"""Wczytywanie i przeszukiwanie danych z public/dane/wisnicz.json."""

import json
from pathlib import Path

DEFAULT_DATA_PATH = Path(__file__).resolve().parents[2] / "public" / "dane" / "wisnicz.json"


class Dataset:
    def __init__(self, raw: dict) -> None:
        self.houses: list[dict] = raw.get("houses", [])
        self.residents: list[dict] = raw.get("residents", [])
        self.relations: list[dict] = raw.get("relations", [])
        self._houses_by_id = {h["id"]: h for h in self.houses}
        self._residents_by_id = {r["id"]: r for r in self.residents}

    @classmethod
    def load(cls, path: Path = DEFAULT_DATA_PATH) -> "Dataset":
        with open(path, encoding="utf-8") as f:
            return cls(json.load(f))

    def stats(self) -> dict:
        return {
            "houses": len(self.houses),
            "residents": len(self.residents),
            "relations": len(self.relations),
        }

    def house(self, house_id: str) -> dict | None:
        house = self._houses_by_id.get(house_id)
        if house is None:
            return None
        residents = [r for r in self.residents if r.get("houseId") == house_id]
        return {**house, "residents": residents}

    def find_residents(self, query: str = "", house_id: str = "") -> list[dict]:
        q = query.casefold().strip()
        result = []
        for r in self.residents:
            if house_id and r.get("houseId") != house_id:
                continue
            if q:
                name = f"{r.get('firstName', '')} {r.get('lastName', '')}".casefold()
                if q not in name and q not in (r.get("occupation") or "").casefold():
                    continue
            result.append(r)
        return result

    def resident(self, resident_id: str) -> dict | None:
        resident = self._residents_by_id.get(resident_id)
        if resident is None:
            return None
        return {**resident, "relations": self.relations_for(resident_id)}

    def relations_for(self, person_id: str) -> list[dict]:
        return [
            r for r in self.relations
            if person_id in (r.get("fromId"), r.get("toId"))
        ]
