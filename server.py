import http.server
import socketserver
import os
import sys

DEFAULT_PORT = 8101

def get_port():
    if len(sys.argv) > 1:
        try:
            return int(sys.argv[1])
        except ValueError:
            pass
    if 'PORT' in os.environ:
        try:
            return int(os.environ['PORT'])
        except ValueError:
            pass
    return DEFAULT_PORT

PORT = get_port()
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
        
    def address_string(self):
        # Prevent slow reverse DNS lookups on every request
        return self.client_address[0]

if __name__ == '__main__':
    # Enable address reuse so restarts don't hit TIME_WAIT port conflicts
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"=====================================================")
        print(f"  Aetheria: Chronicles of Eternity is now live at:   ")
        print(f"  http://localhost:{PORT}                           ")
        print(f"=====================================================")
        sys.stdout.flush()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
