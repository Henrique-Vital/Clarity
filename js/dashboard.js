/* ===================================================================
   CLARITY GLASS - PORTARIA - DASHBOARD.JS
   ===================================================================
   Tela inicial do sistema. Exibe os quatro módulos, um resumo das
   movimentações do dia e o botão "Finalizar Turno", que prepara o
   relatório diário (PDF) e o rascunho do e-mail sem enviar nada.
   =================================================================== */

const DASHBOARD_MODAL_ID = 'turnoPreviewModal';
let turnoResult = null;

// ===== FINALIZAR TURNO =====
async function finalizarTurno() {
  const services = window.PortariaServices;
  if (!services) {
    UI.showToast('Serviços de relatório não carregados. Abra o sistema pelo aplicativo da Portaria.', 'error');
    return;
  }
  setTurnoLoading(true);
  try {
    turnoResult = await services.ReportService.prepareDailyTurnoverReport();
    renderPreviewModal(turnoResult);
    setTurnoLoading(false);
    UI.showToast('Relatório preparado com sucesso.', 'success');
  } catch (e) {
    console.error('Erro ao preparar relatório:', e);
    setTurnoLoading(false);
    UI.showToast('Erro ao preparar o relatório: ' + (e && e.message ? e.message : 'erro inesperado'), 'error');
  }
}

function setTurnoLoading(show) {
  const el = document.getElementById('turnoLoading');
  if (el) el.classList.toggle('active', !!show);
}

// ===== MODAL DE PRÉ-VISUALIZAÇÃO =====
function renderPreviewModal(result) {
  const FileService = window.PortariaServices.FileService;
  const now = new Date();

  document.getElementById('turnoTo').textContent = result.draft.getTo().join(', ') || '-';
  document.getElementById('turnoCc').textContent = result.draft.getCc().join(', ') || '-';
  document.getElementById('turnoSubject').textContent = result.draft.getSubject() || '-';
  document.getElementById('turnoPdfName').textContent = result.pdf.pdfName;
  document.getElementById('turnoPdfSize').textContent = FileService.formatFileSize(result.pdf.pdfBlob.size);
  document.getElementById('turnoDate').textContent = result.dateText;
  document.getElementById('turnoTime').textContent = now.toLocaleTimeString('pt-BR');
  document.getElementById('turnoBody').textContent = result.draft.getBody();

  UI.openModal(DASHBOARD_MODAL_ID);
}

