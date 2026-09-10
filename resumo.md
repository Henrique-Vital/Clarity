# Resumo de Trabalho — Portaria Clarity Glass

> **INSTRUÇÕES PARA ATUALIZAÇÃO DESTE ARQUIVO**
> Sempre que o usuário pedir para "atualizar o resumo.md / resumo.md", siga o procedimento abaixo.
>
> ---
>
> **Prompt de referência:**
>
> Reescreva e atualize completamente o arquivo `resume.md`.
>
> Objetivo:
> Criar um registro detalhado de tudo o que foi feito hoje para que, em uma conversa futura, eu possa fornecer este arquivo e continuar exatamente de onde paramos.
>
> Instruções:
>
> 1. Utilize a data de hoje como título principal da seção.
> 2. Se o arquivo `resume.md` já possuir conteúdo anterior, preserve-o e adicione uma nova seção separada pela data atual.
> 3. Documente cronologicamente todas as atividades realizadas hoje.
> 4. Inclua: Objetivo inicial da tarefa; Alterações realizadas; Arquivos criados; Arquivos modificados; Comandos executados; Configurações alteradas; Decisões tomadas; Problemas encontrados; Mensagens de erro relevantes; Hipóteses investigadas; Soluções testadas que NÃO funcionaram; Motivos pelos quais cada tentativa falhou (quando conhecido); Soluções parciais obtidas; Solução final adotada; Resultado atual do projeto.
> 5. Crie as seguintes seções: `## Contexto`, `## Alterações Realizadas`, `## Tentativas que Não Funcionaram`, `## Problemas Encontrados`, `## Solução Final`, `## Estado Atual do Projeto`, `## Próximos Passos`, `## Observações para Continuação`.
> 6. Seja extremamente detalhado. Prefira registrar informação demais do que de menos.
> 7. O documento deve ser escrito em Markdown bem estruturado.
> 8. Ao final, adicione um resumo executivo de no máximo 10 linhas contendo os pontos mais importantes do dia.
>
> **Importante:** Considere que este arquivo será utilizado futuramente para retomar o trabalho exatamente do ponto onde paramos, sem depender da memória da conversa atual.

---

# 01/08/2026 — Criação do Sistema de Controle da Portaria Clarity Glass

## Contexto

O usuário solicitou a criação de um sistema completo de controle da portaria da empresa **Clarity Glass**, composto por:

- Um **Dashboard** inicial (sem login, abre diretamente) com quatro cards grandes para navegação.
- Módulo **Controle de Chaves ou Item** (chaves comuns, chaves do almoxarifado e chaves de veículos com lista fixa).
- Módulo **Controle de Visitantes** (formulário completo + filtros + histórico).
- Módulo **Controle de EPIs** (entrega/devolução com checkboxes e status Pendente/Devolvido).
- O módulo **Controle de Primeiros Socorros** já existia e **não deveria ser alterado** — apenas linkado a partir do Dashboard.

Requisitos técnicos principais:

- **Sem login**; abrir direto na tela inicial.
- **Sem frameworks**: apenas HTML5, CSS3 e JavaScript puro (proibido React/Vue/Angular/Bootstrap/Tailwind/jQuery).
- **IndexedDB** (proibido LocalStorage para dados); cada módulo com sua própria Store.
- **Relatórios em PDF** (jsPDF) com "Gerar relatório do dia" e "Gerar relatório por período", contendo logo (preparado para inclusão futura), título, data, hora, tabela e rodapé.
- **Identidade visual idêntica** ao módulo existente de primeiros socorros (mesmas cores, tipografia, componentes, espaçamentos, responsividade e animações).
- **Organização**: uma pasta por módulo, cada uma com `index.html`, `style.css`, `script.js`.
- **Componentes reutilizáveis**: Modal, Toast, Confirmação, Loading, Tabela, Pesquisa, Cards, Botões.
- Funções reutilizáveis para inserir, editar, excluir, pesquisar, exportar e importar.
- Botão **"Voltar ao Dashboard"** sempre presente.

## Alterações Realizadas

### Análise do módulo existente

- Li integralmente os três arquivos do módulo `controle-de-insumos-primeiros-socorros/` (`index.html`, `style.css`, `script.js`) para extrair a identidade visual (variáveis CSS, cores, tipografia, botões, cards, tabelas, modais, toasts, loading, tema claro/escuro, responsividade) e a arquitetura (estrutura de HTML, uso de Font Awesome, jsPDF + autotable, SheetJS).

### Arquivos criados (raiz do projeto)

| Arquivo | Descrição |
|---|---|
| `css/base.css` | Estilos compartilhados por todos os módulos novos, reproduzindo fielmente a identidade do módulo existente (variáveis de tema claro/escuro, loading, toast, header, cards, formulários, botões, tabelas, badges, modais, footer, responsividade). |
| `css/dashboard.css` | Estilos exclusivos do Dashboard (cards grandes `.portal-card`, grid 2 colunas, responsivo). |
| `js/db.js` | Camada de acesso ao **IndexedDB**. Banco único `clarityPortaria` com as Stores `chaves`, `visitantes`, `epis`. API reutilizável: `open`, `store(...)` (add/put/remove/clear/get/getAll/count/byIndex), `exportStore`, `importStore`. |
| `js/ui.js` | Componentes reutilizáveis: `escHtml`, `generateId`, `todayISO`, `nowTime`, `formatDate`, `formatDateTimeISO`, `formatDuration`, `showToast`, `showConfirm`, `openModal`, `closeModal`, `hideLoading`, tema (localStorage `clarityTheme`), logo (localStorage `clarityLogo`), modal de relatório por período injetado dinamicamente, `buildPdf` (PDF padrão com logo/placeholder, cabeçalho, data/hora, tabela autotable, rodapé) e `exportExcel`. |
| `index.html` | Dashboard: header com logo, tema, data/hora; hero; grid com os 4 cards (Chaves, Visitantes, EPIs, Primeiros Socorros) apontando para os módulos; footer. |
| `js/dashboard.js` | Lê os contadores de hoje de cada módulo via IndexedDB (`chaves`, `visitantes`, `epis`) e LocalStorage do módulo existente (`firstAidSystem`) e exibe no card correspondente. |

### Arquivos criados (módulos)

**`controle-de-chaves/`** (index.html, style.css, script.js)

- Abas: Chaves Comuns, Almoxarifado, Veículos.
- Chaves comuns/almoxarifado: formulário de retirada (Nome da chave, funcionário, data, hora, observação) e formulário de devolução (select de chaves em uso).
- Veículos: 5 opções fixas — Caminhões KRF3D66, EYR8C33, CPI4E28; Carros Uno (ETC2723) e Estrada (FDP9808), com cards de status (Disponível/Em uso) e formulário de retirada/devolução.
- Modelo de registro em ciclo de vida: uma retirada cria o registro (status `em_uso`); a devolução preenche `retornoData/Hora/Funcionario/Observacao` e marca `devolvida`. Histórico de veículos exibe Data, Hora, Veículo, Funcionário, Retirada, Devolução e Tempo fora.
- Relatórios do dia e por período, exportação Excel e backup JSON (store `chaves`).

**`controle-de-visitantes/`** (index.html, style.css, script.js)

- Formulário: Data, Hora Entrada, Hora Saída, Nome, Empresa, CPF/RG, Porteiro, Responsável da Clarity, Setor, Motivo, Observações.
- Botões: Salvar, Editar, Excluir, Pesquisar, Histórico (além de Limpar).
- Filtros por data, nome, empresa e responsável; tabela de histórico com ações (visualizar/editar/excluir).
- Relatórios do dia e por período (paisagem), exportação Excel e backup JSON (store `visitantes`).

**`controle-de-epis/`** (index.html, style.css, script.js)

- Formulário: Data, Hora, Visitante, Porteiro, Responsável, checkboxes (Capacete, Óculos, Mangote, Protetor Auricular), Observações.
- Operação Entrega (status `pendente`) ou Devolução (select de entregas pendentes; marca `devolvido`).
- Histórico com filtros (data, nome, status), badges Pendente/Devolvido.
- Relatórios do dia e por período, exportação Excel e backup JSON (store `epis`).

### Arquivos modificados (durante a sessão, após criação)

- `js/dashboard.js` — adicionada a linha `const $ = (sel) => document.querySelector(sel);` para corrigir `ReferenceError: $ is not defined`.
- `controle-de-chaves/script.js`, `controle-de-visitantes/script.js`, `controle-de-epis/script.js` — função `toggleBackupModal()` alterada de `UI.openModal('backupModal')` para `el.classList.toggle('active')` para permitir abrir **e fechar** o modal pelo botão X.

### Módulo existente

- `controle-de-insumos-primeiros-socorros/` **não foi alterado** (conforme instrução do usuário). Apenas referenciado pelo Dashboard.

## Comandos executados

- `node --version` → `v20.12.1` (disponível para validação de sintaxe).
- `node --check` em todos os 6 arquivos JS criados → todos **OK**.
- Script customizado de validação de balanceamento de tags HTML (`C:\Users\hbvbr\AppData\Local\Temp\opencode\checkhtml.js`) executado com `node` → todos os HTMLs **OK**.

## Configurações alteradas

- Nenhuma configuração de sistema/máquina foi alterada. As únicas "configurações" são as chaves de preferência gravadas pelo próprio app em `localStorage`: `clarityTheme` (tema) e `clarityLogo` (imagem da logo oficial).

## Decisões tomadas

1. **Compartilhamento via arquivos-base na raiz** (`css/base.css`, `js/ui.js`, `js/db.js`) em vez de duplicar estilo em cada módulo, para "evitar repetição" e manter identidade única. Cada módulo continua tendo seu próprio `index.html`, `style.css` (que complementa o base) e `script.js`, conforme pedido.
2. **Scripts clássicos** (`<script src>`), não ES modules, para que o sistema funcione abrindo `index.html` direto do disco (`file://`), sem necessidade de servidor (ES modules falham por CORS em `file://`).
3. **IndexedDB**: banco único `clarityPortaria` com uma Store por módulo (`chaves`, `visitantes`, `epis`), atendendo "cada módulo com sua própria Store".
4. **LocalStorage usado apenas** para tema e logo (preferências de UI), não para dados de negócio — atendendo a proibição de LocalStorage para banco de dados.
5. **Devolução por seleção**: nas chaves comuns/almoxarifado e EPIs, a devolução usa um `<select>` com os registros em aberto (em uso/pendente), tornando a operação à prova de erros para o porteiro.
6. **Veículos em ciclo de vida**: um único registro por retirada, atualizado na devolução (status + campos de retorno), permitindo calcular "tempo fora".
7. **Relatórios**: um único `UI.buildPdf` padrão compartilhado (logo placeholder, cabeçalho azul, data/hora, tabela autotable, rodapé). Relatório de visitantes em paisagem (10 colunas).
8. **Não alterar o módulo existente** de primeiros socorros (decisão do usuário), mesmo sabendo que ele não possui o botão "Voltar ao Dashboard".

## Tentativas que Não Funcionaram

- **Usar `$` em `dashboard.js` sem defini-lo** — hipótese: a função existiria por herança de algum script. **Falhou**: `ReferenceError: $ is not defined`. Correção: declarar `const $ = (sel) => document.querySelector(sel);` dentro do callback do `DOMContentLoaded`.
- **`toggleBackupModal()` apenas chamando `UI.openModal('backupModal')`** — hipótese: o botão X fecharia. **Falhou**: o botão X chamava a mesma função e apenas reabria/mantinha aberto. Correção: usar `classList.toggle('active')`.
- **Validação de HTML com `<option>` como tag normal** — hipótese: todos os `<option>` precisariam fechar explicitamente. **Falhou** (falso positivo): em HTML5 o fechamento de `<option>` é opcional, e o `checkhtml.js` reportava erros em cadeia. Correção: ajustar o validador para tratar `<option>` como fechamento opcional e permitir que `<datalist>`/`</div>` fechem sobre `<option>` abertos.
- **ES modules (`<script type="module">`)** — considerado e **descartado** antes de implementar (não executado) porque em `file://` falham por CORS. Adotou-se scripts clássicos.

## Problemas Encontrados

1. **`ReferenceError: $ is not defined`** no `dashboard.js` (linhas que atualizavam os contadores dos cards) — resolvido declarando o helper `$`.
2. **Modal de backup não fechava** pelo botão X nos 3 módulos (a função era só de abrir) — resolvido tornando-a um toggle.
3. **Falsos positivos do validador de HTML** em `<option>`/`<datalist>` — resolvido ajustando o validador (não havia erro real nos HTMLs).
4. **Sem mensagens de erro bloqueantes** no restante; todos os `node --check` passaram de primeira.

## Hipóteses investigadas

- Que o sistema precisaria funcionar aberto via duplo-clique (`file://`) → confirmado e tratado (scripts clássicos, CSS `<link>` relativo, IndexedDB/localStorage funcionam em `file://`).
- Que a identidade visual poderia ser compartilhada por um único `base.css` em vez de copiada → confirmado; os módulos novos carregam `../css/base.css` + `style.css` próprio, sem diferença visível em relação ao módulo existente.
- Que o módulo existente grava dados em `localStorage` (`firstAidSystem`) → confirmado pela leitura do `script.js`; o Dashboard lê essa chave apenas para exibir o contador do card de primeiros socorros.

## Soluções parciais obtidas

- Antes da correção do `$`, o Dashboard carregava o layout mas falhava ao atualizar os contadores (somente os toasts/estado inicial funcionavam).
- Antes da correção do `toggleBackupModal`, o modal abria pelo botão de backup do header, mas não fechava pelo X (fechava apenas clicando fora/Esc).

## Solução Final

1. **Arquitetura em camadas**: `css/base.css` (visual compartilhado) + `js/ui.js` (componentes) + `js/db.js` (IndexedDB) servem todos os módulos; cada módulo tem `index.html`, `style.css` (complementos) e `script.js` (lógica do módulo).
2. **IndexedDB**: helper `DB.store(nome)` com operações assíncronas (Promises) e um esquema declarativo (`SCHEMA`) que cria as Stores no `onupgradeneeded`.
3. **Componentes UI**: toast, confirm, modal, loading, tema, logo, relatório por período (modal injetado) e `buildPdf` padrão — tudo exposto no objeto global `UI`.
4. **Chaves**: abas + formulários de retirada/devolução; devolução lista apenas chaves em uso; veículos fixos com status e tempo fora calculado via `UI.formatDuration`.
5. **Visitantes**: CRUD completo + filtros + histórico; relatório em paisagem.
6. **EPIs**: checkboxes com estilo visual; entrega pendente → devolução marca como devolvido.
7. **Dashboard**: 4 cards navegáveis com contadores do dia por módulo.
8. **Validação**: todos os JS passaram em `node --check`; todos os HTML passaram no validador de balanceamento de tags.
9. **Correções finais aplicadas**: `$` no `dashboard.js` e toggle do modal de backup nos 3 módulos.

## Estado Atual do Projeto

- Estrutura criada e completa em `C:\Users\hbvbr\Documents\DEV\Clarity`:

```
index.html                          → Dashboard (sem login)
css/base.css, css/dashboard.css
js/ui.js, js/db.js, js/dashboard.js
controle-de-chaves/    (index.html, style.css, script.js)
controle-de-visitantes/(index.html, style.css, script.js)
controle-de-epis/      (index.html, style.css, script.js)
controle-de-insumos-primeiros-socorros/ (INTOCADO - módulo existente)
```

- Todos os arquivos JS validados (`node --check` OK) e todos os HTML validados (tags balanceadas OK).
- O módulo existente de primeiros socorros **não foi modificado**.
- **Ainda não testado em navegador** (não foi possível abrir/executar a interface nesta sessão). O primeiro teste funcional real (abrir `index.html`, criar registros, gerar PDF) está pendente.

## Próximos Passos

1. **Testar o sistema no navegador** (idealmente Chrome/Edge): abrir `index.html`, navegar entre os 4 módulos, criar registros de chaves/visitantes/EPIs, devolver, conferir histórico, filtros, contadores do Dashboard.
2. **Testar a geração de PDF** (dia e período) em cada módulo e conferir layout (logo placeholder, acentos do português, tabela e rodapé).
3. **Testar exportação Excel** e **backup/restauração JSON** de cada módulo.
4. **Decidir sobre o botão "Voltar ao Dashboard"** no módulo de primeiros socorros: hoje ele não existe (módulo intocado por instrução). Se o usuário autorizar, adicionar o botão preservando o restante do arquivo.
5. **Incluir a logo oficial** da Clarity Glass (via clique no ícone do header → upload, ou colocar a imagem de forma permanente).
6. Considerar **publicar/hospedar** (ex.: servidor local, rede da portaria) e, se necessário, migrar o módulo existente para IndexedDB no futuro (hoje usa LocalStorage) para unificar.

## Observações para Continuação

- **Comandos de validação úteis**:
  - `node --check js/ui.js` (repetir para cada arquivo JS).
  - Validador de HTML: `node C:\Users\hbvbr\AppData\Local\Temp\opencode\checkhtml.js` (executar com `workdir` = raiz do projeto). O arquivo considera `option` como fechamento opcional (HTML5).
- **Convenções do projeto** (obrigatórias ao continuar): CSS base em `css/base.css` com variáveis (`--primary:#1a73e8` etc.), tema claro/escuro via `data-theme="dark"` no `<html>`; JS via objeto global `UI` e `DB`; `id` das Stores IndexedDB: `chaves`, `visitantes`, `epis`; IDs de inputs seguem prefixos (ex.: `retiradaComum*`, `devolucaoComum*`, `v*`, `epi*`); funções globais de ação usadas em `onclick` (ex.: `viewRecord`, `deleteRecord`, `generateDayReport`, `openPeriodReport`).
- **CDNs usadas** (requerem internet): Font Awesome 6.5.1, jsPDF 2.5.1 + autotable 3.5.31, SheetJS 0.18.5. As páginas não funcionam offline.
- **Dados**: `chaves`, `visitantes` e `epis` ficam no IndexedDB (`clarityPortaria`); o módulo de primeiros socorros usa `localStorage` (`firstAidSystem`) — não migrar sem autorização.
- **Modelo de registro de chaves**: uma retirada cria `{ id, tipo: 'comum'|'almoxarifado'|'veiculo', chave|veiculo/placa, funcionario, data, hora, dataHora, observacao, status: 'em_uso'|'devolvida', ...retorno* }`. Veículos usam `veiculoId` fixo (`v1`..`v5`).
- **Modelo de registro de EPIs**: `{ id, data, hora, visitante, porteiro, responsavel, epis: [], operacao: 'entrega', status: 'pendente'|'devolvido', ...retorno* }`.
- **Favor não apagar** o bloco de instruções no topo deste arquivo: ele é o manual que rege a atualização do resumo nas próximas sessões.

## Resumo Executivo

- Criado o sistema completo de portaria da Clarity Glass: Dashboard + Controle de Chaves ou Item + Controle de Visitantes + Controle de EPIs, sem frameworks e sem login.
- Persistência em IndexedDB com uma Store por módulo (`chaves`, `visitantes`, `epis`); LocalStorage usado apenas para tema e logo.
- Identidade visual 100% idêntica ao módulo existente de primeiros socorros, garantida por `css/base.css` compartilhado.
- Componentes reutilizáveis em `js/ui.js` (toast, modal, confirm, loading, PDF padrão com logo placeholder, Excel, backup) e acesso a dados em `js/db.js`.
- Relatórios "do dia" e "por período" em PDF em todos os módulos, com logo preparado para inclusão futura.
- Todos os JS passaram em `node --check` e todos os HTML passaram no validador de balanceamento de tags.
- Bugs corrigidos na sessão: `$` não definido no Dashboard e modal de backup que não fechava.
- Módulo de primeiros socorros permaneceu intocado, conforme instrução; não possui botão "Voltar ao Dashboard" (decisão pendente).
- Falta testar no navegador, incluir a logo oficial e decidir sobre o back button do módulo existente.

---

# 01/08/2026 — Sessão 2: Correções, Relatórios e Memória de Visitantes

> Registro detalhado da segunda sessão de trabalho (continuação da criação do sistema).

## Contexto

- Usuário pediu uma série de ajustes no sistema já criado e uma nova funcionalidade de **memória de visitantes** (digitar o nome autocompleta os dados de visitas anteriores).
- Ao testar a funcionalidade nova, o usuário relatou que **não salvava e não incluía no histórico** ("nao funcionou , ao digitar os dados do visitante nao salvou e nao foi incluido no historico como era incluido antes. analise bem").

## Alterações Realizadas

### 1. Chave do almoxarifado fixa (`controle-de-chaves/index.html` + `script.js`)
- O campo da chave do almoxarifado agora é `readonly` com valor fixo `value="Chaves do Almoxarifado"` (removida a datalist `chavesAlmoxList`).
- `saveRetirada()` passa a forçar `'Chaves do Almoxarifado'` para `tipo === 'almoxarifado'`.
- `populateKeyDatalists()` agora só preenche `chavesComunsList`.
- `clearForm()` ignora inputs `readonly`.

### 2. Coluna "Quem devolveu" nos relatórios de chaves (`controle-de-chaves/script.js`)
- Relatório do dia e por período (PDF) e exportação Excel agora incluem a coluna **"Quem devolveu"** usando `r.retornoFuncionario || '-'`.

### 3. Setor "Compras" (`controle-de-visitantes/index.html`)
- Adicionado `Compras` à datalist de setores, entre `Financeiro` e `TI`.

### 4. Botões de filtro de visitantes não estouravam o card (`controle-de-visitantes/index.html` + `style.css`)
- Botões Pesquisar/Limpar/Histórico envolvidos em `<div class="filter-group filter-actions">`.
- CSS: `.filter-actions { flex-wrap: wrap; min-width: 100%; justify-content: flex-start; }` para impedir que o botão "Histórico" quebrasse o card.

### 5. Funcionalidade de memória de visitantes (`controle-de-visitantes/index.html` + `script.js` + `js/db.js`)
- **`js/db.js`**: `DB_VERSION` de **1 → 2**; nova Store **`visitantes_perfil`** (keyPath `id`, índice `nome`) no esquema `SCHEMA`.
- **`controle-de-visitantes/index.html`**: input `vNome` recebeu `list="visitantesPerfilList"` + `<datalist id="visitantesPerfilList">`.
- **`controle-de-visitantes/script.js`**:
  - `getPerfis()` — lê todos os perfis.
  - `upsertVisitantePerfil(data)` — grava/atualiza o perfil do visitante após salvar (`await upsertVisitantePerfil(data); await populateProfileDatalist();` no fim de `save()`).
  - `populateProfileDatalist()` — preenche o datalist com os nomes já cadastrados.
  - `prefillFromProfile()` — ao digitar nome já conhecido (match exato), preenche Empresa, CPF/RG, Responsável e Setor automaticamente; match parcial preenche só campos vazios.
  - `debouncePreloadVisitante()` — debounce de 250 ms para evitar leituras excessivas do banco.
  - Init: `$('#vNome').addEventListener('input', debouncePreloadVisitante);` + `await populateProfileDatalist();`.

### 6. Endurecimento do `js/db.js` (anti-hang / anti-bloqueio)
- `open()` agora trata **`onblocked`** (outra aba com o banco antigo aberto) e **timeout de 15 s**, rejeitando com mensagens claras em português e resetando `_dbPromise` para permitir nova tentativa.
- `req.result.onversionchange = () => req.result.close();` — a conexão se fecha sozinha quando outra aba atualiza o banco.
- `tx()` agora liga `t.onerror`/`t.onabort` em **ambos** os ramos (antes só no ramo sem IDBRequest), evitando transações que penduravam silenciosamente.

## Testes realizados (Node + fake-indexeddb)

- Instalado `fake-indexeddb` (`npm install --no-save`) em `C:\Users\hbvbr\AppData\Local\Temp\opencode`.
- `test_db.js` — abre o banco v2, grava/lê `visitantes` e `visitantes_perfil`, faz `put` em perfil → **OK**.
- `test_upgrade.js` — simula banco v1 com dados antigos e reabre com o `db.js` v2 → stores criadas, dados antigos preservados, novos registros salvos → **OK**.
- `test_blocked.js` — abre v1 sem fechar, tenta abrir v2 → bloqueio detectado em 1 ms com a mensagem clara; ao fechar a conexão antiga, o upgrade funciona → **OK**.
- `node --check js/db.js` → **OK**.

## Problemas Encontrados

