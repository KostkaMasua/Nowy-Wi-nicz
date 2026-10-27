import json
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import urlopen

from wisnicz_api.data import Dataset
from wisnicz_api.server import create_server

SAMPLE = {
    "houses": [{"id": "D1", "name": "Dom nr 1"}, {"id": "D2", "name": "Dom nr 2"}],
    "residents": [
        {"id": "O1", "firstName": "Aleksander", "lastName": "Michalski", "occupation": "sławetny", "houseId": "D1"},
        {"id": "O2", "firstName": "Jan", "lastName": "Kowal", "occupation": "mieszczanin", "houseId": "D2"},
    ],
    "relations": [{"id": "R1", "type": "sadowa", "fromId": "O1", "toId": "O2", "label": "Zwrot długu (1724)"}],
}


class ApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.server = create_server("127.0.0.1", 0, Dataset(SAMPLE))
        cls.base = f"http://127.0.0.1:{cls.server.server_address[1]}"
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()
        cls.server.server_close()

    def get(self, path: str) -> object:
        with urlopen(self.base + path) as resp:
            return json.load(resp)

    def test_health(self) -> None:
        self.assertEqual(self.get("/health"), {"status": "ok"})

    def test_stats(self) -> None:
        self.assertEqual(self.get("/api/stats"), {"houses": 2, "residents": 2, "relations": 1})

    def test_house_includes_residents(self) -> None:
        house = self.get("/api/houses/D1")
        self.assertEqual([r["id"] for r in house["residents"]], ["O1"])

    def test_search_residents(self) -> None:
        self.assertEqual([r["id"] for r in self.get("/api/residents?q=kowal")], ["O2"])
        self.assertEqual([r["id"] for r in self.get("/api/residents?q=s%C5%82awetny")], ["O1"])
        self.assertEqual([r["id"] for r in self.get("/api/residents?houseId=D1")], ["O1"])

    def test_resident_includes_relations(self) -> None:
        self.assertEqual([r["id"] for r in self.get("/api/residents/O2")["relations"]], ["R1"])

    def test_relations_filter(self) -> None:
        self.assertEqual(len(self.get("/api/relations?personId=O1")), 1)
        self.assertEqual(self.get("/api/relations?personId=O9"), [])

    def test_unknown_returns_404(self) -> None:
        for path in ("/api/houses/D99", "/api/residents/O99", "/nope"):
            with self.assertRaises(HTTPError) as ctx:
                self.get(path)
            self.assertEqual(ctx.exception.code, 404)


class RealDataTest(unittest.TestCase):
    def test_loads_bundled_data(self) -> None:
        stats = Dataset.load().stats()
        self.assertGreater(stats["houses"], 0)
        self.assertGreater(stats["residents"], 0)


if __name__ == "__main__":
    unittest.main()
