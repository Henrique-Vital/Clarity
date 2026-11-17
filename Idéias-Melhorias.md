# Ideias de Melhorias — Portaria Clarity Glass

> Backlog de ideias ainda **não implementadas**.
> Atualizado em: 17/11/2026
> Base atual: Dashboard + 10 módulos, IndexedDB v5, aplicação web/PWA instalável,
> funcionamento offline e bundle local de PDF/Excel/backup.

## Já implementado (não está mais no backlog)

- Logo real no PDF e nos relatórios.
- Alertas no Dashboard (chaves em uso, EPIs pendentes, pessoas no local e insumos
  críticos).
- Restauração seletiva de backup.
- Backup automático (Finalizar Turno + 06:00/18:00).
- Configuração de e-mail pela tela (Para, CC, assunto e mensagem) com abertura no
  cliente de e-mail padrão.
- Ocorrências com gravidade e fotos.
- Escolha de seções e filtros no relatório por período.
- Relatório individual por pessoa.
- Busca global no topo.
- Acessibilidade básica, tema claro/escuro e tela cheia.
- Primeiros Socorros no IndexedDB.
- PWA instalável, funcionamento offline e atualização com aviso no app.
- Publicação estática na Vercel.

---

## Prioridade alta

- **Foto do visitante** (webcam) anexada ao registro.
- **Assinatura digital** (canvas) na retirada de chaves e entrega de EPIs.
- **Pré-autorização com QR Code/código**: o visitante chega com um código e o
  porteiro apenas confirma.
- **Leitura de crachá/código de barras** para entrada e saída.
- **Notificação ao responsável** quando o visitante chega (e-mail ou WhatsApp).

## Prioridade média

- **Controle de encomendas** (recebimento/entrega com responsável).
- **Impressão de crachá** de visitante.
- **Rondas/checkpoints** com registro de horário.
- **Relatórios agendados** (ex.: resumo semanal automático).
- **Filtros adicionais** por setor e empresa.
- **Sincronização entre postos**: hoje os dados são locais ao navegador; exigiria
  backend e banco compartilhado (ex.: Vercel + Supabase).

## Prioridade baixa / estruturais

- **Trilha de auditoria**: registrar quem criou, editou ou excluiu cada registro.
- **Bloqueio de edição/exclusão** de registros antigos (ex.: mais de X dias).
- **Login opcional por porteiro/supervisor** com perfis.
- **Modo supervisor** para cancelar autorizações e excluir movimentações.
- **Bloqueio por inatividade** (a tela da portaria fica aberta).
- **Backup em nuvem** ou pasta de rede.
- **Testes automatizados** de verdade (hoje o QA é manual via navegador).
- **Log central de erros** e tela de diagnóstico.
- **Empacotamento em loja** (TWA/Play Store) e domínio próprio.
- **Envio automático de e-mail** por um serviço externo (Resend/SendGrid etc.) via
  backend; o fluxo atual abre o cliente de e-mail padrão e não envia sozinho.

---

## Confirmação pelo WhatsApp (link de confirmação)

**Ideia**: quando alguém retira uma chave/item ou recebe um EPI, o sistema envia
uma mensagem no WhatsApp com um **link único** daquele registro. A pessoa abre o
link e clica em “Confirmo que peguei”; o sistema marca o registro como
**confirmado** (com data/hora e identificação), sem depender de assinatura no
balcão.

**Por que não usar só o `wa.me` atual**: os links `wa.me` apenas abrem o WhatsApp
com uma mensagem pronta — são só envio. Não há retorno, então o sistema não sabe
se a pessoa confirmou. Para receber o “OK” de volta é preciso um servidor que
registre o clique.

### Como funcionaria

1. Ao salvar a retirada/entrega, o sistema gera um **token único** (ex.:
   `ab12cd34`) para aquele registro.
2. Envia no WhatsApp (link `wa.me` ou SMS/e-mail) algo como:
   `Fulano, confirme a retirada da chave "Sala A": https://sua-portaria.com/confirmar/ab12cd34`
3. A pessoa abre o link e clica em **“Confirmo que peguei”**.
4. A página de confirmação avisa o servidor, que marca o registro como
   `confirmado: true` + `confirmadoEm` + (opcional) IP/telefone.
5. O status “Confirmado / Pendente de confirmação” aparece no histórico, no modal
   e nos relatórios (PDF/Excel).

### O que exige (muda a arquitetura)

- **Servidor sempre online** para receber o clique (pode ser hospedado na Vercel).
- **Banco de dados compartilhado** (ex.: Supabase) — o registro precisa ser
  atualizado de fora do computador da portaria.
- **Internet** no posto.
- Encaixa no plano “front-end na Vercel + Supabase”. Hoje o sistema é uma
  aplicação web/PWA local: IndexedDB no navegador, sem servidor.

### Alternativas (do mais simples ao mais completo)

| Abordagem | Confirmação automática | Custo | Complexidade | Risco |
|---|---|---|---|---|
| `wa.me` (atual) | Não | Zero | Baixa | Nenhum |
| **Link de confirmação** (recomendado começar por aqui) | Sim (clique no link) | Baixo | Média | Nenhum |
| API oficial do WhatsApp (botões “Confirmar”/“Não recebi” + webhook) | Sim (botão real) | Por mensagem | Alta | Nenhum |
| Bibliotecas não oficiais (whatsapp-web.js/Baileys) | Sim | Baixo | Média | Banimento do número — **evitar** |

### Pontos de atenção

- **Valor de prova**: um “OK” por link é **confirmação eletrônica simples** — vale
  como evidência (com telefone, data/hora), mas é mais fraca que a **assinatura
  desenhada** na tela. Para itens de maior valor, combinar as duas.
- **Opt-in e privacidade**: enviar mensagem exige consentimento; cuidado com
  dados pessoais (LGPD).
- **Número/telefone**: é preciso ter o telefone do responsável no cadastro.
- **Nível 2 (API oficial)**: se um dia quiser botão dentro do WhatsApp, exige conta
  Meta Business, número dedicado, templates aprovados e webhook — mais custo e
  setup.

---

## Ordem recomendada

1. Foto do visitante + assinatura digital (alto valor operacional).
2. Notificação ao responsável e pré-autorização por QR/código.
3. Controle de encomendas, crachá e rondas.
4. Relatórios agendados e filtros adicionais.
5. Sincronização entre postos e confirmação pelo WhatsApp (dependem de backend e
   banco compartilhado, devem ser planejadas juntas).
6. Auditoria, perfis de acesso e testes automatizados.

> **Observação**: qualquer recurso que dependa de acesso remoto, notificação
> automática ou confirmação externa exige uma mudança maior de arquitetura
> (servidor + banco compartilhado, ex.: Vercel + Supabase). Não são ajustes
> isolados no armazenamento local atual.
