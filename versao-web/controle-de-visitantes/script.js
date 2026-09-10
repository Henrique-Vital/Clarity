/* ===================================================================
   CONTROLE DE VISITANTES - SCRIPT.JS
   ===================================================================
   Módulo de controle de visitantes da portaria da Clarity Glass.
   Persistência em IndexedDB (store: visitantes).
   =================================================================== */

// ===== DOM REFS =====
const $ = (sel) => document.querySelector(sel);

// ===== STATE =====
let records = [];
let editingId = null;
let lastSelectedId = null;
let selectedPerfil = null;
let lastSelectedPerfilNome = '';
let visMatches = [];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  UI.initCommon();
  setDefaultDateTime();
  $('#visitanteForm').addEventListener('submit', (e) => {
    e.preventDefault();
    save();
  });
  // Busca automática de visitantes já cadastrados (igual ao Entrada e Saída)
  $('#vNome').addEventListener('input', debounceBuscarVisitante);
  // Porteiro fica salvo durante o turno inteiro (localStorage)
  restaurarPorteiroSalvo();
  $('#vPorteiro').addEventListener('input', (e) => salvarPorteiro(e.target.value));
  // Fecha a lista de resultados ao clicar fora do campo do nome
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.vis-nome-group')) fecharResultados();
  });
  await loadRecords();
});

// ===== DATA PADRÃO =====
function setDefaultDateTime() {
  const dateEl = $('#vData');
  const timeEl = $('#vHoraEntrada');
  if (!dateEl.value) dateEl.value = UI.todayISO();
  if (!timeEl.value) timeEl.value = UI.nowTime();
}

// ===== LOAD =====
async function loadRecords() {
  records = await DB.store('visitantes').getAll();
  renderHistory();
  updateStatusIndicator();
}

// ===== COLETA DO FORMULÁRIO =====
function collectForm() {
  return {
    data: $('#vData').value,
    horaEntrada: $('#vHoraEntrada').value,
    horaSaida: $('#vHoraSaida').value || '',
    nome: $('#vNome').value.trim(),
    empresa: $('#vEmpresa').value.trim(),
    cpfRg: $('#vCpfRg').value.trim(),
    porteiro: $('#vPorteiro').value.trim(),
    responsavel: $('#vResponsavel').value.trim(),
    setor: $('#vSetor').value.trim(),
    motivo: $('#vMotivo').value.trim(),
    observacoes: $('#vObs').value.trim()
  };
}

function fillForm(r) {
  $('#vData').value = r.data || '';
  $('#vHoraEntrada').value = r.horaEntrada || '';
  $('#vHoraSaida').value = r.horaSaida || '';
  $('#vNome').value = r.nome || '';
  $('#vEmpresa').value = r.empresa || '';
  $('#vCpfRg').value = r.cpfRg || '';
  $('#vPorteiro').value = r.porteiro || '';
  $('#vResponsavel').value = r.responsavel || '';
  $('#vSetor').value = r.setor || '';
  $('#vMotivo').value = r.motivo || '';
  $('#vObs').value = r.observacoes || '';
}

// ===== SALVAR =====
async function save() {
  const data = collectForm();

  // Somente o nome é obrigatório; os demais campos são opcionais.
  if (!data.nome) return UI.showToast('Informe o nome do visitante.', 'error');
  // Preenche data/hora com o padrão caso estejam vazias (consistência).
  if (!data.data) data.data = UI.todayISO();
  if (!data.horaEntrada) data.horaEntrada = UI.nowTime();

  if (editingId) {
    const existing = records.find((r) => r.id === editingId);
    if (!existing) {
      UI.showToast('Registro não encontrado para edição.', 'error');
      return;
    }
    const updated = Object.assign({}, existing, data, { updatedAt: new Date().toISOString() });
    await DB.store('visitantes').put(updated);
    UI.showToast('Visitante atualizado com sucesso!', 'success');
  } else {
    const record = Object.assign({}, data, {
      id: UI.generateId(),
      createdAt: new Date().toISOString()
    });
    await DB.store('visitantes').add(record);
    UI.showToast('Visitante registrado com sucesso!', 'success');
  }

  editingId = null;
  lastSelectedId = null;
  salvarPorteiro(data.porteiro);
  clearForm();
  await loadRecords();
  await upsertVisitantePerfil(data);
  setFormTitle();
}

