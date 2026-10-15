# PROMPT DE ENGENHARIA COMPLETO: SISTEMA DE GESTÃO E RESERVA DE SALAS DE REUNIÃO CORPORATIVAS (PADRÃO METALFISA / SINCO)

> **Instrução de uso:** Copie e cole todo o conteúdo abaixo no chat de qualquer IA de desenvolvimento (Antigravity, Cursor, Claude Code, ChatGPT, etc.) para criar o módulo completo de Salas de Reunião com fidelidade absoluta de banco de dados, regras de negócio anticonflito, telas, timeline interativa, totem para tablet de porta e geração de PDF.

---

```markdown
Você é um Engenheiro de Software Fullstack Sênior especialista em React, Node.js (Express), MySQL/PostgreSQL e UI/UX Corporativa.

Sua missão é implementar do absoluto zero um **Módulo Completo de Gestão e Reserva de Salas de Reunião Corporativas**, com padrão visual executivo premium, proteção anticonflito rigorosa no backend, timeline estilo Outlook/Google Calendar, modo Totem para tablet de porta (Kiosk Mode) e impressão de folha de porta em PDF.

Siga rigorosamente a arquitetura, regras de negócio, tabelas e componentes descritos abaixo:

---

## 1. BANCO DE DADOS (SCHEMA SQL)

Crie as tabelas com suporte a transações ACID e integridade referencial:

```sql
-- 1. Tabela de Salas
CREATE TABLE IF NOT EXISTS salas_reuniao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255) NULL,
    localizacao VARCHAR(100) NULL,
    capacidade INT NOT NULL DEFAULT 6,
    recursos_json JSON NULL COMMENT 'Array JSON de itens: ["smart_tv","videoconferencia","ar_condicionado","quadro_branco","projetor_laser","wifi"]',
    foto_url VARCHAR(500) NULL,
    cor_etiqueta VARCHAR(20) DEFAULT '#1E3A5F',
    exige_aprovacao TINYINT(1) DEFAULT 0,
    aprovador_id INT NULL,
    ativo TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela de Reservas
