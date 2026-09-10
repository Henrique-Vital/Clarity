/* ===================================================================
   CONTROLE DE AVISOS E RECADOS - SCRIPT.JS
   ===================================================================
   Módulo de avisos e recados da portaria da Clarity Glass.
   Persistência em IndexedDB (store: avisos).
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
  setDefaultDateTime();
  bindEvents();
  await loadRecords();
});

// ===== DATA PADRÃO =====
function setDefaultDateTime() {
  const dateEl = $('#avisoData');
  const timeEl = $('#avisoHora');
  if (!dateEl.value) dateEl.value = UI.todayISO();
  if (!timeEl.value) timeEl.value = UI.nowTime();
}

// ===== EVENTOS =====
function bindEvents() {
  $('#avisoForm').addEventListener('submit', (e) => {
    e.preventDefault();
    save();
  });
}

// ===== LOAD =====
async function loadRecords() {
  records = await DB.store('avisos').getAll();
  renderHistory();
}

// ===== COLETA DO FORMULÁRIO =====
function collectForm() {
  return {
    data: $('#avisoData').value,
    hora: $('#avisoHora').value,
    porteiro: $('#avisoPorteiro').value.trim(),
    nome: $('#avisoNome').value.trim(),
    texto: $('#avisoTexto').value.trim(),
    alarme: $('#avisoAlarme').checked,
    recorrencia: $('#avisoRecorrencia').value,
    alarmeHora: $('#avisoAlarmeHora').value,
    diaSemana: $('#avisoDiaSemana').value,
    alarmeData: $('#avisoAlarmeData').value
  };
}

function fillForm(r) {
  $('#avisoData').value = r.data || '';
  $('#avisoHora').value = r.hora || '';
  $('#avisoPorteiro').value = r.porteiro || '';
  $('#avisoNome').value = r.nome || '';
  $('#avisoTexto').value = r.texto || '';
  $('#avisoAlarme').checked = !!r.alarme;
  $('#avisoRecorrencia').value = r.recorrencia || 'data';
  $('#avisoAlarmeHora').value = r.alarmeHora || '';
  $('#avisoDiaSemana').value = r.diaSemana != null ? String(r.diaSemana) : '1';
  $('#avisoAlarmeData').value = r.alarmeData || '';
  toggleAlarmFields();
}

// ===== CAMPOS DE ALARME =====
function toggleAlarmFields() {
  const on = $('#avisoAlarme').checked;
  $('#alarmFields').classList.toggle('hidden', !on);
  toggleAlarmRecorrencia();
}

function toggleAlarmRecorrencia() {
  const rec = $('#avisoRecorrencia').value;
  $('#alarmDataGroup').classList.toggle('hidden', rec !== 'data');
  $('#alarmSemanaGroup').classList.toggle('hidden', rec !== 'semanal');
}

function formatAlarm(r) {
  if (!r.alarme) return '<span style="color:var(--text-secondary)">-</span>';
  const hora = r.alarmeHora || r.hora || '--:--';
  const rec = r.recorrencia || 'data';
  let label;
  if (rec === 'diario') label = `Diário ${hora}`;
  else if (rec === 'semanal') {
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    label = `${dias[Number(r.diaSemana)]} ${hora}`;
  } else {
    label = `${UI.formatDate(r.alarmeData || r.data)} ${hora}`;
  }
  return `<span class="badge badge-alarme"><i class="fas fa-bell"></i> ${label}</span>`;
}

// ===== SALVAR =====
async function save() {
  const data = $('#avisoData').value;
  const hora = $('#avisoHora').value;
  const porteiro = $('#avisoPorteiro').value.trim();
  const nome = $('#avisoNome').value.trim();
  const texto = $('#avisoTexto').value.trim();

  if (!data) return UI.showToast('Informe a data.', 'error');
  if (!hora) return UI.showToast('Informe a hora.', 'error');
  if (!porteiro) return UI.showToast('Informe o nome do porteiro.', 'error');
  if (!nome) return UI.showToast('Informe o nome de quem deixou o recado.', 'error');
  if (!texto) return UI.showToast('Informe o texto do aviso/recado.', 'error');

  if ($('#avisoAlarme').checked) {
    const alarmeHora = $('#avisoAlarmeHora').value;
    if (!alarmeHora) return UI.showToast('Informe o horário do alarme.', 'error');
    const rec = $('#avisoRecorrencia').value;
    if (rec === 'data' && !$('#avisoAlarmeData').value) {
      return UI.showToast('Informe a data do alarme.', 'error');
    }
  }

  const base = collectForm();
  if (editingId) {
    const existing = records.find((r) => r.id === editingId);
    const updated = Object.assign({}, existing, base, { updatedAt: new Date().toISOString() });
    await DB.store('avisos').put(updated);
    UI.showToast('Aviso atualizado com sucesso!', 'success');
  } else {
    const record = Object.assign({}, base, {
      id: UI.generateId(),
      createdAt: new Date().toISOString()
    });
    await DB.store('avisos').add(record);
    UI.showToast('Aviso registrado com sucesso!', 'success');
  }

  editingId = null;
  lastSelectedId = null;
  clearForm();
  await loadRecords();
}

// ===== FORM =====
function clearForm() {
  editingId = null;
  $('#avisoData').value = UI.todayISO();
  $('#avisoHora').value = UI.nowTime();
  $('#avisoPorteiro').value = '';
  $('#avisoNome').value = '';
  $('#avisoTexto').value = '';
  $('#avisoAlarme').checked = false;
  $('#avisoRecorrencia').value = 'data';
  $('#avisoAlarmeHora').value = '';
  $('#avisoDiaSemana').value = '1';
  $('#avisoAlarmeData').value = '';
  $('#alarmFields').classList.add('hidden');
  $('#alarmDataGroup').classList.remove('hidden');
  $('#alarmSemanaGroup').classList.add('hidden');
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
  UI.showConfirm('Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.', async () => {
    await DB.store('avisos').remove(id);
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
    await DB.store('avisos').remove(id);
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
  const rows = [
    ['Data', UI.formatDate(r.data)],
    ['Hora', UI.escHtml(r.hora)],
    ['Nome do Porteiro', UI.escHtml(r.porteiro)],
    ['Deixado por', UI.escHtml(r.nome)],
    ['Texto do aviso/recado', UI.escHtml(r.texto)]
  ];

  if (r.alarme) {
    const hora = r.alarmeHora || r.hora || '--:--';
    const rec = r.recorrencia || 'data';
    let desc;
    if (rec === 'diario') desc = `Todos os dias às ${hora}`;
    else if (rec === 'semanal') {
      const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      desc = `${dias[Number(r.diaSemana)]} às ${hora}`;
    } else {
      desc = `${UI.formatDate(r.alarmeData || r.data)} às ${hora}`;
    }
    rows.push(['Alarme', `<span class="badge badge-alarme"><i class="fas fa-bell"></i> ${desc}</span>`]);
  }

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
        const search = (r.porteiro + ' ' + r.nome + ' ' + r.texto)
          .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (!search.includes(texto)) return false;
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
  countEl.textContent = filtered.length + ' registro(s)';
  empty.style.display = filtered.length ? 'none' : 'block';
  tbody.innerHTML = '';

  filtered.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${UI.formatDate(r.data)}</td>
      <td>${UI.escHtml(r.hora)}</td>
      <td>${UI.escHtml(r.porteiro)}</td>
      <td>${UI.escHtml(r.nome)}</td>
      <td>${UI.escHtml(r.texto)}</td>
      <td>${formatAlarm(r)}</td>
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
    r.hora || '-',
    r.porteiro || '-',
    r.nome || '-',
    r.texto || '-'
  ]);
}

function generateDayReport() {
  const today = UI.todayISO();
  const list = getFiltered().filter((r) => r.data === today);
  if (list.length === 0) return UI.showToast('Nenhum aviso ou recado hoje.', 'warning');

  UI.buildPdf({
    title: 'AVISOS E RECADOS',
    subtitle: 'Relatório do Dia',
    period: UI.formatDate(today),
    columns: ['Data', 'Hora', 'Porteiro', 'Deixado por', 'Texto'],
    rows: buildRows(list),
    filename: `relatorio_avisos_dia_${today}.pdf`
  });
}

function openPeriodReport() {
  UI.openReportModal((start, end) => generatePeriodReport(start, end));
}

function generatePeriodReport(start, end) {
  const list = records
    .filter((r) => r.data >= start && r.data <= end)
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  if (list.length === 0) return UI.showToast('Nenhum aviso no período informado.', 'warning');

  UI.buildPdf({
    title: 'AVISOS E RECADOS',
    subtitle: 'Relatório por Período',
    period: `${UI.formatDate(start)} a ${UI.formatDate(end)}`,
    columns: ['Data', 'Hora', 'Porteiro', 'Deixado por', 'Texto'],
    rows: buildRows(list),
    filename: `relatorio_avisos_${start}_a_${end}.pdf`
  });
}

// ===== EXCEL =====
function exportExcelAvisos() {
  const rows = getFiltered().map((r) => ({
    'Data': UI.formatDate(r.data),
    'Hora': r.hora || '',
    'Porteiro': r.porteiro || '',
    'Deixado por': r.nome || '',
    'Texto do aviso/recado': r.texto || ''
  }));
  UI.exportExcel(rows, Object.keys(rows[0] || {}), `avisos_${UI.todayISO()}.xlsx`);
}

// ===== BACKUP =====
function toggleBackupModal() {
  const el = document.getElementById('backupModal');
  if (el) el.classList.toggle('active');
}

async function exportBackupAvisos() {
  try {
    const data = await DB.exportStore('avisos');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    await UI.saveFile(blob, 'backup_avisos_' + UI.todayISO() + '.json');
    UI.showToast('Backup exportado com sucesso!', 'success');
  } catch (e) {
    console.error(e);
    UI.showToast('Erro ao exportar backup.', 'error');
  }
}

async function importBackupAvisos(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('Formato inválido');
      await DB.importStore('avisos', data);
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
