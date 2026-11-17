# Resumo do Projeto — Portaria Clarity Glass

> Documento atualizado em **17/11/2026**.
> O sistema é uma **aplicação web/PWA estática**, sem etapa de build e sem backend,
> preparada para publicação na Vercel. Os dados ficam no **IndexedDB do navegador**
> do dispositivo.

## 1. Visão geral

O **Portaria Clarity Glass** controla a rotina da portaria da Clarity Glass:
retirada e devolução de chaves/itens, entrada e saída de visitantes e pessoas,
entrega de EPIs, primeiros socorros e insumos, avisos, ocorrências, autorizações de
acesso, cadastro de pessoas e relatórios.

Características principais:

- 100% web: HTML, CSS e JavaScript puro, sem framework e sem build.
- Funciona offline depois da primeira abertura, graças ao service worker.
- Pode ser instalado como aplicativo (PWA) no Chrome/Edge e adicionado à tela
  inicial no celular.
- Os dados são locais ao navegador do dispositivo; não há sincronização entre
  computadores diferentes.
- Backup e restauração em JSON, com opção de restauração seletiva por módulo.
- Relatórios em PDF e exportações em Excel.
- Publicação estática na Vercel com HTTPS.

## 2. Estado atual

- **11 páginas HTML**: Dashboard + 10 módulos.
- **PWA completo**: `manifest.webmanifest`, `sw.js`, `js/pwa.js` e ícones em
  `assets/icons/`.
- **Atualização com aviso no app**: quando uma versão nova é publicada, aparece o
  banner “Nova versão disponível” com o botão “Atualizar agora”. Não é preciso
  reinstalar o aplicativo.
- **Sem instalador desktop** e sem dependência de `node_modules` em tempo de
  execução.
- **Deploy**: repositório estático; a Vercel publica a raiz do projeto como está.
- **Configurações e preferências** ficam no `localStorage`; os dados de negócio
  ficam no IndexedDB.

## 3. Arquitetura e estrutura

```text
/
├─ index.html                  Dashboard
├─ configuracoes/              Configurações do sistema
├─ controle-de-chaves/
├─ controle-de-visitantes/
├─ controle-de-epis/
├─ controle-de-insumos-primeiros-socorros/
├─ controle-de-avisos/
├─ controle-de-ocorrencias/
├─ controle-de-cadastros/
├─ controle-de-entrada-saida/
├─ controle-de-autorizacoes/
├─ css/                        base.css, dashboard.css
├─ js/                         db.js, ui.js, dashboard.js, portaria.js,
│                              backup.js, backup-auto.js, alarme.js,
│                              portaria-services-web.js, pwa.js
├─ libs/                       jsPDF, jsPDF-AutoTable, XLSX, Font Awesome
├─ assets/                     logos e ícones do PWA
├─ manifest.webmanifest
├─ sw.js
├─ vercel.json
└─ *.md                        documentação
```

Papéis dos principais arquivos:

- `js/db.js`: camada do IndexedDB `clarityPortaria` (versão 5), com as stores de
  todos os módulos.
- `js/ui.js`: modais, toasts, tema, paginação, geração de PDF/Excel e utilitários
  de interface.
- `js/dashboard.js`: cards, indicadores, busca global, relatórios do turno,
  backup/restauração, tela cheia e leitura dos dados para o Dashboard.
- `js/portaria.js`: cadastro de pessoas, entrada/saída e autorizações.
- `js/portaria-services-web.js`: bundle único dos serviços de PDF, Excel,
  relatórios, e-mail (rascunho) e arquivos, carregado por todas as páginas.
- `js/backup.js`: montagem e gravação do Backup Geral (`window.PortariaBackup`).
- `js/backup-auto.js`: agendador de backup automático às 06:00 e 18:00.
- `js/alarme.js`: controle de alarmes de avisos.
- `js/pwa.js`: registro do service worker, instalação e banner de atualização.

As bibliotecas de PDF, Excel e ícones são locais; não há dependência de CDN.

## 4. Módulos

