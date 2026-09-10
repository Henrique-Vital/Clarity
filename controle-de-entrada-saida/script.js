/* ===================================================================
   CONTROLE DE ENTRADA E SAÍDA - SCRIPT.JS
   ===================================================================
   Fluxo principal do porteiro: pesquisar pessoa por NOME ou CPF/RG
   (pesquisa automática), verificar cadastro, autorização e status, e
   registrar entrada ou saída. Se a pessoa não estiver cadastrada,
   permite cadastrar e registrar a entrada em uma única operação.
   Persistência em IndexedDB (stores: pessoas, entradas_saidas).
   =================================================================== */

const $ = (sel) => document.querySelector(sel);

// ===== STATE =====
let movimentacoes = [];
let selectedPessoa = null;
let _config = null;
const PAGE_SIZE = 20;
let historyPage = 1;
let editingMovId = null;
let saidaMovId = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  UI.initCommon();
  _config = await Portaria.getConfig();
  await loadPorteiro();
  await loadRecords();

  $('#esBusca').addEventListener('input', debounceBuscar);
  $('#esPorteiro').addEventListener('change', () => salvarPorteiro());
  $('#novaPessoaForm').addEventListener('submit', (e) => {
    e.preventDefault();
    salvarNovaPessoaComEntrada();
  });
  $('#npTipo').addEventListener('change', atualizarCamposNovaPessoa);
});

// ===== PORTEIRO (memória do último porteiro) =====
async function loadPorteiro() {
  const nome = localStorage.getItem('clarityPorteiro') || '';
  $('#esPorteiro').value = nome;
}

function salvarPorteiro() {
  localStorage.setItem('clarityPorteiro', $('#esPorteiro').value.trim());
}

function getPorteiro() {
  const v = $('#esPorteiro').value.trim();
  return v || localStorage.getItem('clarityPorteiro') || '';
}

// ===== CARREGAR MOVIMENTAÇÕES =====
async function loadRecords() {
  movimentacoes = await DB.store('entradas_saidas').getAll();
  renderHistory();
  updateStatusIndicator();
}

// ===== PESQUISA AUTOMÁTICA =====
function debounceBuscar() {
  clearTimeout(window._esBuscaTimer);
  window._esBuscaTimer = setTimeout(buscar, 250);
  atualizarBotaoLimpar();
}

function atualizarBotaoLimpar() {
  const btn = $('#esBuscaLimpar');
  if (!btn) return;
  btn.classList.toggle('hidden', !$('#esBusca').value);
}

function limparBusca() {
  $('#esBusca').value = '';
  resetAtendimento();
  atualizarBotaoLimpar();
  $('#esBusca').focus();
}

async function buscar() {
  const q = $('#esBusca').value.trim();
  resetAtendimento();
  if (!q) return;

  const resultados = await Portaria.searchPessoas(q);
  if (resultados.length === 0) {
    $('#esNaoEncontrado').classList.remove('hidden');
    return;
  }
  renderResultados(resultados);
}

function resetAtendimento() {
  selectedPessoa = null;
  $('#esResultados').innerHTML = '';
  $('#esResultados').classList.remove('open');
  $('#esNaoEncontrado').classList.add('hidden');
  const card = $('#esPessoaCard');
  if (card) card.classList.add('hidden');
}

