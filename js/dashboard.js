/* ===================================================================
   CLARITY GLASS - PORTARIA - DASHBOARD.JS
   ===================================================================
   Tela inicial do sistema. Exibe os quatro módulos, um resumo das
   movimentações do dia e o botão "Finalizar Turno", que prepara o
   relatório diário (PDF) e o rascunho do e-mail sem enviar nada.
   =================================================================== */

const DASHBOARD_MODAL_ID = 'turnoPreviewModal';
let turnoResult = null;

// ===== FINALIZAR TURNO =====
async function finalizarTurno() {
  const services = window.PortariaServices;
  if (!services) {
    UI.showToast('Serviços de relatório não carregados. Recarregue a página e tente novamente.', 'error');
    return;
  }
  setTurnoLoading(true);
  try {
    turnoResult = await services.ReportService.prepareDailyTurnoverReport();
    renderPreviewModal(turnoResult);
    setTurnoLoading(false);
    UI.showToast('Relatório preparado com sucesso.', 'success');
    // Backup geral automático junto do fechamento do turno (silencioso).
    backupGeralSilencioso();
  } catch (e) {
    console.error('Erro ao preparar relatório:', e);
    setTurnoLoading(false);
    UI.showToast('Erro ao preparar o relatório: ' + (e && e.message ? e.message : 'erro inesperado'), 'error');
  }
}

function setTurnoLoading(show) {
  const el = document.getElementById('turnoLoading');
  if (el) el.classList.toggle('active', !!show);
}

// ===== MODAL DE PRÉ-VISUALIZAÇÃO =====
function renderPreviewModal(result) {
  const FileService = window.PortariaServices.FileService;
  const now = new Date();

  document.getElementById('turnoTo').textContent = result.draft.getTo().join(', ') || '-';
  document.getElementById('turnoCc').textContent = result.draft.getCc().join(', ') || '-';
  document.getElementById('turnoSubject').textContent = result.draft.getSubject() || '-';
  document.getElementById('turnoPdfName').textContent = result.pdf.pdfName;
  document.getElementById('turnoPdfSize').textContent = FileService.formatFileSize(result.pdf.pdfBlob.size);
  document.getElementById('turnoDate').textContent = result.dateText;
  document.getElementById('turnoTime').textContent = now.toLocaleTimeString('pt-BR');
  document.getElementById('turnoBody').textContent = result.draft.getBody();

  UI.openModal(DASHBOARD_MODAL_ID);
}

// ===== BACKUP GERAL =====
async function backupGeral() {
  if (!window.PortariaBackup) {
    UI.showToast('Módulo de backup não carregado.', 'error');
    return;
  }
  UI.showToast('Gerando backup geral...', 'info');
  try {
    const res = await window.PortariaBackup.save();
    const pasta = (res && res.res && res.res.folderName) ? res.res.folderName : 'controle-da-portaria';
    UI.showToast('Backup geral salvo com sucesso na pasta "' + pasta + '".', 'success');
  } catch (e) {
    console.error('Erro ao gerar backup geral:', e);
    UI.showToast('Erro ao gerar o backup geral.', 'error');
  }
}

/** Gera o backup geral em silêncio (sem toasts), usado no Finalizar Turno. */
async function backupGeralSilencioso() {
  if (!window.PortariaBackup) return;
  try {
    await window.PortariaBackup.save();
  } catch (e) {
    console.warn('Falha no backup automático do turno:', e);
  }
}

// ===== RESTAURAR BACKUP (SELETIVO) =====
const RESTORE_LABELS = {
  chaves: 'Controle de Chaves ou Item',
  visitantes: 'Controle de Visitantes',
  visitantes_perfil: 'Perfis de Visitantes',
  epis: 'Controle de EPIs',
  avisos: 'Avisos e Recados',
  ocorrencias: 'Ocorrências',
  pessoas: 'Cadastro de Pessoas',
  entradas_saidas: 'Entrada e Saída',
  autorizacoes: 'Autorizações',
  config: 'Configurações'
};
let pendingBackup = null;