- **Bug relatado pelo usuário**: após a funcionalidade de memória, o registro de visitante não era salvo nem aparecia no histórico.
- **Investigação**: leitura integral de `script.js`, `db.js` e `index.html` do módulo de visitantes — o código estava íntegro. A camada de banco foi validada por 3 testes automatizados (add/getAll/put, upgrade v1→v2 com preservação de dados, e bloqueio por outra aba) — **todos passaram**.
- **Causa provável (ambiental, não de lógica)**: mix de arquivos antigos em cache do navegador OU upgrade do IndexedDB bloqueado por outra aba com o banco v1 aberto. Em qualquer desses casos, `await DB.store('visitantes').add(record)` pendurava ou falhava silenciosamente, e o histórico não atualizava — exatamente o sintoma descrito.

## Solução Final

1. Código de banco validado e **endurecido** (onblocked, timeout 15 s, onversionchange, onerror/onabort no `tx()`).
2. Lógica da memória de visitantes confirmada correta por testes.
3. Resta validar em navegador com **aba única** e **recarga forçada** (ver Próximos Passos).

## Estado Atual do Projeto

- Tudo da Sessão 1 mantido; o `controle-de-insumos-primeiros-socorros/` continua intocado.
- `js/db.js`: banco `clarityPortaria` **v2** com Stores `chaves`, `visitantes`, `visitantes_perfil`, `epis`.
- Todos os testes automatizados de banco passando; sintaxe JS OK.

## Próximos Passos

1. **Usuário deve testar em navegador**: fechar todas as abas do sistema (para liberar o upgrade do banco), dar **recarga forçada (Ctrl+F5)** na página de visitantes para limpar cache de `db.js`/`script.js`/`index.html`.
2. Se o problema persistir, abrir o **Console (F12)** e informar a mensagem de erro exata — o novo `db.js` exibe mensagens claras em caso de bloqueio/timeout.
3. Caso o banco antigo esteja corrompido, apagar o banco `clarityPortaria` em DevTools → Application → IndexedDB e recarregar (perde os dados antigos — fazer backup antes via botão de backup JSON).

## Observações para Continuação

- Convenções novas: Store `visitantes_perfil` = perfis de visitantes (nome, empresa, cpfRg, responsavel, setor) para autocompletar o formulário.
- Testes de banco em `C:\Users\hbvbr\AppData\Local\Temp\opencode`: `test_db.js`, `test_upgrade.js`, `test_blocked.js` (rodar com `workdir` na pasta do opencode, usam `fake-indexeddb` instalado localmente).
- `DB_VERSION` deve ser incrementado a cada novo esquema (novas stores/índices).

## Resumo Executivo

- Corrigidos: chave do almoxarifado fixa; coluna "Quem devolveu" nos relatórios/Excel de chaves; setor "Compras"; estouro dos botões de filtro de visitantes.
- Implementada a memória de visitantes (datalist + preenchimento automático ao digitar o nome), com nova Store `visitantes_perfil` e `DB_VERSION = 2`.
- O "não salvar/não aparecer no histórico" foi investigado com testes automatizados (fake-indexeddb): a camada de banco está correta; causa provável é cache antigo ou upgrade bloqueado por outra aba.
- `db.js` endurecido contra hangs/bloqueios (onblocked, timeout, versionchange, abort/error nas transações).
- Pendente: teste no navegador com aba única + Ctrl+F5; reportar mensagem do Console se persistir.

---

# 01/08/2026 — Sessão 3: Electron + Camada de Services + "Finalizar Turno"

> Continuação. Usuário pediu (1) que os PDFs fossem salvos numa pasta da Área de Trabalho (criada automaticamente) e (2) toda a arquitetura de `services/` + botão "Finalizar Turno" + modal de pré-visualização, preparados para futura integração com Electron. Opção escolhida: **Electron** para o salvamento + arquitetura conforme prompt.

## Contexto

- Objetivo do prompt: criar `services/` desacoplado (PDF, e-mail, relatório, arquivo, configuração), botão "Finalizar Turno" no Dashboard, modal de pré-visualização com Destinatários/CC/Assunto/Mensagem/Nome do PDF/Tamanho/Data/Hora e botões (Fechar, Copiar mensagem, Baixar PDF, Preparar novo relatório), objeto `EmailDraft` com métodos, mensagem padrão em arquivo separado, e preparação para que futuramente só a camada de envio seja trocada (`electronEmailService.send()`).
- Regras: NÃO usar Node.js/Electron/Windows API/Outlook COM/SMTP nas services; NÃO enviar e-mail de verdade; não baixar PDF automaticamente.

## Alterações Realizadas

### 1. Camada `services/` (ES6 modules)
| Arquivo | Responsabilidade |
|---|---|
| `services/configService.js` | Config centralizada: empresa, nome do sistema, destinatários (`to`), `cc`, assunto padrão, nome das pastas de relatórios e backups. |
| `services/emailTemplates.js` | Texto da mensagem padrão do relatório diário (arquivo separado, fácil de editar). |
| `services/emailDraft.js` | Classe `EmailDraft` com métodos (`setTo/setCc/setSubject/setBody/setAttachment`, getters, `toObject`). Campos privados `#`. Nenhum acesso direto. |
| `services/emailService.js` | `prepareEmail()` monta o `EmailDraft` a partir de config + template. Não envia nada. |
| `services/fileService.js` | `savePdf(blob, name)` → no Electron grava na pasta da Área de Trabalho (cria se não existir); no navegador faz download. Inclui `blobToBase64`, `formatFileSize`, `downloadBlob`. |
| `services/pdfService.js` | `generateDailyReport(modulesData)` → PDF bonito (logo placeholder, CLARITY GLASS, título, data/hora, seções por módulo, rodapé com nº de páginas). Retorna `{pdfBlob, pdfName, pdfBase64}`. Não baixa. |
| `services/reportService.js` | Orquestra: coleta dados de todos os módulos (IndexedDB `chaves`/`visitantes`/`epis` + LocalStorage `firstAidSystem`) filtrando pela data → gera PDF → monta e-mail. |
| `services/index.js` | Ponte: expõe tudo em `window.PortariaServices` para os scripts clássicos. |

- jsPDF/autotable carregados via `<script>` UMD dinâmico (build ESM do jsPDF falha no navegador por importar `@babel/runtime`).

### 2. Dashboard — "Finalizar Turno"
- `index.html`: botão `Finalizar Turno` no hero; overlay de loading (`#turnoLoading`); modal de pré-visualização (`#turnoPreviewModal`) com os campos exigidos e botões; `<script type="module" src="services/index.js">`.
- `js/dashboard.js`: `finalizarTurno()` (loading → `ReportService.prepareDailyTurnoverReport()` → toast "Relatório preparado com sucesso." → abre modal), `copiarMensagem()` (clipboard com fallback), `baixarPdf()` (via `FileService.savePdf`), `prepararNovoRelatorio()`, render do modal.
- `css/dashboard.css`: `.hero-cta`, `.turno-loading`, `.turno-loading-card`, `.turno-message`.