// ===== BACKUP GERAL =====
async function backupGeral() {
  const FileService = window.PortariaServices ? window.PortariaServices.FileService : null;
  if (!FileService || typeof FileService.savePdf !== 'function') {
    UI.showToast('Serviços de arquivo não carregados. Abra o sistema pelo aplicativo da Portaria ou pela versão web.', 'error');
    return;
  }
  UI.showToast('Gerando backup geral...', 'info');
  try {
    let firstAid = null;
    try {
      const saved = localStorage.getItem('firstAidSystem');
      firstAid = saved ? JSON.parse(saved) : null;
    } catch (e) {
      // ignora erros de leitura do módulo existente
    }

    const backup = {
      sistema: 'Portaria - Clarity Glass',
      versao: '1.0.0',
      geradoEm: new Date().toISOString(),
      dados: {
        chaves: await DB.exportStore('chaves'),
        visitantes: await DB.exportStore('visitantes'),
        visitantes_perfil: await DB.exportStore('visitantes_perfil'),
        epis: await DB.exportStore('epis'),
        avisos: await DB.exportStore('avisos'),
        ocorrencias: await DB.exportStore('ocorrencias'),
        pessoas: await DB.exportStore('pessoas'),
        entradas_saidas: await DB.exportStore('entradas_saidas'),
        autorizacoes: await DB.exportStore('autorizacoes'),
        config: await DB.exportStore('config'),
        insumos: firstAid && Array.isArray(firstAid.inventory) ? firstAid.inventory : [],
        primeirosSocorros: firstAid
      },
      preferencias: {
        tema: localStorage.getItem('clarityTheme') || 'light',
        logo: localStorage.getItem('clarityLogo') || null
      }
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const fileName = 'backup_geral_' + UI.todayISO() + '.json';
    const res = await FileService.savePdf(blob, fileName);
    const pasta = (res && res.folderName) ? res.folderName : 'controle-da-portaria';
    UI.showToast('Backup geral salvo com sucesso na pasta "' + pasta + '".', 'success');
  } catch (e) {
    console.error('Erro ao gerar backup geral:', e);
    UI.showToast('Erro ao gerar o backup geral.', 'error');
  }
}

// ===== RESTAURAR BACKUP =====
async function restaurarBackup() {
  const input = document.getElementById('backupInput');
  if (!input) return;
  input.value = '';
  input.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup || backup.sistema !== 'Portaria - Clarity Glass' || !backup.dados) {
        UI.showToast('Arquivo inválido. Selecione um arquivo de backup geral (.json).', 'error');
        return;
      }

      const nomesStores = ['chaves', 'visitantes', 'visitantes_perfil', 'epis', 'avisos', 'ocorrencias', 'pessoas', 'entradas_saidas', 'autorizacoes', 'config'];
      const presentes = nomesStores.filter((s) => Array.isArray(backup.dados[s]));
      const total = presentes.reduce((acc, s) => acc + backup.dados[s].length, 0);
      const temInsumos = backup.dados && backup.dados.primeirosSocorros;

      UI.showConfirm(
        `Restaurar backup de ${backup.geradoEm ? new Date(backup.geradoEm).toLocaleString('pt-BR') : 'data desconhecida'}?` +
        ` Este arquivo contém ${total} registro(s) em ${presentes.length} módulo(s)` +
        `${temInsumos ? ' e os dados de Primeiros Socorros' : ''}.` +
        ` Todos os dados atuais serão SUBSTITUÍDOS. Deseja continuar?`,
        async () => {
          try {
            UI.showToast('Restaurando backup...', 'info');
            for (const s of presentes) {
              await DB.importStore(s, backup.dados[s]);
            }
            if (temInsumos) {
              localStorage.setItem('firstAidSystem', JSON.stringify(backup.dados.primeirosSocorros));
            }
            if (backup.preferencias) {
              if (backup.preferencias.tema) localStorage.setItem('clarityTheme', backup.preferencias.tema);
              if (backup.preferencias.logo) localStorage.setItem('clarityLogo', backup.preferencias.logo);
            }
            UI.showToast('Backup restaurado com sucesso. Recarregando...', 'success');
            setTimeout(() => location.reload(), 1200);
          } catch (err) {
            console.error('Erro ao restaurar backup:', err);
            UI.showToast('Erro ao restaurar o backup.', 'error');
          }
        }
      );
    } catch (err) {
      console.error('Erro ao ler o arquivo de backup:', err);
      UI.showToast('Arquivo inválido ou corrompido.', 'error');
    }
  });
  input.click();
}

// ===== AÇÕES DO MODAL =====
function copiarMensagem() {
  if (!turnoResult) return;
  const text = turnoResult.draft.getBody();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      UI.showToast('Mensagem copiada para a área de transferência.', 'success');
    }).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    UI.showToast('Mensagem copiada para a área de transferência.', 'success');
  } catch (e) {
    UI.showToast('Não foi possível copiar a mensagem.', 'error');
  }
  ta.remove();
}

async function baixarPdf() {
  if (!turnoResult) return;
  try {
    const FileService = window.PortariaServices ? window.PortariaServices.FileService : null;
    if (!FileService || typeof FileService.savePdf !== 'function') {
      UI.showToast('Serviços de arquivo não carregados.', 'error');
      return;
    }
    const res = await FileService.savePdf(turnoResult.pdf.pdfBlob, turnoResult.pdf.pdfName);
    const destino = (res && res.savedToDesktop)
      ? `salvo na pasta "${res.folderName}"`
      : (res && res.folderName)
          ? `salvo na pasta "${res.folderName}"`
          : (window.portariaAPI && window.portariaAPI.isElectron
              ? 'salvo na pasta "controle-da-portaria"'
              : 'baixado (download iniciado)');
    if (res && res.renamed) {
      UI.showToast(`PDF ${destino}. O arquivo anterior estava aberto; salvo como: ${res.fileName}`, 'warning');
    } else {
      UI.showToast(`PDF ${destino}: ${turnoResult.pdf.pdfName}`, 'success');
    }
  } catch (e) {
    console.error('Erro ao baixar PDF:', e);
    UI.showToast('Erro ao salvar o PDF. Feche o arquivo aberto e tente novamente.', 'error');
  }
}