function restaurarBackup() {
  const input = document.getElementById('backupInput');
  if (!input) return;
  input.value = '';
  input.onchange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup || backup.sistema !== 'Portaria - Clarity Glass' || !backup.dados) {
        UI.showToast('Arquivo inválido. Selecione um arquivo de backup geral (.json).', 'error');
        return;
      }
      pendingBackup = backup;
      abrirModalRestauracao(backup);
    } catch (err) {
      console.error('Erro ao ler o arquivo de backup:', err);
      UI.showToast('Arquivo inválido ou corrompido.', 'error');
    }
  };
  input.click();
}

function abrirModalRestauracao(backup) {
  const lista = document.getElementById('restoreList');
  const resumo = document.getElementById('restoreSummary');
  if (!lista) return;

  const itens = [];
  Object.keys(RESTORE_LABELS).forEach((s) => {
    if (Array.isArray(backup.dados[s])) {
      itens.push({ kind: 'store', name: s, label: RESTORE_LABELS[s], count: backup.dados[s].length });
    }
  });
  if (backup.dados.primeirosSocorros) {
    const ps = backup.dados.primeirosSocorros;
    const n = Array.isArray(ps.occurrences) ? ps.occurrences.length : 0;
    itens.push({ kind: 'firstAid', name: 'primeiros_socorros', label: 'Primeiros Socorros (ocorrências e insumos)', count: n });
  }
  if (backup.preferencias) {
    itens.push({ kind: 'prefs', name: 'preferencias', label: 'Preferências (tema e logo)', count: 1 });
  }

  const total = itens.reduce((acc, i) => acc + i.count, 0);
  const dataTxt = backup.geradoEm ? new Date(backup.geradoEm).toLocaleString('pt-BR') : 'data desconhecida';
  resumo.textContent = `Backup de ${dataTxt} — ${total} registro(s) em ${itens.length} módulo(s).`;

  lista.innerHTML = itens.map((i) => `
    <label class="restore-item">
      <input type="checkbox" data-kind="${i.kind}" data-name="${i.name}" checked>
      <span class="restore-name">${UI.escHtml(i.label)}</span>
      <span class="restore-count">${i.count} registro(s)</span>
    </label>
  `).join('');

  UI.openModal('restoreModal');
}

async function confirmarRestauracao() {
  if (!pendingBackup) return;
  const boxes = Array.from(document.querySelectorAll('#restoreList input[type=checkbox]:checked'));
  if (!boxes.length) {
    UI.showToast('Selecione ao menos um módulo para restaurar.', 'warning');
    return;
  }
  UI.closeModal('restoreModal');
  UI.showToast('Restaurando backup...', 'info');
  try {
    for (const box of boxes) {
      const kind = box.getAttribute('data-kind');
      const name = box.getAttribute('data-name');
      if (kind === 'store') {
        await DB.importStore(name, pendingBackup.dados[name]);
      } else if (kind === 'firstAid') {
        const st = pendingBackup.dados.primeirosSocorros;
        localStorage.setItem('firstAidSystem', JSON.stringify(st));
        if (st && typeof DB !== 'undefined' && DB.store) {
          await DB.store('primeiros_socorros').put(Object.assign({ id: 'state' }, st));
        }
      } else if (kind === 'prefs') {
        const p = pendingBackup.preferencias || {};
        if (p.tema) localStorage.setItem('clarityTheme', p.tema);
        if (p.logo) localStorage.setItem('clarityLogo', p.logo);
      }
    }
    UI.showToast('Backup restaurado com sucesso. Recarregando...', 'success');
    setTimeout(() => location.reload(), 1200);
  } catch (err) {
    console.error('Erro ao restaurar backup:', err);
    UI.showToast('Erro ao restaurar o backup.', 'error');
  }
}

// ===== AÇÕES DO MODAL =====
function copiarMensagem() {
  if (!turnoResult) return;
  const text = turnoResult.draft.getBody();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      UI.showToast('Mensagem copiada para a área de transferência.', 'success');
    }).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    UI.showToast('Mensagem copiada para a área de transferência.', 'success');
  } catch (e) {
    UI.showToast('Não foi possível copiar a mensagem.', 'error');
  }
  ta.remove();
}

