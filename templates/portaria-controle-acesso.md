# PROMPT DE ENGENHARIA: MÓDULO DE PORTARIA / CONTROLE DE ACESSO (PADRÃO METALFISA / SINCO)

> **Como usar:** copie o bloco abaixo e cole em qualquer IA de desenvolvimento (Antigravity, Cursor, Claude Code, ChatGPT etc.).
>
> **Origem:** código real já corrigido e testado (19/19 testes de integração).
> - Backend: `server/routes/portaria.js`
> - Migration: `server/migrations/create_portaria_tables.js`
> - Front: `services/portariaService.js`, `PortariaGuaritaPage.jsx`, `PortariaGerencialPage.jsx`, `PortariaTurnosPage.jsx`
>
> O schema foi extraído com `SHOW CREATE TABLE` do banco de produção (MariaDB 11.8). O collation foi trocado para `utf8mb4_unicode_ci` para rodar também em MySQL.

---

````markdown
Você é um Engenheiro de Software Fullstack Sênior (React + Tailwind, Node.js/Express, MySQL/MariaDB, Socket.IO).

Implemente do zero um **Módulo de Portaria / Controle de Acesso Industrial** com 3 telas:
1. **Guarita**: operação do porteiro, otimizada para tablet/celular, tema escuro
2. **Gerencial**: dashboard, cadastro de porteiros, livro de ocorrências, histórico com exportação para Excel
3. **Turnos**: cadastro de escalas, inclusive turnos que passam da meia-noite

