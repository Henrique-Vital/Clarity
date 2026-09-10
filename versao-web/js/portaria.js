/* ===================================================================
   CLARITY GLASS - PORTARIA - PORTARIA.JS
   ===================================================================
   Helpers compartilhados dos módulos de expansão do sistema:
   Cadastro de Pessoas, Controle de Entrada e Saída, Autorizações e
   Configurações. Exposto em window.Portaria.

   Estrutura genérica de pessoa: o mesmo cadastro atende condomínios e
   empresas (tipos: visitante, morador, funcionario, prestador).
   Documento (CPF/RG) é opcional — o nome é o único campo obrigatório.
   =================================================================== */

const Portaria = (() => {
  const CONFIG_ID = 'config';

  const DEFAULT_CONFIG = {
    id: CONFIG_ID,
    tipoInstalacao: 'empresa',
    autorizadores: {
      morador: true,
      funcionario: true,
      visitante: false,
      prestador: false
    }
  };

  const TIPO_LABELS = {
    visitante: 'Visitante',
    morador: 'Morador',
    funcionario: 'Funcionário',
    prestador: 'Prestador de serviço'
  };

  /* ===== NORMALIZAÇÃO ===== */

  /** Normaliza texto para busca (minúsculas e sem acentos). */
  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /* ===== CONFIGURAÇÃO ===== */

  /** Lê a configuração salva (com fallback para os padrões). */
  async function getConfig() {
    try {
      const cfg = await DB.store(CONFIG_ID).get(CONFIG_ID);
      if (cfg) {
        const autorizadores = Object.assign({}, DEFAULT_CONFIG.autorizadores, cfg.autorizadores || {});
        return Object.assign({}, cfg, { autorizadores });
      }
    } catch (e) {
      console.warn('Falha ao ler a configuração:', e);
    }
    return Object.assign({}, DEFAULT_CONFIG);
  }

  /** Salva a configuração do sistema. */
  async function saveConfig(cfg) {
    const data = Object.assign({}, cfg, { id: CONFIG_ID, updatedAt: new Date().toISOString() });
    await DB.store(CONFIG_ID).put(data);
    return data;
  }

  /**
   * Textos que dependem do tipo de instalação (condomínio x empresa).
   * Internamente a estrutura é genérica; apenas os rótulos mudam.
   */
  function labels(cfg) {
    const cond = (cfg && cfg.tipoInstalacao) === 'condominio';
    return {
      condominio: cond,
      vinculo: cond ? 'Morador' : 'Funcionário',
      vinculoPlural: cond ? 'Moradores' : 'Funcionários',
      vinculoCampo: cond ? 'Unidade' : 'Setor',
      vinculoPlaceholder: cond ? 'Ex.: Apartamento 12' : 'Ex.: Produção',
      tipoMorador: 'Morador',
      tipoFuncionario: 'Funcionário'
    };
  }

  /** Rótulo exibido para um tipo de pessoa. */
  function tipoLabel(tipo) {
    return TIPO_LABELS[tipo] || 'Pessoa';
  }

  /** Classe de badge para um tipo de pessoa. */
  function tipoBadge(tipo) {
    const map = {
      visitante: 'badge-info',
      morador: 'badge-success',
      funcionario: 'badge-primary',
      prestador: 'badge-orange'
    };
    return map[tipo] || 'badge-dark';
  }

  /* ===== PESSOAS ===== */

  /** Lista todas as pessoas (ativas). */
  async function getAllPessoas() {
    try {
      const all = await DB.store('pessoas').getAll();
      return all.filter((p) => p.ativo !== false);
    } catch (e) {
      console.warn('Falha ao ler pessoas:', e);
      return [];
    }
  }

  /** Busca uma pessoa pelo id (mesmo inativa). */
  async function getPessoa(id) {
    try {
      return await DB.store('pessoas').get(id);
    } catch (e) {
      return null;
    }
  }

  /**
   * Busca automática por nome ou documento (parcial, sem acentos).
   * Também encontra por telefone, empresa, unidade, matrícula e setor.
   */
  async function searchPessoas(query) {
    const q = norm(query);
    if (!q) return [];
    const all = await getAllPessoas();
    const exact = all.filter((p) => norm(p.nome) === q || norm(p.documento) === q);
    const starts = all.filter((p) => norm(p.nome).startsWith(q) || norm(p.documento).startsWith(q));
    const partial = all.filter((p) =>
      norm(p.nome).includes(q) ||
      norm(p.documento).includes(q) ||
      norm(p.telefone).includes(q) ||
      norm(p.empresa).includes(q) ||
      norm(p.unidade).includes(q) ||
      norm(p.matricula).includes(q) ||
      norm(p.setor).includes(q) ||
      norm(p.cargo).includes(q) ||
      norm(p.tipoServico).includes(q)
    );
    const seen = new Set();
    const result = [];
    [...exact, ...starts, ...partial].forEach((p) => {
      if (!seen.has(p.id)) { seen.add(p.id); result.push(p); }
    });
    result.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    return result;
  }

  /**
   * Procura pessoas com o mesmo nome (ou mesmo documento) já cadastradas.
   * Usado para tratar duplicidade ao cadastrar.
   */
  async function findDuplicates(nome, documento, ignoreId) {
    const all = await getAllPessoas();
    const nomeL = norm(nome);
    const docL = norm(documento);
    return all.filter((x) => {
      if (ignoreId && x.id === ignoreId) return false;
      if (nomeL && norm(x.nome) === nomeL) return true;
      if (docL && x.documento && norm(x.documento) === docL) return true;
      return false;
    });
  }

  /** Linha de vínculo de uma pessoa (ex.: "Morador — Apartamento 12"). */
  function vinculoDaPessoa(p, cfg) {
    if (!p) return '';
    if (p.tipo === 'morador') {
      return p.unidade ? `${tipoLabel('morador')} — ${p.unidade}` : tipoLabel('morador');
    }
    if (p.tipo === 'funcionario') {
      return p.setor ? `Funcionário — ${p.setor}` : 'Funcionário';
    }
    if (p.tipo === 'prestador') {
      return p.empresa ? `Prestador de serviço — ${p.empresa}` : 'Prestador de serviço';
    }
    return p.empresa ? `Visitante — ${p.empresa}` : 'Visitante';
  }

  /** Dados complementares para diferenciar pessoas com o mesmo nome. */
  function vinculoCurto(p) {
    if (!p) return '';
    if (p.tipo === 'morador') return p.unidade || '';
    if (p.tipo === 'funcionario') return p.setor || p.cargo || p.matricula || '';
    if (p.tipo === 'prestador') return p.empresa || p.tipoServico || '';
    return p.empresa || '';
  }

  /* ===== ENTRADA E SAÍDA ===== */

  /** Último registro de acesso (entrada/saída) da pessoa. */
  async function ultimoAcesso(pessoaId) {
    try {
      const all = await DB.store('entradas_saidas').getAll();
      return all
        .filter((r) => r.pessoaId === pessoaId)
        .sort((a, b) => (b.data + 'T' + b.horaEntrada).localeCompare(a.data + 'T' + a.horaEntrada))[0] || null;
    } catch (e) {
      return null;
    }
  }

  /** Verifica se a pessoa está dentro (último acesso sem saída). */
  async function pessoaDentro(pessoaId) {
    const last = await ultimoAcesso(pessoaId);
    return !!(last && !last.horaSaida);
  }

  /* ===== AUTORIZAÇÕES ===== */

  /**
   * Situação da autorização calculada no momento.
   * @returns {'ativa'|'agendada'|'expirada'|'cancelada'}
   */
  function autorizacaoStatus(a, now) {
    if (!a || a.status === 'cancelada') return 'cancelada';
    const dt = now || new Date();
    const ini = new Date(a.dataInicial + 'T' + (a.horaInicial || '00:00'));
    const fim = new Date(a.dataFinal + 'T' + (a.horaFinal || '23:59'));
    if (isNaN(ini.getTime()) || isNaN(fim.getTime())) return 'ativa';
    if (dt < ini) return 'agendada';
    if (dt > fim) return 'expirada';
    return 'ativa';
  }

  function autorizacaoStatusLabel(s) {
    const map = { ativa: 'ATIVA', agendada: 'AGENDADA', expirada: 'EXPIRADA', cancelada: 'CANCELADA' };
    return map[s] || String(s || '');
  }

  function autorizacaoBadge(s) {
    const map = { ativa: 'badge-success', agendada: 'badge-warning', expirada: 'badge-danger', cancelada: 'badge-orange' };
    return map[s] || 'badge-dark';
  }

  /** Todas as autorizações que envolvem a pessoa autorizada. */
  async function getAutorizacoesPessoa(pessoaId) {
    try {
      const all = await DB.store('autorizacoes').getAll();
      return all.filter((a) => a.pessoaId === pessoaId);
    } catch (e) {
      return [];
    }
  }

  /** Autorizações ativas (dentro do período e não canceladas). */
  async function getAutorizacoesAtivas(pessoaId) {
    const list = await getAutorizacoesPessoa(pessoaId);
    return list.filter((a) => autorizacaoStatus(a) === 'ativa');
  }

  /** Formata o período de uma autorização para exibição. */
  function formatPeriodo(a) {
    if (!a) return '-';
    return `${UI.formatDate(a.dataInicial)} ${a.horaInicial || ''} até ${UI.formatDate(a.dataFinal)} ${a.horaFinal || ''}`;
  }

  /* ===== EXPOSIÇÃO ===== */
  return {
    DEFAULT_CONFIG,
    norm,
    getConfig,
    saveConfig,
    labels,
    tipoLabel,
    tipoBadge,
    getAllPessoas,
    getPessoa,
    searchPessoas,
    findDuplicates,
    vinculoDaPessoa,
    vinculoCurto,
    ultimoAcesso,
    pessoaDentro,
    autorizacaoStatus,
    autorizacaoStatusLabel,
    autorizacaoBadge,
    getAutorizacoesPessoa,
    getAutorizacoesAtivas,
    formatPeriodo
  };
})();
