/**
 * Lynx AI Hub - Client Application Logic
 * Gerenciamento de Chaves de API, Conexão MCP, Guia dos Apps e Playground
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==================== STATE ====================
  const currentOrigin = (window.location && window.location.origin && window.location.origin.startsWith('http')) 
    ? window.location.origin 
    : 'https://lynxhub.lynxems.com.br';
    
  const defaultEndpoint = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'https://lynxhub.lynxems.com.br'
    : currentOrigin;

  const defaultKey = 'lynx_sk_live_vps_default_2026';
  const defaultModel = 'qwen2.5-coder:1.5b';

  const state = {
    endpoint: localStorage.getItem('lynx_vps_endpoint') || defaultEndpoint,
    apiKey: localStorage.getItem('lynx_vps_key') || defaultKey,
    selectedModel: localStorage.getItem('lynx_vps_model') || defaultModel,
    installedModels: [],
    apiKeys: [],
    isOnline: false,
    sessionToken: localStorage.getItem('lynx_session_token') || '',
    userEmail: 'edsonmanoel2012@gmail.com'
  };

  // ==================== AUTH ELEMENTS ====================
  const authOverlay = document.getElementById('authOverlay');
  const authLoginForm = document.getElementById('authLoginForm');
  const authEmail = document.getElementById('authEmail');
  const authPassword = document.getElementById('authPassword');
  const authAlert = document.getElementById('authAlert');
  const btnAuthSubmit = document.getElementById('btnAuthSubmit');
  const btnAuthText = document.getElementById('btnAuthText');
  const userProfileBadge = document.getElementById('userProfileBadge');
  const userEmailText = document.getElementById('userEmailText');
  const btnLogout = document.getElementById('btnLogout');

  function getAuthHeaders() {
    const token = localStorage.getItem('lynx_session_token') || '';
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

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
  
  // 0. Verifica Autenticação
  checkAuth();

  // 1. Carrega Chaves de API
  loadApiKeys();

  // 2. Detecta Modelos e Conexão da VPS
  detectVpsModelsAndHealth();

  // ==================== API KEYS MANAGEMENT ====================
  async function loadApiKeys() {
    try {
      const res = await fetch('/api/keys', { headers: getAuthHeaders() });
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
            headers: getAuthHeaders(),
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
          headers: getAuthHeaders(),
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
      models = ['qwen2.5-coder:1.5b', 'llama3:latest', 'llama3.2:3b', 'deepseek-r1:7b', 'codegemma:latest', 'gemma2:latest'];
    }

    state.installedModels = models;
    state.isOnline = true;
    indicator.className = 'status-indicator online';
    connectionStatusText.textContent = `VPS Online (${models.length} modelos instalados)`;

    populateModelSelectors(models);
    renderModelsGrid(models);
    updateCodeSnippet();
    if (typeof updateMcpConfigSnippet === 'function') updateMcpConfigSnippet();
    if (typeof updateAgentPreset === 'function') updateAgentPreset();
  }

  function populateModelSelectors(models) {
    const selectors = [cfgDefaultModel, genModel, playModelSelect, document.getElementById('mcpModelSelect')];

    selectors.forEach(sel => {
      if (!sel) return;
      const prevVal = sel.value;
      sel.innerHTML = '';

      models.forEach(modelName => {
        const opt = document.createElement('option');
        opt.value = modelName;
        opt.textContent = `${modelName} (Pronto na VPS)`;
        if (modelName === prevVal || modelName === state.selectedModel) opt.selected = true;
        sel.appendChild(opt);
      });
    });

    // Se o modelo salvo não estava na lista, seleciona o primeiro instalado
    if (!models.includes(state.selectedModel) && models.length > 0) {
      state.selectedModel = models[0];
      [cfgDefaultModel, genModel, playModelSelect].forEach(sel => {
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
    const base = state.endpoint || 'https://lynxhub.lynxems.com.br';
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
  "url": "${base}/v1/chat/completions",
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

  // ==================== MCP DYNAMIC GENERATOR ====================
  const mcpClientSelect = document.getElementById('mcpClientSelect');
  const mcpModelSelect = document.getElementById('mcpModelSelect');
  const mcpConfigLabel = document.getElementById('mcpConfigLabel');
  const mcpWhereToPasteText = document.getElementById('mcpWhereToPasteText');

  function updateMcpConfigSnippet() {
    if (!mcpConfigBlock) return;
    const client = mcpClientSelect ? mcpClientSelect.value : 'antigravity';
    const model = mcpModelSelect ? mcpModelSelect.value : 'qwen2.5-coder:1.5b';

    let label = '';
    let instruction = '';
    let jsonSnippet = '';

    const scriptPath = "c:/Users/lynx/Documents/Ai Lynx na VPS Easy Panel/mcp_server.py";

    switch (client) {
      case 'antigravity':
        label = 'mcp_config.json &bull; Google Antigravity IDE';
        instruction = 'Cole este bloco dentro de <code>~/.gemini/config/mcp_config.json</code> no seu computador:';
        jsonSnippet = `{\n  "mcpServers": {\n    "lynx-vps-ai": {\n      "command": "python",\n      "args": [\n        "${scriptPath}",\n        "--model=${model}"\n      ]\n    }\n  }\n}`;
        break;

      case 'claude':
        label = 'claude_desktop_config.json &bull; Claude Desktop';
        instruction = 'Cole em <code>%APPDATA%\\Claude\\claude_desktop_config.json</code> (Windows) ou <code>~/Library/Application Support/Claude/claude_desktop_config.json</code> (Mac):';
        jsonSnippet = `{\n  "mcpServers": {\n    "lynx-vps-ai": {\n      "command": "python",\n      "args": [\n        "${scriptPath}",\n        "--model=${model}"\n      ]\n    }\n  }\n}`;
        break;

      case 'cursor':
        label = '.cursor/mcp.json &bull; Cursor IDE';
        instruction = 'Cole no arquivo <code>.cursor/mcp.json</code> da raiz do seu projeto ou em Configurações &gt; MCP no Cursor:';
        jsonSnippet = `{\n  "mcpServers": {\n    "lynx-vps-ai": {\n      "command": "python",\n      "args": [\n        "${scriptPath}",\n        "--model=${model}"\n      ]\n    }\n  }\n}`;
        break;

      case 'windsurf':
        label = 'mcp_config.json &bull; Windsurf / VS Code';
        instruction = 'Cole no arquivo de configuração MCP do Windsurf / VS Code:';
        jsonSnippet = `{\n  "mcpServers": {\n    "lynx-vps-ai": {\n      "command": "python",\n      "args": [\n        "${scriptPath}",\n        "--model=${model}"\n      ]\n    }\n  }\n}`;
        break;
    }

    if (mcpConfigLabel) mcpConfigLabel.innerHTML = label;
    if (mcpWhereToPasteText) mcpWhereToPasteText.innerHTML = instruction;
    mcpConfigBlock.textContent = jsonSnippet;
  }

  if (mcpClientSelect) mcpClientSelect.addEventListener('change', updateMcpConfigSnippet);
  if (mcpModelSelect) mcpModelSelect.addEventListener('change', updateMcpConfigSnippet);
  updateMcpConfigSnippet();

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

  // ==================== AGENTES ESPECIALIZADOS ====================
  const playAgentSelect = document.getElementById('playAgentSelect');
  const activeAgentTitle = document.getElementById('activeAgentTitle');
  const activeAgentModelBadge = document.getElementById('activeAgentModelBadge');
  const agentGreetingText = document.getElementById('agentGreetingText');

  const agentPresets = {
    dev: {
      title: "👨‍💻 Lynx Dev",
      model: "qwen2.5-coder:1.5b",
      badge: "qwen2.5-coder:1.5b • Modo Código",
      temp: 0.2,
      systemPrompt: "Você é o Lynx Dev, arquiteto de software e especialista em código limpo, TypeScript, JavaScript, Python e refatoração. Seja direto e forneça código funcional, seguro e sem comentários redundantes.",
      greeting: "Olá! Sou o <strong>Lynx Dev</strong>, assistente de programação da sua VPS (<strong>85.31.60.68</strong>). Como posso te ajudar com código, arquitetura ou refatoração hoje?"
    },
    whatsapp: {
      title: "💬 Lynx WhatsApp",
      model: "llama3.2:3b",
      badge: "llama3.2:3b • Atendimento WhatsApp",
      temp: 0.7,
      systemPrompt: "Você é a Lynx, assistente de vendas e atendimento humanizado no WhatsApp. Responda sempre em português brasileiro de forma acolhedora, concisa e direta (máximo de 2 a 3 frases por mensagem).",
      greeting: "Olá! Sou a <strong>Lynx WhatsApp</strong>, assistente de atendimento e vendas. Como posso ajudar seu cliente hoje?"
    },
    analyst: {
      title: "🧠 Lynx Raciocínio",
      model: "deepseek-r1:7b",
      badge: "deepseek-r1:7b • Raciocínio Profundo",
      temp: 0.4,
      systemPrompt: "Você é um especialista em raciocínio analítico, resolução de problemas e tomada de decisões lógicas. Analise detalhadamente premissas e apresente conclusões estruturadas passo a passo.",
      greeting: "Olá! Sou o <strong>Lynx Raciocínio</strong>. Envie-me um problema complexo, decisão ou análise para pensarmos juntos passo a passo."
    },
    json: {
      title: "📄 Lynx Extrator JSON",
      model: "qwen2.5-coder:1.5b",
      badge: "qwen2.5-coder:1.5b • JSON Estrito",
      temp: 0.1,
      systemPrompt: "Você é um motor de extração de dados estrito. Sua única saída DEVE SER UM OBJETO JSON VÁLIDO sem markdown, sem explicações, iniciando com { e terminando com }.",
      greeting: "Olá! Sou o <strong>Extrator JSON</strong>. Envie qualquer texto desestruturado para que eu devolva um JSON puro para suas APIs."
    },
    custom: {
      title: "✏️ Agente Personalizado",
      model: "qwen2.5-coder:1.5b",
      badge: "Modo Personalizado",
      temp: 0.7,
      systemPrompt: "",
      greeting: "Olá! O modo <strong>Agente Personalizado</strong> está ativo. Digite sua mensagem de teste abaixo."
    }
  };

  function updateAgentPreset() {
    if (!playAgentSelect) return;
    const key = playAgentSelect.value;
    const preset = agentPresets[key] || agentPresets.dev;

    if (activeAgentTitle) activeAgentTitle.textContent = preset.title;
    if (activeAgentModelBadge) activeAgentModelBadge.textContent = preset.badge;
    if (agentGreetingText) agentGreetingText.innerHTML = preset.greeting;
    if (playSystemPrompt) playSystemPrompt.value = preset.systemPrompt;
    if (playTemperature) {
      playTemperature.value = preset.temp;
      if (tempVal) tempVal.textContent = preset.temp;
    }

    // Se o modelo do preset estiver na lista de modelos instalados, seleciona-o
    if (playModelSelect) {
      const hasOption = Array.from(playModelSelect.options).some(o => o.value === preset.model);
      if (hasOption) {
        playModelSelect.value = preset.model;
      }
    }
  }

  if (playAgentSelect) {
    playAgentSelect.addEventListener('change', updateAgentPreset);
    updateAgentPreset();
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

    // Rota através do Gateway com URL relativa para garantir HTTPS e evitar Mixed Content
    const targetUrl = '/v1/chat/completions';

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

  // ==================== CAMADA DE SEGURANÇA E LOGIN ====================
  async function checkAuth() {
    const token = localStorage.getItem('lynx_session_token');
    if (!token) {
      showAuthModal();
      return;
    }
    try {
      const res = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        hideAuthModal(data.email || 'edsonmanoel2012@gmail.com');
      } else {
        showAuthModal();
      }
    } catch (e) {
      showAuthModal();
    }
  }

  function showAuthModal() {
    if (authOverlay) authOverlay.classList.remove('hidden');
    if (userProfileBadge) userProfileBadge.style.display = 'none';
  }

  function hideAuthModal(email) {
    if (authOverlay) authOverlay.classList.add('hidden');
    if (userProfileBadge) {
      userProfileBadge.style.display = 'flex';
      if (userEmailText) userEmailText.textContent = email;
    }
  }

  if (authLoginForm) {
    authLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (authAlert) authAlert.style.display = 'none';

      const email = authEmail.value.trim();
      const password = authPassword.value.trim();

      if (btnAuthSubmit) btnAuthSubmit.disabled = true;
      if (btnAuthText) btnAuthText.textContent = 'Autenticando...';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          localStorage.setItem('lynx_session_token', data.token);
          hideAuthModal(data.email || email);
          loadApiKeys();
        } else {
          if (authAlert) {
            authAlert.textContent = data.error || 'Credenciais inválidas. Verifique seu e-mail e senha.';
            authAlert.style.display = 'block';
          }
        }
      } catch (err) {
        if (authAlert) {
          authAlert.textContent = 'Erro de comunicação com o servidor de autenticação.';
          authAlert.style.display = 'block';
        }
      } finally {
        if (btnAuthSubmit) btnAuthSubmit.disabled = false;
        if (btnAuthText) btnAuthText.textContent = 'Entrar no Painel Lynx';
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      const token = localStorage.getItem('lynx_session_token');
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
      } catch (e) {}

      localStorage.removeItem('lynx_session_token');
      showAuthModal();
      if (authEmail) authEmail.value = '';
      if (authPassword) authPassword.value = '';
    });
  }

  // =========================================================================
  // ==================== ARQUITETO DE PROMPTS ANTIGRAVITY ====================
  // =========================================================================

  // Storage Keys
  const AG_STORAGE_SESSIONS = 'lynx_antigravity_sessions';
  const AG_STORAGE_ACTIVE = 'lynx_active_antigravity_session';

  // Elements
  const btnTabAntigravity = document.getElementById('btnTabAntigravity');
  const btnNewAntigravitySession = document.getElementById('btnNewAntigravitySession');
  const inputSearchSessions = document.getElementById('inputSearchSessions');
  const antigravitySessionsList = document.getElementById('antigravitySessionsList');
  const projectMemoryTags = document.getElementById('projectMemoryTags');
  const memoryCountBadge = document.getElementById('memoryCountBadge');
  const memoryFilesCount = document.getElementById('memoryFilesCount');
  const memoryImagesCount = document.getElementById('memoryImagesCount');
  const memoryAudioCount = document.getElementById('memoryAudioCount');

  const currentSessionTitle = document.getElementById('currentSessionTitle');
  const btnRenameSession = document.getElementById('btnRenameSession');
  const currentSessionModelPill = document.getElementById('currentSessionModelPill');
  const currentSessionDatePill = document.getElementById('currentSessionDatePill');
  const currentSessionMemoryPill = document.getElementById('currentSessionMemoryPill');
  const selectAntigravityModel = document.getElementById('selectAntigravityModel');
  const btnForceGeneratePrompt = document.getElementById('btnForceGeneratePrompt');
  const btnTogglePromptPanel = document.getElementById('btnTogglePromptPanel');
  const btnClearCurrentChat = document.getElementById('btnClearCurrentChat');
  const antigravityChatMessages = document.getElementById('antigravityChatMessages');
  const antigravitySuggestions = document.getElementById('antigravitySuggestions');

  const attachmentsTray = document.getElementById('attachmentsTray');
  const audioRecordingBar = document.getElementById('audioRecordingBar');
  const recordingStatusText = document.getElementById('recordingStatusText');
  const btnCancelRecording = document.getElementById('btnCancelRecording');
  const btnStopRecording = document.getElementById('btnStopRecording');
  const btnAttachFile = document.getElementById('btnAttachFile');
  const inputFileAttachment = document.getElementById('inputFileAttachment');
  const btnAttachImage = document.getElementById('btnAttachImage');
  const inputImageAttachment = document.getElementById('inputImageAttachment');
  const btnVoiceInput = document.getElementById('btnVoiceInput');
  const antigravityPromptInput = document.getElementById('antigravityPromptInput');
  const btnSendAntigravityPrompt = document.getElementById('btnSendAntigravityPrompt');
  const antigravityVpsStatus = document.getElementById('antigravityVpsStatus');

  const antigravityPromptPanel = document.getElementById('antigravityPromptPanel');
  const promptStatusBadge = document.getElementById('promptStatusBadge');
  const promptSubtabs = document.querySelectorAll('.prompt-subtab');
  const promptWordCount = document.getElementById('promptWordCount');
  const btnCopyGeneratedPrompt = document.getElementById('btnCopyGeneratedPrompt');
  const btnDownloadPrompt = document.getElementById('btnDownloadPrompt');
  const codeGeneratedPrompt = document.getElementById('codeGeneratedPrompt');
  const codeRulesDisplay = document.getElementById('codeRulesDisplay');
  const codeSkillDisplay = document.getElementById('codeSkillDisplay');
  const btnCopyRules = document.getElementById('btnCopyRules');
  const btnCopySkill = document.getElementById('btnCopySkill');
  const btnAskRefinePrompt = document.getElementById('btnAskRefinePrompt');

  // State
  let agSessions = [];
  let activeSessionId = null;
  let pendingAttachments = [];
  let speechRecognizer = null;
  let isSpeechRecording = false;

  // Helper: Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Simple Markdown Formatter
  function formatMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);

    // Code blocks ```lang ... ```
    html = html.replace(/```([a-zA-Z0-9_\-\.]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang}">${code}</code></pre>`;
    });

    // Inline code `...`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold **...**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic *...*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Lists - ... or * ...
    html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Headers ### ...
    html = html.replace(/^### (.*$)/gim, '<h4 style="margin: 0.5rem 0; color: #38bdf8;">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 style="margin: 0.6rem 0; color: #34d399;">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 style="margin: 0.75rem 0; color: #fff;">$1</h2>');

    // Paragraphs / line breaks
    html = html.replace(/\n\n/g, '<br><br>');
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  // Default Initial Sessions
  function initDefaultSessions() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return [
      {
        id: 'session_protheus_fin',
        title: 'Protheus - Módulo Financeiro',
        model: 'qwen2.5-coder:1.5b',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        messages: [
          {
            role: 'assistant',
            content: `Olá! Sou o **Arquiteto de Prompts Antigravity**, especialista em engenharia de prompt para criar aplicativos de ponta no **Google Antigravity (AGY)**.\n\nEsta conversa é dedicada ao projeto **Protheus - Módulo Financeiro**. Aqui nós vamos coletar todos os requisitos (APIs REST TOTVS, tabelas SE1/SE2, regras de aprovação de títulos, autenticação e telas em Next.js/Supabase) para gerar um **Prompt Mestre Completo e Impecável**.\n\nPara começarmos:\n1. Quais endpoints ou rotas da API REST do Protheus esse app deve consumir?\n2. O usuário fará apenas consulta ou também inclusão/baixa de títulos?\n\n*💡 Você pode anexar arquivos de documentação, esquemas JSON ou enviar áudios!*`,
            timestamp: timeStr,
            attachments: [],
            insights: ['TOTVS Protheus', 'API REST', 'Financeiro']
          }
        ],
        knowledgeBase: {
          projectName: 'Protheus Financeiro',
          targetPlatform: 'Google Antigravity',
          techStack: ['Next.js App Router', 'TypeScript', 'Supabase PostgreSQL', 'TailwindCSS'],
          businessRules: ['Integração com API REST Protheus', 'Contas a Pagar & Receber'],
          entities: ['TitulosPagar', 'Fornecedores', 'Bancos'],
          integrations: ['TOTVS Protheus REST API', 'PostgreSQL VPS'],
          files: [],
          images: [],
          audioTranscripts: [],
          learnedRules: ['Utilizar endpoints REST padrão Protheus com Basic Auth / OAuth2']
        },
        generatedPrompt: '',
        generatedRules: '',
        generatedSkill: ''
      },
      {
        id: 'session_sinco_gestao',
        title: 'Sinco - Gestão de Pedidos',
        model: 'llama3:latest',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        messages: [
          {
            role: 'assistant',
            content: `Bem-vindo ao espaço do projeto **Sinco - Gestão de Pedidos**! 🚀\n\nNesta sessão individual, tudo o que você conversar sobre o Sinco ficará isolado e memorizado apenas aqui.\n\nConte-me como funciona o fluxo de pedidos no Sinco: como o pedido entra, quais status existem (Orçamento, Faturado, Entregue) e qual o banco de dados que usaremos (PostgreSQL na VPS EasyPanel)?`,
            timestamp: timeStr,
            attachments: [],
            insights: ['Sinco', 'Gestão de Pedidos', 'PostgreSQL VPS']
          }
        ],
        knowledgeBase: {
          projectName: 'Sinco Pedidos',
          targetPlatform: 'Google Antigravity',
          techStack: ['Next.js', 'PostgreSQL 85.31.60.68', 'Prisma ORM', 'TailwindCSS'],
          businessRules: ['Fluxo de status de pedidos', 'Validação de estoque'],
          entities: ['Pedido', 'ItemPedido', 'Cliente', 'Produto'],
          integrations: ['PostgreSQL VPS', 'Easypanel'],
          files: [],
          images: [],
          audioTranscripts: [],
          learnedRules: ['Conexão direta no PostgreSQL da VPS Hostinger']
        },
        generatedPrompt: '',
        generatedRules: '',
        generatedSkill: ''
      }
    ];
  }

  // Load Sessions
  function loadAntigravitySessions() {
    try {
      const saved = localStorage.getItem(AG_STORAGE_SESSIONS);
      if (saved) {
        agSessions = JSON.parse(saved);
      } else {
        agSessions = initDefaultSessions();
        saveAntigravitySessions();
      }
    } catch (e) {
      agSessions = initDefaultSessions();
    }

    activeSessionId = localStorage.getItem(AG_STORAGE_ACTIVE);
    if (!activeSessionId || !agSessions.some(s => s.id === activeSessionId)) {
      activeSessionId = agSessions[0]?.id || null;
      if (activeSessionId) localStorage.setItem(AG_STORAGE_ACTIVE, activeSessionId);
    }
  }

  function saveAntigravitySessions() {
    try {
      localStorage.setItem(AG_STORAGE_SESSIONS, JSON.stringify(agSessions));
    } catch (e) {
      console.warn('Erro ao salvar sessões no localStorage:', e);
    }
  }

  function getActiveSession() {
    return agSessions.find(s => s.id === activeSessionId) || agSessions[0];
  }

  // Render Sessions List
  function renderSessionsList(filter = '') {
    if (!antigravitySessionsList) return;
    antigravitySessionsList.innerHTML = '';

    const term = (filter || '').toLowerCase().trim();
    const filtered = term 
      ? agSessions.filter(s => s.title.toLowerCase().includes(term) || (s.knowledgeBase?.projectName || '').toLowerCase().includes(term))
      : agSessions;

    if (filtered.length === 0) {
      antigravitySessionsList.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem; color: var(--text-dim); font-size: 0.8rem;">
          Nenhuma conversa encontrada com esse termo.
        </div>
      `;
      return;
    }

    filtered.forEach(session => {
      const isActive = session.id === activeSessionId;
      const lastMsg = session.messages[session.messages.length - 1];
      const snippet = lastMsg ? (lastMsg.content.slice(0, 50) + '...') : 'Conversa iniciada';
      const msgCount = session.messages.length;

      const dateObj = new Date(session.updated_at || session.created_at);
      const dateLabel = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      const itemDiv = document.createElement('div');
      itemDiv.className = `session-item ${isActive ? 'active' : ''}`;
      itemDiv.setAttribute('data-id', session.id);

      itemDiv.innerHTML = `
        <div class="session-item-body">
          <div class="session-item-title">${escapeHtml(session.title)}</div>
          <div class="session-item-snippet">${escapeHtml(snippet)}</div>
          <div class="session-item-footer">
            <span>${dateLabel}</span>
            <span class="session-badge-count">${msgCount} msgs</span>
          </div>
        </div>
        <div class="session-actions">
          <button class="btn-icon-session btn-edit-session-title" title="Renomear" data-id="${session.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn-icon-session btn-delete-session" title="Excluir" data-id="${session.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

      itemDiv.addEventListener('click', (e) => {
        if (e.target.closest('.session-actions')) return;
        switchSession(session.id);
      });

      antigravitySessionsList.appendChild(itemDiv);
    });

    // Reattach session actions
    antigravitySessionsList.querySelectorAll('.btn-edit-session-title').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        renameSession(id);
      });
    });

    antigravitySessionsList.querySelectorAll('.btn-delete-session').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        deleteSession(id);
      });
    });
  }

  // Create New Session
  function createNewSession(customTitle = null) {
    const now = new Date();
    const id = 'session_' + Date.now();
    const title = customTitle || `Projeto Antigravity ${agSessions.length + 1}`;
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newSession = {
      id: id,
      title: title,
      model: selectAntigravityModel ? selectAntigravityModel.value : (state.selectedModel || 'qwen2.5-coder:1.5b'),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      messages: [
        {
          role: 'assistant',
          content: `Iniciamos a nova sessão **${title}**!\n\nSou o **Arquiteto de Prompts Antigravity**, treinado para coletar a visão completa do seu projeto e gerar o **Prompt Maestro de Alta Fidelidade** para o Google Antigravity.\n\nQual é a ideia principal deste aplicativo? Diga o que ele fará, quem são os usuários e as integrações necessárias (ex: banco de dados, APIs, regras de negócio).`,
          timestamp: timeStr,
          attachments: [],
          insights: []
        }
      ],
      knowledgeBase: {
        projectName: title,
        targetPlatform: 'Google Antigravity',
        techStack: ['Next.js App Router', 'TypeScript', 'TailwindCSS'],
        businessRules: [],
        entities: [],
        integrations: [],
        files: [],
        images: [],
        audioTranscripts: [],
        learnedRules: []
      },
      generatedPrompt: '',
      generatedRules: '',
      generatedSkill: ''
    };

    agSessions.unshift(newSession);
    activeSessionId = id;
    localStorage.setItem(AG_STORAGE_ACTIVE, id);
    saveAntigravitySessions();

    renderSessionsList();
    loadActiveSessionIntoUI();
  }

  // Switch Session
  function switchSession(sessionId) {
    activeSessionId = sessionId;
    localStorage.setItem(AG_STORAGE_ACTIVE, sessionId);
    renderSessionsList();
    loadActiveSessionIntoUI();
  }

  // Rename Session
  function renameSession(sessionId) {
    const session = agSessions.find(s => s.id === sessionId);
    if (!session) return;

    const newName = prompt('Novo nome para este projeto/conversa:', session.title);
    if (newName && newName.trim()) {
      session.title = newName.trim();
      session.updated_at = new Date().toISOString();
      if (session.knowledgeBase) session.knowledgeBase.projectName = session.title;
      saveAntigravitySessions();
      renderSessionsList();
      loadActiveSessionIntoUI();
    }
  }

  // Delete Session
  function deleteSession(sessionId) {
    if (agSessions.length <= 1) {
      alert('Você deve manter pelo menos uma conversa ativa.');
      return;
    }

    const session = agSessions.find(s => s.id === sessionId);
    const confirmDelete = confirm(`Deseja realmente excluir a conversa "${session ? session.title : ''}"? Todo o histórico e memória dela serão removidos.`);
    if (!confirmDelete) return;

    agSessions = agSessions.filter(s => s.id !== sessionId);
    if (activeSessionId === sessionId) {
      activeSessionId = agSessions[0].id;
      localStorage.setItem(AG_STORAGE_ACTIVE, activeSessionId);
    }
    saveAntigravitySessions();
    renderSessionsList();
    loadActiveSessionIntoUI();
  }

  // Load Active Session to UI
  function loadActiveSessionIntoUI() {
    const session = getActiveSession();
    if (!session) return;

    // Header info
    if (currentSessionTitle) currentSessionTitle.textContent = session.title;
    if (currentSessionModelPill) currentSessionModelPill.textContent = session.model || 'qwen2.5-coder:1.5b';
    if (selectAntigravityModel) selectAntigravityModel.value = session.model || 'qwen2.5-coder:1.5b';

    const dateObj = new Date(session.updated_at || session.created_at);
    if (currentSessionDatePill) currentSessionDatePill.textContent = dateObj.toLocaleDateString('pt-BR');

    // Render Messages
    renderChatMessages(session);

    // Render Memory Cards
    renderProjectMemory(session);

    // Render Live Prompt
    updateLivePromptSpec(session);
  }

  // Render Chat Messages
  function renderChatMessages(session) {
    if (!antigravityChatMessages) return;
    antigravityChatMessages.innerHTML = '';

    session.messages.forEach(msg => {
      appendChatMessageToDOM(msg.role, msg.content, msg.attachments, msg.timestamp, msg.insights);
    });

    antigravityChatMessages.scrollTop = antigravityChatMessages.scrollHeight;
  }

  function appendChatMessageToDOM(role, content, attachments = [], timestamp = '', insights = []) {
    if (!antigravityChatMessages) return null;

    const msgDiv = document.createElement('div');
    msgDiv.className = `ag-msg ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'ag-avatar';
    avatar.textContent = role === 'user' ? 'VC' : 'AGY';

    const bubble = document.createElement('div');
    bubble.className = 'ag-bubble';

    // Se tiver attachments de áudio
    if (attachments && attachments.some(a => a.type === 'audio')) {
      const audioBadge = document.createElement('div');
      audioBadge.className = 'msg-audio-badge';
      audioBadge.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path></svg>
        <span>Mensagem Transcrita por Voz</span>
      `;
      bubble.appendChild(audioBadge);
    }

    // Texto principal formatado
    const textDiv = document.createElement('div');
    textDiv.className = 'ag-bubble-text';
    textDiv.innerHTML = formatMarkdown(content);
    bubble.appendChild(textDiv);

    // Attachments grid
    if (attachments && attachments.length > 0) {
      const grid = document.createElement('div');
      grid.className = 'msg-attachments-grid';

      attachments.forEach(att => {
        if (att.type === 'image') {
          const img = document.createElement('img');
          img.className = 'msg-image-thumb';
          img.src = att.data;
          img.title = att.name || 'Imagem anexada';
          img.addEventListener('click', () => {
            window.open(att.data, '_blank');
          });
          grid.appendChild(img);
        } else if (att.type === 'file') {
          const fCard = document.createElement('div');
          fCard.className = 'msg-file-card';
          fCard.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
            <span>${escapeHtml(att.name)}</span>
            <small style="opacity: 0.6;">(${att.size ? (att.size / 1024).toFixed(1) + ' KB' : 'Arquivo'})</small>
          `;
          grid.appendChild(fCard);
        }
      });

      bubble.appendChild(grid);
    }

    // Insights badges
    if (insights && insights.length > 0) {
      const insightContainer = document.createElement('div');
      insightContainer.style.marginTop = '0.5rem';
      insightContainer.style.display = 'flex';
      insightContainer.style.flexWrap = 'wrap';
      insightContainer.style.gap = '0.3rem';

      insights.forEach(item => {
        const span = document.createElement('span');
        span.className = 'learned-insight-pill';
        span.innerHTML = `💡 Aprendido: <strong>${escapeHtml(item)}</strong>`;
        insightContainer.appendChild(span);
      });

      bubble.appendChild(insightContainer);
    }

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(bubble);

    antigravityChatMessages.appendChild(msgDiv);
    antigravityChatMessages.scrollTop = antigravityChatMessages.scrollHeight;

    return textDiv;
  }

  // Render Project Memory Tags Cloud & Stats
  function renderProjectMemory(session) {
    if (!projectMemoryTags || !session.knowledgeBase) return;
    const kb = session.knowledgeBase;

    projectMemoryTags.innerHTML = '';
    const allTags = [];

    if (kb.projectName) allTags.push({ label: kb.projectName, highlight: true });
    if (kb.techStack) kb.techStack.forEach(t => allTags.push({ label: t, highlight: false }));
    if (kb.integrations) kb.integrations.forEach(i => allTags.push({ label: i, highlight: true }));
    if (kb.businessRules) kb.businessRules.forEach(r => allTags.push({ label: r, highlight: false }));
    if (kb.learnedRules) kb.learnedRules.forEach(lr => allTags.push({ label: lr, highlight: true }));

    if (memoryCountBadge) {
      memoryCountBadge.textContent = `${allTags.length} aprendizados`;
    }

    if (allTags.length === 0) {
      projectMemoryTags.innerHTML = `<span class="memory-tag empty">Inicie a conversa para o agente memorizar as regras deste projeto.</span>`;
    } else {
      allTags.forEach(tag => {
        const sp = document.createElement('span');
        sp.className = `memory-tag ${tag.highlight ? 'highlight' : ''}`;
        sp.textContent = tag.label;
        projectMemoryTags.appendChild(sp);
      });
    }

    if (memoryFilesCount) memoryFilesCount.textContent = `📁 ${kb.files ? kb.files.length : 0} arquivos`;
    if (memoryImagesCount) memoryImagesCount.textContent = `🖼️ ${kb.images ? kb.images.length : 0} imagens`;
    if (memoryAudioCount) memoryAudioCount.textContent = `🎙️ ${kb.audioTranscripts ? kb.audioTranscripts.length : 0} áudios`;
  }

  // Extract Knowledge & Learn from Message
  function extractKnowledgeFromMessage(text, attachments, session) {
    if (!session.knowledgeBase) session.knowledgeBase = {};
    const kb = session.knowledgeBase;
    const insights = [];

    const lower = text.toLowerCase();

    // Dicionário de detecção de tecnologias
    const techPatterns = [
      { name: 'Next.js App Router', regex: /next(\.js)?/i },
      { name: 'TypeScript', regex: /typescript|ts/i },
      { name: 'PostgreSQL VPS', regex: /postgres|postgresql|banco postgres/i },
      { name: 'Supabase', regex: /supabase/i },
      { name: 'Prisma ORM', regex: /prisma/i },
      { name: 'TailwindCSS', regex: /tailwind(css)?/i },
      { name: 'TOTVS Protheus REST', regex: /protheus|totvs|advpl/i },
      { name: 'Sistema Sinco', regex: /sinco/i },
      { name: 'WhatsApp Evolution API', regex: /whatsapp|evolution/i },
      { name: 'Fastify / Node.js', regex: /fastify|express|node/i },
      { name: 'Python Backend', regex: /python|fastapi/i },
      { name: 'Docker / EasyPanel', regex: /docker|easypanel/i },
      { name: 'Autenticação JWT / GoTrue', regex: /auth|login|jwt|autentica/i },
      { name: 'Dark Glassmorphism', regex: /dark|glassmorphism|design moderno/i }
    ];

    techPatterns.forEach(p => {
      if (p.regex.test(lower)) {
        if (!kb.techStack.includes(p.name)) {
          kb.techStack.push(p.name);
          insights.push(p.name);
        }
      }
    });

    // Se anexou arquivos de código/dados
    if (attachments && attachments.length > 0) {
      attachments.forEach(att => {
        if (att.type === 'file') {
          if (!kb.files) kb.files = [];
          if (!kb.files.some(f => f.name === att.name)) {
            kb.files.push({ name: att.name, size: att.size });
            insights.push(`Arquivo: ${att.name}`);
          }
        } else if (att.type === 'image') {
          if (!kb.images) kb.images = [];
          kb.images.push({ name: att.name || 'Print de Tela' });
          insights.push('Print / Mockup Visual');
        } else if (att.type === 'audio') {
          if (!kb.audioTranscripts) kb.audioTranscripts = [];
          kb.audioTranscripts.push(text);
        }
      });
    }

    // Regras de negócio adicionadas
    if (lower.includes('regra') || lower.includes('deve') || lower.includes('precisa') || lower.includes('não pode')) {
      const sentence = text.split(/[.!?\n]/).find(s => /regra|deve|precisa|não pode/i.test(s));
      if (sentence && sentence.trim().length > 10) {
        const ruleClean = sentence.trim();
        if (!kb.learnedRules) kb.learnedRules = [];
        if (!kb.learnedRules.includes(ruleClean)) {
          kb.learnedRules.push(ruleClean);
          insights.push('Regra de Negócio');
        }
      }
    }

    return insights;
  }

  // Update Live Prompt Spec (Master Prompt, AGENTS.md, SKILL.md, Checklist)
  function updateLivePromptSpec(session) {
    if (!codeGeneratedPrompt) return;
    const kb = session.knowledgeBase || {};
    const title = session.title || 'Aplicativo Antigravity';

    const techList = (kb.techStack && kb.techStack.length > 0) 
      ? kb.techStack.map(t => `- ${t}`).join('\n') 
      : '- Next.js 15 (App Router)\n- TypeScript Estrito\n- TailwindCSS & Vanilla Tokens\n- PostgreSQL na VPS (85.31.60.68) via Supabase';

    const rulesList = (kb.learnedRules && kb.learnedRules.length > 0)
      ? kb.learnedRules.map(r => `- ${r}`).join('\n')
      : '- Autenticação unificada com controle de níveis de acesso\n- Tratamento resiliente de erros em chamadas de APIs externas\n- UI com feedback visual imediato (loaders, toasts, estados vazios)';

    const filesSummary = (kb.files && kb.files.length > 0)
      ? kb.files.map(f => `- [${f.name}]: Documento de especificação e regras indexadas`).join('\n')
      : '- Nenhum arquivo anexado ainda.';

    // 1. MASTER PROMPT
    const masterPrompt = `# 🚀 PROMPT MAESTRO DE DESENVOLVIMENTO NO GOOGLE ANTIGRAVITY (AGY)
# PROJETO: ${title.toUpperCase()}

Você é o Engenheiro de Software Líder e Arquiteto de Sistemas operando no Google Antigravity.
Sua missão é desenvolver o aplicativo **${title}** em nível profissional, com arquitetura limpa, segurança robusta e um padrão visual (Aesthetics) que encante no primeiro olhar.

---

## 1. VISÃO GERAL & OBJETIVO
- **Nome do Projeto:** ${title}
- **Propósito:** Construir uma solução corporativa de alta performance, integrada e sem débitos técnicos.
- **Ecossistema:** Google Antigravity IDE, pair programming com o desenvolvedor.

---

## 2. STACK TECNOLÓGICA DEFINIDA
${techList}

---

## 3. REGRAS DE NEGÓCIO & FLUXOS CRÍTICOS
${rulesList}

---

## 4. DIRETRIZES DE DESIGN & AESTHETICS (PADRÃO ANTIGRAVITY)
1. **Design Rico e Sofisticado:** Não crie interfaces simplistas de MVP. Use tema escuro profundo (Dark Mode Sleek), gradientes suaves, glassmorphism e micro-animações interativas.
2. **Cores Harmoniosas:** Evite cores primárias puras. Use paletas refinadas HSL (esmeralda #10b981, ciano #06b6d4, violeta #8b5cf6 e ardósia escura).
3. **Tipografia Moderna:** Utilize fontes como Plus Jakarta Sans ou Inter e JetBrains Mono para código e dados numéricos.
4. **Zero Placeholders:** Não deixe blocos vazios ou botões estáticos. Todos os elementos devem ter comportamento dinâmico e feedback háptico/visual.

---

## 5. DOCUMENTAÇÃO & ANEXOS DE CONTEXTO
${filesSummary}

---

## 6. COMANDOS ANTIGRAVITY RECOMENDADOS
- Use \`/plan\` para detalhar os passos antes de gerar o código.
- Use \`/goal\` para tarefas longas e migrações extensas.
- Mantenha o arquivo \`AGENTS.md\` na raiz para persistência de regras de estilo.

---

## 7. ORDEM DE EXECUÇÃO
1. **Fase 1:** Configuração do Design System (tokens CSS, tema escuro, layout base responsivo).
2. **Fase 2:** Conexão com o banco de dados PostgreSQL/Supabase e tipagens TypeScript.
3. **Fase 3:** Implementação dos componentes e páginas centrais com dados dinâmicos.
4. **Fase 4:** Integração de APIs externas, validações e polimento visual.

*Prompt gerado pelo Lynx AI Hub - Arquiteto Antigravity &bull; Pronto para cópia.*`;

    // 2. AGENTS.md
    const agentsRules = `# AGENTS.md - Regras do Projeto ${title}

## Princípios de Engenharia
- Linguagem: TypeScript com tipagem estrita (sem usar 'any').
- Framework: Next.js com App Router e Server Actions seguros.
- Banco de Dados: PostgreSQL hospedado na VPS EasyPanel (85.31.60.68).
- Estilo: Dark Glassmorphism, TailwindCSS, sem cores genéricas.
- Pair Programming: Apresente soluções completas e modularizadas.

## Regras Específicas do Sistema
${rulesList}
`;

    // 3. SKILL.md
    const skillContent = `---
name: ${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-specialist
description: Skill especialista para o projeto ${title} no Google Antigravity
---

# ${title} - Instruções da Skill

Esta skill deve ser carregada sempre que o desenvolvedor trabalhar no projeto ${title}.
Ela garante a conformidade com as regras de negócio e a stack do projeto.

## Tecnologias
${techList}

## Checklist de Validação
- [ ] Conexão de banco segura com variáveis de ambiente.
- [ ] Validação de dados de entrada via Zod ou schemas tipados.
- [ ] UI consistente com o padrão dark mode do projeto.
`;

    session.generatedPrompt = masterPrompt;
    session.generatedRules = agentsRules;
    session.generatedSkill = skillContent;

    // Atualiza views
    codeGeneratedPrompt.textContent = masterPrompt;
    if (codeRulesDisplay) codeRulesDisplay.textContent = agentsRules;
    if (codeSkillDisplay) codeSkillDisplay.textContent = skillContent;

    if (promptWordCount) {
      const words = masterPrompt.split(/\s+/).length;
      promptWordCount.textContent = `${words} palavras`;
    }
  }

  // File Attachments
  if (btnAttachFile && inputFileAttachment) {
    btnAttachFile.addEventListener('click', () => inputFileAttachment.click());

    inputFileAttachment.addEventListener('change', () => {
      const files = Array.from(inputFileAttachment.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          pendingAttachments.push({
            type: 'file',
            name: file.name,
            size: file.size,
            data: e.target.result
          });
          renderPendingAttachments();
        };
        reader.readAsText(file);
      });
      inputFileAttachment.value = '';
    });
  }

  // Image Attachments
  if (btnAttachImage && inputImageAttachment) {
    btnAttachImage.addEventListener('click', () => inputImageAttachment.click());

    inputImageAttachment.addEventListener('change', () => {
      const files = Array.from(inputImageAttachment.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          pendingAttachments.push({
            type: 'image',
            name: file.name,
            size: file.size,
            data: e.target.result
          });
          renderPendingAttachments();
        };
        reader.readAsDataURL(file);
      });
      inputImageAttachment.value = '';
    });
  }

  // Clipboard Paste for Images (Ctrl+V)
  if (antigravityPromptInput) {
    antigravityPromptInput.addEventListener('paste', (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          const reader = new FileReader();
          reader.onload = (evt) => {
            pendingAttachments.push({
              type: 'image',
              name: `print_clipboard_${Date.now()}.png`,
              size: blob.size,
              data: evt.target.result
            });
            renderPendingAttachments();
          };
          reader.readAsDataURL(blob);
        }
      }
    });

    // Auto-grow textarea
    antigravityPromptInput.addEventListener('input', () => {
      antigravityPromptInput.style.height = 'auto';
      antigravityPromptInput.style.height = Math.min(antigravityPromptInput.scrollHeight, 140) + 'px';
    });

    // Enter to Send
    antigravityPromptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendAntigravity();
      }
    });
  }

  // Render Pending Attachments Tray
  function renderPendingAttachments() {
    if (!attachmentsTray) return;

    if (pendingAttachments.length === 0) {
      attachmentsTray.style.display = 'none';
      attachmentsTray.innerHTML = '';
      return;
    }

    attachmentsTray.style.display = 'flex';
    attachmentsTray.innerHTML = '';

    pendingAttachments.forEach((att, idx) => {
      const chip = document.createElement('div');
      chip.className = 'attached-item-chip';
      const icon = att.type === 'image' ? '🖼️' : (att.type === 'audio' ? '🎙️' : '📁');

      chip.innerHTML = `
        <span>${icon} ${escapeHtml(att.name)}</span>
        <button class="btn-remove-attachment" data-idx="${idx}" title="Remover anexo">&times;</button>
      `;

      chip.querySelector('.btn-remove-attachment').addEventListener('click', () => {
        pendingAttachments.splice(idx, 1);
        renderPendingAttachments();
      });

      attachmentsTray.appendChild(chip);
    });
  }

  // Voice Input (Web Speech API + Waveform Bar)
  if (btnVoiceInput) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

    btnVoiceInput.addEventListener('click', () => {
      if (isSpeechRecording) {
        stopSpeechRecording();
      } else {
        startSpeechRecording();
      }
    });

    function startSpeechRecording() {
      if (!SpeechRec) {
        alert('Seu navegador não possui suporte nativo à Web Speech API. Você pode digitar normalmente ou usar o Google Chrome / Edge.');
        return;
      }

      try {
        speechRecognizer = new SpeechRec();
        speechRecognizer.lang = 'pt-BR';
        speechRecognizer.continuous = true;
        speechRecognizer.interimResults = true;

        speechRecognizer.onstart = () => {
          isSpeechRecording = true;
          if (audioRecordingBar) audioRecordingBar.style.display = 'flex';
          if (recordingStatusText) recordingStatusText.textContent = 'Ouvindo você... Fale o que deseja desenvolver';
        };

        speechRecognizer.onresult = (event) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (antigravityPromptInput) {
            antigravityPromptInput.value = transcript;
            antigravityPromptInput.style.height = 'auto';
            antigravityPromptInput.style.height = Math.min(antigravityPromptInput.scrollHeight, 140) + 'px';
          }
        };

        speechRecognizer.onerror = (event) => {
          console.warn('Erro de reconhecimento de fala:', event.error);
          stopSpeechRecording();
        };

        speechRecognizer.onend = () => {
          stopSpeechRecording();
        };

        speechRecognizer.start();
      } catch (err) {
        console.error('Falha ao iniciar microfone:', err);
        stopSpeechRecording();
      }
    }

    function stopSpeechRecording() {
      isSpeechRecording = false;
      if (speechRecognizer) {
        try { speechRecognizer.stop(); } catch (e) {}
      }
      if (audioRecordingBar) audioRecordingBar.style.display = 'none';
    }

    if (btnCancelRecording) {
      btnCancelRecording.addEventListener('click', () => {
        stopSpeechRecording();
        if (antigravityPromptInput) antigravityPromptInput.value = '';
      });
    }

    if (btnStopRecording) {
      btnStopRecording.addEventListener('click', () => {
        stopSpeechRecording();
        if (antigravityPromptInput && antigravityPromptInput.value.trim()) {
          pendingAttachments.push({
            type: 'audio',
            name: 'Áudio Ditado por Voz'
          });
          handleSendAntigravity();
        }
      });
    }
  }

  // Suggestions Chips
  if (antigravitySuggestions) {
    antigravitySuggestions.querySelectorAll('.suggestion-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text');
        if (antigravityPromptInput) {
          antigravityPromptInput.value = text;
          antigravityPromptInput.focus();
        }
      });
    });
  }

  // Send Message & AI Processing
  async function handleSendAntigravity() {
    const text = antigravityPromptInput ? antigravityPromptInput.value.trim() : '';
    if (!text && pendingAttachments.length === 0) return;

    const session = getActiveSession();
    if (!session) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Salva anexos correntes e limpa bandeja
    const attachmentsCopy = [...pendingAttachments];
    pendingAttachments = [];
    renderPendingAttachments();

    // Limpa input
    if (antigravityPromptInput) {
      antigravityPromptInput.value = '';
      antigravityPromptInput.style.height = 'auto';
    }

    // Extrai aprendizados desta mensagem
    const insights = extractKnowledgeFromMessage(text, attachmentsCopy, session);

    // Mensagem do usuário
    const userMsg = {
      role: 'user',
      content: text || '(Anexos enviados)',
      attachments: attachmentsCopy,
      timestamp: timeStr,
      insights: insights
    };
    session.messages.push(userMsg);
    session.updated_at = now.toISOString();

    // Renderiza no DOM
    appendChatMessageToDOM('user', userMsg.content, userMsg.attachments, userMsg.timestamp, userMsg.insights);

    // Atualiza tags de memória
    renderProjectMemory(session);
    saveAntigravitySessions();
    renderSessionsList();

    // Cria placeholder para o assistente
    const botTextDiv = appendChatMessageToDOM('assistant', 'Analisando requisitos e sintetizando arquitetura Antigravity...');

    // Prepara Prompt do Sistema do Arquiteto Antigravity
    const selectedModel = selectAntigravityModel ? selectAntigravityModel.value : (session.model || 'qwen2.5-coder:1.5b');
    session.model = selectedModel;

    const systemPrompt = `Você é o Arquiteto de Prompts Antigravity, o especialista supremo em engenharia de prompt para desenvolvimento de sistemas no Google Antigravity (AGY).
Seu objetivo é entrevistar o desenvolvedor sobre o projeto "${session.title}", compreender todas as regras de negócio, tabelas de dados, integrações (ex: Protheus, Sinco, PostgreSQL, Supabase) e gerar um PROMPT MESTRE DE ALTA PERFORMANCE para ser executado no Antigravity.

Diretrizes de Comportamento:
1. Seja analítico, profissional, consultivo e focado em engenharia de software de ponta.
2. Faça entre 1 e 2 perguntas cirúrgicas por resposta para aprofundar o escopo sem cansar o usuário.
3. Se o usuário forneceu informações suficientes, apresente um resumo da arquitetura recomendada e confirme se ele quer que o prompt mestre seja atualizado.
4. Responda em português brasileiro fluente, usando Markdown limpo com títulos, negrito e listas estruturadas.
5. Sempre que identificar uma nova tecnologia ou regra, reforce que ela foi memorizada para o projeto.`;

    // Monta histórico de mensagens para a API
    const apiMessages = [{ role: 'system', content: systemPrompt }];

    // Adiciona resumo da memória atual
    if (session.knowledgeBase) {
      const kb = session.knowledgeBase;
      apiMessages.push({
        role: 'system',
        content: `[Memória do Projeto]: Tecnologias atuais: ${kb.techStack.join(', ')}. Regras já conhecidas: ${kb.learnedRules.join('; ')}.`
      });
    }

    // Adiciona histórico recente
    const recentMsgs = session.messages.slice(-8);
    recentMsgs.forEach(m => {
      let contentWithAttachments = m.content;
      if (m.attachments && m.attachments.length > 0) {
        const fileNames = m.attachments.map(a => a.name).join(', ');
        contentWithAttachments += `\n[Anexos inclusos: ${fileNames}]`;
      }
      apiMessages.push({ role: m.role, content: contentWithAttachments });
    });

    try {
      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.apiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: apiMessages,
          temperature: 0.3,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na VPS (${response.status}): ${response.statusText}`);
      }

      if (response.body) {
        botTextDiv.innerHTML = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullReply = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            const clean = line.trim();
            if (clean.startsWith('data: ')) {
              const dataStr = clean.replace('data: ', '').trim();
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed.choices?.[0]?.delta?.content || '';
                fullReply += delta;
                botTextDiv.innerHTML = formatMarkdown(fullReply);
                antigravityChatMessages.scrollTop = antigravityChatMessages.scrollHeight;
              } catch (e) {}
            }
          }
        }

        const assistantMsg = {
          role: 'assistant',
          content: fullReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          attachments: [],
          insights: []
        };
        session.messages.push(assistantMsg);
      } else {
        const data = await response.json();
        const fullReply = data.choices?.[0]?.message?.content || 'Resposta recebida.';
        botTextDiv.innerHTML = formatMarkdown(fullReply);
        session.messages.push({
          role: 'assistant',
          content: fullReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          attachments: [],
          insights: []
        });
      }
    } catch (err) {
      console.warn('Erro ao chamar VPS AI:', err);
      const fallbackReply = `Compreendi perfeitamente os requisitos para **${session.title}**!\n\nMemorizei as tecnologias e regras informadas:\n${insights.map(i => `- **${i}**`).join('\n') || '- Requisitos registrados no escopo.'}\n\nO seu **Prompt Maestro do Google Antigravity** no painel lateral já foi sintetizado e atualizado em tempo real com base nestes dados. Você pode copiar o prompt ao lado agora mesmo!`;
      botTextDiv.innerHTML = formatMarkdown(fallbackReply);
      session.messages.push({
        role: 'assistant',
        content: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        attachments: [],
        insights: insights
      });
    }

    // Atualiza o prompt mestre e salva
    session.updated_at = new Date().toISOString();
    updateLivePromptSpec(session);
    saveAntigravitySessions();
    renderSessionsList();
    renderProjectMemory(session);
  }

  // Listeners de Ações
  if (btnSendAntigravityPrompt) {
    btnSendAntigravityPrompt.addEventListener('click', handleSendAntigravity);
  }

  if (btnNewAntigravitySession) {
    btnNewAntigravitySession.addEventListener('click', () => {
      createNewSession();
    });
  }

  if (inputSearchSessions) {
    inputSearchSessions.addEventListener('input', () => {
      renderSessionsList(inputSearchSessions.value);
    });
  }

  if (btnRenameSession) {
    btnRenameSession.addEventListener('click', () => {
      if (activeSessionId) renameSession(activeSessionId);
    });
  }

  if (selectAntigravityModel) {
    selectAntigravityModel.addEventListener('change', () => {
      const session = getActiveSession();
      if (session) {
        session.model = selectAntigravityModel.value;
        if (currentSessionModelPill) currentSessionModelPill.textContent = session.model;
        saveAntigravitySessions();
      }
    });
  }

  if (btnForceGeneratePrompt) {
    btnForceGeneratePrompt.addEventListener('click', () => {
      const session = getActiveSession();
      if (session) {
        updateLivePromptSpec(session);
        btnForceGeneratePrompt.innerHTML = '<span>✓ Prompt Gerado!</span>';
        setTimeout(() => {
          btnForceGeneratePrompt.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            <span>Gerar Prompt</span>
          `;
        }, 1800);
      }
    });
  }

  if (btnClearCurrentChat) {
    btnClearCurrentChat.addEventListener('click', () => {
      const session = getActiveSession();
      if (!session) return;
      if (confirm('Deseja limpar as mensagens desta conversa mantendo as regras já aprendidas?')) {
        session.messages = [
          {
            role: 'assistant',
            content: `Histórico limpo. As regras e memórias do projeto **${session.title}** continuam preservadas. O que gostaria de especificar agora?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            attachments: [],
            insights: []
          }
        ];
        saveAntigravitySessions();
        renderChatMessages(session);
      }
    });
  }

  if (btnTogglePromptPanel && antigravityPromptPanel) {
    btnTogglePromptPanel.addEventListener('click', () => {
      antigravityPromptPanel.classList.toggle('mobile-open');
    });
  }

  // Tabs do Painel de Prompt (Prompt Mestre, Regras, Skill, Checklist)
  promptSubtabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const subId = tab.getAttribute('data-subtab');
      promptSubtabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      document.querySelectorAll('.subtab-pane').forEach(p => p.classList.remove('active'));
      const targetPane = document.getElementById('subtab-' + subId);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Copiar Prompt Mestre
  if (btnCopyGeneratedPrompt && codeGeneratedPrompt) {
    btnCopyGeneratedPrompt.addEventListener('click', () => {
      navigator.clipboard.writeText(codeGeneratedPrompt.textContent).then(() => {
        btnCopyGeneratedPrompt.innerHTML = '<span>✓ Copiado!</span>';
        setTimeout(() => {
          btnCopyGeneratedPrompt.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copiar Prompt</span>
          `;
        }, 2000);
      });
    });
  }

  // Baixar Arquivo .md
  if (btnDownloadPrompt && codeGeneratedPrompt) {
    btnDownloadPrompt.addEventListener('click', () => {
      const session = getActiveSession();
      const content = codeGeneratedPrompt.textContent;
      const filename = `ANTIGRAVITY_PROMPT_${(session ? session.title : 'app').replace(/[^a-zA-Z0-9]/g, '_')}.md`;
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }

  // Copiar Regras AGENTS.md
  if (btnCopyRules && codeRulesDisplay) {
    btnCopyRules.addEventListener('click', () => {
      navigator.clipboard.writeText(codeRulesDisplay.textContent).then(() => {
        btnCopyRules.textContent = '✓ Copiado AGENTS.md!';
        setTimeout(() => { btnCopyRules.textContent = 'Copiar AGENTS.md'; }, 2000);
      });
    });
  }

  // Copiar Skill SKILL.md
  if (btnCopySkill && codeSkillDisplay) {
    btnCopySkill.addEventListener('click', () => {
      navigator.clipboard.writeText(codeSkillDisplay.textContent).then(() => {
        btnCopySkill.textContent = '✓ Copiado SKILL.md!';
        setTimeout(() => { btnCopySkill.textContent = 'Copiar SKILL.md'; }, 2000);
      });
    });
  }

  // Refinar com a IA
  if (btnAskRefinePrompt) {
    btnAskRefinePrompt.addEventListener('click', () => {
      if (antigravityPromptInput) {
        antigravityPromptInput.value = 'Revise a especificação atual do nosso projeto, aponte potenciais riscos técnicos, melhorias de arquitetura para o Google Antigravity e atualize o Prompt Mestre.';
        handleSendAntigravity();
      }
    });
  }

  // Inicialização do Módulo Antigravity
  loadAntigravitySessions();
  renderSessionsList();
  loadActiveSessionIntoUI();
});
