/* ===================================================================
   Controle de Chaves ou Item - SCRIPT.JS
   ===================================================================
   Módulo de Controle de Chaves ou Item da portaria da Clarity Glass.
   - Chaves comuns (cadastro livre)
   - Chaves do almoxarifado (categoria separada)
   - Chaves de veículos (fixas)
   Persistência em IndexedDB (store: chaves).
   =================================================================== */

// ===== VEÍCULOS FIXOS =====
const VEHICLES = [
  { id: 'v1', tipo: 'Caminhão', nome: 'KRF3D66', placa: 'KRF3D66' },
  { id: 'v2', tipo: 'Caminhão', nome: 'EYR8C33', placa: 'EYR8C33' },
  { id: 'v3', tipo: 'Caminhão', nome: 'CPI4E28', placa: 'CPI4E28' },
  { id: 'v4', tipo: 'Carro', nome: 'Uno', placa: 'ETC2723' },
  { id: 'v5', tipo: 'Carro', nome: 'Estrada', placa: 'FDP9808' }
];

// ===== DOM REFS =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== STATE =====
let records = [];
let currentTab = 'comum';
const PAGE_SIZE = 20;
const pages = { comum: 1, almoxarifado: 1, veiculo: 1 };

// ===== HELPERS =====
function normTxt(s) {
  return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Último funcionário que retirou uma chave/item/veículo (para preenchimento automático). */
function ultimoFuncionario(tipo, chaveOuId) {
  const list = records
    .filter((r) => r.tipo === tipo && (tipo === 'veiculo' ? r.veiculoId === chaveOuId : r.chave === chaveOuId))
    .sort((a, b) => (b.dataHora || '').localeCompare(a.dataHora || ''));
  return list.length ? list[0].funcionario : '';
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  UI.initCommon();
  setDefaultDateTime();
  bindEvents();
  await loadRecords();
});

// ===== DATA PADRÃO =====
function setDefaultDateTime() {
  const today = UI.todayISO();
  const now = UI.nowTime();
  [
    'retiradaComumData', 'devolucaoComumData',
    'retiradaAlmoxData', 'devolucaoAlmoxData',
    'veiculoData'
  ].forEach((id) => {
    const el = $('#' + id);
    if (el && !el.value) el.value = today;
  });
  [
    'retiradaComumHora', 'devolucaoComumHora',
    'retiradaAlmoxHora', 'devolucaoAlmoxHora',
    'veiculoHora'
  ].forEach((id) => {
    const el = $('#' + id);
    if (el && !el.value) el.value = now;
  });
}

// ===== EVENTOS =====
function bindEvents() {
  // Tabs
  $$('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Retirada / devolução - chaves comuns
  $('#retiradaComumForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveRetirada('comum');
  });
  $('#devolucaoComumForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveDevolucao('comum');
  });

  // Retirada / devolução - almoxarifado
  $('#retiradaAlmoxForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveRetirada('almoxarifado');
  });
  $('#devolucaoAlmoxForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveDevolucao('almoxarifado');
  });

  // Veículos
  $('#veiculoForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveVeiculo();
  });
  $('#veiculoOperacao').addEventListener('change', () => {
    populateVehicleSelect();
    updateVehicleSubmitButton();
  });

  bindPrefillEvents();
}

