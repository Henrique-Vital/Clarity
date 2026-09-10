/* ===================================================================
   CONTROLE DE OCORRÊNCIAS - SCRIPT.JS
   ===================================================================
   Módulo de ocorrências da portaria da Clarity Glass.
   Persistência em IndexedDB (store: ocorrencias).
   =================================================================== */

// ===== DOM REFS =====
const $ = (sel) => document.querySelector(sel);

// ===== STATE =====
let records = [];
let editingId = null;
let lastSelectedId = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  UI.initCommon();
  setDefaultDate();
  bindEvents();
  await loadRecords();
});

// ===== DATA PADRÃO =====
function setDefaultDate() {
  const dateEl = $('#occData');
  if (!dateEl.value) dateEl.value = UI.todayISO();
}

// ===== EVENTOS =====
function bindEvents() {
  $('#ocorrenciaForm').addEventListener('submit', (e) => {
    e.preventDefault();
    save();
  });
}

// ===== LOAD =====
async function loadRecords() {
  records = await DB.store('ocorrencias').getAll();
  renderHistory();
}

// ===== COLETA DO FORMULÁRIO =====
function collectForm() {
  return {
    data: $('#occData').value,
    porteiro: $('#occPorteiro').value.trim(),
    descricao: $('#occDescricao').value.trim()
  };
}

function fillForm(r) {
  $('#occData').value = r.data || '';
  $('#occPorteiro').value = r.porteiro || '';
  $('#occDescricao').value = r.descricao || '';
}

// ===== SALVAR =====
async function save() {
  const data = $('#occData').value;
  const porteiro = $('#occPorteiro').value.trim();
  const descricao = $('#occDescricao').value.trim();

  if (!data) return UI.showToast('Informe a data.', 'error');
  if (!porteiro) return UI.showToast('Informe o nome do porteiro.', 'error');
  if (!descricao) return UI.showToast('Descreva a ocorrência.', 'error');

  const base = collectForm();
  if (editingId) {
    const existing = records.find((r) => r.id === editingId);
    const updated = Object.assign({}, existing, base, { updatedAt: new Date().toISOString() });
    await DB.store('ocorrencias').put(updated);
    UI.showToast('Ocorrência atualizada com sucesso!', 'success');
  } else {
    const record = Object.assign({}, base, {
      id: UI.generateId(),
      createdAt: new Date().toISOString()
    });
    await DB.store('ocorrencias').add(record);
    UI.showToast('Ocorrência registrada com sucesso!', 'success');
  }

  editingId = null;
  lastSelectedId = null;
  clearForm();
  await loadRecords();
}

// ===== FORM =====
function clearForm() {
  editingId = null;
  $('#occData').value = UI.todayISO();
  $('#occPorteiro').value = '';
  $('#occDescricao').value = '';
}