function prepararNovoRelatorio() {
  turnoResult = null;
  UI.closeModal(DASHBOARD_MODAL_ID);
}

// ===== RELATÓRIO POR PERÍODO (TODOS OS MÓDULOS) =====
async function gerarRelatorioPeriodo() {
  const services = window.PortariaServices;
  if (!services || !services.ReportService || !services.ReportService.preparePeriodReport) {
    UI.showToast('Serviços de relatório não carregados. Abra o sistema pelo aplicativo da Portaria.', 'error');
    return;
  }
  UI.openReportModal(async (start, end) => {
    setTurnoLoading(true);
    try {
      const res = await services.ReportService.preparePeriodReport(start, end);
      setTurnoLoading(false);
      await salvarArquivoGeral(res.pdf.pdfBlob, res.pdf.pdfName, 'Relatório do período');
    } catch (e) {
      setTurnoLoading(false);
      console.error('Erro ao gerar relatório por período:', e);
      UI.showToast('Erro ao gerar o relatório por período.', 'error');
    }
  });
}

// ===== EXPORTAR EXCEL GERAL (TODOS OS MÓDULOS) =====
async function exportarExcelGeral() {
  const services = window.PortariaServices;
  if (!services || !services.ReportService || !services.ReportService.preparePeriodExcel) {
    UI.showToast('Serviços de relatório não carregados. Abra o sistema pelo aplicativo da Portaria.', 'error');
    return;
  }
  UI.openReportModal(async (start, end) => {
    UI.showToast('Gerando planilha do período...', 'info');
    try {
      const res = await services.ReportService.preparePeriodExcel(start, end);
      await salvarArquivoGeral(res.excelBlob, res.excelName, 'Planilha do período');
    } catch (e) {
      console.error('Erro ao exportar Excel:', e);
      UI.showToast('Erro ao exportar a planilha.', 'error');
    }
  });
}

async function salvarArquivoGeral(blob, fileName, tipo) {
  const FileService = window.PortariaServices ? window.PortariaServices.FileService : null;
  if (!FileService || typeof FileService.savePdf !== 'function') {
    UI.showToast('Serviços de arquivo não carregados.', 'error');
    return;
  }
  try {
    const res = await FileService.savePdf(blob, fileName);
    const destino = (res && res.savedToDesktop)
      ? `salvo na pasta "${res.folderName}"`
      : (res && res.folderName)
          ? `salvo na pasta "${res.folderName}"`
          : (window.portariaAPI && window.portariaAPI.isElectron
              ? 'salvo na pasta "controle-da-portaria"'
              : 'baixado (download iniciado)');
    UI.showToast(`${tipo} ${destino}: ${fileName}`, 'success');
  } catch (e) {
    console.error('Erro ao salvar arquivo:', e);
    UI.showToast('Erro ao salvar o arquivo.', 'error');
  }
}

