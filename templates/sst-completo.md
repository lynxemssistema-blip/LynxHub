# PROMPT DE ENGENHARIA COMPLETO: MÓDULO SST CORPORATIVO & CONFORMIDADE REGULATÓRIA (NR-05, NR-06, NR-23 & BENEFÍCIOS)

> **Instrução de uso:** Copie e cole todo o conteúdo abaixo no chat de qualquer IA de desenvolvimento (Antigravity, Cursor, Claude Code, ChatGPT, etc.) para criar o módulo completo de Saúde e Segurança do Trabalho (SST) com banco de dados, biometria facial, ficha digital de EPI (NR-06), CIPA completa com urna eletrônica (NR-05), Brigada de Incêndio (NR-23) e Cesta Básica.

---

```markdown
Você é um Engenheiro de Software Fullstack Sênior especialista em React, Node.js (Express), MySQL/PostgreSQL, Tailwind CSS e Sistemas Corporativos de Saúde e Segurança do Trabalho (SST / SESMT).

Sua missão é implementar do absoluto zero um **Ecossistema Completo de SST (Saúde e Segurança do Trabalho)** aderente à legislação trabalhista brasileira (Normas Regulamentadoras NR-05, NR-06, NR-23 e benefícios corporativos).

O sistema é composto por 4 grandes pilares integrados:
1. **NR-06: Gestão de EPIs, Ficha Digital e Kardex de Estoque** (Substitui 100% o papel, com controle de validade de CA, rastreio de lote, previsão de trocas e assinatura eletrônica com biometria facial).
2. **NR-05: CIPA & Comissão Eleitoral** (Gestões de mandato, cronograma legal de prazos da NR-05, inscrição e homologação de candidatos, atas de reuniões mensais e Urna Eletrônica Secreta com criptografia Zero-Knowledge).
3. **NR-23: Brigada de Incêndio & Gestão de Emergências** (Cadastro de brigadistas, inventário de extintores e hidrantes com teste hidrostático, inspeção rápida mobile via QR Code, simulados de evacuação e Botão de Alerta de Emergência/Pânico).
4. **Gestão de Benefício & Cesta Básica** (Liberação mensal por período, verificação de elegibilidade/assiduidade, protocolo digital de entrega e recibo em PDF).

---

## 1. BANCO DE DADOS (SCHEMA SQL COMPLETO)

Execute o script DDL abaixo no MySQL para criar toda a estrutura relacional com índices, foreign keys e integridade transacional:

```sql
-- ============================================================================
-- 1. PILAR NR-06: EPIs, FICHAS DIGITAIS, KARDEX & AUDITORIA
-- ============================================================================

-- Catálogo de EPIs cadastrados e homologados com C.A. do Ministério do Trabalho
CREATE TABLE IF NOT EXISTS sst_epis_catalogo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto_codigo VARCHAR(50) NOT NULL COMMENT 'Código no ERP ou Protheus (SB1)',
    descricao VARCHAR(255) NOT NULL,
    unidade VARCHAR(10) DEFAULT 'UN',
    ca_numero VARCHAR(50) NOT NULL COMMENT 'Certificado de Aprovação (MTE)',
    ca_validade DATE DEFAULT NULL,
    categoria_protecao ENUM('cabeca', 'olhos_face', 'auditiva', 'respiratoria', 'tronco', 'membros_superiores', 'membros_inferiores', 'corpo_inteiro', 'contra_quedas') DEFAULT 'membros_superiores',
    periodicidade_dias INT DEFAULT 30 COMMENT 'Vida útil estimada para troca preventiva',
    instrucoes_uso TEXT DEFAULT NULL,
    saldo_atual DECIMAL(10,2) DEFAULT 0.00,
    estoque_minimo DECIMAL(10,2) DEFAULT 0.00,
    localizacao VARCHAR(100) DEFAULT NULL,
    custo_unitario DECIMAL(10,2) DEFAULT 0.00,
    ativo TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sst_produto (produto_codigo),
    INDEX idx_sst_ca (ca_numero),
    INDEX idx_sst_categoria (categoria_protecao),
    INDEX idx_sst_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ficha de EPI vinculada ao Colaborador (1 ficha mestre por funcionário)