// ===== PREENCHIMENTO AUTOMÁTICO (Etapas devolução / retirada) =====
function bindPrefillEvents() {
  // Devolução - chaves comuns: ao escolher a chave, preenche quem devolveu com quem pegou
  $('#devolucaoComumSelect').addEventListener('change', () => {
    const r = records.find((x) => x.id === $('#devolucaoComumSelect').value);
    if (r && r.funcionario) $('#devolucaoComumFuncionario').value = r.funcionario;
  });
  // Devolução - almoxarifado
  $('#devolucaoAlmoxSelect').addEventListener('change', () => {
    const r = records.find((x) => x.id === $('#devolucaoAlmoxSelect').value);
    if (r && r.funcionario) $('#devolucaoAlmoxFuncionario').value = r.funcionario;
  });
  // Retirada - chaves comuns: ao escolher a chave, preenche o último funcionário que pegou
  $('#retiradaComumChave').addEventListener('input', () => {
    const chave = $('#retiradaComumChave').value.trim();
    if (!chave) return;
    const f = ultimoFuncionario('comum', chave);
    if (f) $('#retiradaComumFuncionario').value = f;
  });
  // Veículos: preenche conforme operação e veículo selecionado
  $('#veiculoSelect').addEventListener('change', () => {
    const veiculoId = $('#veiculoSelect').value;
    const operacao = $('#veiculoOperacao').value;
    if (!veiculoId) return;
    if (operacao === 'devolucao') {
      const open = records.find((r) => r.tipo === 'veiculo' && r.veiculoId === veiculoId && r.status === 'em_uso');
      if (open && open.funcionario) $('#veiculoFuncionario').value = open.funcionario;
    } else {
      const f = ultimoFuncionario('veiculo', veiculoId);
      if (f) $('#veiculoFuncionario').value = f;
    }
  });
}