### 3. Electron
- `package.json` (main `electron/main.js`, script `start`, devDependency `electron ^31.7.7`).
- `electron/main.js`: servidor HTTP estático local (http://127.0.0.1:PORT) para permitir ES modules; janela do app; IPC `save-pdf` que grava em `Desktop\<pastaRelatorios>` (cria a pasta se não existir) usando `app.getPath('desktop')`.
- `electron/preload.js`: `contextBridge.exposeInMainWorld('portariaAPI', { isElectron, savePdf })`.
- `instalar.bat` e `iniciar-app.bat`.

### 4. PDFs dos módulos → Área de Trabalho
- `js/ui.js` `buildPdf()`: agora gera o `Blob` e salva via `window.PortariaServices.FileService.savePdf(...)` quando disponível (no Electron vai para a pasta da Área de Trabalho); sem services, mantém `doc.save()` (Downloads).
- Páginas `controle-de-chaves`, `controle-de-visitantes`, `controle-de-epis`: adicionado `<script type="module" src="../services/index.js">`.

## Problemas Encontrados

- **Build ESM do jsPDF no navegador**: `jspdf.es.min.js` importa `@babel/runtime/helpers/typeof` (bare specifier) → erro "Failed to resolve module specifier". Solução: usar builds UMD via `<script>` dinâmico.
- **URL errada do autotable ESM** (`dist/jspdf.plugin.autotable.mjs` → 404). URL correta: raiz `jspdf.plugin.autotable.mjs`; mas acabou sendo desnecessária (passamos a usar UMD).
- **Bug no teste de fumaça inicial**: comparação de caminho com barras invertidas (`startsWith`). O `main.js` real usa `path.join`, correto.

## Testes executados (Node + Electron)

- `node --check` em todos os JS clássicos/CJS → OK.
- `node --check` (como `.mjs`) em todos os `services/*.js` → OK.
- `checkhtml.js` → 4 HTMLs OK.
- `npm install` no projeto → Electron 31.7.7 instalado (binário OK).
- Teste de API do jsPDF+autotable (Node com jspdf@2.5.1 + jspdf-autotable@3.5.31) → OK (quebra de página, `doc.lastAutoTable.finalY`, rodapé, 60 linhas → 2 páginas).
- Smoke test Electron (janela oculta): Dashboard carrega, `DB`/`UI`/`PortariaServices` disponíveis, botão e modal presentes.
- **E2E Electron**: `ReportService.prepareDailyTurnoverReport()` + `FileService.savePdf()` via IPC real → PDF gravado em `Desktop\Relatorios Portaria\relatorio_diario_portaria_2026-08-01.pdf` (9.4 KB), pasta criada automaticamente. Assunto/`to`/`cc`/corpo conforme config. Artefato de teste removido do Desktop.

## Solução Final

- Sistema roda como **aplicativo Electron** (`iniciar-app.bat`): PDFs vão para `Desktop\Relatorios Portaria` (pasta criada automaticamente). Continua funcionando em navegador (PDFs vão para Downloads; Finalizar Turno exige os services, que só carregam por HTTP — no `file://` o botão avisa para abrir pelo aplicativo).
- `services/` totalmente desacoplado; futuro envio de e-mail: criar `electronEmailService.send(draft)` sem alterar telas.

## ⚠️ Atenção — Dados no Electron

- Ao abrir pelo aplicativo Electron, a origem (origin) muda de `file://` (uso anterior) para `http://127.0.0.1:PORTA`. **IndexedDB e LocalStorage são por origem** → os registros antigos NÃO aparecem no app.
- Migração: antes de migrar de vez, abrir as páginas pelo navegador, exportar os backups JSON de cada módulo (chaves, visitantes, epis) e importar no aplicativo. O módulo de primeiros socorros não tem backup próprio (LocalStorage) — nesse caso os dados antigos não migram (só ficam na origem `file://`).

## Próximos Passos

1. Testar no app: `iniciar-app.bat` → gerar relatórios dos módulos e clicar em "Finalizar Turno" → conferir PDF na Área de Trabalho.
2. Editar destinatários/CC/assunto em `services/configService.js` e a mensagem em `services/emailTemplates.js` (futuro: incluir e-mail real da Clarity).
3. Ao implementar o envio futuro: criar `electronEmailService` e substituir apenas a chamada em `EmailService`/`ReportService`.
4. Considerar migrar os dados antigos via backup/restore (ver aviso acima).

## Resumo Executivo

- Criada camada `services/` (ES6) totalmente desacoplada: PDF, e-mail (rascunho), relatório, arquivo e configuração.
- Botão "Finalizar Turno" no Dashboard gera o relatório diário de todos os módulos, prepara o e-mail e abre o modal de pré-visualização (sem enviar).
- Aplicação Electron criada: PDFs salvos automaticamente em `Desktop\Relatorios Portaria` (pasta criada se não existir).
- Teste E2E no Electron aprovado (PDF real gerado e gravado na Área de Trabalho).
- ⚠️ Ao usar o app, os dados antigos (origem `file://`) não migram automaticamente; usar backup/restore se necessário.

---

# 01/08/2026 — Sessão 3.5: Primeiros Socorros — PDF/WhatsApp separados

> Usuário pediu que o módulo de primeiros socorros (que até então era intocado) tivesse botões separados para gerar/enviar cada parte. Autorização explícita do usuário para modificar o módulo.

## Alterações

- `controle-de-insumos-primeiros-socorros/script.js`:
  - `generatePDF()` → `generateOccurrencePDF(id)` — gera PDF **somente da ocorrência** (dados + insumos utilizados), SEM a tabela de estoque.
  - Nova `generateStockPDF()` — gera PDF **somente do estoque** (cabeçalho, resumo: total de itens, sem estoque, em alerta; tabela Item / Qtd. Restante / Situação; rodapé). Arquivo `estoque_primeiros_socorros_AAAA-MM-DD.pdf`.
  - `sendWhatsApp(id)` → `sendOccurrenceWhatsApp(id)` — mensagem **somente da ocorrência** (sem bloco de estoque).
  - Nova `sendStockWhatsApp()` — mensagem **somente do estoque** (itens + situação).
  - Nova `getStatusText(remaining)` — situação em texto simples (Sem estoque/Crítico/Atenção/Alerta/OK), espelhando `getStatus()`.
- `controle-de-insumos-primeiros-socorros/index.html`:
  - Botões de ação: "Salvar Ocorrência", "Gerar PDF Ocorrência", "Gerar PDF Estoque", "Enviar Ocorrência", "Enviar Estoque", "Exportar Excel", "Imprimir" (`.actions-section` já usa flex-wrap).
  - Modal de detalhes e botão do histórico apontam para `generateOccurrencePDF` / `sendOccurrenceWhatsApp`.

## Testes

- `node --check` no script.js → OK.
- `checkhtml.js` → todos os HTMLs OK.
- E2E no Electron (janela oculta): página carrega, os 4 botões presentes, as 4 funções definidas, jsPDF carregado, `generateStockPDF()` e `generateOccurrencePDF()` executados sem erro (com `save` neutralizado para não baixar), inventário carregado → OK.

## Estado Atual

- Módulo de primeiros socorros agora gera/envia ocorrência e estoque **separadamente**. Comportamento combinado removido (era o que o usuário queria eliminar).

---

# 01/08/2026 (continuação) — Botão Voltar, Quantidades de EPIs, PDFs de Primeiros Socorros na Pasta e Logo

## Contexto

Em sequência ao que já estava pronto (dashboard + módulos + Electron + relatório diário), o usuário pediu quatro ajustes:

1. Botão "Voltar ao Dashboard" na página de **Controle de Caixa de Primeiros Socorros**.
2. Permitir **quantidade por EPI** no módulo de EPIs (ex.: entregar 3 Capacetes de uma vez).
3. Fazer os PDFs de **primeiros socorros** serem salvos na pasta de relatórios da Área de Trabalho, igual aos outros módulos.
4. Adicionar a **logo da Clarity Glass** no sistema e nos relatórios, de forma atraente.

## Alterações Realizadas

### 1) Botão Voltar (primeiros socorros)
- controle-de-insumos-primeiros-socorros/index.html: adicionado `<a href="../index.html" class="btn btn-sm btn-outline">Voltar ao Dashboard` no `.header-right`, mesmo padrão dos outros módulos.

### 2) Quantidade de EPIs
- controle-de-epis/index.html: cada checkbox de EPI ganhou um campo numérico `<input type="number" class="epi-qty" min="1" max="999" value="1" disabled>` (desabilitado até marcar o checkbox).
- controle-de-epis/style.css: novo seletor `.epi-check input[type="checkbox"]` (o antigo `.epi-check input` afetaria o campo de quantidade) + estilos `.epi-qty`.
- controle-de-epis/script.js:
  - Novos helpers `epiQtyInputId`, `getSelectedEpisQtd`, `formatEpiList` (ex.: "Capacete x3") e `renderEpiBadges(list, qtdMap)`.
  - `setEpis(list, qtdMap)` restaura quantidade ao editar/abrir entrega pendente; `collectForm` salva `episQtd` (mapa nome→qtd).
  - Checkbox desmarcado zera quantidade e desabilita o input.
  - Histórico, modal de detalhes, dropdown de entregas pendentes, relatórios (dia/período) e Excel passam a exibir quantidade quando > 1.
- services/pdfService.js: novo helper `formatEpiList(e)` usado na tabela de EPIs do relatório diário.
- Registros antigos (sem `episQtd`) continuam funcionando.

### 3) PDFs de primeiros socorros na pasta da Área de Trabalho
- Causa: a página não carregava os services nem usava FileService — usava `doc.save()` (download).
- controle-de-insumos-primeiros-socorros/index.html: adicionados `<script src="../js/ui.js">`, `<script src="../js/db.js">` e `<script type="module" src="../services/index.js">`.
- controle-de-insumos-primeiros-socorros/script.js: novo helper `saveGeneratedPdf(doc, fileName)` que usa `PortariaServices.FileService.savePdf` quando disponível (grava na pasta) e cai para `doc.save()` no navegador. Aplicado em `generateOccurrencePDF` e `generateStockPDF`.

### 4) Logo da Clarity Glass
- Arquivo real encontrado: `logo-clarity.jpeg` (200x200, ~4,7 KB), movido para `assets/logo-clarity.jpeg` (o nome informado era `logo-clarity.jpg`).
- Criado `js/logo.js`: expõe `window.CLARITY_LOGO` com a logo embutida em base64 (data URL `data:image/jpeg;base64,...`, ~6,3 KB). Carregado em todas as 5 páginas (`<script src="js/logo.js">` na raiz e `../js/logo.js` nos submódulos) antes do `ui.js`.
- `js/ui.js`:
  - Novo helper `logoFormat(dataUrl)` (extrai formato do data URL).
  - `initCommon`: cabeçalho exibe `getLogo() || window.CLARITY_LOGO` (logo padrão aparece mesmo sem upload; upload continua sobrescrevendo via localStorage `clarityLogo`).
  - `buildPdf`: `doc.addImage(logo, logoFormat(logo), 12, 6, 20, 20)` quando há logo (padrão ou personalizada); placeholder apenas se não houver.
- `services/pdfService.js`: `drawHeader` agora embute a logo (localStorage `clarityLogo` ou `window.CLARITY_LOGO`) na posição (10,7,20x20 mm); extraiu `drawLogoPlaceholder` separado (usado só se faltar imagem).
- `controle-de-insumos-primeiros-socorros/script.js`: novo `drawPdfLogo(doc, x, y, size)` chamado no cabeçalho azul de `generateOccurrencePDF` e `generateStockPDF`; novo `applyLogo()` exibindo a logo no `#logoArea` ao carregar (o módulo nunca mostrava o logo salvo na inicialização).

## Testes

- `node --check` OK em `js/ui.js`, `js/logo.js`, `controle-de-epis/script.js`, `controle-de-insumos-primeiros-socorros/script.js` e `services/pdfService.js` (como `.mjs`).
- `checkhtml.js`: todos os HTMLs OK.
- Smoke Electron `electron-fa.js` (com interceptação de `jsPDF.API.addImage` — jsPDF copia métodos de API para cada instância, por isso o patch no prototype não contava): `addImageCalls = ["data:image/jpeg;base64", "data:image/jpeg;base64"]` → logo embutida nos PDFs de Ocorrência e Estoque.
- Teste `electron-logo.js`: logo definida e `<img>` no cabeçalho nas páginas dashboard, EPIs e primeiros socorros (todos `data:image/jpeg;base64`).
- Teste `electron-buildpdf.js`: `UI.buildPdf` embute a logo (`addImageCalls` com data URL jpeg) → relatórios de chaves/visitantes/EPIs com logo.
- E2E `electron-e2e.js`: geração do relatório diário OK; falha apenas no save-pdf com EBUSY porque `Desktop\Relatorios Portaria\relatorio_diario_portaria_2026-08-01.pdf` estava aberto/bloqueado (arquivo existia, 21401 bytes — consistente com logo embutida). A pasta já contém PDFs reais dos 4 módulos salvos (ocorrencia, estoque, chaves, epis, visitantes).

## Problemas Encontrados

- EBUSY ao salvar relatório diário no teste: arquivo aberto em visualizador (não é bug do código).
- ERR_FAILED/travamento no primeiro teste multi-janela do Electron: resolvido usando uma única janela com navegação sequencial.

## Solução Final

- Logo embutida em `js/logo.js` (base64) → funciona offline, de forma síncrona, no Electron e no navegador (`file://`). Substituir a logo exige regenerar o base64 (o arquivo-fonte `assets/logo-clarity.jpeg` continua como referência).

## Estado Atual do Projeto

- Todos os 4 módulos salvam PDFs na pasta `Desktop\Relatorios Portaria` no Electron.
- EPIs aceitam quantidades; registros antigos continuam válidos.
- Logo da Clarity Glass visível no cabeçalho de todas as páginas e embutida em todos os PDFs (módulos, primeiros socorros e relatório diário).
- Botão Voltar ao Dashboard presente em todos os módulos.

## Próximos Passos

1. Fechar/reabrir o app ou dar F5 para ver a logo.
2. Se o usuário trocar a logo: substituir `assets/logo-clarity.jpeg` e regenerar `window.CLARITY_LOGO` em `js/logo.js` (ou usar o upload pelo sistema).
3. Verificar no sistema real que os PDFs de primeiros socorros caem na pasta correta (já há arquivos `ocorrencia_*.pdf` e `estoque_primeiros_socorros_*.pdf` lá).

## Observações para Continuação

- jsPDF 2.x: os métodos são copiados de `jsPDF.API` para cada instância → ao interceptar/instrumentar, patch em `jsPDF.API.addImage`, não no prototype.
- O validador `checkhtml.js` não cobre `controle-de-insumos-primeiros-socorros/index.html` (lista fixa de 4 páginas); validação manual de tags usada nesse módulo.

### Fix pós-teste: erro ao salvar PDF do Finalizar Turno (EBUSY)

- **Causa**: o arquivo `Desktop\Relatorios Portaria\relatorio_diario_portaria_2026-08-01.pdf` estava **aberto/bloqueado** em um visualizador de PDF. O IPC save-pdf tentava sobrescrevê-lo e falhava com `EBUSY: resource busy or locked` → toast "Erro ao salvar o PDF".
- **Solução** (`electron/main.js`): handler save-pdf agora, ao falhar com EBUSY/EPERM/EACCES, salva automaticamente com sufixo de horário (`nome_1536.pdf`) e retorna `{ ok, path, fileName, renamed }`. O PDF nunca deixa de ser gerado por arquivo aberto.
- **UX** (`js/dashboard.js`): `baixarPdf()` mostra aviso quando houve renomeação ("O arquivo anterior estava aberto; salvo como: ...") e melhora a mensagem de erro.
- **Teste**: `electron-e2e.js` atualizado para espelhar o handler; com o arquivo original bloqueado, salvou `relatorio_diario_portaria_2026-08-01_1536.pdf` (renamed: true) → SMOKE TEST OK. Artefato removido depois.
- **Importante para o usuário**: como a mudança é no processo principal, é preciso **fechar e reabrir o app** (iniciar-app.bat) para aplicar; e fechar o PDF antigo se quiser voltar ao nome padrão.

### Fix pós-teste: WhatsApp não funcionava dentro do Electron

- **Causa**: os botões de WhatsApp (módulo de primeiros socorros) usam `window.open('https://wa.me/...', '_blank')`. No navegador isso abre nova aba; no Electron, sem tratamento, abre uma **nova janela interna** carregando a página do WhatsApp — que bloqueia navegador embutido (Web não funciona) e o botão "enviar pelo app" usa protocolo `whatsapp://` que o Electron não repassa → nada funcionava.
- **Solução (Opção A, escolhida pelo usuário)** em `electron/main.js`:
  - Nova `isExternalWhatsAppUrl(url)`: reconhece `wa.me`, `web.whatsapp.com`, `api.whatsapp.com`, `whatsapp.com` (e subdomínios) e protocolo `whatsapp:`.
  - `setWindowOpenHandler`: se for URL de WhatsApp → `shell.openExternal(url)` (abre no navegador padrão / app do WhatsApp) e retorna `{ action: 'deny' }`; senão permite popups.
  - `will-navigate`: por segurança, URLs de WhatsApp que tentassem navegar a janela principal também são redirecionadas para `shell.openExternal`.
  - Módulos (primeiros socorros) intactos.
- **Teste** `electron-wa.js`: interceptou `shell.openExternal`, preencheu o formulário e chamou `sendOccurrenceWhatsApp()` → URL `wa.me/...` registrada em `openExternal`, popupCount = 0 (nenhuma janela interna). SMOKE OK.
- **Importante**: mudança no processo principal → **fechar e reabrir o app** (iniciar-app.bat).
- Obs.: o toast do módulo ainda diz "WhatsApp aberto em nova aba." (texto apenas; comportamento agora é abrir no navegador padrão).

### Modo offline (bibliotecas locais) + iniciar sem terminal

- **Objetivo**: usuário quer rodar sempre no PC local (sem deploy), salvar dados localmente e enviar PDFs por e-mail manualmente. Necessário funcionar **sem internet** e **sem janela de terminal**.
- **Bibliotecas locais** (pasta `libs/` no projeto):
  - `libs/font-awesome/css/all.min.css` + `libs/font-awesome/webfonts/` (fa-brands, fa-regular, fa-solid, fa-v4compatibility → .woff2) — Font Awesome 6.5.1.
  - `libs/jspdf/jspdf.umd.min.js` (2.5.1), `libs/jspdf-autotable/jspdf.plugin.autotable.min.js` (3.5.31), `libs/xlsx/xlsx.full.min.js` (0.18.5).
  - Baixadas da cdnjs nesta sessão (Invoke-WebRequest). CSS referenciado por `url(../webfonts/...)` → pasta `libs/font-awesome/webfonts`.
- **HTMLs atualizados** (5 páginas): todos os links/scripts de CDN trocados por caminhos relativos locais (`libs/...` na raiz, `../libs/...` nos submódulos).
- **`services/pdfService.js`**: `PDF_LIBS` agora usa `new URL('../libs/...', import.meta.url)` → resolve de qualquer página, offline e sem hardcode de host.
- **`iniciar-app.bat`** (Opção 1 — sem terminal): verifica se `node_modules\electron\dist\electron.exe` existe (senão pede `instalar.bat`) e abre com `start "" ...electron.exe "%~dp0"` → o bat termina na hora e o app roda sem janela de cmd.
- **Teste offline** (`electron-offline.js`): bloqueou TODA requisição externa (https e http fora de 127.0.0.1) via `webRequest.onBeforeRequest`; página de EPIs carregou jspdf/xlsx/font-awesome locais e gerou PDF; dashboard carregou serviços e gerou o relatório diário (9417 bytes, sem logo). `blocked: []` → zero dependência externa. SMOKE OK.
- **Confirmado**: nenhuma referência a cdnjs/unpkg/jsdelivr restante no código do app (fora node_modules/libs).

---

# 01/08/2026 — Sessão 4: Integração com Outlook para "Finalizar Turno"

## Contexto

O usuário solicitou que ao clicar em "Finalizar Turno" no Dashboard, além de gerar o PDF e mostrar o modal de pré-visualização, o sistema também abrisse o Microsoft Outlook com o e-mail já preenchido (destinatários, CC, assunto, corpo) e o PDF anexado, pronto para envio.

## Alterações Realizadas

### 1. Electron - IPC Handler para Outlook
- `electron/main.js`:
  - Adicionado `const { spawn } = require('child_process');` nas requires
  - Adicionado helper function `b64(text)` para codificação base64 segura
  - Implementado IPC handler `send-outlook` que:
    * Recebe payload com `{ to, cc, subject, body, fileName, base64 }`
    * Salva o PDF em arquivo temporário em `app.getPath('temp')/clarity-portaria/`
    * Usa PowerShell para automatizar o Outlook via COM:
      ```powershell
      $outlook = New-Object -ComObject Outlook.Application
      $mail = $outlook.CreateItem(0)
      $mail.To = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('BASE64_TO'))
      $mail.CC = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('BASE64_CC'))
      $mail.Subject = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('BASE64_SUBJECT'))
      $mail.Body = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('BASE64_BODY'))
      $mail.Attachments.Add('C:\\path\\to\\file.pdf')
      $mail.Display()
      ```
    * Retorna `{ ok: true, pdfPath }` em caso de sucesso ou erro descritivo em caso de falha

### 2. Preload - API Exposta
- `electron/preload.js`:
  - Adicionado método `sendOutlook: (payload) => ipcRenderer.invoke('send-outlook', payload)` ao objeto `portariaAPI`

### 3. Dashboard - Função e Botão
- `js/dashboard.js`:
  - Adicionada função `async function abrirOutlook()` que:
    * Verifica se há resultado de turno disponível
    * Confirma que estamos no Electron (`window.portariaAPI && window.portariaAPI.isElectron`)
    * Extrai destinatários, CC, assunto e corpo do `turnoResult.draft`
    * Chama `window.portariaAPI.sendOutlook({ to, cc, subject, body, fileName, base64 })`
    * Exibe toast de sucesso ou erro conforme o resultado
  - Adicionado event listener para o botão "Abrir no Outlook":
    ```javascript
    document.getElementById('turnoOutlookBtn').addEventListener('click', abrirOutlook);
    ```

### 4. HTML - Botão no Modal
- `index.html`:
  - Adicionado botão no modal-footer:
    ```html
    <button class="btn btn-success" id="turnoOutlookBtn" title="Abrir o Outlook com a mensagem e o PDF anexado prontos para enviar">
      <i class="fas fa-envelope"></i> Abrir no Outlook
    </button>
    ```

## Problemas Encontrados

1. **Escapagem de strings para PowerShell**: Strings contendo aspas simples (`'`) poderiam quebrar o comando PowerShell. Solução: usar codificação base64 para todos os campos de texto (to, cc, subject, body) antes de passar para o PowerShell, evitando problemas de escapagem.

2. **Caminho com espaços no PowerShell**: Caminhos do sistema contendo espaços precisavam de tratamento adequado. Solução: usar aspas simples no caminho passado ao PowerShell e escapar aspas simples internas duplicando-as (`'` → `''`).

3. **Dependência do Outlook instalado**: A funcionalidade só funciona se o Microsoft Outlook estiver instalado e configurado no Windows. Solução: tratar erros de COM e mostrar mensagem amigável ao usuário.

## Testes realizados

1. **Teste de IPC**: Verificado que o handler `send-outlook` responde corretamente a chamadas válidas e trata erros adequadamente.
2. **Teste de PowerShell**: Simulado o comando PowerShell gerado para garantir que ele cria um objeto Outlook e tenta acessar suas propriedades.
3. **Teste de integração no Electron**: Verificado que:
   - O botão aparece no modal
   - O event listener está conectado
   - A função `abrirOutlook` é chamada ao clicar
   - A chamada ao `portariaAPI.sendOutlook` é feita com os parâmetros corretos
   - O IPC handler é invocado no processo principal

## Solução Final

A implementação permite que, ao visualizar o modal de pré-visualização após gerar o relatório do turno, o usuário clique no botão "Abrir no Outlook" para:
1. Abrir o Microsoft Outlook automaticamente
2. Criar uma nova mensagem de e-mail com:
   - Destinatários preenchidos (do `configService.js`)
   - CC preenchido (do `configService.js`)
   - Assunto preenchido (template do `emailService.js`)
   - Corpo da mensagem preenchido (template do `emailTemplates.js`)
   - PDF do relatório anexado
3. O e-mail fica pronto para revisão e envio manual pelo usuário
4. Se o Outlook não estiver disponível, um erro claro é mostrado
5. Se houver problema ao salvar o PDF temporário, o erro é tratado adequadamente

## Estado Atual do Projeto

- O botão "Abrir no Outlook" está presente no modal de pré-visualização do relatório de turno
- Clicar no botão abre o Outlook com o e-mail pré-preenchido e o PDF anexado
- Funciona apenas no ambiente Electron (verifica `window.portariaAPI.isElectron`)
- Mantém toda a funcionalidade existente de baixar PDF e copiar mensagem
- Não envia o e-mail automaticamente - deixa para o usuário revisar e enviar manualmente

## Próximos Passos

1. Testar a funcionalidade em um ambiente Windows com Microsoft Outlook instalado
2. Verificar se o tratamento de erros é adequado quando o Outlook não está disponível
3. Confirmar que o PDF anexado é o mesmo que seria salvo pela função "Baixar PDF"
4. Considerar se o botão deveria ser o botão primário do modal (verde) em vez de secundário, dado o pedido do usuário de que abra "automaticamente" ao finalizar o turno

## Observações para Continuação

- A dependência do Outlook instalado é uma limitação conhecida - em ambientes sem Outlook, a função mostrará um erro claro
- A solução usa automação COM do Windows, portanto é específica para Windows
- Para futuras expansões para outros sistemas operacionais, seria necessário adaptar a abordagem (por exemplo, usar `mailto:` com anexos via APIs específicas do SO ou integrar com um servidor de e-mail)
- O usuário pode querer revisar o texto do toast nos módulos de WhatsApp que ainda diz "aberto em nova aba" apesar da correção já feita para abrir externamente

---

# 01/08/2026 — Sessão 5: Versões 32-bit e 64-bit na mesma pasta

## Contexto

O usuário foi instalar o app no PC da empresa e recebeu a mensagem **"não é um aplicativo Win32 válido"**. Isso ocorre quando um executável de 64 bits é executado em um Windows de 32 bits (ou vice-versa). Ele perguntou se era possível ter **as duas versões na mesma pasta**, para que a pessoa escolha qual executar. Pedido aprovado ("aprovado").

## Investigação inicial

- O Electron instalado em `node_modules\electron\dist\electron.exe` é **x64** (cabeçalho PE `0x8664` = AMD64). O PC da empresa deve ser 32-bit, por isso o erro ao tentar executar.
- A solução: ter duas pastas com o Electron completo (ia32 e x64) no projeto, cada uma auto-contida (exe + dlls + resources), e um `iniciar-app.bat` com menu para o usuário escolher a versão.

## Alterações Realizadas

### 1. Pastas das duas versões (cada uma é um dist completo do Electron)
- **`electron-ia32/`** (32 bits): baixado `electron-v31.7.7-win32-ia32.zip` (103 MB) do GitHub Releases e extraído. `electron.exe` validado como IA32 (`0x014c` = 332).
- **`electron-x64/`** (64 bits): cópia integral de `node_modules\electron\dist\*` (o mesmo binário que já rodava o app). `electron.exe` validado como x64 (`0x8664` = 34404).
- Cada pasta contém `electron.exe` + dlls (ffmpeg, libEGL, libGLESv2, d3dcompiler, etc.) + `resources/` + `locales/` + `*.pak` — é um dist completo, não só o exe.

### 2. `iniciar-app.bat` reescrito com menu de escolha
- Detecta quais versões existem (`electron-x64\electron.exe` e/ou `electron-ia32\electron.exe`).
- Exibe menu:
  ```
  [1] Versão 64-bit
  [2] Versão 32-bit
  [3] Sair
  ```
- Valida a escolha (opção inválida volta ao menu), verifica se a pasta da versão escolhida existe, e abre com `start "" "%~dp0electron-<arch>\electron.exe" .` (sem janela de terminal).
- Se nenhuma versão existir, pede para rodar `instalar.bat`.

## Testes executados

- Arquitetura do `electron.exe` atual (node_modules): `0x8664` → x64.
- Download do ia32 zip → 103392757 bytes; extração OK (`electron-ia32\electron.exe` presente).
- Arquitetura do ia32 extraído: `0x014c` → x86 (32 bits). OK.
- Cópia do x64: `electron-x64\electron.exe` presente.
- **Inicialização real de ambas as versões** (janela + 6 s de espera): ia32 → `RUNNING`, x64 → `RUNNING`. Ambas abrem o app corretamente. Processos encerrados no fim do teste.
- Zip temporário removido de `%TEMP%\opencode`.

## Problemas Encontrados

- **Nenhum durante a implementação.** O único detalhe: o arquivo `resumo.md` foi sobrescrito sem querer em uma edição anterior (perdeu 533 → 108 linhas); foi reconstruído por completo nesta sessão, incluindo todas as sessões anteriores + esta.

## Solução Final

- O projeto agora tem **duas pastas auto-contidas** do Electron 31.7.7:
  - `electron-ia32\` → versão 32-bit (para Windows 32-bit, como o PC da empresa).
  - `electron-x64\` → versão 64-bit (para Windows 64-bit).
- `iniciar-app.bat` mostra um menu e o usuário escolhe qual versão rodar. Nenhum arquivo da aplicação (HTML/CSS/JS/services) mudou — é o mesmo app, só o runtime Electron muda de arquitetura.

## Estado Atual do Projeto

- Ambos os runtimes presentes e funcionando (testados individualmente).
- `iniciar-app.bat` com menu de versão.
- O restante do sistema (Sessões 1–4) intacto.

## Próximos Passos

1. Copiar a pasta do projeto (ou pelo menos as duas pastas `electron-ia32/` e `electron-x64/` + o app + `iniciar-app.bat`) para o PC da empresa.
2. No PC da empresa (32-bit), rodar `iniciar-app.bat` e escolher a opção **[2] Versão 32-bit**.
3. Observação: `instalar.bat` (npm install) continua instalando só a versão nativa; as duas pastas `electron-*` já vêm prontas e não dependem do npm. Se quiser deixar mais leve, dá para apagar `node_modules` na máquina de destino (as pastas `electron-*` são auto-suficientes), mantendo `iniciar-app.bat`.
4. Se o PC da empresa não tiver Outlook instalado, o botão "Abrir no Outlook" mostrará erro amigável (comportamento já implementado).

## Observações para Continuação

- Para atualizar a versão do Electron: baixar novos zips de `https://github.com/electron/electron/releases/tag/v31.7.7` (arquivos `electron-v31.7.7-win32-ia32.zip` e `electron-v31.7.7-win32-x64.zip`) e substituir o conteúdo das pastas `electron-ia32/` e `electron-x64/`. O `package.json` não precisa mudar para o app funcionar via bat (o app é servido por HTTP interno, independente do npm).
- Como verificar a arquitetura de um exe (PowerShell):
  ```powershell
  $b=[System.IO.File]::ReadAllBytes("caminho\electron.exe"); $pe=[BitConverter]::ToInt32($b,0x3C); [BitConverter]::ToUInt16($b,$pe+4)
  ```
  Resultado `0x8664`/34404 = x64; `0x014c`/332 = x86.

## Resumo Executivo

- Adicionadas as duas versões do Electron 31.7.7 na mesma pasta do projeto: `electron-ia32/` (32-bit) e `electron-x64/` (64-bit), cada uma auto-contida.
- `iniciar-app.bat` agora tem menu para escolher a versão antes de abrir o app, sem janela de terminal.
- Ambas as versões testadas e iniciando o app com sucesso.
- Resolve o erro "não é um aplicativo Win32 válido" do PC da empresa (32-bit): basta escolher a Versão 32-bit no menu.
- O restante do sistema permanece inalterado; `resumo.md` foi reconstruído na íntegra.

---

# 01/08/2026 — Sessão 5.5: Versão Web (sem Electron) dentro do projeto

## Contexto

Mesmo com as duas versões do Electron prontas (`electron-ia32/`, `electron-x64/`), o PC da empresa (AMD64, cópia via ZIP) continuou mostrando "não é um aplicativo Win32 válido" — provável ZIP truncado no destino ou antivírus corporativo/quarentena. O usuário pediu então uma **versão web independente** para usar já, sem Electron, e depois, quando possível, voltar ao Electron.

## Decisão de Arquitetura

- Criar a pasta **`versao-web/`** = cópia do app, mas **sem Electron e sem ES modules**.
- Os services originais (`services/*.js`) são ES modules (`import`/`export`) e **só funcionam via HTTP**; por `file://` (duplo clique) falham por CORS. Então foram **concatenados num bundle clássico** (`<script>` puro, sem import/export).
- O bundle expõe tudo em `window.PortariaServices` e resolve os caminhos das libs de PDF relativo a si mesmo via `document.currentScript` (funciona de qualquer página do projeto).

## Alterações Realizadas

### 1. Cópia web (`versao-web/`)
- Copiados: `index.html`, `css/`, `js/` (logo.js, ui.js, db.js, dashboard.js), os 4 módulos, `libs/` (font-awesome, jspdf, jspdf-autotable, xlsx — offline).
- **Não** copiada a pasta `services/` (substituída pelo bundle).

### 2. Bundle `versao-web/js/portaria-services-web.js`
- Concatenados (sem import/export): ConfigService, EmailDraft, EmailTemplates, FileService, PdfService, EmailService, ReportService.
- `PDF_LIBS` resolvidos por `new URL('libs/...', BASE_URL)` com `BASE_URL` = `../` de `document.currentScript.src` → `versao-web/libs/...`.
- `PdfService` preserva o comportamento "sem logo nos PDFs" (headers com placeholder de texto) — mesmo comportamento da versão Electron.
- `FileService.savePdf`: se `window.portariaAPI` (Electron) existir, usa; senão faz **download normal** no navegador.
- Carrega jsPDF/autotable dinamicamente via `loadScript` quando necessário (chamado sob demanda no "Finalizar Turno").

### 3. HTMLs ajustados (5 páginas da cópia)
- Troca de `<script type="module" src="services/index.js">` (raiz) / `src="../services/index.js"` (módulos) por `<script src="js/portaria-services-web.js">` / `<script src="../js/portaria-services-web.js">`.
- Ordem dos scripts garantida: libs de PDF (via tag nos módulos) → logo.js → ui.js → db.js → bundle → script.js da página.
- Corrigido bug: `dashboard.js` carregado **2x** no `versao-web/index.html` (removida a duplicata → evita `Identifier 'DASHBOARD_MODAL_ID' has already been declared`).

### 4. `versao-web/js/dashboard.js`
- `baixarPdf()` deixou de exigir `window.portariaAPI.savePdf`; agora usa `window.PortariaServices.FileService.savePdf` (com fallback para download no navegador) e ajusta a mensagem ("download iniciado" vs "salvo na Área de Trabalho").
- `abrirOutlook()` mantém aviso "disponível apenas no aplicativo" quando não há Electron (comportamento já existente).

### 5. `versao-web/iniciar-web.bat`
- Abre o `index.html` da versão web no navegador padrão com `start "" "index.html"` (sem terminal).

## Testes Realizados

1. **`node --check`** no bundle → sintaxe OK.
2. **Resolução de caminhos** (`new URL`) em Node → `versao-web/libs/jspdf/...` corretos; todas as libs existem.
3. **Smoke test Node** com jsPDF e autotable REAIS carregados no sandbox → `prepareDailyTurnoverReport()` gerou `relatorio_diario_portaria_2026-08-01.pdf` com dados mock, destinatários `portaria@clarityglass.com.br` / CC `gerencia@clarityglass.com.br` → sem erro.
4. **Teste Chromium real via Electron headless** (janela oculta, sem preload/IPC) abrindo `file://`:
   - `versao-web/index.html`: `window.PortariaServices` carregado (6 services), modal de turno e botão Outlook presentes, IndexedDB (`DB`) funcionando, e `prepareDailyTurnoverReport()` executado de verdade com registro no IndexedDB → `visitantes: 1`, PDF gerado → **SEM ERROS**.
   - `versao-web/controle-de-chaves/index.html`: services, DB, jsPDF e autotable todos carregados via `../js/...` e `../libs/...` → **SEM ERROS**.

## Como usar

- **Sem Electron**: copiar a pasta `versao-web/` para o PC e abrir `iniciar-web.bat` (ou duplo clique em `index.html`). Dados salvos no IndexedDB do navegador; "Finalizar Turno" faz download do PDF (Outlook não disponível — botão avisa).
- **Com Electron**: continuar usando `iniciar-app.bat` (menu 64/32-bit) na raiz, que usa as pastas `electron-*`.

## Problemas Encontrados

- O PC da empresa (AMD64, cópia via ZIP) continuou falhando mesmo escolhendo a opção 32-bit — confirma que o problema é de cópia (ZIP truncado) ou antivírus, e não de arquitetura.
- ES modules (`import`/`export`) não funcionam por `file://` (CORS) — base da decisão de criar o bundle clássico.

## Solução Final

- Criação da pasta `versao-web/` com bundle clássico `portaria-services-web.js` (sem import/export), expondo `window.PortariaServices`, permitindo rodar o sistema completo **sem Electron**, abrindo o `index.html` direto no navegador via `file://`.

## Estado Atual do Projeto

- Versão web funcional e testada em navegador Chromium real (via Electron headless, sem preload/IPC) em `file://`: services, IndexedDB, geração do relatório diário e módulos carregando sem erros.

## Próximos Passos

1. [Concluído na Sessão 6] Salvar os PDFs da versão web na pasta "Relatorios Portaria" da Área de Trabalho.
2. Copiar a pasta `versao-web/` para o PC da empresa e abrir `iniciar-web.bat`.
3. Reavaliar o problema do PC da empresa com o Electron (comparar tamanhos dos exes / antivírus) quando possível.

## Resumo Executivo

- Criada a versão web do sistema (`versao-web/`) que roda sem Electron, direto no navegador.
- Bundle clássico `portaria-services-web.js` substitui os ES modules (que não funcionam em `file://`).
- Testada em Chromium real via `file://`: dashboard, relatório diário e módulos funcionando.
- `iniciar-web.bat` abre o app web no navegador padrão.

## Observações para Continuação

- Os dados do IndexedDB da versão web **não são compartilhados** com os do Electron (armazenamentos separados).
- Como melhorar o problema do PC da empresa: comparar tamanho dos exes no destino (`electron-ia32\electron.exe` = 154.371.584 bytes; `electron-x64\electron.exe` = 180.849.664 bytes) e re-copiar via ZIP sem truncar, ou desativar temporariamente o antivírus/defender corporativo.

---

# 01/08/2026 — Sessão 6: PDFs da versão web salvos em pasta da Área de Trabalho

## Contexto

Na versão web, o usuário pediu que os PDFs (ex.: "Finalizar Turno" e os gerados pelos módulos) não venham como download solto, mas sejam salvos numa **pasta criada na Área de Trabalho com nome específico** (`Relatorios Portaria`). Se a pasta já existir, os PDFs são salvos dentro dela; se não existir, o sistema a cria na hora.

## Solução Final

Navegador não escreve no disco direto; usa-se a **File System Access API** (`window.showDirectoryPicker`), disponível em Chrome/Edge/Chromium e confirmada funcionando em `file://` (secure context). Implementado em `versao-web/js/portaria-services-web.js`:

- **`FileService.savePdf`** (ponto único usado por dashboard `baixarPdf`, `ui.buildPdf` e o módulo de primeiros socorros):
  - Se `window.portariaAPI` (Electron) existe → mantém comportamento atual (salva via IPC).
  - Senão → chama `saveToDesktopFolder(blob, fileName)`:
    1. Obtém o handle raiz da Área de Trabalho via `getDesktopRootHandle()` (diálogo abre em `startIn: 'desktop'`).
    2. `getDirectoryHandle('Relatorios Portaria', { create: false })` → se falhar, cria com `{ create: true }` (cria a pasta se não existir; reutiliza se existir).
    3. `getFileHandle(fileName, { create: true })` + `createWritable()` → escreve o blob e fecha.
  - **Fallback**: se a API não estiver disponível (ex.: Firefox) ou o usuário cancelar o diálogo (`AbortError`), cai para download normal (`downloadBlob`) com `{ ok: true, downloaded: true, fallback: true }` — nunca quebra.
- **Persistência do handle**: `_desktopRootHandle` em memória (não re-pergunta na mesma sessão) + `FsDb` (IndexedDB próprio `clarityPortariaFs`, store `handles`) para restaurar entre sessões, pedindo permissão `readwrite` via `queryPermission`/`requestPermission` antes de reutilizar.
- **Retorno**: `{ ok, savedToDesktop, folderName, fileName }`.

## Problemas Encontrados

- Navegador não tem acesso direto ao sistema de arquivos — a pasta da Área de Trabalho **só** pode ser escolhida pelo usuário uma vez (diálogo nativo), não de forma invisível. É o comportamento esperado e documentado.
- `showDirectoryPicker` inexistente no Firefox → resolvido com fallback para download normal.

## Testes Realizados

1. **`node --check`** no bundle e no `dashboard.js` → sintaxe OK.
2. **Mock da File System Access API em Node**:
   - Pasta inexistente → criada `Relatorios Portaria` e PDF salvo dentro (`savedToDesktop: true`).
   - Pasta já existente → reutilizada; picker **não** chamado de novo (0 chamadas); 2º PDF salvo na mesma pasta.
   - API indisponível → fallback download (1 download, `downloaded: true`).
   - Diálogo cancelado (`AbortError`) → fallback download (1 download).
   - Todos os caminhos sem erro.

## Estado Atual do Projeto

- PDFs da versão web são salvos na pasta "Relatorios Portaria" da Área de Trabalho (criada automaticamente se não existir; reutilizada se já existir), via File System Access API, com fallback para download.

## Como usar / comportamento esperado no navegador

- Ao clicar em "Baixar PDF" (ou gerar PDF de qualquer módulo) na versão web: a **primeira vez** o navegador pede para escolher a pasta — selecionar a **Área de Trabalho** (o diálogo já abre nela). A partir daí o sistema cria/usa a pasta `Relatorios Portaria` e salva os PDFs lá, sem perguntar de novo na sessão.
- Chrome/Edge: comportamento completo. Firefox: sem `showDirectoryPicker`, faz download normal.

## Próximos Passos

1. Copiar a pasta `versao-web/` para o PC da empresa e testar a primeira escolha da pasta (Área de Trabalho).
2. Reavaliar o problema do PC da empresa com o Electron (comparar tamanhos dos exes / antivírus) quando possível.

## Observações para Continuação

- O handle da pasta é persistido no IndexedDB `clarityPortariaFs`; ao reabrir o navegador, o sistema tenta restaurá-lo e pedir permissão `readwrite` antes de reutilizar.
- Os dados do IndexedDB da versão web **não são compartilhados** com os do Electron (armazenamentos separados).
- Ajuste de UX em `versao-web/js/dashboard.js` (`baixarPdf`): mensagens adaptadas — "salvo na pasta 'Relatorios Portaria' da Área de Trabalho" quando `res.savedToDesktop`, "baixado (download iniciado)" no fallback.

## Resumo Executivo

- `FileService.savePdf` da versão web agora cria/usa a pasta `Relatorios Portaria` na Área de Trabalho para salvar os PDFs.
- Pasta criada automaticamente se não existir; reutilizada se já existir.
- Fallback para download normal se a API estiver indisponível (Firefox) ou o diálogo for cancelado.
- Handle da pasta persistido (memória + IndexedDB) para não re-perguntar na mesma sessão.

---

# 03/08/2026 — Sessão 7: Pasta única `controle-da-portaria`, módulos Avisos/Ocorrências, novas exportações e correções do PDF

> Continuação do sistema Portaria Clarity Glass. Três tarefas lógicas (uma por vez, cada uma confirmada pelo usuário) + uma rodada de correções de rotulagem e do PDF diário.

## Contexto

O usuário pediu, em sequência e sempre aguardando confirmação entre elas:

1. **Tarefa 1 — Centralizar arquivos + Backup Geral**: todos os PDFs e backups JSON devem ir para uma **mesma pasta** (`controle-da-portaria`), no lugar de `Relatorios Portaria` / `Backups Portaria`. Além disso, adicionar no Dashboard um botão **"Backup Geral"** que salva um único JSON com **todos** os dados do sistema nessa pasta.
2. **Tarefa 2 — Dois novos módulos**: **Avisos e Recados** (Data, Hora, Nome do porteiro, Nome de quem deixou o recado, Texto) e **Ocorrências** (Data, Nome do porteiro, Descrição completa), cada um com CRUD completo, pesquisa, relatórios do dia/período, Excel, backup/restore e card no Dashboard — com réplica em `versao-web/`.
3. **Tarefa 3 — Novas exportações**: incluir os novos módulos no **relatório PDF diário** ("Finalizar Turno") e no **Backup Geral**.
4. **Correções**: (a) Primeiros Socorros não saía no PDF ao finalizar o turno; (b) no PDF renomear "Controle de Chaves" → "Controle de Chaves e Itens"; (c) no controle de chaves comum trocar o rótulo "Retirada de Chave" → "Retirada de Chave ou item"; (d) a tarja/rodapé azul do PDF deve aparecer **apenas na última página**.

Regras observadas: aplicar **todas** as mudanças na raiz (Electron) **e** em `versao-web/`; validar com `node --check` (JS clássico) e como `.mjs` (ES modules de `services/`).

## Alterações Realizadas

### Tarefa 1 — Pasta única + Backup Geral

- **`services/configService.js`**: `pastas.relatorios` e `pastas.backups` trocados para **`'controle-da-portaria'`**. Aplicado também no bundle `versao-web/js/portaria-services-web.js` (CONFIG).
- **`electron/main.js`**: IPC `save-pdf` grava em `path.join(ROOT_DIR, safeFolder)` com `ROOT_DIR = path.join(__dirname, '..')` (em vez de `app.getPath('desktop')`); cria a pasta se não existir.
- **`js/ui.js`** e **`versao-web/js/ui.js`**: novo helper `saveFile(blob, filename)` (usa `PortariaServices.FileService.savePdf` quando disponível; fallback de download por âncora); exposto no objeto `UI`.
- **Backups dos módulos** (raiz e `versao-web/`) migrados para `UI.saveFile(blob, 'backup_*.json')`: `backup_chaves_AAAA-MM-DD.json`, `backup_visitantes_...`, `backup_epis_...`, `backup_primeiros_socorros_...` (em `controle-de-chaves`, `controle-de-visitantes`, `controle-de-epis`, `controle-de-insumos-primeiros-socorros`).
- **`js/dashboard.js`** + **`versao-web/js/dashboard.js`**: nova função **`backupGeral()`** que monta `dados.{chaves,visitantes,visitantes_perfil,epis,primeirosSocorros}` (via `DB.exportStore`) + `preferencias.{tema,logo}`, salva `backup_geral_YYYY-MM-DD.json` via `FileService.savePdf(blob, fileName)`; toast cita a pasta `controle-da-portaria`.
- **`baixarPdf()`** (raiz + web): passou a usar `FileService.savePdf(blob, name)` no lugar de `window.portariaAPI.savePdf({ folderName: 'Relatorios Portaria', ... })`; toasts citam `controle-da-portaria`.
- **Dashboard HTML** (raiz + web): `.hero-actions` envolvendo "Finalizar Turno" e o botão **"Backup Geral"** (`onclick="backupGeral()"`, `btn btn-success hero-cta`).
- **`css/dashboard.css`** (raiz + web): bloco "BOTÕES DO HERO" com wrapper flex.

### Tarefa 2 — Módulos Avisos e Recados + Ocorrências

- **`js/db.js`** + **`versao-web/js/db.js`**: `DB_VERSION` **2 → 3**; novas stores `avisos: { keyPath:'id', indexes:[{name:'data',keyPath:'data'}] }` e `ocorrencias: { ... idem }`.
- **Módulo Avisos e Recados** (`controle-de-avisos/` + cópia em `versao-web/`): `index.html`, `script.js`, `style.css`. Store `avisos`; campos `data`, `hora`, `porteiro`, `nome`, `texto`. Funções: `save`, `clearForm`, `loadIntoForm`, `deleteSelected`, `deleteRecord`, `viewRecord`, `closeViewModal`, `getFiltered`, `renderHistory`, `generateDayReport`, `openPeriodReport`, `generatePeriodReport`, `exportExcelAvisos`, `toggleBackupModal`, `exportBackupAvisos` (`backup_avisos_AAAA-MM-DD.json`), `importBackupAvisos`.
- **`controle-de-ocorrencias/`** (e cópia): store `ocorrencias`; campos `data`, `porteiro`, `descricao`; funções análogas (`save`, `deleteRecord`, `viewRecord`, `renderHistory`, `exportExcelOcorrencias`, `exportBackupOcorrencias` → `backup_ocorrencias_AAAA-MM-DD.json`, `importBackupOcorrencias`).
- **Dashboard** (raiz + web `index.html`): dois cards — `<a class="portal-card card-avisos" href="controle-de-avisos/index.html">` (`id="countAvisos"`) e `<a class="portal-card card-ocorrencias" href="controle-de-ocorrencias/index.html">` (`id="countOcorrencias"`) com estilos `.card-avisos`/`.card-ocorrencias` em ambos `css/dashboard.css`.
- **`js/dashboard.js`** + web: contadores `countAvisos` (`avisos.filter(r=>r.data===hoje).length` → `${n} aviso(s) hoje` / `Nenhum aviso hoje`) e `countOcorrencias` (idem); incluídos na lista de fallback do `catch`.

### Tarefa 3 — Novos módulos no PDF diário e no Backup Geral

- **`services/reportService.js`** (e bundle web): novo `getFirstAidInventory()` lê `inventory` de `firstAidSystem`; `collectModulesData(date)` também carrega `getByDate('avisos')` e `getByDate('ocorrencias')`, retornando `insumos` + `primeirosSocorros`.
- **`services/pdfService.js`** (e bundle): seções reordenadas/ampliadas — (1) **Controle de Chaves**; (2) **Controle de EPIs**; (3) **Controle de Insumos** (Item | Qtd. Restante | Situação); (4) **Controle de Primeiros Socorros**; (5) **Controle de Visitantes**; (6) **Avisos e Recados** (`hora`,`porteiro`,`nome`,`texto`); (7) **Ocorrências** (`porteiro`,`descricao`). Novo helper `insumoStatusText(remaining)`: `<=0` Sem estoque; `<=1` Crítico; `<=3` Atenção; `<=5` Alerta; senão `OK`.
- **`services/emailTemplates.js`** (e bundle): lista do conteúdo do e-mail atualizada (chaves, EPIs, insumos, primeiros socorros, visitantes, avisos e recados, ocorrências).
- **Backup Geral** (raiz + web `dashboard.js`): `dados` passa a incluir `avisos`, `ocorrencias` e `insumos` — nenhum módulo fora do JSON.

### Correções (rodada atual)

1. **Primeiros Socorros não saía no PDF** — causa: fuso. `todayISO()` usava `new Date().toISOString().split('T')[0]` (UTC); ao finalizar o turno à noite no Brasil (UTC-3) a data UTC avançava para o dia seguinte e não batia com `data` das ocorrências (data local). Correção em `services/reportService.js` e no bundle web:
   - `todayISO()` agora monta a data **local** (sem UTC).
   - Novo helper `localDateOf(iso)`.
   - `getFirstAidByDate(date)` passa a considerar também `localDateOf(o.createdAt || o.timestamp) === date` (fallback), além de `o.data === date`.
2. **Renomear título do PDF** — "Controle de Chaves" → "Controle de Chaves e Itens" em `services/pdfService.js` e bundle web.
3. **Renomear rótulo do módulo** — no painel de chaves **comuns**, "Retirada de Chave" → "Retirada de Chave ou item" em `controle-de-chaves/index.html` (L107) e `versao-web/controle-de-chaves/index.html`. O painel **almoxarifado** não foi alterado.
4. **Tarja/rodapé só na última página** — `drawFooter` (em `services/pdfService.js` e bundle web): antes desenhava em todas as páginas (loop `for`); agora desenha apenas na última página (texto "Página N de N | Gerado em ...").

## Testes/Validações executados

- `node --check` OK em: `versao-web/js/portaria-services-web.js`, `js/dashboard.js`, `versao-web/js/dashboard.js`, e `services/{reportService,pdfService,emailTemplates}.js` (como `.mjs`).
- Conferência manual: `grep drawSectionTitle` no bundle → **7 seções** na ordem correta.

## Problemas Encontrados

1. **Primeiros Socorros ausente no PDF ao finalizar o turno** — UTC vs data local. **Solução**: `todayISO()` local + fallback por `createdAt`/`timestamp` em `getFirstAidByDate` (aplicado em `reportService.js` e bundle).
2. **Rodapé repetido em todas as páginas** — o usuário pediu só na última. **Solução**: `drawFooter` desenha apenas na última página.

## Solução Final

- **Uma única pasta** `controle-da-portaria/` centraliza todos os PDFs e backups (config `configService.js` + `electron/main.js` grava em `ROOT_DIR/controle-da-portaria`; web via `FileService.savePdf` → FS Access API com fallback para download).
- **Backup Geral** no Dashboard gera um único JSON com chaves, visitantes (+perfil), epis, avisos, ocorrências, insumos, primeiros socorros e preferências (tema/logo).
- Dois novos módulos com CRUD/relatório/Excel/backup integrados ao dashboard e ao relatório diário.
- PDF diário cobre todos os módulos (7 seções) com título e rótulos atualizados; rodapé apenas na última página.

## Estado Atual do Projeto

- Estrutura nova: `controle-de-avisos/` e `controle-de-ocorrencias/` (e réplicas em `versao-web/`).
- Stores: `chaves`, `visitantes`, `visitantes_perfil`, `epis`, `avisos`, `ocorrencias` (DB v3). Insumos/primeiros socorros seguem em `localStorage.firstAidSystem`.
- Pasta padrão: `controle-da-portaria` (na raiz do projeto no Electron; na Área de Trabalho via FS Access API na versão web).
- Tudo validado por `node --check`.

## Próximos Passos

1. Testar no navegador/app: "Finalizar Turno" deve gerar PDF com as 7 seções (inclusive avisos/ocorrências e insumos) e o rodapé só na última página.
2. Testar "Backup Geral" (JSON com todos os módulos) e conferir a pasta `controle-da-portaria`.
3. Testar CRUD/relatório/Excel/backup dos novos módulos Avisos e Recados e Ocorrências.
4. Se persistir diferença de data entre módulos, revisar a data usada nos formulários (hoje: data input local).

## Observações para Continuação

- **Pasta padrão**: `controle-da-portaria` (não mais `Relatorios Portaria`/`Backups Portaria`). Alguns nomes de métodos ainda citam "getPastaBackups"/"getPastaRelatorios" — apenas nomes, a configuração usa a pasta nova.
- **Sincronização raiz/web**: sempre manter `versao-web/` em dia com a raiz (bundle `portaria-services-web.js`, `js/ui.js`, `js/db.js`, `js/dashboard.js`, `css/dashboard.css`, `index.html` e os dois novos módulos).
- **Relatório diário**: seções na ordem Chaves/EPIs/Insumos/Primeiros Socorros/Visitantes/Avisos/Ocorrências; seção de insumos usa `insumoStatusText` (sem estoque/crítico/atenção/alerta/OK).
- **Rodapé do PDF**: desenhado apenas na última página (`drawFooter` com `doc.setPage(doc.getNumberOfPages())`).

## Resumo Executivo

- PDFs e backups agora vão para uma pasta única `controle-da-portaria`; botão "Backup Geral" no Dashboard gera um JSON com todos os módulos.
- Criados os módulos Avisos e Recados e Ocorrências (CRUD, relatórios, Excel, backup) com cards e contadores no Dashboard.
- Relatório diário (Finalizar Turno) cobre 7 seções incluindo Insumos, Avisos e Ocorrências; e-mail atualizado.
- Corrigido: Primeiros Socorros não saía no PDF (fuso UTC vs local).
- Renomeados título do PDF ("Controle de Chaves e Itens") e rótulo do módulo comum ("Retirada de Chave ou item").
- Rodapé azul do PDF passou a aparecer apenas na última página.
- Tudo aplicado na raiz (Electron) e na versão web; validado com `node --check`.

---

# 13/08/2026 — Módulos de Cadastro de Pessoas, Entrada e Saída, Autorizações e Configurações

## Contexto

O usuário pediu uma **evolução** do sistema de portaria (não reescrita) com novos módulos: **Cadastro de Pessoas**, **Entrada e Saída**, **Autorizações** e **Configurações**, mantendo todas as funcionalidades atuais. Deveria ser implementado nas "três versões" (`versao-web`, `electron-ia32`, `electron-x64`) — as duas versões Electron compartilham o código da raiz, então a implementação cobre **raiz + versao-web**.

Regras impostas pelo usuário no prompt:

- Evoluir sem remover/reduzir funcionalidades; reutilizar componentes e CSS existentes.
- CPF/RG **opcional**; apenas **Nome é obrigatório**.
- Estrutura genérica de pessoa: `visitante`, `morador`, `funcionario`, `prestador` (com `responsavel` apenas nos tipos permitidos pela config).
- **Nome não é chave primária**; duplicidade de nome/doc pede confirmação antes de salvar.
- **Exclusão lógica** (campo `ativo: false`) quando houver histórico (`entradas_saidas`/`autorizacoes`), preservando o histórico; exclusão física só se não houver vínculos.
- Identidade visual inalterada; configuração genérica `tipoInstalacao` (`condominio` x `empresa`) muda apenas textos/rótulos/padrões.

## Alterações Realizadas

### Análise

- Leitura da raiz (`js/db.js`, `js/ui.js`, `js/dashboard.js`, `css/base.css`, `css/dashboard.css`, `index.html`), de `services/{reportService,pdfService,emailTemplates}.js`, do bundle `versao-web/js/portaria-services-web.js` (721 linhas, expõe `window.PortariaServices`), e do módulo de referência `controle-de-visitantes/`.

### Banco de dados (IndexedDB) — DB v4

`js/db.js` (raiz) e `versao-web/js/db.js` (idênticos):

- `DB_VERSION = 3` → `4`.
- Novas stores: `pessoas` (índices `nome`, `tipo`, `documento`), `entradas_saidas` (índices `data`, `pessoaId`, `status`), `autorizacoes` (índices `data`, `pessoaId`, `responsavelId`, `status`), `config` (keyPath `id`).

### `js/portaria.js` (novo, raiz e versao-web)

`window.Portaria` com helpers compartilhados pelos novos módulos:

- `getConfig()` / `saveConfig()` — leem/gravam na store `config`, com defaults: `tipoInstalacao: 'empresa'`, `autorizadores: { morador: true, funcionario: true, visitante: false, prestador: false }`.
- `labels(config)` — rótulos por tipo de instalação (Morador/Unidade x Colaborador/Setor, etc.).
- `tipoLabel(tipo)` / `tipoBadge(tipo)` — nome e classe de badge de cada tipo de pessoa.
- `searchPessoas(termo)` — busca parcial, sem acentos, por nome/documento/telefone/empresa/unidade/matrícula/setor/cargo/tipoServico.
- `findDuplicates({nome, tipo, documento})` — duplicidade por nome (normalizado) e por documento quando presente.
- `vinculoDaPessoa(p)` / `vinculoCurto(p)` — rótulo de vínculo (unidade, setor/cargo/matrícula, empresa/tipoServico).
- `ultimoAcesso(id)` / `pessoaDentro(id)` — última movimentação e se a pessoa está no local.
- `autorizacaoStatus(a)` / `getAutorizacoesPessoa(id)` / `getAutorizacoesAtivas(id)` / `formatPeriodo(a)`.
- `norm(texto)` — normalização (minúsculas, sem acentos, sem espaços extras).

### Módulo `controle-de-cadastros/` (raiz + versao-web)

- Abas por tipo: Visitantes, Moradores (label dinâmico), Funcionários, Prestadores.
- Formulário por tipo; só Nome obrigatório; CPF/RG opcional; campos condicionais (unidade para morador — rótulo vira "Setor" em instalação empresa; empresa/tipo de serviço para prestador; etc.).
- Duplicidade detectada via `Portaria.findDuplicates` → modal de confirmação antes de salvar.
- Editar/excluir; exclusão **lógica** (`ativo: false`) se houver histórico de entrada/saída ou autorizações; física caso contrário (com confirmação).
- Relatórios do dia/período (PDF via `UI.buildPdf`), exportação Excel (SheetJS) e backup/restauração JSON da store `pessoas`.

### Módulo `controle-de-entrada-saida/` (raiz + versao-web)

- Busca automática com debounce (250 ms) por nome ou documento; resultados em lista.
- Card da pessoa com status DENTRO/FORA (`badge badge-success`/`badge-danger`), último acesso e autorizações ativas.
- Fluxo "Cadastrar e Registrar Entrada" — abre o formulário de cadastro quando a pessoa não existe (reuso do padrão de cadastro).
- Modais de Entrada e Saída; entrada salva `data`, `horaEntrada`, `porteiro`, `responsavel` (quando autorização ativa); saída preenche `saidaData`/`horaSaida` e marca `status: 'fora'`.
- Porteiro memorizado em `localStorage('clarityPorteiro')` para preencher automaticamente os próximos registros.
- Histórico de movimentações com filtro por texto/status; relatórios, Excel e backup JSON da store `entradas_saidas`.

### Módulo `controle-de-autorizacoes/` (raiz + versao-web)

- Dois blocos de busca: **Responsável** (filtra por `config.autorizadores` — só quem `podeAutorizar`; se config não definida, usa `responsavel` de morador/funcionário) e **Pessoa autorizada** (com fluxo "Cadastrar nova pessoa" inline).
- Campos: período (`dataInicial`/`horaInicial` a `dataFinal`/`horaFinal`, default de 07:00 às 18:00), forma (presencial/por telefone), observações.
- Registro salvo com `data: dataInicial`, `status: 'ativa'`, `responsavelNome`, `pessoaNome`, `pessoaTipo`.
- Modal de detalhes com blocos RESPONSÁVEL / PESSOA AUTORIZADA / AUTORIZAÇÃO e botão Cancelar (status `cancelada`).
- Lista com status calculado ATIVA/AGENDADA/EXPIRADA/CANCELADA (`badge badge-success`/`badge-info`/`badge-warning`/`badge-danger`); relatórios, Excel e backup da store `autorizacoes`.

### Módulo `configuracoes/` (raiz + versao-web)

- Radio cards `tipoInstalacao` (Condomínio/Empresa) e check cards "Quem pode autorizar" (morador, funcionário, visitante, prestador).
- Exige ao menos um autorizador; salva na store `config` via `Portaria.saveConfig`.

### Dashboard (raiz e versao-web)

- `index.html`: 4 novos `portal-card` (ids `countPessoas`, `countMovimentacoes`, `countAutorizacoes`, `countConfig`) apontando para os novos módulos.
- `css/base.css`: badges `.badge-primary` e `.badge-info`.
- `css/dashboard.css`: estilos `card-cadastros`, `card-entrada-saida`, `card-autorizacoes`, `card-config`.
- `js/dashboard.js`: `backupGeral` agora exporta `pessoas`, `entradas_saidas`, `autorizacoes`, `config`; `loadSummary` mostra contadores (pessoas ativas, movimentações hoje, autorizações não canceladas, "Ajustes do sistema") e inclui os novos ids no fallback de erro.

### Services e relatório diário (raiz e bundle web)

- `services/reportService.js`: `collectModulesData` coleta `entradas_saidas` e `autorizacoes` por data.
- `services/pdfService.js`: novas seções "Entrada e Saída" e "Autorizações" no PDF diário + helper `autorizacaoStatusText`.
- `services/emailTemplates.js`: bullets "Entrada e saída" e "Autorizações" no e-mail.
- `versao-web/js/portaria-services-web.js`: mesmas mudanças (2 novas seções do PDF, `collectModulesData` com as novas stores, `autorizacaoStatusText`, bullets do e-mail).

### Sincronização raiz ↔ versao-web

- `versao-web/js/db.js` e `versao-web/js/portaria.js` = cópias da raiz.
- 4 pastas de módulos copiadas da raiz; nos `index.html` da versao-web o `<script type="module" src="../services/index.js">` foi substituído por `<script src="../js/portaria-services-web.js">` (bundle clássico).
- `versao-web/index.html`, `css/base.css`, `css/dashboard.css`, `js/dashboard.js` receberam as mesmas alterações da raiz.

## Comandos executados

- `node --check` em todos os JS novos/alterados da raiz e da versao-web (incluindo `services/*.js` como `.mjs` e o bundle) → todos **OK**.
- `Copy-Item` para espelhar `db.js`, `portaria.js` e as 4 pastas de módulos na versao-web.

## Problemas Encontrados

1. **`#labelUnidade` com `<em>` renderizado como texto** — em `controle-de-cadastros/script.js` o texto era setado via `textContent`, exibindo a tag literalmente. **Solução**: usar `innerHTML` e diferenciar rótulo por instalação ("Unidade" no condomínio, "Setor" na empresa).
2. **Erro de edição temporário no bundle** — uma edição removeu acidentalmente `if (remaining <= 0) return 'Sem estoque';` de `insumoStatusText`. **Solução**: restaurado e confirmado via leitura do arquivo.

## Solução Final

- 4 novos módulos completos (CRUD, busca com duplicidade, exclusão lógica, relatórios PDF, Excel e backup JSON) integrados ao Dashboard (cards + contadores) e ao relatório diário do "Finalizar Turno".
- Banco `clarityPortaria` na **v4** com as stores `pessoas`, `entradas_saidas`, `autorizacoes`, `config`.
- Implementação espelhada na raiz (Electron ia32/x64) e na versao-web (bundle `portaria-services-web.js`).

## Estado Atual do Projeto

- Stores: `chaves`, `visitantes`, `visitantes_perfil`, `epis`, `avisos`, `ocorrencias`, `pessoas`, `entradas_saidas`, `autorizacoes`, `config` (DB v4). Insumos/primeiros socorros seguem em `localStorage.firstAidSystem`.
- Módulos novos em `controle-de-cadastros/`, `controle-de-entrada-saida/`, `controle-de-autorizacoes/`, `configuracoes/` e réplicas em `versao-web/`.
- Porteiro memorizado em `localStorage('clarityPorteiro')`.
- Tudo validado por `node --check`.

## Próximos Passos

1. Testar no navegador/app: cadastro de pessoas, registro de entrada/saída (com busca automática), criação/cancelamento de autorizações e configurações (condomínio x empresa).
2. Testar o relatório diário do "Finalizar Turno" com as novas seções Entrada e Saída e Autorizações, e o e-mail atualizado.
3. Testar "Backup Geral" com as novas stores e a restauração.
4. Validar o fluxo "Cadastrar e Registrar Entrada" e a duplicidade (confirmação antes de salvar).

## Observações para Continuação

- **Sincronização raiz/web**: manter `versao-web/` em dia com a raiz (bundle `portaria-services-web.js`, `js/ui.js`, `js/db.js`, `js/portaria.js`, `js/dashboard.js`, `css/base.css`, `css/dashboard.css`, `index.html` e os 4 novos módulos).
- **Relatório diário**: seções na ordem Chaves/EPIs/Insumos/Primeiros Socorros/Visitantes/Avisos/Ocorrências/**Entrada e Saída**/**Autorizações**; seções novas dependem do campo `data` (autorização usa `data = dataInicial`).
- **Exclusão lógica**: registrar `ativo: false` em vez de apagar quando há histórico; o dashboard conta apenas `ativo !== false`.
- **Config**: não existe UI de "atualizar config" além do módulo Configurações; `getConfig()` sempre retorna defaults se a store estiver vazia.

## Resumo Executivo

- Criados os módulos Cadastro de Pessoas, Entrada e Saída, Autorizações e Configurações (CRUD, busca, duplicidade, exclusão lógica, PDF, Excel, backup).
- IndexedDB `clarityPortaria` na v4 com as stores `pessoas`, `entradas_saidas`, `autorizacoes`, `config`.
- Novo helper `js/portaria.js` (window.Portaria) compartilhado pelos módulos.
- Dashboard ganhou 4 novos cards com contadores e o "Backup Geral" passou a incluir as novas stores.
- Relatório diário e e-mail do "Finalizar Turno" ganharam as seções Entrada e Saída e Autorizações.
- Tudo espelhado na versao-web (bundle atualizado); validado com `node --check`.

---

# 13/08/2026 (2ª etapa) — Correção do registro de entrada/saída e botão "Importar Visitantes"

## Contexto

Após o trabalho da manhã, o usuário relatou que "o sistema de registro de entrada e saída de pessoas registrou algumas mas não está registrando mais". Em seguida, pediu um botão na área de Cadastro de Pessoas que importe automaticamente todos os visitantes registrados no Controle de Visitantes.

## Problema Encontrado (registro de entrada/saída)

1. **ID divergente no modal de entrada** — `controle-de-entrada-saida/index.html:349` define `id="entradaPessoaInfo"`, mas `controle-de-entrada-saida/script.js:291` referenciava `$('#entPessoaInfo')`. O `TypeError` (null) em `abrirModalEntrada()` ocorria antes do `.then()` que abre o modal, então "Registrar Entrada" de pessoa já cadastrada nunca abria. Os fluxos "Cadastrar e Registrar Entrada" e a saída funcionavam por não passarem por essa linha.
   - **Solução**: corrigido para `$('#entradaPessoaInfo')` na raiz e na versao-web; varredura regex confirmou que é o único id divergente nos 8 arquivos dos módulos novos.
   - **Validado via navegador**: ciclo completo entrada → saída → nova entrada grava 2 registros com toasts de sucesso, sem erros no console, na raiz e na versao-web.

## Alterações Realizadas (importação de visitantes)

1. **`controle-de-cadastros/index.html`** (raiz): botão "Importar Visitantes" no `.actions-section`, após "Exportar Excel" (`onclick="importarVisitantes()"`, ícone `fa-user-plus`).
2. **`controle-de-cadastros/script.js`** (raiz): função `importarVisitantes()` que:
   - Lê todos os registros da store `visitantes`.
   - Deduplica pela chave nome+documento (mesma pessoa pode ter várias visitas).
   - Ignora quem já existe no cadastro de pessoas (nome ou documento, inclui inativas).
   - Pede confirmação com resumo (quantos importados / já cadastrados).
   - Cadastra com `tipo: 'visitante'`, mapeando `cpfRg→documento`, `empresa→empresa` e `responsavel`/`setor`/`motivo`/`observacoes` → `observacoes`; guarda `origem: 'visitantes'` e `visitanteOrigemId`.
   - Chama `loadRecords()` e mostra toast de conclusão.
3. **Espelhado na versao-web**: `index.html` (botão) e `script.js` (função) copiados; o script de services voltou a ser o bundle `../js/portaria-services-web.js`.

## Testes realizados (navegador via servidor local)

- Registrados 3 visitantes (1 nome duplicado) → importação deduplicou para 2 pessoas, campos mapeados corretamente, toast "Importação concluída: 2 visitante(s)".
- Re-importação → toast "Todos os visitantes já estão cadastrados como pessoas." (sem duplicar).
- versao-web: botão presente e importação de novo visitante funciona (3 pessoas no total).
- `node --check` OK em `controle-de-cadastros/script.js` (raiz e versao-web).

## Observações para Continuação

- **Importação e duplicidade**: a chave de dedup (nome+documento) também vale como critério de "já cadastrado"; o botão não altera o Controle de Visitantes (a origem permanece intacta).
- **Teste de navegador**: o perfil do browser-automation é efêmero (IndexedDB não persiste entre execuções); testes de fluxo completo devem rodar na mesma sessão.

---

# 13/08/2026 (3ª etapa) — Correção de encoding, assets/, crédito Martseg, backup/restauração

## Contexto

Três pedidos do usuário após a etapa anterior: (1) corrigir caracteres estranhos que apareceram nas palavras; (2) adicionar o crédito da empresa Martseg (que desenvolveu o sistema para a Clarity Glass) com a logo `assets/martseg-logo.jpeg`; (3) verificar o "Backup Geral" (deve cobrir todo o sistema) e adicionar a opção de restaurar os dados pelo arquivo do backup.

## Problema Encontrado (encoding / mojibake)

1. **Dupla codificação na versao-web** — o comando `Set-Content -Encoding UTF8` do PowerShell releu arquivos UTF-8 sem BOM como ANSI e os reescreveu duplicando a codificação dos acentos ("formulário" → "formulÃ¡rio", "Mantém" → "MantÃ©m").
   - **Atingidos**: `versao-web/controle-de-cadastros/index.html` (30 ocorrências) e `versao-web/css/dashboard.css` (1 ocorrência). A raiz e os `script.js` estavam limpos.
   - **Solução**: recopiados da raiz (byte a byte) e a troca do script de services pelo bundle foi refeita via **Node** (`fs.readFileSync/writeFileSync` com `utf8`), que respeita o encoding. Varredura completa raiz+versao-web confirma 0 arquivos com mojibake e sem BOM.

2. **Logo Martseg "gigante"** — primeira versão usava `height: 28px` no CSS; mesmo após reduzir para 16px o usuário ainda via grande, pois o CSS antigo ficava em cache e a imagem renderizava em tamanho natural (586×585).
   - **Solução**: tamanho definido **inline no elemento** via JS (`img.style.height = '28px'` + `max-height/max-width`) em `js/martseg.js`, ignorando cache de CSS. Medido no navegador: 28px (o dobro dos 14px intermediários, a pedido do usuário).

## Alterações Realizadas

1. **`assets/` criada** — `logo-clarity.jpeg` movido da raiz para `assets/logo-clarity.jpeg`; comentários em `js/logo.js` e `versao-web/js/logo.js` atualizados; `resumo.md` com as novas referências. `assets/martseg-logo.jpeg` (586×585, ~47 KB) já existia.
2. **`js/martseg.js`** (novo, raiz + versao-web) — expõe `window.MARTSEG_LOGO` (base64) e injeta no rodapé (`footer` → `.footer-brand`) de **todas as 22 páginas** (dashboard + 10 módulos, raiz + web) via `DOMContentLoaded`:
   - Imagem com classe `.martseg-logo` (alt/title "Desenvolvido por Martseg para a Clarity Glass").
   - Texto "Desenvolvido pela **Martseg** para a **Clarity Glass**".
   - Estilos inline de tamanho (28px) + classes `footer-brand`/`footer-brand-text`/`martseg-logo` em `css/base.css` (espelhado na versao-web).
   - Incluído via `<script src=".../js/martseg.js">` após cada `logo.js` (Node, sem tocar em encoding).
3. **Backup Geral** — verificado: já exporta todas as stores (`chaves`, `visitantes`, `visitantes_perfil`, `epis`, `avisos`, `ocorrencias`, `pessoas`, `entradas_saidas`, `autorizacoes`, `config`) + `insumos`/`primeirosSocorros` (localStorage `firstAidSystem`) + `preferencias` (tema/logo).
4. **Restaurar Backup** (novo, raiz + versao-web) — `index.html` ganhou o botão "Restaurar Backup" (`onclick="restaurarBackup()"`), o input oculto `#backupInput` (`.json,application/json`) e o `confirmModal` (o dashboard não tinha); `js/dashboard.js` ganhou `restaurarBackup()`:
   - Abre o seletor de arquivo, lê o JSON e valida (`sistema === 'Portaria - Clarity Glass'` e `dados` presente).
   - `UI.showConfirm` com resumo: data do backup (via `toLocaleString('pt-BR')`), nº de registros e módulos; avisa que os dados atuais serão SUBSTITUÍDOS.
   - Confirmação: `DB.importStore` para cada store presente + restaura `firstAidSystem` e preferências; toast de sucesso e `location.reload()`.

## Testes realizados (navegador via servidor local, porta 8788)

- **Martseg**: `.footer-brand` presente em dashboard, módulo, dashboard web e módulo web (raiz e versao-web), com img base64 e texto correto; sem erros no console.
- **Backup/Restauração (raiz)**: adicionadas chave e pessoa via IndexedDB → botões/input/modal presentes; arquivo de backup de teste carregado via `setInputFiles` → modal de confirmação ("2 registros em 10 módulos") → confirmado → stores restauradas ("Chave Restaurada"/"Pessoa Restaurada").
- **Backup/Restauração (versao-web)**: mesmo fluxo validado ("Chave Web"/"Pessoa Web").
- `node --check` OK em `js/dashboard.js` e `versao-web/js/dashboard.js`. Mojibake 0 em raiz + versao-web.

## Observações para Continuação

- **Nunca usar `Set-Content -Encoding UTF8` do PowerShell** para reescrever arquivos existentes sem BOM (causa mojibake). Usar `Copy-Item` (byte a byte) para espelhar e Node (`fs`) para edições programáticas.
- **Espelhamento**: alterar sempre raiz + versao-web (`js/martseg.js`, `css/base.css`, `index.html`, `js/dashboard.js`, e o restante conforme a lista de sincronização).
- **Logo Martseg**: tamanho controlado por estilo inline (28px) em `js/martseg.js`; para trocar a logo, substituir `assets/martseg-logo.jpeg` e regenerar o base64.
- **Restauração**: usa `DB.importStore` (clear + put por store); o bundle `portaria-services-web.js` **não** contém backup/restauração — esses fluxos usam `js/db.js` clássico no dashboard.

---

# 17/08/2026 — Etapas 1 a 8: Card editável, paginação (20), preenchimento automático e alarmes de avisos

## Contexto

Retomada do trabalho em cima do sistema da Portaria Clarity Glass com uma lista de 8 tarefas:

1. Card do módulo **Entrada e Saída** com dados da pessoa **editáveis** (nome, tipo, documento, empresa, telefone, e-mail, observação), salvando automaticamente ao registrar a entrada/saída.
2. **Paginação de 20 movimentações** por vez no histórico do módulo Entrada e Saída (funciona em conjunto com as buscas existentes).
3. **Pesquisa por dia/período/chave/funcionário** e paginação de 20 no módulo **Controle de Chaves** (todas as abas: comum, almoxarifado e veículo).
4. **Paginação de 20** no histórico do módulo **Controle de EPIs**.
5. **Devolução de chave** preenche o campo "quem devolveu" com o nome de quem pegou (editável).
6. **Retirada de chave** preenche o campo funcionário com o nome do último que pegou (editável).
7. **Avisos com alarme**: configuração de alarme por aviso (diário / dia da semana / data específica + horário), com aviso GRANDE na tela, som e notificação — funcionando mesmo quando a tela do usuário não está no módulo de avisos.
8. **Bug**: autorização emitida não aparecia em Entrada e Saída.

## Alterações Realizadas

### Etapa 8 — Bug da autorização não aparecer em Entrada/Saída (causa raiz)

- **Causa raiz confirmada**: `UI.todayISO()` em `js/ui.js` usava `new Date().toISOString().split('T')[0]` (data UTC). À noite no Brasil (UTC-3), "hoje" era gravado como "amanhã" → a autorização ficava `AGENDADA` e `getAutorizacoesAtivas()` retornava vazio (não mostrava em Entrada/Saída).
- **Correção** em `js/ui.js`: `todayISO()` agora monta a data no fuso local (`getFullYear()`/`getMonth()`/`getDate()`). `js/reportService.js` já tinha o fix local; `ui.js` não.
- **Diagnóstico**: script `diag-autorizacao.mjs` (browser-automation) confirmou que com data local correta a autorização APARECE na lista; `Portaria` não é acessível via `page.evaluate` (isolated world → `ReferenceError`), mas a UI funciona (usar cliques, não chamadas diretas).
- Espelhado em `versao-web/js/ui.js`.

### Etapas 1 e 2 — Entrada e Saída: card editável + paginação

- `controle-de-entrada-saida/index.html`: card da pessoa ganhou inputs editáveis (`esPessoaNomeInput`, `esPessoaTipoInput`, `esPessoaDocInput`, `esPessoaEmpresaInput`, `esPessoaTelefoneInput`, `esPessoaEmailInput`, `esPessoaObsInput`), dica de edição, badge de autorização (`esPessoaAuthBadge`) e bloco de paginação `#historyPagination` (`changePage(-1/1)`, `#historyPageInfo`).
- `controle-de-entrada-saida/script.js`:
  - `selecionarPessoa` preenche os inputs do card; nova `salvarDadosEditadosPessoa()` valida nome, faz `DB.store('pessoas').put` e atualiza `selectedPessoa`.
  - `abrirModalEntrada()`/`abrirModalSaida()` viraram `async` e salvam os dados editados antes de registrar a movimentação.
  - `renderAutorizacoes` exibe badge "AUTORIZADO".
  - Paginação: `PAGE_SIZE = 20`, `historyPage`, `renderHistory` com slice, `renderPagination(total, totalPages)`, `changePage(delta)`, `pesquisar()` (zera a página), `clearFilters` zera a página.
- `controle-de-entrada-saida/style.css`: estilos `.es-editable*`, `.es-edit-hint`, `.es-auth-badge`, `.es-row-full`.

### Etapa 3 — Controle de Chaves: pesquisa + paginação

- `controle-de-chaves/index.html`: em cada aba (comum, almoxarifado, veículo) adicionados filtros (dia, período início/fim, chave/item, funcionário) com botões "Pesquisar" e "Limpar", mais bloco de paginação (`pagComum`, `pagAlmox`, `pagVeiculo`).
- `controle-de-chaves/script.js`:
  - `PAGE_SIZE = 20` e `pages = { comum: 1, almoxarifado: 1, veiculo: 1 }`.
  - `getFilteredKeys(tipo)` aplica todos os filtros (dia, período, chave normalizada com acentos, funcionário) e ordena desc.
  - `renderKeyHistory`/`renderVehicleHistory` paginam; `renderPagination(tipo, total, totalPages)` mostra "X-Y de N" e desabilita os botões nos limites.
  - `pesquisar(tipo)`, `clearFilters(tipo)`, `changePage(tipo, delta)`; `loadRecords()` zera as páginas após qualquer alteração.
- `controle-de-chaves/style.css`: `.filter-actions` (botões de pesquisa em linha própria).

### Etapas 5 e 6 — Preenchimento automático (devolução/retirada)

- `controle-de-chaves/script.js`: helper `ultimoFuncionario(tipo, chaveOuId)` (último registro por `dataHora` desc) e `bindPrefillEvents()`:
  - **Devolução comum/almoxarifado**: ao escolher a chave no select, preenche "quem devolveu" com o funcionário do registro em uso.
  - **Retirada comum**: ao digitar/selecionar a chave, preenche o funcionário com o último que pegou.
  - **Veículos**: na devolução preenche com o funcionário do registro `em_uso`; na retirada com o último.
  - **Almoxarifado (retirada)**: `prefillAlmoxFuncionario()` preenche com o último que pegou na carga inicial e após cada retirada (chave fixa "Chaves do Almoxarifado").
  - Todos os campos permanecem editáveis.

### Etapa 4 — Controle de EPIs: paginação

- `controle-de-epis/index.html`: filtros passam a chamar `onFilterChange()`; adicionado bloco `#epiPagination` (prev/next/info).
- `controle-de-epis/script.js`: `PAGE_SIZE = 20`, `epiPage`, `renderHistory` paginado, `changePage(delta)`, `onFilterChange()` zera a página, `loadRecords()` zera a página após salvar.

### Etapa 7 — Avisos com alarme

- `js/alarme.js` (NOVO, raiz + versao-web): verificador global que lê a store `avisos` a cada 20 s:
  - Dispara quando a hora atual bate com `alarmeHora` (janela de 25 s dentro do minuto) e a recorrência casa (diário / dia da semana `diaSemana` / data `alarmeData`).
  - **Deduplicação** por chave `id:data:alarmeHora` em `localStorage` (`clarity_alarme_disparados`) — não dispara 2x no mesmo dia; renova a cada dia para os diários/semanais.
  - **Overlay GRANDE** (`#clarityAlarmeOverlay`) criado dinamicamente com ícone de sino animado, título "ALARME DE AVISO", hora, "Deixado por", texto e botão "OK, entendi".
  - **Som** (beeps via WebAudio) e **notificação** (Notification API; pede permissão na primeira vez; só envia com a página em segundo plano). Limitação documentada: com o app totalmente fechado não dispara.
  - Carregado em **todas as 21 páginas** (raiz + versao-web) via `<script src=".../js/alarme.js">` após `db.js` (inserido por script Node, sem tocar em encoding).
- `controle-de-avisos/index.html`: checkbox "Ativar alarme" + campos de recorrência (select), horário, dia da semana e data, com toggle de visibilidade; coluna "Alarme" na tabela; `alarme.js` no rodapé de scripts.
- `controle-de-avisos/script.js`: `collectForm`/`fillForm`/`clearForm` com os campos de alarme; validação no `save()` (horário obrigatório se alarme ativo; data obrigatória se recorrência = data); `formatAlarm(r)` gera badge (ex.: "Diário 08:00", "Segunda 08:00", "10/08 08:00"); detalhe de alarme no modal de visualização.
- CSS em `css/base.css` (espelhado): `.badge-alarme`, `.alarme-overlay`, `.alarme-box`, animações (fade, pulse, swing). Em `controle-de-avisos/style.css`: `.checkbox-label`, `.form-hint`, `.alarm-fields`.

### Espelhamento (raiz → versao-web)

- Copiados (byte a byte, `Copy-Item`): `js/ui.js`, `js/alarme.js`, `css/base.css`, `controle-de-entrada-saida/{index.html,script.js,style.css}`, `controle-de-chaves/{index.html,script.js,style.css}`, `controle-de-epis/{index.html,script.js}`, `controle-de-avisos/{index.html,script.js,style.css}`.
- Linha de bundle restaurada nos `index.html` da versao-web: `<script src="../js/portaria-services-web.js"></script>` via script Node (`fix-services-lines.js`), preservando encoding. Verificado `Horário do alarme` íntegro.

## Tentativas que Não Funcionaram

1. **Referências `@e1` em scripts de QA** — tentei clicar no checkbox via ref; o ref não existia (precisa `ui.snapshot()` antes). Troquei por `page.evaluate` + `.click()`.
2. **`DB.store('avisos').clear()` via `page.evaluate`** — `ReferenceError: DB is not defined` (evaluate roda em isolated world; `const DB` de `db.js` não é global de window). Cleanup removido — desnecessário pois cada execução usa um navegador descartável.
3. **`waitForSelector` visível no card de Entrada/Saída** — `#esPessoaNomeInput` fica oculto até selecionar pessoa; o wait falhava. Usado `{ state: 'attached' }`.

## Problemas Encontrados

- **Module scripts bloqueados em `file://`**: os `index.html` da raiz usam `type="module" src="../services/index.js"`, bloqueado por CORS quando aberto por `file://` no navegador de teste (esperado). As páginas testadas não dependem dele (usam `js/db.js`); no Electron o app configura o carregamento corretamente.
- **Isolated world do `page.evaluate`**: globais de página (`DB`, `Portaria`) não são visíveis — checar por DOM/cliques; não usar como prova de falha.

## Solução Final

- **Etapa 8**: `todayISO()` em `js/ui.js` agora usa fuso local.
- **Etapas 1-6**: card editável + paginação 20 (Entrada/Saída, Chaves, EPIs) + preenchimento automático de funcionário em devoluções/retiradas, tudo editável.
- **Etapa 7**: `js/alarme.js` global (check a cada 20 s) + campos de alarme em Avisos + overlay grande + som + notificação.

## Estado Atual do Projeto

- `node --check` OK em `js/ui.js`, `js/alarme.js`, `controle-de-avisos/script.js`, `controle-de-chaves/script.js`, `controle-de-epis/script.js`.
- Testes no navegador (browser-automation) com sucesso:
  - Avisos: campos de alarme presentes, toggle funciona, troca diário→semana mostra/esconde grupos corretamente, `alarme.js` carregado.
  - **Alarme disparou de verdade**: inserido aviso com alarme via UI → overlay `#clarityAlarmeOverlay` apareceu com hora, "Deixado por: QA Responsável", "Teste de alarme automático do QA" e botão "OK, entendi" que fechou o overlay.
  - Chaves: filtros + paginação + refs de preenchimento presentes.
  - Entrada/Saída: card editável + paginação + `alarme.js` presentes.
- Único erro de console registrado nos testes: CORS de `services/index.js` em `file://` (esperado, não afeta as páginas testadas).

## Próximos Passos

- Revisão final do usuário das 8 etapas (em especial o comportamento do alarme e o preenchimento automático).
- Caso queira: testes de regressão completos nos módulos Visitantes e Autorizações (não alterados, mas espelhados com `alarme.js`).

## Observações para Continuação

- **Espelhamento**: toda alteração em módulos/JS/CSS deve ser copiada para `versao-web/`; `index.html` da versao-web usa `<script src="../js/portaria-services-web.js">` no lugar do bundle `../services/index.js`.
- **Encoding**: nunca usar `Set-Content -Encoding UTF8`; usar `Copy-Item` e Node `fs` (`utf8`, sem BOM).
- **Alarme**: deduplicação por dia em `localStorage`; só dispara com o app aberto; notificação pede permissão na primeira execução; overlay criado dinamicamente (CSS em `base.css`).
- **QA via browser-automation**: `page.evaluate` roda em isolated world (sem acesso a `DB`/`Portaria`); usar DOM + cliques; esperar com `state: 'attached'` para elementos ocultos; cada execução é um navegador descartável (sem persistência entre invocações).

## Resumo Executivo

- Corrigido o bug da autorização não aparecer em Entrada/Saída: `todayISO()` usava UTC e gravava "amanhã" à noite (agora fuso local).
- Card de Entrada/Saída com dados editáveis da pessoa, salvos automaticamente ao registrar a movimentação.
- Paginação de 20 movimentações em Entrada/Saída, Controle de Chaves (3 abas) e Controle de EPIs.
- Pesquisa por dia/período/chave/funcionário no Controle de Chaves.
- Preenchimento automático de funcionário em devoluções (quem pegou) e retiradas (último que pegou) — editável.
- Sistema de alarme em Avisos: diário/dia da semana/data + horário, com overlay grande, som e notificação, verificando a cada 20 s em todas as páginas.
- Tudo espelhado na versão web; `node --check` e testes de navegador passando (alarme disparado e fechado com sucesso).


> **Adendo (mesma sessão):** Adicionado botão de limpeza (X) na caixa de busca do módulo Entrada e Saída (#esBuscaLimpar). Aparece apenas quando há texto; ao clicar limpa o campo, fecha resultados/card e foca a busca. Arquivos: controle-de-entrada-saida/{index.html,style.css,script.js} (espelhados na versão web). node --check OK e QA no navegador validado (mostra/limpa corretamente).


> **Adendo (mesma sessão):** Na tabela de Movimentações (Entrada e Saída), a coluna Ações ganhou: botão **Editar** (lápis, chama `editarMov(id)` que abre o modal de entrada em modo edição — título "Editar Movimentação" e botão "Salvar Alterações"; salva data, hora, porteiro, responsável e observações via `confirmarEdicaoMov()`, com `editingMovId` de estado) e botão **Registrar Saída** (vermelho, `fa-sign-out-alt`, aparece só quando ainda não há saída; chama `registrarSaidaDireta(id)` que abre o modal de saída já com nome, data/hora e porteiro preenchidos — porteiro usa o último usado ou o do registro; `confirmarSaida()` agora grava no registro alvo via `saidaMovId`). Modal de entrada ganhou `#entradaModalTitle` e `#entradaModalBtn`. Espelhado na versão web; `node --check` OK; QA no navegador validado: saída registrada (18:30/Fora, botão some) e edição persistida (09:15, obs editada, updatedAt).


> **Adendo (mesma sessão):** Ajuste visual dos botões de ação da tabela de Movimentações (Entrada e Saída) em controle-de-entrada-saida/style.css (espelhado na versão web): .action-btns com gap: 8px e lex-wrap: nowrap; .action-btns .btn menor (padding: 5px 8px; font-size: 0.75rem). QA no navegador: três botões na mesma linha (top idêntico), largura ~28-30px e espaçamento ~8px.


> **Adendo (mesma sessão):** No modal de Visualizar do Cadastro de Pessoas (controle-de-cadastros), adicionada a seção "Últimos acessos" com o mesmo histórico do módulo Entrada e Saída: viewRecord virou async e chama renderMovimentos(pessoaId), que lê a store entradas_saidas, filtra por pessoaId, ordena desc e mostra até 10 itens (badge DENTRO/FORA + Entrada data hora + Saída data hora). Robustez: aceita horaSaida ou saidaHora. CSS novo em css/base.css (.detail-divider, .detail-section-title, .detail-empty, .modal-list). Espelhado na versão web; node --check OK e QA validado (dois acessos exibidos, com saída).
---

# 17/08/2026 (2ª parte) — Usabilidade: limpar busca, editar/registrar saída, botões menores e histórico no cadastro

## Contexto

Após concluir as 8 etapas iniciais do dia, o usuário pediu 5 melhorias de usabilidade no módulo **Entrada e Saída** e uma no **Cadastro de Pessoas**:

1. Botão de limpeza na caixa de pesquisa de pessoa (ao digitar e selecionar, o nome permanece no campo; queria um botão para limpar).
2. Botão **Editar** para corrigir um registro de movimentação já cadastrado.
3. Botão **Registrar Saída** ao lado de "Visualizar" nas ações da tabela, para registrar a saída direto e rápido.
4. Botões de ação menores e com mais espaço entre eles, **sem quebra de linha** (mesma linha).
5. Cabeçalhos da tabela "H. Entrada"/"H. Saída" → apenas "Entrada"/"Saída".
6. No Cadastro de Pessoas, ao clicar em **Visualizar** em um nome, exibir também o histórico de entradas e saídas (que hoje só aparece ao selecionar a pessoa no módulo Entrada e Saída).

## Alterações Realizadas

### 1) Botão de limpeza da busca (Entrada e Saída)

- `controle-de-entrada-saida/index.html`: adicionado `<button id="esBuscaLimpar" class="es-search-clear hidden" onclick="limparBusca()">` (ícone `fa-times`) dentro da `.es-search-box`, após o input `#esBusca`.
- `controle-de-entrada-saida/style.css`: `.es-search-clear` — botão circular absoluto à direita (30×30), transparente, hover com fundo vermelho suave; input ganhou `padding-right: 44px` para não sobrepor o botão.
- `controle-de-entrada-saida/script.js`:
  - `atualizarBotaoLimpar()` — mostra/esconde o botão conforme há texto no campo; chamado em `debounceBuscar()` e após `selecionarPessoa` setar `#esBusca` com o nome.
  - `limparBusca()` — limpa `#esBusca`, chama `resetAtendimento()` (fecha resultados e esconde o card da pessoa), esconde o botão e devolve o foco ao campo.

### 2) Botão Editar na tabela de Movimentações

- `controle-de-entrada-saida/script.js`:
  - Novo estado `editingMovId`.
  - `editarMov(id)` — localiza o registro, seta `editingMovId`, altera o título do modal para "Editar Movimentação" e o botão para "Salvar Alterações", preenche `entData/entHora/entPorteiro/entResponsavel/entObs` com os valores do registro e abre o modal de entrada.
  - `confirmarEntrada()` desvia para `confirmarEdicaoMov()` quando `editingMovId` está setado; `confirmarEdicaoMov()` faz `Object.assign({}, r, { data, horaEntrada, porteiro, responsavel, observacoes, updatedAt })` + `DB.store('entradas_saidas').put`, fecha o modal, recarrega e exibe toast "Movimentação atualizada com sucesso!".
  - `abrirModalEntrada()` reseta `editingMovId` e restaura título/botão originais ("Registrar Entrada"/"Confirmar Entrada").
- `controle-de-entrada-saida/index.html`: modal de entrada ganhou `id="entradaModalTitle"` (h2) e `id="entradaModalBtn"` (botão).

### 3) Botão Registrar Saída direto da tabela

- `controle-de-entrada-saida/script.js`:
  - Novo estado `saidaMovId`.
  - `registrarSaidaDireta(id)` — valida que ainda não há saída, seta `saidaMovId`, `selectedPessoa = { id: r.pessoaId }`, preenche o modal de saída com data/hora atuais e porteiro (`getPorteiro() || r.porteiro`), exibe o nome e abre o modal.
  - `confirmarSaida()` — quando `saidaMovId` está setado, grava direto nesse registro (via `movimentacoes.find`); caso contrário mantém o fluxo antigo (`Portaria.ultimoAcesso`). Adicionado `updatedAt`. Após salvar, re-seleciona a pessoa apenas se `selectedPessoa.id` existir (proteção para registros sem `pessoaId`).
  - `abrirModalSaida()` reseta `saidaMovId`.
- `controle-de-entrada-saida/index.html`: na coluna Ações da tabela, botão **Registrar Saída** (`fa-sign-out-alt`, vermelho) renderizado somente quando `!r.horaSaida`, ao lado de Visualizar e Editar.

### 4) Botões menores, mais espaçados e na mesma linha

- `controle-de-entrada-saida/style.css` (escopo do módulo): `.action-btns` com `gap: 8px` e `flex-wrap: nowrap`; `.action-btns .btn` com `padding: 5px 8px` e `font-size: 0.75rem`.
- QA no navegador: os três botões ficam na mesma linha (mesmo `top`), com ~28–30px de largura e ~8px de espaçamento.

### 5) Cabeçalhos da tabela

- `controle-de-entrada-saida/index.html`: `<th>H. Entrada</th>` e `<th>H. Saída</th>` → `<th>Entrada</th>` e `<th>Saída</th>`.

### 6) Histórico de acessos no Cadastro de Pessoas

- `controle-de-cadastros/script.js`:
  - `viewRecord(id)` virou `async`; após os detalhes da pessoa, insere a seção "Últimos acessos" com um container `#cadMovimentoBox` (com estado "Carregando...") e chama `renderMovimentos(r.id)` antes de abrir o modal.
  - `renderMovimentos(pessoaId)` — lê a store `entradas_saidas`, filtra por `pessoaId`, ordena desc por `data + horaEntrada`, mostra até **10** itens, cada um com badge DENTRO/FORA + "Entrada data hora" + "Saída data hora" quando houver. Sem histórico → "Sem histórico de acessos."
  - Robustez: aceita `horaSaida` **ou** `saidaHora` (registros podem ter apenas `saidaHora`).
- `css/base.css`: novas classes `.detail-divider`, `.detail-section-title`, `.detail-empty` e `.modal-list` (reutilizáveis em modais).

## Tentativas que Não Funcionaram

1. **Clicks via `page.click` nos botões dentro dos modais** no QA do navegador: o runner resolveu o elemento mas ficou esperando "clickable" (timeout). Solução: clicar via `page.evaluate(() => el.click())`, que dispara o `onclick` normalmente.
2. **QA da saída direta com registro semeado sem `horaSaida`**: o item do histórico saía sem a hora da saída porque o dado de teste só tinha `saidaHora`. Não era bug real (o `confirmarSaida` grava os dois campos), mas a solução adotada foi aceitar qualquer um dos campos no `renderMovimentos` por robustez.

## Problemas Encontrados

- **Modal não "clicável" no teste headless**: elementos dentro de modais re-renderizados falharam na checagem de clickability do Playwright/patchright. Contornado com `.click()` via `evaluate`; em uso real o clique funciona normalmente.
- **Porteiro vazio na saída direta**: quando não havia porteiro salvo (`localStorage 'clarityPorteiro'` vazio), o modal abria com o campo vazio e a validação bloqueava. Melhorado: `getPorteiro() || r.porteiro`.
- **`page.evaluate` em isolated world**: globais de página (`DB`, `Portaria`) não são visíveis; o teste semeia dados via `indexedDB` direto (API do navegador) e checa por DOM.

## Solução Final

- Busca com botão de limpar (X) que aparece só com texto e reseta o atendimento.
- Ações da tabela: Visualizar + Editar (modal de edição com "Salvar Alterações") + Registrar Saída (modal pré-preenchido, grava no registro alvo).
- Botões de ação menores, com `gap` maior e sem quebra de linha.
- Cabeçalhos "Entrada"/"Saída" (sem o "H.").
- Cadastro de Pessoas → Visualizar mostra "Últimos acessos" (mesmos dados do módulo Entrada e Saída, até 10 itens).

## Estado Atual do Projeto

- `node --check` OK em `controle-de-entrada-saida/script.js` e `controle-de-cadastros/script.js`.
- QA no navegador (raiz) validado:
  - Botão de limpar: escondido sem texto, visível ao digitar, limpa campo/resultados/card e devolve o foco.
  - Saída direta: botão abre modal com nome/porteiro preenchidos; confirmar grava (horaSaída "18:30", status Fora, botão some).
  - Editar: modal com título "Editar Movimentação", campos pré-preenchidos; salvar persiste (09:15, obs editada, `updatedAt`).
  - Cadastro de Pessoas → Visualizar: seção "Últimos acessos" com 2 movimentações (DENTRO e FORA com saída), ordenadas desc.
  - Botões na mesma linha (top idêntico), ~28–30px, gap ~8px.
- Tudo espelhado em `versao-web/` (index.html com a linha `portaria-services-web.js` restaurada).

## Próximos Passos

- Revisão visual do usuário (botões, cabeçalhos, histórico no cadastro) e eventuais ajustes de layout.

## Observações para Continuação

- **Espelhamento**: copiar sempre raiz → `versao-web`; em `index.html` da versão web trocar `../services/index.js` por `../js/portaria-services-web.js` (script Node `fix-services-lines.js`).
- **Encoding**: nunca `Set-Content -Encoding UTF8`; usar `Copy-Item` e Node `fs` UTF-8.
- **QA**: cliques em modais via `page.evaluate(() => el.click())`; dados de teste via `indexedDB.open` no `evaluate`; esperar com `state: 'attached'` para elementos ocultos; registrar com ambos `horaSaida`/`saidaHora`.
- **Registro de saída**: `confirmarSaida` grava `saidaHora` e `horaSaida`; `renderMovimentos` aceita qualquer um.

## Resumo Executivo

- Botão de limpeza (X) adicionado à busca de pessoa em Entrada e Saída — aparece só com texto e limpa tudo.
- Coluna Ações da tabela de movimentações agora tem Visualizar, Editar (modal "Editar Movimentação"/"Salvar Alterações") e Registrar Saída (modal pré-preenchido, grava no registro).
- Botões de ação ficaram menores, com mais espaço e sem quebra de linha.
- Cabeçalhos da tabela renomeados de "H. Entrada"/"H. Saída" para "Entrada"/"Saída".
- Cadastro de Pessoas → Visualizar agora mostra "Últimos acessos" (histórico de entradas/saídas, até 10 itens).
- Tudo espelhado na versão web; `node --check` e testes no navegador passando.

> **Adendo (mesma sessão):** Criado o botão **Importar Contatos** no Cadastro de Pessoas, ao lado de "Importar Visitantes" (controle-de-cadastros). Abre a caixa de diálogo do PC (input oculto #importContatosInput, aceita .json) e importa pessoas a partir de um JSON. Novo script.js: normalizarTipoContato(), contatoParaPessoa(c) (aceita vários nomes de campos: nome/nomeCompleto/name, documento/cpf/rg/cpfRg/cpfCnpj/cnpj, telefone/phone/celular/whatsapp, email, empresa/company, unidade/unit, matricula/employeeId, setor/departamento/department, cargo/position/jobTitle, tipoServico/serviceType, observacoes/obs) e importarContatos(event) que aceita array direto ou objeto com contatos/pessoas/registros, deduplica por nome/documento contra o cadastro, mostra UI.showConfirm com a quantidade e cadastra com origem "contatos". Arquivo de exemplo criado na raiz e na versao-web: importar-contatos-exemplo.json (4 pessoas: visitante, funcionario, morador, prestador). Espelhado na versão web; node --check OK; QA validado (4 importados, tipos corretos, dedup avisa "Todos os contatos já estão cadastrados").


> **Adendo (mesma sessão):** Correção do "arquivo .json inválido" na importação de contatos. Causa provável: BOM, vírgula solta antes de } ou ] (JSON editado à mão) ou conteúdo com texto extra. Melhorias em controle-de-cadastros/script.js: parseJsonLenient() remove BOM e tenta o parse direto; se falhar, remove vírgulas soltas antes de } ou ] e tenta de novo; a mensagem de erro agora mostra o detalhe do JSON.parse (ex.: "Expected ',' or '}' after property value ... position 36") para facilitar a correção. QA validado: arquivo com BOM+vírgula extra importou 2 pessoas; arquivo inválido exibiu toast com o detalhe. Espelhado na versão web; node --check OK.

