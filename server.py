#!/usr/bin/env python3
"""
Lynx AI Gateway & Dashboard Server
- Serve o painel web Lynx AI Hub na porta 8085
- Gerenciador de Chaves de API (com persistência em keys.json)
- Proxy autenticado OpenAI-compatível (/v1/chat/completions) apontando para o Ollama na VPS (85.31.60.68)
- Zero dependências externas (roda 100% com a biblioteca padrão do Python)
"""

import os
import sys
import json
import secrets
import mimetypes
import datetime
import urllib.request
import urllib.error
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

# Forçar UTF-8 no stdout/stderr do Windows
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

PORT = 8085
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KEYS_FILE = os.path.join(BASE_DIR, "keys.json")

# Lista de candidatos para alcançar o Ollama (seja de fora, de dentro do Docker ou na rede EasyPanel)
OLLAMA_CANDIDATES = [
    os.environ.get("OLLAMA_URL", "").strip(),
    "http://85.31.60.68:11434",
    "http://172.17.0.1:11434",
    "http://host.docker.internal:11434",
    "http://ollama:11434"
]
OLLAMA_CANDIDATES = [c for c in OLLAMA_CANDIDATES if c]

def proxy_to_ollama(path, method="GET", data=None, headers=None, timeout=120):
    """Tenta conectar ao Ollama em múltiplos candidatos até encontrar um ativo."""
    last_err = None
    for base in OLLAMA_CANDIDATES:
        url = f"{base}{path}"
        try:
            req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
            return urllib.request.urlopen(req, timeout=timeout)
        except urllib.error.HTTPError as e:
            # Se for erro HTTP (ex: 404 modelo não encontrado), o Ollama foi alcançado com sucesso!
            raise e
        except Exception as e:
            last_err = e
            continue
    raise Exception(f"Nenhum endpoint do Ollama respondeu nos candidatos: {OLLAMA_CANDIDATES}. Último erro: {last_err}")

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "edsonmanoel2012@gmail.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "10207597Rdv*")
SESSIONS_FILE = os.path.join(BASE_DIR, "sessions.json")

def load_sessions():
    if not os.path.exists(SESSIONS_FILE):
        return {}
    try:
        with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def save_sessions(sessions_dict):
    try:
        with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(sessions_dict, f, indent=2)
    except Exception:
        pass

def create_session(email):
    sessions = load_sessions()
    token = f"lynx_sess_{secrets.token_hex(20)}"
    sessions[token] = {
        "email": email,
        "created_at": datetime.datetime.now().isoformat()
    }
    save_sessions(sessions)
    return token

def is_session_valid(token):
    if not token:
        return False
    sessions = load_sessions()
    return token in sessions

def remove_session(token):
    if not token:
        return
    sessions = load_sessions()
    if token in sessions:
        del sessions[token]
        save_sessions(sessions)

