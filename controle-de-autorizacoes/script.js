/* ===================================================================
   CONTROLE DE AUTORIZAÇÕES - SCRIPT.JS
   ===================================================================
   Módulo de autorizações de acesso: um responsável (morador,
   funcionário ou outro responsável autorizado) autoriza uma pessoa
   (visitante ou prestador) por um período. O documento é opcional.
   Persistência em IndexedDB (stores: pessoas, autorizacoes).
   =================================================================== */

const $ = (sel) => document.querySelector(sel);

// ===== STATE =====
let autorizacoes = [];
let respSelecionado = null;
let pessoaSelecionada = null;
let _config = null;
let _viewId = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  UI.initCommon();
  _config = await Portaria.getConfig();
  setDefaultPeriod();
  $('#autBuscaResp').addEventListener('input', debounceBuscarResp);
  $('#autBuscaPessoa').addEventListener('input', debounceBuscarPessoa);
  $('#novaPessoaForm').addEventListener('submit', (e) => {
    e.preventDefault();
    salvarNovaPessoa();
  });
  await loadRecords();
});

function setDefaultPeriod() {
  const hoje = UI.todayISO();
  $('#autDataInicial').value = hoje;
  $('#autDataFinal').value = hoje;
  $('#autHoraInicial').value = '08:00';
  $('#autHoraFinal').value = '18:00';
}

// ===== CARREGAR =====
async function loadRecords() {
  autorizacoes = await DB.store('autorizacoes').getAll();
  renderHistory();
  updateStatusIndicator();
}

// ===== BUSCA RESPONSÁVEL =====
function debounceBuscarResp() {
  clearTimeout(window._autRespTimer);
  window._autRespTimer = setTimeout(buscarResp, 250);
}

async function buscarResp() {
  const q = $('#autBuscaResp').value.trim();
  if (!q) {
    $('#autRespResultados').classList.remove('open');
    $('#autRespResultados').innerHTML = '';
    return;
  }
  const resultados = await Portaria.searchPessoas(q);
  const permitidos = resultados.filter((p) => podeAutorizar(p.tipo));
  renderLista('#autRespResultados', permitidos, 'selecionarResponsavel', q);
}

function podeAutorizar(tipo) {
  return !!(_config && _config.autorizadores && _config.autorizadores[tipo]);
}

// ===== BUSCA PESSOA AUTORIZADA =====
function debounceBuscarPessoa() {
  clearTimeout(window._autPessoaTimer);
  window._autPessoaTimer = setTimeout(buscarPessoa, 250);
}

async function buscarPessoa() {
  const q = $('#autBuscaPessoa').value.trim();
  const naoEncontrada = $('#autPessoaNaoEncontrada');
  if (!q) {
    $('#autPessoaResultados').classList.remove('open');
    $('#autPessoaResultados').innerHTML = '';
    naoEncontrada.classList.add('hidden');
    return;
  }
  const resultados = await Portaria.searchPessoas(q);
  if (resultados.length === 0) {
    $('#autPessoaResultados').classList.remove('open');
    $('#autPessoaResultados').innerHTML = '';
    naoEncontrada.classList.remove('hidden');
    return;
  }
  naoEncontrada.classList.add('hidden');
  renderLista('#autPessoaResultados', resultados, 'selecionarPessoaAutorizada', q);
}

function renderLista(sel, list, fn, q) {
  const box = $(sel);
  const cards = list.slice(0, 12).map((p) => {
    const vinculo = Portaria.vinculoCurto(p);
    return `
      <li class="es-result-item" onclick="${fn}('${p.id}')">
        <div class="es-result-nome">
          <strong>${UI.escHtml(p.nome)}</strong>
          <span class="badge ${Portaria.tipoBadge(p.tipo)}">${Portaria.tipoLabel(p.tipo)}</span>
        </div>
        <div class="es-result-detalhe">
          ${vinculo ? UI.escHtml(vinculo) + ' &middot; ' : ''}
          ${p.documento ? UI.escHtml(p.documento) + ' &middot; ' : ''}
          ${p.telefone ? UI.escHtml(p.telefone) : ''}
        </div>
      </li>`;
  }).join('');
  box.innerHTML = `<ul class="es-result-list">${cards}</ul>`;
  box.classList.add('open');
}

