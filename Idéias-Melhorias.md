# Ideias de Melhorias — Portaria Clarity Glass

> Documento de ideias/backlog. Nada aqui foi implementado ainda.
> Criado em: 15/09/2026
> Status: aguardando aprovação do usuário (não implementar sem o "ok").

Organizado por esforço/impacto, com base no que o sistema já possui hoje
(Dashboard + módulos, IndexedDB v4, Electron ia32/x64, `versao-web/`, services
de PDF/Excel/backup/Outlook).

---

## Ganhos rápidos (baixo esforço, alto retorno)

- **Logo real no relatório diário/período**: o `pdfService.drawHeader` ainda desenha um placeholder "LOGO". Dá para embutir `window.CLARITY_LOGO` (a logo já existe em base64 nos módulos).
- **Backup automático ao Finalizar Turno**: além de gerar o PDF, salvar o JSON do Backup Geral sozinho na pasta `controle-da-portaria` a cada turno.
- **Restauração seletiva**: hoje o "Restaurar Backup" substitui tudo; permitir escolher quais módulos restaurar.
- **Alertas no Dashboard**: mostrar no card quantas chaves estão em uso, EPIs pendentes, pessoas "dentro" agora e insumos críticos.
- **Configurar e-mail pela tela**: destinatários/CC/assunto hoje estão em `configService.js`; criar um módulo de Configurações para editar isso.

## Funcionalidades de portaria

- **Foto do visitante** (webcam) anexada ao registro.
- **Assinatura digital** (canvas) na retirada de chaves e entrega de EPIs.
- **Pré-autorização com QR Code/código**: visitante chega com código e o porteiro só confirma.
- **Leitura de crachá/código de barras** para entrada/saída.
- **Notificação ao responsável** quando o visitante chega (WhatsApp/e-mail automático).
- **Confirmação de retirada/entrega pelo WhatsApp** (link de confirmação) — ver seção detalhada abaixo.
- **Controle de encomendas** (recebimento/entrega com responsável).
- **Anexos em Ocorrências** (fotos) e **livro de ocorrências** com gravidade.
- **Impressão de crachá** de visitante.
- **Rondas/checkpoints** com registro de horário.

## Confirmação pelo WhatsApp (link de confirmação)

**Ideia**: quando alguém retira uma chave/item ou recebe um EPI, o sistema envia uma
mensagem no WhatsApp com um **link único** daquele registro. A pessoa abre o link e
clica em "Confirmo que peguei"; o sistema marca o registro como **confirmado** (com
data/hora e identificação), sem depender de assinatura no balcão.

**Por que não usar só o `wa.me` atual**: os links `wa.me` apenas abrem o WhatsApp com
uma mensagem pronta — são só envio. Não há retorno, então o sistema não sabe se a
pessoa confirmou. Para receber o "OK" de volta é preciso um servidor que registre o clique.

### Como funcionaria

1. Ao salvar a retirada/entrega, o sistema gera um **token único** (ex.: `ab12cd34`)
   para aquele registro.
2. Envia no WhatsApp (link `wa.me` ou SMS/e-mail) algo como:
   `Fulano, confirme a retirada da chave "Sala A": https://sua-portaria.com/confirmar/ab12cd34`
3. A pessoa abre o link e clica em **"Confirmo que peguei"**.
4. A página de confirmação avisa o servidor, que marca o registro como
   `confirmado: true` + `confirmadoEm` + (opcional) IP/telefone.
5. O status "Confirmado / Pendente de confirmação" aparece no histórico, no modal
   e nos relatórios (PDF/Excel).

### O que exige (muda a arquitetura)

- **Servidor sempre online** para receber o clique (pode ser hospedado na Vercel).
- **Banco de dados compartilhado** (ex.: Supabase) — o registro precisa ser
  atualizado de fora do PC da portaria.