async function baixarPdf() {
  if (!turnoResult) return;
  try {
    const FileService = window.PortariaServices ? window.PortariaServices.FileService : null;
    if (!FileService || typeof FileService.savePdf !== 'function') {
      UI.showToast('Serviços de arquivo não carregados.', 'error');
      return;
    }
    const res = await FileService.savePdf(turnoResult.pdf.pdfBlob, turnoResult.pdf.pdfName);
    const destino = (res && res.folderName)
      ? `salvo na pasta "${res.folderName}"`
      : 'baixado (download iniciado)';
    if (res && res.renamed) {
      UI.showToast(`PDF ${destino}. O arquivo anterior estava aberto; salvo como: ${res.fileName}`, 'warning');
    } else {
      UI.showToast(`PDF ${destino}: ${turnoResult.pdf.pdfName}`, 'success');
    }
  } catch (e) {
    console.error('Erro ao baixar PDF:', e);
    UI.showToast('Erro ao salvar o PDF. Feche o arquivo aberto e tente novamente.', 'error');
  }
}

function prepararNovoRelatorio() {
  turnoResult = null;
  UI.closeModal(DASHBOARD_MODAL_ID);
}

// ===== TELA CHEIA / MODO QUIOSQUE =====
async function toggleTelaCheia() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      UI.showToast('Tela cheia ativada. Pressione Esc para sair.', 'info');
    } else {
      await document.exitFullscreen();
    }
  } catch (e) {
    UI.showToast('Não foi possível alternar a tela cheia.', 'warning');
  }
}

// ===== RELATÓRIO POR PERÍODO (TODOS OS MÓDULOS) =====
async function gerarRelatorioPeriodo() {
  const services = window.PortariaServices;
  if (!services || !services.ReportService || !services.ReportService.preparePeriodReport) {
    UI.showToast('Serviços de relatório não carregados. Recarregue a página e tente novamente.', 'error');
    return;
  }
  UI.openReportModal(async (start, end, sections, filters) => {
    setTurnoLoading(true);
    try {
      const res = await services.ReportService.preparePeriodReport(start, end, sections, filters);
      setTurnoLoading(false);
      await salvarArquivoGeral(res.pdf.pdfBlob, res.pdf.pdfName, 'Relatório do período');
    } catch (e) {
      setTurnoLoading(false);
      console.error('Erro ao gerar relatório por período:', e);
      UI.showToast('Erro ao gerar o relatório por período.', 'error');
    }
  });
}

// ===== EXPORTAR EXCEL GERAL (TODOS OS MÓDULOS) =====
async function exportarExcelGeral() {
  const services = window.PortariaServices;
  if (!services || !services.ReportService || !services.ReportService.preparePeriodExcel) {
    UI.showToast('Serviços de relatório não carregados. Recarregue a página e tente novamente.', 'error');
    return;
  }
  UI.openReportModal(async (start, end, sections, filters) => {
    UI.showToast('Gerando planilha do período...', 'info');
    try {
      const res = await services.ReportService.preparePeriodExcel(start, end, filters);
      await salvarArquivoGeral(res.excelBlob, res.excelName, 'Planilha do período');
    } catch (e) {
      console.error('Erro ao exportar Excel:', e);
      UI.showToast('Erro ao exportar a planilha.', 'error');
    }
  });
}

async function salvarArquivoGeral(blob, fileName, tipo) {
  const FileService = window.PortariaServices ? window.PortariaServices.FileService : null;
  if (!FileService || typeof FileService.savePdf !== 'function') {
    UI.showToast('Serviços de arquivo não carregados.', 'error');
    return;
  }
  try {
    const res = await FileService.savePdf(blob, fileName);
    const destino = (res && res.folderName)
      ? `salvo na pasta "${res.folderName}"`
      : 'baixado (download iniciado)';
    UI.showToast(`${tipo} ${destino}: ${fileName}`, 'success');
  } catch (e) {
    console.error('Erro ao salvar arquivo:', e);
    UI.showToast('Erro ao salvar o arquivo.', 'error');
  }
}

function abrirEmail() {
  if (!turnoResult) return;
  const { to, cc, subject, body } = turnoResult.draft;
  const params = [];
  if (cc && cc.length) params.push('cc=' + encodeURIComponent(cc.join(',')));
  if (subject) params.push('subject=' + encodeURIComponent(subject));
  if (body) params.push('body=' + encodeURIComponent(body));
  const destinatarios = (to || []).join(',');
  const mailto = 'mailto:' + destinatarios + (params.length ? '?' + params.join('&') : '');
  UI.showToast('Abrindo o aplicativo de e-mail. Anexe o PDF baixado manualmente.', 'info');
  window.location.href = mailto;
}