// ===== PERFIL DO VISITANTE (memória de dados) =====
// Grava os dados do visitante para que, ao digitar o nome novamente,
// os campos sejam preenchidos automaticamente.
async function getPerfis() {
  return DB.store('visitantes_perfil').getAll();
}

async function upsertVisitantePerfil(data) {
  if (!data.nome) return;
  try {
    const perfis = await getPerfis();
    const nomeL = data.nome.toLowerCase();
    const existing = perfis.find((p) => (p.nome || '').toLowerCase() === nomeL);
    if (existing) {
      existing.empresa = data.empresa || existing.empresa;
      existing.cpfRg = data.cpfRg || existing.cpfRg;
      existing.responsavel = data.responsavel || existing.responsavel;
      existing.setor = data.setor || existing.setor;
      existing.updatedAt = new Date().toISOString();
      await DB.store('visitantes_perfil').put(existing);
    } else {
      await DB.store('visitantes_perfil').add({
        id: UI.generateId(),
        nome: data.nome,
        empresa: data.empresa || '',
        cpfRg: data.cpfRg || '',
        responsavel: data.responsavel || '',
        setor: data.setor || '',
        createdAt: new Date().toISOString()
      });
    }
  } catch (e) {
    console.warn('Erro ao salvar perfil do visitante:', e);
  }
}

// ===== BUSCA DE VISITANTES CADASTRADOS (autocomplete) =====
// Ao digitar o nome, mostra uma lista dos visitantes já cadastrados
// para selecionar (mesmo comportamento do módulo Entrada e Saída).
function debounceBuscarVisitante() {
  clearTimeout(window._visBuscaTimer);
  window._visBuscaTimer = setTimeout(buscarVisitantes, 250);
  atualizarBotaoLimparBusca();
}

function atualizarBotaoLimparBusca() {
  const btn = $('#vBuscaLimpar');
  if (btn) btn.classList.toggle('hidden', !$('#vNome').value);
}

async function buscarVisitantes() {
  const q = $('#vNome').value.trim();
  fecharResultados();
  limparAutorizacaoVisitante();
  if (!q) return;
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nq = norm(q);

  // Junta perfis de visitantes (visitantes_perfil) + cadastro de pessoas,
  // sem duplicar por nome — assim TODOS os cadastrados aparecem ao digitar.
  const [perfis, pessoas] = await Promise.all([getPerfis(), Portaria.searchPessoas(q)]);
  const map = new Map();
  perfis.forEach((p) => {
    const key = norm(p.nome);
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, {
        nome: p.nome,
        empresa: p.empresa || '',
        cpfRg: p.cpfRg || '',
        responsavel: p.responsavel || '',
        setor: p.setor || ''
      });
    }
  });
  pessoas.forEach((p) => {
    const key = norm(p.nome);
    if (!key) return;
    const existing = map.get(key) || {};
    map.set(key, {
      nome: p.nome,
      empresa: existing.empresa || p.empresa || '',
      cpfRg: existing.cpfRg || p.documento || '',
      responsavel: existing.responsavel || '',
      setor: existing.setor || p.setor || '',
      pessoaId: p.id,
      tipo: p.tipo
    });
  });

  visMatches = Array.from(map.values())
    .filter((m) => norm(m.nome).includes(nq))
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    .slice(0, 10);

  if (visMatches.length === 0) {
    // Nada encontrado: visitante novo — o cadastro é feito ao salvar.
    limparDadosPerfilDivergente();
    const nf = $('#vNaoEncontrado');
    if (nf) nf.classList.remove('hidden');
    return;
  }
  renderResultadosVisitantes(visMatches);
}