# ==================== GERENCIADOR DE CHAVES ====================
def load_keys():
    if not os.path.exists(KEYS_FILE):
        initial_keys = [
            {
                "id": "key_default_lynx",
                "name": "Chave Principal Lynx (Padrao)",
                "key": "lynx_sk_live_vps_default_2026",
                "app": "Todos os Aplicativos",
                "created_at": datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
                "status": "active"
            }
        ]
        save_keys(initial_keys)
        return initial_keys
    try:
        with open(KEYS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_keys(keys_list):
    with open(KEYS_FILE, "w", encoding="utf-8") as f:
        json.dump(keys_list, f, indent=2, ensure_ascii=False)

def is_key_valid(bearer_token):
    if not bearer_token:
        return False
    keys = load_keys()
    # Se nao houver chaves ativas registradas, permite para facilitar testes iniciais
    if not keys:
        return True
    for k in keys:
        if k.get("status") == "active" and k.get("key") == bearer_token:
            return True
    # Chave padrão de compatibilidade caso o usuário use a pré-configurada
    if bearer_token in ["lynx-ai-vps-secret", "lynx_sk_live_vps_default_2026"]:
        return True
    return False

# ==================== HTTP HANDLER ====================
class LynxGatewayHandler(BaseHTTPRequestHandler):

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def get_session_token(self):
        auth_header = self.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "").strip()
            if token.startswith("lynx_sess_"):
                return token
        cookies = self.headers.get("Cookie", "")
        for part in cookies.split(";"):
            part = part.strip()
            if part.startswith("lynx_session="):
                return part.split("=", 1)[1].strip()
        return None

    def is_request_authenticated(self):
        client_ip = self.client_address[0] if self.client_address else ""
        if client_ip in ["127.0.0.1", "localhost", "::1"]:
            return True
        token = self.get_session_token()
        if is_session_valid(token):
            return True
        auth_header = self.headers.get("Authorization", "").replace("Bearer ", "").strip()
        if is_key_valid(auth_header):
            return True
        return False

    def do_GET(self):
        parsed_path = self.path.split("?")[0]
        client_ip = self.client_address[0] if self.client_address else ""

        # 0. API: Checar Autenticação de Sessão
        if parsed_path == "/api/auth/verify":
            token = self.get_session_token()
            if is_session_valid(token) or client_ip in ["127.0.0.1", "localhost", "::1"]:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"authenticated": True, "email": ADMIN_EMAIL}).encode("utf-8"))
            else:
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"authenticated": False}).encode("utf-8"))
            return

        # 1. API: Listar Chaves de API (Exige Autenticação)
        if parsed_path == "/api/keys":
            if not self.is_request_authenticated():
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Acesso restrito. Faça login com o usuário administrador."}).encode("utf-8"))
                return

            keys = load_keys()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(keys).encode("utf-8"))
            return

        # 2. API: Modelos da VPS (/v1/models ou /api/tags)
        if parsed_path in ["/v1/models", "/api/tags"]:
            try:
                with proxy_to_ollama("/api/tags", timeout=10) as resp:
                    data = resp.read()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(data)
                    return
            except Exception as e:
                self.send_response(502)
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"VPS Offline ou Inacessível: {str(e)}"}).encode("utf-8"))
                return

        # 3. Arquivos Estáticos (Frontend)
        file_path = parsed_path.lstrip("/")
        if not file_path or file_path == "/":
            file_path = "index.html"

        full_path = os.path.join(BASE_DIR, file_path)
        if os.path.exists(full_path) and os.path.isfile(full_path):
            mime_type, _ = mimetypes.guess_type(full_path)
            if not mime_type:
                mime_type = "application/octet-stream"

            self.send_response(200)
            self.send_header("Content-Type", mime_type)
            self.send_cors_headers()
            self.end_headers()
            with open(full_path, "rb") as f:
                self.wfile.write(f.read())
        else:
            self.send_response(404)
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(b"404: Arquivo nao encontrado no Lynx AI Hub")

    def do_POST(self):
        parsed_path = self.path.split("?")[0]
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else b""

        # 0. API: Login de Administrador
        if parsed_path == "/api/auth/login":
            try:
                data = json.loads(body.decode("utf-8")) if body else {}
            except Exception:
                data = {}

            email = str(data.get("email", "")).strip().lower()
            password = str(data.get("password", "")).strip()

            if email == ADMIN_EMAIL.lower() and password == ADMIN_PASSWORD:
                token = create_session(ADMIN_EMAIL)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Set-Cookie", f"lynx_session={token}; Path=/; Max-Age=2592000; SameSite=Lax")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "token": token,
                    "email": ADMIN_EMAIL
                }).encode("utf-8"))
                return
            else:
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": "Usuário ou senha incorretos."
                }).encode("utf-8"))
                return

        # 0.1 API: Logout de Administrador
        if parsed_path == "/api/auth/logout":
            try:
                data = json.loads(body.decode("utf-8")) if body else {}
            except Exception:
                data = {}

            token = data.get("token") or self.get_session_token()
            remove_session(token)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Set-Cookie", "lynx_session=; Path=/; Max-Age=0; SameSite=Lax")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
            return

        # 1. API: Criar Nova Chave de API (Exige Autenticação)
        if parsed_path == "/api/keys":
            if not self.is_request_authenticated():
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Acesso restrito. Faça login primeiro."}).encode("utf-8"))
                return

            try:
                data = json.loads(body.decode("utf-8")) if body else {}
            except Exception:
                data = {}

            app_name = data.get("app", "Novo Aplicativo")
            random_token = secrets.token_urlsafe(24)
            new_key = {
                "id": f"key_{secrets.token_hex(6)}",
                "name": data.get("name", f"Chave {app_name}"),
                "key": f"lynx_sk_live_{random_token}",
                "app": app_name,
                "created_at": datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
                "status": "active"
            }

            keys = load_keys()
            keys.append(new_key)
            save_keys(keys)

            self.send_response(201)
            self.send_header("Content-Type", "application/json")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(new_key).encode("utf-8"))
            return

        # 2. API: Revogar / Deletar Chave de API (Exige Autenticação)
        if parsed_path == "/api/keys/revoke":
            if not self.is_request_authenticated():
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Acesso restrito. Faça login primeiro."}).encode("utf-8"))
                return

            try:
                data = json.loads(body.decode("utf-8"))
                key_id = data.get("id")
                keys = load_keys()
                keys = [k for k in keys if k.get("id") != key_id]
                save_keys(keys)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
                return
            except Exception as e:
                self.send_response(400)
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
                return

        # 3. Gateway Autenticado: /v1/chat/completions (OpenAI Compatible)
        if parsed_path in ["/v1/chat/completions", "/api/chat"]:
            # Validar Chave de API
            auth_header = self.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip()

            if not is_key_valid(token):
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                err_resp = {
                    "error": {
                        "message": "Chave de API inválida ou revogada. Gere uma chave válida no Lynx AI Hub.",
                        "type": "invalid_api_key",
                        "code": 401
                    }
                }
                self.wfile.write(json.dumps(err_resp).encode("utf-8"))
                return

            # Encaminhar para o Ollama na VPS via proxy_to_ollama resiliente
            try:
                with proxy_to_ollama(parsed_path, method="POST", data=body, headers={"Content-Type": "application/json"}, timeout=120) as resp:
                    self.send_response(resp.status)
                    for header, val in resp.getheaders():
                        if header.lower() not in ["content-length", "transfer-encoding"]:
                            self.send_header(header, val)
                    self.send_cors_headers()
                    self.end_headers()

                    # Transmite o corpo (inclusive streaming)
                    while True:
                        chunk = resp.read(1024)
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        self.wfile.flush()
                return
            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(e.read())
                return
            except Exception as e:
                self.send_response(502)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Erro de conexão com Ollama VPS: {str(e)}"}).encode("utf-8"))
                return

        self.send_response(404)
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(b"404: Rota nao encontrada no Gateway")

def run():
    # Inicializa as chaves se não existirem
    load_keys()
    server_address = ("", PORT)
    httpd = ThreadingHTTPServer(server_address, LynxGatewayHandler)
    print(f"🚀 Lynx AI Hub Gateway ativo em: http://localhost:{PORT}")
    print(f"📡 Candidatos Ollama: {OLLAMA_CANDIDATES}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
        httpd.server_close()

if __name__ == "__main__":
    run()
