# Plano de Implementação — Portaria Clarity Glass

> Documento criado em **15/09/2026** e atualizado em **17/11/2026**.
> **Status geral: 13 de 13 etapas concluídas.**
> O sistema é uma aplicação web/PWA estática. As etapas abaixo descrevem a
> implementação atual; a etapa de e-mail foi adaptada para abrir o cliente de
> e-mail padrão do dispositivo.

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
| 11 | Acessibilidade + tela cheia | ✅ Concluída |
| 12 | Unificar primeiros socorros no IndexedDB | ✅ Concluída |
| 13 | Abrir relatório no cliente de e-mail padrão | ✅ Concluída |

## Regras do projeto

- Aplicação estática: HTML, CSS e JavaScript puro; sem build e sem framework.
- Toda a lógica de serviços de PDF, Excel, relatórios, e-mail (rascunho) e
  arquivos fica no bundle `js/portaria-services-web.js`, carregado por todas as
  páginas.
- Os dados de negócio ficam no IndexedDB `clarityPortaria` (v5); preferências e
  configurações ficam no `localStorage`.
- Nunca usar `Set-Content -Encoding UTF8` (causa mojibake); usar as ferramentas de
  edição ou Node `fs` em UTF-8.
- Validar JavaScript com `node --check`.
- A cada publicação, incrementar `CACHE_NAME` em `sw.js` para disparar a
  atualização do PWA.

---

## Etapa 1 — Logo real no relatório diário/período

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** substituir o placeholder “LOGO” do cabeçalho dos relatórios pela
logo real da Clarity Glass.

**Arquivos:** `js/portaria-services-web.js` (bundle de PDF).

**Implementação:**
1. `drawHeader` usa `window.CLARITY_LOGO` ou `localStorage.clarityLogo` com
   `doc.addImage(...)`.
2. O placeholder “LOGO” permanece apenas como fallback.
3. Detecção de formato (`logoFormat`) para JPEG/PNG.

**Critério de conclusão:** o PDF do relatório diário e do período exibe a logo
real. ✅

---

## Etapa 2 — Alertas no Dashboard

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** mostrar no Dashboard quantas chaves estão em uso, EPIs pendentes,
pessoas “dentro” agora e insumos críticos.

**Arquivos:** `index.html`, `js/dashboard.js`, `css/dashboard.css`.

**Implementação:**
1. Indicadores calculados a partir das stores `chaves`, `epis`,
   `entradas_saidas` e do estoque de Primeiros Socorros.
2. Faixa de alertas no topo do Dashboard.
3. Contadores também aparecem nos cards dos módulos.

**Critério de conclusão:** o Dashboard mostra os quatro indicadores com valores
reais. ✅

---

## Etapa 3 — Restauração seletiva de backup

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** permitir escolher quais módulos restaurar, em vez de substituir
tudo.

**Arquivos:** `index.html`, `js/dashboard.js`, `js/db.js`, `js/backup.js`.

**Implementação:**
1. Ao selecionar o arquivo de backup, abre o modal `#restoreModal` com checkboxes
   por módulo e contagem de registros.
2. `confirmarRestauracao()` restaura apenas os módulos marcados (stores,
   Primeiros Socorros e preferências).
3. Os demais módulos permanecem intactos.

**Critério de conclusão:** restauração parcial funciona sem apagar os demais
módulos. ✅

---

## Etapa 4 — Backup automático (Finalizar Turno + 6h/18h)

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** gerar o JSON do Backup Geral automaticamente, sem confirmação:
- ao clicar em **Finalizar Turno** (junto com o PDF);
- todos os dias às **06:00** e às **18:00**.

**Arquivos:** `js/backup.js`, `js/backup-auto.js`, `js/dashboard.js`, HTMLs das
páginas.

**Implementação:**
1. `window.PortariaBackup.build()` monta o JSON com todos os módulos e
   preferências; `save()` grava o arquivo.
2. `js/backup-auto.js` verifica os horários a cada minuto, faz “catch-up” ao abrir
   o sistema e controla os backups já feitos em `localStorage.clarityBackupAuto`.
3. O backup automático grava direto na pasta autorizada via File System Access
   API, sem download silencioso. Se a pasta não estiver autorizada, o slot fica
   pendente e o motivo aparece em **Configurações → Backup Automático**.
4. A rotina ignora banco vazio (`requireData`) e usa lock entre abas
   (`navigator.locks`/`localStorage`) para não duplicar o arquivo.
5. O JSON inclui `origem`, `url`, `contagens` e `totalRegistros` para diagnosticar
   dados de outro endereço/navegador.
6. O finalizar turno também chama o backup silencioso, mas não cria arquivo vazio.