function renderResultadosVisitantes(list) {
  const box = $('#vResultados');
  const cards = list.map((m, i) => `
    <li class="vis-result-item" onclick="selecionarPerfilVisitante(${i})">
      <div class="vis-result-nome">
        <strong>${UI.escHtml(m.nome)}</strong>
      </div>
      <div class="vis-result-detalhe">
        ${m.empresa ? UI.escHtml(m.empresa) + ' &middot; ' : ''}
        ${m.cpfRg ? UI.escHtml(m.cpfRg) + ' &middot; ' : ''}
        ${m.setor ? UI.escHtml(m.setor) : ''}
      </div>
    </li>`).join('');
  box.innerHTML = `<ul class="vis-result-list">${cards}</ul>`;
  box.classList.add('open');
}

function fecharResultados() {
  const box = $('#vResultados');
  if (box) {
    box.innerHTML = '';
    box.classList.remove('open');
  }
  const nf = $('#vNaoEncontrado');
  if (nf) nf.classList.add('hidden');
}

// Ao escolher um visitante da lista, preenche os dados do cadastro.
async function selecionarPerfilVisitante(i) {
  if (editingId) return;
  const m = visMatches[i];
  if (!m) return;
  selectedPerfil = m;
  lastSelectedPerfilNome = m.nome || '';
  $('#vNome').value = m.nome || '';
  $('#vEmpresa').value = m.empresa || '';
  $('#vCpfRg').value = m.cpfRg || '';
  $('#vResponsavel').value = m.responsavel || '';
  $('#vSetor').value = m.setor || '';
  atualizarBotaoLimparBusca();
  fecharResultados();
  await renderAutorizacaoVisitante(m);
}

// Se o nome foi alterado e não corresponde mais ao perfil escolhido,
// limpa os dados que vieram do cadastro (evita dados errados).
function limparDadosPerfilDivergente() {
  if (!selectedPerfil) return;
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (norm($('#vNome').value) === norm(lastSelectedPerfilNome)) return;
  selectedPerfil = null;
  lastSelectedPerfilNome = '';
  $('#vEmpresa').value = '';
  $('#vCpfRg').value = '';
  $('#vResponsavel').value = '';
  $('#vSetor').value = '';
  limparAutorizacaoVisitante();
}

function limparBuscaVisitante() {
  $('#vNome').value = '';
  selectedPerfil = null;
  lastSelectedPerfilNome = '';
  fecharResultados();
  limparAutorizacaoVisitante();
  atualizarBotaoLimparBusca();
  $('#vNome').focus();
}

// ===== AUTORIZAÇÃO DO VISITANTE (igual ao Entrada e Saída) =====
function limparAutorizacaoVisitante() {
  const box = $('#vAutorizacao');
  if (box) box.innerHTML = '';
}

// Mostra se o visitante tem autorização e os detalhes dela.
async function renderAutorizacaoVisitante(m) {
  const box = $('#vAutorizacao');
  if (!box) return;
  box.innerHTML = '';

  let pessoaId = m.pessoaId;
  if (!pessoaId) {
    const pessoas = await Portaria.getAllPessoas();
    const p = pessoas.find((x) => Portaria.norm(x.nome) === Portaria.norm(m.nome));
    if (p) pessoaId = p.id;
  }
  if (!pessoaId) return;

  const autorizacoes = await Portaria.getAutorizacoesPessoa(pessoaId);
  if (autorizacoes.length === 0) {
    box.innerHTML = '<div class="vis-auth"><span class="badge badge-dark">Sem autorização cadastrada</span></div>';
    return;
  }
  const ordenadas = [...autorizacoes].sort((a, b) => (b.dataInicial || '').localeCompare(a.dataInicial || ''));
  const ativa = ordenadas.find((a) => Portaria.autorizacaoStatus(a) === 'ativa');

  if (ativa) {
    box.innerHTML = `
      <div class="vis-auth vis-auth-ok">
        <span class="badge badge-success"><i class="fas fa-check-circle"></i> AUTORIZADO</span>
        <span class="vis-auth-detalhe">Autorizou: <strong>${UI.escHtml(ativa.responsavelNome || '-')}</strong></span>
        <span class="vis-auth-detalhe">Período: ${Portaria.formatPeriodo(ativa)} &middot; Forma: ${formaAutorizacaoLabel(ativa.forma)}</span>
      </div>`;
  } else {
    const a = ordenadas[0];
    box.innerHTML = `
      <div class="vis-auth">
        <span class="badge ${Portaria.autorizacaoBadge(Portaria.autorizacaoStatus(a))}">${Portaria.autorizacaoStatusLabel(Portaria.autorizacaoStatus(a))}</span>
        <span class="vis-auth-detalhe">Autorizou: ${UI.escHtml(a.responsavelNome || '-')} &middot; ${Portaria.formatPeriodo(a)}</span>
      </div>`;
  }
}