// ===== SELEÇÕES =====
function selecionarResponsavel(id) {
  Portaria.getPessoa(id).then((p) => {
    if (!p) return UI.showToast('Cadastro não encontrado.', 'error');
    if (!podeAutorizar(p.tipo)) {
      UI.showToast(`${Portaria.tipoLabel(p.tipo)} não pode autorizar. Ajuste em Configurações.`, 'error');
      return;
    }
    respSelecionado = p;
    $('#autBuscaResp').value = p.nome;
    $('#autRespResultados').classList.remove('open');
    $('#autRespResultados').innerHTML = '';
    $('#autRespCard').classList.remove('hidden');
    $('#autRespCard').innerHTML = `
      <div class="aut-selected-head">
        <div>
          <strong>${UI.escHtml(p.nome)}</strong>
          <span class="badge ${Portaria.tipoBadge(p.tipo)}">${Portaria.tipoLabel(p.tipo)}</span>
        </div>
        <button class="btn btn-sm btn-outline-warning" onclick="limparResponsavel()" title="Trocar responsável">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="es-result-detalhe">${UI.escHtml(Portaria.vinculoDaPessoa(p, _config))}</div>
    `;
  });
}

function limparResponsavel() {
  respSelecionado = null;
  $('#autRespCard').classList.add('hidden');
  $('#autRespCard').innerHTML = '';
  $('#autBuscaResp').value = '';
}

function selecionarPessoaAutorizada(id) {
  Portaria.getPessoa(id).then((p) => {
    if (!p) return UI.showToast('Cadastro não encontrado.', 'error');
    pessoaSelecionada = p;
    $('#autBuscaPessoa').value = p.nome;
    $('#autPessoaResultados').classList.remove('open');
    $('#autPessoaResultados').innerHTML = '';
    $('#autPessoaNaoEncontrada').classList.add('hidden');
    $('#autPessoaCard').classList.remove('hidden');
    $('#autPessoaCard').innerHTML = `
      <div class="aut-selected-head">
        <div>
          <strong>${UI.escHtml(p.nome)}</strong>
          <span class="badge ${Portaria.tipoBadge(p.tipo)}">${Portaria.tipoLabel(p.tipo)}</span>
        </div>
        <button class="btn btn-sm btn-outline-warning" onclick="limparPessoaAutorizada()" title="Trocar pessoa">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="es-result-detalhe">${UI.escHtml(Portaria.vinculoDaPessoa(p, _config))}</div>
    `;
    // Ajusta o tipo padrão da autorização ao tipo da pessoa.
    if (p.tipo === 'prestador' || p.tipo === 'morador' || p.tipo === 'funcionario') {
      $('#autTipo').value = p.tipo === 'prestador' ? 'prestador' : 'visitante';
    }
  });
}

function limparPessoaAutorizada() {
  pessoaSelecionada = null;
  $('#autPessoaCard').classList.add('hidden');
  $('#autPessoaCard').innerHTML = '';
  $('#autBuscaPessoa').value = '';
}

// ===== NOVA PESSOA (para autorização) =====
function abrirNovaPessoa() {
  const q = $('#autBuscaPessoa').value.trim();
  $('#npNome').value = q || '';
  $('#npTipo').value = 'visitante';
  $('#npDocumento').value = '';
  $('#npEmpresa').value = '';
  $('#npTelefone').value = '';
  $('#npObs').value = '';
  UI.openModal('novaPessoaModal');
  setTimeout(() => $('#npNome').focus(), 100);
}

async function salvarNovaPessoa() {
  const nome = $('#npNome').value.trim();
  if (!nome) return UI.showToast('Informe o nome da pessoa.', 'error');
  const data = {
    nome,
    tipo: $('#npTipo').value,
    documento: $('#npDocumento').value.trim(),
    empresa: $('#npEmpresa').value.trim(),
    telefone: $('#npTelefone').value.trim(),
    observacoes: $('#npObs').value.trim(),
    ativo: true
  };
  try {
    const duplicados = await Portaria.findDuplicates(data.nome, data.documento, null);
    if (duplicados.length > 0) {
      const tip = duplicados.map((d) => d.nome + ' (' + Portaria.tipoLabel(d.tipo) + ')').join(', ');
      UI.showConfirm(`Já existem pessoas com este nome ou documento: ${tip}. Deseja criar mesmo assim?`, () => {
        criarNovaPessoaEselecionar(data);
      });
      return;
    }
    await criarNovaPessoaEselecionar(data);
  } catch (e) {
    console.error(e);
    UI.showToast('Erro ao cadastrar a pessoa.', 'error');
  }
}

async function criarNovaPessoaEselecionar(data) {
  const p = Object.assign({}, data, { id: UI.generateId(), createdAt: new Date().toISOString() });
  await DB.store('pessoas').add(p);
  UI.closeModal('novaPessoaModal');
  UI.showToast('Pessoa cadastrada com sucesso!', 'success');
  selecionarPessoaAutorizada(p.id);
}

