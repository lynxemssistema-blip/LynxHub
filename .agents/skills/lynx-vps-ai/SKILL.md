---
name: lynx-vps-ai
description: >-
  Permite ao Antigravity consultar diretamente os modelos de IA gratuitos rodando na sua VPS Hostinger (85.31.60.68)
  via MCP ou API REST (qwen2.5-coder:1.5b, llama3:latest, codegemma:latest, gemma2:latest).
---

# Lynx VPS AI Integration Skill

Esta habilidade permite que o Antigravity interaja diretamente com os modelos de IA hospedados na sua VPS EasyPanel.

## Modelos Disponíveis na VPS (IP: 85.31.60.68)

- `qwen2.5-coder:1.5b`: Excelente para geração rápida de código, funções e respostas curtas.
- `llama3:latest`: Modelo de 8B de alta precisão para raciocínio e conversas gerais.
- `codegemma:latest`: Modelo de 9B do Google especialista em arquitetura e código.
- `gemma2:latest`: Modelo de 9.2B de última geração para tarefas avançadas.

## Como Usar

### 1. Via Ferramentas MCP (Integrado ao Antigravity)
O servidor MCP `lynx-vps-ai` disponibiliza as seguintes ferramentas nativas:
- `ask_vps_ai(prompt, model, system_prompt)`: Envia uma requisição direta ao Ollama da VPS.
- `list_vps_models()`: Lista os modelos ativos na VPS.

### 2. Via Chamadas HTTP Diretas
O endpoint `/v1/chat/completions` está disponível em:
- Gateway Local: `http://localhost:8085/v1/chat/completions` (com Bearer token)
- Direto na VPS: `http://85.31.60.68:11434/v1/chat/completions`
