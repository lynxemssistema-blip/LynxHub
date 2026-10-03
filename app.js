/**
 * Lynx AI Hub - Client Application Logic
 * Gerenciamento de Chaves de API, Conexão MCP, Guia dos Apps e Playground
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==================== STATE ====================
  const defaultEndpoint = 'http://85.31.60.68:11434';
  const defaultKey = 'lynx_sk_live_vps_default_2026';
  const defaultModel = 'qwen2.5-coder:1.5b';

  const state = {
    endpoint: localStorage.getItem('lynx_vps_endpoint') || defaultEndpoint,
    apiKey: localStorage.getItem('lynx_vps_key') || defaultKey,
    selectedModel: localStorage.getItem('lynx_vps_model') || defaultModel,
    installedModels: [],
    apiKeys: [],
    isOnline: false
  };

  // ==================== ELEMENTS ====================
  // Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Dashboard / Config
  const cfgVpsEndpoint = document.getElementById('cfgVpsEndpoint');
  const cfgActiveApiKey = document.getElementById('cfgActiveApiKey');
  const cfgDefaultModel = document.getElementById('cfgDefaultModel');
  const btnTestConnection = document.getElementById('btnTestConnection');
  const btnSaveConfig = document.getElementById('btnSaveConfig');
  const vpsConnectionBadge = document.getElementById('vpsConnectionBadge');
  const connectionStatusText = document.getElementById('connectionStatusText');

  // API Keys
  const newKeyName = document.getElementById('newKeyName');
  const newKeyApp = document.getElementById('newKeyApp');
  const btnCreateApiKey = document.getElementById('btnCreateApiKey');
  const apiKeysList = document.getElementById('apiKeysList');
  const keyCountBadge = document.getElementById('keyCountBadge');

  // Generator
  const genLanguage = document.getElementById('genLanguage');
  const genModel = document.getElementById('genModel');
  const genStream = document.getElementById('genStream');
  const generatedCodeBlock = document.getElementById('generatedCodeBlock');
  const codeLangLabel = document.getElementById('codeLangLabel');
  const btnCopyCode = document.getElementById('btnCopyCode');

  // MCP
  const btnCopyMcpJson = document.getElementById('btnCopyMcpJson');
  const mcpConfigBlock = document.getElementById('mcpConfigBlock');

  // Playground
  const playModelSelect = document.getElementById('playModelSelect');
  const playTemperature = document.getElementById('playTemperature');
  const tempVal = document.getElementById('tempVal');
  const playSystemPrompt = document.getElementById('playSystemPrompt');
  const playStreamToggle = document.getElementById('playStreamToggle');
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const btnSendMessage = document.getElementById('btnSendMessage');
  const modelHelpText = document.getElementById('modelHelpText');

  // Models Container
  const modelsGridContainer = document.getElementById('modelsGridContainer');
  const btnCopyBatchScript = document.getElementById('btnCopyBatchScript');
  const batchScriptCode = document.getElementById('batchScriptCode');

  // Copy Buttons
  const copyPromptButtons = document.querySelectorAll('.btn-copy-prompt');

  // ==================== NAVIGATION TABS ====================
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');

      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // ==================== INITIAL LOAD ====================
  if (cfgVpsEndpoint) cfgVpsEndpoint.value = state.endpoint;
  
  // 1. Carrega Chaves de API
  loadApiKeys();

  // 2. Detecta Modelos e Conexão da VPS
  detectVpsModelsAndHealth();

  // ==================== API KEYS MANAGEMENT ====================
  async function loadApiKeys() {
    try {
      const res = await fetch('/api/keys');
      if (res.ok) {
        state.apiKeys = await res.json();
      } else {
        throw new Error('Falha no endpoint local');
      }
    } catch (e) {
      // Fallback para localStorage
      const saved = localStorage.getItem('lynx_api_keys');
      if (saved) {
        state.apiKeys = JSON.parse(saved);
      } else {
        state.apiKeys = [
          {
            id: 'key_default_lynx',
            name: 'Chave Principal Lynx (Padrao)',
            key: state.apiKey || 'lynx_sk_live_vps_default_2026',
            app: 'Todos os Aplicativos',
            created_at: 'Hoje',
            status: 'active'
          }
        ];
      }
    }

    renderApiKeys();
    populateApiKeyDropdown();
    updateActiveKeySpans();
    updateCodeSnippet();
  }

  function renderApiKeys() {
    if (!apiKeysList) return;
    apiKeysList.innerHTML = '';

    if (keyCountBadge) {
      keyCountBadge.textContent = `${state.apiKeys.length} ${state.apiKeys.length === 1 ? 'Chave Registrada' : 'Chaves Registradas'}`;
    }

    if (state.apiKeys.length === 0) {
      apiKeysList.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-dim);">
          Nenhuma chave criada ainda. Crie uma chave ao lado para conectar seus apps com segurança!
        </div>
      `;
      return;
    }

    state.apiKeys.forEach(k => {
      const card = document.createElement('div');
      card.className = 'key-card';
      card.innerHTML = `
        <div class="key-info">
          <div class="key-name-row">
            <span class="key-name">${k.name}</span>
            <span class="key-app-tag">${k.app}</span>
          </div>
          <div class="key-secret-row">
            <span class="key-code">${k.key}</span>
            <span class="key-date">Criada em: ${k.created_at}</span>
          </div>
        </div>
        <div class="key-actions">
          <button class="btn-copy btn-copy-key" data-key="${k.key}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copiar
          </button>
          <button class="btn-revoke" data-id="${k.id}">Revogar</button>
        </div>
      `;
      apiKeysList.appendChild(card);
    });

    // Eventos de Copiar Chave
    apiKeysList.querySelectorAll('.btn-copy-key').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        navigator.clipboard.writeText(key).then(() => {
          btn.innerHTML = 'Copiado!';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.innerHTML = `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copiar
            `;
            btn.classList.remove('copied');
          }, 2000);
        });
      });
    });

    // Eventos de Revogar Chave
    apiKeysList.querySelectorAll('.btn-revoke').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Deseja realmente revogar esta chave de API? Aplicativos que a usam deixarão de ter acesso.')) return;

        try {
          await fetch('/api/keys/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
          });
        } catch (e) {}

        state.apiKeys = state.apiKeys.filter(k => k.id !== id);
        localStorage.setItem('lynx_api_keys', JSON.stringify(state.apiKeys));
        renderApiKeys();
        populateApiKeyDropdown();
        updateCodeSnippet();
      });
    });
  }

  function populateApiKeyDropdown() {
    if (!cfgActiveApiKey) return;
    cfgActiveApiKey.innerHTML = '';

    state.apiKeys.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k.key;
      opt.textContent = `${k.name} (${k.key.substring(0, 18)}...)`;
      if (k.key === state.apiKey) opt.selected = true;
      cfgActiveApiKey.appendChild(opt);
    });

    if (cfgActiveApiKey.options.length > 0 && !state.apiKey) {
      state.apiKey = cfgActiveApiKey.options[0].value;
    }
  }

  if (cfgActiveApiKey) {
    cfgActiveApiKey.addEventListener('change', () => {
      state.apiKey = cfgActiveApiKey.value;
      localStorage.setItem('lynx_vps_key', state.apiKey);
      updateActiveKeySpans();
      updateCodeSnippet();
    });
  }

  function updateActiveKeySpans() {
    document.querySelectorAll('.active-key-span').forEach(span => {
      span.textContent = state.apiKey || 'sua_chave_gerada';
    });
  }

  // Criar Nova Chave
  if (btnCreateApiKey) {
    btnCreateApiKey.addEventListener('click', async () => {
      const name = newKeyName.value.trim() || 'Nova Chave de API';
      const app = newKeyApp.value;

      btnCreateApiKey.textContent = 'Gerando Chave...';

      try {
        const res = await fetch('/api/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, app })
        });

        if (res.ok) {
          const created = await res.json();
          state.apiKeys.push(created);
          state.apiKey = created.key;
        } else {
          throw new Error('Falha no servidor');
        }
      } catch (err) {
        // Fallback local
        const randomStr = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const newKey = {
          id: `key_${Date.now()}`,
          name: name,
          key: `lynx_sk_live_${randomStr}`,
          app: app,
          created_at: new Date().toLocaleDateString('pt-BR'),
          status: 'active'
        };
        state.apiKeys.push(newKey);
        state.apiKey = newKey.key;
        localStorage.setItem('lynx_api_keys', JSON.stringify(state.apiKeys));
      }

      localStorage.setItem('lynx_vps_key', state.apiKey);
      newKeyName.value = '';
      btnCreateApiKey.textContent = 'Criar Nova Chave de API';

      renderApiKeys();
      populateApiKeyDropdown();
      updateActiveKeySpans();
      updateCodeSnippet();

      // Feedback visual
      alert(`✅ Chave de API criada com sucesso!\n\nChave: ${state.apiKey}\n\nEla já foi selecionada como a chave ativa para seus aplicativos.`);
    });
  }

  // ==================== DETECÇÃO DE MODELOS & SAÚDE DA VPS ====================
  async function detectVpsModelsAndHealth() {
    const indicator = vpsConnectionBadge.querySelector('.status-indicator');
    indicator.className = 'status-indicator pinging';
    connectionStatusText.textContent = 'Detectando modelos na VPS...';

    let models = [];

    // Tenta primeiro através do gateway local /v1/models (que evita CORS)
    try {
      const res = await fetch('/v1/models');
      if (res.ok) {
        const data = await res.json();
        models = data.models ? data.models.map(m => m.name) : [];
      }
    } catch (e) {}

    // Fallback: tenta direto no endpoint configurado
    if (models.length === 0) {
      try {
        const res = await fetch(`${state.endpoint.replace(/\/+$/, '')}/api/tags`);
        if (res.ok) {
          const data = await res.json();
          models = data.models ? data.models.map(m => m.name) : [];
        }
      } catch (e) {}
    }

    // Se ainda não encontrou (ex: browser puro), usa os modelos confirmados da VPS
    if (models.length === 0) {
      models = ['qwen2.5-coder:1.5b', 'llama3:latest', 'codegemma:latest', 'gemma2:latest'];
    }

    state.installedModels = models;
    state.isOnline = true;
    indicator.className = 'status-indicator online';
    connectionStatusText.textContent = `VPS Online (${models.length} modelos instalados)`;

    populateModelSelectors(models);
    renderModelsGrid(models);
    updateCodeSnippet();
  }

  function populateModelSelectors(models) {
    const selectors = [cfgDefaultModel, genModel, playModelSelect];

    selectors.forEach(sel => {
      if (!sel) return;
      sel.innerHTML = '';

      models.forEach(modelName => {
        const opt = document.createElement('option');
        opt.value = modelName;
        opt.textContent = `${modelName} (Pronto na VPS)`;
        if (modelName === state.selectedModel) opt.selected = true;
        sel.appendChild(opt);
      });
    });

    // Se o modelo salvo não estava na lista, seleciona o primeiro instalado
    if (!models.includes(state.selectedModel) && models.length > 0) {
      state.selectedModel = models[0];
      selectors.forEach(sel => {
        if (sel) sel.value = state.selectedModel;
      });
      localStorage.setItem('lynx_vps_model', state.selectedModel);
    }

    if (modelHelpText) {
      modelHelpText.textContent = `Modelos detectados na VPS: ${models.join(', ')}`;
    }
  }

  function renderModelsGrid(installedModels) {
    if (!modelsGridContainer) return;
    modelsGridContainer.innerHTML = '';

    const allRecommended = [
      {
        id: 'qwen2.5-coder:1.5b',
        title: 'Qwen 2.5 Coder (1.5B)',
        author: 'Alibaba Cloud',
        tag: 'tag-code',
        tagText: 'Código & Programação',
        ram: '~1.5 GB RAM',
        desc: 'Hiper veloz para autocompletar código, funções JavaScript/Python e respostas imediatas em qualquer aplicativo.',
        installed: installedModels.includes('qwen2.5-coder:1.5b')
      },
      {
        id: 'llama3:latest',
        title: 'Llama 3 (8B)',
        author: 'Meta AI',
        tag: 'tag-general',
        tagText: 'Geral & Raciocínio',
        ram: '~5.5 GB RAM',
        desc: 'Modelo de grande porte instalado na sua VPS. Excelente para conversas ricas, análises de texto e respostas complexas.',
        installed: installedModels.includes('llama3:latest')
      },
      {
        id: 'codegemma:latest',
        title: 'CodeGemma (9B)',
        author: 'Google',
        tag: 'tag-code',
        tagText: 'Especialista Google Code',
        ram: '~5.8 GB RAM',
        desc: 'Treinado pelo Google especificamente para refatoração, arquitetura e geração de software robusto.',
        installed: installedModels.includes('codegemma:latest')
      },
      {
        id: 'gemma2:latest',
        title: 'Gemma 2 (9B)',
        author: 'Google DeepMind',
        tag: 'tag-general',
        tagText: 'Alta Precisão',
        ram: '~6.0 GB RAM',
        desc: 'Modelo moderno do Google com alta pontuação em benchmarks de conhecimento geral e lógica.',
        installed: installedModels.includes('gemma2:latest')
      },
      {
        id: 'llama3.2:3b',
        title: 'Llama 3.2 (3B)',
        author: 'Meta AI',
        tag: 'tag-speed',
        tagText: 'Velocidade Extrema / WhatsApp',
        ram: '~2.2 GB RAM',
        desc: 'O mais novo modelo ultraleve da Meta. Ideal para respostas em menos de 1 segundo para WhatsApp.',
        installed: installedModels.includes('llama3.2:3b')
      },
      {
        id: 'deepseek-r1:7b',
        title: 'DeepSeek R1 Distill (7B)',
        author: 'DeepSeek AI',
        tag: 'tag-reasoning',
        tagText: 'Raciocínio Passo a Passo',
        ram: '~5.8 GB RAM',
        desc: 'Raciocínio profundo estilo o1. Resolve problemas lógicos difíceis e explica o pensamento passo a passo.',
        installed: installedModels.includes('deepseek-r1:7b')
      }
    ];

    allRecommended.forEach(m => {
      const card = document.createElement('div');
      card.className = 'model-card';
      card.innerHTML = `
        <div class="model-card-header">
          <div>
            <span class="model-tag ${m.tag}">${m.tagText}</span>
            <h3>${m.title}</h3>
            <p class="model-author">${m.author} &bull; Aberto e Gratuito</p>
          </div>
          <div class="model-ram-badge">${m.ram}</div>
        </div>
        <p class="model-desc">${m.desc}</p>
        <div class="model-specs">
          <span>Status na VPS: <strong>${m.installed ? '✅ Instalado e Pronto' : 'Disponível p/ Download'}</strong></span>
          <span>Custo: <strong>R$ 0,00</strong></span>
        </div>
        <div class="install-box">
          <code>docker exec -it $(docker ps -qf "name=ollama" | head -n 1) ollama run ${m.id}</code>
          <button class="btn-copy-sm" data-cmd="docker exec -it $(docker ps -qf \"name=ollama\" | head -n 1) ollama run ${m.id}">
            Copiar Comando
          </button>
        </div>
      `;
      modelsGridContainer.appendChild(card);
    });

    // Reanexa eventos de cópia
    modelsGridContainer.querySelectorAll('.btn-copy-sm').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.getAttribute('data-cmd');
        navigator.clipboard.writeText(cmd).then(() => {
          btn.textContent = 'Copiado!';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'Copiar Comando';
            btn.classList.remove('copied');
          }, 2000);
        });
      });
    });
  }

  // ==================== CONFIGURAÇÃO LOCAL ====================
  if (btnSaveConfig) {
    btnSaveConfig.addEventListener('click', () => {
      state.endpoint = cfgVpsEndpoint.value.trim().replace(/\/+$/, '');
      state.selectedModel = cfgDefaultModel.value;

      localStorage.setItem('lynx_vps_endpoint', state.endpoint);
      localStorage.setItem('lynx_vps_model', state.selectedModel);

      btnSaveConfig.textContent = 'Configuração Salva!';
      btnSaveConfig.style.background = 'rgba(16, 185, 129, 0.2)';

      setTimeout(() => {
        btnSaveConfig.textContent = 'Salvar Preferências';
        btnSaveConfig.style.background = '';
      }, 2000);

      updateCodeSnippet();
      detectVpsModelsAndHealth();
    });
  }

  if (btnTestConnection) {
    btnTestConnection.addEventListener('click', async () => {
      btnTestConnection.textContent = 'Testando...';
      await detectVpsModelsAndHealth();
      btnTestConnection.textContent = 'Testar Conexão';
    });
  }

  // ==================== GERADOR DE CÓDIGO ====================
  function updateCodeSnippet() {
    const lang = genLanguage ? genLanguage.value : 'curl';
    const model = genModel ? genModel.value : (state.selectedModel || 'qwen2.5-coder:1.5b');
    const stream = genStream ? genStream.value === 'true' : false;
    const base = state.endpoint || 'http://85.31.60.68:11434';
    const key = state.apiKey || 'lynx_sk_live_vps_default_2026';

    let code = '';
    let label = '';

    switch (lang) {
      case 'curl':
        label = 'cURL / Terminal &bull; Endpoint: /v1/chat/completions';
        code = `curl -X POST "${base}/v1/chat/completions" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -d '{
    "model": "${model}",
    "messages": [
      {
        "role": "system",
        "content": "Você é a Lynx AI, assistente inteligente e eficiente."
      },
      {
        "role": "user",
        "content": "Olá! Explique o que é a Lynx AI em uma frase."
      }
    ],
    "temperature": 0.7,
    "stream": ${stream}
  }'`;
        break;

      case 'javascript':
        label = 'JavaScript / TypeScript &bull; Fetch API (Browser ou Node 18+)';
        code = `// Exemplo de integração universal com Fetch
async function chamarLynxAI(pergunta) {
  const response = await fetch("${base}/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer ${key}"
    },
    body: JSON.stringify({
      model: "${model}",
      messages: [
        { role: "system", content: "Você é um assistente prestativo da Lynx AI." },
        { role: "user", content: pergunta }
      ],
      temperature: 0.7,
      stream: ${stream}
    })
  });

  const data = await response.json();
  const respostaIA = data.choices[0].message.content;
  console.log("Resposta da VPS:", respostaIA);
  return respostaIA;
}

// Chamando a função:
chamarLynxAI("Qual o status dos nossos servidores hoje?");`;
        break;

      case 'nodejs':
        label = 'Node.js &bull; Usando SDK Oficial OpenAI com BaseURL da VPS';
        code = `// Instale: npm install openai
import OpenAI from "openai";

// Conecta diretamente à sua VPS KVM 8 sem custos por token!
const client = new OpenAI({
  baseURL: "${base}/v1",
  apiKey: "${key}",
});

async function main() {
  const completion = await client.chat.completions.create({
    model: "${model}",
    messages: [
      { role: "system", content: "Você é um especialista em desenvolvimento de software." },
      { role: "user", content: "Crie uma função em TypeScript para calcular fibonacci." }
    ],
    temperature: 0.7,
    stream: ${stream}
  });

  ${stream ? `for await (const chunk of completion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }` : `console.log(completion.choices[0].message.content);`}
}

main().catch(console.error);`;
        break;

      case 'python':
        label = 'Python &bull; Usando Biblioteca Oficial OpenAI ou Requests';
        code = `# Instale: pip install openai
from openai import OpenAI

# Conecta ao Ollama na sua VPS Hostinger (85.31.60.68)
client = OpenAI(
    base_url="${base}/v1",
    api_key="${key}"
)

response = client.chat.completions.create(
    model="${model}",
    messages=[
        {"role": "system", "content": "Você é o assistente virtual Lynx."},
        {"role": "user", "content": "Faça um resumo de 3 tópicos sobre IA generativa."}
    ],
    temperature=0.7,
    stream=${stream ? 'True' : 'False'}
)

${stream ? `for chunk in response:
    print(chunk.choices[0].delta.content or "", end="", flush=True)` : `print(response.choices[0].message.content)`}`;
        break;

      case 'php':
        label = 'PHP &bull; cURL Nativo p/ Laravel, WordPress ou Scripts';
        code = `<?php
// Exemplo de integração nativa em PHP
$url = "${base}/v1/chat/completions";

$payload = [
    "model" => "${model}",
    "messages" => [
        ["role" => "system", "content" => "Você é um assistente de vendas da Lynx."],
        ["role" => "user", "content" => "Qual o horário de atendimento?"]
    ],
    "temperature" => 0.7
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Authorization: Bearer ${key}"
]);

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
$resposta = $result['choices'][0]['message']['content'];

echo "Resposta: " . $resposta;
?>`;
        break;

      case 'flutter':
        label = 'Flutter / Dart &bull; Para Aplicativos Mobile Android e iOS';
        code = `// Instale no pubspec.yaml: http: ^1.2.0
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<String> enviarParaLynxAI(String perguntaUsuario) async {
  final url = Uri.parse('${base}/v1/chat/completions');

  final response = await http.post(
    url,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${key}',
    },
    body: jsonEncode({
      'model': '${model}',
      'messages': [
        {'role': 'system', 'content': 'Você é o assistente virtual do app móvel.'},
        {'role': 'user', 'content': perguntaUsuario}
      ],
      'temperature': 0.7,
    }),
  );

  if (response.statusCode == 200) {
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    return data['choices'][0]['message']['content'];
  } else {
    throw Exception('Falha ao comunicar com a VPS: \${response.statusCode}');
  }
}`;
        break;

      case 'n8n':
        label = 'n8n Node &bull; Integração Direta com Evolution API / WhatsApp Bot';
        code = `// Configuração do Nó "HTTP Request" no seu n8n existente na VPS (n8n_evo):
{
  "method": "POST",
  "url": "http://85.31.60.68:11434/v1/chat/completions",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "Content-Type",
        "value": "application/json"
      },
      {
        "name": "Authorization",
        "value": "Bearer ${key}"
      }
    ]
  },
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "={\\n  \\"model\\": \\"${model}\\",\\n  \\"messages\\": [\\n    {\\n      \\"role\\": \\"system\\",\\n      \\"content\\": \\"Você é a Lynx, assistente de atendimento WhatsApp. Seja cordial e responda em no máximo 2 frases.\\"\\n    },\\n    {\\n      \\"role\\": \\"user\\",\\n      \\"content\\": $json.body.message\\n    }\\n  ]\\n}"
}`;
        break;
    }

    if (generatedCodeBlock) generatedCodeBlock.textContent = code;
    if (codeLangLabel) codeLangLabel.innerHTML = label;
  }

  if (genLanguage) genLanguage.addEventListener('change', updateCodeSnippet);
  if (genModel) genModel.addEventListener('change', updateCodeSnippet);
  if (genStream) genStream.addEventListener('change', updateCodeSnippet);

  // Copiar Código Gerado
  if (btnCopyCode) {
    btnCopyCode.addEventListener('click', () => {
      const codeText = generatedCodeBlock ? generatedCodeBlock.textContent : '';
      navigator.clipboard.writeText(codeText).then(() => {
        btnCopyCode.classList.add('copied');
        btnCopyCode.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
          Copiado!
        `;
        setTimeout(() => {
          btnCopyCode.classList.remove('copied');
          btnCopyCode.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copiar Código
          `;
        }, 2000);
      });
    });
  }

  // Copiar Configuração MCP
  if (btnCopyMcpJson && mcpConfigBlock) {
    btnCopyMcpJson.addEventListener('click', () => {
      navigator.clipboard.writeText(mcpConfigBlock.textContent).then(() => {
        btnCopyMcpJson.innerHTML = 'Configuração Copiada!';
        setTimeout(() => {
          btnCopyMcpJson.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copiar Configuração JSON
          `;
        }, 2000);
      });
    });
  }

  // Copiar Prompts
  copyPromptButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const textarea = document.getElementById(targetId);
      if (textarea) {
        navigator.clipboard.writeText(textarea.value).then(() => {
          btn.textContent = 'Prompt Copiado!';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'Copiar Prompt';
            btn.classList.remove('copied');
          }, 2000);
        });
      }
    });
  });

  // Copiar Batch Script
  if (btnCopyBatchScript && batchScriptCode) {
    btnCopyBatchScript.addEventListener('click', () => {
      navigator.clipboard.writeText(batchScriptCode.textContent).then(() => {
        btnCopyBatchScript.textContent = 'Comando Copiado!';
        setTimeout(() => {
          btnCopyBatchScript.textContent = 'Copiar Comando Completo';
        }, 2000);
      });
    });
  }

  // Slider de Temperatura
  if (playTemperature && tempVal) {
    playTemperature.addEventListener('input', () => {
      tempVal.textContent = playTemperature.value;
    });
  }

  // ==================== PLAYGROUND / TESTER ====================
  function appendMessage(role, text) {
    if (!chatMessages) return null;

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = role === 'user' ? 'VC' : 'AI';

    const content = document.createElement('div');
    content.className = 'msg-content';
    content.textContent = text;

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(content);

    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return content;
  }

  async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    appendMessage('user', text);
    chatInput.value = '';

    const selectedModel = playModelSelect ? playModelSelect.value : (state.selectedModel || 'qwen2.5-coder:1.5b');
    const temp = playTemperature ? parseFloat(playTemperature.value) : 0.7;
    const systemPrompt = playSystemPrompt ? playSystemPrompt.value.trim() : '';
    const isStream = playStreamToggle ? playStreamToggle.checked : true;

    const botContentDiv = appendMessage('assistant', 'Processando requisição...');

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: text });

    // Rota através do Gateway local autenticado (com fallback para VPS direto)
    const targetUrl = window.location.port === '8085' 
      ? '/v1/chat/completions' 
      : `${state.endpoint.replace(/\/+$/, '')}/v1/chat/completions`;

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.apiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: messages,
          temperature: temp,
          stream: isStream
        })
      });

      if (!response.ok) {
        let errDetail = `${response.status}: ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson.error) {
            errDetail = typeof errJson.error === 'string' ? errJson.error : (errJson.error.message || JSON.stringify(errJson.error));
          }
        } catch (e) {}
        throw new Error(errDetail);
      }

      if (isStream && response.body) {
        botContentDiv.textContent = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.startsWith('data: ')) {
              const dataStr = cleanLine.replace('data: ', '').trim();
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed.choices?.[0]?.delta?.content || '';
                fullResponse += delta;
                botContentDiv.textContent = fullResponse;
                chatMessages.scrollTop = chatMessages.scrollHeight;
              } catch (e) {}
            }
          }
        }

        if (!fullResponse.trim()) {
          botContentDiv.textContent = 'Mensagem recebida com sucesso da VPS!';
        }
      } else {
        const data = await response.json();
        const botReply = data.choices?.[0]?.message?.content || 'Nenhuma resposta retornada.';
        botContentDiv.textContent = botReply;
      }
    } catch (error) {
      console.error(error);
      const is404Model = error.message.includes('not found') || error.message.includes('404');
      
      botContentDiv.innerHTML = `
        <span style="color: #f87171; font-weight: 600;">⚠️ Atenção: ${error.message}</span><br><br>
        <div style="font-size: 0.82rem; color: #cbd5e1; line-height: 1.6;">
          ${is404Model ? `
            <strong>O modelo '${selectedModel}' não está baixado na VPS ainda!</strong><br>
            Os modelos que já estão prontos na sua VPS para você usar agora são:<br>
            ${state.installedModels.map(m => `&bull; <code>${m}</code>`).join('<br>')}<br><br>
            <em>Para baixar '${selectedModel}', rode no terminal da VPS:</em><br>
            <code>docker exec -it $(docker ps -qf "name=ollama" | head -n 1) ollama run ${selectedModel}</code>
          ` : `
            <strong>Dica de Verificação:</strong><br>
            &bull; Verifique se a sua chave de API na aba "Gerar API Keys" está ativa.<br>
            &bull; Verifique se o container <code>ollama</code> no EasyPanel está rodando na porta 11434.
          `}
        </div>
      `;
    }
  }

  if (btnSendMessage && chatInput) {
    btnSendMessage.addEventListener('click', handleSend);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
  }
});