Paleta: slate-950 de fundo na guarita, esmeralda (#059669) para ações positivas, âmbar (#d97706) para atenção, vermelho para críticos. **Não usar roxo.**

---

## 1. BANCO DE DADOS

Crie como migration idempotente (`CREATE TABLE IF NOT EXISTS`):

```sql
CREATE TABLE IF NOT EXISTS portaria_turnos (
    id INT(11) NOT NULL AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,                 -- pode ser menor que hora_inicio (turno noturno)
    descricao VARCHAR(255) DEFAULT NULL,
    ativo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portaria_porteiros (
    id INT(11) NOT NULL AUTO_INCREMENT,
    usuario_id INT(11) DEFAULT NULL,        -- vínculo com o login do sistema (a Guarita usa para identificar o porteiro)
    nome VARCHAR(150) NOT NULL,
    apelido VARCHAR(80) DEFAULT NULL,
    cpf VARCHAR(20) DEFAULT NULL,
    rg VARCHAR(20) DEFAULT NULL,
    telefone VARCHAR(30) DEFAULT NULL,
    telefone_emergencia VARCHAR(30) DEFAULT NULL,
    contato_emergencia_nome VARCHAR(100) DEFAULT NULL,
    foto_url TEXT DEFAULT NULL,
    turno_id INT(11) DEFAULT NULL,
    status ENUM('ATIVO','FERIAS','AFASTADO','INATIVO') DEFAULT 'ATIVO',
    observacoes TEXT DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_usuario_id (usuario_id),
    KEY idx_turno_id (turno_id),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portaria_acessos (
    id INT(11) NOT NULL AUTO_INCREMENT,
    tipo ENUM('VISITANTE','PRESTADOR','FORNECEDOR_CARGA','CLIENTE','COLABORADOR','OUTRO') DEFAULT 'VISITANTE',
    nome_pessoa VARCHAR(150) NOT NULL,
    documento VARCHAR(30) DEFAULT NULL,
    telefone VARCHAR(30) DEFAULT NULL,
    empresa_origem VARCHAR(150) DEFAULT NULL,
    setor_destino VARCHAR(100) DEFAULT NULL,
    responsavel_interno VARCHAR(150) DEFAULT NULL,
    tipo_veiculo ENUM('CARRETA','CAMINHAO','VUC','UTILITARIO','CARRO','MOTO','NENHUM') DEFAULT 'NENHUM',
    placa_veiculo VARCHAR(20) DEFAULT NULL,
    modelo_veiculo VARCHAR(80) DEFAULT NULL,
    cor_veiculo VARCHAR(40) DEFAULT NULL,
    numero_cracha VARCHAR(30) DEFAULT NULL,
    numero_nf VARCHAR(100) DEFAULT NULL,
    motivo_visita VARCHAR(255) DEFAULT NULL,
    foto_pessoa_url TEXT DEFAULT NULL,
    foto_veiculo_url TEXT DEFAULT NULL,
    porteiro_entrada_id INT(11) DEFAULT NULL,
    porteiro_saida_id INT(11) DEFAULT NULL,
    data_entrada DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_saida DATETIME DEFAULT NULL,
    tempo_permanencia_min INT(11) DEFAULT NULL,
    status ENUM('NO_PATIO','FINALIZADO','CANCELADO') DEFAULT 'NO_PATIO',
    observacoes TEXT DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_status (status),
    KEY idx_placa (placa_veiculo),
    KEY idx_documento (documento),
    KEY idx_data_entrada (data_entrada),
    KEY idx_numero_cracha (numero_cracha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portaria_ocorrencias (
    id INT(11) NOT NULL AUTO_INCREMENT,
    porteiro_saida_id INT(11) DEFAULT NULL,     -- quem entrega o turno
    porteiro_entrada_id INT(11) DEFAULT NULL,   -- quem assume
    turno_id INT(11) DEFAULT NULL,
    data_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_veiculos_patio INT(11) DEFAULT 0,
    total_pessoas_patio INT(11) DEFAULT 0,
    descricao_ocorrencias TEXT NOT NULL,
    veiculos_pendentes_json JSON DEFAULT NULL,  -- snapshot do pátio no momento da passagem
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_data_registro (data_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 2. BACKEND — Router `/api/portaria`

**Autenticação:** todas as rotas exigem JWT. Monte o router **depois** do middleware global `app.use('/api', authenticateToken)` ou aplique `router.use(authenticateToken)`.

**Uploads:** pasta `server/uploads/portaria/`, servida em `/uploads/portaria`. Use `multer` com limite de 15MB e aceite também foto em base64 da webcam. Crie o helper `saveBase64Image(base64, prefix)`: valida o formato `data:<mime>;base64,`, grava `.png` ou `.jpg` e devolve a URL pública (ou `null` se for inválido).

**Helpers obrigatórios** (campos de formulário/multipart chegam como string):
```js
const TIPOS_ACESSO   = ['VISITANTE','PRESTADOR','FORNECEDOR_CARGA','CLIENTE','COLABORADOR','OUTRO'];
const TIPOS_VEICULO  = ['CARRETA','CAMINHAO','VUC','UTILITARIO','CARRO','MOTO','NENHUM'];
const STATUS_PORTEIRO = ['ATIVO','FERIAS','AFASTADO','INATIVO'];
const toNull = (v) => (v === undefined || v === null || v === '' || v === 'null' ? null : v);
const toIntOrNull = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };
```
Nunca passe `undefined` como parâmetro de query (o mysql2 lança erro). Sempre use `toNull` / `toIntOrNull`.

### Rotas

| Método | Rota | Regra |
|---|---|---|
| GET | `/auxiliares` | `{ setores, colaboradores (idUsuario, NomeCompleto, Setor), turnos (ativos), porteiros (ATIVO) }` |
| GET | `/porteiros` | Lista com `nome_turno` e `login_usuario` (LEFT JOIN), ordenada por status e nome |
| POST | `/porteiros` | `nome` obrigatório; `status` precisa estar em `STATUS_PORTEIRO` (senão 400). Foto por arquivo (`foto`) ou `foto_base64` |
| PUT | `/porteiros/:id` | **Atualização parcial** (ver abaixo). 404 se não existir |
| GET | `/turnos` | Ordenado por `hora_inicio` |
| POST/PUT | `/turnos[/:id]` | `nome`, `hora_inicio` e `hora_fim` obrigatórios |
| DELETE | `/turnos/:id` | Se houver porteiro vinculado, **só desativa** (`ativo=0`) e avisa; senão exclui |
| POST | `/acessos/check-in` | Ver abaixo |
| POST | `/acessos/check-out/:id` | Ver abaixo |
| GET | `/acessos/ativos` | `status='NO_PATIO'` + `permanencia_atual_min = TIMESTAMPDIFF(MINUTE, data_entrada, NOW())`, mais antigo primeiro |
| GET | `/acessos/historico` | Filtros: `dataInicio`, `dataFim`, `tipo`, `status`, `placa`, `busca` (nome, documento, empresa, placa, crachá, NF), `limit` (padrão 100) |
| GET | `/dashboard` | KPIs + críticos + porteiros ativos |
| GET | `/ocorrencias` | Últimas 50 passagens, com nomes e fotos dos porteiros e nome do turno |
| POST | `/ocorrencias/passagem-turno` | Ver abaixo |

### PUT `/porteiros/:id`: atualização parcial
Campo que **não vier** no corpo mantém o valor atual. Isso evita apagar `usuario_id`, telefone etc. quando o front manda só uma parte dos dados.
```js
const [rows] = await db.execute('SELECT * FROM portaria_porteiros WHERE id = ?', [id]);
if (!rows.length) return res.status(404).json({ error: 'Porteiro não encontrado.' });
const atual = rows[0];
const pick = (c) => (Object.prototype.hasOwnProperty.call(body, c) ? body[c] : atual[c]);
// valida nome (400 se vazio) e status (400 se fora do enum)
// foto: arquivo novo > foto_base64 > mantém atual.foto_url
```

### Check-in (entrada)
- `nome_pessoa` é obrigatório. Retorna **400** se `tipo` não estiver em `TIPOS_ACESSO` ou `tipo_veiculo` não estiver em `TIPOS_VEICULO`.
- **Se `tipo_veiculo != 'NENHUM'`, a placa é obrigatória (400).** Se for `NENHUM`, grava a placa como `NULL`.
- Normaliza a placa: `placa.toUpperCase().replace(/[^A-Z0-9]/g, '')`. Exemplo: "abc-1d23" vira `ABC1D23`.
- Fotos `foto_pessoa` e `foto_veiculo` por multipart ou `*_base64`.
- Grava com `data_entrada = NOW()` e `status = 'NO_PATIO'`. Em seguida, busca o registro com o nome do porteiro e emite **`io.emit('portaria:novo_acesso', registro)`**. Retorna 201.

### Check-out (saída): UPDATE atômico
Não faça SELECT e depois UPDATE: dois tablets clicando juntos gerariam saída duplicada. Use:
```sql
UPDATE portaria_acessos SET
    data_saida = NOW(),
    tempo_permanencia_min = TIMESTAMPDIFF(MINUTE, data_entrada, NOW()),
    status = 'FINALIZADO',
    porteiro_saida_id = ?,
    observacoes = CASE WHEN ? IS NOT NULL
                       THEN CONCAT(COALESCE(observacoes,''), ' | Saída: ', ?)
                       ELSE observacoes END