- **Internet** no posto.
- Encaixa no plano "front-end na Vercel + Supabase" já discutido (hoje o sistema é
  todo local: IndexedDB + Electron, sem servidor).

### Alternativas (do mais simples ao mais completo)

| Abordagem | Confirmação automática | Custo | Complexidade | Risco |
|---|---|---|---|---|
| `wa.me` (atual) | Não | Zero | Baixa | Nenhum |
| **Link de confirmação** (recomendado começar por aqui) | Sim (clique no link) | Baixo | Média | Nenhum |
| API oficial do WhatsApp (botões "Confirmar"/"Não recebi" + webhook) | Sim (botão real) | Por mensagem | Alta | Nenhum |
| Bibliotecas não oficiais (whatsapp-web.js/Baileys) | Sim | Baixo | Média | Banimento do número — **evitar** |

### Pontos de atenção

- **Valor de prova**: um "OK" por link é **confirmação eletrônica simples** — vale
  como evidência (com telefone, data/hora), mas é mais fraca que a **assinatura
  desenhada** na tela. Para itens de maior valor, combinar as duas.
- **Opt-in e privacidade**: enviar mensagem exige consentimento; cuidado com
  dados pessoais (LGPD).
- **Número/telefone**: é preciso ter o telefone do responsável no cadastro.
- **Nível 2 (API oficial)**: se um dia quiser botão dentro do WhatsApp, exige conta
  Meta Business, número dedicado, templates aprovados e webhook — mais custo e setup.

## Relatórios

- **Escolher seções** no relatório por período (gerar só Visitantes, por ex.).
- **Relatório individual por pessoa** (histórico completo de acessos/autorizações).
- **Envio direto por e-mail (SMTP)** em vez de depender do Outlook instalado.
- **Relatórios agendados** (ex.: resumo semanal automático).
- **Filtros extras**: por setor, empresa, porteiro, tipo de pessoa.

## Dados e confiabilidade

- **Unificar primeiros socorros no IndexedDB** (hoje usa `localStorage`, separado dos demais).
- **Sincronizar entre PCs**: se houver mais de um posto, os dados locais não se conversam — um servidor local (Node/SQLite) ou pasta de rede resolveria.
- **Backup automático agendado** para pasta de rede/nuvem.
- **Trilha de auditoria**: registrar quem criou/editou/excluiu cada registro.
- **Bloquear edição/exclusão** de registros antigos (ex.: mais de X dias).

## Multi-usuário e segurança

- **Login opcional por porteiro/supervisor** com perfis (hoje é sem login por design).
- **Modo supervisor** para cancelar autorizações/excluir movimentações.
- **Bloqueio por inatividade** (tela de portaria fica aberta).

## Técnico / distribuição

- **Instalador `.exe`** (electron-builder) em vez de pasta + `.bat`, com **auto-update**.
- **PWA**: instalar a versão web como app, com service worker para funcionar offline.
- **Testes automatizados** de verdade (hoje só QA manual via navegador).
- **Log central de erros** e tela de diagnóstico.
- **Acessibilidade** (navegação por teclado, contraste) e **modo quiosque/tela cheia** para o posto.
- **Busca global** no topo procurando em todos os módulos.

## Ordem recomendada

1. Logo real no PDF + alertas no Dashboard + backup automático no turno (rápidos e visíveis).
2. Restauração seletiva e configuração de e-mail pela tela.
3. Foto/assinatura e notificação ao responsável (valor real de portaria).
4. Unificar primeiros socorros no IndexedDB e trilha de auditoria.
5. Instalador `.exe` + PWA (facilitar a vida na empresa).

> **Observação**: a **confirmação pelo WhatsApp (link de confirmação)** e a
> **sincronização entre PCs** dependem de uma mudança maior de arquitetura
> (servidor + banco compartilhado, ex.: Vercel + Supabase). Devem ser planejadas
> juntas, e não como ajustes isolados no sistema local atual.
