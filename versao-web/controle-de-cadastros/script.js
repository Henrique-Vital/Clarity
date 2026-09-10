/* ===================================================================
   CONTROLE DE CADASTROS - SCRIPT.JS
   ===================================================================
   Módulo de cadastro de pessoas (visitantes, moradores, funcionários e
   prestadores). Estrutura genérica: o nome é obrigatório; documento,
   empresa, telefone, e-mail e demais campos são opcionais.
   Persistência em IndexedDB (store: pessoas).
   =================================================================== */

const $ = (sel) => document.querySelector(sel);

// ===== STATE =====
let records = [];
let editingId = null;
let lastSelectedId = null;
let currentTipo = 'visitante';
let _config = null;

// ===== CONFIG =====
async function loadConfig() {
  _config = await Portaria.getConfig();
  const l = Portaria.labels(_config);
  $('#tabMoradorLabel').textContent = l.tipoMorador + 'es';
  $('#labelUnidade').innerHTML = _config.tipoInstalacao === 'condominio'
    ? 'Unidade <em>(opcional)</em>'
    : 'Setor <em>(opcional)</em>';
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  UI.initCommon();
  await loadConfig();
  selectTipo('visitante');
  $('#pessoaForm').addEventListener('submit', (e) => {
    e.preventDefault();
    save();
  });
  await loadRecords();
});

// ===== TABS =====
function selectTipo(tipo) {
  currentTipo = tipo;
  document.querySelectorAll('.tab-btn').forEach((t) => t.classList.toggle('active', t.dataset.tipo === tipo));
  const show = (id) => { const el = $(id); if (el) el.style.display = 'block'; };
  const hide = (id) => { const el = $(id); if (el) el.style.display = 'none'; };

  // Campos específicos por tipo
  hide('#groupUnidade');
  hide('#groupMatricula');
  hide('#groupSetor');
  hide('#groupCargo');
  hide('#groupTipoServico');

  if (tipo === 'visitante' || tipo === 'prestador') show('#groupEmpresa');
  else hide('#groupEmpresa');

  if (tipo === 'morador') show('#groupUnidade');
  if (tipo === 'funcionario') {
    show('#groupMatricula');
    show('#groupSetor');
    show('#groupCargo');
  }
  if (tipo === 'prestador') show('#groupTipoServico');

  if (!editingId) clearForm();
}

// ===== LOAD =====
async function loadRecords() {
  records = await Portaria.getAllPessoas();
  renderHistory();
  updateStatusIndicator();
}

// ===== COLEÇÃO DO FORMULÁRIO =====
function collectForm() {
  const data = {
    nome: $('#pNome').value.trim(),
    tipo: currentTipo,
    documento: $('#pDocumento').value.trim(),
    telefone: $('#pTelefone').value.trim(),
    email: $('#pEmail').value.trim(),
    observacoes: $('#pObs').value.trim(),
    empresa: $('#pEmpresa').value.trim(),
    unidade: $('#pUnidade').value.trim(),
    matricula: $('#pMatricula').value.trim(),
    setor: $('#pSetor').value.trim(),
    cargo: $('#pCargo').value.trim(),
    tipoServico: $('#pTipoServico').value.trim()
  };
  // Remove campos que não pertencem ao tipo
  if (data.tipo === 'visitante' || data.tipo === 'prestador') {
    delete data.unidade; delete data.matricula; delete data.setor; delete data.cargo;
  } else if (data.tipo === 'morador') {
    delete data.empresa; delete data.matricula; delete data.setor; delete data.cargo; delete data.tipoServico;
  } else if (data.tipo === 'funcionario') {
    delete data.empresa; delete data.unidade; delete data.tipoServico;
  } else {
    delete data.unidade; delete data.matricula; delete data.setor; delete data.cargo;
  }
  return data;
}