function renderResultados(list) {
  const box = $('#esResultados');
  const cards = list.slice(0, 12).map((p) => {
    const vinculo = Portaria.vinculoCurto(p);
    return `
      <li class="es-result-item" onclick="selecionarPessoa('${p.id}')">
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

// ===== SELEÇÃO DA PESSOA =====
async function selecionarPessoa(id) {
  const p = await Portaria.getPessoa(id);
  if (!p) return UI.showToast('Cadastro não encontrado.', 'error');
  selectedPessoa = p;

  $('#esResultados').classList.remove('open');
  $('#esBusca').value = p.nome;
  atualizarBotaoLimpar();
  $('#esNaoEncontrado').classList.add('hidden');
  const card = $('#esPessoaCard');
  card.classList.remove('hidden');

  $('#esPessoaNomeInput').value = p.nome || '';
  $('#esPessoaTipoInput').value = p.tipo || 'visitante';
  $('#esPessoaVinculo').textContent = Portaria.vinculoDaPessoa(p, _config);
  $('#esPessoaDocInput').value = p.documento || '';
  $('#esPessoaEmpresaInput').value = p.empresa || '';
  $('#esPessoaTelefoneInput').value = p.telefone || '';
  $('#esPessoaEmailInput').value = p.email || '';
  $('#esPessoaObsInput').value = p.observacoes || '';
  $('#esPessoaRespInput').value = '';

  await renderPessoaStatus(p);
  await renderAutorizacoes(p);
  await renderUltimos(p);
}

/**
 * Salva no cadastro os dados editados no card da pessoa.
 * É chamado ao clicar em "Registrar Entrada" ou "Registrar Saída".
 */
async function salvarDadosEditadosPessoa() {
  if (!selectedPessoa) return false;
  const nome = $('#esPessoaNomeInput').value.trim();
  if (!nome) {
    UI.showToast('Informe o nome da pessoa.', 'error');
    return false;
  }
  const data = {
    nome,
    tipo: $('#esPessoaTipoInput').value,
    documento: $('#esPessoaDocInput').value.trim(),
    empresa: $('#esPessoaEmpresaInput').value.trim(),
    telefone: $('#esPessoaTelefoneInput').value.trim(),
    email: $('#esPessoaEmailInput').value.trim(),
    observacoes: $('#esPessoaObsInput').value.trim()
  };
  const updated = Object.assign({}, selectedPessoa, data, { updatedAt: new Date().toISOString() });
  try {
    await DB.store('pessoas').put(updated);
    selectedPessoa = updated;
    $('#esPessoaVinculo').textContent = Portaria.vinculoDaPessoa(updated, _config);
    return true;
  } catch (e) {
    console.error(e);
    UI.showToast('Erro ao salvar os dados da pessoa.', 'error');
    return false;
  }
}

async function renderPessoaStatus(p) {
  const dentro = await Portaria.pessoaDentro(p.id);
  const statusEl = $('#esPessoaStatus');
  const btnEnt = $('#esBtnEntrada');
  const btnSai = $('#esBtnSaida');

  if (dentro) {
    statusEl.innerHTML = '<span class="badge badge-success es-badge-status">PESSOA DENTRO</span>';
    btnEnt.disabled = true;
    btnEnt.classList.add('disabled');
    btnSai.disabled = false;
    btnSai.classList.remove('disabled');
  } else {
    statusEl.innerHTML = '<span class="badge badge-dark es-badge-status">FORA</span>';
    btnEnt.disabled = false;
    btnEnt.classList.remove('disabled');
    btnSai.disabled = true;
    btnSai.classList.add('disabled');
  }
}

async function renderAutorizacoes(p) {
  const box = $('#esPessoaAutorizacoes');
  const badgeBox = $('#esPessoaAuthBadge');
  const ativas = await Portaria.getAutorizacoesAtivas(p.id);
  if (ativas.length === 0) {
    box.innerHTML = '<p class="es-auth-empty"><i class="fas fa-check-circle"></i> Nenhuma autorização ativa.</p>';
    if (badgeBox) badgeBox.innerHTML = '';
    return;
  }
  if (badgeBox) {
    badgeBox.innerHTML = '<span class="badge badge-success es-badge-status es-auth-badge"><i class="fas fa-check-circle"></i> AUTORIZADO</span>';
  }
  const respInput = $('#esPessoaRespInput');
  if (respInput && !respInput.value) respInput.value = ativas[0].responsavelNome || '';
  box.innerHTML = `
    <div class="es-auth-title"><i class="fas fa-file-contract"></i> Autorização ativa</div>
    ${ativas.map((a) => `
      <div class="es-auth-item">
        <strong>${UI.escHtml(a.responsavelNome || '')}</strong>
        <span class="badge ${Portaria.tipoBadge(a.responsavelTipo)}">${Portaria.tipoLabel(a.responsavelTipo)}</span>
      </div>
      <div class="es-auth-detalhe">Autorizou: ${UI.escHtml(p.nome)} &middot; ${Portaria.formatPeriodo(a)}</div>
      <div class="es-auth-detalhe">Forma: ${formaAutorizacaoLabel(a.forma)}</div>
    `).join('')}
  `;
}

async function renderUltimos(p) {
  const box = $('#esUltimos');
  const all = movimentacoes
    .filter((r) => r.pessoaId === p.id)
    .sort((a, b) => (b.data + 'T' + b.horaEntrada).localeCompare(a.data + 'T' + a.horaEntrada))
    .slice(0, 4);

  if (all.length === 0) {
    box.innerHTML = '<p class="es-auth-empty">Sem histórico de acessos.</p>';
    return;
  }

  box.innerHTML = `
    <div class="es-auth-title"><i class="fas fa-history"></i> Últimos acessos</div>
    <ul class="es-ultimos-list">
      ${all.map((r) => `
        <li>
          <span class="badge ${r.status === 'fora' ? 'badge-dark' : 'badge-success'}">
            ${r.status === 'fora' ? 'FORA' : 'DENTRO'}
          </span>
          Entrada <strong>${UI.formatDate(r.data)} ${UI.escHtml(r.horaEntrada)}</strong>
          ${r.horaSaida ? `&middot; Saída <strong>${UI.formatDate(r.saidaData || r.data)} ${UI.escHtml(r.horaSaida)}</strong>` : ''}
        </li>
      `).join('')}
    </ul>
  `;
}

// ===== NOVA PESSOA + ENTRADA =====
function abrirNovaPessoa() {
  const q = $('#esBusca').value.trim();
  $('#npNome').value = q || '';
  $('#npTipo').value = 'visitante';
  $('#npDocumento').value = '';
  $('#npEmpresa').value = '';
  $('#npUnidade').value = '';
  $('#npSetor').value = '';
  $('#npTipoServico').value = '';
  $('#npTelefone').value = '';
  $('#npEmail').value = '';
  $('#npResponsavel').value = '';
  $('#npObs').value = '';
  atualizarCamposNovaPessoa();
  UI.openModal('novaPessoaModal');
  setTimeout(() => $('#npNome').focus(), 100);
}

function atualizarCamposNovaPessoa() {
  const tipo = $('#npTipo').value;
  const show = (id, v) => { const el = $(id); if (el) el.style.display = v ? 'block' : 'none'; };
  show('#npGroupEmpresa', tipo === 'visitante' || tipo === 'prestador');
  show('#npGroupUnidade', tipo === 'morador');
  show('#npGroupSetor', tipo === 'funcionario');
  show('#npGroupTipoServico', tipo === 'prestador');
}

async function salvarNovaPessoaComEntrada() {
  const nome = $('#npNome').value.trim();
  if (!nome) return UI.showToast('Informe o nome da pessoa.', 'error');
  const responsavel = $('#npResponsavel').value.trim();

  const data = {
    nome,
    tipo: $('#npTipo').value,
    documento: $('#npDocumento').value.trim(),
    empresa: $('#npEmpresa').value.trim(),
    unidade: $('#npUnidade').value.trim(),
    setor: $('#npSetor').value.trim(),
    tipoServico: $('#npTipoServico').value.trim(),
    telefone: $('#npTelefone').value.trim(),
    email: $('#npEmail').value.trim(),
    observacoes: $('#npObs').value.trim(),
    ativo: true
  };
  if (data.tipo === 'visitante' || data.tipo === 'prestador') data.unidade = data.setor = '';
  if (data.tipo === 'morador') { data.empresa = data.setor = data.tipoServico = ''; }
  if (data.tipo === 'funcionario') { data.empresa = data.unidade = data.tipoServico = ''; }

  try {
    // Duplicidade: avisa e pede confirmação antes de cadastrar.
    const duplicados = await Portaria.findDuplicates(data.nome, data.documento, null);
    if (duplicados.length > 0) {
      const tip = duplicados.map((d) => d.nome + ' (' + Portaria.tipoLabel(d.tipo) + ')').join(', ');
      UI.showConfirm(`Já existem pessoas com este nome ou documento: ${tip}. Deseja criar mesmo assim?`, () => {
        criarPessoaEentrada(data, responsavel);
      });
      return;
    }
    await criarPessoaEentrada(data, responsavel);
  } catch (e) {
    console.error(e);
    UI.showToast('Erro ao cadastrar a pessoa.', 'error');
  }
}

async function criarPessoaEentrada(data, responsavel) {
  const p = Object.assign({}, data, { id: UI.generateId(), createdAt: new Date().toISOString() });
  await DB.store('pessoas').add(p);
  selectedPessoa = p;

  await registrarEntrada(p, { responsavel: responsavel || '', observacoes: '' });

  UI.closeModal('novaPessoaModal');
  $('#esBusca').value = p.nome;
  await selecionarPessoa(p.id);
  UI.showToast(`✓ Pessoa cadastrada e entrada registrada: ${p.nome}`, 'success');
}

// ===== ENTRADA =====
/** Registra a entrada direto (sem modal), usando os dados do card. */
async function registrarEntradaDireta() {
  if (!selectedPessoa) return UI.showToast('Selecione uma pessoa primeiro.', 'warning');
  const salvo = await salvarDadosEditadosPessoa();
  if (!salvo) return;

  const hora = UI.nowTime();
  const autAtivas = await Portaria.getAutorizacoesAtivas(selectedPessoa.id);
  const autId = autAtivas.length > 0 ? autAtivas[0].id : null;

  await registrarEntrada(selectedPessoa, {
    responsavel: $('#esPessoaRespInput').value.trim(),
    observacoes: '',
    autorizacaoId: autId
  });

  await selecionarPessoa(selectedPessoa.id);
  UI.showToast(`Entrada registrada: ${selectedPessoa.nome} às ${hora}`, 'success');
}

/** Abre o modal de entrada em modo edição para alterar o registro. */
function editarMov(id) {
  const r = movimentacoes.find((x) => x.id === id);
  if (!r) return UI.showToast('Registro não encontrado.', 'error');
  editingMovId = id;
  const titulo = $('#entradaModalTitle');
  const btn = $('#entradaModalBtn');
  if (titulo) titulo.innerHTML = '<i class="fas fa-edit"></i> Editar Movimentação';
  if (btn) btn.innerHTML = '<i class="fas fa-check"></i> Salvar Alterações';
  $('#entData').value = r.data || '';
  $('#entHora').value = r.horaEntrada || '';
  $('#entPorteiro').value = r.porteiro || '';
  $('#entResponsavel').value = r.responsavel || '';
  $('#entObs').value = r.observacoes || '';
  $('#entradaPessoaInfo').innerHTML = `<strong>${UI.escHtml(r.nome)}</strong>`;
  UI.openModal('entradaModal');
}

async function confirmarEntrada() {
  if (editingMovId) {
    return confirmarEdicaoMov();
  }
  if (!selectedPessoa) return;
  const data = $('#entData').value;
  const hora = $('#entHora').value;
  const porteiro = $('#entPorteiro').value.trim();
  if (!data || !hora) return UI.showToast('Informe data e hora.', 'error');
  if (!porteiro) return UI.showToast('Informe o nome do porteiro.', 'error');

  const autAtivas = await Portaria.getAutorizacoesAtivas(selectedPessoa.id);
  const autId = autAtivas.length > 0 ? autAtivas[0].id : null;

  await registrarEntrada(selectedPessoa, {
    responsavel: $('#entResponsavel').value.trim(),
    observacoes: $('#entObs').value.trim(),
    autorizacaoId: autId
  });

  UI.closeModal('entradaModal');
  await selecionarPessoa(selectedPessoa.id);
  UI.showToast(`Entrada registrada: ${selectedPessoa.nome} às ${hora}`, 'success');
}

async function confirmarEdicaoMov() {
  const id = editingMovId;
  const r = movimentacoes.find((x) => x.id === id);
  if (!r) return UI.showToast('Registro não encontrado.', 'error');

  const data = $('#entData').value;
  const hora = $('#entHora').value;
  const porteiro = $('#entPorteiro').value.trim();
  if (!data || !hora) return UI.showToast('Informe data e hora.', 'error');
  if (!porteiro) return UI.showToast('Informe o nome do porteiro.', 'error');

  const updated = Object.assign({}, r, {
    data,
    horaEntrada: hora,
    porteiro,
    responsavel: $('#entResponsavel').value.trim(),
    observacoes: $('#entObs').value.trim(),
    updatedAt: new Date().toISOString()
  });
  await DB.store('entradas_saidas').put(updated);
  editingMovId = null;
  UI.closeModal('entradaModal');
  await loadRecords();
  UI.showToast('Movimentação atualizada com sucesso!', 'success');
}

async function registrarEntrada(p, extra) {
  const record = Object.assign({
    id: UI.generateId(),
    pessoaId: p.id,
    nome: p.nome,
    tipo: p.tipo,
    documento: p.documento || '',
    data: UI.todayISO(),
    horaEntrada: UI.nowTime(),
    saidaData: '',
    saidaHora: '',
    saidaPorteiro: '',
    porteiro: getPorteiro() || extra.porteiro || '',
    responsavel: (extra && extra.responsavel) || '',
    observacoes: (extra && extra.observacoes) || '',
    autorizacaoId: (extra && extra.autorizacaoId) || null,
    origem: 'entrada',
    status: 'dentro',
    createdAt: new Date().toISOString()
  }, {});
  await DB.store('entradas_saidas').add(record);
  await loadRecords();
  return record;
}

// ===== SAÍDA =====
async function abrirModalSaida() {
  if (!selectedPessoa) return UI.showToast('Selecione uma pessoa primeiro.', 'warning');
  const salvo = await salvarDadosEditadosPessoa();
  if (!salvo) return;
  saidaMovId = null;
  if (getPorteiro()) $('#esPorteiro').value = getPorteiro();
  $('#saiData').value = UI.todayISO();
  $('#saiHora').value = UI.nowTime();
  $('#saiPorteiro').value = getPorteiro();
  $('#saidaPessoaInfo').innerHTML = `<strong>${UI.escHtml(selectedPessoa.nome)}</strong>`;
  UI.openModal('saidaModal');
}

/** Registra a saída direto da movimentação da tabela. */
function registrarSaidaDireta(id) {
  const r = movimentacoes.find((x) => x.id === id);
  if (!r) return UI.showToast('Registro não encontrado.', 'error');
  if (r.horaSaida || r.status === 'fora') {
    return UI.showToast('Esta pessoa já registrou saída neste registro.', 'warning');
  }
  saidaMovId = id;
  selectedPessoa = { id: r.pessoaId };
  $('#saiData').value = UI.todayISO();
  $('#saiHora').value = UI.nowTime();
  $('#saiPorteiro').value = getPorteiro() || r.porteiro || '';
  $('#saidaPessoaInfo').innerHTML = `<strong>${UI.escHtml(r.nome)}</strong>`;
  UI.openModal('saidaModal');
}

async function confirmarSaida() {
  const data = $('#saiData').value;
  const hora = $('#saiHora').value;
  const porteiro = $('#saiPorteiro').value.trim();
  if (!data || !hora) return UI.showToast('Informe data e hora.', 'error');
  if (!porteiro) return UI.showToast('Informe o nome do porteiro.', 'error');

  let ultimo;
  if (saidaMovId) {
    ultimo = movimentacoes.find((x) => x.id === saidaMovId);
    saidaMovId = null;
  } else {
    if (!selectedPessoa) return;
    ultimo = await Portaria.ultimoAcesso(selectedPessoa.id);
  }
  if (!ultimo) return UI.showToast('Não há registro de entrada para esta pessoa.', 'warning');
  if (ultimo.horaSaida) return UI.showToast('Esta pessoa já registrou saída.', 'warning');

  const updated = Object.assign({}, ultimo, {
    saidaData: data,
    saidaHora: hora,
    saidaPorteiro: porteiro,
    status: 'fora',
    horaSaida: hora,
    updatedAt: new Date().toISOString()
  });
  await DB.store('entradas_saidas').put(updated);
  await loadRecords();

  UI.closeModal('saidaModal');
  if (selectedPessoa && selectedPessoa.id) {
    await selecionarPessoa(selectedPessoa.id);
  }
  UI.showToast(`Saída registrada: ${ultimo.nome} às ${hora}`, 'success');
}

// ===== HISTÓRICO DE MOVIMENTAÇÕES =====
function getFiltered() {
  const data = $('#filterData').value;
  const busca = Portaria.norm($('#filterBusca').value);
  const tipo = $('#filterTipo').value;
  const status = $('#filterStatus').value;

  return movimentacoes
    .filter((r) => {
      if (data && r.data !== data) return false;
      if (tipo && r.tipo !== tipo) return false;
      if (status && r.status !== status) return false;
      if (busca) {
        const text = Portaria.norm([r.nome, r.documento, r.porteiro, r.responsavel].join(' '));
        if (!text.includes(busca)) return false;
      }
      return true;
    })
    .sort((a, b) => (b.data + 'T' + b.horaEntrada).localeCompare(a.data + 'T' + a.horaEntrada));
}

function renderHistory() {
  const tbody = $('#historyBody');
  const empty = $('#emptyHistory');
  const countEl = $('#recordCount');

  const filtered = getFiltered();
  countEl.textContent = filtered.length + ' registro(s)';
  empty.style.display = filtered.length ? 'none' : 'block';

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (historyPage > totalPages) historyPage = totalPages;
  if (historyPage < 1) historyPage = 1;
  const slice = filtered.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);
  tbody.innerHTML = '';

  slice.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${UI.formatDate(r.data)}</td>
      <td>${UI.escHtml(r.horaEntrada)}</td>
      <td>${r.horaSaida ? UI.escHtml(r.horaSaida) : '<span class="badge badge-success">No local</span>'}</td>
      <td><strong>${UI.escHtml(r.nome)}</strong></td>
      <td><span class="badge ${Portaria.tipoBadge(r.tipo)}">${Portaria.tipoLabel(r.tipo)}</span></td>
      <td>${r.documento ? UI.escHtml(r.documento) : '<em>-</em>'}</td>
      <td>${UI.escHtml(r.porteiro)}</td>
      <td>${r.responsavel ? UI.escHtml(r.responsavel) : '<em>-</em>'}</td>
      <td>${r.status === 'fora'
        ? '<span class="badge badge-dark">Fora</span>'
        : '<span class="badge badge-success">Dentro</span>'}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-info" onclick="viewMov('${r.id}')" title="Visualizar">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-primary" onclick="editarMov('${r.id}')" title="Editar registro">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="excluirMov('${r.id}')" title="Cancelar / apagar registro">
            <i class="fas fa-times"></i>
          </button>
          ${!r.horaSaida ? `
          <button class="btn btn-sm btn-danger" onclick="registrarSaidaDireta('${r.id}')" title="Registrar saída">
            <i class="fas fa-sign-out-alt"></i>
          </button>` : ''}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination(filtered.length, totalPages);
}

function renderPagination(total, totalPages) {
  const pag = $('#historyPagination');
  const prev = $('#historyPrevBtn');
  const next = $('#historyNextBtn');
  const info = $('#historyPageInfo');
  if (!pag) return;
  if (total === 0) {
    pag.style.display = 'none';
    return;
  }
  pag.style.display = 'flex';
  const from = (historyPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(historyPage * PAGE_SIZE, total);
  info.textContent = `${from}-${to} de ${total}`;
  if (prev) prev.disabled = historyPage <= 1;
  if (next) next.disabled = historyPage >= totalPages;
}

function changePage(delta) {
  historyPage += delta;
  renderHistory();
}

function pesquisar() {
  historyPage = 1;
  renderHistory();
}

function clearFilters() {
  $('#filterData').value = '';
  $('#filterBusca').value = '';
  $('#filterTipo').value = '';
  $('#filterStatus').value = '';
  historyPage = 1;
  renderHistory();
}

function viewMov(id) {
  const r = movimentacoes.find((x) => x.id === id);
  if (!r) return UI.showToast('Registro não encontrado.', 'error');
  const rows = [
    ['Pessoa', UI.escHtml(r.nome)],
    ['Tipo', Portaria.tipoLabel(r.tipo)],
    ['Documento', r.documento ? UI.escHtml(r.documento) : '<em>Não informado</em>'],
    ['Data de entrada', UI.formatDate(r.data)],
    ['Hora de entrada', UI.escHtml(r.horaEntrada)],
    ['Data de saída', r.saidaData ? UI.formatDate(r.saidaData) : '-'],
    ['Hora de saída', r.horaSaida ? UI.escHtml(r.horaSaida) : '<span class="badge badge-success">No local</span>'],
    ['Porteiro', UI.escHtml(r.porteiro)],
    ['Responsável / autorizador', r.responsavel ? UI.escHtml(r.responsavel) : '<em>-</em>'],
    ['Observações', r.observacoes ? UI.escHtml(r.observacoes) : '-'],
    ['Situação', r.status === 'fora' ? '<span class="badge badge-dark">Fora</span>' : '<span class="badge badge-success">Dentro</span>']
  ];
  $('#viewMovBody').innerHTML = rows.map(([label, value]) => `
    <div class="detail-row">
      <span class="detail-label">${label}</span>
      <span class="detail-value">${value}</span>
    </div>
  `).join('');
  UI.openModal('viewMovModal');
}

function closeViewModal() {
  UI.closeModal('viewMovModal');
}

// ===== EXCLUIR MOVIMENTAÇÃO =====
function excluirMov(id) {
  const r = movimentacoes.find((x) => x.id === id);
  if (!r) return UI.showToast('Registro não encontrado.', 'error');
  UI.showConfirm(
    `Apagar a movimentação de ${r.nome} (${UI.formatDate(r.data)} ${UI.escHtml(r.horaEntrada)})? Esta ação não pode ser desfeita.`,
    async () => {
      await DB.store('entradas_saidas').remove(id);
      await loadRecords();
      UI.showToast('Movimentação apagada com sucesso.', 'success');
    }
  );
}

// ===== STATUS =====
function updateStatusIndicator() {
  const today = UI.todayISO();
  const hoje = movimentacoes.filter((r) => r.data === today).length;
  $('#statusIndicator').textContent = hoje;
}

// ===== RELATÓRIOS =====
function buildRows(list) {
  return list.map((r) => [
    UI.formatDate(r.data),
    r.horaEntrada || '-',
    r.horaSaida || '-',
    r.nome || '-',
    Portaria.tipoLabel(r.tipo),
    r.documento || 'Não informado',
    r.porteiro || '-',
    r.responsavel || '-',
    r.status === 'fora' ? 'Fora' : 'Dentro'
  ]);
}

function generateDayReport() {
  const today = UI.todayISO();
  const list = getFiltered().filter((r) => r.data === today);
  if (list.length === 0) return UI.showToast('Nenhuma movimentação hoje.', 'warning');

  UI.buildPdf({
    title: 'ENTRADA E SAÍDA',
    subtitle: 'Relatório do Dia',
    period: UI.formatDate(today),
    orientation: 'l',
    columns: ['Data', 'Entrada', 'Saída', 'Pessoa', 'Tipo', 'Doc.', 'Porteiro', 'Responsável', 'Situação'],
    rows: buildRows(list),
    filename: `relatorio_entrada_saida_dia_${today}.pdf`
  });
}

function openPeriodReport() {
  UI.openReportModal((start, end) => generatePeriodReport(start, end));
}

function generatePeriodReport(start, end) {
  const list = movimentacoes
    .filter((r) => r.data >= start && r.data <= end)
    .sort((a, b) => (a.data + a.horaEntrada).localeCompare(b.data + b.horaEntrada));
  if (list.length === 0) return UI.showToast('Nenhuma movimentação no período informado.', 'warning');

  UI.buildPdf({
    title: 'ENTRADA E SAÍDA',
    subtitle: 'Relatório por Período',
    period: `${UI.formatDate(start)} a ${UI.formatDate(end)}`,
    orientation: 'l',
    columns: ['Data', 'Entrada', 'Saída', 'Pessoa', 'Tipo', 'Doc.', 'Porteiro', 'Responsável', 'Situação'],
    rows: buildRows(list),
    filename: `relatorio_entrada_saida_${start}_a_${end}.pdf`
  });
}

// ===== EXCEL =====
function exportExcelMovimentacoes() {
  const rows = getFiltered().map((r) => ({
    'Data': UI.formatDate(r.data),
    'Hora Entrada': r.horaEntrada || '',
    'Hora Saída': r.horaSaida || '',
    'Pessoa': r.nome || '',
    'Tipo': Portaria.tipoLabel(r.tipo),
    'CPF ou RG': r.documento || '',
    'Porteiro': r.porteiro || '',
    'Responsável': r.responsavel || '',
    'Observações': r.observacoes || '',
    'Situação': r.status === 'fora' ? 'Fora' : 'Dentro'
  }));
  UI.exportExcel(rows, Object.keys(rows[0] || {}), `entradas_saidas_${UI.todayISO()}.xlsx`);
}

// ===== BACKUP =====
function toggleBackupModal() {
  const el = document.getElementById('backupModal');
  if (el) el.classList.toggle('active');
}

async function exportBackupMovimentacoes() {
  try {
    const dados = {
      entradas_saidas: await DB.exportStore('entradas_saidas'),
      pessoas: await DB.exportStore('pessoas')
    };
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    await UI.saveFile(blob, 'backup_movimentacoes_' + UI.todayISO() + '.json');
    UI.showToast('Backup exportado com sucesso!', 'success');
  } catch (e) {
    console.error(e);
    UI.showToast('Erro ao exportar backup.', 'error');
  }
}

async function importBackupMovimentacoes(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data && Array.isArray(data.entradas_saidas)) {
        await DB.importStore('entradas_saidas', data.entradas_saidas);
      } else if (Array.isArray(data)) {
        await DB.importStore('entradas_saidas', data);
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