/* ===================================================================
   CONTROLE DE EPIs - SCRIPT.JS
   ===================================================================
   Módulo de controle de EPIs da portaria da Clarity Glass.
   Persistência em IndexedDB (store: epis).
   =================================================================== */

// ===== EPIs DISPONÍVEIS =====
const EPI_OPTIONS = ['Capacete', 'Óculos', 'Mangote', 'Protetor Auricular'];

// ===== DOM REFS =====
const $ = (sel) => document.querySelector(sel);

// ===== STATE =====
let records = [];
let editingId = null;
let lastSelectedId = null;
const PAGE_SIZE = 20;
let epiPage = 1;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  UI.initCommon();
  setDefaultDateTime();
  bindEvents();
  await loadRecords();
});

// ===== DATA PADRÃO =====
function setDefaultDateTime() {
  const dateEl = $('#epiData');
  const timeEl = $('#epiHora');
  if (!dateEl.value) dateEl.value = UI.todayISO();
  if (!timeEl.value) timeEl.value = UI.nowTime();
}

// ===== EVENTOS =====
function bindEvents() {
  $('#epiForm').addEventListener('submit', (e) => {
    e.preventDefault();
    save();
  });
  $('#epiOperacao').addEventListener('change', () => {
    updateOperationUI();
    populateOpenSelect();
  });
  $('#epiOpenSelect').addEventListener('change', () => {
    fillFromOpenEntrega();
  });

  // Estilo visual dos checkboxes + habilita quantidade
  EPI_OPTIONS.forEach((name) => {
    const input = document.getElementById(epiCheckboxId(name));
    input.addEventListener('change', () => {
      input.closest('.epi-check').classList.toggle('checked', input.checked);
      const qty = document.getElementById(epiQtyInputId(name));
      if (qty) {
        qty.disabled = !input.checked;
        if (!input.checked) qty.value = 1;
      }
    });
  });
}

// ===== HELPERS DE EPIs =====
function epiCheckboxId(name) {
  const map = {
    'Capacete': 'epiCapacete',
    'Óculos': 'epiOculos',
    'Mangote': 'epiMangote',
    'Protetor Auricular': 'epiProtetor'
  };
  return map[name];
}

function epiQtyInputId(name) {
  return epiCheckboxId(name) + 'Qtd';
}

function getSelectedEpis() {
  return EPI_OPTIONS.filter((name) => {
    const input = document.getElementById(epiCheckboxId(name));
    return input && input.checked;
  });
}

function getSelectedEpisQtd() {
  const map = {};
  EPI_OPTIONS.forEach((name) => {
    const input = document.getElementById(epiCheckboxId(name));
    const qty = document.getElementById(epiQtyInputId(name));
    if (input && input.checked && qty) {
      const n = parseInt(qty.value, 10);
      map[name] = Number.isFinite(n) && n >= 1 ? n : 1;
    }
  });
  return map;
}

function setEpis(list, qtdMap) {
  const arr = list || [];
  EPI_OPTIONS.forEach((name) => {
    const input = document.getElementById(epiCheckboxId(name));
    const checked = arr.includes(name);
    input.checked = checked;
    input.closest('.epi-check').classList.toggle('checked', checked);
    const qty = document.getElementById(epiQtyInputId(name));
    if (qty) {
      const val = (qtdMap && qtdMap[name] && qtdMap[name] > 0) ? qtdMap[name] : 1;
      qty.value = val;
      qty.disabled = !checked;
    }
  });
}

function clearEpis() {
  setEpis([]);
}

function formatEpiList(r) {
  const arr = r.epis || [];
  const qtd = r.episQtd || {};
  if (arr.length === 0) return '-';
  return arr.map((e) => (qtd[e] > 1 ? `${e} x${qtd[e]}` : e)).join(', ');
}