WHERE id = ? AND status = 'NO_PATIO'
```
- `affectedRows === 0`: se o id não existe, retorna **404**; se existe, retorna **409** ("já finalizado").
- Se der certo, emite **`io.emit('portaria:saida_acesso', registro)`**.

### Filtros de data (performance)
Não use `DATE(coluna)` no WHERE, porque isso impede o banco de usar o índice `idx_data_entrada`. Use:
```sql
a.data_entrada >= ?                              -- dataInicio
a.data_entrada <  DATE_ADD(?, INTERVAL 1 DAY)    -- dataFim (inclui o dia inteiro)
data_entrada >= CURDATE() AND data_entrada < CURDATE() + INTERVAL 1 DAY   -- "hoje"
```
Exceção aceitável: `DATE(data_entrada) < CURDATE()` para contar pernoites, porque roda só sobre os poucos registros `NO_PATIO`.

### Dashboard
- **Pátio** (`status='NO_PATIO'`): `total_no_patio`, `total_veiculos` (`tipo_veiculo != 'NENHUM'`), `total_cargas` (`CARRETA`, `CAMINHAO`, `VUC`), `total_retidos_criticos` (**mais de 240 min**), `total_pernoitaram` (entrada antes de hoje).
- **Hoje:** `entradas_hoje`, `saidas_hoje`, `tempo_medio_minutos_hoje` (`ROUND(AVG(tempo_permanencia_min))`).
- **`veiculosCriticos`:** no pátio há mais de 4h **ou** desde o dia anterior, mais antigo primeiro.
- **`porteirosAtivos`:** com `nome_turno`, `hora_inicio` e `hora_fim`.

### Passagem de turno (livro de portaria)
- `descricao_ocorrencias` é obrigatória (400).
- `porteiro_saida_id` e `porteiro_entrada_id` são **obrigatórios e precisam ser diferentes** (400).
- Tira um **snapshot de todos os registros `NO_PATIO`** (id, tipo, nome, placa, tipo_veiculo, crachá, entrada, minutos) e grava em `veiculos_pendentes_json` (`JSON.stringify`).
- `total_veiculos_patio` = registros com veículo; `total_pessoas_patio` = todos.
- Retorna 201 com `{ id, veiculosPendentes }`.

---

## 3. FRONTEND (React + Tailwind + lucide-react + react-toastify + socket.io-client + xlsx)

**Regra geral de erro:** em todo `catch`, mostre `err.response?.data?.error` (a mensagem do backend) e use um texto genérico só como fallback.

### `services/portariaService.js`
`getAuxiliares`, `getAcessosAtivos`, `registrarCheckIn`, `registrarCheckOut(id, data)`, `getDashboard`, `getHistorico(params)`, `getPorteiros`, `salvarPorteiro(data, id?)` (POST ou PUT), `getTurnos`, `salvarTurno(data, id?)`, `excluirTurno`, `getOcorrencias`, `registrarPassagemTurno`.

### Rotas
`/portaria` redireciona para `/portaria/guarita`. Demais rotas: `/portaria/guarita`, `/portaria/gerencial`, `/portaria/turnos`.

### Tela 1 — `PortariaGuaritaPage.jsx` (operação)
- Tema escuro (`bg-slate-950`) e relógio digital atualizado a cada 1s.
- **Porteiro ativo:** procura em `auxiliares.porteiros` o porteiro cujo `usuario_id === user.idUsuario`. Se não achar, usa o primeiro da lista. Esse id vai em `porteiro_entrada_id` / `porteiro_saida_id`.
- **Tempo real (Socket.IO):**
  - `portaria:novo_acesso`: adiciona no topo sem duplicar (filtra pelo id) e mostra o toast "Nova entrada: Nome (Placa ou 'A pé')".
  - `portaria:saida_acesso`: remove da lista e mostra toast.
  - `socket.disconnect()` no unmount.
- **Contadores:** no pátio, veículos, cargas (carreta/caminhão/VUC), críticos (mais de 240 min).
- **Busca instantânea** (no cliente): nome, documento, placa, empresa, crachá, setor.
- **Visualização:** `cards` por padrão em telas de até 768px, `tabela` no desktop, com alternância manual. Item crítico com destaque vermelho e ícone de caminhão para `CARRETA`/`CAMINHAO`.
- **Permanência formatada:** `45 min` ou `2h 15m`.
- **Formulário de check-in:**
  - Botões de tipo: Visitante, Carga/Fornecedor, Prestador de Serviço, Cliente, Colaborador.
  - Nome*, Documento, Telefone, Empresa de origem, Setor de destino (autocomplete), Responsável interno (autocomplete dos colaboradores).
  - Veículo: Nenhum (a pé), Carreta/Bitrem, Caminhão Toco/Truck, VUC/3-4, Utilitário/Furgão/Van, Carro, Moto. **Placa obrigatória se o veículo não for NENHUM** (validar também no front). Modelo e cor.
  - Crachá, NF da carga, Motivo, Observações.
  - **Duas fotos** (pessoa e placa/veículo) por um `CameraCaptureModal` reutilizável (webcam via `getUserMedia` ou câmera do celular), que devolve base64. O botão muda para "Foto capturada".
  - Se der certo: toast, limpa o formulário, fecha e recarrega.
- **Check-out:** `window.confirm` com nome e placa. Se der certo, remove da lista. **Se o backend devolver 409** (outro tablet já registrou a saída), remove o item da lista e mostra um toast informativo, não um erro.

### Tela 2 — `PortariaGerencialPage.jsx` (4 abas)
1. **Dashboard:** cards dos KPIs, tabela de veículos críticos e porteiros em serviço.
2. **Porteiros:** grid com foto, turno, status e contatos de emergência. Modal de criar/editar com:
   - foto (upload ou câmera), turno, status (Ativo, Em Férias, Afastado, Inativo);
   - **"Login no sistema (opcional)"**: select com os colaboradores de `/auxiliares` que grava `usuario_id`, com a dica "Com o vínculo, a Guarita identifica automaticamente este porteiro ao fazer login". **Inclua `usuario_id` no estado do formulário, ao criar e ao editar.**
3. **Livro de Ocorrências:** formulário de passagem de turno (porteiro que sai*, porteiro que entra*, turno, descrição*). Valide no front que os dois porteiros foram informados e são diferentes. Mostre a linha do tempo das últimas 50 passagens com veículos/pessoas no pátio e o snapshot.
4. **Histórico:** filtros de período, tipo, status, placa e busca livre. Tabela com entrada, saída, permanência e porteiros. Botão **"Exportar para Excel (.xlsx)"** com `XLSX.utils.json_to_sheet` gerando o arquivo `Relatorio_Portaria_<AAAA-MM-DD>.xlsx`.

### Tela 3 — `PortariaTurnosPage.jsx`
Badge **"Em andamento agora"** e duração, cobrindo turno noturno:
```js
const isTurnoAgora = (inicio, fim, now = new Date()) => {
  const cur = now.getHours() * 60 + now.getMinutes();
  const [hI, mI] = inicio.split(':').map(Number);
  const [hF, mF] = fim.split(':').map(Number);
  const s = hI * 60 + mI, e = hF * 60 + mF;
  return s <= e ? (cur >= s && cur <= e) : (cur >= s || cur <= e);
};
const calcularDuracao = (inicio, fim) => {
  const [hI, mI] = inicio.split(':').map(Number);
  const [hF, mF] = fim.split(':').map(Number);
  let diff = (hF * 60 + mF) - (hI * 60 + mI);
  if (diff < 0) diff += 1440;
  return `${Math.floor(diff / 60)}h${diff % 60 ? ` ${diff % 60}m` : ''}`;
};
```
Modal de criar/editar (nome, início, fim, descrição, ativo/inativo), botão de ativar/desativar e exclusão (mostre a mensagem do backend quando ele só desativar).

---

## 4. CRITÉRIOS DE ACEITE (escreva testes de integração para cada um)
1. `check-in` com `tipo` inválido retorna 400; carro sem placa retorna 400.
2. Placa "abc-1d23" é salva como `ABC1D23`; documento vazio é salvo como `NULL`.
3. **Dois check-outs simultâneos no mesmo registro:** um retorna 200 e o outro 409.
4. Check-out de id inexistente retorna 404.
5. Histórico com `dataInicio = dataFim = hoje` traz o acesso de hoje.
6. `PUT /porteiros/:id` com `{ status: 'FERIAS' }` mantém nome, `usuario_id` e telefone.
7. PUT com nome vazio ou status inválido retorna 400; id inexistente retorna 404.
8. Passagem de turno sem porteiros ou com o mesmo porteiro dos dois lados retorna 400; a válida retorna 201 com o snapshot em JSON.
9. Dois tablets abertos: uma entrada feita em um aparece no outro **sem recarregar a página**.
10. Turno 22:00–06:00 mostra "Em andamento" às 02:00, com duração "8h".
11. Porteiro vinculado a um login é selecionado automaticamente na Guarita quando esse usuário entra.
````