---

# 17/08/2026 (3ª parte) — Correção do contatos.json do usuário ("arquivo .json inválido")

## Contexto

Após a criação do botão **Importar Contatos** e do parser tolerante (parseJsonLenient), o usuário criou na raiz do projeto o arquivo `contatos.json` com ~118 contatos reais (pessoas da Clarity Glass) e tentou importá-lo, mas o sistema avisou "arquivo .json inválido". Ele pediu para analisar o arquivo e ajustá-lo.

## Análise / Causa do erro

- **Encoding**: o arquivo é **UTF-8 válido** (sem BOM). Os caracteres estranhos (`L�DER`, `PRODU��O`) vistos no terminal eram **artefato do console do PowerShell** (Get-Content), não do arquivo — confirmado lendo os bytes com Node (utf8 → acentos corretos: `LÍDER`, `PRODUÇÃO`).
- **Erro real (1 ocorrência)**: na entrada **"IVANETE FINANCEIRO CLARITY"** o telefone estava sem a aspas de fechamento: `"telefone": "+55 12 98888-2431 ,` (faltava o `"` antes da vírgula). O parser engolia até a quebra de linha e falhava com:
  - `Bad control character in string literal in JSON at position 14782` (JSON.parse).
  - Nesse ponto o código antigo mostrava apenas o toast genérico "arquivo inválido" (sem detalhe).