**Critério de conclusão:** backup JSON gerado automaticamente nos horários, sem
janela de confirmação e sem arquivo vazio. ✅

**Limitação conhecida:** o agendamento só ocorre com o sistema aberto; ao reabrir,
o “catch-up” gera o backup do horário perdido. A gravação automática depende de a
pasta estar autorizada; se o navegador exigir um gesto do usuário, use o botão de
autorização em Configurações.

---

## Etapa 5 — Configurações de e-mail pela tela

**Status:** ✅ Concluída (15/09/2026; adaptada em 17/11/2026)

**Objetivo:** editar destinatários, CC, assunto e mensagem pela interface.

**Arquivos:** `configuracoes/index.html`, `configuracoes/script.js`,
`js/portaria-services-web.js`, `js/dashboard.js`.

**Implementação:**
1. O módulo Configurações tem o card “E-mail do Relatório” com Para, CC, Assunto
   e Mensagem (com `{data}` e botão “Restaurar padrão”).
2. Os valores são persistidos em `localStorage.clarityEmailConfig`.
3. O “Finalizar Turno” monta o rascunho com esses valores.
4. O botão **Abrir no e-mail** usa `mailto:` e abre o cliente de e-mail padrão do
   dispositivo; o PDF é baixado separadamente para ser anexado manualmente.
5. Não há armazenamento de senha nem envio automático.

**Critério de conclusão:** alterar os campos na tela muda o e-mail preparado no
“Finalizar Turno”. ✅

---

## Etapa 6 — Ocorrências: gravidade + anexos (fotos)

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** adicionar gravidade (Baixa/Média/Alta/Crítica) e fotos a cada
ocorrência, exibidas no histórico, modal e relatório.

**Arquivos:** `controle-de-ocorrencias/*`, `js/portaria-services-web.js`.

**Implementação:**
1. Campos `gravidade` e `fotos: []` (base64, redimensionadas para ~1000 px JPEG).
2. Input de múltiplas fotos com pré-visualização e remoção.
3. Histórico com badge de gravidade e ícone de câmera; modal com galeria.
4. PDF com coluna Gravidade; Excel com gravidade e contagem de fotos.

**Critério de conclusão:** cadastrar ocorrência com gravidade e fotos, vendo-os no
histórico, modal e PDF. ✅

---

## Etapa 7 — Relatório por período: escolher seções

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** no relatório por período, escolher quais módulos/seções incluir.

**Arquivos:** `js/ui.js`, `js/portaria-services-web.js`.

**Implementação:**
1. O modal de período tem checkboxes das 9 seções e “Marcar/desmarcar todas”.
2. A lista selecionada é passada ao serviço de relatório.
3. O PDF renderiza apenas as seções marcadas; o relatório diário continua com
   todas.

**Critério de conclusão:** gerar PDF somente com as seções marcadas. ✅

---

## Etapa 8 — Relatório por período: filtros extras

**Status:** ✅ Concluída (15/09/2026) — escopo: **Porteiro + Tipo de pessoa**

**Objetivo:** filtrar o relatório por setor, empresa, porteiro e tipo de pessoa.

**Arquivos:** `js/ui.js`, `js/portaria-services-web.js`.

**Implementação:**
1. O modal de período tem filtros de Porteiro (texto) e Tipo de pessoa
   (Todos/Visitante/Morador/Funcionário/Prestador).
2. Os filtros são aplicados na coleta de dados por período.
3. O resultado vale para o PDF e para o Excel geral.

**Critério de conclusão:** o PDF reflete os filtros escolhidos. ✅

---

## Etapa 9 — Relatório individual por pessoa

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** gerar um PDF com os dados da pessoa, histórico de acessos e
autorizações.

**Arquivos:** `controle-de-cadastros/*`, `js/ui.js`,
`js/portaria-services-web.js`.

**Implementação:**
1. Botão “Relatório da pessoa” no modal de visualização do Cadastro de Pessoas.
2. `UI.buildPdf` aceita múltiplas seções (texto ou tabela).
3. O PDF em paisagem traz:
   - Dados cadastrais;
   - Movimentações — Entrada e Saída;
   - Visitas — Controle de Visitantes (casadas por nome normalizado e/ou
     documento);
   - Autorizações.

**Critério de conclusão:** PDF individual gerado a partir do cadastro. ✅

---

## Etapa 10 — Busca global no topo

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** um campo no topo do Dashboard que procura em todos os módulos.

**Arquivos:** `index.html`, `js/dashboard.js`, `css/dashboard.css`.

**Implementação:**
1. Busca em pessoas, visitantes, chaves, EPIs, ocorrências, avisos e
   entrada/saída.