// ===== TABS =====
function switchTab(tab) {
  currentTab = tab;
  $$('.tab-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
  $$('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.id === 'tab-' + tab));
  if (tab === 'veiculo') populateVehicleSelect();
}

// ===== LOAD =====
async function loadRecords() {
  records = await DB.store('chaves').getAll();
  pages.comum = 1;
  pages.almoxarifado = 1;
  pages.veiculo = 1;
  renderAll();
}

function renderAll() {
  populateKeyDatalists();
  populateDevolutionSelects();
  renderVehicles();
  renderHistory();
  updateStatusIndicator();
  prefillAlmoxFuncionario();
}

/** Preenche o funcionário da retirada do almoxarifado com o último que pegou (chave é fixa). */
function prefillAlmoxFuncionario() {
  const f = ultimoFuncionario('almoxarifado', 'Chaves do Almoxarifado');
  if (f) $('#retiradaAlmoxFuncionario').value = f;
}

// ===== CHAVES EM USO =====
function getOpenRecords(tipo) {
  return records.filter((r) => r.tipo === tipo && r.status === 'em_uso');
}

function isVehicleInUse(vehicleId) {
  return records.some((r) => r.tipo === 'veiculo' && r.veiculoId === vehicleId && r.status === 'em_uso');
}

// ===== DATALISTS DE NOMES DE CHAVE =====
function populateKeyDatalists() {
  const list = $('#chavesComunsList');
  const names = [...new Set(records.filter((r) => r.tipo === 'comum').map((r) => r.chave))];
  if (list) list.innerHTML = names.map((n) => `<option value="${UI.escHtml(n)}">`).join('');
}

// ===== SELECTS DE DEVOLUÇÃO =====
function populateDevolutionSelects() {
  ['comum', 'almoxarifado'].forEach((tipo) => {
    const selectId = tipo === 'comum' ? 'devolucaoComumSelect' : 'devolucaoAlmoxSelect';
    const select = $('#' + selectId);
    const open = getOpenRecords(tipo);
    select.innerHTML = '<option value="">-- Selecione uma chave em uso --</option>' +
      open.map((r) =>
        `<option value="${r.id}">${UI.escHtml(r.chave)} - ${UI.escHtml(r.funcionario)} (${UI.formatDate(r.data)} ${UI.escHtml(r.hora)})</option>`
      ).join('');
  });
}

// ===== SALVAR RETIRADA =====
async function saveRetirada(tipo) {
  const prefix = tipo === 'comum' ? 'retiradaComum' : 'retiradaAlmox';
  const chave = tipo === 'almoxarifado'
    ? 'Chaves do Almoxarifado'
    : $('#' + prefix + 'Chave').value.trim();
  const funcionario = $('#' + prefix + 'Funcionario').value.trim();
  const data = $('#' + prefix + 'Data').value;
  const hora = $('#' + prefix + 'Hora').value;
  const observacao = $('#' + prefix + 'Obs').value.trim();

  if (!chave) return UI.showToast('Informe o nome da chave.', 'error');
  if (!funcionario) return UI.showToast('Informe o nome do funcionário.', 'error');
  if (!data || !hora) return UI.showToast('Informe data e hora da retirada.', 'error');

  const record = {
    id: UI.generateId(),
    tipo,
    chave,
    funcionario,
    data,
    hora,
    dataHora: `${data}T${hora}:00`,
    observacao,
    status: 'em_uso',
    createdAt: new Date().toISOString()
  };

  await DB.store('chaves').add(record);
  await loadRecords();
  clearForm(prefix);
  if (tipo === 'almoxarifado') prefillAlmoxFuncionario();
  UI.showToast(`Chave "${chave}" retirada com sucesso!`, 'success');
}

// ===== SALVAR DEVOLUÇÃO =====
async function saveDevolucao(tipo) {
  const prefix = tipo === 'comum' ? 'devolucaoComum' : 'devolucaoAlmox';
  const selId = $('#' + prefix + 'Select').value;
  const funcionario = $('#' + prefix + 'Funcionario').value.trim();
  const data = $('#' + prefix + 'Data').value;
  const hora = $('#' + prefix + 'Hora').value;
  const observacao = $('#' + prefix + 'Obs').value.trim();

  if (!selId) return UI.showToast('Selecione a chave a devolver.', 'error');
  if (!funcionario) return UI.showToast('Informe o nome de quem devolveu.', 'error');
  if (!data || !hora) return UI.showToast('Informe data e hora da devolução.', 'error');

  const record = records.find((r) => r.id === selId);
  if (!record) return UI.showToast('Registro de retirada não encontrado.', 'error');

  record.status = 'devolvida';
  record.retornoFuncionario = funcionario;
  record.retornoData = data;
  record.retornoHora = hora;
  record.retornoDataHora = `${data}T${hora}:00`;
  record.retornoObservacao = observacao;
  record.updatedAt = new Date().toISOString();

  await DB.store('chaves').put(record);
  await loadRecords();
  clearForm(prefix);
  UI.showToast(`Chave "${record.chave}" devolvida com sucesso!`, 'success');
}

// ===== SALVAR VEÍCULO =====
async function saveVeiculo() {
  const veiculoId = $('#veiculoSelect').value;
  const operacao = $('#veiculoOperacao').value;
  const funcionario = $('#veiculoFuncionario').value.trim();
  const data = $('#veiculoData').value;
  const hora = $('#veiculoHora').value;
  const observacao = $('#veiculoObs').value.trim();

  if (!veiculoId) return UI.showToast('Selecione o veículo.', 'error');
  if (!funcionario) return UI.showToast('Informe o nome do funcionário.', 'error');
  if (!data || !hora) return UI.showToast('Informe data e hora.', 'error');

  const vehicle = VEHICLES.find((v) => v.id === veiculoId);
  if (!vehicle) return;

  if (operacao === 'retirada') {
    if (isVehicleInUse(veiculoId)) {
      return UI.showToast(`O veículo ${vehicle.nome} já está em uso.`, 'error');
    }
    const record = {
      id: UI.generateId(),
      tipo: 'veiculo',
      veiculoId,
      veiculo: vehicle.nome,
      placa: vehicle.placa,
      categoria: vehicle.tipo,
      funcionario,
      data,
      hora,
      dataHora: `${data}T${hora}:00`,
      observacao,
      status: 'em_uso',
      createdAt: new Date().toISOString()
    };
    await DB.store('chaves').add(record);
    UI.showToast(`Veículo ${vehicle.nome} retirado com sucesso!`, 'success');
  } else {
    const open = records.find((r) => r.tipo === 'veiculo' && r.veiculoId === veiculoId && r.status === 'em_uso');
    if (!open) {
      return UI.showToast(`O veículo ${vehicle.nome} não está em uso.`, 'error');
    }
    open.status = 'devolvida';
    open.retornoFuncionario = funcionario;
    open.retornoData = data;
    open.retornoHora = hora;
    open.retornoDataHora = `${data}T${hora}:00`;
    open.retornoObservacao = observacao;
    open.updatedAt = new Date().toISOString();
    await DB.store('chaves').put(open);
    UI.showToast(`Veículo ${vehicle.nome} devolvido com sucesso!`, 'success');
  }

  await loadRecords();
  $('#veiculoFuncionario').value = '';
  $('#veiculoObs').value = '';
}

// ===== SELECT DE VEÍCULOS =====
function populateVehicleSelect() {
  const select = $('#veiculoSelect');
  const operacao = $('#veiculoOperacao').value;
  const options = VEHICLES.filter((v) => {
    const inUse = isVehicleInUse(v.id);
    return operacao === 'devolucao' ? inUse : !inUse;
  });
  select.innerHTML = '<option value="">-- Selecione o veículo --</option>' +
    options.map((v) => `<option value="${v.id}">${UI.escHtml(v.nome)} (${UI.escHtml(v.placa)})</option>`).join('');
}

function updateVehicleSubmitButton() {
  const btn = $('#veiculoSubmitBtn');
  const operacao = $('#veiculoOperacao').value;
  if (operacao === 'retirada') {
    btn.className = 'btn btn-primary';
    btn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Registrar Retirada';
  } else {
    btn.className = 'btn btn-success';
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Registrar Devolução';
  }
}

// ===== STATUS DOS VEÍCULOS =====
function renderVehicles() {
  const grid = $('#vehicleGrid');
  grid.innerHTML = VEHICLES.map((v) => {
    const open = records.find((r) => r.tipo === 'veiculo' && r.veiculoId === v.id && r.status === 'em_uso');
    const status = open
      ? '<span class="vehicle-status in-use"><i class="fas fa-circle" style="font-size:0.5rem"></i> Em uso</span>'
      : '<span class="vehicle-status available"><i class="fas fa-circle" style="font-size:0.5rem"></i> Disponível</span>';
    const detail = open
      ? `<div class="vehicle-detail">Com <strong>${UI.escHtml(open.funcionario)}</strong> desde ${UI.formatDate(open.data)} ${UI.escHtml(open.hora)}</div>`
      : '';
    const iconClass = v.tipo === 'Carro' ? 'car' : '';
    return `
      <div class="vehicle-card ${iconClass}">
        <div class="vehicle-icon">
          <i class="fas ${v.tipo === 'Carro' ? 'fa-car' : 'fa-truck'}"></i>
        </div>
        <div class="vehicle-name">${UI.escHtml(v.nome)}</div>
        <div class="vehicle-placa">${UI.escHtml(v.tipo)} | Placa ${UI.escHtml(v.placa)}</div>
        ${status}
        ${detail}
      </div>
    `;
  }).join('');
}

// ===== HISTÓRICO =====
function renderHistory() {
  renderKeyHistory('comum');
  renderKeyHistory('almoxarifado');
  renderVehicleHistory();
}

function getFilteredKeys(tipo) {
  const prefix = tipo === 'comum' ? 'Comum' : tipo === 'almoxarifado' ? 'Almox' : 'Veiculo';
  const dia = $('#filtro' + prefix + 'Dia').value;
  const inicio = $('#filtro' + prefix + 'Inicio').value;
  const fim = $('#filtro' + prefix + 'Fim').value;
  const chave = normTxt($('#filtro' + prefix + 'Chave').value);
  const func = normTxt($('#filtro' + prefix + 'Func').value);

  return records
    .filter((r) => r.tipo === tipo)
    .filter((r) => {
      if (dia && r.data !== dia) return false;
      if (inicio && r.data < inicio) return false;
      if (fim && r.data > fim) return false;
      if (chave) {
        const k = tipo === 'veiculo' ? normTxt((r.veiculo || '') + ' ' + (r.placa || '')) : normTxt(r.chave);
        if (!k.includes(chave)) return false;
      }
      if (func) {
        if (!normTxt(r.funcionario).includes(func)) return false;
      }
      return true;
    })
    .sort((a, b) => (b.dataHora || '').localeCompare(a.dataHora || ''));
}

function renderKeyHistory(tipo) {
  const tbody = $('#' + (tipo === 'comum' ? 'historyBodyComum' : 'historyBodyAlmox'));
  const empty = $('#' + (tipo === 'comum' ? 'emptyComum' : 'emptyAlmox'));
  const countEl = $('#' + (tipo === 'comum' ? 'recordCountComum' : 'recordCountAlmox'));

  const rows = getFilteredKeys(tipo);
  const total = rows.length;
  countEl.textContent = total + ' registro(s)';
  empty.style.display = total ? 'none' : 'block';

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages[tipo] > totalPages) pages[tipo] = totalPages;
  if (pages[tipo] < 1) pages[tipo] = 1;
  const slice = rows.slice((pages[tipo] - 1) * PAGE_SIZE, pages[tipo] * PAGE_SIZE);

  tbody.innerHTML = '';

  slice.forEach((r) => {
    const statusBadge = r.status === 'devolvida'
      ? '<span class="badge badge-success">Devolvida</span>'
      : '<span class="badge badge-warning">Em uso</span>';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${UI.formatDate(r.data)}</td>
      <td>${UI.escHtml(r.hora)}</td>
      <td><strong>${UI.escHtml(r.chave)}</strong></td>
      <td>${UI.escHtml(r.funcionario)}</td>
      <td><span class="badge badge-dark">Retirada</span></td>
      <td>${statusBadge}</td>
      <td>${UI.escHtml(r.observacao) || '-'}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-info" onclick="viewRecord('${r.id}')" title="Visualizar">
            <i class="fas fa-eye"></i>
          </button>
          ${r.status === 'em_uso' ? `
          <button class="btn btn-sm btn-success" onclick="devolverRapido('${r.id}')" title="Registrar devolução">
            <i class="fas fa-sign-in-alt"></i>
          </button>` : ''}
          <button class="btn btn-sm btn-danger" onclick="deleteRecord('${r.id}')" title="Excluir">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination(tipo, total, totalPages);
}

function renderVehicleHistory() {
  const tbody = $('#historyBodyVeiculo');
  const empty = $('#emptyVeiculo');
  const countEl = $('#recordCountVeiculo');

  const rows = getFilteredKeys('veiculo');
  const total = rows.length;
  countEl.textContent = total + ' registro(s)';
  empty.style.display = total ? 'none' : 'block';

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages.veiculo > totalPages) pages.veiculo = totalPages;
  if (pages.veiculo < 1) pages.veiculo = 1;
  const slice = rows.slice((pages.veiculo - 1) * PAGE_SIZE, pages.veiculo * PAGE_SIZE);

  tbody.innerHTML = '';

  slice.forEach((r) => {
    const duration = UI.formatDuration(r.dataHora, r.retornoDataHora);
    const devolucao = r.status === 'devolvida'
      ? `${UI.formatDate(r.retornoData)} ${UI.escHtml(r.retornoHora)}`
      : '<span class="badge badge-warning">Em uso</span>';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${UI.formatDate(r.data)}</td>
      <td>${UI.escHtml(r.hora)}</td>
      <td><strong>${UI.escHtml(r.veiculo)}</strong> <small style="color:var(--text-secondary)">${UI.escHtml(r.placa)}</small></td>
      <td>${UI.escHtml(r.funcionario)}</td>
      <td>${UI.escHtml(r.hora)}</td>
      <td>${devolucao}</td>
      <td>${duration}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-info" onclick="viewRecord('${r.id}')" title="Visualizar">
            <i class="fas fa-eye"></i>
          </button>
          ${r.status === 'em_uso' ? `
          <button class="btn btn-sm btn-success" onclick="devolverRapido('${r.id}')" title="Registrar devolução">
            <i class="fas fa-sign-in-alt"></i>
          </button>` : ''}
          <button class="btn btn-sm btn-danger" onclick="deleteRecord('${r.id}')" title="Excluir">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination('veiculo', total, totalPages);
}

// ===== PAGINAÇÃO =====
function renderPagination(tipo, total, totalPages) {
  const pag = $('#pag' + (tipo === 'comum' ? 'Comum' : tipo === 'almoxarifado' ? 'Almox' : 'Veiculo'));
  if (!pag) return;
  if (total === 0) { pag.style.display = 'none'; return; }
  pag.style.display = 'flex';
  const cap = tipo === 'comum' ? 'Comum' : tipo === 'almoxarifado' ? 'Almox' : 'Veiculo';
  const prev = $('#pag' + cap + 'Prev');
  const next = $('#pag' + cap + 'Next');
  const info = $('#pag' + cap + 'Info');
  const from = (pages[tipo] - 1) * PAGE_SIZE + 1;
  const to = Math.min(pages[tipo] * PAGE_SIZE, total);
  info.textContent = `${from}-${to} de ${total}`;
  if (prev) prev.disabled = pages[tipo] <= 1;
  if (next) next.disabled = pages[tipo] >= totalPages;
}

function changePage(tipo, delta) {
  pages[tipo] += delta;
  renderHistory();
}

function pesquisar(tipo) {
  pages[tipo] = 1;
  renderHistory();
}

function clearFilters(tipo) {
  const prefix = tipo === 'comum' ? 'Comum' : tipo === 'almoxarifado' ? 'Almox' : 'Veiculo';
  $('#filtro' + prefix + 'Dia').value = '';
  $('#filtro' + prefix + 'Inicio').value = '';
  $('#filtro' + prefix + 'Fim').value = '';
  $('#filtro' + prefix + 'Chave').value = '';
  $('#filtro' + prefix + 'Func').value = '';
  pages[tipo] = 1;
  renderHistory();
}

// ===== VISUALIZAR =====
function viewRecord(id) {
  const r = records.find((rec) => rec.id === id);
  if (!r) return UI.showToast('Registro não encontrado.', 'error');

  const body = $('#viewModalBody');
  const lines = [];
  lines.push(['Data', UI.formatDate(r.data)]);
  lines.push(['Hora', UI.escHtml(r.hora)]);
  if (r.tipo === 'veiculo') {
    lines.push(['Veículo', `${UI.escHtml(r.veiculo)} (${UI.escHtml(r.placa)})`]);
    lines.push(['Categoria', UI.escHtml(r.categoria || r.tipo)]);
  } else {
    lines.push(['Tipo', r.tipo === 'comum' ? 'Chave Comum' : 'Almoxarifado']);
    lines.push(['Chave', UI.escHtml(r.chave)]);
  }
  lines.push(['Funcionário (retirada)', UI.escHtml(r.funcionario)]);
  if (r.observacao) lines.push(['Observação (retirada)', UI.escHtml(r.observacao)]);

  if (r.status === 'devolvida') {
    lines.push(['Devolução', `${UI.formatDate(r.retornoData)} ${UI.escHtml(r.retornoHora)}`]);
    lines.push(['Quem devolveu', UI.escHtml(r.retornoFuncionario)]);
    if (r.retornoObservacao) lines.push(['Observação (devolução)', UI.escHtml(r.retornoObservacao)]);
    lines.push(['Tempo fora', UI.formatDuration(r.dataHora, r.retornoDataHora)]);
  } else {
    lines.push(['Status', '<span class="badge badge-warning">Em uso</span>']);
  }

  body.innerHTML = lines.map(([label, value]) => `
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

// ===== EXCLUIR =====
function deleteRecord(id) {
  UI.showConfirm('Tem certeza que deseja excluir esta movimentação? Esta ação não pode ser desfeita.', async () => {
    await DB.store('chaves').remove(id);
    await loadRecords();
    UI.showToast('Registro excluído com sucesso.', 'success');
  });
}

// ===== DEVOLUÇÃO RÁPIDA (atalho no histórico) =====
// Abre o formulário de devolução já preenchido com os dados do registro
// em uso; o porteiro apenas confere e clica em "Devolver".
function devolverRapido(id) {
  const r = records.find((x) => x.id === id);
  if (!r) return UI.showToast('Registro não encontrado.', 'error');
  if (r.status !== 'em_uso') return UI.showToast('Este registro já foi devolvido.', 'warning');

  if (r.tipo === 'veiculo') {
    switchTab('veiculo');
    $('#veiculoOperacao').value = 'devolucao';
    populateVehicleSelect();
    $('#veiculoSelect').value = r.veiculoId;
    if (r.funcionario) $('#veiculoFuncionario').value = r.funcionario;
    $('#veiculoData').value = UI.todayISO();
    $('#veiculoHora').value = UI.nowTime();
    $('#veiculoObs').value = '';
    updateVehicleSubmitButton();
    $('#veiculoSelect').dispatchEvent(new Event('change'));
    scrollToForm('#veiculoForm');
  } else {
    switchTab(r.tipo);
    const prefix = r.tipo === 'comum' ? 'devolucaoComum' : 'devolucaoAlmox';
    const select = $('#' + prefix + 'Select');
    select.value = r.id;
    if (r.funcionario) $('#' + prefix + 'Funcionario').value = r.funcionario;
    $('#' + prefix + 'Data').value = UI.todayISO();
    $('#' + prefix + 'Hora').value = UI.nowTime();
    $('#' + prefix + 'Obs').value = '';
    select.dispatchEvent(new Event('change'));
    scrollToForm('#' + prefix + 'Form');
  }
  UI.showToast('Devolução pronta. Confira os dados e clique em Devolver.', 'info');
}

function scrollToForm(sel) {
  const form = $(sel);
  if (!form) return;
  setTimeout(() => {
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const target = form.querySelector('select') || form.querySelector('input:not([type="hidden"])');
    if (target) target.focus({ preventScroll: true });
  }, 80);
}

// ===== LIMPAR FORM =====
function clearForm(prefix) {
  const inputs = document.querySelectorAll(`#${prefix}Form input, #${prefix}Form textarea`);
  inputs.forEach((input) => {
    if (input.readOnly) return;
    if (input.type === 'date') input.value = UI.todayISO();
    else if (input.type === 'time') input.value = UI.nowTime();
    else input.value = '';
  });
}

// ===== STATUS INDICATOR =====
function updateStatusIndicator() {
  const emUso = records.filter((r) => r.status === 'em_uso').length;
  $('#statusIndicator').textContent = emUso;
}

// ===== RELATÓRIOS =====
function buildReportRows(list) {
  return list.map((r) => {
    const quemDevolveu = r.status === 'devolvida' ? (r.retornoFuncionario || '-') : '-';
    if (r.tipo === 'veiculo') {
      return [
        UI.formatDate(r.data),
        r.hora,
        'Veículo',
        `${r.veiculo} (${r.placa})`,
        r.funcionario || '-',
        quemDevolveu,
        'Retirada',
        r.status === 'devolvida' ? 'Devolvida' : 'Em uso',
        r.observacao || '-'
      ];
    }
    return [
      UI.formatDate(r.data),
      r.hora,
      r.tipo === 'comum' ? 'Comum' : 'Almoxarifado',
      r.chave || '-',
      r.funcionario || '-',
      quemDevolveu,
      'Retirada',
      r.status === 'devolvida' ? 'Devolvida' : 'Em uso',
      r.observacao || '-'
    ];
  });
}

function generateDayReport() {
  const today = UI.todayISO();
  const list = records.filter((r) => r.data === today).sort((a, b) => (b.dataHora || '').localeCompare(a.dataHora || ''));
  if (list.length === 0) return UI.showToast('Nenhuma movimentação registrada hoje.', 'warning');

  UI.buildPdf({
    title: 'Controle de Chaves ou Item',
    subtitle: 'Relatório do Dia',
    period: UI.formatDate(today),
    columns: ['Data', 'Hora', 'Categoria', 'Chave / Veículo', 'Funcionário', 'Quem devolveu', 'Operação', 'Status', 'Observação'],
    rows: buildReportRows(list),
    filename: `relatorio_chaves_dia_${today}.pdf`
  });
}

function openPeriodReport() {
  UI.openReportModal((start, end) => generatePeriodReport(start, end));
}

function generatePeriodReport(start, end) {
  const list = records
    .filter((r) => r.data >= start && r.data <= end)
    .sort((a, b) => (b.dataHora || '').localeCompare(a.dataHora || ''));
  if (list.length === 0) return UI.showToast('Nenhum registro no período informado.', 'warning');

  UI.buildPdf({
    title: 'Controle de Chaves ou Item',
    subtitle: 'Relatório por Período',
    period: `${UI.formatDate(start)} a ${UI.formatDate(end)}`,
    columns: ['Data', 'Hora', 'Categoria', 'Chave / Veículo', 'Funcionário', 'Quem devolveu', 'Operação', 'Status', 'Observação'],
    rows: buildReportRows(list),
    filename: `relatorio_chaves_${start}_a_${end}.pdf`
  });
}

// ===== EXCEL =====
function exportExcelChaves() {
  const rows = records
    .slice()
    .sort((a, b) => (b.dataHora || '').localeCompare(a.dataHora || ''))
    .map((r) => ({
      'Data': UI.formatDate(r.data),
      'Hora': r.hora,
      'Categoria': r.tipo === 'comum' ? 'Chave Comum' : r.tipo === 'almoxarifado' ? 'Almoxarifado' : 'Veículo',
      'Chave / Veículo': r.tipo === 'veiculo' ? `${r.veiculo} (${r.placa})` : r.chave,
      'Funcionário': r.funcionario || '-',
      'Quem devolveu': r.retornoFuncionario || '-',
      'Operação': 'Retirada',
      'Status': r.status === 'devolvida' ? 'Devolvida' : 'Em uso',
      'Devolução': r.status === 'devolvida' ? `${UI.formatDate(r.retornoData)} ${r.retornoHora}` : '-',
      'Tempo fora': UI.formatDuration(r.dataHora, r.retornoDataHora),
      'Observação': r.observacao || ''
    }));

  UI.exportExcel(rows, Object.keys(rows[0] || {}), `chaves_${UI.todayISO()}.xlsx`);
}

// ===== BACKUP =====
function toggleBackupModal() {
  const el = document.getElementById('backupModal');
  if (el) el.classList.toggle('active');
}

async function exportBackupChaves() {
  try {
    const data = await DB.exportStore('chaves');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    await UI.saveFile(blob, 'backup_chaves_' + UI.todayISO() + '.json');
    UI.showToast('Backup exportado com sucesso!', 'success');
  } catch (e) {
    console.error(e);
    UI.showToast('Erro ao exportar backup.', 'error');
  }
}

async function importBackupChaves(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('Formato inválido');
      await DB.importStore('chaves', data);
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