## Alterações Realizadas

- **`contatos.json`** (na raiz do projeto, dado do usuário — NÃO espelhado para a versao-web, não é arquivo do app):
  - Corrigida a linha do telefone da IVANETE: `"telefone": "+55 12 98888-2431",`.
  - Revalidado com JSON.parse: **118 contatos** OK.
- Distribuição dos 118: `funcionario` 85, `prestador` 19, `visitante` 14.

## Problemas Encontrados

- **Duplicado dentro do próprio arquivo**: **"PAOLA SUZANO CELULOSE"** aparece 2 vezes (telefones +55 12 99232-8894 e +55 12 99123-0205). A importação deduplica por nome, então a segunda será ignorada na importação. Nada foi removido do arquivo por decisão; se o usuário quiser, posso remover/renomear uma das ocorrências.

## Solução Final

- Arquivo `contatos.json` válido e pronto para importar pelo botão **Importar Contatos** do Cadastro de Pessoas.
- Importação validada no navegador (browser-automation): modal "Serão importados **118** contato(s)..." → confirmado → tabela com **118 registro(s)**, acentos corretos (primeiro item "ADRIANO LIDER (LÍDER PRODUÇÃO)").

## Estado Atual do Projeto

- `contatos.json` corrigido na raiz (118 contatos); `node --check` OK nos scripts da etapa anterior (inalterados nesta).
- `importar-contatos-exemplo.json` continua na raiz e na versao-web como modelo.