2. Resultados agrupados por módulo, com link para abrir o módulo.
3. Debounce de 250 ms, botão de limpar e fechamento ao clicar fora.
4. Dropdown com `position: fixed` e posição calculada em JS, para não ser cortado
   pelo `overflow: hidden` do cabeçalho.

**Critério de conclusão:** buscar um termo e ver resultados dos vários módulos. ✅

---

## Etapa 11 — Acessibilidade + tela cheia

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** melhorar navegação por teclado/contraste e permitir tela cheia no
posto.

**Arquivos:** `css/base.css`, `js/ui.js`, `js/dashboard.js`.

**Implementação:**
1. Foco visível (`:focus-visible`) e respeito a `prefers-reduced-motion`.
2. `aria-label` na busca global.
3. Botão “Tela cheia” no Dashboard usando a Fullscreen API do navegador.
4. Navegação por teclado nos fluxos principais.

**Critério de conclusão:** tela cheia funcionando e navegação por teclado nos
fluxos principais. ✅

---

## Etapa 12 — Unificar primeiros socorros no IndexedDB

**Status:** ✅ Concluída (15/09/2026)

**Objetivo:** migrar os dados de `localStorage.firstAidSystem` para uma store do
IndexedDB, com migração automática e preservação dos dados.

**Arquivos:** `js/db.js`, `controle-de-insumos-primeiros-socorros/script.js`,
`js/backup.js`, `js/dashboard.js`, `js/portaria-services-web.js`.

**Implementação:**
1. IndexedDB `clarityPortaria` **v5** com a store `primeiros_socorros`.
2. Migração automática do `localStorage.firstAidSystem` na primeira leitura
   (o localStorage permanece como espelho de compatibilidade).
3. O módulo, o Dashboard, os relatórios e o Backup Geral leem do IndexedDB com
   fallback.
4. A restauração seletiva grava na store e no espelho.

**Critério de conclusão:** dados antigos preservados e módulo operando via
IndexedDB. ✅

---

## Etapa 13 — Abrir relatório no cliente de e-mail padrão

**Status:** ✅ Concluída (15/09/2026; adaptada em 17/11/2026)

**Objetivo:** preparar o relatório para envio sem depender de configuração de
servidor de e-mail no sistema.

**Arquivos:** `js/dashboard.js`, `index.html`, `configuracoes/*`.

**Implementação:**
1. O modal do “Finalizar Turno” mostra o PDF gerado e o rascunho do e-mail.
2. Botões: **Baixar PDF**, **Copiar mensagem**, **Abrir no e-mail**, **Preparar
   novo relatório** e **Fechar**.
3. **Abrir no e-mail** monta um link `mailto:` com destinatários, CC, assunto e
   corpo; o cliente de e-mail padrão é aberto.
4. O PDF não é anexado automaticamente; o usuário anexa o arquivo baixado.
5. Nenhuma mensagem é enviada pelo sistema e nenhuma senha é armazenada.

**Critério de conclusão:** abrir o cliente de e-mail com a mensagem preenchida e o
PDF disponível para anexar. ✅

---

## Registro de execução

- **15/09/2026 — Etapas 1 a 12 concluídas**: logo no PDF, alertas no Dashboard,
  restauração seletiva, backup automático, configurações de e-mail, ocorrências
  com gravidade/fotos, seções e filtros do relatório, relatório da pessoa, busca
  global, acessibilidade/tela cheia e Primeiros Socorros no IndexedDB. Validação
  com `node --check` e QA no navegador, sem erros de console.
- **15/09/2026 — Etapa 13 implementada** e depois adaptada para o fluxo web.
- **17/11/2026 — Consolidação web/PWA**:
  - aplicação estática na raiz, sem instalador desktop e sem `node_modules`;
  - e-mail adaptado para `mailto:` + PDF baixado separadamente;
  - PWA com manifest, service worker, ícones e banner de atualização;
  - headers de publicação em `vercel.json`;
  - validação final: `node --check`, JSON válido, 11 páginas com PWA, cache com
    59 entradas, atualização de `v1.1.0` para versão de teste, offline antes e
    depois da atualização, 0 erros de console.

## Pendências e próximos passos

1. Testar o fluxo “Abrir no e-mail” com o cliente de e-mail real da portaria.
2. Confirmar o backup automático (06:00/18:00) em uso real.
3. Configurar domínio próprio na Vercel, se desejado.
4. Se houver mais de um posto, planejar backend e banco compartilhado para
   sincronização (os dados atuais são locais ao navegador).
5. A cada publicação, incrementar `CACHE_NAME` em `sw.js` para que o banner de
   atualização apareça nos clientes.
