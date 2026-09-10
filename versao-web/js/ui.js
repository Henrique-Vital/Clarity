/* ===================================================================
   CLARITY GLASS - PORTARIA - UI.JS
   ===================================================================
   Componentes reutilizáveis de interface:
   Toast, Modal, Confirmação, Loading, Tabela (auxiliares de render),
   Pesquisa (barra), Cards, Botões, Tema, Relatórios em PDF e Logo.
   =================================================================== */

const UI = (() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* ===== HELPERS GERAIS ===== */

  /** Escapa caracteres HTML para evitar injeção. */
  function escHtml(str) {
    if (str == null) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  /** Gera um id único curto. */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /** Data de hoje no formato YYYY-MM-DD (fuso local, não UTC). */
  function todayISO() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  /** Hora atual no formato HH:MM. */
  function nowTime() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  /** Formata data YYYY-MM-DD para DD/MM/AAAA. */
  function formatDate(str) {
    if (!str) return '-';
    const d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('pt-BR');
  }

  /** Data e hora atual no formato ISO amigável. */
  function formatDateTimeISO() {
    const now = new Date();
    return now.toISOString().slice(0, 16).replace('T', ' ');
  }

  /** Formata duração entre dois instantes ISO para 'Xh Ymin' / 'X dia(s)'. */
  function formatDuration(startISO, endISO) {
    if (!startISO || !endISO) return '-';
    const start = new Date(startISO).getTime();
    const end = new Date(endISO).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return '-';
    const diffMs = end - start;
    const days = Math.floor(diffMs / 86400000);
    const hours = Math.floor((diffMs % 86400000) / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    if (days > 0) return `${days} dia(s) ${hours}h ${minutes}min`;
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  }

  /* ===== TOAST ===== */
  function showToast(message, type = 'info') {
    const container = $('#toastContainer');
    if (!container) return;
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
      <span>${escHtml(message)}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 5000);
  }

  /* ===== MODAL ===== */
  function openModal(id) {
    const el = $('#' + id);
    if (el) el.classList.add('active');
  }

  function closeModal(id) {
    const el = $('#' + id);
    if (el) el.classList.remove('active');
  }

  /* ===== CONFIRMAÇÃO ===== */
  function showConfirm(message, callback) {
    const modal = $('#confirmModal');
    const body = $('#confirmModalBody');
    if (!modal || !body) { callback(); return; }
    body.innerHTML = `<p>${escHtml(message)}</p>`;
    const btn = $('#confirmBtn');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => {
      closeModal('confirmModal');
      callback();
    });
    openModal('confirmModal');
  }

  /* ===== LOADING ===== */
  function hideLoading() {
    const el = $('#loadingScreen');
    if (el) el.classList.add('hidden');
  }

  /* ===== TEMA ===== */
  function getTheme() {
    return localStorage.getItem('clarityTheme') || 'light';
  }

  function applyTheme() {
    const theme = getTheme();
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      const t = $('#themeToggle');
      if (t) t.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
      document.documentElement.removeAttribute('data-theme');
      const t = $('#themeToggle');
      if (t) t.innerHTML = '<i class="fas fa-moon"></i>';
    }
  }

  function toggleTheme() {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem('clarityTheme', next);
    applyTheme();
  }

  /* ===== AUTO-ATUALIZAÇÃO DA HORA (campos de registro) ===== */
  // Campos de hora que o usuário editou manualmente não são sobrescritos.
  // Os demais acompanham a hora atual a cada minuto, sem sobrecarga:
  // um único timer alinhado à virada de minuto (não há polling pesado).
  const _manualTimeFields = (typeof WeakSet !== 'undefined') ? new WeakSet() : null;

  function startAutoTimeFields() {
    if (!_manualTimeFields) return;
    const touch = (e) => {
      const t = e.target;
      if (t && t.type === 'time') _manualTimeFields.add(t);
    };
    document.addEventListener('input', touch, true);
    document.addEventListener('change', touch, true);

    const apply = () => {
      const now = nowTime();
      document.querySelectorAll('input[type="time"]').forEach((el) => {
        if (el.disabled || el.readOnly) return;
        if (el.dataset && el.dataset.autoTime === 'off') return;
        if (_manualTimeFields.has(el)) return;
        if (el.value !== now) el.value = now;
      });
    };

    // Primeira execução imediata, depois a cada 60 s a partir do segundo 0.
    const msToMinute = (60 - new Date().getSeconds()) * 1000;
    let timer;
    const loop = () => {
      apply();
      timer = setTimeout(loop, 60000);
    };
    timer = setTimeout(loop, msToMinute);
  }

  /* ===== LOGO ===== */
  function getLogo() {
    return localStorage.getItem('clarityLogo') || null;
  }

  function saveLogo(dataUrl) {
    localStorage.setItem('clarityLogo', dataUrl);
  }

  /* ===== RELATÓRIO POR PERÍODO (MODAL COMPARTILHADO) ===== */
  const REPORT_MODAL_ID = 'reportModal';

  const reportModalHtml = `
    <div class="modal-overlay" id="reportModal">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2><i class="fas fa-file-pdf"></i> Relatório por Período</h2>
          <button class="modal-close" data-close="reportModal" title="Fechar">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="reportStart">Data inicial <span class="required">*</span></label>
            <input type="date" id="reportStart">
          </div>
          <div class="form-group">
            <label for="reportEnd">Data final <span class="required">*</span></label>
            <input type="date" id="reportEnd">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" id="reportGenerateBtn">
            <i class="fas fa-file-pdf"></i> Gerar Relatório
          </button>
          <button class="btn btn-secondary" data-close="reportModal">Cancelar</button>
        </div>
      </div>
    </div>
  `;

  let reportCallback = null;

  function injectReportModal() {
    if (!$('#' + REPORT_MODAL_ID)) {
      document.body.insertAdjacentHTML('beforeend', reportModalHtml);
      const btn = $('#reportGenerateBtn');
      btn.addEventListener('click', () => {
        const start = $('#reportStart').value;
        const end = $('#reportEnd').value;
        if (!start || !end) {
          showToast('Informe o período do relatório.', 'error');
          return;
        }
        if (start > end) {
          showToast('A data inicial deve ser anterior ou igual à data final.', 'error');
          return;
        }
        closeModal(REPORT_MODAL_ID);
        if (reportCallback) reportCallback(start, end);
      });
    }
  }

  /**
   * Abre o modal de relatório por período.
   * @param {Function} callback - Recebe (dataInicio, dataFim).
   */
  function openReportModal(callback) {
    injectReportModal();
    reportCallback = callback;
    $('#reportStart').value = todayISO();
    $('#reportEnd').value = todayISO();
    openModal(REPORT_MODAL_ID);
  }

  /* ===== PDF ===== */
  /**
   * Gera um PDF padrão com a identidade da Clarity Glass.
   * @param {Object} options
   * @param {string} options.title - Título do relatório.
   * @param {string} options.subtitle - Subtítulo.
   * @param {string[]} options.columns - Cabeçalho da tabela.
   * @param {Array[]} options.rows - Linhas da tabela.
   * @param {string} options.filename - Nome do arquivo.
   * @param {'p'|'l'} [options.orientation] - Orientação da página.
   * @param {string} [options.period] - Texto do período gerado.
   */
  function buildPdf(options) {
    if (!window.jspdf) {
      showToast('Erro ao gerar PDF. Verifique a conexão com a internet.', 'error');
      return;
    }
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF(options.orientation || 'p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();

      // ===== LOGO (preparado para futura inclusão da logo oficial) =====
      const logo = getLogo();
      if (logo) {
        try {
          doc.addImage(logo, 'PNG', 12, 6, 20, 20);
        } catch (e) {
          drawLogoPlaceholder(doc, 12, 6, 20);
        }
      } else {
        drawLogoPlaceholder(doc, 12, 6, 20);
      }

      // ===== CABEÇALHO =====
      doc.setFillColor(26, 115, 232);
      doc.rect(0, 0, pageWidth, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(options.title, pageWidth / 2, 15, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(options.subtitle || '', pageWidth / 2, 23, { align: 'center' });

      // ===== INFORMAÇÕES DO RELATÓRIO =====
      let y = 42;
      const now = new Date();
      const dataGeracao = now.toLocaleDateString('pt-BR');
      const horaGeracao = now.toLocaleTimeString('pt-BR');

      doc.setTextColor(33, 33, 33);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('CLARITY GLASS', 14, y);
      doc.setFont(undefined, 'normal');
      doc.text(`Data: ${dataGeracao}   Hora: ${horaGeracao}`, pageWidth - 14, y, { align: 'right' });

      if (options.period) {
        doc.setFontSize(8.5);
        doc.setTextColor(95, 99, 104);
        doc.text(`Período: ${options.period}`, 14, y + 5);
      }
      doc.setDrawColor(26, 115, 232);
      doc.setLineWidth(0.6);
      doc.line(14, y + 8, pageWidth - 14, y + 8);

      // ===== TABELA =====
      doc.autoTable({
        startY: y + 12,
        head: [options.columns],
        body: options.rows,
        theme: 'grid',
        headStyles: {
          fillColor: [26, 115, 232],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          valign: 'middle'
        },
        margin: { left: 14, right: 14 }
      });

      // ===== RODAPÉ =====
      const pageHeight = doc.internal.pageSize.getHeight();
      const footerY = pageHeight - 15;
      doc.setFillColor(26, 115, 232);
      doc.rect(0, footerY, pageWidth, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text('CLARITY GLASS - PORTARIA', pageWidth / 2, footerY + 6, { align: 'center' });
      doc.text(
        `Documento gerado automaticamente | ${dataGeracao} ${horaGeracao}`,
        pageWidth / 2, footerY + 11, { align: 'center' }
      );

      // ===== SALVAMENTO =====
      // No Electron os PDFs vão para a pasta da Área de Trabalho
      // (via FileService). No navegador, mantém o download padrão.
      const blob = doc.output('blob');
      const FileService = window.PortariaServices ? window.PortariaServices.FileService : null;
      if (FileService && typeof FileService.savePdf === 'function') {
        FileService.savePdf(blob, options.filename)
          .then(() => showToast('PDF gerado com sucesso!', 'success'))
          .catch((err) => {
            console.error('Erro ao salvar PDF:', err);
            showToast('Erro ao salvar o PDF.', 'error');
          });
      } else {
        doc.save(options.filename);
        showToast('PDF gerado com sucesso!', 'success');
      }
    } catch (e) {
      console.error('Erro ao gerar PDF:', e);
      showToast('Erro ao gerar PDF. Verifique a conexão com a internet.', 'error');
    }
  }

  /** Desenha um placeholder de logo enquanto a logo oficial não é enviada. */
  function drawLogoPlaceholder(doc, x, y, size) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(26, 115, 232);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, size, size, 2, 2, 'FD');
    doc.setTextColor(26, 115, 232);
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    doc.text('LOGO', x + size / 2, y + size / 2 + 1.5, { align: 'center' });
    doc.setTextColor(95, 99, 104);
    doc.setFontSize(5);
    doc.text('CLARITY', x + size / 2, y + size / 2 + 5.5, { align: 'center' });
  }

  /* ===== EXPORTAR EXCEL ===== */
  /**
   * Exporta uma lista de objetos para uma planilha .xlsx.
   * @param {Array<Object>} data - Lista de objetos (linhas).
   * @param {string[]} columns - Nomes das colunas na ordem desejada.
   * @param {string} filename - Nome do arquivo.
   */
  function exportExcel(data, columns, filename) {
    if (!window.XLSX) {
      showToast('Erro ao exportar Excel. Verifique a conexão com a internet.', 'error');
      return;
    }
    if (!data || data.length === 0) {
      showToast('Nenhum registro para exportar.', 'warning');
      return;
    }
    try {
      const rows = data.map((row) => {
        const obj = {};
        columns.forEach((col) => { obj[col] = row[col] != null ? row[col] : ''; });
        return obj;
      });
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = columns.map(() => ({ wch: 22 }));
      XLSX.utils.book_append_sheet(wb, ws, 'Registros');
      XLSX.writeFile(wb, filename);
      showToast('Planilha exportada com sucesso!', 'success');
    } catch (e) {
      console.error('Erro ao exportar Excel:', e);
      showToast('Erro ao exportar Excel.', 'error');
    }
  }

  /* ===== SALVAR ARQUIVO NA PASTA PADRÃO ===== */
  /**
   * Salva um arquivo (Blob) na pasta padrão "controle-da-portaria".
   * Usa o FileService quando disponível (Electron ou versão web); no
   * fallback (navegador sem services) faz o download normal.
   * @param {Blob} blob
   * @param {string} filename
   * @returns {Promise<Object>}
   */
  function saveFile(blob, filename) {
    const FileService = window.PortariaServices ? window.PortariaServices.FileService : null;
    if (FileService && typeof FileService.savePdf === 'function') {
      return FileService.savePdf(blob, filename);
    }
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      resolve({ ok: true, downloaded: true, fallback: true });
    });
  }

  /* ===== INICIALIZAÇÃO COMUM ===== */
  function initCommon() {
    // Tema
    applyTheme();
    const themeToggle = $('#themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    // Hora dos campos de registro acompanha o relógio (a cada minuto).
    startAutoTimeFields();

    // Relógio / data / rodapé
    function updateDateTime() {
      const now = new Date();
      const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const dateEl = $('#currentDate');
      const timeEl = $('#currentTime');
      if (dateEl) dateEl.textContent = now.toLocaleDateString('pt-BR', opts);
      if (timeEl) timeEl.textContent = now.toLocaleTimeString('pt-BR');
      const yearEl = $('#footerYear');
      if (yearEl) yearEl.textContent = now.getFullYear();
    }
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Upload de logo (preparado para futura inclusão da logo oficial)
    const logoArea = $('#logoArea');
    const logoInput = $('#logoInput');
    if (logoArea && logoInput) {
      logoArea.addEventListener('click', () => logoInput.click());
      logoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          saveLogo(ev.target.result);
          logoArea.innerHTML = `<img src="${ev.target.result}" alt="Logo Clarity Glass">`;
          showToast('Logo atualizada com sucesso!', 'success');
        };
        reader.readAsDataURL(file);
        e.target.value = '';
      });
      const logo = getLogo() || window.CLARITY_LOGO || '';
      if (logo) logoArea.innerHTML = `<img src="${logo}" alt="Logo Clarity Glass">`;
    }

    // Fechar modais ao clicar fora ou no botão de fechar
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
      }
      const closer = e.target.closest('[data-close]');
      if (closer) {
        const id = closer.getAttribute('data-close');
        closeModal(id);
      }
    });

    // Fechar modais com a tecla ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        $$('.modal-overlay.active').forEach((m) => m.classList.remove('active'));
      }
    });

    // Ocultar tela de loading
    setTimeout(hideLoading, 600);
  }

  return {
    escHtml,
    generateId,
    todayISO,
    nowTime,
    formatDate,
    formatDateTimeISO,
    formatDuration,
    showToast,
    showConfirm,
    openModal,
    closeModal,
    hideLoading,
    getTheme,
    applyTheme,
    toggleTheme,
    getLogo,
    saveLogo,
    openReportModal,
    buildPdf,
    exportExcel,
    saveFile,
    initCommon
  };
})();