CREATE TABLE IF NOT EXISTS sst_fichas_epi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE COMMENT 'ID do colaborador no sistema',
    data_abertura DATE NOT NULL,
    observacoes TEXT DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'ativo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sst_fichas_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Histórico de Entregas, Trocas e Devoluções de EPI
CREATE TABLE IF NOT EXISTS sst_fichas_entregas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ficha_id INT NOT NULL,
    epi_id INT NOT NULL,
    ca_numero VARCHAR(50) NOT NULL,
    ca_validade DATE DEFAULT NULL,
    quantidade DECIMAL(10,2) DEFAULT 1.00,
    unidade VARCHAR(10) DEFAULT 'UN',
    motivo ENUM('admissional', 'troca_desgaste', 'dano_extravio', 'adequacao_funcao', 'periodica') DEFAULT 'admissional',
    data_entrega DATE NOT NULL,
    previsao_troca DATE DEFAULT NULL,
    lote_fabricante VARCHAR(50) DEFAULT NULL,
    validade_fabricante DATE DEFAULT NULL,
    entregue_por VARCHAR(100) NOT NULL,
    status_entrega ENUM('em_uso', 'devolvido', 'descartado') DEFAULT 'em_uso',
    data_devolucao DATE DEFAULT NULL,
    motivo_devolucao VARCHAR(255) DEFAULT NULL,
    termo_aceite_digital TINYINT(1) DEFAULT 0,
    tipo_assinatura ENUM('senha_hash', 'biometria_facial', 'fisica') DEFAULT 'senha_hash',
    assinatura_hash VARCHAR(128) DEFAULT NULL,
    foto_biometria_url VARCHAR(500) DEFAULT NULL,
    observacoes TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sst_entregas_ficha (ficha_id),
    INDEX idx_sst_entregas_epi (epi_id),
    INDEX idx_sst_entregas_status (status_entrega),
    INDEX idx_sst_entregas_previsao (previsao_troca),
    CONSTRAINT fk_entrega_ficha FOREIGN KEY (ficha_id) REFERENCES sst_fichas_epi(id) ON DELETE CASCADE,
    CONSTRAINT fk_entrega_epi FOREIGN KEY (epi_id) REFERENCES sst_epis_catalogo(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Movimentações de Estoque do Almoxarifado SST (KARDEX Rastreável)
CREATE TABLE IF NOT EXISTS sst_epis_movimentacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    epi_id INT NOT NULL,
    tipo_movimentacao ENUM('entrada_compra', 'saida_entrega', 'devolucao_reaproveitamento', 'descarte', 'ajuste_inventario') NOT NULL,
    quantidade DECIMAL(10,2) NOT NULL,
    saldo_anterior DECIMAL(10,2) NOT NULL,
    saldo_novo DECIMAL(10,2) NOT NULL,
    custo_unitario DECIMAL(10,2) DEFAULT 0.00,
    documento_referencia VARCHAR(100) DEFAULT NULL COMMENT 'Número da NF, Solicitação ou ID de Entrega',
    usuario_id INT DEFAULT NULL,
    usuario_responsavel VARCHAR(100) NOT NULL,
    motivo_observacao TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mov_epi (epi_id),
    INDEX idx_mov_tipo (tipo_movimentacao),
    INDEX idx_mov_data (created_at),
    CONSTRAINT fk_mov_epi FOREIGN KEY (epi_id) REFERENCES sst_epis_catalogo(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Configurações de Alertas e Notificações SST
CREATE TABLE IF NOT EXISTS sst_config_alertas (
    id INT PRIMARY KEY DEFAULT 1,
    dias_aviso_ca INT DEFAULT 30,
    dias_aviso_troca INT DEFAULT 7,
    notificar_whatsapp TINYINT(1) DEFAULT 1,
    notificar_email TINYINT(1) DEFAULT 1,
    email_gestor_sst VARCHAR(150) DEFAULT 'sst@empresa.com.br',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. PILAR NR-05: CIPA & URNA ELETRÔNICA ANÔNIMA
-- ============================================================================

-- Gestões Anuais da CIPA
CREATE TABLE IF NOT EXISTS cipa_gestoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ano_inicio INT NOT NULL,
    ano_fim INT NOT NULL,
    descricao VARCHAR(150) NOT NULL,
    data_inicio_mandato DATE DEFAULT NULL,
    data_fim_mandato DATE DEFAULT NULL,
    status ENUM('planejamento', 'inscricoes', 'eleicao', 'apurada', 'empossada', 'concluida') DEFAULT 'planejamento',
    vagas_titulares_eleitos INT DEFAULT 4,
    vagas_suplentes_eleitos INT DEFAULT 3,
    vagas_titulares_indicados INT DEFAULT 4,
    vagas_suplentes_indicados INT DEFAULT 3,
    total_eleitores_aptos INT DEFAULT 0,
    total_votos_apurados INT DEFAULT 0,
    quorum_atingido TINYINT(1) DEFAULT 0,
    data_apuracao DATETIME DEFAULT NULL,
    observacoes TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cipa_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cronograma Oficial de Prazos Legais da NR-05
CREATE TABLE IF NOT EXISTS cipa_cronograma_prazos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gestao_id INT NOT NULL,
    fase_codigo VARCHAR(50) NOT NULL,
    descricao_etapa VARCHAR(255) NOT NULL,
    dias_prazo_nr05 INT NOT NULL,
    data_prevista DATE NOT NULL,
    data_realizada DATE DEFAULT NULL,
    status ENUM('pendente', 'em_andamento', 'concluido', 'atrasado') DEFAULT 'pendente',
    responsavel VARCHAR(100) DEFAULT NULL,
    documento_anexo_url VARCHAR(255) DEFAULT NULL,
    observacoes TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cipa_cronograma_gestao (gestao_id),
    CONSTRAINT fk_cronograma_gestao FOREIGN KEY (gestao_id) REFERENCES cipa_gestoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Candidatos a Representantes dos Empregados
CREATE TABLE IF NOT EXISTS cipa_candidatos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gestao_id INT NOT NULL,
    usuario_id INT NOT NULL,
    numero_chapa INT NOT NULL,
    nome_urna VARCHAR(150) NOT NULL,
    cargo_setor VARCHAR(150) DEFAULT NULL,
    foto_url TEXT DEFAULT NULL,
    data_inscricao DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pendente', 'deferido', 'indeferido') DEFAULT 'pendente',
    motivo_indeferimento TEXT DEFAULT NULL,
    total_votos INT DEFAULT 0,
    classificacao INT DEFAULT NULL,
    resultado ENUM('titular_eleito', 'suplente_eleito', 'nao_eleito') DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cipa_candidato_gestao (gestao_id, usuario_id),
    UNIQUE KEY uq_cipa_chapa_gestao (gestao_id, numero_chapa),
    CONSTRAINT fk_cand_gestao FOREIGN KEY (gestao_id) REFERENCES cipa_gestoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Controle de Quórum e Voto Único (Armazena quem votou para impedir duplicidade)
CREATE TABLE IF NOT EXISTS cipa_eleitores_votaram (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gestao_id INT NOT NULL,
    usuario_id INT NOT NULL,
    data_hora_voto DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_origem VARCHAR(50) DEFAULT NULL,
    dispositivo VARCHAR(100) DEFAULT 'web',
    UNIQUE KEY uq_eleitor_gestao (gestao_id, usuario_id),
    INDEX idx_votaram_gestao (gestao_id),
    CONSTRAINT fk_eleitor_gestao FOREIGN KEY (gestao_id) REFERENCES cipa_gestoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cédulas Eletrônicas Anônimas (ZERO-KNOWLEDGE / SIGILO TOTAL)
-- REGRA MANDATÓRIA: Esta tabela NUNCA armazena usuario_id! O voto é 100% anônimo.
CREATE TABLE IF NOT EXISTS cipa_cedulas_votos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gestao_id INT NOT NULL,
    candidato_id INT DEFAULT NULL,
    tipo_voto ENUM('valido', 'branco', 'nulo') NOT NULL,
    hash_comprovante VARCHAR(128) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cedula_gestao (gestao_id),
    INDEX idx_cedula_candidato (candidato_id),
    CONSTRAINT fk_cedula_gestao FOREIGN KEY (gestao_id) REFERENCES cipa_gestoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Membros Oficiais da Gestão Empossada (Eleitos e Indicados)
CREATE TABLE IF NOT EXISTS cipa_membros_gestao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gestao_id INT NOT NULL,
    usuario_id INT NOT NULL,
    origem ENUM('eleito', 'indicado') NOT NULL,
    tipo_vaga ENUM('titular', 'suplente') NOT NULL,
    cargo_cipa ENUM('presidente', 'vice_presidente', 'secretario', 'secretario_substituto', 'membro') DEFAULT 'membro',
    treinamento_concluido TINYINT(1) DEFAULT 0,
    ativo TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_membro_gestao (gestao_id, usuario_id),
    CONSTRAINT fk_membro_gestao FOREIGN KEY (gestao_id) REFERENCES cipa_gestoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Livro de Atas Digitais de Reuniões Mensais
CREATE TABLE IF NOT EXISTS cipa_atas_reunioes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gestao_id INT NOT NULL,
    numero_ata INT NOT NULL,
    tipo_reuniao ENUM('ordinaria', 'extraordinaria') DEFAULT 'ordinaria',
    data_reuniao DATE NOT NULL,
    horario_inicio TIME DEFAULT NULL,
    horario_fim TIME DEFAULT NULL,
    local_reuniao VARCHAR(100) DEFAULT 'Sala de Reuniões',
    pauta TEXT NOT NULL,
    deliberacoes TEXT DEFAULT NULL,
    documento_anexo_url VARCHAR(255) DEFAULT NULL,
    status ENUM('rascunho', 'aguardando_assinaturas', 'homologada') DEFAULT 'homologada',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ata_gestao (gestao_id),
    CONSTRAINT fk_ata_gestao FOREIGN KEY (gestao_id) REFERENCES cipa_gestoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. PILAR NR-23: BRIGADA DE INCÊNDIO & GESTÃO DE EMERGÊNCIAS
-- ============================================================================

-- Integrantes da Brigada de Incêndio
CREATE TABLE IF NOT EXISTS sst_brigada_membros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    turno ENUM('1_turno', '2_turno', '3_turno', 'administrativo') DEFAULT '1_turno',
    setor_atuacao VARCHAR(100) DEFAULT NULL,
    papel ENUM('lider', 'vice_lider', 'brigadista') DEFAULT 'brigadista',
    data_admissao_brigada DATE NOT NULL,
    certificado_url VARCHAR(500) DEFAULT NULL,
    treinamento_validade DATE DEFAULT NULL,
    ativo TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_brigada_user (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inventário de Equipamentos de Combate a Incêndio (Extintores, Hidrantes, etc.)
CREATE TABLE IF NOT EXISTS sst_brigada_equipamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_patrimonio VARCHAR(50) NOT NULL UNIQUE COMMENT 'Ex: EXT-01, HID-03',
    tipo ENUM('extintor_agua', 'extintor_pqs', 'extintor_co2', 'hidrante', 'alarme_incendio', 'porta_corta_fogo', 'lava_olhos') NOT NULL,
    capacidade VARCHAR(50) DEFAULT '10L / 6Kg',
    localizacao_setor VARCHAR(100) NOT NULL,
    codigo_qr VARCHAR(100) DEFAULT NULL,
    data_fabricacao DATE DEFAULT NULL,
    data_recarregamento DATE NOT NULL,
    validade_carga DATE NOT NULL,
    validade_teste_hidrostatico DATE NOT NULL COMMENT 'A cada 5 anos por norma',
    status ENUM('conforme', 'recarga_vencida', 'hidrostatico_vencido', 'em_manutencao', 'avariado') DEFAULT 'conforme',
    ativo TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_equip_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Histórico de Inspeções Periódicas (Rondas Mensais / QR Code Mobile)
CREATE TABLE IF NOT EXISTS sst_brigada_inspecoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipamento_id INT NOT NULL,
    inspetor_usuario_id INT NOT NULL,
    data_inspecao DATE NOT NULL,
    manometro_pressao ENUM('conforme_verde', 'despressurizado', 'sobrepressurizado') DEFAULT 'conforme_verde',
    lacre_intacto TINYINT(1) DEFAULT 1,
    bico_mangueira_obstruido TINYINT(1) DEFAULT 0,
    acesso_desobstruido TINYINT(1) DEFAULT 1,
    placa_sinalizacao_ok TINYINT(1) DEFAULT 1,
    resultado ENUM('aprovado', 'reprovado_troca_imediata', 'observacao') DEFAULT 'aprovado',
    foto_evidencia_url VARCHAR(500) DEFAULT NULL,
    observacoes TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_insp_equip (equipamento_id),
    CONSTRAINT fk_insp_equip FOREIGN KEY (equipamento_id) REFERENCES sst_brigada_equipamentos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exercícios Simulados de Evacuação
CREATE TABLE IF NOT EXISTS sst_brigada_simulados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_simulado DATE NOT NULL,
    tipo_cenario VARCHAR(150) NOT NULL COMMENT 'Ex: Incêndio no setor de pintura',
    tempo_evacuacao_minutos DECIMAL(5,2) NOT NULL,
    total_participantes INT NOT NULL,
    ponto_encontro_ok TINYINT(1) DEFAULT 1,
    relatorio_avaliador TEXT NOT NULL,
    arquivo_ata_url VARCHAR(500) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Histórico de Alertas de Emergência / Botão de Pânico
CREATE TABLE IF NOT EXISTS sst_brigada_alertas_emergencia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    solicitante_usuario_id INT NULL,
    solicitante_nome VARCHAR(255) NULL,
    local_incidente VARCHAR(255) NOT NULL,
    descricao_ocorrencia TEXT NOT NULL,
    nivel_urgencia ENUM('moderado', 'grave', 'critico_evacuacao') DEFAULT 'grave',
    turno_alvo VARCHAR(50) DEFAULT 'todos',
    midia_url VARCHAR(500) NULL,
    telefones_notificados INT DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. PILAR CESTA BÁSICA & BENEFÍCIOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sst_cesta_periodos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    competencia VARCHAR(7) NOT NULL COMMENT 'Ex: 2026-10',
    descricao VARCHAR(100) NOT NULL,
    data_liberacao DATE NOT NULL,
    data_limite_retirada DATE NOT NULL,
    status ENUM('aberto', 'encerrado') DEFAULT 'aberto',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cesta_comp (competencia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sst_cesta_entregas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    periodo_id INT NOT NULL,
    usuario_id INT NOT NULL,
    elegivel TINYINT(1) DEFAULT 1,
    motivo_inelegibilidade VARCHAR(255) DEFAULT NULL,
    status ENUM('pendente', 'entregue', 'inapto') DEFAULT 'pendente',
    data_hora_entrega DATETIME DEFAULT NULL,
    entregador_usuario_id INT DEFAULT NULL,
    assinatura_hash VARCHAR(128) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_entrega_periodo_user (periodo_id, usuario_id),
    CONSTRAINT fk_cesta_periodo FOREIGN KEY (periodo_id) REFERENCES sst_cesta_periodos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 2. BACKEND API (EXPRESS ROUTERS & REGRAS DE NEGÓCIO)

Organize os routers em 4 módulos:

### A) Router `/api/sst` (EPIs & Fichas Digitais)
1. `GET /api/sst/stats`: Retorna os KPIs do dashboard:
   - `total_epis`, `total_ca_vencendo` (próximos 30 dias), `total_estoque_baixo`, `total_estoque_zerado`.
   - `total_fichas_ativas`, `total_vencidos` (itens em uso com previsão de troca expirada), `total_vencendo_7d`.
2. `GET /api/sst/epis`: Lista de EPIs com filtros por categoria, busca textual e alerta de C.A. vencido.
3. `POST /api/sst/epis` & `PUT /api/sst/epis/:id`: Cadastro e atualização de EPIs (C.A., validade, periodicidade, estoque mínimo).
4. `GET /api/sst/colaboradores`: Lista colaboradores trazendo contagem de EPIs em uso e status de conformidade (`conforme` = verde, `atencao_7d` = amarelo, `irregular_vencido` = vermelho).
5. `GET /api/sst/fichas/:usuarioId`: Retorna a ficha completa do colaborador com o histórico cronológico de entregas e devoluções.
6. `POST /api/sst/fichas/:usuarioId/entregas`: **Registro de Nova Entrega**:
   - Cria a entrega e calcula automaticamente a data `previsao_troca = data_entrega + periodicidade_dias`.
   - **Abate automático do estoque:** Deduz a quantidade do saldo em `sst_epis_catalogo` e registra no KARDEX (`sst_epis_movimentacoes`) como `saida_entrega`.
   - Aplica a assinatura eletrônica do colaborador (senha com hash seguro ou biometria facial).
7. `POST /api/sst/entregas/:entregaId/assinar-facial`: Validação por reconhecimento facial via `face-api.js` (compara o descritor facial de 128 dimensões com a foto oficial cadastrada do colaborador).
8. `POST /api/sst/estoque/entrada` e `POST /api/sst/estoque/ajuste`: Gerencia entradas de compras e inventários com histórico no Kardex.
9. `POST /api/sst/notificar-troca/:entregaId` e `POST /api/sst/notificar-trocas-lote`: Envia notificações personalizadas via WhatsApp e E-mail avisando o colaborador que o seu EPI está vencido ou vence em breve.

### B) Router `/api/cipa` (NR-05 & Urna Eletrônica)
1. `GET /api/cipa/gestoes`: Lista mandatos anuais com percentual de participação e status da eleição.
2. `POST /api/cipa/candidatos`: Inscrição com número de chapa, nome de urna e upload de foto.
3. `POST /api/cipa/urna/votar` (**MANDATÓRIO: PROTOCOLO ZERO-KNOWLEDGE**):
   ```javascript
   // 1. Verifica se a eleição está aberta
   // 2. Verifica se o usuário já votou
   const [jaVotou] = await pool.query('SELECT id FROM cipa_eleitores_votaram WHERE gestao_id = ? AND usuario_id = ?', [gestaoId, req.user.id]);
   if (jaVotou.length > 0) return res.status(403).json({ error: 'Você já exerceu seu voto nesta eleição!' });

   // 3. Registra que o eleitor votou (para controle de quórum)
   await pool.query('INSERT INTO cipa_eleitores_votaram (gestao_id, usuario_id) VALUES (?, ?)', [gestaoId, req.user.id]);

   // 4. Grava a cédula de forma 100% ANÔNIMA (sem usuario_id)
   const hashComprovante = crypto.createHash('sha256').update(`${gestaoId}-${Date.now()}-${Math.random()}`).digest('hex');
   await pool.query('INSERT INTO cipa_cedulas_votos (gestao_id, candidato_id, tipo_voto, hash_comprovante) VALUES (?, ?, ?, ?)', 
       [gestaoId, candidatoId || null, tipoVoto, hashComprovante]);

   // Retorna comprovante inviolável para o eleitor
   return res.json({ ok: true, hash_comprovante: hashComprovante });
   ```
4. `POST /api/cipa/eleicao/apurar`: Apuração oficial que calcula quórum (mínimo de 50% + 1 dos eleitores aptos), contabiliza votos, classifica candidatos mais votados e define Titulares e Suplentes.
5. `POST /api/cipa/atas` (com upload multipart/form-data): Registro e download de atas de reuniões mensais e posse.

### C) Router `/api/sst/brigada` (NR-23 & Emergências)
1. `GET /api/sst/brigada/dashboard`: Indicadores de prontidão (% de brigadistas com treinamento válido, extintores vencendo recarga em 30 dias e data do último simulado).
2. `GET /api/sst/brigada/equipamentos`: Inventário completo de extintores e hidrantes com badges de status de teste hidrostático e carga.
3. `POST /api/sst/brigada/inspecoes`: Registro de checklist de inspeção de extintor (manômetro, lacre, mangueira, sinalização, acesso) com upload de foto.
4. `POST /api/sst/brigada/alerta-emergencia`: **Botão de Pânico / Alerta de Incêndio**:
   - Dispara notificação imediata via WhatsApp e E-mail para todos os brigadistas ativos do turno informando o local exato do incidente e nível de urgência.

### D) Router `/api/sst/cesta-basica` (Benefícios)
1. `GET /api/sst/cesta-basica/stats`: Balanço de cestas entregues, pendentes e inaptas no mês.
2. `POST /api/sst/cesta-basica/entregas/:id/confirmar`: Confirmação da entrega com assinatura digital e baixa instantânea.

---

## 3. FRONTEND (REACT + TAILWIND CSS + MODAIS)

Crie interfaces modernas, intuitivas e corporativas (paleta de segurança: Slate `#0f172a`, Azul Industrial `#1E3A5F`, Esmeralda `#059669`, Âmbar `#d97706` e Vermelho Emergência `#dc2626` — **PROIBIDO ROXO/PURPLE**):

### Páginas Principais:
1. `SSTCentral.jsx` (`/sst`):
   - **Cabeçalho com KPIs:** Total de EPIs, C.A.s vencendo em 30 dias, Fichas Ativas e Trocas Atrasadas.
   - **4 Abas Principais:**
     - **Aba Colaboradores:** Tabela e Grid com busca, filtro de conformidade (Verde = 100% Conforme, Vermelho = EPIs Vencidos) e botão para abrir a Ficha de EPI.
     - **Aba Catálogo de EPIs:** Listagem dos equipamentos com número e validade do C.A., periodicidade recomendada e saldo de estoque. Botão de cadastro e edição.
     - **Aba Estoque & Kardex:** Painel de movimentações de almoxarifado, entradas de compras, ajustes de inventário e alerta de estoque mínimo.
     - **Aba Painel de Vencimentos:** Lista de trocas de EPI vencidas ou a vencer nos próximos 7 a 15 dias, com botão de disparo em lote via WhatsApp/E-mail.

2. `FichaEPIModal.jsx`:
   - Modal completo que reproduz a **Ficha Oficial de EPI (NR-06)**.
   - Dados cadastrais do funcionário (Nome, Matrícula, Função, Setor, Data de Admissão).
   - Termo legal de responsabilidade e guarda do EPI.
   - Histórico de entregas com status (*Em Uso*, *Devolvido*), botão de *Dar Baixa / Devolução* e *Nova Entrega*.
   - Modal de Nova Entrega com opção de **Assinatura por Senha** ou **Biometria Facial em Tempo Real** (com acesso à webcam do operador e verificação instantânea).
   - Botão de **Imprimir / Gerar PDF Oficial** com layout formal para auditorias do Ministério do Trabalho.

3. `CIPACentralPage.jsx` (`/sst/cipa`):
   - Gestão de Mandatos da CIPA com visualização do Cronograma Oficial de Prazos Legais (NR-05).
   - Aba de Candidatos com fotos, números de chapa e status de homologação.
   - Aba de Membros Eleitos e Indicados pelo Empregador.
   - Aba de Livro de Atas com upload de documentos assinados.
   - Atalho em destaque para o **Totem da Urna Eletrônica**.

4. `CIPAUrnaTotemPage.jsx` (`/sst/cipa/urna`):
   - Interface Kiosk (Totem de Votação Secreta) de alto impacto.
   - Login seguro do eleitor por matrícula/CPF.
   - Teclado numérico na tela para digitação do número do candidato, botão Branco e botão Corrige (estilo urna eletrônica do TSE).
   - Confirmação do voto com exibição da foto e nome do candidato.
   - Emissão de hash criptográfico inviolável na tela comprovando a participação sem revelar em quem o eleitor votou.

5. `BrigadaCentralPage.jsx` (`/sst/brigada`):
   - Lista de brigadistas voluntários por turno e setor com data de vencimento da reciclagem.
   - Inventário visual de Extintores e Hidrantes com badges de conformidade (Verde = Conforme, Vermelho = Recarga Vencida).
   - Histórico de Simulados de Evacuação com tempo de abandono de prédio.
   - **Botão de Pânico em Destaque:** Disparo de alerta de emergência geral com sirene visual na tela.

6. `BrigadaInspecaoRapidaPage.jsx` (`/sst/brigada/inspecao`):
   - Tela otimizada para smartphones e tablets para o brigadista inspecionar extintores em campo via leitura de QR Code.
   - Checklist simplificado com toques rápidos (Pressão do manômetro, Lacre, Acesso desobstruído) e botão de envio com foto.

7. `SSTCestaBasica.jsx` (`/sst/cesta-basica`):
   - Painel mensal de liberação de cestas com lista de colaboradores elegíveis, confirmação rápida de entrega e exportação do recibo em PDF.
```