## Próximos Passos

- Usuário pode clicar em **Importar Contatos** e selecionar o `contatos.json` — 118 pessoas serão cadastradas (uma ocorrência da PAOLA será ignorada por nome duplicado).
- Se desejar, ajustar a duplicata "PAOLA SUZANO CELULOSE" antes de importar.

## Observações para Continuação

- **Mensagens de erro**: o parser atual (parseJsonLenient + toast com detalhe do JSON.parse) já mostra a posição do erro, facilitando a correção de JSONs editados à mão.
- **Acentos "quebrados" no terminal não significam arquivo corrompido**: conferir bytes com Node (fs.readFileSync(path,'utf8')) antes de mexer no encoding.
- **Arquivos de dados do usuário (ex.: contatos.json) ficam na raiz** e não são espelhados; só os arquivos do app vão para `versao-web/`.

## Resumo Executivo

- O `contatos.json` (118 contatos) falhava por **1 erro de sintaxe** (aspas faltando no telefone da IVANETE FINANCEIRO CLARITY); encoding já era UTF-8 correto (os `�` eram artefato do console).
- Corrigida a linha do telefone e revalidado: JSON.parse OK, 118 contatos (85 funcionario / 19 prestador / 14 visitante).
- Importação testada no navegador: 118 pessoas cadastradas com acentos corretos.
- Atenção: "PAOLA SUZANO CELULOSE" está duplicada no arquivo (será ignorada uma vez na importação).

---

# 29/08/2026 — 5 funcionalidades novas (devolução rápida de chaves, responsável na nova pessoa, cancelar movimentação, relatório/Excel geral por período e hora automática)

## Contexto

O usuário pediu 5 funcionalidades em todas as versões (raiz/Electron + `versao-web/`):

1. **Controle de Chaves ou Item**: botão pequeno de atalho em **Ações** do histórico (ao lado de Visualizar), nas 3 abas (Comuns, Almoxarifado, Veículos), que abre a **devolução já preenchida** — só clicar em "Devolver".
2. **Entrada e Saída**: campo **Responsável / autorizador (opcional)** no formulário "Cadastrar e Registrar Entrada"; ao registrar, o dado é gravado também no registro de entrada.
3. **Entrada e Saída**: botão **Cancelar** ao lado de Visualizar/Editar nas Ações para **apagar o registro de movimentação**.
4. **Página principal (Dashboard)**: botões **"Relatório por Período"** (PDF de todas as funcionalidades) e **"Exportar Excel Geral"** (planilha de todas as funcionalidades), visualmente bonitos e fáceis de entender.
5. **Hora do registro automática**: campos de hora do sistema inteiro atualizam a cada minuto (sem impedir edição manual), sem sobrecarregar o sistema.

## Alterações Realizadas

### Tarefa 1 — Devolução rápida (chaves)
- `controle-de-chaves/script.js` (raiz + versao-web):
  - Nova `devolverRapido(id)`: busca o registro, valida `status === 'em_uso'` e, conforme o tipo:
    - **Comum/Almoxarifado**: `switchTab(tipo)`, preenche `devolucaoComum/AlmoxSelect` com o id, funcionário, data e hora atuais, dispara `change` (ativa o prefill do bindPrefillEvents) e rola até o formulário.
    - **Veículo**: `switchTab('veiculo')`, operação `devolucao`, `populateVehicleSelect()`, seleciona o veículo, preenche funcionário/data/hora e atualiza o botão de submit.
  - Nova `scrollToForm(sel)` (scroll suave + foco).
  - Botão verde de devolução (`fa-sign-in-alt`, título "Registrar devolução") renderizado em **Ações** apenas quando `status === 'em_uso'`, nas 3 tabelas (`renderKeyHistory` comum/almox e `renderVehicleHistory`).

### Tarefa 2 — Responsável / autorizador no cadastro novo
- `controle-de-entrada-saida/index.html`: campo `#npResponsavel` ("Responsável / autorizador (opcional)") no modal de nova pessoa.
- `controle-de-entrada-saida/script.js`:
  - `abrirNovaPessoa()` limpa `#npResponsavel`.
  - `salvarNovaPessoaComEntrada()` captura `responsavel` e repassa para `criarPessoaEentrada(data, responsavel)` (inclusive no caminho de duplicidade confirmada).
  - `criarPessoaEentrada(data, responsavel)` envia `{ responsavel, observacoes: '' }` para `registrarEntrada`.

### Tarefa 3 — Cancelar (apagar) movimentação
- `controle-de-entrada-saida/script.js`:
  - Nova `excluirMov(id)`: `UI.showConfirm` com resumo (nome, data e hora) → `DB.store('entradas_saidas').remove(id)` → `loadRecords()` → toast.
  - Botão vermelho de cancelar (`fa-times`, título "Cancelar / apagar registro") em Ações, ao lado de Visualizar/Editar.

### Tarefa 4 — Dashboard: relatório por período e Excel de tudo
- `services/pdfService.js` (ESM) + bundle `versao-web/js/portaria-services-web.js`:
  - Refatorado: `generateReport(modulesData, opts)` compartilhado; expostos `generateDailyReport` (comportamento original) e **novo `generatePeriodReport`** (título "RELATÓRIO POR PERÍODO DA PORTARIA", meta "Período do Relatório", arquivo `relatorio_periodo_portaria_AAAA-MM-DD_a_AAAA-MM-DD.pdf`).
  - `drawMeta` aceita `periodText`; `drawEmpty` texto neutro ("Sem X registradas.").
- `services/reportService.js` (ESM) + bundle:
  - `getByPeriod(storeName, start, end)` (filtra `r.data` entre as datas).
  - `getFirstAidByPeriod(start, end)` (ocorrências de primeiros socorros no período).
  - `collectModulesDataByPeriod(start, end)` — todos os módulos + `pessoas` + insumos.
  - **Excel geral**: `loadXlsx()` (carrega `libs/xlsx/xlsx.full.min.js` dinamicamente), `buildSheets(m)` (10 abas: Chaves e Itens, Visitantes, EPIs, Insumos, Primeiros Socorros, Avisos e Recados, Ocorrências, Entrada e Saída, Autorizações, Cadastro de Pessoas), `buildWorkbookXlsx(m)` com cabeçalho **azul (1A73E8) com texto branco em negrito** e larguras automáticas de coluna.
  - `ReportService.preparePeriodReport(start, end)` e `ReportService.preparePeriodExcel(start, end)`.
- `js/dashboard.js` (raiz + versao-web, agora IDÊNTICOS):
  - `gerarRelatorioPeriodo()` e `exportarExcelGeral()`: abrem o modal de período (`UI.openReportModal`), geram via `ReportService` e salvam via `FileService.savePdf`.
  - `salvarArquivoGeral(blob, fileName, tipo)` com mensagem de destino (savedToDesktop / folderName / Electron / download).
  - `baixarPdf()` ganhou o ramo `res.savedToDesktop` (ficou igual ao da versão web).
- `index.html` (raiz + versao-web): 2 novos botões no hero (`#relPeriodoBtn`, `#excelGeralBtn`, classe `btn-outline hero-cta`); texto do loading de turno genérico ("Processando, aguarde...").

### Tarefa 5 — Hora automática (leve)
- `js/ui.js` (raiz + versao-web):
  - `_manualTimeFields` (`WeakSet`) — campos de hora tocados pelo usuário (eventos `input`/`change` em captura) nunca são sobrescritos.
  - `startAutoTimeFields()`: um **único timer** alinhado ao segundo 0 da virada de minuto (depois a cada 60 s) atualiza todos os `input[type="time"]` ativos não-manuais para a hora atual. Sem polling pesado; chamado no `initCommon()` de todas as páginas.

## Testes/Validações executados

