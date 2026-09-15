/* ===================================================================
   CONFIGURAÇÕES - SCRIPT.JS
   ===================================================================
   Configurações do sistema: tipo de instalação (condomínio x empresa)
   e quem pode autorizar. Persistência em IndexedDB (store: config).
   =================================================================== */

const $ = (sel) => document.querySelector(sel);

// Valores padrão do e-mail (espelham services/configService.js).
const EMAIL_DEFAULTS = {
  to: 'portaria@clarityglass.com.br',
  cc: 'gerencia@clarityglass.com.br',
  subject: 'Relatório Diário da Portaria - Clarity Glass'
};

document.addEventListener('DOMContentLoaded', async () => {
  UI.initCommon();
  await loadConfig();
  loadEmailConfig();
  loadSmtpConfig();
});

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

/* ===== SERVIDOR DE E-MAIL (SMTP) ===== */
function loadSmtpConfig() {
  let cfg = {};
  try {
    cfg = JSON.parse(localStorage.getItem('claritySmtpConfig') || '{}') || {};
  } catch (e) {
    cfg = {};
  }
  $('#smtpHost').value = cfg.host || '';
  $('#smtpPort').value = cfg.port || '';
  $('#smtpSecure').checked = !!cfg.secure;
  $('#smtpUser').value = cfg.user || '';
  $('#smtpPass').value = cfg.pass || '';
  $('#smtpFrom').value = cfg.from || '';
}

function collectSmtpConfig() {
  return {
    host: $('#smtpHost').value.trim(),
    port: Number($('#smtpPort').value) || 0,
    secure: $('#smtpSecure').checked,
    user: $('#smtpUser').value.trim(),
    pass: $('#smtpPass').value,
    from: $('#smtpFrom').value.trim()
  };
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
    const smtp = collectSmtpConfig();
    if (smtp.host) localStorage.setItem('claritySmtpConfig', JSON.stringify(smtp));
    else localStorage.removeItem('claritySmtpConfig');
    UI.showToast('Configurações salvas com sucesso!', 'success');
  } catch (e) {
    console.error(e);
    UI.showToast('Erro ao salvar as configurações.', 'error');
  }
}