/* ===================================================================
   CONTROLE DE CAIXA DE PRIMEIROS SOCORROS - SCRIPT.JS
   ===================================================================
   Sistema completo para controle de insumos de primeiros socorros.
   Utiliza LocalStorage para persistência. Gera PDF, exporta Excel,
   envia WhatsApp e muito mais.
   =================================================================== */

// ===== INVENTORY DATA =====
const DEFAULT_INVENTORY = [
  { id: 1, item: "Aparelho de Pressão",     remaining: 1 },
  { id: 2, item: "Gaze",                    remaining: 11 },
  { id: 3, item: "Atadura",                 remaining: 4 },
  { id: 4, item: "Esparadrapo",             remaining: 1 },
  { id: 5, item: "Band Aid",                remaining: 60 },
  { id: 6, item: "Spray Antisséptico",      remaining: 2 },
  { id: 7, item: "Água Boricada",            remaining: 3 },
  { id: 8, item: "Tesoura",                 remaining: 1 },
  { id: 9, item: "Luvas Látex",            remaining: 15 }
];

// ===== STATE =====
const EMPRESA = 'Clarity Glass';

let state = {
  inventory: [],
  occurrences: [],
  currentOccurrenceId: null,
  currentNumber: 1,
  theme: 'light',
  logo: null
};

// ===== DOM REFS =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  await loadState();
  applyLogo();
  applyTheme();
  updateDateTime();
  renderInventory();
  updateDashboard();
  updateOccurrenceNumber();
  renderHistory();
  setDefaultDate();

  // Auto-save on form changes
  $$('#occurrenceForm input, #occurrenceForm select, #occurrenceForm textarea').forEach(el => {
    el.addEventListener('change', autoSaveForm);
    el.addEventListener('input', autoSaveForm);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);

  renderUsedItemsForm();

  // Hide loading screen
  setTimeout(() => {
    $('#loadingScreen').classList.add('hidden');
  }, 600);

  // Clock update
  setInterval(updateDateTime, 1000);

  // Check auto-save on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') autoSaveForm();
  });
});

// ===== PERSISTÊNCIA (IndexedDB, com migração do localStorage) =====
const FIRST_AID_STORE = 'primeiros_socorros';
const FIRST_AID_KEY = 'state';

/** Aplica um objeto de estado salvo ao estado em memória. */
function applySavedState(parsed) {
  state.inventory = parsed.inventory || JSON.parse(JSON.stringify(DEFAULT_INVENTORY));
  state.occurrences = parsed.occurrences || [];
  state.currentOccurrenceId = parsed.currentOccurrenceId || null;
  state.currentNumber = parsed.currentNumber || 1;
  state.theme = parsed.theme || 'light';
  state.logo = parsed.logo || null;
  if (state.currentOccurrenceId) {
    const occ = findOccurrence(state.currentOccurrenceId);
    if (occ) populateForm(occ);
  }
}

/** Lê o estado do IndexedDB; se não existir, migra do localStorage. */
async function loadState() {
  let parsed = null;

  // 1) IndexedDB (fonte principal).
  try {
    if (typeof DB !== 'undefined' && DB.store) {
      parsed = await DB.store(FIRST_AID_STORE).get(FIRST_AID_KEY);
    }
  } catch (e) {
    console.warn('Erro ao ler primeiros socorros do IndexedDB:', e);
  }

  // 2) Migração: dados antigos no localStorage.
  if (!parsed) {
    try {
      const saved = localStorage.getItem('firstAidSystem');
      if (saved) {
        parsed = JSON.parse(saved);
        console.info('Primeiros socorros: migrando dados do localStorage para o IndexedDB.');
      }
    } catch (e) {
      console.warn('Erro ao ler estado do localStorage:', e);
    }
  }

  if (parsed) {
    applySavedState(parsed);
  } else {
    resetToDefault();
  }

  // Garante inventário válido.
  if (!state.inventory || state.inventory.length === 0) {
    resetToDefault();
  }

  // Grava no IndexedDB (migração/atualização) e mantém o espelho legado.
  persistState();

  // Migra itens antigos de Band Aid.
  migrateBandAid();
}

/** Grava o estado no IndexedDB (assíncrono). */
async function persistState() {
  try {
    if (typeof DB !== 'undefined' && DB.store) {
      await DB.store(FIRST_AID_STORE).put(Object.assign({ id: FIRST_AID_KEY }, state));
    }
  } catch (e) {
    console.warn('Erro ao salvar primeiros socorros no IndexedDB:', e);
  }
}

function resetToDefault() {
  state.inventory = JSON.parse(JSON.stringify(DEFAULT_INVENTORY));
  state.occurrences = [];
  state.currentOccurrenceId = null;
  state.currentNumber = 1;
  saveState();
}