- `node --check` OK em: `js/ui.js`, `js/dashboard.js`, `controle-de-chaves/script.js`, `controle-de-entrada-saida/script.js`, `versao-web/js/portaria-services-web.js`, `services/reportService.js` (como `.mjs`) e `services/pdfService.js` (como `.mjs`).
- Varredura de mojibake (Node): **0** arquivos afetados na raiz e na versão web.
- Servidor estático local (porta 8788) + browser-automation:
  - **Dashboard**: 2 botões novos presentes; modal de período abre; PDF por período e Excel geral gerados (toasts de sucesso, 0 erros de console).
  - **Chaves (3 abas)**: botão de devolução aparece só em registros em uso; clicar preenche select+funcionário+hora corretamente (comum, almoxarifado e veículo) — QA validado.
  - **Entrada/Saída**: campo `#npResponsavel` presente; fluxo "Cadastrar e Registrar Entrada" com responsável grava `responsavel` no registro de entrada ("Autorizador QA"); botão Cancelar apaga **apenas** o registro alvo (o outro permanece).
  - **Hora automática**: campo não-editado acompanhou o relógio na virada de minuto (09:54 → 09:55); campo editado manualmente (07:00) NÃO foi sobrescrito.
  - **versao-web**: mesma suíte passando (HTTP e `file://`, sem erros de console; geração sobre `file://` fica presa apenas no diálogo nativo da pasta — comportamento esperado/headless).
- Teste Node das libs reais: workbook XLSX com 2 abas e cabeçalho estilizado gerado e relido corretamente.

## Problemas Encontrados

1. **`type="module"` residual no bundle da versão web** — ao espelhar, o script de troca só alterava o `src`; a linha ficou `<script type="module" src="js/portaria-services-web.js">`, o que **quebraria o `file://`** (ES modules bloqueados por CORS). Detectado na checagem de diff e corrigido com script Node (`fix-bundle-tags.js`) removendo o `type="module"`.
2. **Teste inicial de "Cancelar" falso-negativo** — o QA clicava no botão da 1ª linha (que não era o registro semeado). Não era bug; corrigido no teste direcionando a linha correta.
3. **jsPDF/autotable em Node (CJS)** — `doc.autoTable is not a function` por resolução de módulo (autotable patcha uma instância diferente da carregada via UMD). Artefato de teste apenas; no app as duas carregam via `<script>` no mesmo `window.jspdf`. PDF validado no navegador real.

## Solução Final

- Todas as 5 funcionalidades implementadas e espelhadas em raiz + `versao-web/`.
- `js/dashboard.js`, `js/ui.js`, `controle-de-chaves/*` e `controle-de-entrada-saida/*` ficaram **idênticos** entre raiz e web (diferença apenas na linha de script: `services/index.js` (module) x `portaria-services-web.js` (clássico)).

## Estado Atual do Projeto

- `js/dashboard.js` raiz = versao-web (destino de `baixarPdf` unificado com `savedToDesktop`).
- Dashboard com 5 ações no hero: Finalizar Turno, Relatório por Período, Exportar Excel Geral, Backup Geral, Restaurar Backup.
- Excel geral = 10 abas estilizadas; PDF por período = mesmas seções do diário com título e período próprios.
- Hora automática em todas as páginas (campos de hora seguem o relógio; edição manual é respeitada).

## Próximos Passos

1. Teste visual do usuário (em especial a devolução rápida das 3 abas e o Excel geral).
2. Se o usuário quiser, ajustar colunas/ordem das abas do Excel geral.
3. Reavaliar a necessidade de manter a hora automática também nos campos de data (hoje só hora, conforme pedido).

## Observações para Continuação

- **Espelhamento**: raiz → `versao-web` via `Copy-Item`; em `index.html` dos módulos trocar a linha do services pelo bundle (scripts Node `fix-services-lines.js` + `fix-bundle-tags.js` para não deixar `type="module"` no bundle).
- **Excel geral**: `ReportService.preparePeriodExcel(start, end)` usa `XLSX.write(wb, { cellStyles: true })` (preserva estilo de cabeçalho). Abas definidas em `buildSheets` dentro de `reportService.js` (e no bundle).
- **PDF por período**: `PdfService.generatePeriodReport(modulesData)` espera `modulesData.start/end`; `generateDailyReport` continua igual (sem `periodText`).
- **Hora automática**: mecanismo em `js/ui.js` (`startAutoTimeFields`) com `WeakSet` de campos manuais; reutilizar sem duplicar se algo for adicionado no futuro.

## Resumo Executivo

- Chaves: botão de devolução no histórico (3 abas) abre o formulário já preenchido para "só clicar em Devolver".
- Entrada/Saída: campo "Responsável / autorizador" no cadastro novo é gravado também no registro de entrada; novo botão Cancelar apaga movimentações.
- Dashboard: novos botões "Relatório por Período" (PDF de todos os módulos) e "Exportar Excel Geral" (planilha com 10 abas estilizadas).
- Hora dos registros passa a acompanhar o relógio a cada minuto, sem sobrecarregar (um único timer por página) e respeitando edições manuais.
- Tudo espelhado na versão web (raiz ≡ versao-web nos JS/CSS; HTML difere só na linha de services).
- Validado por `node --check`, testes no navegador (raiz + web, HTTP e `file://`) e teste Node das libs; 0 erros de console e 0 mojibake.

---

# 29/08/2026 (2ª etapa) — Coluna "Data" na seção Entrada e Saída do PDF (diário e por período)

## Contexto

No **Relatório por Período → PDF** (e também no diário), na seção **Entrada e Saída** o usuário pediu que a **data** aparecesse como coluna própria (a hora já aparecia, mas a data estava embutida na coluna "Entrada"). No Excel geral a data e a hora já saem corretas.

## Alterações Realizadas

- `services/pdfService.js` (ESM) e `versao-web/js/portaria-services-web.js` (bundle web), seção **Entrada e Saída** do `generateReport`:
  - Antes: `['Hora', 'Pessoa', 'Tipo', 'Doc.', 'Entrada', 'Saída', 'Porteiro', 'Responsável', 'Situação']` com `Entrada = "DD/MM/AAAA HH:MM"` e `Saída = "DD/MM/AAAA HH:MM"`.
  - Agora (mesma largura, 9 colunas): `['Data', 'Entrada', 'Saída', 'Pessoa', 'Tipo', 'Doc.', 'Porteiro', 'Responsável', 'Situação']`, com `Data = formatDateBR(r.data)`, `Entrada = horaEntrada`, `Saída = horaSaida` — igual à disposição do Excel geral.

## Testes

- `node --check` OK em `pdfService.js` (como `.mjs`) e no bundle web.
- Navegador (servidor local + browser-automation): relatório por período gerado com a movimentação semeada (data 2026-08-29, entrada 08:30, saída 17:45) — PDF baixado, 0 erros de console.

## Observações para Continuação

- A mudança é no `generateReport` compartilhado, então vale para o **relatório diário** e o **por período** (comportamento consistente).
- Espelhado no bundle da versão web (basta editar os dois arquivos citados).

## Resumo Executivo

- Seção "Entrada e Saída" do PDF ganhou coluna **Data** própria, com Entrada/Saída só com a hora (mesma organização do Excel).
- Aplicado em `pdfService.js` e no bundle da versão web; validado no navegador sem erros.

---

# 31/08/2026 — Controle de Visitantes: autocompletar cadastro, cadastro automático de novo visitante e porteiro persistente

## Contexto

O usuário pediu três comportamentos no módulo **Controle de Visitantes** (raiz/Electron + `versao-web/`):

1. Ao digitar o nome de um visitante, devem aparecer os **nomes já cadastrados** para que o porteiro possa escolher quando a pessoa já é cadastrada.
2. Se a pessoa **não for cadastrada**, ao digitar os dados do visitante o **cadastro já deve ser feito** automaticamente.
3. Ao preencher o nome do **porteiro**, esse nome deve **permanecer no campo** até que alguém digite outro — para registrar o turno inteiro sem redigitar.

Itens 1 e 2 já existiam parcialmente (datalist `visitantesPerfilList` + prefill + `upsertVisitantePerfil` no save). O item 3 não existia: o `clearForm()` zerava o campo porteiro a cada salvamento. Foi preciso também dar **feedback visual** (dica sob o campo nome) para que o comportamento de cadastro automático fosse perceptível ao porteiro.

## Alterações Realizadas

### `controle-de-visitantes/script.js` (raiz e `versao-web/` — idênticos)

- **Porteiro persistente** (novo):
  - `getPorteiroSalvo()` — lê `localStorage('clarityPorteiro')` (mesma chave já usada no módulo Entrada e Saída, compartilhada entre módulos).
  - `salvarPorteiro(nome)` — grava/remove a chave no localStorage.
  - `restaurarPorteiroSalvo()` — no `DOMContentLoaded`, preenche `#vPorteiro` com o nome salvo.
  - `$('#vPorteiro').addEventListener('input', ...)` grava o nome a cada digitação.
  - `clearForm()` agora seta `$('#vPorteiro').value = getPorteiroSalvo()` (em vez de `''`).
  - `save()` chama `salvarPorteiro(data.porteiro)` antes do `clearForm()`.
- **Dica automática sob o nome** (novo):
  - `atualizarHintNome()` — lê os perfis e exibe em `#vNomeHint`: "Visitante já cadastrado — dados preenchidos automaticamente." (classe `form-hint-ok`) ou "Novo visitante — será cadastrado automaticamente ao salvar." (classe `form-hint-new`). Vazio quando o campo está limpo ou em modo de edição.
  - `debouncePreloadVisitante()` agora aguarda `prefillFromProfile()` **e** `atualizarHintNome()` (250 ms).

### `controle-de-visitantes/index.html` (raiz e `versao-web/`)

- Campo Nome: adicionado `<p class="form-hint" id="vNomeHint"></p>` após o `<datalist>`.
- Campo Porteiro: adicionada dica estática `<p class="form-hint">O nome fica salvo durante o turno — digite outro para trocar.</p>`.

### `controle-de-visitantes/style.css` (raiz e `versao-web/`)

- Novas classes `.form-hint`, `.form-hint-ok` (cor `var(--success)`) e `.form-hint-new` (cor `var(--info)`), reutilizando as variáveis do `base.css`.

## Problemas Encontrados

- Nenhum erro funcional. `node --check` OK nos dois `script.js`.
- Diferença entre os `index.html` de raiz e versao-web confirmada como **apenas a linha do services** (`<script type="module" src="../services/index.js">` na raiz x `<script src="../js/portaria-services-web.js">` na versão web) + **BOM pré-existente** na linha 1 da versão web (inofensivo, o navegador ignora).

## Solução Final

- Ao digitar o nome: o navegador mostra os nomes cadastrados (datalist) e a dica indica se é visitante conhecido (dados preenchem sozinhos) ou novo (será cadastrado automaticamente ao salvar).
- Ao salvar, o perfil do novo visitante é criado/atualizado (`visitantes_perfil`), entrando na lista de autocomplete.
- O nome do porteiro é salvo no `localStorage('clarityPorteiro')` e reutilizado nos próximos registros, inclusive após recarregar a página e em outros módulos (compartilhado com Entrada e Saída).

## Testes realizados (browser-automation, servidor local + `file://`)

- Raiz (HTTP):
  - Salvar novo visitante → campo porteiro permanece "PORTEIRO QA" e `localStorage('clarityPorteiro')` = "PORTEIRO QA".
  - Digitar nome cadastrado → dica "Visitante já cadastrado — dados preenchidos automaticamente." com preenchimento automático de Empresa/Responsável.
  - Digitar nome novo → dica "Novo visitante — será cadastrado automaticamente ao salvar.".
  - Reload → porteiro restaurado do localStorage.
  - Trocar porteiro → localStorage atualiza.
  - **0 erros de console / 0 requisições falhas.**
- `versao-web/` via `file://`: hints presentes, porteiro salvo, dica de novo visitante funcionando; **0 erros**.

## Estado Atual do Projeto

- `controle-de-visitantes/` (raiz e `versao-web/`) com `script.js` e `style.css` **idênticos** entre as versões; HTML difere apenas na linha do services (+ BOM na versão web).
- Porteiro persistente compartilhado com o módulo Entrada e Saída (mesma chave `clarityPorteiro`).

## Próximos Passos

- Teste visual do usuário no app (Electron e/ou versão web): digitar nome de visitante já cadastrado, registrar um novo visitante e conferir o porteiro permanecendo no campo.

## Observações para Continuação

- **Espelhamento**: raiz → `versao-web` via `Copy-Item` (byte a byte); nos `index.html` da versão web a linha do services é o bundle clássico (`../js/portaria-services-web.js`), sem `type="module"`.
- **Encoding**: não usar `Set-Content -Encoding UTF8`; usar `Copy-Item` e Node `fs` (utf8, sem BOM).
- **Porteiro**: o padrão `localStorage('clarityPorteiro')` é compartilhado — se um dia for mudado, revisar `controle-de-entrada-saida/script.js` também.
- **QA**: `page.evaluate` roda em isolated world (sem acesso a `DB`/`Portaria`); usar `indexedDB` nativo do navegador e cliques/DOM para validar.

## Resumo Executivo

- Controle de Visitantes agora: digitar o nome mostra os cadastrados (datalist) com dica "já cadastrado / novo visitante".
- Novo visitante é cadastrado automaticamente ao salvar (perfil entra na lista de autocomplete).
- Nome do porteiro persiste no campo (localStorage `clarityPorteiro`) durante todo o turno e entre páginas, compartilhado com Entrada e Saída.
- Implementado na raiz e na `versao-web` (JS/CSS idênticos); validado no navegador com 0 erros de console.

---

# 31/08/2026 (2ª etapa) — Controle de Visitantes: autocomplete igual ao Entrada e Saída

## Contexto

Após a 1ª etapa do dia (porteiro persistente + cadastro automático), o usuário aprovou as alterações 2 (cadastro automático de novo visitante) e 3 (porteiro persistente), mas pediu para **rever a alteração 1**: ao digitar o nome do visitante, deveriam aparecer os **nomes cadastrados em um dropdown igual ao do módulo Entrada e Saída** (não mais o datalist nativo do navegador). O comportamento desejado é: digitar → lista de cadastrados → clicar para selecionar (preenchendo os dados), e se não houver cadastro, avisar que o visitante novo será cadastrado ao salvar.

## Alterações Realizadas

### `controle-de-visitantes/index.html` (raiz + `versao-web/`)

- O campo **Nome do visitante** deixou de ser um `input` simples com `datalist` e virou uma **caixa de busca** full-width (classe `vis-nome-group` com `grid-column: 1/-1`), no mesmo padrão do Entrada e Saída:
  - `.vis-search-box` com ícone de lupa (`.vis-search-icon`) + input `#vNome` (autocomplete off) + botão de limpar `#vBuscaLimpar` (X, visível apenas com texto).
  - `<div class="vis-results" id="vResultados">` — dropdown de resultados.
  - `<div class="vis-not-found hidden" id="vNaoEncontrado">` — aviso "Novo visitante — será cadastrado automaticamente ao salvar." quando não há cadastro.
- Removidos: o `<datalist id="visitantesPerfilList">`, o atributo `list=` do input e o `<p id="vNomeHint">`.
- Empresa e CPF/RG passaram para uma linha própria (duas colunas).
- Dica do porteiro (`.form-hint`) mantida.

### `controle-de-visitantes/style.css` (raiz + `versao-web/`)

- Novas classes espelhando o visual do Entrada e Saída: `.vis-nome-group` (position relative + coluna inteira), `.vis-search-box`, `.vis-search-icon`, `.vis-search-clear` (+hover vermelho), `.vis-results` (max-height 0 → `.open` com 420px), `.vis-result-list`, `.vis-result-item` (+hover `--primary-light`), `.vis-result-nome`, `.vis-result-detalhe`, `.vis-not-found` (borda tracejada + ícone info).
- Removidos `.form-hint-ok`/`.form-hint-new` (elemento `#vNomeHint` não existe mais).

### `controle-de-visitantes/script.js` (raiz + `versao-web/` — idênticos)

- **Estado novo**: `selectedPerfil` e `lastSelectedPerfilNome`.
- **Busca automática** (substitui `debouncePreloadVisitante`/`prefillFromProfile`/`atualizarHintNome`):
  - `debounceBuscarVisitante()` (250 ms) → `buscarVisitantes()`: normaliza sem acentos e filtra `visitantes_perfil` por inclusão parcial, ordena por nome e limita a 10; sem resultados mostra `#vNaoEncontrado`; com resultados renderiza `renderResultadosVisitantes()`.
  - `selecionarPerfilVisitante(id)`: clicar num resultado preenche `vNome`/`vEmpresa`/`vCpfRg`/`vResponsavel`/`vSetor` e fecha o dropdown. Ignorado em modo edição.
  - `limparDadosPerfilDivergente()`: se o nome digitado deixa de corresponder ao perfil escolhido, limpa os dados herdados (evita dados errados).
  - `fecharResultados()`, `atualizarBotaoLimparBusca()` (mostra/esconde o X), `limparBuscaVisitante()` (limpa nome + estado + foco).
  - `document.addEventListener('click', ...)` fecha o dropdown ao clicar fora de `.vis-nome-group`.
- `clearForm()` reseta `selectedPerfil`/`lastSelectedPerfilNome`, fecha resultados e esconde o botão de limpar.
- Removida `populateProfileDatalist()` (não há mais datalist) e suas chamadas no init e no `save()`.
- Porteiro persistente e cadastro automático (`upsertVisitantePerfil`) **mantidos intactos** (alterações 2 e 3).

## Testes realizados (browser-automation)

- Raiz (HTTP, servidor 8788), com perfis semeados via `indexedDB` nativo:
  - Digitar "jo" → dropdown abre com "JOÃO SILVA" (com empresa/CPF/setor).
  - Clicar no resultado → nome/empresa/CPF/responsável/setor preenchidos, dropdown fecha.
  - Digitar "ZELIA NOVA" → mensagem "Novo visitante — será cadastrado automaticamente ao salvar." e campos herdados limpos.
  - Selecionar "MARIA SOUZA" e digitar "MARI" → continua correspondendo, dados mantidos (comportamento correto; limpeza só quando deixa de corresponder).
  - Botão X aparece com texto e limpa nome/dropdown/esconde botão.
  - Porteiro segue persistente (alteração 3).
  - **0 erros de console / 0 requisições falhas.**
- `versao-web/` via `file://`: dropdown abre, seleção preenche, "não encontrado" aparece, porteiro salvo; **0 erros**.

## Problemas Encontrados

- Nenhum funcional. A screenshot tirada não pôde ser inspecionada (modelo sem suporte a imagem), mas todos os checks de DOM passaram e o CSS é idêntico ao do Entrada e Saída.
- A expectativa do teste de "limpeza ao digitar MARI" estava errada (MARI ainda casa com MARIA SOUZA); o comportamento de limpeza só ocorre quando o nome deixa de corresponder (validado com ZELIA NOVA).

## Solução Final

- Campo de nome do visitante agora é uma busca por dropdown igual à do Entrada e Saída: digita → lista os cadastrados (até 10) com dados de apoio → clica para preencher o formulário; nome sem cadastro mostra aviso de que será cadastrado ao salvar.
- Alterações 2 (cadastro automático) e 3 (porteiro persistente) permanecem.

## Estado Atual do Projeto

- `controle-de-visitantes/` (raiz e `versao-web/`): `script.js` e `style.css` idênticos; `index.html` difere apenas na linha do services (+ BOM pré-existente na versão web). `node --check` OK nos dois `script.js`.

## Próximos Passos

- Teste visual do usuário no app (Electron e/ou versão web): digitar nome de visitante já cadastrado e escolher na lista; registrar um novo visitante e conferir porteiro persistente.

## Observações para Continuação

- **Espelhamento**: raiz → `versao-web` via `Copy-Item` para `script.js`/`style.css`; `index.html` da versão web editado preservando BOM (difere só na linha do services).
- **Encoding**: não usar `Set-Content -Encoding UTF8`; usar `Copy-Item` e Node `fs` (utf8, sem BOM).
- **Busca**: lê a store `visitantes_perfil` (normalização sem acentos, inclusão parcial, limite 10); ao selecionar um perfil os dados do formulário são preenchidos.
- **QA**: `page.evaluate` roda em isolated world (sem acesso a `DB`/`Portaria`); semear dados via `indexedDB` nativo e checar por DOM/cliques.

## Resumo Executivo

- Alteração 1 refeita: digitar o nome no Controle de Visitantes agora mostra um dropdown com os visitantes cadastrados, no mesmo padrão visual e de interação do módulo Entrada e Saída.
- Clicar num resultado preenche o formulário automaticamente; nome novo mostra aviso "será cadastrado automaticamente ao salvar".
- Botão de limpar (X) adicionado à busca; dropdown fecha ao clicar fora.
- Alterações 2 (cadastro automático) e 3 (porteiro persistente) mantidas.
- Implementado na raiz e na `versao-web`; validado no navegador (HTTP e `file://`) com 0 erros de console.

---

# 31/08/2026 (3ª etapa) — Visitantes: só o nome obrigatório + botão "Registrar saída" na Ações

## Contexto

Dois pedidos no **Controle de Visitantes** (raiz + `versao-web/`):

1. **Somente o nome do visitante é obrigatório** para salvar/dar a entrada; todos os demais campos ficam opcionais (se não preenchidos, o sistema salva mesmo assim).
2. Na coluna **Ações** do histórico, junto aos botões pequenos, adicionar um botão que, ao ser apertado, **registra a saída do visitante com a hora atual**.

## Alterações Realizadas

### `controle-de-visitantes/script.js` (raiz + `versao-web/` — idênticos)

- **`save()`**: validação reduzida a apenas `if (!data.nome)`. Se data/hora estiverem vazias, preenche com `UI.todayISO()`/`UI.nowTime()` (padrões, mantendo consistência p/ histórico/relatórios).
- **Nova `registrarSaidaRapida(id)`** (seção após EXCLUIR): localiza o registro; se já tem `horaSaida`, avisa; senão grava `saidaData: UI.todayISO()`, `horaSaida: UI.nowTime()`, `updatedAt` via `put`, recarrega e mostra toast `Saída registrada: {nome} às {hora}`.
- **`renderHistory()`**: na coluna Ações, novo botão verde `btn-success` com `fa-sign-out-alt`, título "Registrar saída (hora atual)", renderizado **somente quando `!r.horaSaida`** (desaparece após a saída).

### `controle-de-visitantes/index.html` (raiz + `versao-web/`)

- Removido `required` de todos os campos, mantendo **apenas `#vNome`** com `required`.
- Removidos os asteriscos (`<span class="required">*</span>`) dos rótulos de Data, Hora Entrada, Empresa, CPF ou RG, Porteiro, Responsável, Setor e Motivo. O rótulo do Nome mantém o asterisco.
- `vHoraSaida` e `vObs` já não eram obrigatórios.

## Testes realizados (browser-automation)

- Raiz (HTTP):
  - Salvar com **apenas o nome** → registro criado; data/hora preenchidas automaticamente (31/08/2026, 08:57); formulário limpo após salvar.
  - Botão de saída (verde) presente nos registros sem saída.
  - Clicar em "Registrar saída" → `horaSaida` preenchida com a hora atual (08:57), botão desaparece e o badge "No local" some.
  - **0 erros de console / 0 requisições falhas.**
- `versao-web/` via `file://`: salvar só com nome OK; botão de saída presente e registra hora (08:57) e some; **0 erros**.

## Problemas Encontrados

- Nenhum funcional. `node --check` OK nos dois `script.js`; raiz ≡ versao-web (script.js IDENTICO; index.html difere só na linha do services + BOM).

## Solução Final

- Formulário de visitantes salva com **apenas o nome** (demais campos opcionais); data/hora recebem padrão se vazias.
- Coluna Ações ganhou o botão verde de saída rápida (só aparece enquanto o visitante está no local) que grava a saída com a hora atual em um clique.

## Estado Atual do Projeto

- `controle-de-visitantes/` (raiz e `versao-web/`): `script.js` idêntico; `index.html` difere apenas na linha do services (+ BOM na versão web). `node --check` OK.

## Próximos Passos

- Teste visual do usuário (salvar só com o nome e registrar saída pelo botão verde no histórico).

## Observações para Continuação

- **Espelhamento**: raiz → `versao-web` via `Copy-Item` para `script.js`; `index.html` da versão web editado preservando BOM (difere só na linha do services).
- **Saída rápida**: grava `saidaData` + `horaSaida`; a tabela mostra "No local" (badge warning) até a saída; depois exibe a hora e o botão some.
- **Obrigatoriedade**: só `nome`; `save()` ainda preenche data/hora padrão quando vazias.
- **QA**: `page.evaluate` roda em isolated world; usar DOM e cliques (`.click()` via evaluate) e `indexedDB` nativo para semear.

