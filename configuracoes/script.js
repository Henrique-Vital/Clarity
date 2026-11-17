/* ===================================================================
   CONFIGURAÇÕES - SCRIPT.JS
   ===================================================================
   Configurações do sistema: tipo de instalação (condomínio x empresa)
   e quem pode autorizar. Persistência em IndexedDB (store: config).
   =================================================================== */

const $ = (sel) => document.querySelector(sel);

// Valores padrão do e-mail (usados no rascunho do relatório).
const EMAIL_DEFAULTS = {
  to: 'portaria@clarityglass.com.br',
  cc: 'gerencia@clarityglass.com.br',
  subject: 'Relatório Diário da Portaria - Clarity Glass'
};

document.addEventListener('DOMContentLoaded', async () => {
  UI.initCommon();
  await loadConfig();
  loadEmailConfig();
  renderAutoBackupStatus();
});

/* ===== BACKUP AUTOMÁTICO ===== */
function renderAutoBackupStatus() {
  const el = document.getElementById('autoBackupStatus');
  if (!el) return;
  let status = null;
  try {
    status = JSON.parse(localStorage.getItem('clarityBackupAutoStatus') || 'null');
  } catch (e) {
    status = null;
  }
  if (!status || !status.at) {
    el.textContent = 'Nenhuma tentativa registrada.';
    return;
  }

  const when = new Date(status.at).toLocaleString('pt-BR');
  if (status.ok) {
    el.textContent = `Último backup automático: ${when} — ${status.totalRegistros || 0} registro(s), arquivo ${status.fileName || '—'}.`;
    return;
  }

  const reasons = {
    'banco-sem-dados': 'não há registros neste navegador. Verifique se está usando o mesmo endereço e o mesmo navegador dos lançamentos.',
    'pasta-nao-autorizada': 'a pasta de destino ainda não foi autorizada. Use o botão abaixo.',
    'falha-ao-salvar': 'não foi possível salvar o arquivo.',
    'sem-resultado': 'o módulo de backup não respondeu.',
    'erro': 'ocorreu um erro inesperado.'
  };
  el.textContent = `Última tentativa: ${when} — ${reasons[status.motivo] || 'backup não realizado.'}`;
}

async function autorizarPastaBackup() {
  const FileService = window.PortariaServices && window.PortariaServices.FileService;
  if (!FileService || typeof FileService.ensureFolder !== 'function') {
    UI.showToast('Serviço de arquivos não carregado. Recarregue a página.', 'error');
    return;
  }
  try {
    const res = await FileService.ensureFolder();
    UI.showToast(`Pasta "${res.folderName}" autorizada para os backups.`, 'success');
  } catch (e) {
    console.warn('Falha ao autorizar a pasta de backup:', e);
    UI.showToast('Não foi possível autorizar a pasta. Tente novamente e escolha a Área de Trabalho.', 'error');
  }
}

async function loadConfig() {
  const cfg = await Portaria.getConfig();
  const radios = document.querySelectorAll('input[name="tipoInstalacao"]');
  radios.forEach((r) => { r.checked = (r.value === cfg.tipoInstalacao); });

  const a = cfg.autorizadores || {};
  $('#autMorador').checked = !!a.morador;
  $('#autFuncionario').checked = !!a.funcionario;
  $('#autVisitante').checked = !!a.visitante;
  $('#autPrestador').checked = !!a.prestador;
}

/* ===== E-MAIL DO RELATÓRIO ===== */
function loadEmailConfig() {
  let cfg = {};
  try {
    cfg = JSON.parse(localStorage.getItem('clarityEmailConfig') || '{}') || {};
  } catch (e) {
    cfg = {};
  }
  $('#emailTo').value = Array.isArray(cfg.to) && cfg.to.length ? cfg.to.join(', ') : EMAIL_DEFAULTS.to;
  $('#emailCc').value = Array.isArray(cfg.cc) ? cfg.cc.join(', ') : EMAIL_DEFAULTS.cc;
  $('#emailSubject').value = cfg.subject || EMAIL_DEFAULTS.subject;
  $('#emailBody').value = cfg.body || '';
}

function parseEmailList(value) {
  return String(value || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function collectEmailConfig() {
  return {
    to: parseEmailList($('#emailTo').value),
    cc: parseEmailList($('#emailCc').value),
    subject: $('#emailSubject').value.trim(),
    body: $('#emailBody').value.trim()
  };
}

function restaurarEmailPadrao() {
  $('#emailTo').value = EMAIL_DEFAULTS.to;
  $('#emailCc').value = EMAIL_DEFAULTS.cc;
  $('#emailSubject').value = EMAIL_DEFAULTS.subject;
  $('#emailBody').value = '';
  UI.showToast('Valores padrão restaurados. Clique em "Salvar Configurações".', 'info');
}

function collectConfig() {
  const tipoInstalacao = document.querySelector('input[name="tipoInstalacao"]:checked')
    ? document.querySelector('input[name="tipoInstalacao"]:checked').value
    : 'empresa';
  return {
    tipoInstalacao,
    autorizadores: {
      morador: $('#autMorador').checked,
      funcionario: $('#autFuncionario').checked,
      visitante: $('#autVisitante').checked,
      prestador: $('#autPrestador').checked
    }
  };
}

async function salvarConfig() {
  const cfg = collectConfig();
  // Garante que pelo menos um tipo possa autorizar.
  const values = Object.values(cfg.autorizadores);
  if (!values.some(Boolean)) {
    UI.showToast('Selecione pelo menos um tipo de pessoa que pode autorizar.', 'error');
    return;
  }
  const email = collectEmailConfig();
  if (!email.to.length) {
    UI.showToast('Informe pelo menos um destinatário de e-mail.', 'error');
    return;
  }
  try {
    await Portaria.saveConfig(cfg);
    localStorage.setItem('clarityEmailConfig', JSON.stringify(email));
    UI.showToast('Configurações salvas com sucesso!', 'success');
  } catch (e) {
    console.error(e);
    UI.showToast('Erro ao salvar as configurações.', 'error');
  }
}