function migrateBandAid() {
  const caixa1 = state.inventory.find(i => i.item === "Band Aid Caixa 1");
  const caixa2 = state.inventory.find(i => i.item === "Band Aid Caixa 2");
  if (caixa1 || caixa2) {
    const total = (caixa1 ? caixa1.remaining : 0) + (caixa2 ? caixa2.remaining : 0);
    state.inventory = state.inventory.filter(i => i.item !== "Band Aid Caixa 1" && i.item !== "Band Aid Caixa 2");
    state.inventory.push({ id: 5, item: "Band Aid", remaining: total });
    // Re-number IDs
    state.inventory.forEach((item, idx) => { item.id = idx + 1; });
    saveState();
    renderInventory();
    renderUsedItemsForm();
    updateDashboard();
  }
}

function saveState() {
  // IndexedDB é a fonte principal; o localStorage é mantido apenas como
  // espelho de compatibilidade (leituras antigas/backup).
  persistState();
  try {
    localStorage.setItem('firstAidSystem', JSON.stringify(state));
    showAutoSaveIndicator(true);
  } catch (e) {
    console.warn('Erro ao salvar:', e);
  }
}

function showAutoSaveIndicator(saved) {
  const el = $('#autoSaveIndicator');
  if (saved) {
    el.innerHTML = '<i class="fas fa-check-circle" style="color:var(--success)"></i> Salvo';
  } else {
    el.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
  }
}

function autoSaveForm() {
  showAutoSaveIndicator(false);
  // Debounce save
  clearTimeout(window._autoSaveTimer);
  window._autoSaveTimer = setTimeout(() => {
    if (state.currentOccurrenceId) {
      const occ = collectFormData();
      occ.id = state.currentOccurrenceId;
      const idx = state.occurrences.findIndex(o => o.id === occ.id);
      if (idx >= 0) {
        occ.inventory = JSON.parse(JSON.stringify(state.inventory));
        state.occurrences[idx] = occ;
      }
      saveState();
      renderHistory();
      updateDashboard();
    } else {
      saveState();
    }
  }, 500);
}

// ===== DATE & TIME =====
function updateDateTime() {
  const now = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  $('#currentDate').textContent = now.toLocaleDateString('pt-BR', opts);
  $('#currentTime').textContent = now.toLocaleTimeString('pt-BR');
  $('#footerYear').textContent = now.getFullYear();
}

