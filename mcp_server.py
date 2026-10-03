#!/usr/bin/env python3
"""
Lynx AI Hub - Servidor MCP (Model Context Protocol)
Permite conectar ferramentas como Cursor, Claude Desktop, Antigravity IDE
e outros clientes MCP diretamente aos modelos de IA da sua VPS (85.31.60.68).
"""

import os
import sys
import json
import urllib.request
import urllib.error

# Forçar UTF-8 no stdio do Windows
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stdin.reconfigure(encoding="utf-8")
    except Exception:
        pass

# URL do servidor: pode ser o domínio oficial com SSL ou a VPS direta
VPS_HUB_URL = os.environ.get("LYNX_HUB_URL", "https://lynxhub.lynxems.com.br")
VPS_OLLAMA_URL = os.environ.get("VPS_OLLAMA_URL", "http://85.31.60.68:11434")
DEFAULT_MODEL = os.environ.get("LYNX_MODEL", "qwen2.5-coder:1.5b")

# Permite passar --model via argumento de linha de comando
for i, arg in enumerate(sys.argv):
    if arg == "--model" and i + 1 < len(sys.argv):
        DEFAULT_MODEL = sys.argv[i + 1]
    elif arg.startswith("--model="):
        DEFAULT_MODEL = arg.split("=", 1)[1]

def query_ollama(model=None, prompt="", system_prompt=""):
    """Envia uma mensagem para a IA e retorna o texto gerado."""
    chosen_model = model or DEFAULT_MODEL
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": chosen_model,
        "messages": messages,
        "stream": False
    }

    payload_bytes = json.dumps(payload).encode("utf-8")
    
    # 1. Tenta direto na VPS
    req_vps = urllib.request.Request(
        f"{VPS_OLLAMA_URL}/api/chat",
        data=payload_bytes,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req_vps, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("message", {}).get("content", "")
    except Exception as e_vps:
        # 2. Fallback: tenta pelo Gateway HTTPS do domínio
        try:
            import ssl
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            req_hub = urllib.request.Request(
                f"{VPS_HUB_URL}/v1/chat/completions",
                data=payload_bytes,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req_hub, context=ctx, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                choices = data.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "")
        except Exception:
            pass
        return f"Erro ao comunicar com a VPS Lynx AI: {str(e_vps)}"

def list_installed_models():
    """Retorna os modelos instalados no Ollama da VPS."""
    try:
        with urllib.request.urlopen(f"{VPS_OLLAMA_URL}/api/tags", timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return [m.get("name") for m in data.get("models", [])]
    except Exception as e:
        return ["llama3:latest", "qwen2.5-coder:1.5b", "codegemma:latest", "gemma2:latest"]

def send_response(response_dict):
    """Envia uma mensagem JSON-RPC para stdout."""
    line = json.dumps(response_dict)
    sys.stdout.write(line + "\n")
    sys.stdout.flush()

def handle_mcp():
    """Loop principal do protocolo MCP Stdio."""
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except Exception:
            continue

        method = req.get("method")
        msg_id = req.get("id")

        # 1. Inicialização do MCP
        if method == "initialize":
            send_response({
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "serverInfo": {
                        "name": "lynx-vps-ai-mcp",
                        "version": "1.0.0"
                    },
                    "capabilities": {
                        "tools": {}
                    }
                }
            })

        # 2. Confirmação de Inicialização
        elif method == "notifications/initialized":
            pass

        # 3. Lista de Ferramentas disponíveis via MCP
        elif method == "tools/list":
            send_response({
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "tools": [
                        {
                            "name": "ask_vps_ai",
                            "description": "Envia um prompt para qualquer modelo de IA gratuito rodando na sua VPS Hostinger (85.31.60.68).",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "prompt": {
                                        "type": "string",
                                        "description": "A pergunta, tarefa ou instrução para a IA."
                                    },
                                    "model": {
                                        "type": "string",
                                        "description": "O modelo desejado (ex: qwen2.5-coder:1.5b, llama3:latest, codegemma:latest)",
                                        "default": "qwen2.5-coder:1.5b"
                                    },
                                    "system_prompt": {
                                        "type": "string",
                                        "description": "Instruções do sistema para guiar a resposta da IA.",
                                        "default": ""
                                    }
                                },
                                "required": ["prompt"]
                            }
                        },
                        {
                            "name": "list_vps_models",
                            "description": "Lista todos os modelos de IA disponíveis e prontos na sua VPS EasyPanel.",
                            "inputSchema": {
                                "type": "object",
                                "properties": {}
                            }
                        }
                    ]
                }
            })

        # 4. Execução de Ferramentas
        elif method == "tools/call":
            params = req.get("params", {})
            tool_name = params.get("name")
            arguments = params.get("arguments", {})

            if tool_name == "ask_vps_ai":
                prompt = arguments.get("prompt", "")
                model = arguments.get("model", "qwen2.5-coder:1.5b")
                system_prompt = arguments.get("system_prompt", "")

                output = query_ollama(model, prompt, system_prompt)

                send_response({
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": output
                            }
                        ]
                    }
                })

            elif tool_name == "list_vps_models":
                models = list_installed_models()
                models_text = "Modelos instalados na sua VPS EasyPanel:\n" + "\n".join([f"- {m}" for m in models])

                send_response({
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": models_text
                            }
                        ]
                    }
                })

            else:
                send_response({
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "error": {
                        "code": -32601,
                        "message": f"Ferramenta desconhecida: {tool_name}"
                    }
                })

        # Resposta padrão para métodos não tratados
        elif msg_id is not None:
            send_response({
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {}
            })

if __name__ == "__main__":
    handle_mcp()
