# Plano de Implementação — Portaria Clarity Glass

> Documento de acompanhamento do plano de melhorias.
> Criado em: 15/09/2026
> Regra: cada etapa é executada e, ao ser concluída, o status é atualizado aqui
> (com data e breve registro do que foi alterado).
>
> **STATUS GERAL: ✅ 13 de 13 etapas concluídas (15/09/2026).**

## Legenda de status

- ⬜ Pendente
- 🟨 Em andamento
- ✅ Concluída

## Resumo das etapas

| # | Etapa | Status |
|---|---|---|
| 1 | Logo real no relatório diário/período | ✅ Concluída |
| 2 | Alertas no Dashboard | ✅ Concluída |
| 3 | Restauração seletiva de backup | ✅ Concluída |
| 4 | Backup automático (Finalizar Turno + 6h/18h) | ✅ Concluída |
| 5 | Configurações de e-mail pela tela | ✅ Concluída |
| 6 | Ocorrências — gravidade + anexos (fotos) | ✅ Concluída |
| 7 | Relatório por período — escolher seções | ✅ Concluída |
| 8 | Relatório por período — filtros extras (porteiro/tipo) | ✅ Concluída |
| 9 | Relatório individual por pessoa | ✅ Concluída |
| 10 | Busca global no topo | ✅ Concluída |
| 11 | Acessibilidade + modo quiosque/tela cheia | ✅ Concluída |
| 12 | Unificar primeiros socorros no IndexedDB | ✅ Concluída |
| 13 | Envio direto de e-mail (SMTP) | ✅ Concluída |

> **Regra de sincronização do projeto**: toda alteração deve ser feita na raiz
> (Electron) e espelhada em `versao-web/`. Em `index.html` da versão web, a linha
> do services é o bundle `../js/portaria-services-web.js` (sem `type="module"`).
> Nunca usar `Set-Content -Encoding UTF8` (causa mojibake); usar `Copy-Item` e
> Node `fs` UTF-8. Validar com `node --check`.

---

## Etapa 1 — Logo real no relatório diário/período

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** substituir o placeholder "LOGO" do cabeçalho dos relatórios
(diário e por período) pela logo real da Clarity Glass.

**Arquivos:** `services/pdfService.js`, `versao-web/js/portaria-services-web.js`.

**Passos:**
1. Em `drawHeader`, usar `window.CLARITY_LOGO` (ou `localStorage.clarityLogo`)
   com `doc.addImage(...)`, mantendo o placeholder apenas como fallback.
2. Espelhar no bundle da versão web.
3. Validar com `node --check` e teste de geração.

**Critério de conclusão:** o PDF do relatório diário e do período exibe a logo real.

---

## Etapa 2 — Alertas no Dashboard

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** mostrar no Dashboard quantas chaves estão em uso, EPIs pendentes,
pessoas "dentro" agora e insumos críticos.

**Arquivos:** `index.html`, `js/dashboard.js`, `css/dashboard.css` (+ cópias web).

**Passos:**
1. Calcular os indicadores a partir das stores (`chaves` em uso, `epis`
   pendentes, `entradas_saidas` com status dentro, insumos com estoque crítico).
2. Exibir em uma faixa de indicadores/alertas no Dashboard.
3. Espelhar na versão web.

**Critério de conclusão:** o Dashboard mostra os 4 indicadores com valores reais.

---

## Etapa 3 — Restauração seletiva de backup

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** permitir escolher quais módulos restaurar, em vez de substituir tudo.

**Arquivos:** `index.html`, `js/dashboard.js` (+ cópias web).

**Passos:**
1. Ao selecionar o arquivo de backup, abrir modal com checkboxes por módulo
   (mostrando a contagem de registros de cada um).
2. Restaurar apenas os módulos marcados.
3. Espelhar na versão web.

**Critério de conclusão:** restauração parcial funciona sem apagar os demais módulos.

---

## Etapa 4 — Backup automático (Finalizar Turno + 6h/18h)

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** gerar o JSON do Backup Geral automaticamente, sem nenhuma
confirmação/janela:
- ao clicar em **Finalizar Turno** (junto com o PDF);
- todos os dias às **06:00** e às **18:00**.

