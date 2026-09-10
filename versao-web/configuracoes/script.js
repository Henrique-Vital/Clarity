/* ===================================================================
   CONFIGURAÇÕES - SCRIPT.JS
   ===================================================================
   Configurações do sistema: tipo de instalação (condomínio x empresa)
   e quem pode autorizar. Persistência em IndexedDB (store: config).
   =================================================================== */

const $ = (sel) => document.querySelector(sel);

document.addEventListener('DOMContentLoaded', async () => {
  UI.initCommon();
  await loadConfig();
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
  try {
    await Portaria.saveConfig(cfg);
    UI.showToast('Configurações salvas com sucesso!', 'success');
  } catch (e) {
    console.error(e);
    UI.showToast('Erro ao salvar as configurações.', 'error');
  }
}