function setDefaultDate() {
  if (!$('#dataOcorrencia').value) {
    $('#dataOcorrencia').value = new Date().toISOString().split('T')[0];
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR');
}

function formatDateTimeISO() {
  const now = new Date();
  return now.toISOString().slice(0, 16).replace('T', ' ');
}

// ===== OCCURRENCE NUMBER =====
function updateOccurrenceNumber() {
  const num = String(state.currentNumber).padStart(3, '0');
  $('#occurrenceNumber').textContent = num;
}

function nextOccurrenceNumber() {
  // Find the max occurrence number
  let max = 0;
  state.occurrences.forEach(o => {
    if (o.number > max) max = o.number;
  });
  state.currentNumber = Math.max(state.currentNumber, max + 1);
  updateOccurrenceNumber();
}

// ===== INVENTORY TABLE =====
function renderInventory() {
  const tbody = $('#inventoryBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  state.inventory.forEach((item, idx) => {
    const status = getStatus(item.remaining);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><strong>${item.item}</strong></td>
      <td>
        <input type="number" value="${item.remaining}"
               min="0"
               data-id="${item.id}"
               onchange="updateRemaining(${item.id}, this.value)"
               onfocus="this.select()"
               aria-label="Quantidade restante de ${item.item}">
      </td>
      <td>${status}</td>
    `;
    tbody.appendChild(tr);
  });
}

function getStatus(remaining) {
  if (remaining <= 0) return '<span class="badge badge-dark">SEM ESTOQUE</span>';
  if (remaining <= 1) return '<span class="badge badge-danger">Crítico</span>';
  if (remaining <= 3) return '<span class="badge badge-orange">Atenção</span>';
  if (remaining <= 5) return '<span class="badge badge-warning">Alerta</span>';
  return '<span class="badge badge-success">OK</span>';
}

/** Texto simples da situação de estoque (para PDF e WhatsApp). */
function getStatusText(remaining) {
  if (remaining <= 0) return 'Sem estoque';
  if (remaining <= 1) return 'Crítico';
  if (remaining <= 3) return 'Atenção';
  if (remaining <= 5) return 'Alerta';
  return 'OK';
}

function updateRemaining(id, value) {
  const item = state.inventory.find(i => i.id === id);
  if (!item) return;

  const val = parseInt(value);
  if (isNaN(val)) {
    showToast('Valor inválido. Digite um número.', 'error');
    renderInventory();
    return;
  }
  if (val < 0) {
    showToast('Não é permitido valor negativo.', 'error');
    renderInventory();
    return;
  }

  item.remaining = val;
  saveState();
  renderInventory();
  updateDashboard();
  autoSaveForm();
}

function restoreStock() {
  showConfirm('Tem certeza que deseja zerar o estoque?', () => {
    state.inventory.forEach(item => {
      item.remaining = 0;
    });
    saveState();
    renderInventory();
    renderUsedItemsForm();
    updateDashboard();
    showToast('Estoque zerado com sucesso!', 'success');
  });
}

// ===== USED ITEMS FORM =====
function renderUsedItemsForm() {
  const tbody = $('#usedItemsBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  state.inventory.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${item.item}</strong></td>
      <td>
        <input type="number" value="0" min="0"
               class="used-item-qty" data-id="${item.id}"
               onchange="onUsedItemChange(${item.id}, this.value)"
               onfocus="this.select()"
               aria-label="Quantidade utilizada de ${item.item}">
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function onUsedItemChange(id, value) {
  const val = parseInt(value);
  if (isNaN(val) || val < 0) {
    showToast('Valor inválido para item utilizado.', 'error');
    renderUsedItemsForm();
    return;
  }
  autoSaveForm();
}

function collectUsedItems() {
  const used = [];
  $$('.used-item-qty').forEach(input => {
    const qty = parseInt(input.value) || 0;
    if (qty > 0) {
      const item = state.inventory.find(i => i.id === parseInt(input.dataset.id));
      if (item) {
        used.push({ id: item.id, item: item.item, quantity: qty });
      }
    }
  });
  return used;
}

// ===== DASHBOARD =====
function updateDashboard() {
  const total = state.inventory.length;
  const totalStock = state.inventory.reduce((sum, i) => sum + i.remaining, 0);
  const empty = state.inventory.filter(i => i.remaining <= 0).length;
  const alert = state.inventory.filter(i => i.remaining > 0 && i.remaining <= 5).length;
  const totalRemaining = totalStock;
  const totalRecords = state.occurrences.length;

  animateNumber('dashTotalItems', total);
  animateNumber('dashTotalStock', totalStock);
  animateNumber('dashEmptyItems', empty);
  animateNumber('dashAlertItems', alert);
  animateNumber('dashTotalRemaining', totalRemaining);
  animateNumber('dashTotalRecords', totalRecords);
  $('#recordCount').textContent = totalRecords + ' registro(s)';
}

function animateNumber(id, target) {
  const el = $(`#${id}`);
  if (!el) return;
  const current = parseInt(el.textContent) || 0;
  if (current === target) return;
  const diff = target - current;
  const step = Math.ceil(Math.abs(diff) / 20);
  let count = current;
  const interval = setInterval(() => {
    if (diff > 0) {
      count = Math.min(count + step, target);
    } else {
      count = Math.max(count - step, target);
    }
    el.textContent = count;
    if (count === target) clearInterval(interval);
  }, 30);
}

// ===== FORM =====
function collectFormData() {
  return {
    empresa: EMPRESA,
    lider: $('#lider').value.trim(),
    setor: $('#setor').value,
    usuario: $('#usuario').value.trim(),
    telefone: $('#telefone').value.trim(),
    data: $('#dataOcorrencia').value,
    descricao: $('#descricao').value.trim(),
    observacoes: $('#observacoes').value.trim(),
    inventory: JSON.parse(JSON.stringify(state.inventory)),
    usedItems: collectUsedItems(),
    timestamp: new Date().toISOString()
  };
}

function populateForm(occ) {
  $('#lider').value = occ.lider || '';
  $('#setor').value = occ.setor || '';
  $('#usuario').value = occ.usuario || '';
  $('#telefone').value = occ.telefone || '';
  $('#dataOcorrencia').value = occ.data || '';
  $('#descricao').value = occ.descricao || '';
  $('#observacoes').value = occ.observacoes || '';

  // Populate used items
  if (occ.usedItems && occ.usedItems.length > 0) {
    $$('.used-item-qty').forEach(input => {
      const id = parseInt(input.dataset.id);
      const found = occ.usedItems.find(u => u.id === id);
      if (found) input.value = found.quantity;
      else input.value = 0;
    });
  } else {
    $$('.used-item-qty').forEach(input => { input.value = 0; });
  }
}

function clearForm() {
  $('#lider').value = '';
  $('#setor').value = '';
  $('#usuario').value = '';
  $('#telefone').value = '';
  $('#dataOcorrencia').value = new Date().toISOString().split('T')[0];
  $('#descricao').value = '';
  $('#observacoes').value = '';
  $$('.used-item-qty').forEach(input => { input.value = 0; });
  state.currentOccurrenceId = null;
  saveState();
  renderHistory();
  showToast('Formulário limpo.', 'info');
}

// ===== SAVE OCCURRENCE =====
function saveOccurrence() {
  // Validate required fields
  const lider = $('#lider').value.trim();
  const setor = $('#setor').value;
  const usuario = $('#usuario').value.trim();
  const descricao = $('#descricao').value.trim();

  if (!lider) { showToast('O campo Líder é obrigatório.', 'error'); $('#lider').focus(); return; }
  if (!setor) { showToast('O campo Setor é obrigatório.', 'error'); $('#setor').focus(); return; }
  if (!usuario) { showToast('O campo Usuário é obrigatório.', 'error'); $('#usuario').focus(); return; }
  if (!descricao) { showToast('O campo Descrição é obrigatório.', 'error'); $('#descricao').focus(); return; }

  const formData = collectFormData();
  formData.number = state.currentNumber;
  formData.id = state.currentOccurrenceId || generateId();

  // Reverse old used items if editing
  if (state.currentOccurrenceId) {
    const oldOcc = findOccurrence(state.currentOccurrenceId);
    if (oldOcc && oldOcc.usedItems) {
      oldOcc.usedItems.forEach(u => {
        const item = state.inventory.find(i => i.id === u.id);
        if (item) item.remaining += u.quantity;
      });
    }
  }

  // Apply new used items to inventory
  const newUsed = formData.usedItems || [];
  newUsed.forEach(u => {
    const item = state.inventory.find(i => i.id === u.id);
    if (item) {
      item.remaining = Math.max(0, item.remaining - u.quantity);
    }
  });

  if (state.currentOccurrenceId) {
    // Update existing
    const idx = state.occurrences.findIndex(o => o.id === state.currentOccurrenceId);
    if (idx >= 0) {
      formData.createdAt = state.occurrences[idx].createdAt;
      formData.inventory = JSON.parse(JSON.stringify(state.inventory));
      state.occurrences[idx] = formData;
    } else {
      formData.createdAt = new Date().toISOString();
      state.occurrences.push(formData);
    }
  } else {
    // New occurrence
    formData.createdAt = new Date().toISOString();
    formData.inventory = JSON.parse(JSON.stringify(state.inventory));
    state.occurrences.push(formData);
    state.currentNumber++;
  }

  state.currentOccurrenceId = formData.id;
  updateOccurrenceNumber();
  saveState();
  renderInventory();
  renderUsedItemsForm();
  updateDashboard();
  renderHistory();
  showToast('Ocorrência salva com sucesso!', 'success');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function findOccurrence(id) {
  return state.occurrences.find(o => o.id === id);
}

// ===== HISTORY =====
function renderHistory() {
  const tbody = $('#historyBody');
  if (!tbody) return;

  const searchTerm = ($('#searchInput').value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const dateStart = $('#filterDateStart').value;
  const dateEnd = $('#filterDateEnd').value;
  const filterSetor = $('#filterSetor').value;
  const sortOrder = $('#sortOrder').value;

  let filtered = state.occurrences.filter(occ => {
    // Text search
    const text = (occ.lider + ' ' + occ.setor + ' ' + occ.usuario + ' ' + occ.descricao).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (searchTerm && !text.includes(searchTerm)) return false;

    // Date filter
    if (dateStart && occ.data < dateStart) return false;
    if (dateEnd && occ.data > dateEnd) return false;

    // Setor filter
    if (filterSetor && !occ.setor.toLowerCase().includes(filterSetor.toLowerCase())) return false;

    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    const dateA = new Date(a.data || a.createdAt).getTime();
    const dateB = new Date(b.data || b.createdAt).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const empty = $('#emptyHistory');
  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = '';
  filtered.forEach((occ, idx) => {
    const tr = document.createElement('tr');
    const num = String(occ.number).padStart(3, '0');
    const descShort = occ.descricao.length > 50 ? occ.descricao.slice(0, 50) + '...' : occ.descricao;
    tr.innerHTML = `
      <td><strong>${num}</strong></td>
      <td>${formatDate(occ.data)}</td>
      <td>${escHtml(occ.lider)}</td>
      <td>${escHtml(occ.setor)}</td>
      <td>${escHtml(occ.usuario)}</td>
      <td>${escHtml(descShort)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-info" onclick="viewOccurrence('${occ.id}')" title="Visualizar">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-primary" onclick="editOccurrence('${occ.id}')" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-success" onclick="generateOccurrencePDF('${occ.id}')" title="Gerar PDF">
            <i class="fas fa-file-pdf"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteOccurrence('${occ.id}')" title="Excluir">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function escHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ===== VIEW OCCURRENCE =====
let viewingId = null;

function viewOccurrence(id) {
  viewingId = id;
  const occ = findOccurrence(id);
  if (!occ) { showToast('Ocorrência não encontrada.', 'error'); return; }

  const body = $('#viewModalBody');
  const used = occ.usedItems || [];
  const allInv = occ.inventory || state.inventory;

  let usedHtml = '';
  if (used.length > 0) {
    usedHtml = `
      <h3 style="margin-top:16px;font-size:0.95rem;color:var(--primary);">
        <i class="fas fa-hand-holding"></i> Insumos Utilizados
      </h3>
      <table class="view-detail-table">
        <thead><tr><th>Item</th><th>Qtd. Utilizada</th></tr></thead>
        <tbody>
          ${used.map(u => `
            <tr>
              <td>${escHtml(u.item)}</td>
              <td>${u.quantity}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else {
    usedHtml = '<p style="margin-top:12px;color:var(--text-secondary)"><i class="fas fa-check-circle" style="color:var(--success)"></i> Nenhum insumo foi utilizado nesta ocorrência.</p>';
  }

  const stockHtml = `
    <h3 style="margin-top:16px;font-size:0.95rem;color:var(--primary);">
      <i class="fas fa-boxes"></i> Estoque Atual da Caixa
    </h3>
    <table class="view-detail-table">
      <thead><tr><th>Item</th><th>Qtd. em Estoque</th></tr></thead>
      <tbody>
        ${allInv.map(i => `
          <tr>
            <td>${escHtml(i.item)}</td>
            <td>${i.remaining}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  body.innerHTML = `
    <div class="detail-row"><span class="detail-label">Ocorrência N°</span><span class="detail-value">${String(occ.number).padStart(3, '0')}</span></div>
    <div class="detail-row"><span class="detail-label">Data</span><span class="detail-value">${formatDate(occ.data)}</span></div>
    <div class="detail-row"><span class="detail-label">Empresa</span><span class="detail-value">${escHtml(occ.empresa)}</span></div>
    <div class="detail-row"><span class="detail-label">Líder</span><span class="detail-value">${escHtml(occ.lider)}</span></div>
    <div class="detail-row"><span class="detail-label">Setor</span><span class="detail-value">${escHtml(occ.setor)}</span></div>
    <div class="detail-row"><span class="detail-label">Usuário</span><span class="detail-value">${escHtml(occ.usuario)}</span></div>
    ${occ.telefone ? `<div class="detail-row"><span class="detail-label">Telefone</span><span class="detail-value">${escHtml(occ.telefone)}</span></div>` : ''}
    <div class="detail-row" style="flex-direction:column;gap:4px;">
      <span class="detail-label">Descrição</span>
      <span class="detail-value" style="white-space:pre-wrap;">${escHtml(occ.descricao)}</span>
    </div>
    ${occ.observacoes ? `<div class="detail-row" style="flex-direction:column;gap:4px;"><span class="detail-label">Observações</span><span class="detail-value" style="white-space:pre-wrap;">${escHtml(occ.observacoes)}</span></div>` : ''}
    ${usedHtml}
    ${stockHtml}
  `;

  $('#viewModal').classList.add('active');
}

function closeViewModal() {
  $('#viewModal').classList.remove('active');
  viewingId = null;
}

// ===== EDIT OCCURRENCE =====
function editOccurrence(id) {
  const occ = findOccurrence(id);
  if (!occ) { showToast('Ocorrência não encontrada.', 'error'); return; }

  state.currentOccurrenceId = id;
  populateForm(occ);
  // Restore inventory snapshot
  if (occ.inventory) {
    state.inventory = JSON.parse(JSON.stringify(occ.inventory));
    renderInventory();
    updateDashboard();
  }
  saveState();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('Ocorrência carregada para edição.', 'info');
}

// ===== DELETE OCCURRENCE =====
function deleteOccurrence(id) {
  showConfirm('Tem certeza que deseja excluir esta ocorrência? Esta ação não pode ser desfeita.', () => {
    state.occurrences = state.occurrences.filter(o => o.id !== id);
    if (state.currentOccurrenceId === id) {
      state.currentOccurrenceId = null;
      clearForm();
    }
    saveState();
    renderHistory();
    updateDashboard();
    showToast('Ocorrência excluída com sucesso.', 'success');
  });
}

// ===== PDF GENERATION =====
  // Salva o PDF na pasta escolhida ou via download no navegador.
function saveGeneratedPdf(doc, fileName) {
  const FileService = window.PortariaServices ? window.PortariaServices.FileService : null;
  if (FileService && typeof FileService.savePdf === 'function') {
    const blob = doc.output('blob');
    return FileService.savePdf(blob, fileName);
  }
  doc.save(fileName);
  return Promise.resolve({ ok: true });
}

// Gera o PDF SOMENTE da ocorrência (dados + insumos utilizados).
function generateOccurrencePDF(id) {
  let occ;
  if (id) {
    occ = findOccurrence(id);
  } else {
    // Use current form data if no occurrence is being edited
    const lider = $('#lider').value.trim();
    const setor = $('#setor').value;
    if (!lider || !setor) {
      showToast('Preencha os campos obrigatórios antes de gerar o PDF.', 'error');
      return;
    }
    occ = collectFormData();
    occ.number = state.currentNumber;
    occ.data = occ.data || new Date().toISOString().split('T')[0];
  }

  if (!occ) { showToast('Nenhuma ocorrência para gerar PDF.', 'error'); return; }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(26, 115, 232);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('CONTROLE DE CAIXA DE PRIMEIROS SOCORROS', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Relatório de Ocorrência', pageWidth / 2, 32, { align: 'center' });

    // Info section
    let y = 50;
    doc.setTextColor(33, 33, 33);
    doc.setFontSize(10);
    const info = [
      ['Ocorrência N°:', String(occ.number).padStart(3, '0')],
      ['Data:', formatDate(occ.data)],
      ['Empresa:', occ.empresa || '-'],
      ['Líder:', occ.lider || '-'],
      ['Setor:', occ.setor || '-'],
      ['Usuário:', occ.usuario || '-'],
      ['Telefone:', occ.telefone || '-']
    ];

    doc.setFillColor(240, 244, 248);
    info.forEach((row, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(245, 247, 250);
        doc.rect(15, y - 3, pageWidth - 30, 8, 'F');
      }
      doc.setFont(undefined, 'bold');
      doc.text(row[0], 20, y);
      doc.setFont(undefined, 'normal');
      doc.text(row[1], 65, y);
      y += 8;
    });

    // Description
    y += 4;
    doc.setFillColor(26, 115, 232);
    doc.rect(15, y - 1, pageWidth - 30, 0.5, 'F');
    y += 6;
    doc.setFont(undefined, 'bold');
    doc.text('Descrição:', 20, y);
    y += 6;
    doc.setFont(undefined, 'normal');
    const descLines = doc.splitTextToSize(occ.descricao || '-', pageWidth - 40);
    doc.text(descLines, 20, y);
    y += descLines.length * 5 + 4;

    if (occ.observacoes) {
      doc.setFont(undefined, 'bold');
      doc.text('Observações:', 20, y);
      y += 6;
      doc.setFont(undefined, 'normal');
      const obsLines = doc.splitTextToSize(occ.observacoes, pageWidth - 40);
      doc.text(obsLines, 20, y);
      y += obsLines.length * 5 + 4;
    }

    // Used items table
    const used = occ.usedItems || [];
    if (used.length > 0) {
      doc.setFont(undefined, 'bold');
      doc.text('Insumos Utilizados nesta Ocorrência:', 20, y + 2);
      y += 8;

      const usedData = used.map(u => [u.item, String(u.quantity)]);
      doc.autoTable({
        startY: y,
        head: [['Item', 'Qtd. Utilizada']],
        body: usedData,
        theme: 'grid',
        headStyles: {
          fillColor: [26, 115, 232],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 40, halign: 'center' }
        }
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // Footer
    const finalY = doc.lastAutoTable.finalY || y;
    doc.setFillColor(26, 115, 232);
    doc.rect(0, 280, pageWidth, 17, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Documento gerado automaticamente pelo Sistema de Controle de Caixa de Primeiros Socorros', pageWidth / 2, 289, { align: 'center' });
    doc.text('Ocorrência N° ' + String(occ.number).padStart(3, '0') + ' | ' + formatDateTimeISO(), pageWidth / 2, 294, { align: 'center' });

    saveGeneratedPdf(doc, 'ocorrencia_' + String(occ.number).padStart(3, '0') + '.pdf')
      .then(() => showToast('PDF gerado com sucesso!', 'success'))
      .catch((err) => {
        console.error('Erro ao salvar PDF:', err);
        showToast('Erro ao salvar o PDF.', 'error');
      });
  } catch (e) {
    console.error('Erro ao gerar PDF:', e);
    showToast('Erro ao gerar PDF. Verifique a conexão com a internet.', 'error');
  }
}

// Gera o PDF SOMENTE do controle de estoque (itens e situação).
function generateStockPDF() {
  if (!window.jspdf) {
    showToast('Erro ao gerar PDF. Verifique a conexão com a internet.', 'error');
    return;
  }
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const today = new Date().toISOString().split('T')[0];

    // Header
    doc.setFillColor(26, 115, 232);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('CONTROLE DE CAIXA DE PRIMEIROS SOCORROS', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Controle de Estoque', pageWidth / 2, 32, { align: 'center' });

    // Informações gerais do estoque
    const semEstoque = state.inventory.filter(i => i.remaining <= 0).length;
    const alerta = state.inventory.filter(i => i.remaining > 0 && i.remaining <= 5).length;
    let y = 50;
    doc.setTextColor(33, 33, 33);
    doc.setFontSize(10);
    const info = [
      ['Empresa:', EMPRESA],
      ['Data:', formatDate(today)],
      ['Total de Itens:', String(state.inventory.length)],
      ['Itens sem Estoque:', String(semEstoque)],
      ['Itens em Alerta:', String(alerta)]
    ];
    info.forEach((row, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(245, 247, 250);
        doc.rect(15, y - 3, pageWidth - 30, 8, 'F');
      }
      doc.setFont(undefined, 'bold');
      doc.text(row[0], 20, y);
      doc.setFont(undefined, 'normal');
      doc.text(row[1], 90, y);
      y += 8;
    });

    // Tabela do estoque
    y += 6;
    const stockData = state.inventory.map(i => [i.item, String(i.remaining), getStatusText(i.remaining)]);
    doc.autoTable({
      startY: y,
      head: [['Item', 'Qtd. Restante', 'Situação']],
      body: stockData,
      theme: 'grid',
      headStyles: {
        fillColor: [26, 115, 232],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 50, halign: 'center' }
      }
    });

    // Footer
    doc.setFillColor(26, 115, 232);
    doc.rect(0, pageHeight - 17, pageWidth, 17, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Documento gerado automaticamente pelo Sistema de Controle de Caixa de Primeiros Socorros', pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.text('Controle de Estoque | ' + formatDateTimeISO(), pageWidth / 2, pageHeight - 3, { align: 'center' });

    saveGeneratedPdf(doc, 'estoque_primeiros_socorros_' + today + '.pdf')
      .then(() => showToast('PDF do estoque gerado com sucesso!', 'success'))
      .catch((err) => {
        console.error('Erro ao salvar PDF do estoque:', err);
        showToast('Erro ao salvar o PDF.', 'error');
      });
  } catch (e) {
    console.error('Erro ao gerar PDF do estoque:', e);
    showToast('Erro ao gerar PDF. Verifique a conexão com a internet.', 'error');
  }
}
// ===== WHATSAPP =====
// Envia SOMENTE os dados da ocorrência (sem o estoque).
function sendOccurrenceWhatsApp(id) {
  let occ;
  if (id) {
    occ = findOccurrence(id);
  } else {
    const lider = $('#lider').value.trim();
    const setor = $('#setor').value;
    if (!lider || !setor) {
      showToast('Preencha os campos obrigatórios antes de enviar.', 'error');
      return;
    }

    occ = collectFormData();
    occ.number = state.currentNumber;
  }

  if (!occ) { showToast('Nenhuma ocorrência para enviar.', 'error'); return; }

  const used = occ.usedItems || [];

  let msg = '';
  msg += `*CONTROLE CAIXA PRIMEIROS SOCORROS*\n`;
  msg += `Ocorrência: ${String(occ.number).padStart(3, '0')}  ${formatDate(occ.data)}\n`;
  msg += `Líder: ${occ.lider || '-'}  Setor: ${occ.setor || '-'}\n`;
  msg += `Usuário: ${occ.usuario || '-'}\n`;
  msg += `\n*Descrição:*\n${occ.descricao || '-'}\n`;
  if (occ.observacoes) msg += `\n*Obs.:* ${occ.observacoes}\n`;

  msg += `\n*Insumos Utilizados:*\n`;
  if (used.length > 0) {
    used.forEach(u => { msg += `- ${u.item}: ${u.quantity}\n`; });
  } else {
    msg += `Nenhum\n`;
  }

  msg += `\n-- Gerado pelo Sistema de Controle de Caixa de Primeiros Socorros`;

  const url = `https://wa.me/5512988644868?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  showToast('WhatsApp aberto em nova aba.', 'info');
}

// Envia SOMENTE o controle de estoque (itens e situação).
function sendStockWhatsApp() {
  if (!state.inventory || state.inventory.length === 0) {
    showToast('Nenhum item de estoque para enviar.', 'warning');
    return;
  }

  let msg = '';
  msg += `*CONTROLE DE ESTOQUE - CAIXA PRIMEIROS SOCORROS*\n`;
  msg += `Data: ${formatDate(new Date().toISOString().split('T')[0])}\n`;
  msg += `\n*Estoque Atual:*\n`;
  state.inventory.forEach(i => {
    msg += `- ${i.item}: ${i.remaining} (${getStatusText(i.remaining)})\n`;
  });

  msg += `\n-- Gerado pelo Sistema de Controle de Caixa de Primeiros Socorros`;

  const url = `https://wa.me/5512988644868?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  showToast('WhatsApp aberto em nova aba.', 'info');
}

// ===== EXCEL EXPORT =====
function exportExcel() {
  if (state.occurrences.length === 0) {
    showToast('Nenhuma ocorrência para exportar.', 'warning');
    return;
  }

  try {
    const data = [];

    state.occurrences.forEach((occ) => {
      const inv = occ.inventory;
      inv.forEach(i => {
        data.push({
          'Ocorrência': String(occ.number).padStart(3, '0'),
          'Data': formatDate(occ.data),
          'Empresa': occ.empresa,
          'Líder': occ.lider,
          'Setor': occ.setor,
          'Usuário': occ.usuario,
          'Telefone': occ.telefone || '',
          'Descrição': occ.descricao,
          'Observações': occ.observacoes || '',
          'Item': i.item,
          'Qtd. em Estoque': i.remaining
        });
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Column widths
    ws['!cols'] = [
      { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 20 },
      { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 40 },
      { wch: 30 }, { wch: 25 }, { wch: 14 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Ocorrências');
    XLSX.writeFile(wb, 'ocorrencias_primeiros_socorros.xlsx');
    showToast('Planilha exportada com sucesso!', 'success');
  } catch (e) {
    console.error('Erro ao exportar Excel:', e);
    showToast('Erro ao exportar Excel. Verifique a conexão com a internet.', 'error');
  }
}

// ===== BACKUP =====
function toggleBackupModal() {
  $('#backupModal').classList.toggle('active');
}

function exportBackup() {
  try {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    UI.saveFile(blob, 'backup_primeiros_socorros_' + new Date().toISOString().slice(0, 10) + '.json')
      .then(() => showToast('Backup exportado com sucesso!', 'success'))
      .catch(() => showToast('Erro ao exportar backup.', 'error'));
  } catch (e) {
    showToast('Erro ao exportar backup.', 'error');
  }
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.inventory && data.occurrences !== undefined) {
        state = data;
        saveState();
        renderInventory();
        updateDashboard();
        updateOccurrenceNumber();
        renderHistory();
        showToast('Backup importado com sucesso!', 'success');
        toggleBackupModal();
      } else {
        showToast('Arquivo de backup inválido.', 'error');
      }
    } catch (err) {
      showToast('Erro ao ler arquivo de backup.', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ===== LOGO =====
document.getElementById('logoArea')?.addEventListener('click', () => {
  document.getElementById('logoInput').click();
});

// Exibe o logo no cabeçalho (personalizado se existir; senão, o padrão).
function applyLogo() {
  const logoArea = $('#logoArea');
  if (!logoArea) return;
  const logo = state.logo || window.CLARITY_LOGO || '';
  if (logo) logoArea.innerHTML = `<img src="${logo}" alt="Logo Clarity Glass">`;
}

function uploadLogo(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    state.logo = e.target.result;
    const logoArea = $('#logoArea');
    logoArea.innerHTML = `<img src="${state.logo}" alt="Logo">`;
    saveState();
    showToast('Logo atualizada com sucesso!', 'success');
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

// ===== THEME =====
function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme();
  saveState();
}

function applyTheme() {
  if (state.theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    $('#themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    document.documentElement.removeAttribute('data-theme');
    $('#themeToggle').innerHTML = '<i class="fas fa-moon"></i>';
  }
}

$('#themeToggle').addEventListener('click', toggleTheme);

// ===== TOAST =====
function showToast(message, type = 'info') {
  const container = $('#toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-times-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };

  toast.innerHTML = `
    <i class="${icons[type] || icons.info}"></i>
    <span>${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 5000);
}

// ===== CONFIRM MODAL =====
function showConfirm(message, callback) {
  $('#confirmModalBody').innerHTML = `<p>${message}</p>`;
  const btn = $('#confirmBtn');
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', () => {
    $('#confirmModal').classList.remove('active');
    callback();
  });
  $('#confirmModal').classList.add('active');
}

function closeConfirmModal() {
  $('#confirmModal').classList.remove('active');
}

// Close modals on overlay click
$$('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});

// Close modals on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    $$('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }
});

// ===== KEYBOARD SHORTCUTS =====
function handleKeyboardShortcuts(e) {
  // Ctrl+S -> Save
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    saveOccurrence();
  }
  // Ctrl+N -> New / Clear
  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault();
    clearForm();
  }
  // Ctrl+P -> Print
  if (e.ctrlKey && e.key === 'p') {
    // Let default print happen, but we also handle it
  }
}

// ===== CLOSE MODALS ON OUTSIDE CLICK =====
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});