| Módulo | Principais recursos |
|---|---|
| **Chaves ou Item** | Abas Chaves Comuns, Almoxarifado e Veículos; retirada/devolução; status “Em uso”; devolução rápida; pesquisa e paginação; relatórios do dia/período; Excel; backup do módulo. |
| **Visitantes** | Entrada e saída; autocomplete de visitantes já cadastrados; cadastro automático; perfil de visitante; pesquisa por data/nome/empresa/responsável; saída direta na tabela. |
| **EPIs** | Entrega e devolução; itens e quantidades; status Pendente/Devolvido; paginação; relatórios. |
| **Primeiros Socorros / Insumos** | Ocorrências com insumos utilizados; baixa automática de estoque; situação do estoque (Sem estoque/Crítico/Atenção/Alerta/OK); PDF, Excel e impressão; envio de texto pelo WhatsApp; dados no IndexedDB. |
| **Avisos e Recados** | Registro de comunicados por turno; filtros e busca; alarmes de avisos. |
| **Ocorrências** | Gravidade (Baixa/Média/Alta/Crítica), fotos anexadas, histórico, modal com galeria, PDF e Excel. |
| **Cadastro de Pessoas** | Visitantes, moradores, funcionários e prestadores; busca e filtros; exclusão lógica com preservação de histórico; importação de visitantes; relatório individual da pessoa. |
| **Entrada e Saída** | Busca no cadastro; entrada/saída com porteiro memorizado; status DENTRO/FORA; edição e cancelamento; paginação; relatórios. |
| **Autorizações** | Responsável e pessoa autorizada; tipo e forma; validade por data/hora; status ATIVA/AGENDADA/EXPIRADA/CANCELADA; cancelamento; integração com a entrada. |
| **Configurações** | Tipo de instalação (Condomínio/Empresa); perfis que podem autorizar; dados de e-mail do relatório (Para, CC, assunto e mensagem); logo e tema. |

## 5. Dashboard e recursos transversais

- **Cards** com resumos do dia e atalhos para os módulos.
- **Indicadores**: chaves em uso, EPIs pendentes, pessoas no local e insumos
  críticos.
- **Busca global** no cabeçalho, com resultados agrupados por módulo.
- **Finalizar Turno**: gera o relatório diário em PDF (9 seções), prepara o texto
  do e-mail e oferece:
  - baixar o PDF;
  - copiar a mensagem;
  - abrir o aplicativo de e-mail padrão com destinatários, CC, assunto e corpo
    preenchidos (o PDF deve ser anexado manualmente).
- **Relatórios**: diário, por período (com seleção de seções e filtros de porteiro
  e tipo de pessoa) e individual por pessoa (dados cadastrais, movimentações e
  visitas).
- **Excel**: exportações por módulo e relatório geral por período.
- **Backup Geral**: JSON com todos os módulos e preferências.
- **Restauração seletiva**: escolha dos módulos a restaurar.
- **Backup automático**: ao Finalizar Turno e às 06:00/18:00, com “catch-up” ao
  abrir o sistema após o horário.
- **Tema claro/escuro**, troca de logo e **tela cheia**.

## 6. Dados

IndexedDB `clarityPortaria`, versão **5**, com as stores:

`chaves`, `visitantes`, `visitantes_perfil`, `epis`, `avisos`, `ocorrencias`,
`pessoas`, `entradas_saidas`, `autorizacoes`, `config` e `primeiros_socorros`.

Preferências e configurações no `localStorage`:

- `clarityTheme`: tema claro/escuro.
- `clarityLogo`: logo personalizada.
- `clarityPorteiro`: nome do porteiro memorizado.
- `clarityEmailConfig`: destinatários, CC, assunto e mensagem do e-mail.
- `clarityBackupAuto`: controle dos backups automáticos já feitos.
- `clarity_alarme_disparados`: controle de alarmes de avisos.
- `firstAidSystem`: espelho legado de Primeiros Socorros (o IndexedDB é a fonte
  principal).

O Backup Geral inclui os dados de todas as stores e as preferências de tema e
logo. A restauração pode substituir todos os módulos ou apenas os selecionados.

## 7. PWA, offline e atualização

- `manifest.webmanifest`: nome, ícones (192/512, maskable), cores, `start_url` e
  atalhos para Chaves, Visitantes, Entrada/Saída e Ocorrências.
- `sw.js`: cache `portaria-clarity-web-v1.1.0` com 59 entradas.
  - Instalação: a versão nova **não** assume o controle imediatamente.
  - Ativação: remove caches antigos e chama `clients.claim()`.
  - Navegação: rede primeiro, com fallback para o cache (incluindo rotas com
    `index.html`).
  - Estáticos: cache primeiro, com cache de runtime para o que não estiver no
    APP_SHELL.