// ===== PRIMEIROS SOCORROS (IndexedDB com fallback no localStorage) =====
async function lerPrimeirosSocorros() {
  try {
    if (typeof DB !== 'undefined' && DB.store) {
      const rec = await DB.store('primeiros_socorros').get('state');
      if (rec) return rec;
    }
  } catch (e) {
    // segue para o fallback
  }
  try {
    const saved = localStorage.getItem('firstAidSystem');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
}

// ===== BUSCA GLOBAL =====
let globalSearchTimer = null;

function normBusca(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function debounceBuscaGlobal() {
  clearTimeout(globalSearchTimer);
  globalSearchTimer = setTimeout(executarBuscaGlobal, 250);
}

async function executarBuscaGlobal() {
  const input = document.getElementById('globalSearch');
  const box = document.getElementById('globalResults');
  const clearBtn = document.getElementById('globalSearchClear');
  if (!input || !box) return;
  const q = normBusca(input.value).trim();
  if (clearBtn) clearBtn.classList.toggle('hidden', !input.value);
  if (!q) { box.classList.remove('open'); box.innerHTML = ''; return; }

  let data;
  try {
    const [pessoas, visitantes, chaves, epis, ocorrencias, avisos, movs] = await Promise.all([
      DB.store('pessoas').getAll(),
      DB.store('visitantes').getAll(),
      DB.store('chaves').getAll(),
      DB.store('epis').getAll(),
      DB.store('ocorrencias').getAll(),
      DB.store('avisos').getAll(),
      DB.store('entradas_saidas').getAll()
    ]);
    data = { pessoas, visitantes, chaves, epis, ocorrencias, avisos, movs };
  } catch (e) {
    console.error('Erro na busca global:', e);
    return;
  }

  const results = [];
  const push = (modulo, link, label, detail) => results.push({ modulo, link, label, detail });
  const LIMIT = 5;

  (data.pessoas || []).filter((p) => normBusca([p.nome, p.documento, p.empresa, p.setor, p.telefone, p.email].join(' ')).includes(q)).slice(0, LIMIT)
    .forEach((p) => push('Cadastro de Pessoas', 'controle-de-cadastros/index.html', p.nome, [p.tipo, p.empresa || p.setor, p.documento].filter(Boolean).join(' · ')));

  (data.visitantes || []).filter((v) => normBusca([v.nome, v.empresa, v.cpfRg, v.responsavel].join(' ')).includes(q)).slice(0, LIMIT)
    .forEach((v) => push('Controle de Visitantes', 'controle-de-visitantes/index.html', v.nome, [v.empresa, v.data].filter(Boolean).join(' · ')));

  (data.chaves || []).filter((c) => normBusca([c.chave, c.funcionario, c.veiculo, c.placa, c.retornoFuncionario].join(' ')).includes(q)).slice(0, LIMIT)
    .forEach((c) => push('Controle de Chaves ou Item', 'controle-de-chaves/index.html', c.chave || c.veiculo || '-', [c.funcionario, c.status].filter(Boolean).join(' · ')));

  (data.epis || []).filter((e) => normBusca([e.visitante, e.porteiro, e.responsavel].join(' ')).includes(q)).slice(0, LIMIT)
    .forEach((e) => push('Controle de EPIs', 'controle-de-epis/index.html', e.visitante || '-', [e.porteiro, e.status].filter(Boolean).join(' · ')));

  (data.ocorrencias || []).filter((o) => normBusca([o.porteiro, o.descricao].join(' ')).includes(q)).slice(0, LIMIT)
    .forEach((o) => push('Ocorrências', 'controle-de-ocorrencias/index.html', (o.descricao || '-').slice(0, 60), o.porteiro || ''));

  (data.avisos || []).filter((a) => normBusca([a.porteiro, a.nome, a.texto].join(' ')).includes(q)).slice(0, LIMIT)
    .forEach((a) => push('Avisos e Recados', 'controle-de-avisos/index.html', (a.texto || '-').slice(0, 60), a.nome || a.porteiro || ''));

  (data.movs || []).filter((m) => normBusca([m.nome, m.documento, m.porteiro, m.responsavel].join(' ')).includes(q)).slice(0, LIMIT)
    .forEach((m) => push('Entrada e Saída', 'controle-de-entrada-saida/index.html', m.nome || '-', [m.data, m.horaEntrada].filter(Boolean).join(' ')));

  renderGlobalResults(results);
}

/** Posiciona o dropdown de resultados logo abaixo do campo de busca. */
function posicionarResultadosGlobais() {
  const input = document.getElementById('globalSearch');
  const box = document.getElementById('globalResults');
  if (!input || !box) return;
  const r = input.getBoundingClientRect();
  box.style.left = r.left + 'px';
  box.style.top = (r.bottom + 4) + 'px';
  box.style.width = r.width + 'px';
}

function renderGlobalResults(results) {
  const box = document.getElementById('globalResults');
  if (!box) return;
  posicionarResultadosGlobais();
  if (!results.length) {
    box.innerHTML = '<div class="global-empty">Nenhum resultado encontrado.</div>';
    box.classList.add('open');
    return;
  }
  const groups = {};
  results.forEach((r) => { (groups[r.modulo] = groups[r.modulo] || []).push(r); });
  box.innerHTML = Object.keys(groups).map((mod) => `
    <div class="global-group">
      <div class="global-group-title">${UI.escHtml(mod)}</div>
      ${groups[mod].map((r) => `
        <a class="global-item" href="${r.link}">
          <span class="global-item-label">${UI.escHtml(r.label)}</span>
          ${r.detail ? `<span class="global-item-detail">${UI.escHtml(r.detail)}</span>` : ''}
        </a>`).join('')}
    </div>`).join('');
  box.classList.add('open');
}

function limparBuscaGlobal() {
  const input = document.getElementById('globalSearch');
  const box = document.getElementById('globalResults');
  const clearBtn = document.getElementById('globalSearchClear');
  if (input) { input.value = ''; input.focus(); }
  if (box) { box.classList.remove('open'); box.innerHTML = ''; }
  if (clearBtn) clearBtn.classList.add('hidden');
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  UI.initCommon();

  const $ = (sel) => document.querySelector(sel);
  const today = UI.todayISO();

  const gsInput = document.getElementById('globalSearch');
  if (gsInput) gsInput.addEventListener('input', debounceBuscaGlobal);
  document.addEventListener('click', (e) => {
    const wrap = document.querySelector('.header-search');
    const box = document.getElementById('globalResults');
    if (box && wrap && !wrap.contains(e.target)) box.classList.remove('open');
  });
  const reposicionarBusca = () => {
    const box = document.getElementById('globalResults');
    if (box && box.classList.contains('open')) posicionarResultadosGlobais();
  };
  window.addEventListener('resize', reposicionarBusca);
  window.addEventListener('scroll', reposicionarBusca, true);

  document.getElementById('turnoCopyBtn').addEventListener('click', copiarMensagem);
  document.getElementById('turnoDownloadBtn').addEventListener('click', baixarPdf);
  document.getElementById('turnoMailBtn').addEventListener('click', abrirEmail);
  document.getElementById('turnoNewBtn').addEventListener('click', prepararNovoRelatorio);

  try {
    // ===== Controle de Chaves ou Item =====
    const chaves = await DB.store('chaves').getAll();
    const chavesHoje = chaves.filter((r) => r.data === today).length;
    $('#countChaves').textContent = chavesHoje > 0
      ? `${chavesHoje} movimentação(ões) hoje`
      : 'Nenhuma movimentação hoje';

    // ===== CONTROLE DE VISITANTES =====
    const visitantes = await DB.store('visitantes').getAll();
    const visitantesHoje = visitantes.filter((r) => r.data === today).length;
    $('#countVisitantes').textContent = visitantesHoje > 0
      ? `${visitantesHoje} visita(s) hoje`
      : 'Nenhuma visita hoje';

    // ===== CONTROLE DE EPIs =====
    const epis = await DB.store('epis').getAll();
    const episPendentes = epis.filter((r) => r.status === 'pendente').length;
    $('#countEpis').textContent = episPendentes > 0
      ? `${episPendentes} entrega(s) pendente(s)`
      : 'Nenhuma entrega pendente';

    // ===== AVISOS E RECADOS =====
    const avisos = await DB.store('avisos').getAll();
    const avisosHoje = avisos.filter((r) => r.data === today).length;
    $('#countAvisos').textContent = avisosHoje > 0
      ? `${avisosHoje} aviso(s) hoje`
      : 'Nenhum aviso hoje';

    // ===== OCORRÊNCIAS =====
    const ocorrencias = await DB.store('ocorrencias').getAll();
    const ocorrenciasHoje = ocorrencias.filter((r) => r.data === today).length;
    $('#countOcorrencias').textContent = ocorrenciasHoje > 0
      ? `${ocorrenciasHoje} ocorrência(s) hoje`
      : 'Nenhuma ocorrência hoje';

    // ===== CONTROLE DE PRIMEIROS SOCORROS =====
    const firstAid = await lerPrimeirosSocorros();
    const firstAidCount = firstAid
      ? (firstAid.occurrences || []).filter((o) => o.data === today).length
      : 0;
    $('#countFirstAid').textContent = firstAidCount > 0
      ? `${firstAidCount} ocorrência(s) hoje`
      : 'Nenhuma ocorrência hoje';

    // ===== CADASTRO DE PESSOAS =====
    const pessoas = await DB.store('pessoas').getAll();
    const pessoasAtivas = pessoas.filter((p) => p.ativo !== false).length;
    $('#countPessoas').textContent = pessoasAtivas > 0
      ? `${pessoasAtivas} pessoa(s) cadastrada(s)`
      : 'Nenhuma pessoa cadastrada';

    // ===== ENTRADA E SAÍDA =====
    const movimentacoes = await DB.store('entradas_saidas').getAll();
    const movimentacoesHoje = movimentacoes.filter((r) => r.data === today).length;
    $('#countMovimentacoes').textContent = movimentacoesHoje > 0
      ? `${movimentacoesHoje} movimentação(ões) hoje`
      : 'Nenhuma movimentação hoje';

    // ===== AUTORIZAÇÕES =====
    const autorizacoes = await DB.store('autorizacoes').getAll();
    const autAtivas = autorizacoes.filter((a) => a.status !== 'cancelada').length;
    $('#countAutorizacoes').textContent = autAtivas > 0
      ? `${autAtivas} autorização(ões) registrada(s)`
      : 'Nenhuma autorização';

    // ===== CONFIGURAÇÕES =====
    $('#countConfig').textContent = 'Ajustes do sistema';

    // ===== ALERTAS / INDICADORES =====
    const chavesEmUso = chaves.filter((r) => r.status === 'em_uso').length;

    // Pessoas no local agora: considera a última movimentação de cada pessoa.
    const porPessoa = new Map();
    movimentacoes.forEach((r) => {
      const key = r.pessoaId || ('nome:' + (r.nome || ''));
      const stamp = String(r.data || '') + ' ' + String(r.horaEntrada || '');
      const prev = porPessoa.get(key);
      if (!prev || stamp >= prev.stamp) porPessoa.set(key, { stamp, r });
    });
    const pessoasDentro = Array.from(porPessoa.values())
      .filter((x) => x.r.status !== 'fora' && !x.r.horaSaida).length;

    // Insumos críticos (sem estoque / crítico / atenção).
    const insumosCriticos = firstAid
      ? (firstAid.inventory || []).filter((i) => Number(i.remaining) <= 3).length
      : 0;

    $('#alertChaves').textContent = chavesEmUso;
    $('#alertEpis').textContent = episPendentes;
    $('#alertDentro').textContent = pessoasDentro;
    $('#alertInsumos').textContent = insumosCriticos;
    const stockEl = document.querySelector('.alert-item.alert-stock');
    if (stockEl) stockEl.classList.toggle('zero', insumosCriticos === 0);

    UI.showToast('Sistema carregado. Selecione um módulo para começar.', 'success');
  } catch (e) {
    console.error('Erro ao carregar resumo do dashboard:', e);
    ['countChaves', 'countVisitantes', 'countEpis', 'countFirstAid', 'countAvisos', 'countOcorrencias',
     'countPessoas', 'countMovimentacoes', 'countAutorizacoes', 'countConfig',
     'alertChaves', 'alertEpis', 'alertDentro', 'alertInsumos'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Pronto para uso';
    });
  }
});
