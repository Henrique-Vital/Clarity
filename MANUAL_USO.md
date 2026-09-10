# 📖 Manual de Uso — Portaria Clarity Glass

Sistema de Controle da Portaria desenvolvido pela **Martseg** para a **Clarity Glass**.

Este guia explica, passo a passo, como usar cada parte do sistema. Se você está começando agora, leia em ordem: primeiro a **Introdução**, depois o **Dashboard** e então o módulo que você vai usar.

---

## Sumário

1. [Introdução](#1-introdução)
2. [Primeiros passos (o que você precisa saber)](#2-primeiros-passos)
3. [Dashboard (tela inicial)](#3-dashboard-tela-inicial)
4. [Controle de Chaves ou Item](#4-controle-de-chaves-ou-item)
5. [Controle de Visitantes](#5-controle-de-visitantes)
6. [Controle de EPIs](#6-controle-de-epis)
7. [Caixa de Primeiros Socorros / Insumos](#7-caixa-de-primeiros-socorros--insumos)
8. [Avisos e Recados](#8-avisos-e-recados)
9. [Ocorrências](#9-ocorrências)
10. [Cadastro de Pessoas](#10-cadastro-de-pessoas)
11. [Entrada e Saída](#11-entrada-e-saída)
12. [Autorizações](#12-autorizações)
13. [Configurações](#13-configurações)
14. [Finalizar Turno (relatório diário)](#14-finalizar-turno-relatório-diário)
15. [Backup e Restauração](#15-backup-e-restauração)
16. [Dicas e atalhos úteis](#16-dicas-e-atalhos-úteis)
17. [Perguntas frequentes](#17-perguntas-frequentes)

---

## 1. Introdução

O **Portaria Clarity Glass** é um sistema para controlar tudo o que acontece na portaria: retirada de chaves, entrada e saída de visitantes e funcionários, entrega de EPIs, avisos, ocorrências, autorizações de acesso e muito mais.

**Como abrir o sistema:**
- **No aplicativo (Electron):** dê dois cliques em `iniciar-app.bat` (ou no atalho do Portaria Clarity Glass).
- **No navegador:** abra a página `index.html` do sistema (ou a pasta `versao-web/`).

> 💡 **Importante:** todos os dados ficam salvos **no próprio computador** (banco IndexedDB do navegador). Não é preciso internet para usar o sistema.

---

## 2. Primeiros passos

Antes de usar, entenda estas 3 ideias simples:

1. **Cada módulo é uma tarefa.** Chaves, Visitantes, EPIs etc. são módulos separados. Você abre o módulo que precisa na tela inicial.
2. **Campos com `*` são obrigatórios.** O sistema não deixa salvar sem eles.
3. **Os dados são salvos automaticamente no seu computador.** Você não precisa "salvar arquivo" — apenas clicar no botão verde de salvar de cada tela.

> ⚙️ **Antes de tudo:** abra **Configurações** e confirme se o sistema está no modo **Condomínio** ou **Empresa** (isso muda apenas nomes de rótulos, como "Morador/Unidade" ou "Funcionário/Setor").

---

## 3. Dashboard (tela inicial)

Quando o sistema abre, você vê:

- **Cabeçalho:** logo da Clarity Glass (clique para enviar uma nova logo), botão de **tema claro/escuro** (lua/sol), data e hora.
- **Área de ações** (no topo): os botões **Finalizar Turno**, **Backup Geral** e **Restaurar Backup**.
- **Grade de módulos:** os cards que abrem cada controle. Cada card mostra um resumo, por exemplo "3 visita(s) hoje" ou "1 entrega(s) pendente(s)".

**Para abrir um módulo:** clique no card desejado. Para voltar à tela inicial, clique em **Voltar ao Dashboard** no topo de qualquer módulo.

---

## 4. Controle de Chaves ou Item

Serve para controlar **retirada e devolução** de chaves, itens do almoxarifado e veículos. Tem **3 abas**.

### Aba "Chaves Comuns"
**Retirar uma chave:**
1. Clique na aba **Chaves Comuns**.
2. No card "Retirada de Chave ou item", preencha: **Nome da chave** (ex.: "Sala Financeiro"), **Nome do funcionário**, **Data**, **Hora** e (opcional) **Observação**.
3. Clique em **Retirar**.

**Devolver uma chave:**
1. No card "Devolução de Chave", escolha a **chave a devolver** na lista (aparecem apenas as que estão em uso).
2. Preencha o **funcionário que devolveu**, **Data** e **Hora**.
3. Clique em **Devolver**.

> 💡 As chaves retiradas aparecem com status **Em uso** no histórico até serem devolvidas.

### Aba "Almoxarifado"
Igual às chaves comuns, mas para o almoxarifado. O nome da chave é fixo ("Chaves do Almoxarifado").

### Aba "Veículos"
1. Veja o **status dos veículos** (Disponível / Em uso).
2. Para registrar movimentação, escolha o **veículo**, a **operação** (Retirada ou Devolução), o **funcionário**, **data** e **hora**.
3. Clique em **Registrar**.

### Relatórios do módulo
No topo do histórico você encontra:
- **Gerar relatório do dia** — PDF com as movimentações de hoje.
- **Gerar relatório por período** — PDF com as movimentações entre duas datas.
- **Exportar Excel** — planilha com os dados.
- **Backup** (ícone de banco de dados) — Exportar/Importar backup apenas deste módulo.

---

## 5. Controle de Visitantes

Controla a **entrada e saída de visitantes** com registro completo.

**Registrar um visitante:**
1. Abra o módulo **Controle de Visitantes**.
2. No card "Novo Visitante", preencha os campos:
   - **Data** e **Hora Entrada** (obrigatórios).
   - **Hora Saída** (pode preencher depois, na saída).
   - **Nome do visitante** (obrigatório).
   - **Empresa**, **CPF ou RG**, **Nome do Porteiro**, **Responsável da Clarity**, **Setor**, **Motivo da visita** (obrigatórios) e **Observações** (opcional).
3. Clique em **Salvar**.

> 💡 **Atalho:** se você já cadastrou este visitante antes, ao digitar o nome o sistema **autocompleta** empresa, CPF/RG, responsável e setor automaticamente.

**Pesquisar no histórico:** use os filtros (data, nome, empresa, responsável) e clique em **Pesquisar**. Use **Limpar** para voltar ao normal.

---

## 6. Controle de EPIs

Controla a **entrega e devolução** de Equipamentos de Proteção Individual.

**Registrar uma entrega:**
1. Abra o módulo **Controle de EPIs**.
2. No card "Registrar Entrega / Devolução de EPIs", escolha **Operação: Entrega**.
3. Preencha **Data**, **Hora**, **Nome do visitante**, **Nome do Porteiro** e **Responsável da Clarity**.
4. Marque os EPIs entregues (**Capacete, Óculos, Mangote, Protetor Auricular**) e informe a **quantidade** de cada um.
5. Clique em **Registrar**. A entrega fica com status **Pendente**.

**Registrar uma devolução:**
1. Escolha **Operação: Devolução**.
2. Selecione a **entrega em aberto** na lista (aparecem só as pendentes).
3. Preencha data/hora e clique em **Registrar**. A entrega muda para **Devolvido**.

---

## 7. Caixa de Primeiros Socorros / Insumos

Gerencia a **caixa de primeiros socorros**: registra ocorrências e controla o **estoque de insumos**.

**Registrar uma ocorrência:**
1. Abra o módulo. No card "Nova Ocorrência", preencha **Líder**, **Setor**, **Usuário**, **Data**, **Descrição da Ocorrência** (obrigatórios) e **Observações**.
2. Na tabela **"Insumos Utilizados nesta Ocorrência"**, adicione os itens e as quantidades usadas.
3. Clique em **Salvar Ocorrência**.

> ⚠️ Cada ocorrência **diminui o estoque** dos insumos usados. O número da ocorrência é automático (001, 002...).

**Consultar o estoque:** no card "Controle de Estoque", veja cada item, a **quantidade restante** e a **situação** (Sem estoque, Crítico, Atenção, Alerta ou OK). Use **Restaurar** para repor o estoque inicial.

**Enviar por WhatsApp:** os botões **Enviar Ocorrência** e **Enviar Estoque** montam uma mensagem no WhatsApp com os dados.

**Outros botões:** Gerar PDF Ocorrência, Gerar PDF Estoque, Exportar Excel e Imprimir.

---

## 8. Avisos e Recados

Registra **comunicados da portaria** para repassar ao próximo turno.

**Registrar um aviso:**
1. Abra o módulo **Avisos e Recados**.
2. No card "Registrar Aviso / Recado", preencha **Data**, **Hora**, **Nome do Porteiro**, **Nome de quem deixou o recado** e o **Texto do aviso**.
3. Clique em **Salvar Aviso**.

**Pesquisar:** use o filtro de data e a busca por texto/porteiro/nome.

---

## 9. Ocorrências

Registra **ocorrências da portaria** de forma detalhada.

**Registrar uma ocorrência:**
1. Abra o módulo **Ocorrências**.
2. Preencha **Data**, **Nome do Porteiro** e a **Descrição completa da ocorrência**.
3. Clique em **Salvar Ocorrência**.

**Pesquisar:** use o filtro de data e a busca por porteiro ou descrição.

---

## 10. Cadastro de Pessoas

É o **catálogo de pessoas** do sistema: visitantes, moradores, funcionários e prestadores. Ele alimenta os módulos de Entrada e Saída, Visitantes e Autorizações.

**Cadastrar uma pessoa:**
1. Abra o módulo **Cadastro de Pessoas**.
2. Escolha a **aba do tipo**: Visitantes, Moradores, Funcionários ou Prestadores.
3. No card "Novo Cadastro", preencha os campos. **Só o Nome é obrigatório** — o restante é opcional.
4. Clique em **Salvar Cadastro**.

> ⚠️ Se já existir uma pessoa com o mesmo nome ou documento, o sistema **pergunta antes de salvar** para evitar duplicidade.

**Importar visitantes do Controle de Visitantes:**
- O botão **Importar Visitantes** lê todos os visitantes já registrados no módulo de Visitantes e os **cadastra automaticamente** como pessoas (sem duplicar os que já existem).

**Pesquisar:** use a busca (nome, documento, telefone, empresa...), os filtros de **tipo** e de **situação** (ativos/inativos).

> 💡 Quando uma pessoa tem histórico (entradas/saídas, autorizações), a exclusão é **lógica**: ela fica inativa, mas o histórico é preservado.

---

## 11. Entrada e Saída

Registra quem **entrou e saiu** do local, com busca automática no cadastro de pessoas.

**Registrar uma entrada:**
1. Abra o módulo **Entrada e Saída**.
2. No campo de **porteiro responsável**, digite seu nome (o sistema **memoriza** para os próximos registros).
3. Digite o **nome ou CPF/RG** da pessoa na busca automática.
   - Se a pessoa **está cadastrada**, o card dela aparece com os botões **Registrar Entrada** e **Registrar Saída**.
   - Se **não está cadastrada**, use o botão **"Cadastrar e Registrar Entrada"** para cadastrar e registrar de uma vez.
4. No modal de entrada, confira **Data**, **Hora** e **Porteiro**. Se houver **autorização ativa** da pessoa, o responsável já vem preenchido.
5. Clique em **Confirmar Entrada**. A pessoa fica com status **DENTRO**.

**Registrar uma saída:**
1. Busque a pessoa (ou encontre-a na lista de movimentações).
2. Clique em **Registrar Saída**.
3. Confirme Data/Hora/Porteiro e clique em **Confirmar Saída**. A pessoa fica com status **FORA**.

> ⚠️ Uma pessoa **já dentro** não pode dar entrada novamente sem sair primeiro (e vice-versa).

---

## 12. Autorizações

Registra **quem autorizou** e **quem está autorizado** a acessar o local, com validade por data e hora.

**Criar uma autorização:**
1. Abra o módulo **Autorizações**.
2. No bloco **"Responsável pela autorização"**, busque quem autoriza (por nome ou CPF/RG). Só aparecem os tipos habilitados nas **Configurações** (moradores, funcionários, visitantes e/ou prestadores).
3. No bloco **"Pessoa autorizada"**, busque a pessoa. Se não existir, use **"Cadastrar nova pessoa"**.
4. Escolha o **Tipo** (Visitante ou Prestador) e a **Forma** (Telefone, E-mail, Presencial, Sistema ou Outro).
5. Defina **Data/Hora inicial e final** de validade.
6. Clique em **Salvar Autorização**.

**Status automáticos:** o sistema calcula em tempo real se a autorização está **ATIVA** (dentro do período), **AGENDADA** (ainda não começou), **EXPIRADA** (já terminou) ou **CANCELADA**.

**Cancelar:** abra os detalhes da autorização e clique em **Cancelar Autorização**.

> 💡 No módulo **Entrada e Saída**, uma autorização ativa aparece no card da pessoa e preenche automaticamente o "responsável" no momento da entrada.

---

## 13. Configurações

Ajusta como o sistema se comporta.

1. **Tipo de Instalação:**
   - **Condomínio** → rótulos "Morador / Unidade".
   - **Empresa** → rótulos "Funcionário / Setor".
2. **Quem pode autorizar:** marque quais perfis (Moradores, Funcionários, Visitantes, Prestadores) podem ser "responsável" numa autorização. **Pelo menos um** deve estar marcado.
3. Clique em **Salvar Configurações**.

---

## 14. Finalizar Turno (relatório diário)

No fim do seu turno, gere o resumo do dia para repassar à gerência.

1. Na tela inicial, clique em **Finalizar Turno**.
2. O sistema mostra *"Gerando relatório e preparando e-mail..."* e monta:
   - Um **PDF** (`relatorio_diario_portaria_AAAA-MM-DD.pdf`) com 9 seções: Chaves, EPIs, Insumos, Primeiros Socorros, Visitantes, Avisos, Ocorrências, Entrada e Saída e Autorizações.
   - Um **rascunho de e-mail** já preenchido.
3. No modal "Relatório e E-mail Preparados" você pode:
   - **Baixar PDF** — salva o relatório na pasta `controle-da-portaria`.
   - **Copiar mensagem** — copia o texto do e-mail.
   - **Abrir no Outlook** — abre o Outlook com a mensagem e o PDF anexado, prontos para enviar (**nada é enviado sozinho** — você revisa e envia).
   - **Preparar novo relatório** — recomeça.
   - **Fechar**.

> 📌 O sistema **não envia e-mail automaticamente**. Ele apenas deixa tudo pronto para você conferir.

---

## 15. Backup e Restauração

Proteja seus dados fazendo backups regulares.

**Criar um backup (Backup Geral):**
1. Na tela inicial, clique em **Backup Geral**.
2. O sistema gera o arquivo `backup_geral_AAAA-MM-DD.json` com **todos os dados** de todos os módulos.
3. No aplicativo, o arquivo é salvo na pasta `controle-da-portaria`. Na versão web, é baixado normalmente.

**Restaurar um backup:**
1. Na tela inicial, clique em **Restaurar Backup**.
2. Escolha o arquivo `.json` do backup.
3. O sistema mostra um resumo (data do backup, quantos registros) e **avisa que os dados atuais serão substituídos**.
4. Clique em **Sim** para restaurar. A página recarrega com os dados do backup.

> ⚠️ **Cuidado:** restaurar um backup **apaga os dados atuais** e os substitui pelos do arquivo. Faça um Backup Geral antes de restaurar, se necessário.

**Backup por módulo:** dentro de cada módulo, o botão de backup (ícone de banco de dados) permite exportar/importar só os dados daquele módulo.

---

## 16. Dicas e atalhos úteis

- **Tema claro/escuro:** clique na **lua/sol** no canto superior direito de qualquer tela.
- **Logo da empresa:** no dashboard, clique na logo no cabeçalho para enviar uma nova imagem.
- **Porteiro memorizado:** no módulo Entrada e Saída, digite seu nome uma vez e ele fica salvo para os próximos registros.
- **Autocomplete:** nos módulos de Visitantes e Chaves, ao digitar um nome já usado o sistema sugere e preenche os demais campos.
- **Exclusão lógica:** pessoas com histórico não são apagadas de verdade — ficam "inativas" para não perder o histórico.
- **Crédito do sistema:** o rodapé mostra "Desenvolvido pela Martseg para a Clarity Glass" em todas as telas.

---

## 17. Perguntas frequentes

**Onde ficam os arquivos (PDFs e backups) que eu gero?**
No aplicativo, na pasta `controle-da-portaria` (dentro da pasta do sistema). Na versão web, na pasta de Downloads do navegador.

**Preciso de internet para usar o sistema?**
Não. Tudo funciona offline, direto no seu computador.

**Os dados são perdidos se eu fechar o programa?**
Não. Os dados ficam salvos automaticamente no banco do navegador do sistema.

**Perdi um dado importante. E agora?**
Se você tem um backup (Backup Geral), use **Restaurar Backup**. A partir daí, o ideal é criar backups regularmente.

**Posso usar em vários computadores ao mesmo tempo?**
Cada computador guarda os próprios dados. Para usar em outro computador, faça um **Backup Geral** e **Restaure** no outro.

**Por que o sistema me pergunta antes de salvar uma pessoa?**
Porque existe outra pessoa com o mesmo nome ou documento. O sistema evita cadastros duplicados.

**Como eu mudo entre "Condomínio" e "Empresa"?**
Em **Configurações**, escolha o tipo de instalação e clique em **Salvar Configurações**.

---

*Manual do usuário — Portaria Clarity Glass v1.0.0 — Desenvolvido pela Martseg para a Clarity Glass.*