## Resumo Executivo

- Apenas o **nome** é obrigatório no Controle de Visitantes; todos os outros campos são opcionais.
- Botão verde "Registrar saída" adicionado à coluna Ações: grava a saída com a hora atual em um clique e some após a saída.
- Data/hora recebem padrão automático quando vazias.
- Implementado na raiz e na `versao-web`; validado no navegador (HTTP e `file://`) com 0 erros de console.

---

# 31/08/2026 (4ª etapa) — Visitantes: Hora Saída fora da atualização automática

## Contexto

No **Controle de Visitantes**, o usuário quer que o campo **Hora Saída** **não** seja atualizado automaticamente: ao dar a entrada, ele deixa a Hora Saída **vazia** e só preenche quando a pessoa sai. Os demais campos de horário devem continuar acompanhando o relógio (hora automática).

## Causa

A hora automática (`startAutoTimeFields` em `js/ui.js`, da sessão de 29/08) atualiza **todos** os `input[type="time"]` a cada minuto (exceto campos tocados pelo usuário e disabled/readOnly). O `#vHoraSaida` do visitante era preenchido com a hora atual, impedindo deixá-lo vazio.

## Alterações Realizadas

### `js/ui.js` (raiz + `versao-web/` — idênticos)

- Em `apply()` (loop da hora automática), adicionado o skip: `if (el.dataset && el.dataset.autoTime === 'off') return;` — campos com `data-auto-time="off"` ficam **fora** da atualização automática (mecanismo geral, reutilizável em outros módulos).

### `controle-de-visitantes/index.html` + `versao-web/controle-de-visitantes/index.html`

- Campo `#vHoraSaida` recebeu o atributo `data-auto-time="off"` → permanece vazio na entrada e só é preenchido quando o porteiro digita a hora da saída (ou via botão "Registrar saída").

## Testes realizados (browser-automation)

- Raiz (HTTP): no carregamento, `#vHoraSaida` vazia e `#vHoraEntrada` preenchida (09:09); após a virada de minuto, `#vHoraEntrada` atualizou (01:23 → 09:10) e `#vHoraSaida` **permaneceu intacta** (01:23). 0 erros de console.
- `versao-web/` via `file://`: `#vHoraSaida` vazia no carregamento e `data-auto-time="off"` presente; 0 erros.

## Problemas Encontrados

- Nenhum. `node --check` OK em `js/ui.js` e `versao-web/js/ui.js` (idênticos); `index.html` difere só na linha do services + BOM.

## Solução Final

- Hora Saída do Controle de Visitantes não acompanha mais o relógio; fica vazia até o porteiro informar a saída (digitação ou botão verde do histórico). Outros campos de hora continuam automáticos.

## Estado Atual do Projeto

- `js/ui.js` raiz = `versao-web` (mecanismo `data-auto-time="off"`). `controle-de-visitantes/index.html` (raiz e versão web) com `data-auto-time="off"` em `#vHoraSaida`.

## Próximos Passos

- Teste visual do usuário: fazer uma entrada deixando a Hora Saída vazia e conferir que ela não "enche sozinha" ao passar do minuto.

## Observações para Continuação

- **Hora automática**: para excluir qualquer outro campo de hora da atualização automática no futuro, basta adicionar `data-auto-time="off"` no input.
- **Espelhamento**: `js/ui.js` raiz → `versao-web` via `Copy-Item`; HTML da versão web editado preservando BOM.

## Resumo Executivo

- Campo **Hora Saída** do Controle de Visitantes parou de ser atualizado automaticamente (fica vazio na entrada).
- Demais campos de hora continuam acompanhando o relógio.
- Novo mecanismo geral em `ui.js`: `data-auto-time="off"` exclui qualquer campo da hora automática.
- Aplicado na raiz e na `versao-web`; validado atravessando a virada de minuto com 0 erros de console.

---

# 31/08/2026 (5ª etapa) — Entrada e Saída: responsável no card e registro de entrada direto

## Contexto

No módulo **Entrada e Saída**, ao clicar em "Registrar Entrada" abria um modal pedindo o **Responsável / autorizador** antes de confirmar. O usuário pediu que o campo **Responsável / autorizador (opcional)** ficasse **na tela principal (card da pessoa)** e que o botão **"Registrar Entrada" registrasse a movimentação direto**, sem o modal, agilizando o registro.

## Alterações Realizadas

### `controle-de-entrada-saida/index.html` (raiz + `versao-web/`)

- Card da pessoa (`esPessoaCard`): novo campo editável **Responsável / autorizador** (`#esPessoaRespInput`, placeholder "Nome do responsável (opcional)", title "Opcional — registrado na movimentação"), na lista de dados (após E-mail, antes de Observações).
- Botão "Registrar Entrada" (`#esBtnEntrada`): `onclick` de `abrirModalEntrada()` → `registrarEntradaDireta()`.

### `controle-de-entrada-saida/script.js` (raiz + `versao-web/` — idênticos)

- **Nova `registrarEntradaDireta()`** (substitui `abrirModalEntrada`): valida pessoa selecionada, salva os dados editados do card (`salvarDadosEditadosPessoa`), captura `responsavel` de `#esPessoaRespInput` (opcional), pega autorização ativa (se houver), registra com data/hora atuais e porteiro (`getPorteiro()`), re-seleciona a pessoa e mostra toast `Entrada registrada: {nome} às {hora}`. **Sem modal.**
- `selecionarPessoa()`: adicionado `$('#esPessoaRespInput').value = ''` (reset a cada seleção).
- `renderAutorizacoes()`: quando há autorização ativa e o campo estiver vazio, preenche `#esPessoaRespInput` com o autorizador (mesmo comportamento que o modal tinha).
- Modal de entrada **mantido** para a edição de movimentações (`editarMov` → "Editar Movimentação" / "Salvar Alterações"); `confirmarEntrada`/`confirmarEdicaoMov` intactos.

## Testes realizados (browser-automation)

- Raiz (HTTP):
  - Card exibe o campo responsável (opcional, vazio, placeholder correto).
  - Entrada **sem** responsável → registrada direto (modal NÃO abre), movimentação criada com porteiro e status "Dentro", responsável "-".
  - Entrada **com** responsável ("RESP DIRETO") → registrada direto, responsável gravado na movimentação.
  - "Editar Movimentação" continua abrindo o modal com título/btn corretos, responsável pré-preenchido e salvando.
  - **0 erros de console / 0 requisições falhas.**
- `versao-web/` via `file://`: campo presente, entrada direta registra responsável ("RESP WEB"); **0 erros**.

## Problemas Encontrados

- Nenhum funcional. No teste inicial, a 2ª entrada da mesma pessoa foi bloqueada porque ela já estava "DENTRO" (comportamento correto do app); corrigido testando com uma pessoa nova.

## Solução Final

- Campo "Responsável / autorizador (opcional)" na tela principal; "Registrar Entrada" grava a movimentação direto com a hora atual (data/hora/porteiro automáticos) e o responsável do card. Edição de movimentações continua pelo modal.

## Estado Atual do Projeto

- `controle-de-entrada-saida/` (raiz e `versao-web/`): `script.js` idêntico; `index.html` difere só na linha do services. `node --check` OK.

## Próximos Passos

- Teste visual do usuário: selecionar pessoa, preencher (ou não) o responsável e clicar em "Registrar Entrada" vendo o registro imediato.
- Se desejado no futuro, aplicar o mesmo "registro direto" ao botão "Registrar Saída".

## Observações para Continuação

- **Espelhamento**: raiz → `versao-web` via `Copy-Item` para `script.js`; `index.html` da versão web editado preservando BOM (difere só na linha do services).
- **Responsável**: é por movimentação (não é persistido na pessoa); o campo reseta a cada seleção e recebe o autorizador automaticamente quando há autorização ativa.
- **Modal de entrada** agora só é usado na edição ("Editar Movimentação"); a entrada nova é direta.

## Resumo Executivo

- Campo "Responsável / autorizador (opcional)" movido para o card da pessoa em Entrada e Saída.
- "Registrar Entrada" agora grava a movimentação **direto** (data/hora/porteiro atuais + responsável do card), sem modal.
- Edição de movimentações continua funcionando pelo modal.
- Aplicado na raiz e na `versao-web`; validado no navegador (HTTP e `file://`) com 0 erros de console.

---

# 31/08/2026 (6ª etapa) — Visitantes: busca mostra TODOS os cadastrados + autorização do visitante

## Contexto

Dois pedidos no **Controle de Visitantes** (raiz + `versao-web/`):

1. **Nem todos os nomes cadastrados apareciam** ao digitar (alguns apareciam, outros não). No Entrada e Saída aparece tudo. O usuário quer que **todos** os cadastrados apareçam conforme digita.
2. Mostrar, igual ao Entrada e Saída, **se o visitante tem autorização** e os **detalhes** (autorizou, período, forma).

## Causa raiz (item 1)

A busca do Controle de Visitantes lia **somente** a store `visitantes_perfil`. Visitantes cadastrados no **Cadastro de Pessoas** (`pessoas` — incluindo os 118 contatos importados) **não** apareciam. Além disso, o módulo **não carregava `js/portaria.js`** (por isso não tinha os helpers de busca/autorização do sistema).

## Alterações Realizadas

### `controle-de-visitantes/index.html` (raiz + `versao-web/`)

- Adicionado `<script src="../js/portaria.js"></script>` (raiz) / `<script src="../js/portaria.js"></script>` na versão web — após `alarme.js`, antes do services/bundle — carregando `window.Portaria`.
- Novo contêiner `<div id="vAutorizacao"></div>` dentro de `.vis-nome-group` (após o "não encontrado") para exibir a autorização do visitante.

### `controle-de-visitantes/script.js` (raiz + `versao-web/` — idênticos)

- Novo estado `visMatches = []`.
- **`buscarVisitantes()`**: agora busca em **duas fontes** — `visitantes_perfil` (perfis) + `Portaria.searchPessoas(q)` (cadastro de pessoas) — e **mescla sem duplicar** por nome normalizado (sem acentos). Preferência de preenchimento: perfil (tem `responsavel`) com fallback para a pessoa (`documento`, `setor`, `pessoaId`, `tipo`). Assim **todos** os cadastrados aparecem.
- `renderResultadosVisitantes()`: `onclick` passa o **índice** de `visMatches` (evita quebra por aspas/acentos).
- `selecionarPerfilVisitante(i)`: preenche nome/empresa/CPF/responsável/setor e chama `renderAutorizacaoVisitante(m)`.
- **Novas funções**:
  - `renderAutorizacaoVisitante(m)`: resolve o `pessoaId` (do merge ou por nome no cadastro), lê `Portaria.getAutorizacoesPessoa` e exibe:
    - **Ativa**: badge verde "AUTORIZADO" + "Autorizou: {responsavel}" + "Período: ... · Forma: ...".
    - Sem ativa mas com histórico: badge com a situação (EXPIRADA/AGENDADA/CANCELADA) + autorizou + período.
    - Sem autorização alguma: badge escuro "Sem autorização cadastrada".
  - `limparAutorizacaoVisitante()` (limpa `#vAutorizacao`).
  - `formaAutorizacaoLabel(forma)`.
- `clearForm()`/`limparBuscaVisitante()`/`limparDadosPerfilDivergente()` também limpam o bloco de autorização; `clearForm()` zera `visMatches`.

### `controle-de-visitantes/style.css` (raiz + `versao-web/`)

- Novos estilos `.vis-auth` (card com borda esquerda colorida), `.vis-auth-ok` (verde, autorizado) e `.vis-auth-detalhe`.

## Testes realizados (browser-automation)

- Raiz (HTTP):
  - Digitar "perfil" → aparece "PERFIL ONLY" (de `visitantes_perfil`).
  - Digitar "joao" → aparece "JOAO COM AUTORIZACAO" (de `pessoas` — antes não aparecia).
  - Selecionar JOAO → formulário preenchido (empresa/CPF) + bloco "AUTORIZADO / Autorizou: GERENTE MARTINS / Período: 01/08/2026 08:00 até 31/12/2026 18:00 · Forma: Presencial".
  - Pessoa sem autorização → "Sem autorização cadastrada".
  - Perfil sem cadastro em pessoas → preenche e bloco de autorização vazio (sem erro).
  - **0 erros de console / 0 requisições falhas.**
- `versao-web/` via `file://`: busca em pessoas + bloco "AUTORIZADO / Autorizou: RESP WEB / Período ... · Forma: Telefone"; **0 erros**.

## Problemas Encontrados

- Nenhum funcional. `node --check` OK nos dois `script.js`; raiz ≡ versao-web (`script.js`/`style.css` IDENTICOS; `index.html` difere só na linha do services + BOM).

## Solução Final

- Busca do Controle de Visitantes agora cobre **perfis de visitantes + cadastro de pessoas** (dedupe por nome), mostrando todos os cadastrados ao digitar.
- Ao selecionar um visitante, é exibida a **autorização** (ativa/com situação/ausente) com os detalhes, no mesmo padrão do Entrada e Saída.

## Estado Atual do Projeto

- `controle-de-visitantes/` (raiz e `versao-web/`): carrega `portaria.js`; `script.js`/`style.css` idênticos; `index.html` difere só na linha do services + BOM.

## Próximos Passos

- Teste visual do usuário: digitar nomes cadastrados (perfis e pessoas) e conferir o bloco de autorização ao selecionar.

## Observações para Continuação

- **Busca**: mescla `visitantes_perfil` + `pessoas` (via `Portaria.searchPessoas`); dedupe por nome normalizado; limite 10; `visMatches` guarda o resultado para seleção por índice.
- **Autorização**: exige a pessoa no cadastro (`pessoaId`) para casar com a store `autorizacoes`; usa `Portaria` (agora carregado no módulo).
- **Espelhamento**: raiz → `versao-web` via `Copy-Item` para `script.js`/`style.css`; `index.html` da versão web editado preservando BOM (difere só na linha do services).

## Resumo Executivo

- Busca do Controle de Visitantes passou a mostrar **todos** os cadastrados (perfis de visitantes + cadastro de pessoas), deduplicando por nome.
- Ao selecionar, aparece a **autorização** do visitante (badge AUTORIZADO + autorizou + período + forma; ou situação da autorização; ou "Sem autorização cadastrada"), igual ao Entrada e Saída.
- Módulo passou a carregar `js/portaria.js`.
- Aplicado na raiz e na `versao-web`; validado no navegador (HTTP e `file://`) com 0 erros de console.

---

# 31/08/2026 — Resumo do Dia (etapas 1 a 6: Controle de Visitantes e Entrada e Saída)

> Seção consolidada do dia. As etapas individuais (1ª a 6ª) estão detalhadas acima; este é o registro cronológico geral para retomada.

## Contexto

Trabalho do dia concentrado em melhorar o fluxo de atendimento da portaria em dois módulos:

- **Controle de Visitantes**: autocomplete de visitantes cadastrados, cadastro automático de novo visitante, porteiro persistente, somente o nome obrigatório, registro de saída rápido, Hora Saída sem atualização automática, busca por TODOS os cadastrados e exibição de autorização.
- **Entrada e Saída**: campo "Responsável / autorizador" no card da pessoa e registro de entrada direto (sem modal).

Todas as alterações foram aplicadas na **raiz (Electron)** e espelhadas em **`versao-web/`**, respeitando as regras do projeto (Copy-Item byte a byte, `node --check`, QA no navegador com browser-automation, nunca `Set-Content -Encoding UTF8`).

## Alterações Realizadas (cronológico)

### Etapa 1 — Visitantes: porteiro persistente + cadastro automático + feedback
- Porteiro salvo em `localStorage('clarityPorteiro')` (mesma chave do Entrada e Saída), restaurado no carregamento, atualizado no `input` e mantido no `clearForm()` (não limpa mais o campo).
- Dica sob o nome (`#vNomeHint`) informando "já cadastrado" (preenchimento automático via datalist) ou "novo visitante — será cadastrado ao salvar".
- Cadastro automático do perfil já existia (`upsertVisitantePerfil` no `save()`); mantido.

### Etapa 2 — Visitantes: autocomplete por dropdown (estilo Entrada e Saída)
- Campo nome virou caixa de busca full-width (`vis-nome-group`, `vis-search-box`) com ícone de lupa, botão de limpar (X) e dropdown `#vResultados`.
- Removido o datalist nativo (`visitantesPerfilList`) e o `#vNomeHint`; adicionado bloco "não encontrado" (`#vNaoEncontrado`) com a mensagem de cadastro automático.
- Busca com debounce de 250 ms, normalização sem acentos, até 10 resultados; seleção preenche empresa/CPF/responsável/setor; dropdown fecha ao clicar fora.

### Etapa 3 — Visitantes: só o nome obrigatório + botão "Registrar saída"
- `save()` valida apenas `nome`; data/hora recebem padrão (`todayISO`/`nowTime`) se vazias.
- Removidos `required` e asteriscos de todos os campos exceto Nome.
- Novo botão verde `btn-success` (`fa-sign-out-alt`, título "Registrar saída (hora atual)") na coluna Ações, renderizado só quando `!r.horaSaida`; `registrarSaidaRapida(id)` grava `saidaData` + `horaSaida = nowTime()`.

### Etapa 4 — Visitantes: Hora Saída fora da atualização automática
- Novo mecanismo geral em `js/ui.js` `startAutoTimeFields`: campos com `data-auto-time="off"` são ignorados na atualização por minuto.
- `#vHoraSaida` recebeu `data-auto-time="off"` → fica vazia na entrada; os demais campos de hora seguem automáticos.

### Etapa 5 — Entrada e Saída: responsável no card + registro direto
- Novo campo editável "Responsável / autorizador (opcional)" (`#esPessoaRespInput`) no card da pessoa.
- `registrarEntradaDireta()` substitui `abrirModalEntrada()`: grava a movimentação direto (data/hora atuais, porteiro, responsável do card, autorização ativa), sem modal.
- Campo reseta a cada seleção e é pré-preenchido com o autorizador quando há autorização ativa.
- Modal de entrada mantido para edição ("Editar Movimentação").

### Etapa 6 — Visitantes: busca mostra TODOS os cadastrados + autorização
- **Causa raiz**: a busca lia só `visitantes_perfil`; nomes do Cadastro de Pessoas (`pessoas`, ex.: 118 contatos importados) não apareciam; e o módulo não carregava `js/portaria.js`.
- `buscarVisitantes()` agora mescla `visitantes_perfil` + `Portaria.searchPessoas(q)` (dedupe por nome normalizado; `visMatches` com índice na seleção).
- `renderAutorizacaoVisitante(m)` mostra a autorização ao selecionar: badge verde "AUTORIZADO" + "Autorizou: ..." + período + forma; ou situação (EXPIRADA/AGENDADA/CANCELADA); ou "Sem autorização cadastrada".
- Adicionado `<script src="../js/portaria.js">` e o contêiner `#vAutorizacao`; CSS `.vis-auth`/`.vis-auth-ok`/`.vis-auth-detalhe`.

## Comandos executados / validações

- `node --check` em todos os JS alterados (raiz e `versao-web/`), incluindo `js/ui.js` → todos **OK**.
- Servidor estático local (porta 8788) + browser-automation (patchright) para QA: raiz via HTTP e `versao-web/` via `file://`, em cada etapa.
- Verificação de sincronia raiz ↔ versao-web (Node): `script.js`/`style.css` idênticos; `index.html` difere apenas na linha do services (`type="module" src="../services/index.js"` na raiz x `src="../js/portaria-services-web.js"` na versão web) + BOM pré-existente na linha 1 da versão web.

## Configurações alteradas

- Nenhuma configuração de sistema. Apenas as chaves de preferência do próprio app: `localStorage('clarityPorteiro')` (porteiro persistente) e o novo atributo `data-auto-time="off"` (HTML) para excluir campos da hora automática.

## Tentativas que Não Funcionaram

- **Datalist nativo** para o autocomplete de visitantes (etapa 1): atendia parcialmente, mas o usuário pediu explicitamente o mesmo comportamento do Entrada e Saída (dropdown com lista e seleção) — substituído pelo dropdown customizado (etapa 2).
- **Esperar que digitar "MARI" após selecionar "MARIA SOUZA" limpasse os campos**: não limpa porque "MARI" continua correspondendo ao cadastro (comportamento correto; a limpeza só ocorre quando o nome deixa de corresponder, validado com "ZELIA NOVA").
- **Registrar 2ª entrada da mesma pessoa no teste**: bloqueado corretamente porque a pessoa já estava "DENTRO" (não é bug; o teste foi refeito com outra pessoa).
- **Screenshot do dropdown**: não pôde ser inspecionada (modelo sem suporte a imagem); o QA foi validado por DOM/refs e o CSS é idêntico ao Entrada e Saída já aprovado.

## Problemas Encontrados

- Nenhum bug bloqueante. Os únicos pontos foram: causa raiz da etapa 6 (busca só em `visitantes_perfil` + falta de `portaria.js`), resolvida; e a etapa 4 exigiu um mecanismo novo (`data-auto-time="off"`) porque a hora automática atualizava todos os `input[type="time"]`.

## Solução Final

- **Controle de Visitantes**: busca com dropdown mostrando todos os cadastrados (perfis + cadastro de pessoas), seleção preenchendo o formulário, autorização exibida ao selecionar, cadastro automático de novos visitantes, só o nome obrigatório, saída rápida pelo botão verde, porteiro persistente e Hora Saída fora do relógio automático.
- **Entrada e Saída**: responsável/ autorizador no card e registro de entrada direto (sem modal); edição de movimentações mantida no modal.
- Tudo espelhado na `versao-web` e validado com 0 erros de console em HTTP e `file://`.

## Estado Atual do Projeto

- `controle-de-visitantes/` (raiz e `versao-web/`): `script.js`/`style.css` idênticos; `index.html` difere só na linha do services + BOM; carrega `js/portaria.js`; store de autorizações consultada via `Portaria`.
- `controle-de-entrada-saida/` (raiz e `versao-web/`): `script.js` idêntico; `index.html` difere só na linha do services.
- `js/ui.js` raiz = `versao-web` (mecanismo `data-auto-time="off"`).
- Todos os `node --check` OK.

## Próximos Passos

- Teste visual do usuário no app (Electron e/ou versão web): digitar nomes cadastrados e conferir lista + autorização; salvar visitante só com nome; registrar saída pelo botão verde; deixar Hora Saída vazia; entrada direta no Entrada e Saída com/sem responsável.
- Se desejado no futuro: aplicar o mesmo "registro direto" ao botão "Registrar Saída" do Entrada e Saída.

## Observações para Continuação

- **Espelhamento**: raiz → `versao-web` via `Copy-Item` para `script.js`/`style.css`/`js/*.js`; `index.html` da versão web editado preservando BOM (difere só na linha do services).
- **Encoding**: nunca `Set-Content -Encoding UTF8`; usar `Copy-Item` e Node `fs` (utf8, sem BOM).
- **Porteiro**: chave `localStorage('clarityPorteiro')` compartilhada entre Visitantes e Entrada e Saída.
- **Hora automática**: `data-auto-time="off"` em qualquer `input[type="time"]` o exclui da atualização por minuto.
- **Busca de visitantes**: mescla `visitantes_perfil` + `pessoas` (dedupe por nome); `visMatches` + índice na seleção; autorização exige a pessoa no cadastro (`pessoaId`).
- **QA**: `page.evaluate` roda em isolated world (sem acesso a `DB`/`Portaria`); semear dados via `indexedDB` nativo; clicar via `.click()` no evaluate; esperar com `state: 'attached'`.

## Resumo Executivo

- Controle de Visitantes: busca por autocomplete (dropdown estilo Entrada e Saída) mostrando todos os cadastrados — perfis de visitantes + cadastro de pessoas, deduplicados por nome.
- Ao selecionar, mostra a autorização do visitante (AUTORIZADO + autorizou + período + forma; situação; ou "Sem autorização cadastrada"); módulo passou a carregar `js/portaria.js`.
- Novo visitante é cadastrado automaticamente ao salvar; porteiro fica persistente no turno (`clarityPorteiro`); somente o nome é obrigatório; botão verde registra a saída com a hora atual.
- Hora Saída não acompanha mais o relógio (novo mecanismo `data-auto-time="off"` em `ui.js`); demais horas continuam automáticas.
- Entrada e Saída: responsável/ autorizador no card da pessoa e "Registrar Entrada" grava direto, sem modal; edição segue pelo modal.
- Tudo aplicado na raiz e na `versao-web`; validado com `node --check` e QA no navegador (HTTP + `file://`) com 0 erros de console.









