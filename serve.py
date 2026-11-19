"""Serve the local GigaPrint distribution and preserve its extensionless URLs."""
from argparse import ArgumentParser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import admin_api


class GigaPrintHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if admin_api.handle_get(self):
            return
        super().do_GET()

    def do_POST(self):
        if admin_api.handle_post(self):
            return
        self.send_error(404)

    def translate_path(self, path):
        local_path = Path(super().translate_path(path))
        if local_path.is_dir():
            return str(local_path / "index.html")
        return str(local_path)

    def end_headers(self):
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:; "
            "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; "
            "font-src 'self' data:; connect-src 'self' blob: data:; worker-src 'self' blob:; "
            "media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'",
        )
        super().end_headers()


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()
    public = Path(__file__).resolve().parent / "public"
    with ThreadingHTTPServer((args.host, args.port), partial(GigaPrintHandler, directory=str(public))) as server:
        print(f"Expressarte · http://{args.host}:{server.server_port}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