function renderEpiBadges(list, qtdMap) {
  const arr = list || [];
  if (arr.length === 0) return '<span class="badge badge-dark">Nenhum</span>';
  return arr.map((e) => {
    const qtd = (qtdMap && qtdMap[e]) ? qtdMap[e] : 1;
    return `<span class="badge badge-info">${UI.escHtml(e)}${qtd > 1 ? ` x${qtd}` : ''}</span>`;
  }).join(' ');
}

// ===== OPERAÇÃO UI =====
function updateOperationUI() {
  const operacao = $('#epiOperacao').value;
  const btn = $('#epiSubmitBtn');
  const openGroup = $('#epiOpenGroup');

  if (operacao === 'devolucao') {
    btn.className = 'btn btn-success';
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Registrar Devolução';
    openGroup.classList.remove('hidden');
  } else {
    btn.className = 'btn btn-primary';
    btn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Registrar Entrega';
    openGroup.classList.add('hidden');
  }
}

// ===== LOAD =====
async function loadRecords() {
  records = await DB.store('epis').getAll();
  epiPage = 1;
  renderHistory();
  updateStatusIndicator();
  populateOpenSelect();
}

function getPendentes() {
  return records.filter((r) => r.status === 'pendente');
}

function populateOpenSelect() {
  const select = $('#epiOpenSelect');
  if (!$('#epiOpenGroup').classList.contains('hidden')) {
    const pendentes = getPendentes().sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    select.innerHTML = '<option value="">-- Selecione a entrega a devolver --</option>' +
      pendentes.map((r) =>
        `<option value="${r.id}">${UI.escHtml(r.visitante)} - ${UI.formatDate(r.data)} ${UI.escHtml(r.hora)} (${UI.escHtml(formatEpiList(r))})</option>`
      ).join('');
  }
}

function fillFromOpenEntrega() {
  const id = $('#epiOpenSelect').value;
  if (!id) return;
  const r = records.find((rec) => rec.id === id);
  if (!r) return;
  $('#epiVisitante').value = r.visitante || '';
  $('#epiPorteiro').value = r.porteiro || '';
  $('#epiResponsavel').value = r.responsavel || '';
  setEpis(r.epis, r.episQtd);
}

// ===== COLETA DO FORMULÁRIO =====
function collectForm() {
  return {
    data: $('#epiData').value,
    hora: $('#epiHora').value,
    visitante: $('#epiVisitante').value.trim(),
    porteiro: $('#epiPorteiro').value.trim(),
    responsavel: $('#epiResponsavel').value.trim(),
    epis: getSelectedEpis(),
    episQtd: getSelectedEpisQtd(),
    observacoes: $('#epiObs').value.trim()
  };
}

function fillForm(r) {
  $('#epiOperacao').value = r.operacao || 'entrega';
  $('#epiData').value = r.data || '';
  $('#epiHora').value = r.hora || '';
  $('#epiVisitante').value = r.visitante || '';
  $('#epiPorteiro').value = r.porteiro || '';
  $('#epiResponsavel').value = r.responsavel || '';
  setEpis(r.epis, r.episQtd);
  $('#epiObs').value = r.observacoes || '';
  updateOperationUI();
}

