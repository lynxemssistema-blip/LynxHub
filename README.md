# 🦁 Lynx AI Hub & Guia de Integração na VPS EasyPanel

> **Central de Inteligência Artificial Privada, Gratuita e de Alta Performance**  
> Hospedada na sua VPS **Hostinger KVM 8** (IP: `85.31.60.68`) com EasyPanel no Ubuntu 24.04.  
> **Com Suporte a API Keys, Protocolo MCP (Model Context Protocol) e Guias de Implementação.**

---

## 🔒 Garantia de Não Interferência (Zero Modificações no Existente)

Conforme sua solicitação estrita: **nenhuma alteração foi feita em seus outros projetos**:
- 🛡️ **`n8n_evo`** (Evolution API, n8n, Postgres, Redis para WhatsApp) &mdash; **100% Intocado**
- 🛡️ **`flr`** &mdash; **100% Intocado**
- 🛡️ **`horeb`** &mdash; **100% Intocado**
- 🛡️ **`izaque`** &mdash; **100% Intocado**
- 🛡️ **`sinco`** &mdash; **100% Intocado**

Trabalhamos **exclusivamente** dentro do seu projeto existente **`lynx_ai`** no serviço `ollama`.

---

## 🔍 Entendendo o Status da sua VPS e o Erro 404 Anterior

Sua VPS já está online e com a porta `11434` aberta e respondendo! Quando você testou e apareceu `404: Not Found`, o motivo foi simples:
- O seletor estava em `llama3.2:3b` (que ainda não havia sido baixado na VPS).
- Os modelos que **já estão baixados e prontos para uso imediato** na sua VPS são:
  1. `qwen2.5-coder:1.5b` (Super veloz, consome pouca memória, ótimo para respostas rápidas e código)
  2. `llama3:latest` (Modelo de 8B, muito inteligente e rico para conversas gerais)
  3. `codegemma:latest` (Modelo de 9B do Google especialista em programação)
  4. `gemma2:latest` (Modelo de 9.2B de última geração do Google DeepMind)

O aplicativo agora **detecta automaticamente** esses modelos reais da sua VPS e já deixa selecionado um modelo instalado por padrão!

---

## 🔑 1. Como Gerar e Usar API Keys pelo App

Agora o **Lynx AI Hub** possui um **Gerenciador de Chaves de API nativo**:

1. Acesse o painel em `http://localhost:8085` e clique na aba **"Gerar API Keys"**.
2. Digite um nome para a chave (ex: *Bot WhatsApp*, *App Mobile Flutter*, *SaaS Web*).
3. Clique em **"Criar Nova Chave de API"**.
4. Uma chave segura é gerada no padrão `lynx_sk_live_...` e salva em `keys.json`.
5. Nos seus aplicativos, envie essa chave no cabeçalho HTTP:
   ```http
   Authorization: Bearer lynx_sk_live_...
   ```
6. Você pode revogar qualquer chave com 1 clique a qualquer momento.

---

## 🔌 2. Conexão por MCP (Model Context Protocol)

O **Model Context Protocol (MCP)** permite conectar ferramentas como **Cursor, Claude Desktop, Antigravity IDE e Windsurf** diretamente à IA da sua VPS!

O arquivo [`mcp_server.py`](file:///c:/Users/lynx/Documents/Ai%20Lynx%20na%20VPS%20Easy%20Panel/mcp_server.py) já está pronto na pasta do projeto.

### Como adicionar no seu Claude Desktop ou Cursor:
Abra o arquivo de configuração de MCP (ex: `claude_desktop_config.json`) e cole:

```json
{
  "mcpServers": {
    "lynx-vps-ai": {
      "command": "python",
      "args": [
        "c:/Users/lynx/Documents/Ai Lynx na VPS Easy Panel/mcp_server.py"
      ]
    }
  }
}
```

### Ferramentas disponíveis no MCP:
- `ask_vps_ai`: Envia qualquer tarefa ou prompt para os modelos da VPS (`qwen2.5-coder:1.5b`, `llama3:latest`, etc.).
- `list_vps_models`: Lista os modelos instalados em tempo real.

---

## 📱 3. Como Aplicar nos Seus Aplicativos (Guia Prático)

A aba **"Como Aplicar nos Apps"** dentro do painel possui tutoriais visuais detalhados para cada cenário:

### A. Bot de WhatsApp (n8n + Evolution API já instalados na sua VPS!)
Como você já possui o projeto `n8n_evo`:
1. No n8n, crie um nó do tipo **HTTP Request**.
2. **Method:** `POST`
3. **URL:** `http://85.31.60.68:11434/v1/chat/completions` (ou `http://localhost:8085/v1/chat/completions`)
4. **Headers:**
   - `Content-Type`: `application/json`
   - `Authorization`: `Bearer SUA_CHAVE_GERADA`
5. **Body:**
   ```json
   {
     "model": "qwen2.5-coder:1.5b",
     "messages": [
       {
         "role": "system",
         "content": "Você é o atendente virtual da empresa. Responda em no máximo 2 frases curtas."
       },
       {
         "role": "user",
         "content": "={{ $json.body.data.message.conversation }}"
       }
     ]
   }
   ```
6. Conecte a saída `{{ $json.choices[0].message.content }}` no nó da **Evolution API** para enviar ao cliente no WhatsApp!

---

### B. Aplicativo Web (React, Vue, Next.js ou JavaScript Puro)
```javascript
async function perguntarIA(mensagem) {
  const response = await fetch("http://85.31.60.68:11434/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer SUA_CHAVE_GERADA"
    },
    body: JSON.stringify({
      model: "qwen2.5-coder:1.5b",
      messages: [
        { role: "system", content: "Você é um assistente prestativo." },
        { role: "user", content: mensagem }
      ],
      temperature: 0.7
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

---

### C. Aplicativo Mobile (Flutter / Dart)
```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<String> chamarIA(String prompt) async {
  final url = Uri.parse('http://85.31.60.68:11434/v1/chat/completions');
  
  final res = await http.post(
    url,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer SUA_CHAVE_GERADA',
    },
    body: jsonEncode({
      'model': 'qwen2.5-coder:1.5b',
      'messages': [{'role': 'user', 'content': prompt}]
    }),
  );

  final data = jsonDecode(utf8.decode(res.bodyBytes));
  return data['choices'][0]['message']['content'];
}
```

---

## 🚀 Como Iniciar a Central Web

O servidor do painel web com o gateway de autenticação está rodando na porta 8085:

```bash
# Para iniciar manualmente caso reinicie o PC:
python server.py
```
Acesse no seu navegador: **`http://localhost:8085`**