function formaAutorizacaoLabel(forma) {
  const map = {
    email: 'E-mail',
    telefone: 'Telefone',
    presencial: 'Presencial',
    sistema: 'Sistema',
    outro: 'Outro'
  };
  return map[forma] || forma || '-';
}

// ===== PORTEIRO PERSISTENTE =====
// O nome do porteiro é lembrado no localStorage para que, durante o
// turno inteiro, não precise ser digitado novamente em cada registro.
function getPorteiroSalvo() {
  return localStorage.getItem('clarityPorteiro') || '';
}

function salvarPorteiro(nome) {
  const v = (nome || '').trim();
  if (v) localStorage.setItem('clarityPorteiro', v);
  else localStorage.removeItem('clarityPorteiro');
}

function restaurarPorteiroSalvo() {
  const salvo = getPorteiroSalvo();
  if (salvo && !$('#vPorteiro').value) $('#vPorteiro').value = salvo;
}

// ===== FORM =====
function clearForm() {
  editingId = null;
  selectedPerfil = null;
  lastSelectedPerfilNome = '';
  visMatches = [];
  $('#vData').value = UI.todayISO();
  $('#vHoraEntrada').value = UI.nowTime();
  $('#vHoraSaida').value = '';
  $('#vNome').value = '';
  $('#vEmpresa').value = '';
  $('#vCpfRg').value = '';
  $('#vPorteiro').value = getPorteiroSalvo();
  $('#vResponsavel').value = '';
  $('#vSetor').value = '';
  $('#vMotivo').value = '';
  $('#vObs').value = '';
  fecharResultados();
  limparAutorizacaoVisitante();
  atualizarBotaoLimparBusca();
  setFormTitle();
}