- `js/pwa.js`:
  - registro com `updateViaCache: 'none'`;
  - verificação de atualização ao carregar, ao ganhar foco, ao voltar à aba e a
    cada 30 minutos;
  - banner `#pwaUpdateBanner` com “Agora não” (dispensa pela sessão) e “Atualizar
    agora”;
  - o botão envia `SKIP_WAITING` ao service worker em espera e recarrega a página;
  - expõe `window.PortariaPWA` com `canInstall`, `install`, `checkForUpdate`,
    `applyUpdate` e `isUpdateAvailable`.

**Regra de publicação:** a cada nova versão, incrementar `CACHE_NAME` em `sw.js`
(ex.: `portaria-clarity-web-v1.1.1`). Sem esse incremento, o navegador pode
continuar servindo o cache antigo e o banner de atualização não aparece.

PWA e service worker exigem **HTTPS** ou `localhost`/`127.0.0.1`; não funcionam
ao abrir o `index.html` diretamente via `file://`.

## 8. Publicação

- A raiz do repositório é o site; não há build.
- Na Vercel: importar o repositório, usar preset estático e publicar a raiz.
- `vercel.json` define:
  - `/sw.js` sem cache (`no-cache, no-store`) e `Service-Worker-Allowed: /`;
  - `manifest.webmanifest` como `application/manifest+json; charset=utf-8`;
  - cabeçalhos `X-Content-Type-Options: nosniff` e
    `Referrer-Policy: strict-origin-when-cross-origin`.
- `.gitignore` ignora `node_modules/`, `.vercel/`, arquivos `.zip`,
  `controle-da-portaria/`, `Thumbs.db` e `.DS_Store`.

## 9. Validações realizadas

- `node --check` em todos os JavaScript e no service worker.
- JSON de `manifest.webmanifest` e `vercel.json` válido.
- 11 páginas com manifest, metas de PWA, ícones e bundle de serviços.
- Service worker ativo e controlando a página; cache com 59 entradas.
- Atualização testada de `v1.1.0` para uma versão de teste: banner exibido,
  “Atualizar agora” aplicou a nova versão e recarregou a página.
- Funcionamento offline antes e depois da atualização.
- 0 erros de console e 0 requisições falhas no QA.
- Auditoria de caminhos com diferença de maiúsculas/minúsculas.

## 10. Histórico de marcos

- **01/08/2026**: criação do sistema de controle da portaria.
- **03/08/2026**: pasta única de saída, módulos Avisos e Ocorrências, Backup Geral.
- **13/08/2026**: Cadastro de Pessoas, Entrada e Saída, Autorizações,
  Configurações e IndexedDB v4.
- **17/08/2026**: usabilidade, paginação, autocompletar e alarmes de avisos.
- **29/08/2026**: devolução rápida de chaves, cancelamento de movimentação,
  relatório/Excel por período e hora automática.
- **31/08/2026**: evolução de Visitantes e Entrada/Saída.
- **15/09/2026**: 13 melhorias (logo no PDF, alertas, restauração seletiva,
  backup automático, e-mail pela tela, ocorrências com gravidade/fotos, relatórios
  configuráveis, relatório da pessoa, busca global, tela cheia e Primeiros Socorros
  no IndexedDB).
- **17/11/2026**: consolidação como aplicação web/PWA, publicação estática na
  Vercel e atualização com banner no próprio app.

## 11. Próximos passos

1. Testar o fluxo de “Abrir no e-mail” com o cliente de e-mail real da portaria.
2. Confirmar o backup automático (06:00/18:00) em uso real.
3. Configurar domínio próprio na Vercel, se desejado.
4. Se houver mais de um posto, planejar sincronização com backend e banco
   compartilhado (ex.: Supabase), pois os dados atuais são locais ao navegador.
5. Manter `CACHE_NAME` e a versão do rodapé atualizados a cada publicação.

## 12. Observações de desenvolvimento

- Nunca usar `Set-Content -Encoding UTF8` no PowerShell para editar arquivos com
  acentos; usar as ferramentas de edição ou Node `fs` em UTF-8.
- Os dados ficam no navegador do dispositivo. Limpar os dados do site apaga o
  banco; manter backups regulares.
- O service worker só deve ser testado em HTTPS ou localhost.
- A publicação de uma nova versão depende do incremento de `CACHE_NAME` em
  `sw.js`.
- O histórico antigo do Git ainda contém os commits das versões anteriores; a
  árvore atual do projeto é a versão web/PWA.
