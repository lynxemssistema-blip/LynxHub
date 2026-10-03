#!/usr/bin/env python3
"""
Script de Compilação & Empacotamento do Lynx AI Hub
Prepara a aplicação para publicação na Hostinger (EasyPanel VPS ou Hospedagem Web).
"""

import os
import sys
import shutil
import zipfile

# Forçar UTF-8 no Windows
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, "dist")
ZIP_FILE = os.path.join(BASE_DIR, "lynx-ai-hub-hostinger.zip")

FILES_TO_PACKAGE = [
    "index.html",
    "styles.css",
    "app.js",
    "server.py",
    "keys.json",
    "mcp_server.py",
    "Dockerfile",
    "docker-compose.yml",
    "README.md"
]

def build():
    print("=" * 60)
    print("🚀 INICIANDO COMPILAÇÃO & EMPACOTAMENTO DO LYNX AI HUB")
    print("=" * 60)

    # 1. Limpa ou cria pasta dist
    if os.path.exists(DIST_DIR):
        shutil.rmtree(DIST_DIR)
    os.makedirs(DIST_DIR, exist_ok=True)
    print(f"📁 Pasta de distribuição criada: {DIST_DIR}")

    # 2. Copia os arquivos essenciais
    copied_count = 0
    for filename in FILES_TO_PACKAGE:
        src = os.path.join(BASE_DIR, filename)
        if os.path.exists(src):
            dst = os.path.join(DIST_DIR, filename)
            shutil.copy2(src, dst)
            size_kb = os.path.getsize(dst) / 1024
            print(f"   ✓ Copiado: {filename:<20} ({size_kb:.1f} KB)")
            copied_count += 1
        else:
            print(f"   ⚠️ Aviso: Arquivo não encontrado: {filename}")

    # 3. Cria o arquivo ZIP pronto para upload na Hostinger
    print("\n📦 Gerando pacote ZIP para upload na Hostinger...")
    if os.path.exists(ZIP_FILE):
        os.remove(ZIP_FILE)

    with zipfile.ZipFile(ZIP_FILE, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(DIST_DIR):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, DIST_DIR)
                zipf.write(full_path, rel_path)

    zip_size_kb = os.path.getsize(ZIP_FILE) / 1024
    print(f"🎉 Pacote final gerado com sucesso: lynx-ai-hub-hostinger.zip ({zip_size_kb:.1f} KB)")
    print("\n" + "=" * 60)
    print("✅ COMPILAÇÃO CONCLUÍDA! ARTEFATOS PRONTOS:")
    print(f"1. Pasta: {DIST_DIR}")
    print(f"2. Arquivo Zip: {ZIP_FILE}")
    print("=" * 60)

if __name__ == "__main__":
    build()
