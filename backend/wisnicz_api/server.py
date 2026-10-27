"""Serwer HTTP oparty wyłącznie na bibliotece standardowej."""

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .data import DEFAULT_DATA_PATH, Dataset


def make_handler(dataset: Dataset) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            url = urlparse(self.path)
            params = {k: v[0] for k, v in parse_qs(url.query).items()}
            parts = [p for p in url.path.split("/") if p]

            if parts == ["health"]:
                self._json({"status": "ok"})
            elif parts == ["api", "stats"]:
                self._json(dataset.stats())
            elif parts == ["api", "houses"]:
                self._json(dataset.houses)
            elif len(parts) == 3 and parts[:2] == ["api", "houses"]:
                self._json_or_404(dataset.house(parts[2]))
            elif parts == ["api", "residents"]:
                self._json(dataset.find_residents(params.get("q", ""), params.get("houseId", "")))
            elif len(parts) == 3 and parts[:2] == ["api", "residents"]:
                self._json_or_404(dataset.resident(parts[2]))
            elif parts == ["api", "relations"]:
                person_id = params.get("personId")
                self._json(dataset.relations_for(person_id) if person_id else dataset.relations)
            else:
                self._json({"error": "not found"}, 404)

        def do_OPTIONS(self) -> None:
            self.send_response(204)
            self._cors()
            self.end_headers()

        def _json_or_404(self, payload: dict | None) -> None:
            if payload is None:
                self._json({"error": "not found"}, 404)
            else:
                self._json(payload)

        def _json(self, payload: object, status: int = 200) -> None:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self._cors()
            self.end_headers()
            self.wfile.write(body)

        def _cors(self) -> None:
            self.send_header("Access-Control-Allow-Origin", os.environ.get("WISNICZ_CORS_ORIGIN", "*"))
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")

    return Handler


def create_server(host: str, port: int, dataset: Dataset) -> ThreadingHTTPServer:
    return ThreadingHTTPServer((host, port), make_handler(dataset))


def main() -> None:
    host = os.environ.get("WISNICZ_HOST", "127.0.0.1")
    port = int(os.environ.get("WISNICZ_PORT", "8000"))
    data_path = Path(os.environ.get("WISNICZ_DATA", DEFAULT_DATA_PATH))
    server = create_server(host, port, Dataset.load(data_path))
    print(f"Listening on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