async function abrirOutlook() {
  if (!turnoResult) return;
  if (!window.portariaAPI || !window.portariaAPI.isElectron) {
    UI.showToast('Esta função está disponível apenas no aplicativo da Portaria.', 'warning');
    return;
  }
  try {
    const { to, cc, subject, body } = turnoResult.draft;
    await window.portariaAPI.sendOutlook({
      to,
      cc,
      subject,
      body,
      fileName: turnoResult.pdf.pdfName,
      base64: turnoResult.pdf.pdfBase64
    });
    UI.showToast('Outlook aberto com mensagem e anexo prontos.', 'success');
  } catch (err) {
    UI.showToast(`Erro ao abrir o Outlook: ${err.message}`, 'error');
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  UI.initCommon();

  const $ = (sel) => document.querySelector(sel);
  const today = UI.todayISO();

  document.getElementById('turnoCopyBtn').addEventListener('click', copiarMensagem);
  document.getElementById('turnoDownloadBtn').addEventListener('click', baixarPdf);
  document.getElementById('turnoOutlookBtn').addEventListener('click', abrirOutlook);
  document.getElementById('turnoNewBtn').addEventListener('click', prepararNovoRelatorio);

  try {
    // ===== Controle de Chaves ou Item =====
    const chaves = await DB.store('chaves').getAll();
    const chavesHoje = chaves.filter((r) => r.data === today).length;
    $('#countChaves').textContent = chavesHoje > 0
      ? `${chavesHoje} movimentação(ões) hoje`
      : 'Nenhuma movimentação hoje';

    // ===== CONTROLE DE VISITANTES =====
    const visitantes = await DB.store('visitantes').getAll();
    const visitantesHoje = visitantes.filter((r) => r.data === today).length;
    $('#countVisitantes').textContent = visitantesHoje > 0
      ? `${visitantesHoje} visita(s) hoje`
      : 'Nenhuma visita hoje';

    // ===== CONTROLE DE EPIs =====
    const epis = await DB.store('epis').getAll();
    const episPendentes = epis.filter((r) => r.status === 'pendente').length;
    $('#countEpis').textContent = episPendentes > 0
      ? `${episPendentes} entrega(s) pendente(s)`
      : 'Nenhuma entrega pendente';

    // ===== AVISOS E RECADOS =====
    const avisos = await DB.store('avisos').getAll();
    const avisosHoje = avisos.filter((r) => r.data === today).length;
    $('#countAvisos').textContent = avisosHoje > 0
      ? `${avisosHoje} aviso(s) hoje`
      : 'Nenhum aviso hoje';

    // ===== OCORRÊNCIAS =====
    const ocorrencias = await DB.store('ocorrencias').getAll();
    const ocorrenciasHoje = ocorrencias.filter((r) => r.data === today).length;
    $('#countOcorrencias').textContent = ocorrenciasHoje > 0
      ? `${ocorrenciasHoje} ocorrência(s) hoje`
      : 'Nenhuma ocorrência hoje';

    // ===== CONTROLE DE PRIMEIROS SOCORROS =====
    // O módulo de primeiros socorros utiliza LocalStorage (módulo existente).
    let firstAidCount = 0;
    try {
      const saved = localStorage.getItem('firstAidSystem');
      if (saved) {
        const parsed = JSON.parse(saved);
        firstAidCount = (parsed.occurrences || []).filter((o) => o.data === today).length;
      }
    } catch (e) {
      // ignora erros de leitura do módulo existente
    }
    $('#countFirstAid').textContent = firstAidCount > 0
      ? `${firstAidCount} ocorrência(s) hoje`
      : 'Nenhuma ocorrência hoje';

    // ===== CADASTRO DE PESSOAS =====
    const pessoas = await DB.store('pessoas').getAll();
    const pessoasAtivas = pessoas.filter((p) => p.ativo !== false).length;
    $('#countPessoas').textContent = pessoasAtivas > 0
      ? `${pessoasAtivas} pessoa(s) cadastrada(s)`
      : 'Nenhuma pessoa cadastrada';

    // ===== ENTRADA E SAÍDA =====
    const movimentacoes = await DB.store('entradas_saidas').getAll();
    const movimentacoesHoje = movimentacoes.filter((r) => r.data === today).length;
    $('#countMovimentacoes').textContent = movimentacoesHoje > 0
      ? `${movimentacoesHoje} movimentação(ões) hoje`
      : 'Nenhuma movimentação hoje';

    // ===== AUTORIZAÇÕES =====
    const autorizacoes = await DB.store('autorizacoes').getAll();
    const autAtivas = autorizacoes.filter((a) => a.status !== 'cancelada').length;
    $('#countAutorizacoes').textContent = autAtivas > 0
      ? `${autAtivas} autorização(ões) registrada(s)`
      : 'Nenhuma autorização';

    // ===== CONFIGURAÇÕES =====
    $('#countConfig').textContent = 'Ajustes do sistema';

    UI.showToast('Sistema carregado. Selecione um módulo para começar.', 'success');
  } catch (e) {
    console.error('Erro ao carregar resumo do dashboard:', e);
    ['countChaves', 'countVisitantes', 'countEpis', 'countFirstAid', 'countAvisos', 'countOcorrencias',
     'countPessoas', 'countMovimentacoes', 'countAutorizacoes', 'countConfig'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Pronto para uso';
    });
  }
});