function setFormTitle() {
  $('#formTitle').textContent = editingId ? 'Editar Visitante' : 'Novo Visitante';
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
  setFormTitle();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function editSelected() {
  if (!lastSelectedId) {
    UI.showToast('Selecione um visitante no histórico para editar.', 'warning');
    return;
  }
  loadIntoForm(lastSelectedId);
}

function loadSelectedForEdit() {
  loadIntoForm(lastSelectedId);
  UI.closeModal('viewModal');
}

// ===== EXCLUIR =====
function deleteSelected() {
  if (!editingId && !lastSelectedId) {
    UI.showToast('Nenhum registro selecionado para excluir.', 'warning');
    return;
  }
  const id = editingId || lastSelectedId;
  UI.showConfirm('Tem certeza que deseja excluir este visitante? Esta ação não pode ser desfeita.', async () => {
    await DB.store('visitantes').remove(id);
    editingId = null;
    lastSelectedId = null;
    clearForm();
    await loadRecords();
    UI.showToast('Visitante excluído com sucesso.', 'success');
  });
}

function deleteRecord(id) {
  lastSelectedId = id;
  UI.showConfirm('Tem certeza que deseja excluir este visitante? Esta ação não pode ser desfeita.', async () => {
    await DB.store('visitantes').remove(id);
    if (editingId === id) {
      editingId = null;
      clearForm();
    }
    if (lastSelectedId === id) lastSelectedId = null;
    await loadRecords();
    UI.showToast('Visitante excluído com sucesso.', 'success');
  });
}

// ===== REGISTRAR SAÍDA (hora atual) =====
async function registrarSaidaRapida(id) {
  const r = records.find((rec) => rec.id === id);
  if (!r) return UI.showToast('Registro não encontrado.', 'error');
  if (r.horaSaida) return UI.showToast('Este visitante já registrou saída.', 'warning');
  const hora = UI.nowTime();
  const updated = Object.assign({}, r, {
    saidaData: UI.todayISO(),
    horaSaida: hora,
    updatedAt: new Date().toISOString()
  });
  await DB.store('visitantes').put(updated);
  await loadRecords();
  UI.showToast(`Saída registrada: ${r.nome} às ${hora}`, 'success');
}

// ===== VISUALIZAR =====
function viewRecord(id) {
  const r = records.find((rec) => rec.id === id);
  if (!r) return UI.showToast('Registro não encontrado.', 'error');
  lastSelectedId = id;

  const body = $('#viewModalBody');
  const rows = [
    ['Data', UI.formatDate(r.data)],
    ['Hora de Entrada', UI.escHtml(r.horaEntrada)],
    ['Hora de Saída', r.horaSaida ? UI.escHtml(r.horaSaida) : '<span class="badge badge-warning">Ainda no local</span>'],
    ['Nome do Visitante', UI.escHtml(r.nome)],
    ['Empresa', UI.escHtml(r.empresa)],
    ['CPF ou RG', UI.escHtml(r.cpfRg)],
    ['Porteiro', UI.escHtml(r.porteiro)],
    ['Responsável da Clarity', UI.escHtml(r.responsavel)],
    ['Setor', UI.escHtml(r.setor)],
    ['Motivo', UI.escHtml(r.motivo)],
    ['Observações', r.observacoes ? UI.escHtml(r.observacoes) : '-']
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
  const nome = ($('#filterNome').value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const empresa = ($('#filterEmpresa').value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const responsavel = ($('#filterResponsavel').value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return records
    .filter((r) => {
      if (data && r.data !== data) return false;
      const text = (r.nome + ' ' + r.empresa + ' ' + r.responsavel).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (nome && !text.includes(nome)) return false;
      if (empresa && !(r.empresa || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(empresa)) return false;
      if (responsavel && !(r.responsavel || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(responsavel)) return false;
      return true;
    })
    .sort((a, b) => {
      const keyA = a.data + 'T' + (a.horaEntrada || '00:00');
      const keyB = b.data + 'T' + (b.horaEntrada || '00:00');
      return keyB.localeCompare(keyA);
    });
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
      <td>${UI.escHtml(r.horaEntrada)}</td>
      <td>${r.horaSaida ? UI.escHtml(r.horaSaida) : '<span class="badge badge-warning">No local</span>'}</td>
      <td><strong>${UI.escHtml(r.nome)}</strong></td>
      <td>${UI.escHtml(r.empresa)}</td>
      <td>${UI.escHtml(r.cpfRg)}</td>
      <td>${UI.escHtml(r.porteiro)}</td>
      <td>${UI.escHtml(r.responsavel)}</td>
      <td>${UI.escHtml(r.setor)}</td>
      <td>${UI.escHtml(r.motivo)}</td>
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
          ${!r.horaSaida ? `
          <button class="btn btn-sm btn-success" onclick="registrarSaidaRapida('${r.id}')" title="Registrar saída (hora atual)">
            <i class="fas fa-sign-out-alt"></i>
          </button>` : ''}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ===== PESQUISAR / FILTROS =====
function pesquisar() {
  renderHistory();
  goHistory();
}

function clearFilters() {
  $('#filterData').value = '';
  $('#filterNome').value = '';
  $('#filterEmpresa').value = '';
  $('#filterResponsavel').value = '';
  renderHistory();
}

function goHistory() {
  document.getElementById('historySection').scrollIntoView({ behavior: 'smooth' });
}

// ===== STATUS =====
function updateStatusIndicator() {
  const today = UI.todayISO();
  const hoje = records.filter((r) => r.data === today).length;
  $('#statusIndicator').textContent = hoje;
}

// ===== RELATÓRIOS =====
function buildRows(list) {
  return list.map((r) => [
    UI.formatDate(r.data),
    r.horaEntrada || '-',
    r.horaSaida || '-',
    r.nome || '-',
    r.empresa || '-',
    r.cpfRg || '-',
    r.porteiro || '-',
    r.responsavel || '-',
    r.setor || '-',
    r.motivo || '-'
  ]);
}

function generateDayReport() {
  const today = UI.todayISO();
  const list = getFiltered().filter((r) => r.data === today);
  if (list.length === 0) return UI.showToast('Nenhuma visita registrada hoje.', 'warning');

  UI.buildPdf({
    title: 'CONTROLE DE VISITANTES',
    subtitle: 'Relatório do Dia',
    period: UI.formatDate(today),
    orientation: 'l',
    columns: ['Data', 'Entrada', 'Saída', 'Visitante', 'Empresa', 'CPF/RG', 'Porteiro', 'Responsável', 'Setor', 'Motivo'],
    rows: buildRows(list),
    filename: `relatorio_visitantes_dia_${today}.pdf`
  });
}

function openPeriodReport() {
  UI.openReportModal((start, end) => generatePeriodReport(start, end));
}

function generatePeriodReport(start, end) {
  const list = records
    .filter((r) => r.data >= start && r.data <= end)
    .sort((a, b) => (a.data + a.horaEntrada).localeCompare(b.data + b.horaEntrada));
  if (list.length === 0) return UI.showToast('Nenhuma visita no período informado.', 'warning');

  UI.buildPdf({
    title: 'CONTROLE DE VISITANTES',
    subtitle: 'Relatório por Período',
    period: `${UI.formatDate(start)} a ${UI.formatDate(end)}`,
    orientation: 'l',
    columns: ['Data', 'Entrada', 'Saída', 'Visitante', 'Empresa', 'CPF/RG', 'Porteiro', 'Responsável', 'Setor', 'Motivo'],
    rows: buildRows(list),
    filename: `relatorio_visitantes_${start}_a_${end}.pdf`
  });
}

// ===== EXCEL =====
function exportExcelVisitantes() {
  const rows = getFiltered().map((r) => ({
    'Data': UI.formatDate(r.data),
    'Hora Entrada': r.horaEntrada || '',
    'Hora Saída': r.horaSaida || '',
    'Nome': r.nome || '',
    'Empresa': r.empresa || '',
    'CPF ou RG': r.cpfRg || '',
    'Porteiro': r.porteiro || '',
    'Responsável': r.responsavel || '',
    'Setor': r.setor || '',
    'Motivo': r.motivo || '',
    'Observações': r.observacoes || ''
  }));
  UI.exportExcel(rows, Object.keys(rows[0] || {}), `visitantes_${UI.todayISO()}.xlsx`);
}

// ===== BACKUP =====
function toggleBackupModal() {
  const el = document.getElementById('backupModal');
  if (el) el.classList.toggle('active');
}

async function exportBackupVisitantes() {
  try {
    const data = await DB.exportStore('visitantes');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    await UI.saveFile(blob, 'backup_visitantes_' + UI.todayISO() + '.json');
    UI.showToast('Backup exportado com sucesso!', 'success');
  } catch (e) {
    console.error(e);
    UI.showToast('Erro ao exportar backup.', 'error');
  }
}

async function importBackupVisitantes(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('Formato inválido');
      await DB.importStore('visitantes', data);
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