function fillForm(r) {
  $('#pNome').value = r.nome || '';
  $('#pDocumento').value = r.documento || '';
  $('#pTelefone').value = r.telefone || '';
  $('#pEmail').value = r.email || '';
  $('#pObs').value = r.observacoes || '';
  $('#pEmpresa').value = r.empresa || '';
  $('#pUnidade').value = r.unidade || '';
  $('#pMatricula').value = r.matricula || '';
  $('#pSetor').value = r.setor || '';
  $('#pCargo').value = r.cargo || '';
  $('#pTipoServico').value = r.tipoServico || '';
}

// ===== SALVAR =====
async function save() {
  const data = collectForm();

  if (!data.nome) return UI.showToast('Informe o nome da pessoa.', 'error');

  // Duplicidade: se já existir alguém com o mesmo nome ou documento,
  // solicitar confirmação antes de criar/atualizar.
  const duplicados = await Portaria.findDuplicates(data.nome, data.documento, editingId);
  const salvar = async () => {
    if (editingId) {
      const existing = records.find((r) => r.id === editingId);
      if (!existing) return UI.showToast('Registro não encontrado para edição.', 'error');
      const updated = Object.assign({}, existing, data, { updatedAt: new Date().toISOString() });
      await DB.store('pessoas').put(updated);
      UI.showToast('Cadastro atualizado com sucesso!', 'success');
    } else {
      const record = Object.assign({}, data, {
        id: UI.generateId(),
        ativo: true,
        createdAt: new Date().toISOString()
      });
      await DB.store('pessoas').add(record);
      UI.showToast('Pessoa cadastrada com sucesso!', 'success');
    }
    editingId = null;
    lastSelectedId = null;
    clearForm();
    await loadRecords();
  };

  if (duplicados.length > 0 && !editingId) {
    const tip = duplicados.map((d) => `${d.nome} (${Portaria.tipoLabel(d.tipo)}${d.documento ? ' - ' + d.documento : ''})`).join(', ');
    UI.showConfirm(`Já existem pessoas com este nome ou documento: ${tip}. Deseja criar mesmo assim?`, () => {
      salvar().catch((e) => {
        console.error(e);
        UI.showToast('Erro ao salvar o cadastro.', 'error');
      });
    });
    return;
  }

  try {
    await salvar();
  } catch (e) {
    console.error(e);
    UI.showToast('Erro ao salvar o cadastro.', 'error');
  }
}

// ===== FORM =====
function clearForm() {
  editingId = null;
  $('#pNome').value = '';
  $('#pDocumento').value = '';
  $('#pTelefone').value = '';
  $('#pEmail').value = '';
  $('#pObs').value = '';
  $('#pEmpresa').value = '';
  $('#pUnidade').value = '';
  $('#pMatricula').value = '';
  $('#pSetor').value = '';
  $('#pCargo').value = '';
  $('#pTipoServico').value = '';
  setFormTitle();
}

function setFormTitle() {
  $('#formTitle').textContent = editingId ? 'Editar Cadastro' : 'Novo Cadastro';
}