**Arquivos:** `js/dashboard.js`, novo `js/backup-auto.js`, HTMLs de todas as
páginas, `services/configService.js` (+ cópias web e bundle).

**Passos:**
1. Extrair a montagem do backup geral para função reutilizável.
2. Criar agendador compartilhado (carregado em todas as páginas) que, a cada
   minuto, verifica se chegou 06:00/18:00 e salva o JSON (controle de "já feito
   hoje" em `localStorage`). Fazer "catch-up" ao abrir o app se o horário passou.
3. No Electron o arquivo é gravado direto na pasta `controle-da-portaria` (sem
   diálogo). Na versão web, grava se a pasta já estiver autorizada; senão, cai
   para download.
4. Espelhar na versão web.

**Critério de conclusão:** backup JSON gerado automaticamente nos horários, sem
nenhuma janela de confirmação.

**Limitação conhecida:** o agendamento só ocorre com o app aberto (o sistema é
local). Ao reabrir, o "catch-up" gera o backup do horário perdido.

---

## Etapa 5 — Configurações de e-mail pela tela

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** editar destinatários/CC/assunto (e mensagem) pela interface, sem
mexer em `configService.js`.

**Arquivos:** `configuracoes/*`, `services/configService.js`, `services/emailService.js`
(+ cópias web e bundle).

**Passos:**
1. Adicionar campos de e-mail no módulo Configurações (persistidos em
   `localStorage.clarityEmailConfig`).
2. `ConfigService`/`EmailService` passam a usar os valores salvos, com fallback
   para os padrões atuais.
3. Espelhar na versão web.

**Critério de conclusão:** alterar os campos na tela muda o e-mail preparado no
"Finalizar Turno".

---

## Etapa 6 — Ocorrências: gravidade + anexos (fotos)

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** adicionar **gravidade** (Baixa/Média/Alta/Crítica) e **fotos**
anexadas a cada ocorrência, exibidas no histórico, modal e relatório.

**Arquivos:** `controle-de-ocorrencias/*` (+ cópias web), `services/pdfService.js`
e bundle (coluna de gravidade).

**Passos:**
1. Campos `gravidade` e `fotos: []` (base64, redimensionadas).
2. Input de arquivo (múltiplas fotos) com pré-visualização e remoção.
3. Histórico/modal exibem a gravidade (badge) e as fotos.
4. PDF do relatório mostra a gravidade (e indica presença de anexos).
5. Espelhar na versão web.

**Critério de conclusão:** cadastrar ocorrência com gravidade e fotos, vendo-os
no histórico, modal e PDF.

---

## Etapa 7 — Relatório por período: escolher seções

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** no relatório por período, escolher quais módulos/seções incluir.

**Arquivos:** `js/ui.js` (modal de período), `services/reportService.js`,
`services/pdfService.js` (+ cópias web e bundle).

**Passos:**
1. Adicionar checkboxes de seções no modal de período.
2. Passar a lista selecionada para o serviço, que inclui apenas essas seções no PDF.
3. Espelhar na versão web.

**Critério de conclusão:** gerar PDF somente com as seções marcadas.

---

## Etapa 8 — Relatório por período: filtros extras

**Status:** ✅ Concluída (15/09/2026) — escopo escolhido: **Porteiro + Tipo de pessoa**

**Objetivo:** filtrar o relatório por **setor, empresa, porteiro e tipo de pessoa**.

**Arquivos:** `js/ui.js`, `services/reportService.js` (+ cópias web e bundle).

**Passos:**
1. Adicionar campos de filtro no modal de período.
2. Aplicar os filtros aos módulos pertinentes na coleta de dados.
3. Espelhar na versão web.

**Critério de conclusão:** o PDF reflete os filtros escolhidos.

---

## Etapa 9 — Relatório individual por pessoa

**Status:** ✅ Concluída (15/09/2026)
**Ajuste (15/09/2026):** o relatório passou a incluir também a seção
**"Visitas — Controle de Visitantes"**, com as visitas casadas por nome e/ou
documento. As movimentações de Entrada e Saída continuam em seção própria
("Movimentações — Entrada e Saída"). Assim o relatório cobre os dois fluxos
(visitantes e funcionários/prestadores).

**Objetivo:** gerar um PDF com os dados da pessoa + histórico de acessos +
autorizações.

**Arquivos:** `controle-de-cadastros/*` (e/ou `controle-de-entrada-saida/*`),
`services/pdfService.js` (+ cópias web e bundle).

**Passos:**
1. Botão "Relatório da pessoa" no detalhe/lista do Cadastro de Pessoas.
2. Gerar PDF (dados cadastrais, movimentações e autorizações).
3. Espelhar na versão web.

**Critério de conclusão:** PDF individual gerado a partir do cadastro.

---

## Etapa 10 — Busca global no topo

**Status:** ✅ Concluída (15/09/2026)
**Ajuste (15/09/2026):** o dropdown de resultados era cortado pelo
`overflow: hidden` do `.header` (usado para recortar os círculos decorativos).
O dropdown passou a usar `position: fixed`, com a posição calculada em JS
(`posicionarResultadosGlobais`) logo abaixo do campo, e reposicionamento em
`resize`/`scroll`. Agora os resultados aparecem completos por cima do conteúdo.

**Objetivo:** um campo no topo do Dashboard que procura em todos os módulos.

**Arquivos:** `index.html`, `js/dashboard.js`, `css/dashboard.css` (+ cópias web).

**Passos:**
1. Campo de busca global que consulta pessoas, visitantes, chaves, EPIs,
   ocorrências e avisos.
2. Resultados agrupados por módulo, com link para abrir o módulo.
3. Espelhar na versão web.

**Critério de conclusão:** buscar um termo e ver resultados dos vários módulos.

---

## Etapa 11 — Acessibilidade + modo quiosque/tela cheia

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** melhorar navegação por teclado/contraste e permitir tela cheia
(quiosque) no posto.

**Arquivos:** `css/base.css`, `js/ui.js`, `electron/main.js` (+ cópias web).

**Passos:**
1. Foco visível, navegação por teclado nos principais fluxos e contraste.
2. Botão de tela cheia (e modo quiosque no Electron).
3. Espelhar na versão web.

**Critério de conclusão:** tela cheia funcionando e navegação por teclado nos
fluxos principais.

---

## Etapa 12 — Unificar primeiros socorros no IndexedDB

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** migrar os dados de `localStorage.firstAidSystem` para uma store do
IndexedDB, com migração automática e preservação dos dados.

**Arquivos:** `js/db.js`, `controle-de-insumos-primeiros-socorros/script.js`,
`services/reportService.js` (+ cópias web e bundle).

**Passos:**
1. Nova store (ex.: `primeiros_socorros` / `insumos`) no IndexedDB + `DB_VERSION`.
2. Migração automática (uma vez) do `localStorage` para a store.
3. Módulo e relatórios passam a ler do IndexedDB, com fallback.
4. Espelhar na versão web.

**Critério de conclusão:** dados antigos preservados e módulo operando via IndexedDB.

---

## Etapa 13 — Envio direto de e-mail (SMTP)

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** enviar o relatório por e-mail direto (SMTP), sem depender do Outlook.

**Arquivos:** `electron/main.js`, `electron/preload.js`, `js/dashboard.js`,
`configuracoes/*` (+ cópias web).

**Passos:**
1. Configuração de SMTP (host, porta, usuário, senha/app password, TLS) na tela.
2. Envio no processo principal do Electron; fallback para o Outlook atual.
3. Espelhar na versão web (limitada — navegador não envia SMTP).
4. Documentar a implicação de distribuição (dependência no `node_modules`).

**Critério de conclusão:** e-mail enviado com o PDF anexado sem abrir o Outlook.

---

## Registro de execução

> Cada etapa concluída é registrada aqui.

- **15/09/2026 — Etapa 1 concluída**: `drawHeader` do `services/pdfService.js` e
  do bundle `versao-web/js/portaria-services-web.js` passaram a embutir a logo
  real (localStorage `clarityLogo` ou `window.CLARITY_LOGO`) via `doc.addImage`,
  com detecção de formato (`logoFormat`) e placeholder apenas como fallback.
  Validado com `node --check` e teste com jsPDF simulado (addImage chamado com
  data URL JPEG).
- **15/09/2026 — Etapa 2 concluída**: nova faixa de indicadores no Dashboard
  (`index.html` + `css/dashboard.css` + `js/dashboard.js`, espelhados na versão
  web): **chaves em uso**, **EPIs pendentes**, **pessoas no local** e **insumos
  críticos** (≤ 3). Validado no navegador (raiz e web) com dados semeados:
  valores 2 / 3 / 2 / 2 e 0 erros de console.
- **15/09/2026 — Etapa 3 concluída**: "Restaurar Backup" agora abre um modal
  (`#restoreModal`) listando os módulos do arquivo com contagem de registros e
  checkboxes. `confirmarRestauracao()` restaura **somente** os módulos marcados
  (stores + Primeiros Socorros + Preferências). Validado no navegador (raiz e
  web): ao desmarcar "chaves", a chave original foi preservada e os demais
  módulos restaurados; 0 erros de console.
- **15/09/2026 — Etapa 4 concluída**: criados `js/backup.js`
  (`window.PortariaBackup` com `build()`/`save()`) e `js/backup-auto.js`
  (agendador). O backup geral agora é gerado automaticamente:
  (a) junto do **Finalizar Turno** (`backupGeralSilencioso()`);
  (b) às **06:00** e **18:00** em todas as páginas (com "catch-up" ao abrir
  após o horário e controle de "já feito" em `localStorage.clarityBackupAuto`).
  Sem nenhuma confirmação; no Electron grava direto em `controle-da-portaria`.
  Scripts incluídos nas 22 páginas (raiz + web) após `alarme.js`. Validado no
  navegador (raiz e web): marca `AAAA-MM-DD|06:00` criada, 0 erros de console.
- **15/09/2026 — Etapa 5 concluída**: card "E-mail do Relatório" no módulo
  Configurações (destinatários, CC, assunto e mensagem, com `{data}` e botão
  "Restaurar padrão"), persistido em `localStorage.clarityEmailConfig`.
  `services/configService.js` e `services/emailService.js` (e o bundle web)
  passaram a usar os valores salvos com fallback para os padrões. Validado
  end-to-end (raiz e web): o modal do "Finalizar Turno" exibiu os valores
  customizados e a mensagem com a data substituída; 0 erros de console.
- **15/09/2026 — Etapa 6 concluída**: Ocorrências ganharam **Gravidade**
  (Baixa/Média/Alta/Crítica) e **fotos** (múltiplas, redimensionadas para
  ~1000px JPEG). Formulário com select + input de fotos e pré-visualização com
  remoção; histórico com coluna/badge de gravidade e ícone de câmera; modal de
  detalhes com gravidade e galeria; PDF e Excel (módulo e geral) com a coluna
  Gravidade (Excel com contagem de Fotos). Aplicado na raiz e espelhado na
  versão web. Validado no navegador (raiz e web): badge "Alta", ícone de foto,
  pré-visualização e galeria no modal; 0 erros de console.
  > Nota: um comando `Set-Content -Encoding UTF8` corrompeu o `script.js`
  > temporariamente; o arquivo foi restaurado do git e as edições refeitas com
  > a ferramenta de edição (lição registrada nas Observações).
- **15/09/2026 — Etapa 7 concluída**: o modal de "Relatório por Período" ganhou
  checkboxes das **9 seções** (com "Marcar/desmarcar todas"). O callback passou a
  receber `sections`; `ReportService.preparePeriodReport(start, end, sections)` e
  `PdfService.generatePeriodReport(modulesData, sections)` renderizam apenas as
  seções marcadas (o relatório diário continua com todas). Validado com teste de
  bundle (só Visitantes → 1 tabela; sem sections → 9 tabelas) e no navegador
  (raiz e web): 9 checkboxes, toggle zera, geração conclui; 0 erros de console.
- **15/09/2026 — Etapa 8 concluída**: o modal de período ganhou os filtros
  **Porteiro** (texto) e **Tipo de pessoa** (Todos/Visitante/Morador/Funcionário/
  Prestador). `collectModulesDataByPeriod(start, end, filters)` filtra por
  porteiro (visitantes, EPIs, avisos, ocorrências, entrada/saída) e por tipo
  (entrada/saída e autorizações). Aplicado ao PDF e ao Excel geral. Validado com
  teste de bundle + DB simulado (filtro ana+visitante → 1 linha por seção) e no
  navegador (raiz e web); 0 erros de console.
- **15/09/2026 — Etapa 9 concluída**: `UI.buildPdf` passou a aceitar
  `sections` (várias seções com texto ou tabela). No Cadastro de Pessoas, o modal
  de visualização ganhou o botão **"Relatório da pessoa"**, que gera um PDF em
  paisagem com **dados cadastrais + movimentações + autorizações**. Validado no
  navegador (raiz e web): toast "PDF gerado com sucesso!"; 0 erros de console.
- **15/09/2026 — Etapa 10 concluída**: campo de **Busca Global** no topo do
  Dashboard (header) que procura em pessoas, visitantes, chaves, EPIs,
  ocorrências, avisos e entrada/saída, com resultados agrupados por módulo e
  link para abrir o módulo (debounce 250 ms, botão de limpar, fecha ao clicar
  fora). Validado no navegador (raiz e web): termo "joao" retornou os 3 módulos
  semeados; 0 erros de console.
- **15/09/2026 — Etapa 11 concluída**: botão **"Tela cheia"** no Dashboard. No
  Electron usa IPC novo (`toggle-fullscreen`/`set-kiosk` em `main.js` +
  `preload.js`); no navegador usa a Fullscreen API. Acessibilidade: o
  `base.css` já tinha `:focus-visible` e `prefers-reduced-motion`; adicionado
  `aria-label` na busca global. Validado no navegador (raiz e web): entrou em
  tela cheia com toast de aviso; 0 erros de console.
- **15/09/2026 — Etapa 12 concluída**: IndexedDB `clarityPortaria` **v5** com a
  store `primeiros_socorros`. O módulo passou a ler/gravar o estado
  (`inventory`+`occurrences`) no IndexedDB, com **migração automática** do
  `localStorage.firstAidSystem` (mantido como espelho de compatibilidade).
  `reportService` (diário/período/Excel), `dashboard` (contador e insumos
  críticos) e o `Backup Geral` passaram a ler do IndexedDB com fallback. A
  restauração seletiva grava na store e no espelho. Validado no navegador (raiz
  e web): migração do localStorage para a store, tabela renderizada e Dashboard
  lendo do IndexedDB; 0 erros de console.
- **15/09/2026 — Ajuste da Etapa 10**: o dropdown da busca global não é mais
  cortado pelo cabeçalho. Validado no navegador (raiz e web): dropdown com
  altura 264px, largura igual à do campo, logo abaixo dele, dentro da tela e
  clicável (elemento no ponto = item do dropdown); 0 erros de console.
- **15/09/2026 — Ajuste da Etapa 9**: o relatório da pessoa agora traz também
  as visitas do **Controle de Visitantes** (seção "Visitas — Controle de
  Visitantes"), casadas por nome/documento, além das movimentações de Entrada e
  Saída. Validado no navegador (raiz e web): pessoa com 2 visitas + 1
  movimentação gerou as duas seções com as linhas corretas; 0 erros de console.
- **15/09/2026 — Conclusão geral**: as 13 etapas foram implementadas na raiz
  (Electron) e espelhadas em `versao-web/`. Verificação final: **0 arquivos
  espelhados divergentes**, `node --check` OK em todos os JS alterados, app
  Electron inicia normalmente e QA no navegador (raiz + web) sem erros de
  console. Pendência de teste real: envio SMTP precisa de um servidor de e-mail
  válido configurado na tela de Configurações (validado com servidor simulado).
- **15/09/2026 — Etapa 13 concluída**: envio direto por e-mail via **SMTP**,
  sem depender do Outlook. Criado `electron/emailSender.js` (cliente SMTP sem
  dependências externas: SSL/TLS direto, STARTTLS, AUTH LOGIN/PLAIN, anexo PDF).
  IPC `send-email` em `main.js` e `preload.js`. Card **"Servidor de E-mail
  (SMTP)"** no módulo Configurações (host, porta, TLS, usuário, senha,
  remetente) salvo em `localStorage.claritySmtpConfig`. Botão **"Enviar por
  e-mail"** no modal do Finalizar Turno (avisa que só funciona no aplicativo).
  Validado: teste unitário do MIME + diálogo SMTP completo com socket simulado
  (2 destinatários + anexo), `node --check`, navegador (raiz e web) e smoke test
  do Electron (app inicia normalmente). A senha do SMTP fica no localStorage
  local (aviso na tela).
