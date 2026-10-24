import http.server
import socketserver
import json
import os
import time
import sys
import argparse
from urllib.parse import urlparse
from adb_shell.adb_device import AdbDeviceTcp
from adb_shell.auth.sign_pythonrsa import PythonRSASigner

parser = argparse.ArgumentParser(description="Philips Ambilight Controller & Web UI")
parser.add_argument("--ip", default=os.environ.get("PHILIPS_TV_IP", "192.168.4.148"), help="Philips TV IP address")
parser.add_argument("--port", type=int, default=int(os.environ.get("PHILIPS_TV_PORT", 5555)), help="ADB port (default: 5555)")
parser.add_argument("--listen-port", type=int, default=int(os.environ.get("PORT", 8765)), help="Web UI listen port (default: 8765)")
args = parser.parse_args()

class TVController:
    def __init__(self, ip=args.ip, port=args.port):
        self.ip = ip
        self.port = port
        self.dev = None
        self.signer = None
        self._init_keys()

    def _init_keys(self):
        key_path = os.path.expanduser('~/.android/adbkey')
        if os.path.exists(key_path) and os.path.exists(key_path + '.pub'):
            with open(key_path) as f: priv = f.read()
            with open(key_path + '.pub') as f: pub = f.read()
            self.signer = PythonRSASigner(pub, priv)

    def connect(self):
        try:
            if self.dev and self.dev._transport and self.dev._transport._connection:
                return True
        except:
            pass

        try:
            self.dev = AdbDeviceTcp(self.ip, self.port, default_transport_timeout_s=8.0)
            if self.signer:
                self.dev.connect(rsa_keys=[self.signer], auth_timeout_s=5.0)
            else:
                self.dev.connect(auth_timeout_s=5.0)
            return True
        except Exception as e:
            self.dev = None
            return False

    def exec_shell(self, command, timeout=10.0):
        t0 = time.time()
        try:
            if not self.connect():
                return {"success": False, "command": command, "output": f"Connection failed to {self.ip}:{self.port}", "elapsed_ms": int((time.time()-t0)*1000)}
            
            output = self.dev.shell(command, read_timeout_s=timeout)
            elapsed_ms = int((time.time() - t0) * 1000)
            return {
                "success": True,
                "command": command,
                "output": (output or "").strip(),
                "elapsed_ms": elapsed_ms
            }
        except Exception as e:
            try:
                self.dev = None
                if self.connect():
                    output = self.dev.shell(command, read_timeout_s=timeout)
                    return {
                        "success": True,
                        "command": command,
                        "output": (output or "").strip(),
                        "elapsed_ms": int((time.time() - t0) * 1000)
                    }
            except:
                pass
            return {
                "success": False,
                "command": command,
                "output": str(e),
                "elapsed_ms": int((time.time() - t0) * 1000)
            }

    def get_status(self):
        t0 = time.time()
        try:
            connected = self.connect()
            if not connected:
                return {"connected": False, "ip": self.ip, "port": self.port, "style": "unknown"}
            
            style = self.dev.shell("settings get system ambilight_style", read_timeout_s=3.0)
            model = self.dev.shell("getprop ro.product.model", read_timeout_s=3.0)
            return {
                "connected": True,
                "ip": self.ip,
                "port": self.port,
                "style": (style or "").strip(),
                "model": (model or "Philips TV").strip(),
                "ping_ms": int((time.time() - t0) * 1000)
            }
        except Exception as e:
            return {"connected": False, "ip": self.ip, "port": self.port, "error": str(e)}

controller = TVController()

class AmbilightHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        static_dir = os.path.join(os.path.dirname(__file__), "web")
        super().__init__(*args, directory=static_dir, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            status = controller.get_status()
            self.wfile.write(json.dumps(status).encode("utf-8"))
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/command":
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode("utf-8"))
                cmd = data.get("command", "").strip()
                if "ip" in data and data["ip"] != controller.ip:
                    controller.ip = data["ip"]
                    controller.dev = None

                res = controller.exec_shell(cmd)
            except Exception as e:
                res = {"success": False, "command": "", "output": f"Error: {e}", "elapsed_ms": 0}

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(res).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass

def run():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", args.listen_port), AmbilightHandler) as httpd:
        print(f"Ambilight Controller running on http://127.0.0.1:{args.listen_port} (Target TV: {controller.ip}:{controller.port})")
        sys.stdout.flush()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    run()