CREATE TABLE IF NOT EXISTS reservas_salas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE COMMENT 'Ex: RES-20261015-AB12',
    sala_id INT NOT NULL,
    organizador_id INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    pauta TEXT NULL,
    data_reserva DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    data_hora_inicio DATETIME NOT NULL,
    data_hora_fim DATETIME NOT NULL,
    status ENUM('confirmada', 'em_andamento', 'concluida', 'cancelada') DEFAULT 'confirmada',
    motivo_cancelamento VARCHAR(255) NULL,
    cancelado_por INT NULL,
    cancelado_em DATETIME NULL,
    recursos_solicitados VARCHAR(255) NULL,
    checkin_realizado TINYINT(1) DEFAULT 0,
    checkin_em DATETIME NULL,
    liberada_antecipadamente TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sala_data (sala_id, data_reserva, status),
    INDEX idx_intervalo (data_hora_inicio, data_hora_fim),
    CONSTRAINT fk_reserva_sala FOREIGN KEY (sala_id) REFERENCES salas_reuniao(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Participantes da Reserva
CREATE TABLE IF NOT EXISTS reservas_participantes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reserva_id INT NOT NULL,
    usuario_id INT NOT NULL,
    confirmou_presenca TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_reserva_usuario (reserva_id, usuario_id),
    INDEX idx_usuario_part (usuario_id),
    CONSTRAINT fk_part_reserva FOREIGN KEY (reserva_id) REFERENCES reservas_salas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela de Histórico e Auditoria
CREATE TABLE IF NOT EXISTS reservas_historico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reserva_id INT NOT NULL,
    usuario_id INT NOT NULL,
    acao VARCHAR(50) NOT NULL COMMENT 'criacao, alteracao, cancelamento, liberacao, envio_email',
    descricao TEXT NOT NULL,
    dados_anteriores JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reserva_hist (reserva_id),
    CONSTRAINT fk_hist_reserva FOREIGN KEY (reserva_id) REFERENCES reservas_salas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 2. BACKEND (ROTAS EXPRESS & REGRAS DE NEGÓCIO)

Monte o router em `/api/salas-reuniao` com os seguintes 10 endpoints e comportamentos:

### 1. `GET /api/salas-reuniao`
- Retorna todas as salas ativas (`ativo = 1`).
- Calcula em tempo real para cada sala:
  - `ocupada_agora`: booleano indicando se o horário atual coincide com alguma reserva ativa e não liberada antecipadamente.
  - `reserva_atual`: dados da reunião que está acontecendo agora (se houver).
  - `proxima_reserva`: dados da reunião futura mais próxima no dia.
  - `minutos_restantes`: contagem regressiva se a reunião estiver em andamento.

### 2. `POST /api/salas-reuniao` e `PUT /api/salas-reuniao/:id`
- Cadastro e edição de salas (nome, descrição, localização, capacidade, `recursos_json`, `cor_etiqueta`, `exige_aprovacao`).
- `DELETE /api/salas-reuniao/:id` deve fazer Soft Delete (`ativo = 0`).

### 3. `GET /api/salas-reuniao/reservas`
- Filtros opcionais por: `data_inicio`, `data_fim`, `sala_id`, `status` e busca textual (`busca` em título, pauta ou nome do organizador).
- Deve trazer via `JOIN` o nome e setor do organizador, nome e cor da sala, e a lista de participantes vinculados.

### 4. `POST /api/salas-reuniao/reservas` (VALIDAÇÃO ANTICONFLITO OBRIGATÓRIA)
- **Regra de Conflito de Horário:**
  ```javascript
  // Uma sala NÃO PODE ter duas reuniões sobrepostas!
  // Condição de Conflito: (inicio_existente < fim_nova) E (fim_existente > inicio_nova)
  const [conflito] = await pool.query(`
      SELECT r.id, r.titulo, r.hora_inicio, r.hora_fim, u.NomeCompleto as organizador
      FROM reservas_salas r
      JOIN usuario u ON r.organizador_id = u.idUsuario
      WHERE r.sala_id = ?
        AND r.data_reserva = ?
        AND r.status IN ('confirmada', 'em_andamento')
        AND r.liberada_antecipadamente = 0
        AND (? < r.data_hora_fim AND ? > r.data_hora_inicio)
      LIMIT 1
  `, [sala_id, data_reserva, data_hora_inicio, data_hora_fim]);

  if (conflito.length > 0) {
      return res.status(409).json({
          error: `Conflito de horário! A sala já está reservada das ${conflito[0].hora_inicio} às ${conflito[0].hora_fim} por ${conflito[0].organizador} ("${conflito[0].titulo}").`
      });
  }
  ```
- Gera código único legível (ex: `RES-${YYYYMMDD}-${random4}`).
- Insere participantes em `reservas_participantes`.
- Registra histórico de auditoria em `reservas_historico`.
- Dispara e-mail corporativo formatado em HTML com card informativo para todos os participantes que possuírem e-mail cadastrado.

### 5. `PUT /api/salas-reuniao/reservas/:id`
- Permite remarcar ou trocar de sala.
- Executa a mesma validação anticonflito, ignorando a própria reserva (`id != ?`).
- Salva snapshot dos dados anteriores no histórico.

### 6. `POST /api/salas-reuniao/reservas/:id/cancelar`
- Altera `status = 'cancelada'`, grava `motivo_cancelamento`, `cancelado_por` e `cancelado_em`.
- Libera a sala imediatamente para outros colaboradores.

### 7. `POST /api/salas-reuniao/reservas/:id/liberar` (CHECK-OUT ANTECIPADO)
- Usado quando a reunião termina antes do horário planejado.
- Define `liberada_antecipadamente = 1` e ajusta `hora_fim` e `data_hora_fim` para o momento atual.
- A sala fica instantaneamente verde/livre no painel e no totem de porta.

### 8. `GET /api/salas-reuniao/participantes-disponiveis`
- Retorna lista de usuários ativos (`idUsuario`, `NomeCompleto`, `email`, `Setor`) para o seletor do modal de reserva.

---

## 3. FRONTEND (REACT + TAILWIND CSS + LUCIDE ICONS)

A tela principal e seus modais devem ser implementados com design moderno, limpo e paleta corporativa elegante (Navy `#1E3A5F`, Slate `#0f172a`, Emerald `#059669`, Amber `#d97706` — **PROIBIDO USO DE ROXO/PURPLE**):

### Componente Principal: `SalasReuniaoCentral.jsx`
1. **Cabeçalho com Navegação:**
   - Seletor de Data com botões de "Hoje", "Anterior" (`<`) e "Próximo" (`>`) e DatePicker.
   - Botão em destaque `+ Nova Reserva`.
   - Botões de ferramentas: `Totem Tablet Porta` (ícone tablet), `Imprimir Folha de Porta` (ícone impressora), `Gerenciar Salas` (ícone engrenagem), e botão `Atualizar`.
   - Seletor de Modo de Visualização (3 Abas):
     - **Timeline Interativa (Padrão):** Linha do tempo visual horizontal de 24 horas (coluna com as salas à esquerda e grid de 24 colunas à direita).
       - Traço vermelho vertical indicando em tempo real o minuto exato atual do dia ("Agora").
       - Centralização automática da rolagem horizontal (`scrollTo`) para que a hora atual fique no meio da tela ao abrir.
       - Blocos coloridos proporcionais representando as reuniões marcadas (com título, organizador e horário).
       - Espaços vazios clicáveis: ao clicar em um horário livre, abre o modal de `Nova Reserva` já preenchendo a sala e o horário de início selecionado!
     - **Visão por Cards de Salas:**
       - Cards das salas com status grande: `LIVRE` (verde esmeralda com badge animado) ou `OCUPADA AGORA` (âmbar/vermelho com contagem de tempo restante e pauta).
       - Capacidade, lista de recursos (TV, Wi-Fi, etc.), localização e botão de reserva rápida.
     - **Visão em Lista / Tabela:**
       - Tabela com filtros de status (Todas, Confirmadas, Em Andamento, Concluídas, Canceladas), busca rápida e menu de ações (Editar, Cancelar, Liberar Antecipadamente, Imprimir).

### Modais Integrados:
1. `NovaReservaModal.jsx`:
   - Seleção da sala com exibição da capacidade e recursos.
   - Data, horário de início e fim.
   - **Chips de Duração Rápida:** Botões de clique único `+15 min`, `+30 min`, `+45 min`, `+1h`, `+2h` para autoajuste do término.
   - Campo Título / Assunto da Reunião.
   - Pauta detalhada / Observações.
   - Seleção múltipla de participantes com campo de busca em tempo real e visualização de chips selecionados.
   - Checkboxes: *"Enviar convite por e-mail"* e *"Gerar link de notificação via WhatsApp"*.

2. `EditarReservaModal.jsx`:
   - Remarcação de dia, horários ou troca de sala.
   - Cancelamento com campo de justificativa.

3. `GerenciarSalasModal.jsx`:
   - Listagem e cadastro de salas.
   - Nome, localização, capacidade máxima.
   - Seletor de cor da etiqueta (paleta corporativa: Navy, Âmbar, Esmeralda, Índigo, Petróleo, Ardósia).
   - Checklist de amenidades com ícones: Smart TV, Videoconferência, Ar-Condicionado, Quadro Branco, Projetor Laser, Wi-Fi Corporativo.

4. `TotemPortaModal.jsx` (Modo Totem / Tablet de Porta):
   - Modo tela cheia para ficar rodando em iPads ou tablets Android fixados ao lado da porta da sala.
   - Relógio gigante atualizado segundo a segundo.
   - Layout de alto contraste:
     - Se a sala estiver LIVRE: Tela verde esmeralda com texto **"SALA DISPONÍVEL"**, aviso da próxima reunião e botão de toque rápido **"Reservar Agora (15 min / 30 min)"**.
     - Se a sala estiver OCUPADA: Tela âmbar escuro / vermelho com texto **"SALA EM REUNIÃO"**, título, organizador, horário de término e botão **"Liberar Sala Agora"**.
     - Lista lateral com todas as próximas reuniões do dia.
   - Auto-atualização periódica a cada 30 segundos.

5. `ImprimirFolhaPortaModal.jsx`:
   - Permite selecionar uma sala específica ou todas as salas para uma data selecionada.
   - Gera um PDF profissional (usando jsPDF / autoTable) com cabeçalho corporativo, lista cronológica de reuniões, organizador, participantes e campos de anotação de recepção, ideal para imprimir e afixar na porta de vidro pela manhã.

---

## 4. DESIGN & EXPERIÊNCIA DO USUÁRIO
- Paleta: Fundo limpo `#f8fafc` / `#0f172a`, cards com sombras suaves `shadow-sm`, bordas finas `border-slate-200`, badges arredondados.
- Feedback imediato: Notificações com `react-toastify` para sucesso, cancelamento e conflitos.
- Zero dependência de bibliotecas pesadas externas para o calendário: construa a timeline com CSS Grid e Flexbox nativos do Tailwind, garantindo carregamento instantâneo.
```