// ===== SALVAR AUTORIZAÇÃO =====
async function salvarAutorizacao() {
  if (!respSelecionado) return UI.showToast('Selecione o responsável pela autorização.', 'error');
  if (!pessoaSelecionada) return UI.showToast('Selecione (ou cadastre) a pessoa autorizada.', 'error');
  if (!podeAutorizar(respSelecionado.tipo)) {
    return UI.showToast(`${Portaria.tipoLabel(respSelecionado.tipo)} não pode autorizar. Ajuste em Configurações.`, 'error');
  }

  const dataInicial = $('#autDataInicial').value;
  const horaInicial = $('#autHoraInicial').value;
  const dataFinal = $('#autDataFinal').value;
  const horaFinal = $('#autHoraFinal').value;
  const forma = $('#autForma').value;
  const tipo = $('#autTipo').value;

  if (!dataInicial || !dataFinal) return UI.showToast('Informe o período da autorização.', 'error');
  const ini = new Date(dataInicial + 'T' + (horaInicial || '00:00'));
  const fim = new Date(dataFinal + 'T' + (horaFinal || '23:59'));
  if (fim < ini) return UI.showToast('A data final deve ser posterior à data inicial.', 'error');

  const record = {
    id: UI.generateId(),
    responsavelId: respSelecionado.id,
    responsavelNome: respSelecionado.nome,
    responsavelTipo: respSelecionado.tipo,
    responsavelUnidadeSetor: respSelecionado.unidade || respSelecionado.setor || '',
    pessoaId: pessoaSelecionada.id,
    pessoaNome: pessoaSelecionada.nome,
    pessoaTipo: tipo,
    pessoaDocumento: pessoaSelecionada.documento || '',
    data: dataInicial,
    dataInicial,
    horaInicial,
    dataFinal,
    horaFinal,
    forma,
    observacoes: $('#autObs').value.trim(),
    status: 'ativa',
    criadaEm: new Date().toISOString(),
    canceladaEm: null,
    createdAt: new Date().toISOString()
  };

  try {
    await DB.store('autorizacoes').add(record);
    UI.showToast('Autorização criada com sucesso!', 'success');
    limparForm();
    await loadRecords();
  } catch (e) {
    console.error(e);
    UI.showToast('Erro ao salvar a autorização.', 'error');
  }
}

// ===== FORM =====
function limparForm() {
  limparResponsavel();
  limparPessoaAutorizada();
  $('#autTipo').value = 'visitante';
  $('#autForma').value = 'telefone';
  $('#autObs').value = '';
  setDefaultPeriod();
}

// ===== LISTA =====
function getFiltered() {
  const busca = Portaria.norm($('#filterBusca').value);
  const statusFiltro = $('#filterStatus').value;

  return autorizacoes
    .filter((a) => {
      const st = Portaria.autorizacaoStatus(a);
      if (statusFiltro && st !== statusFiltro) return false;
      if (busca) {
        const text = Portaria.norm([a.responsavelNome, a.pessoaNome, a.pessoaDocumento].join(' '));
        if (!text.includes(busca)) return false;
      }
      return true;
    })
    .sort((a, b) => (b.data + b.criadaEm).localeCompare(a.data + a.criadaEm));
}