// ===== SALVAR =====
async function save() {
  const operacao = $('#epiOperacao').value;
  const data = $('#epiData').value;
  const hora = $('#epiHora').value;

  if (!data || !hora) return UI.showToast('Informe data e hora.', 'error');

  if (operacao === 'entrega') {
    const visitante = $('#epiVisitante').value.trim();
    const porteiro = $('#epiPorteiro').value.trim();
    const responsavel = $('#epiResponsavel').value.trim();
    const epis = getSelectedEpis();

    if (!visitante) return UI.showToast('Informe o nome do visitante.', 'error');
    if (!porteiro) return UI.showToast('Informe o nome do porteiro.', 'error');
    if (!responsavel) return UI.showToast('Informe o responsável da Clarity.', 'error');
    if (epis.length === 0) return UI.showToast('Selecione ao menos um EPI.', 'error');    const base = collectForm();
    base.operacao = 'entrega';
    base.status = 'pendente';

    if (editingId) {
      const existing = records.find((r) => r.id === editingId);
      const updated = Object.assign({}, existing, base, { updatedAt: new Date().toISOString() });
      await DB.store('epis').put(updated);
      UI.showToast('Entrega de EPIs atualizada com sucesso!', 'success');
    } else {
      const record = Object.assign({}, base, {
        id: UI.generateId(),
        createdAt: new Date().toISOString()
      });
      await DB.store('epis').add(record);
      UI.showToast('Entrega de EPIs registrada com sucesso!', 'success');
    }
  } else {
    // ===== Devolução =====
    const openId = $('#epiOpenSelect').value;
    if (!openId) return UI.showToast('Selecione a entrega a devolver.', 'error');

    const existing = records.find((r) => r.id === openId);
    if (!existing) return UI.showToast('Entrega não encontrada.', 'error');
    if (existing.status !== 'pendente') return UI.showToast('Esta entrega já foi devolvida.', 'error');

    existing.status = 'devolvido';
    existing.retornoData = data;
    existing.retornoHora = hora;
    existing.retornoDataHora = `${data}T${hora}:00`;
    existing.retornoObservacao = $('#epiObs').value.trim();
    existing.updatedAt = new Date().toISOString();
    await DB.store('epis').put(existing);
    UI.showToast('Devolução de EPIs registrada com sucesso!', 'success');
  }

  editingId = null;
  lastSelectedId = null;
  clearForm();
  await loadRecords();
  updateOperationUI();
}

// ===== FORM =====
function clearForm() {
  editingId = null;
  $('#epiOperacao').value = 'entrega';
  $('#epiData').value = UI.todayISO();
  $('#epiHora').value = UI.nowTime();
  $('#epiVisitante').value = '';
  $('#epiPorteiro').value = '';
  $('#epiResponsavel').value = '';
  clearEpis();
  $('#epiObs').value = '';
  $('#epiOpenSelect').value = '';
  updateOperationUI();
}