function loadIntoForm(id) {
  const r = records.find((rec) => rec.id === id);
  if (!r) return UI.showToast('Registro não encontrado.', 'error');
  lastSelectedId = id;
  editingId = id;
  if (r.tipo) selectTipo(r.tipo);
  fillForm(r);
  setFormTitle();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function editSelected() {
  if (!lastSelectedId) return UI.showToast('Selecione uma pessoa no cadastro para editar.', 'warning');
  loadIntoForm(lastSelectedId);
}

function loadSelectedForEdit() {
  loadIntoForm(lastSelectedId);
  UI.closeModal('viewModal');
}

// ===== EXCLUIR =====
// Preserva o histórico: se a pessoa possui movimentações ou autorizações,
// a exclusão é lógica (desativada). Caso contrário o registro é removido.
async function pessoaTemHistorico(pessoaId) {
  try {
    const [es, aut] = await Promise.all([
      DB.store('entradas_saidas').getAll(),
      DB.store('autorizacoes').getAll()
    ]);
    return es.some((r) => r.pessoaId === pessoaId) || aut.some((a) => a.pessoaId === pessoaId);
  } catch (e) {
    return true;
  }
}

async function removerPessoa(id) {
  const hasHistory = await pessoaTemHistorico(id);
  if (hasHistory) {
    const r = records.find((rec) => rec.id === id);
    const updated = Object.assign({}, r, { ativo: false, updatedAt: new Date().toISOString() });
    await DB.store('pessoas').put(updated);
    UI.showToast('Pessoa desativada (possui histórico). Movimentações preservadas.', 'warning');
  } else {
    await DB.store('pessoas').remove(id);
    UI.showToast('Cadastro removido com sucesso.', 'success');
  }
  editingId = null;
  lastSelectedId = null;
  clearForm();
  await loadRecords();
}

function deleteSelected() {
  const id = editingId || lastSelectedId;
  if (!id) return UI.showToast('Nenhum registro selecionado para excluir.', 'warning');
  UI.showConfirm('Tem certeza que deseja excluir esta pessoa?', () => {
    removerPessoa(id).catch((e) => {
      console.error(e);
      UI.showToast('Erro ao excluir.', 'error');
    });
  });
}

function deleteRecord(id) {
  lastSelectedId = id;
  UI.showConfirm('Tem certeza que deseja excluir esta pessoa?', () => {
    removerPessoa(id).catch((e) => {
      console.error(e);
      UI.showToast('Erro ao excluir.', 'error');
    });
  });
}

function reativarPessoa(id) {
  const r = records.find((rec) => rec.id === id);
  DB.store('pessoas').put(Object.assign({}, r, { ativo: true, updatedAt: new Date().toISOString() })).then(() => {
    UI.showToast('Pessoa reativada.', 'success');
    return loadRecords();
  }).catch((e) => {
    console.error(e);
    UI.showToast('Erro ao reativar.', 'error');
  });
}

// ===== VISUALIZAR =====
async function viewRecord(id) {
  const r = records.find((rec) => rec.id === id);
  if (!r) return UI.showToast('Registro não encontrado.', 'error');
  lastSelectedId = id;

  const rows = [
    ['Nome', UI.escHtml(r.nome)],
    ['Tipo', Portaria.tipoLabel(r.tipo)],
    ['CPF ou RG', r.documento ? UI.escHtml(r.documento) : '<em>Não informado</em>'],
    ['Empresa', r.empresa ? UI.escHtml(r.empresa) : '-'],
    ['Unidade', r.unidade ? UI.escHtml(r.unidade) : '-'],
    ['Matrícula', r.matricula ? UI.escHtml(r.matricula) : '-'],
    ['Setor', r.setor ? UI.escHtml(r.setor) : '-'],
    ['Cargo', r.cargo ? UI.escHtml(r.cargo) : '-'],
    ['Tipo de serviço', r.tipoServico ? UI.escHtml(r.tipoServico) : '-'],
    ['Telefone', r.telefone ? UI.escHtml(r.telefone) : '<em>Não informado</em>'],
    ['E-mail', r.email ? UI.escHtml(r.email) : '<em>Não informado</em>'],
    ['Observações', r.observacoes ? UI.escHtml(r.observacoes) : '-'],
    ['Situação', r.ativo === false ? '<span class="badge badge-danger">Inativo</span>' : '<span class="badge badge-success">Ativo</span>']
  ];

  $('#viewModalBody').innerHTML = rows.map(([label, value]) => `
    <div class="detail-row">
      <span class="detail-label">${label}</span>
      <span class="detail-value">${value}</span>
    </div>
  `).join('') + '<div class="detail-divider"></div><div class="detail-section-title"><i class="fas fa-history"></i> Últimos acessos</div><div id="cadMovimentoBox"><p class="detail-empty">Carregando...</p></div>';

  await renderMovimentos(r.id);
  UI.openModal('viewModal');
}

/** Histórico de entradas e saídas da pessoa (mesmos dados mostrados no módulo Entrada e Saída). */
async function renderMovimentos(pessoaId) {
  const box = $('#cadMovimentoBox');
  const all = (await DB.store('entradas_saidas').getAll())
    .filter((m) => m.pessoaId === pessoaId)
    .sort((a, b) => (b.data + 'T' + b.horaEntrada).localeCompare(a.data + 'T' + a.horaEntrada))
    .slice(0, 10);

  if (all.length === 0) {
    box.innerHTML = '<p class="detail-empty">Sem histórico de acessos.</p>';
    return;
  }

  box.innerHTML = `
    <ul class="modal-list">
      ${all.map((m) => `
        <li>
          <span class="badge ${m.status === 'fora' ? 'badge-dark' : 'badge-success'}">
            ${m.status === 'fora' ? 'FORA' : 'DENTRO'}
          </span>
          Entrada <strong>${UI.formatDate(m.data)} ${UI.escHtml(m.horaEntrada)}</strong>
          ${(m.horaSaida || m.saidaHora) ? `&middot; Saída <strong>${UI.formatDate(m.saidaData || m.data)} ${UI.escHtml(m.horaSaida || m.saidaHora)}</strong>` : ''}
        </li>
      `).join('')}
    </ul>
  `;
}

function closeViewModal() {
  UI.closeModal('viewModal');
}

// ===== HISTÓRICO =====
function getFiltered() {
  const busca = Portaria.norm($('#filterBusca').value);
  const tipo = $('#filterTipo').value;
  const status = $('#filterStatus').value;

  return records
    .filter((r) => {
      if (tipo && r.tipo !== tipo) return false;
      if (status === 'ativos' && r.ativo === false) return false;
      if (status === 'inativos' && r.ativo !== false) return false;
      if (busca) {
        const text = Portaria.norm([
          r.nome, r.documento, r.telefone, r.email, r.empresa,
          r.unidade, r.matricula, r.setor, r.cargo, r.tipoServico, r.observacoes
        ].join(' '));
        if (!text.includes(busca)) return false;
      }
      return true;
    })
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
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
    const vinculo = Portaria.vinculoCurto(r);
    tr.innerHTML = `
      <td><strong>${UI.escHtml(r.nome)}</strong></td>
      <td><span class="badge ${Portaria.tipoBadge(r.tipo)}">${Portaria.tipoLabel(r.tipo)}</span></td>
      <td>${r.documento ? UI.escHtml(r.documento) : '<em>-</em>'}</td>
      <td>${vinculo ? UI.escHtml(vinculo) : '<em>-</em>'}</td>
      <td>${r.telefone ? UI.escHtml(r.telefone) : '<em>-</em>'}</td>
      <td>${r.ativo === false
        ? '<span class="badge badge-danger">Inativo</span>'
        : '<span class="badge badge-success">Ativo</span>'}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-info" onclick="viewRecord('${r.id}')" title="Visualizar">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-primary" onclick="loadIntoForm('${r.id}')" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          ${r.ativo === false
            ? `<button class="btn btn-sm btn-success" onclick="reativarPessoa('${r.id}')" title="Reativar">
                <i class="fas fa-play"></i>
              </button>`
            : `<button class="btn btn-sm btn-danger" onclick="deleteRecord('${r.id}')" title="Excluir">
                <i class="fas fa-trash"></i>
              </button>`}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function clearFilters() {
  $('#filterBusca').value = '';
  $('#filterTipo').value = '';
  $('#filterStatus').value = 'ativos';
  renderHistory();
}

// ===== STATUS =====
function updateStatusIndicator() {
  const ativos = records.filter((r) => r.ativo !== false).length;
  $('#statusIndicator').textContent = ativos;
}

// ===== RELATÓRIOS =====
function buildRows(list) {
  return list.map((r) => [
    r.nome || '-',
    Portaria.tipoLabel(r.tipo),
    r.documento || 'Não informado',
    r.empresa || r.unidade || r.setor || r.cargo || r.tipoServico || '-',
    r.telefone || '-',
    r.email || '-',
    r.ativo === false ? 'Inativo' : 'Ativo'
  ]);
}

function generateDayReport() {
  const today = UI.todayISO();
  const list = records.filter((r) => r.createdAt && r.createdAt.slice(0, 10) === today);
  if (list.length === 0) return UI.showToast('Nenhuma pessoa cadastrada hoje.', 'warning');

  UI.buildPdf({
    title: 'CADASTRO DE PESSOAS',
    subtitle: 'Relatório do Dia',
    period: UI.formatDate(today),
    orientation: 'l',
    columns: ['Nome', 'Tipo', 'CPF/RG', 'Vínculo', 'Telefone', 'E-mail', 'Situação'],
    rows: buildRows(list),
    filename: `relatorio_cadastros_dia_${today}.pdf`
  });
}

function openPeriodReport() {
  UI.openReportModal((start, end) => generatePeriodReport(start, end));
}

function generatePeriodReport(start, end) {
  const list = records
    .filter((r) => {
      const d = r.createdAt ? r.createdAt.slice(0, 10) : '';
      return d >= start && d <= end;
    })
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  if (list.length === 0) return UI.showToast('Nenhuma pessoa cadastrada no período informado.', 'warning');

  UI.buildPdf({
    title: 'CADASTRO DE PESSOAS',
    subtitle: 'Relatório por Período',
    period: `${UI.formatDate(start)} a ${UI.formatDate(end)}`,
    orientation: 'l',
    columns: ['Nome', 'Tipo', 'CPF/RG', 'Vínculo', 'Telefone', 'E-mail', 'Situação'],
    rows: buildRows(list),
    filename: `relatorio_cadastros_${start}_a_${end}.pdf`
  });
}

// ===== EXCEL =====
function exportExcelPessoas() {
  const rows = getFiltered().map((r) => ({
    'Nome': r.nome || '',
    'Tipo': Portaria.tipoLabel(r.tipo),
    'CPF ou RG': r.documento || '',
    'Empresa': r.empresa || '',
    'Unidade': r.unidade || '',
    'Matrícula': r.matricula || '',
    'Setor': r.setor || '',
    'Cargo': r.cargo || '',
    'Tipo de serviço': r.tipoServico || '',
    'Telefone': r.telefone || '',
    'E-mail': r.email || '',
    'Observações': r.observacoes || '',
    'Situação': r.ativo === false ? 'Inativo' : 'Ativo'
  }));
  UI.exportExcel(rows, Object.keys(rows[0] || {}), `pessoas_${UI.todayISO()}.xlsx`);
}

// ===== IMPORTAR VISITANTES (Controle de Visitantes -> Cadastro de Pessoas) =====
async function importarVisitantes() {
  try {
    const visitantes = await DB.store('visitantes').getAll();
    if (!visitantes.length) {
      return UI.showToast('Nenhum visitante encontrado no Controle de Visitantes.', 'warning');
    }

    // Deduplica dentro da própria store: mesma pessoa pode ter várias visitas.
    // Chave por nome + documento para agrupar os registros do mesmo visitante.
    const porChave = new Map();
    visitantes.forEach((v) => {
      const chave = Portaria.norm(v.nome || '') + '|' + Portaria.norm(v.cpfRg || '');
      if (!porChave.has(chave)) porChave.set(chave, v);
    });
    const candidatos = [...porChave.values()].filter((v) => (v.nome || '').trim());

    // Verifica duplicidade contra o cadastro de pessoas (incluindo inativas).
    const existentes = await DB.store('pessoas').getAll();
    const nomesExistentes = new Set(existentes.map((p) => Portaria.norm(p.nome)));
    const docsExistentes = new Set(existentes.filter((p) => p.documento).map((p) => Portaria.norm(p.documento)));

    const aImportar = [];
    const jaExistem = [];
    for (const v of candidatos) {
      const nomeL = Portaria.norm(v.nome);
      const docL = Portaria.norm(v.cpfRg);
      if (nomesExistentes.has(nomeL) || (docL && docsExistentes.has(docL))) {
        jaExistem.push(v.nome.trim());
      } else {
        aImportar.push(v);
      }
    }

    if (!aImportar.length) {
      return UI.showToast('Todos os visitantes já estão cadastrados como pessoas.', 'info');
    }

    const msgJa = jaExistem.length
      ? ` Já cadastrados (ignorados): ${jaExistem.slice(0, 5).join(', ')}${jaExistem.length > 5 ? '...' : ''}.`
      : '';
    UI.showConfirm(
      `Serão importados ${aImportar.length} visitante(s) para o Cadastro de Pessoas.${msgJa} Deseja continuar?`,
      async () => {
        try {
          let gravados = 0;
          for (const v of aImportar) {
            const obs = [];
            if (v.responsavel) obs.push('Responsável: ' + v.responsavel);
            if (v.setor) obs.push('Setor: ' + v.setor);
            if (v.motivo) obs.push('Motivo: ' + v.motivo);
            if (v.observacoes) obs.push(v.observacoes);
            const record = {
              id: UI.generateId(),
              nome: v.nome.trim(),
              tipo: 'visitante',
              documento: (v.cpfRg || '').trim(),
              telefone: '',
              email: '',
              empresa: (v.empresa || '').trim(),
              observacoes: obs.join(' | '),
              ativo: true,
              origem: 'visitantes',
              visitanteOrigemId: v.id,
              createdAt: v.data ? v.data + 'T12:00:00' : new Date().toISOString()
            };
            await DB.store('pessoas').add(record);
            gravados++;
          }
          await loadRecords();
          UI.showToast(`Importação concluída: ${gravados} visitante(s) cadastrado(s).`, 'success');
        } catch (e) {
          console.error(e);
          UI.showToast('Erro ao importar visitantes.', 'error');
        }
      }
    );
  } catch (e) {
    console.error(e);
    UI.showToast('Erro ao ler os visitantes.', 'error');
  }
}

// ===== IMPORTAR CONTATOS (arquivo JSON) =====
function parseJsonLenient(str) {
  // Remove BOM e espaços, tenta parse direto; se falhar, remove vírgulas
  // soltas antes de } ou ] (erro comum em JSON editado à mão).
  let s = String(str).replace(/^\uFEFF/, '').trim();
  const tentativas = [
    s,
    s.replace(/,\s*([}\]])/g, '$1')
  ];
  let lastErr = null;
  for (const t of tentativas) {
    try {
      return { ok: true, data: JSON.parse(t) };
    } catch (err) {
      lastErr = err;
    }
  }
  return { ok: false, error: lastErr };
}

function normalizarTipoContato(t) {
  const s = String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (s.includes('funcionario') || s.includes('employee') || s.includes('staff')) return 'funcionario';
  if (s.includes('morador') || s.includes('resident')) return 'morador';
  if (s.includes('prestador') || s.includes('fornecedor') || s.includes('contractor') || s.includes('provider')) return 'prestador';
  return 'visitante';
}

function contatoParaPessoa(c) {
  const data = {
    nome: String(c.nome || c.nomeCompleto || c.name || '').trim(),
    tipo: normalizarTipoContato(c.tipo),
    documento: String(c.documento || c.cpf || c.rg || c.cpfRg || c.cpfCnpj || c.cnpj || '').trim(),
    telefone: String(c.telefone || c.phone || c.celular || c.whatsapp || '').trim(),
    email: String(c.email || c.email2 || '').trim(),
    observacoes: String(c.observacoes || c.observacao || c.obs || '').trim(),
    empresa: String(c.empresa || c.company || '').trim(),
    unidade: String(c.unidade || c.unit || '').trim(),
    matricula: String(c.matricula || c.employeeId || '').trim(),
    setor: String(c.setor || c.departamento || c.department || '').trim(),
    cargo: String(c.cargo || c.position || c.jobTitle || '').trim(),
    tipoServico: String(c.tipoServico || c.serviceType || '').trim()
  };
  if (data.tipo === 'visitante' || data.tipo === 'prestador') {
    delete data.unidade; delete data.matricula; delete data.setor; delete data.cargo;
  } else if (data.tipo === 'morador') {
    delete data.empresa; delete data.matricula; delete data.setor; delete data.cargo; delete data.tipoServico;
  } else if (data.tipo === 'funcionario') {
    delete data.empresa; delete data.unidade; delete data.tipoServico;
  } else {
    delete data.unidade; delete data.matricula; delete data.setor; delete data.cargo;
  }
  return data;
}

async function importarContatos(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const resultado = parseJsonLenient(e.target.result);
      if (!resultado.ok) {
        throw resultado.error || new Error('JSON inválido');
      }
      let parsed = resultado.data;
      // Aceita um array direto ou um objeto com a lista em "contatos" / "pessoas" / "registros".
      if (parsed && !Array.isArray(parsed)) {
        parsed = parsed.contatos || parsed.pessoas || parsed.registros || [];
      }
      if (!Array.isArray(parsed) || !parsed.length) {
        throw new Error('Lista de contatos vazia');
      }

      const existentes = await DB.store('pessoas').getAll();
      const nomesExistentes = new Set(existentes.map((p) => Portaria.norm(p.nome)));
      const docsExistentes = new Set(existentes.filter((p) => p.documento).map((p) => Portaria.norm(p.documento)));

      const aImportar = [];
      const jaExistem = [];
      parsed.forEach((c) => {
        const base = contatoParaPessoa(c);
        if (!base.nome) return;
        const nomeL = Portaria.norm(base.nome);
        const docL = Portaria.norm(base.documento);
        if (nomesExistentes.has(nomeL) || (docL && docsExistentes.has(docL))) {
          jaExistem.push(base.nome);
        } else {
          aImportar.push(base);
        }
      });

      if (!aImportar.length) {
        UI.showToast('Todos os contatos já estão cadastrados como pessoas.', 'info');
        event.target.value = '';
        return;
      }

      const msgJa = jaExistem.length
        ? ` Já cadastrados (ignorados): ${jaExistem.slice(0, 5).join(', ')}${jaExistem.length > 5 ? '...' : ''}.`
        : '';
      UI.showConfirm(
        `Serão importados ${aImportar.length} contato(s) para o Cadastro de Pessoas.${msgJa} Deseja continuar?`,
        async () => {
          try {
            let gravados = 0;
            for (const base of aImportar) {
              const record = Object.assign({}, base, {
                id: UI.generateId(),
                ativo: true,
                origem: 'contatos',
                createdAt: new Date().toISOString()
              });
              await DB.store('pessoas').add(record);
              gravados++;
            }
            await loadRecords();
            UI.showToast(`Importação concluída: ${gravados} contato(s) cadastrado(s).`, 'success');
          } catch (err) {
            console.error(err);
            UI.showToast('Erro ao importar contatos.', 'error');
          }
        }
      );
    } catch (err) {
      console.error(err);
      const detalhe = (err && err.message) || 'erro desconhecido';
      UI.showToast('Arquivo inválido. Verifique se o JSON é válido. Detalhe: ' + detalhe, 'error');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// ===== BACKUP =====
function toggleBackupModal() {
  const el = document.getElementById('backupModal');
  if (el) el.classList.toggle('active');
}

async function exportBackupPessoas() {
  try {
    const data = await DB.exportStore('pessoas');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    await UI.saveFile(blob, 'backup_pessoas_' + UI.todayISO() + '.json');
    UI.showToast('Backup exportado com sucesso!', 'success');
  } catch (e) {
    console.error(e);
    UI.showToast('Erro ao exportar backup.', 'error');
  }
}

async function importBackupPessoas(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('Formato inválido');
      await DB.importStore('pessoas', data);
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