function renderHistory() {
  const tbody = $('#historyBody');
  const empty = $('#emptyHistory');
  const countEl = $('#recordCount');

  const filtered = getFiltered();
  countEl.textContent = filtered.length + ' registro(s)';
  empty.style.display = filtered.length ? 'none' : 'block';
  tbody.innerHTML = '';

  filtered.forEach((a) => {
    const st = Portaria.autorizacaoStatus(a);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${UI.escHtml(a.responsavelNome)}</strong></td>
      <td>${UI.escHtml(a.pessoaNome)}</td>
      <td><span class="badge ${Portaria.tipoBadge(a.pessoaTipo)}">${Portaria.tipoLabel(a.pessoaTipo)}</span></td>
      <td>${UI.escHtml(Portaria.formatPeriodo(a))}</td>
      <td>${formaLabel(a.forma)}</td>
      <td><span class="badge ${Portaria.autorizacaoBadge(st)}">${Portaria.autorizacaoStatusLabel(st)}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-info" onclick="viewAutorizacao('${a.id}')" title="Visualizar">
            <i class="fas fa-eye"></i>
          </button>
          ${st !== 'cancelada'
            ? `<button class="btn btn-sm btn-danger" onclick="cancelarAutorizacao('${a.id}')" title="Cancelar autorização">
                <i class="fas fa-ban"></i>
              </button>`
            : ''}
          <button class="btn btn-sm btn-secondary" onclick="excluirAutorizacao('${a.id}')" title="Excluir registro">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function clearFilters() {
  $('#filterBusca').value = '';
  $('#filterStatus').value = '';
  renderHistory();
}

// ===== VISUALIZAR =====
function viewAutorizacao(id) {
  const a = autorizacoes.find((x) => x.id === id);
  if (!a) return UI.showToast('Registro não encontrado.', 'error');
  _viewId = id;
  const st = Portaria.autorizacaoStatus(a);

  const body = `
    <h3 class="aut-view-title"><i class="fas fa-user-tie"></i> RESPONSÁVEL</h3>
    <div class="aut-view-block">
      <div class="detail-row"><span class="detail-label">Nome</span><span class="detail-value"><strong>${UI.escHtml(a.responsavelNome)}</strong></span></div>
      <div class="detail-row"><span class="detail-label">Tipo</span><span class="detail-value">${Portaria.tipoLabel(a.responsavelTipo)}</span></div>
      <div class="detail-row"><span class="detail-label">Vínculo</span><span class="detail-value">${a.responsavelUnidadeSetor ? UI.escHtml(a.responsavelUnidadeSetor) : '-'}</span></div>
    </div>

    <h3 class="aut-view-title"><i class="fas fa-user-friends"></i> PESSOA AUTORIZADA</h3>
    <div class="aut-view-block">
      <div class="detail-row"><span class="detail-label">Nome</span><span class="detail-value"><strong>${UI.escHtml(a.pessoaNome)}</strong></span></div>
      <div class="detail-row"><span class="detail-label">Tipo</span><span class="detail-value">${Portaria.tipoLabel(a.pessoaTipo)}</span></div>
      <div class="detail-row"><span class="detail-label">Documento</span><span class="detail-value">${a.pessoaDocumento ? UI.escHtml(a.pessoaDocumento) : '<em>Não informado</em>'}</span></div>
    </div>

    <h3 class="aut-view-title"><i class="fas fa-file-contract"></i> AUTORIZAÇÃO</h3>
    <div class="aut-view-block">
      <div class="detail-row"><span class="detail-label">Forma</span><span class="detail-value">${formaLabel(a.forma)}</span></div>
      <div class="detail-row"><span class="detail-label">Criada em</span><span class="detail-value">${formatDateTime(a.criadaEm)}</span></div>
      <div class="detail-row"><span class="detail-label">Válida de</span><span class="detail-value">${UI.formatDate(a.dataInicial)} ${UI.escHtml(a.horaInicial)}</span></div>
      <div class="detail-row"><span class="detail-label">Até</span><span class="detail-value">${UI.formatDate(a.dataFinal)} ${UI.escHtml(a.horaFinal)}</span></div>
      <div class="detail-row"><span class="detail-label">Observações</span><span class="detail-value">${a.observacoes ? UI.escHtml(a.observacoes) : '-'}</span></div>
      <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="badge ${Portaria.autorizacaoBadge(st)}">${Portaria.autorizacaoStatusLabel(st)}</span></span></div>
    </div>
  `;
  $('#viewAutBody').innerHTML = body;
  $('#viewCancelarBtn').style.display = st === 'cancelada' ? 'none' : 'inline-flex';
  UI.openModal('viewAutModal');
}

function closeViewModal() {
  UI.closeModal('viewAutModal');
}

// ===== CANCELAR =====
function cancelarAutorizacao(id) {
  UI.showConfirm('Tem certeza que deseja cancelar esta autorização?', async () => {
    const a = autorizacoes.find((x) => x.id === id);
    if (!a) return;
    await DB.store('autorizacoes').put(Object.assign({}, a, {
      status: 'cancelada',
      canceladaEm: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    UI.showToast('Autorização cancelada.', 'success');
    await loadRecords();
  });
}

function cancelarAutorizacaoModal() {
  if (!_viewId) return;
  cancelarAutorizacao(_viewId);
  UI.closeModal('viewAutModal');
}

// ===== EXCLUIR =====
function excluirAutorizacao(id) {
  UI.showConfirm('Tem certeza que deseja excluir este registro de autorização?', async () => {
    await DB.store('autorizacoes').remove(id);
    await loadRecords();
    UI.showToast('Registro excluído.', 'success');
  });
}

// ===== STATUS =====
function updateStatusIndicator() {
  const ativas = autorizacoes.filter((a) => Portaria.autorizacaoStatus(a) === 'ativa').length;
  $('#statusIndicator').textContent = ativas;
}

// ===== RELATÓRIOS =====
function buildRows(list) {
  return list.map((a) => {
    const st = Portaria.autorizacaoStatus(a);
    return [
      a.responsavelNome || '-',
      Portaria.tipoLabel(a.responsavelTipo),
      a.pessoaNome || '-',
      Portaria.tipoLabel(a.pessoaTipo),
      a.pessoaDocumento || 'Não informado',
      Portaria.formatPeriodo(a),
      formaLabel(a.forma),
      Portaria.autorizacaoStatusLabel(st)
    ];
  });
}

function generateDayReport() {
  const today = UI.todayISO();
  const list = autorizacoes.filter((a) => a.data === today);
  if (list.length === 0) return UI.showToast('Nenhuma autorização criada hoje.', 'warning');

  UI.buildPdf({
    title: 'AUTORIZAÇÕES',
    subtitle: 'Relatório do Dia',
    period: UI.formatDate(today),
    orientation: 'l',
    columns: ['Responsável', 'Tipo Resp.', 'Autorizado', 'Tipo', 'Doc.', 'Período', 'Forma', 'Status'],
    rows: buildRows(list),
    filename: `relatorio_autorizacoes_dia_${today}.pdf`
  });
}

function openPeriodReport() {
  UI.openReportModal((start, end) => generatePeriodReport(start, end));
}

function generatePeriodReport(start, end) {
  const list = autorizacoes
    .filter((a) => a.data >= start && a.data <= end)
    .sort((a, b) => (a.data + a.criadaEm).localeCompare(b.data + b.criadaEm));
  if (list.length === 0) return UI.showToast('Nenhuma autorização no período informado.', 'warning');

  UI.buildPdf({
    title: 'AUTORIZAÇÕES',
    subtitle: 'Relatório por Período',
    period: `${UI.formatDate(start)} a ${UI.formatDate(end)}`,
    orientation: 'l',
    columns: ['Responsável', 'Tipo Resp.', 'Autorizado', 'Tipo', 'Doc.', 'Período', 'Forma', 'Status'],
    rows: buildRows(list),
    filename: `relatorio_autorizacoes_${start}_a_${end}.pdf`
  });
}

// ===== EXCEL =====
function exportExcelAutorizacoes() {
  const rows = getFiltered().map((a) => ({
    'Responsável': a.responsavelNome || '',
    'Tipo do responsável': Portaria.tipoLabel(a.responsavelTipo),
    'Autorizado': a.pessoaNome || '',
    'Tipo do autorizado': Portaria.tipoLabel(a.pessoaTipo),
    'Documento': a.pessoaDocumento || '',
    'Data inicial': UI.formatDate(a.dataInicial),
    'Hora inicial': a.horaInicial || '',
    'Data final': UI.formatDate(a.dataFinal),
    'Hora final': a.horaFinal || '',
    'Forma': formaLabel(a.forma),
    'Observações': a.observacoes || '',
    'Status': Portaria.autorizacaoStatusLabel(Portaria.autorizacaoStatus(a))
  }));
  UI.exportExcel(rows, Object.keys(rows[0] || {}), `autorizacoes_${UI.todayISO()}.xlsx`);
}

// ===== BACKUP =====
function toggleBackupModal() {
  const el = document.getElementById('backupModal');
  if (el) el.classList.toggle('active');
}

async function exportBackupAutorizacoes() {
  try {
    const dados = {
      autorizacoes: await DB.exportStore('autorizacoes'),
      pessoas: await DB.exportStore('pessoas')
    };
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    await UI.saveFile(blob, 'backup_autorizacoes_' + UI.todayISO() + '.json');
    UI.showToast('Backup exportado com sucesso!', 'success');
  } catch (e) {
    console.error(e);
    UI.showToast('Erro ao exportar backup.', 'error');
  }
}

async function importBackupAutorizacoes(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data && Array.isArray(data.autorizacoes)) {
        await DB.importStore('autorizacoes', data.autorizacoes);
      } else if (Array.isArray(data)) {
        await DB.importStore('autorizacoes', data);
      }
      if (Array.isArray(data.pessoas)) {
        await DB.importStore('pessoas', data.pessoas);
      }
      await loadRecords();
      UI.closeModal('backupModal');
      UI.showToast('Backup importado com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      UI.showToast('Arquivo de backup inválido.', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ===== HELPERS =====
function formaLabel(forma) {
  const map = { email: 'E-mail', telefone: 'Telefone', presencial: 'Presencial', sistema: 'Sistema', outro: 'Outro' };
  return map[forma] || forma || '-';
}

function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}