function loadIntoForm(id) {
  const r = records.find((rec) => rec.id === id);
  if (!r) {
    UI.showToast('Registro não encontrado.', 'error');
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
  UI.showConfirm('Tem certeza que deseja excluir esta ocorrência? Esta ação não pode ser desfeita.', async () => {
    await DB.store('ocorrencias').remove(id);
    editingId = null;
    lastSelectedId = null;
    clearForm();
    await loadRecords();
    UI.showToast('Ocorrência excluída com sucesso.', 'success');
  });
}

function deleteRecord(id) {
  lastSelectedId = id;
  UI.showConfirm('Tem certeza que deseja excluir esta ocorrência? Esta ação não pode ser desfeita.', async () => {
    await DB.store('ocorrencias').remove(id);
    if (editingId === id) {
      editingId = null;
      clearForm();
    }
    if (lastSelectedId === id) lastSelectedId = null;
    await loadRecords();
    UI.showToast('Ocorrência excluída com sucesso.', 'success');
  });
}

// ===== VISUALIZAR =====
function viewRecord(id) {
  const r = records.find((rec) => rec.id === id);
  if (!r) return UI.showToast('Registro não encontrado.', 'error');
  lastSelectedId = id;

  const body = $('#viewModalBody');
  const rows = [
    ['Data', UI.formatDate(r.data)],
    ['Nome do Porteiro', UI.escHtml(r.porteiro)],
    ['Descrição da ocorrência', UI.escHtml(r.descricao)]
  ];

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
  const texto = ($('#filterTexto').value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return records
    .filter((r) => {
      if (data && r.data !== data) return false;
      if (texto) {
        const search = (r.porteiro + ' ' + r.descricao)
          .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (!search.includes(texto)) return false;
      }
      return true;
    })
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}

function renderHistory() {
  const tbody = $('#historyBody');
  const empty = $('#emptyHistory');
  const countEl = $('#recordCount');

  const filtered = getFiltered();
  countEl.textContent = filtered.length + ' registro(s)';
  empty.style.display = filtered.length ? 'none' : 'block';
  tbody.innerHTML = '';

  filtered.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${UI.formatDate(r.data)}</td>
      <td>${UI.escHtml(r.porteiro)}</td>
      <td>${UI.escHtml(r.descricao)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-info" onclick="viewRecord('${r.id}')" title="Visualizar">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-primary" onclick="loadIntoForm('${r.id}')" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteRecord('${r.id}')" title="Excluir">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ===== RELATÓRIOS =====
function buildRows(list) {
  return list.map((r) => [
    UI.formatDate(r.data),
    r.porteiro || '-',
    r.descricao || '-'
  ]);
}

function generateDayReport() {
  const today = UI.todayISO();
  const list = getFiltered().filter((r) => r.data === today);
  if (list.length === 0) return UI.showToast('Nenhuma ocorrência hoje.', 'warning');

  UI.buildPdf({
    title: 'OCORRÊNCIAS',
    subtitle: 'Relatório do Dia',
    period: UI.formatDate(today),
    columns: ['Data', 'Porteiro', 'Descrição'],
    rows: buildRows(list),
    filename: `relatorio_ocorrencias_dia_${today}.pdf`
  });
}

function openPeriodReport() {
  UI.openReportModal((start, end) => generatePeriodReport(start, end));
}

function generatePeriodReport(start, end) {
  const list = records
    .filter((r) => r.data >= start && r.data <= end)
    .sort((a, b) => (a.data || '').localeCompare(b.data || ''));
  if (list.length === 0) return UI.showToast('Nenhuma ocorrência no período informado.', 'warning');

  UI.buildPdf({
    title: 'OCORRÊNCIAS',
    subtitle: 'Relatório por Período',
    period: `${UI.formatDate(start)} a ${UI.formatDate(end)}`,
    columns: ['Data', 'Porteiro', 'Descrição'],
    rows: buildRows(list),
    filename: `relatorio_ocorrencias_${start}_a_${end}.pdf`
  });
}

// ===== EXCEL =====
function exportExcelOcorrencias() {
  const rows = getFiltered().map((r) => ({
    'Data': UI.formatDate(r.data),
    'Porteiro': r.porteiro || '',
    'Descrição da ocorrência': r.descricao || ''
  }));
  UI.exportExcel(rows, Object.keys(rows[0] || {}), `ocorrencias_${UI.todayISO()}.xlsx`);
}

// ===== BACKUP =====
function toggleBackupModal() {
  const el = document.getElementById('backupModal');
  if (el) el.classList.toggle('active');
}

async function exportBackupOcorrencias() {
  try {
    const data = await DB.exportStore('ocorrencias');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    await UI.saveFile(blob, 'backup_ocorrencias_' + UI.todayISO() + '.json');
    UI.showToast('Backup exportado com sucesso!', 'success');
  } catch (e) {
    console.error(e);
    UI.showToast('Erro ao exportar backup.', 'error');
  }
}

async function importBackupOcorrencias(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('Formato inválido');
      await DB.importStore('ocorrencias', data);
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