function loadIntoForm(id) {
  const r = records.find((rec) => rec.id === id);
  if (!r) {
    UI.showToast('Registro não encontrado.', 'error');
    return;
  }
  if (r.status === 'devolvido') {
    UI.showToast('Este registro já foi devolvido e não pode ser editado.', 'warning');
    return;
  }
  lastSelectedId = id;
  editingId = id;
  fillForm(r);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== EXCLUIR =====
function deleteSelected() {
  if (!editingId && !lastSelectedId) {
    UI.showToast('Nenhum registro selecionado para excluir.', 'warning');
    return;
  }
  const id = editingId || lastSelectedId;
  UI.showConfirm('Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.', async () => {
    await DB.store('epis').remove(id);
    editingId = null;
    lastSelectedId = null;
    clearForm();
    await loadRecords();
    UI.showToast('Registro excluído com sucesso.', 'success');
  });
}

function deleteRecord(id) {
  lastSelectedId = id;
  UI.showConfirm('Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.', async () => {
    await DB.store('epis').remove(id);
    if (editingId === id) {
      editingId = null;
      clearForm();
    }
    if (lastSelectedId === id) lastSelectedId = null;
    await loadRecords();
    UI.showToast('Registro excluído com sucesso.', 'success');
  });
}

// ===== VISUALIZAR =====
function viewRecord(id) {
  const r = records.find((rec) => rec.id === id);
  if (!r) return UI.showToast('Registro não encontrado.', 'error');
  lastSelectedId = id;

  const body = $('#viewModalBody');
  const statusBadge = r.status === 'devolvido'
    ? '<span class="badge badge-success">Devolvido</span>'
    : '<span class="badge badge-warning">Pendente</span>';

  const rows = [
    ['Data', UI.formatDate(r.data)],
    ['Hora', UI.escHtml(r.hora)],
    ['Visitante', UI.escHtml(r.visitante)],
    ['Porteiro', UI.escHtml(r.porteiro)],
    ['Responsável da Clarity', UI.escHtml(r.responsavel)],
    ['EPIs', renderEpiBadges(r.epis, r.episQtd)],
    ['Operação', r.operacao === 'devolucao' ? 'Devolução' : 'Entrega'],
    ['Status', statusBadge]
  ];

  if (r.status === 'devolvido') {
    rows.push(['Devolvido em', `${UI.formatDate(r.retornoData)} ${UI.escHtml(r.retornoHora)}`]);
    if (r.retornoObservacao) rows.push(['Observação (devolução)', UI.escHtml(r.retornoObservacao)]);
  }
  if (r.observacoes) rows.push(['Observações', UI.escHtml(r.observacoes)]);

  body.innerHTML = rows.map(([label, value]) => `
    <div class="detail-row">
      <span class="detail-label">${label}</span>
      <span class="detail-value">${value}</span>
    </div>
  `).join('');

  UI.openModal('viewModal');
}

function closeViewModal() {
  UI.closeModal('viewModal');
}

// ===== HISTÓRICO =====
function getFiltered() {
  const data = $('#filterData').value;
  const nome = ($('#filterNome').value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const status = $('#filterStatus').value;

  return records
    .filter((r) => {
      if (data && r.data !== data) return false;
      if (status && r.status !== status) return false;
      if (nome) {
        const text = (r.visitante + ' ' + r.porteiro + ' ' + r.responsavel)
          .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (!text.includes(nome)) return false;
      }
      return true;
    })
    .sort((a, b) => (b.data + 'T' + (b.hora || '00:00')).localeCompare(a.data + 'T' + (a.hora || '00:00')));
}

function renderHistory() {
  const tbody = $('#historyBody');
  const empty = $('#emptyHistory');
  const countEl = $('#recordCount');

  const filtered = getFiltered();
  const total = filtered.length;
  countEl.textContent = total + ' registro(s)';
  empty.style.display = total ? 'none' : 'block';

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (epiPage > totalPages) epiPage = totalPages;
  if (epiPage < 1) epiPage = 1;
  const slice = filtered.slice((epiPage - 1) * PAGE_SIZE, epiPage * PAGE_SIZE);

  tbody.innerHTML = '';

  slice.forEach((r) => {
    const statusBadge = r.status === 'devolvido'
      ? '<span class="badge badge-success">Devolvido</span>'
      : '<span class="badge badge-warning">Pendente</span>';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${UI.formatDate(r.data)}</td>
      <td>${UI.escHtml(r.hora)}</td>
      <td><strong>${UI.escHtml(r.visitante)}</strong></td>
      <td>${UI.escHtml(r.porteiro)}</td>
      <td>${UI.escHtml(r.responsavel)}</td>
      <td>${renderEpiBadges(r.epis, r.episQtd)}</td>
      <td>${r.operacao === 'devolucao' ? 'Devolução' : 'Entrega'}</td>
      <td>${statusBadge}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-info" onclick="viewRecord('${r.id}')" title="Visualizar">
            <i class="fas fa-eye"></i>
          </button>
          ${r.status === 'pendente' ? `
          <button class="btn btn-sm btn-primary" onclick="loadIntoForm('${r.id}')" title="Editar">
            <i class="fas fa-edit"></i>
          </button>` : ''}
          <button class="btn btn-sm btn-danger" onclick="deleteRecord('${r.id}')" title="Excluir">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination(total, totalPages);
}

// ===== PAGINAÇÃO =====
function renderPagination(total, totalPages) {
  const pag = $('#epiPagination');
  if (!pag) return;
  if (total === 0) { pag.style.display = 'none'; return; }
  pag.style.display = 'flex';
  const prev = $('#epiPrevBtn');
  const next = $('#epiNextBtn');
  const info = $('#epiPageInfo');
  const from = (epiPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(epiPage * PAGE_SIZE, total);
  info.textContent = `${from}-${to} de ${total}`;
  if (prev) prev.disabled = epiPage <= 1;
  if (next) next.disabled = epiPage >= totalPages;
}

function changePage(delta) {
  epiPage += delta;
  renderHistory();
}

function onFilterChange() {
  epiPage = 1;
  renderHistory();
}

// ===== STATUS =====
function updateStatusIndicator() {
  $('#statusIndicator').textContent = getPendentes().length;
}

// ===== RELATÓRIOS =====
function buildRows(list) {
  return list.map((r) => [
    UI.formatDate(r.data),
    r.hora || '-',
    r.visitante || '-',
    r.porteiro || '-',
    r.responsavel || '-',
    (r.epis || []).length ? formatEpiList(r) : '-',
    r.operacao === 'devolucao' ? 'Devolução' : 'Entrega',
    r.status === 'devolvido' ? 'Devolvido' : 'Pendente'
  ]);
}

function generateDayReport() {
  const today = UI.todayISO();
  const list = getFiltered().filter((r) => r.data === today);
  if (list.length === 0) return UI.showToast('Nenhuma movimentação de EPIs hoje.', 'warning');

  UI.buildPdf({
    title: 'CONTROLE DE EPIs',
    subtitle: 'Relatório do Dia',
    period: UI.formatDate(today),
    columns: ['Data', 'Hora', 'Visitante', 'Porteiro', 'Responsável', 'EPIs', 'Operação', 'Status'],
    rows: buildRows(list),
    filename: `relatorio_epis_dia_${today}.pdf`
  });
}

function openPeriodReport() {
  UI.openReportModal((start, end) => generatePeriodReport(start, end));
}

function generatePeriodReport(start, end) {
  const list = records
    .filter((r) => r.data >= start && r.data <= end)
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  if (list.length === 0) return UI.showToast('Nenhuma movimentação no período informado.', 'warning');

  UI.buildPdf({
    title: 'CONTROLE DE EPIs',
    subtitle: 'Relatório por Período',
    period: `${UI.formatDate(start)} a ${UI.formatDate(end)}`,
    columns: ['Data', 'Hora', 'Visitante', 'Porteiro', 'Responsável', 'EPIs', 'Operação', 'Status'],
    rows: buildRows(list),
    filename: `relatorio_epis_${start}_a_${end}.pdf`
  });
}

// ===== EXCEL =====
function exportExcelEpis() {
  const rows = getFiltered().map((r) => ({
    'Data': UI.formatDate(r.data),
    'Hora': r.hora || '',
    'Visitante': r.visitante || '',
    'Porteiro': r.porteiro || '',
    'Responsável': r.responsavel || '',
    'EPIs': (r.epis || []).length ? formatEpiList(r) : '',
    'Operação': r.operacao === 'devolucao' ? 'Devolução' : 'Entrega',
    'Status': r.status === 'devolvido' ? 'Devolvido' : 'Pendente',
    'Devolvido em': r.status === 'devolvido' ? `${UI.formatDate(r.retornoData)} ${r.retornoHora}` : '',
    'Observações': r.observacoes || ''
  }));
  UI.exportExcel(rows, Object.keys(rows[0] || {}), `epis_${UI.todayISO()}.xlsx`);
}

// ===== BACKUP =====
function toggleBackupModal() {
  const el = document.getElementById('backupModal');
  if (el) el.classList.toggle('active');
}

async function exportBackupEpis() {
  try {
    const data = await DB.exportStore('epis');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    await UI.saveFile(blob, 'backup_epis_' + UI.todayISO() + '.json');
    UI.showToast('Backup exportado com sucesso!', 'success');
  } catch (e) {
    console.error(e);
    UI.showToast('Erro ao exportar backup.', 'error');
  }
}

async function importBackupEpis(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('Formato inválido');
      await DB.importStore('epis', data);
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
