/* ===================================================================
   CLARITY GLASS - PORTARIA - VERSÃO WEB
   ===================================================================
   Bundle clássico (sem ES modules) de todos os services, para que o
   sistema funcione abrindo o index.html direto no navegador (file://),
   sem servidor e sem Electron.

   Expos tudo em window.PortariaServices.

   Diferenças em relação aos services/ originais (que usam import/export):
   - Sem import/export (concatenação em escopo único).
   - Os caminhos das libs de PDF são resolvidos relativo a este script
     (document.currentScript) em vez de import.meta.url.
   - window.portariaAPI não existe aqui; FileService.savePdf faz download
     normal (comportamento padrão do navegador).
   =================================================================== */

(function () {
  'use strict';

  // Base para resolver os caminhos das libs locais (este script está
  // em versao-web/js/, então ../ libs = versao-web/libs/).
  const BUNDLE_URL = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src)
    ? document.currentScript.src
    : '';
  const BASE_URL = BUNDLE_URL
    ? new URL('../', BUNDLE_URL).href
    : (typeof location !== 'undefined' ? location.href : '');

  /* ===================================================================
     SERVICES/CONFIG_SERVICE.JS
     =================================================================== */
  const CONFIG = {
    empresa: {
      nome: 'Clarity Glass'
    },
    nomeSistema: 'Portaria - Clarity Glass',
    email: {
      to: ['portaria@clarityglass.com.br'],
      cc: ['gerencia@clarityglass.com.br']
    },
    assuntoPadrao: 'Relatório Diário da Portaria - Clarity Glass',
    pastas: {
      relatorios: 'controle-da-portaria',
      backups: 'controle-da-portaria'
    }
  };

  const ConfigService = {
    getEmpresaNome() { return CONFIG.empresa.nome; },
    getNomeSistema() { return CONFIG.nomeSistema; },
    getDestinatarios() { return [...CONFIG.email.to]; },
    getCC() { return [...CONFIG.email.cc]; },
    getAssuntoPadrao() { return CONFIG.assuntoPadrao; },
    getPastaRelatorios() { return CONFIG.pastas.relatorios; },
    getPastaBackups() { return CONFIG.pastas.backups; }
  };

  /* ===================================================================
     SERVICES/EMAIL_TEMPLATES.JS
     =================================================================== */
  const EmailTemplates = {
    relatorioDiario(dateText) {
      return [
        'Bom dia.',
        '',
        `Segue em anexo o relatório diário da Portaria da Clarity Glass referente ao turno encerrado em ${dateText}.`,
        '',
        'O relatório contém:',
        '',
        '• Controle de Chaves ou Item',
        '• Controle de EPIs',
        '• Controle de insumos',
        '• Controle de primeiros socorros',
        '• Controle de visitantes',
        '• Avisos e recados',
        '• Ocorrências',
        '• Entrada e saída',
        '• Autorizações',
        '',
        'Em caso de dúvidas estamos à disposição.',
        '',
        'Atenciosamente,',
        'Portaria',
        'Clarity Glass'
      ].join('\n');
    }
  };

  /* ===================================================================
     SERVICES/EMAIL_DRAFT.JS
     =================================================================== */
  class EmailDraft {
    #to = [];
    #cc = [];
    #subject = '';
    #body = '';
    #attachment = null;

    setTo(list) { this.#to = Array.isArray(list) ? [...list] : []; return this; }
    setCc(list) { this.#cc = Array.isArray(list) ? [...list] : []; return this; }
    setSubject(text) { this.#subject = String(text || ''); return this; }
    setBody(text) { this.#body = String(text || ''); return this; }
    setAttachment(attachment) { this.#attachment = attachment || null; return this; }

    getTo() { return [...this.#to]; }
    getCc() { return [...this.#cc]; }
    getSubject() { return this.#subject; }
    getBody() { return this.#body; }
    getAttachment() { return this.#attachment; }
    getAttachmentName() { return this.#attachment ? this.#attachment.name : ''; }
    getAttachmentSize() { return this.#attachment && this.#attachment.size ? this.#attachment.size : 0; }
    getAttachmentBlob() { return this.#attachment ? this.#attachment.blob : null; }
    getAttachmentBase64() { return this.#attachment ? this.#attachment.base64 : ''; }

    toObject() {
      return {
        to: this.getTo(),
        cc: this.getCc(),
        subject: this.getSubject(),
        body: this.getBody(),
        attachment: this.#attachment
          ? { name: this.#attachment.name, size: this.#attachment.size, base64: this.#attachment.base64 }
          : null
      };
    }
  }

  /* ===================================================================
     SERVICES/FILE_SERVICE.JS
     =================================================================== */

  // Handle raiz (Área de Trabalho escolhida pelo usuário) para reutilizar
  // durante a sessão sem pedir a pasta de novo a cada PDF.
  let _desktopRootHandle = null;

  // Persistência simples do handle em um IndexedDB próprio (não interfere
  // no banco de dados do app). Handles FileSystemDirectoryHandle são
  // clonáveis estruturadamente, então podem ser guardados aqui.
  const FsDb = {
    name: 'clarityPortariaFs',
    version: 1,
    _db: null,

    open() {
      return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB indisponível')); return; }
        const req = indexedDB.open(this.name, this.version);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('handles')) {
            db.createObjectStore('handles');
          }
        };
        req.onsuccess = () => { this._db = req.result; resolve(req.result); };
        req.onerror = () => reject(req.error);
      });
    },

    async get(key) {
      try {
        const db = await this.open();
        return new Promise((resolve, reject) => {
          const tx = db.transaction('handles', 'readonly');
          const req = tx.objectStore('handles').get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
      } catch (e) { return null; }
    },

    async put(key, value) {
      try {
        const db = await this.open();
        return new Promise((resolve, reject) => {
          const tx = db.transaction('handles', 'readwrite');
          tx.objectStore('handles').put(value, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch (e) { return null; }
    }
  };

  async function requestReadWrite(handle) {
    const opts = { mode: 'readwrite' };
    if (typeof handle.queryPermission === 'function' && (await handle.queryPermission(opts)) === 'granted') {
      return true;
    }
    if (typeof handle.requestPermission === 'function') {
      return (await handle.requestPermission(opts)) === 'granted';
    }
    return false;
  }

  async function getDesktopRootHandle() {
    // 1) Handle em memória
    if (_desktopRootHandle) {
      if (await requestReadWrite(_desktopRootHandle)) return _desktopRootHandle;
      _desktopRootHandle = null;
    }
    // 2) Handle persistido
    const saved = await FsDb.get('desktopRoot');
    if (saved) {
      if (await requestReadWrite(saved)) { _desktopRootHandle = saved; return saved; }
    }
    // 3) Pedir ao usuário a pasta (diálogo já abre na Área de Trabalho)
    if (typeof window.showDirectoryPicker !== 'function') {
      throw new Error('showDirectoryPicker indisponível');
    }
    const picked = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'desktop' });
    _desktopRootHandle = picked;
    await FsDb.put('desktopRoot', picked);
    return picked;
  }

  const FileService = {
    blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || '');
          resolve(dataUrl.split(',')[1] || '');
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    },

    formatFileSize(bytes) {
      if (!bytes) return '0 KB';
      const kb = bytes / 1024;
      if (kb < 1024) return `${kb.toFixed(1)} KB`;
      return `${(kb / 1024).toFixed(2)} MB`;
    },

    downloadBlob(blob, fileName) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    },

    // Cria (ou reutiliza) a pasta "controle-da-portaria" dentro da pasta
    // raiz escolhida e salva o blob lá dentro.
    async saveToDesktopFolder(blob, fileName) {
      const folderName = ConfigService.getPastaRelatorios();
      const root = await getDesktopRootHandle();
      let dir = null;
      try {
        dir = await root.getDirectoryHandle(folderName, { create: false });
      } catch (e) {
        dir = await root.getDirectoryHandle(folderName, { create: true });
      }
      const fileHandle = await dir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { ok: true, savedToDesktop: true, folderName, fileName };
    },

    async savePdf(blob, fileName) {
      if (window.portariaAPI && window.portariaAPI.isElectron) {
        const base64 = await this.blobToBase64(blob);
        return window.portariaAPI.savePdf({
          folderName: ConfigService.getPastaRelatorios(),
          fileName,
          base64
        });
      }
      // Versão web: tentar salvar na pasta "controle-da-portaria" da
      // pasta raiz escolhida (File System Access API). Se o usuário
      // cancelar o diálogo ou a API não estiver disponível, cai para o
      // download normal.
      try {
        return await this.saveToDesktopFolder(blob, fileName);
      } catch (e) {
        console.warn('Não foi possível salvar na pasta do Desktop, usando download:', e);
        this.downloadBlob(blob, fileName);
        return { ok: true, downloaded: true, fallback: true };
      }
    }
  };

  /* ===================================================================
     SERVICES/EMAIL_SERVICE.JS
     =================================================================== */
  const EmailService = {
    prepareEmail({ dateText, pdfName, pdfBlob, pdfBase64 }) {
      const draft = new EmailDraft();
      draft
        .setTo(ConfigService.getDestinatarios())
        .setCc(ConfigService.getCC())
        .setSubject(ConfigService.getAssuntoPadrao())
        .setBody(EmailTemplates.relatorioDiario(dateText))
        .setAttachment({
          name: pdfName,
          blob: pdfBlob,
          base64: pdfBase64,
          size: pdfBlob ? pdfBlob.size : 0
        });
      return draft;
    }
  };

  /* ===================================================================
     SERVICES/PDF_SERVICE.JS
     =================================================================== */
  const PDF_LIBS = {
    jsPDF: new URL('libs/jspdf/jspdf.umd.min.js', BASE_URL).href,
    autoTable: new URL('libs/jspdf-autotable/jspdf.plugin.autotable.min.js', BASE_URL).href
  };

  const COR_PRIMARIA = [26, 115, 232];
  const COR_TEXTO = [33, 33, 33];
  const COR_CINZA = [95, 99, 104];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Falha ao carregar ' + src));
      document.head.appendChild(s);
    });
  }

  async function loadPdfLibs() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      await loadScript(PDF_LIBS.jsPDF);
    }
    if (!window.jspdf || typeof window.jspdf.jsPDF === 'undefined' || !window.jspdf.jsPDF.API || !window.jspdf.jsPDF.API.autoTable) {
      await loadScript(PDF_LIBS.autoTable);
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('Não foi possível carregar as bibliotecas de PDF.');
    }
    return {
      jsPDF: window.jspdf.jsPDF,
      applyTable: (doc, options) => doc.autoTable(options)
    };
  }

  function formatDateBR(dateISO) {
    if (!dateISO) return '-';
    const parts = String(dateISO).split('-');
    if (parts.length !== 3) return dateISO;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function timeFromISO(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function formatEpiList(e) {
    const arr = Array.isArray(e.epis) ? e.epis : [];
    if (arr.length === 0) return e.epis || '-';
    const qtd = e.episQtd || {};
    return arr.map((nome) => (qtd[nome] > 1 ? `${nome} x${qtd[nome]}` : nome)).join(', ');
  }

  function insumoStatusText(remaining) {
    if (remaining <= 0) return 'Sem estoque';
    if (remaining <= 1) return 'Crítico';
    if (remaining <= 3) return 'Atenção';
    if (remaining <= 5) return 'Alerta';
    return 'OK';
  }

  function autorizacaoStatusText(a) {
    if (a.status === 'cancelada') return 'CANCELADA';
    const ini = new Date(a.dataInicial + 'T' + (a.horaInicial || '00:00'));
    const fim = new Date(a.dataFinal + 'T' + (a.horaFinal || '23:59'));
    const now = new Date();
    if (now < ini) return 'AGENDADA';
    if (now > fim) return 'EXPIRADA';
    return 'ATIVA';
  }

  function drawHeader(doc, pageWidth, title) {
    doc.setFillColor(...COR_PRIMARIA);
    doc.rect(0, 0, pageWidth, 34, 'F');
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...COR_PRIMARIA);
    doc.setLineWidth(0.5);
    doc.roundedRect(10, 7, 20, 20, 2, 2, 'FD');
    doc.setTextColor(...COR_PRIMARIA);
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    doc.text('LOGO', 20, 15, { align: 'center' });
    doc.setTextColor(...COR_CINZA);
    doc.setFontSize(5);
    doc.text('CLARITY', 20, 20, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont(undefined, 'bold');
    doc.text('CLARITY GLASS', pageWidth / 2, 13, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(title, pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(8);
    doc.text('SISTEMA DE CONTROLE DA PORTARIA', pageWidth / 2, 26, { align: 'center' });
  }

  function drawMeta(doc, pageWidth, dateISO, periodText) {
    const now = new Date();
    doc.setTextColor(...COR_TEXTO);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text(periodText ? 'Período do Relatório' : 'Dados do Turno', 14, 44);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...COR_CINZA);
    doc.setFontSize(8.5);
    if (periodText) {
      doc.text(periodText, 14, 50);
    } else {
      doc.text(`Data do turno: ${formatDateBR(dateISO)}`, 14, 50);
    }
    doc.text(`Data de geração: ${now.toLocaleDateString('pt-BR')}`, 14, 55);
    doc.text(`Hora de geração: ${now.toLocaleTimeString('pt-BR')}`, pageWidth - 14, 55, { align: 'right' });

    doc.setDrawColor(...COR_PRIMARIA);
    doc.setLineWidth(0.5);
    doc.line(14, 60, pageWidth - 14, 60);
  }

  function drawSectionTitle(doc, y, title) {
    doc.setFillColor(...COR_PRIMARIA);
    doc.roundedRect(14, y - 4, 6, 6, 1, 1, 'F');
    doc.setTextColor(...COR_TEXTO);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(title, 24, y);
    return y + 5;
  }

  function drawEmpty(doc, y, label) {
    doc.setTextColor(...COR_CINZA);
    doc.setFontSize(9);
    doc.setFont(undefined, 'italic');
    doc.text(`Sem ${label} registradas.`, 14, y);
    return y + 8;
  }

  function renderTable(doc, y, columns, rows, emptyLabel, applyTable) {
    if (!rows.length) return drawEmpty(doc, y, emptyLabel);

    applyTable(doc, {
      startY: y,
      head: [columns],
      body: rows,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        valign: 'middle',
        textColor: COR_TEXTO,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: COR_PRIMARIA,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      margin: { left: 14, right: 14 }
    });

    return (doc.lastAutoTable ? doc.lastAutoTable.finalY : y) + 12;
  }

  function drawFooter(doc, pageWidth, pageHeight, now) {
    const pages = doc.getNumberOfPages();
    doc.setPage(pages);
    const fy = pageHeight - 14;
    doc.setFillColor(...COR_PRIMARIA);
    doc.rect(0, fy, pageWidth, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'normal');
    doc.text('CLARITY GLASS - PORTARIA', pageWidth / 2, fy + 5.5, { align: 'center' });
    doc.text(
      `Página ${pages} de ${pages} | Gerado em ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`,
      pageWidth / 2, fy + 10.5, { align: 'center' }
    );
  }

  const PdfService = {
    async generateDailyReport(modulesData) {
      return generateReport(modulesData, {
        title: 'RELATÓRIO DIÁRIO DA PORTARIA',
        periodText: '',
        fileBase: `relatorio_diario_portaria_${modulesData.date || new Date().toISOString().split('T')[0]}`
      });
    },

    async generatePeriodReport(modulesData) {
      return generateReport(modulesData, {
        title: 'RELATÓRIO POR PERÍODO DA PORTARIA',
        periodText: `Período: ${formatDateBR(modulesData.start)} a ${formatDateBR(modulesData.end)}`,
        fileBase: `relatorio_periodo_portaria_${modulesData.start}_a_${modulesData.end}`
      });
    }
  };

  async function generateReport(modulesData, opts) {
      const { jsPDF, applyTable } = await loadPdfLibs();
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const date = modulesData.date || modulesData.start || new Date().toISOString().split('T')[0];
      const now = new Date();

      drawHeader(doc, pageWidth, opts.title);
      drawMeta(doc, pageWidth, date, opts.periodText);

      let y = 66;

      y = drawSectionTitle(doc, y, 'Controle de Chaves e Item') + 3;
      y = renderTable(
        doc, y,
        ['Hora', 'Item', 'Funcionário', 'Devolvido por', 'Status'],
        (modulesData.chaves || []).map((c) => [
          c.hora || '-',
          c.chave || (c.veiculo ? `${c.veiculo} (${c.placa || ''})` : '-'),
          c.funcionario || '-',
          c.status === 'devolvida' ? (c.retornoFuncionario || '-') : '-',
          c.status === 'devolvida' ? 'Devolvida' : 'Em uso'
        ]),
        'movimentações de chaves',
        applyTable
      );

      y = drawSectionTitle(doc, y, 'Controle de EPIs') + 3;
      y = renderTable(
        doc, y,
        ['Hora', 'Visitante', 'Porteiro', 'Responsável', 'EPIs', 'Status'],
        (modulesData.epis || []).map((e) => [
          e.hora || '-',
          e.visitante || '-',
          e.porteiro || '-',
          e.responsavel || '-',
          formatEpiList(e),
          e.status === 'devolvido' ? 'Devolvido' : 'Pendente'
        ]),
        'entregas de EPIs',
        applyTable
      );

      y = drawSectionTitle(doc, y, 'Controle de Insumos') + 3;
      y = renderTable(
        doc, y,
        ['Item', 'Qtd. Restante', 'Situação'],
        (modulesData.insumos || []).map((i) => [
          i.item || '-',
          i.remaining != null ? String(i.remaining) : '-',
          insumoStatusText(i.remaining)
        ]),
        'itens de insumos',
        applyTable
      );

      y = drawSectionTitle(doc, y, 'Controle de Primeiros Socorros') + 3;
      y = renderTable(
        doc, y,
        ['Nº', 'Hora', 'Líder', 'Setor', 'Usuário', 'Descrição'],
        (modulesData.primeirosSocorros || []).map((o) => [
          o.number != null ? String(o.number) : '-',
          timeFromISO(o.timestamp || o.createdAt),
          o.lider || '-',
          o.setor || '-',
          o.usuario || '-',
          o.descricao || '-'
        ]),
        'ocorrências de primeiros socorros',
        applyTable
      );

      y = drawSectionTitle(doc, y, 'Controle de Visitantes') + 3;
      y = renderTable(
        doc, y,
        ['Entrada', 'Saída', 'Visitante', 'Empresa', 'CPF/RG', 'Responsável', 'Setor', 'Motivo'],
        (modulesData.visitantes || []).map((v) => [
          v.horaEntrada || '-',
          v.horaSaida || '-',
          v.nome || '-',
          v.empresa || '-',
          v.cpfRg || '-',
          v.responsavel || '-',
          v.setor || '-',
          v.motivo || '-'
        ]),
        'visitas',
        applyTable
      );

      y = drawSectionTitle(doc, y, 'Avisos e Recados') + 3;
      y = renderTable(
        doc, y,
        ['Hora', 'Porteiro', 'Deixado por', 'Texto'],
        (modulesData.avisos || []).map((a) => [
          a.hora || '-',
          a.porteiro || '-',
          a.nome || '-',
          a.texto || '-'
        ]),
        'avisos e recados',
        applyTable
      );

      y = drawSectionTitle(doc, y, 'Ocorrências') + 3;
      y = renderTable(
        doc, y,
        ['Porteiro', 'Descrição'],
        (modulesData.ocorrencias || []).map((o) => [
          o.porteiro || '-',
          o.descricao || '-'
        ]),
        'ocorrências',
        applyTable
      );

      y = drawSectionTitle(doc, y, 'Entrada e Saída') + 3;
      y = renderTable(
        doc, y,
        ['Data', 'Entrada', 'Saída', 'Pessoa', 'Tipo', 'Doc.', 'Porteiro', 'Responsável', 'Situação'],
        (modulesData.entradasSaidas || []).map((r) => [
          formatDateBR(r.data),
          r.horaEntrada || '-',
          r.horaSaida || '-',
          r.nome || '-',
          r.tipo || '-',
          r.documento || '-',
          r.porteiro || '-',
          r.responsavel || '-',
          r.status === 'fora' ? 'Fora' : 'Dentro'
        ]),
        'movimentações de entrada e saída',
        applyTable
      );

      y = drawSectionTitle(doc, y, 'Autorizações') + 3;
      y = renderTable(
        doc, y,
        ['Hora', 'Responsável', 'Autorizado', 'Tipo', 'Período', 'Forma', 'Status'],
        (modulesData.autorizacoes || []).map((a) => {
          const st = autorizacaoStatusText(a);
          return [
            (a.horaInicial) || '-',
            a.responsavelNome || '-',
            a.pessoaNome || '-',
            a.pessoaTipo || '-',
            `${formatDateBR(a.dataInicial)} ${a.horaInicial || ''} a ${formatDateBR(a.dataFinal)} ${a.horaFinal || ''}`,
            a.forma || '-',
            st
          ];
        }),
        'autorizações',
        applyTable
      );

      drawFooter(doc, pageWidth, pageHeight, now);

      const pdfBlob = doc.output('blob');
      const pdfBase64 = await FileService.blobToBase64(pdfBlob);
      const pdfName = opts.fileBase + '.pdf';

      return { pdfBlob, pdfName, pdfBase64 };
  }

  /* ===================================================================
     SERVICES/REPORT_SERVICE.JS
     =================================================================== */
  function todayISO() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  function localDateOf(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  function formatDateBR2(iso) {
    const parts = String(iso).split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  async function getByDate(storeName, date) {
    if (typeof DB === 'undefined' || !DB.store) return [];
    try {
      const all = await DB.store(storeName).getAll();
      return all.filter((r) => r.data === date);
    } catch (e) {
      console.warn(`Falha ao ler a store "${storeName}":`, e);
      return [];
    }
  }

  async function getByPeriod(storeName, start, end) {
    if (typeof DB === 'undefined' || !DB.store) return [];
    try {
      const all = await DB.store(storeName).getAll();
      return all.filter((r) => r.data >= start && r.data <= end);
    } catch (e) {
      console.warn(`Falha ao ler a store "${storeName}":`, e);
      return [];
    }
  }

  function getFirstAidByPeriod(start, end) {
    try {
      const saved = localStorage.getItem('firstAidSystem');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return (parsed.occurrences || []).filter((o) => {
        const d = o.data || localDateOf(o.createdAt || o.timestamp);
        return d >= start && d <= end;
      });
    } catch (e) {
      console.warn('Falha ao ler primeiros socorros:', e);
      return [];
    }
  }

  function getFirstAidByDate(date) {
    try {
      const saved = localStorage.getItem('firstAidSystem');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return (parsed.occurrences || []).filter((o) => {
        if (o.data === date) return true;
        return localDateOf(o.createdAt || o.timestamp) === date;
      });
    } catch (e) {
      console.warn('Falha ao ler primeiros socorros:', e);
      return [];
    }
  }

  function getFirstAidInventory() {
    try {
      const saved = localStorage.getItem('firstAidSystem');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed.inventory) ? parsed.inventory : [];
    } catch (e) {
      console.warn('Falha ao ler insumos de primeiros socorros:', e);
      return [];
    }
  }

  async function collectModulesData(date) {
    const [chaves, visitantes, epis, avisos, ocorrencias, entradasSaidas, autorizacoes] = await Promise.all([
      getByDate('chaves', date),
      getByDate('visitantes', date),
      getByDate('epis', date),
      getByDate('avisos', date),
      getByDate('ocorrencias', date),
      getByDate('entradas_saidas', date),
      getByDate('autorizacoes', date)
    ]);
    return {
      date,
      chaves,
      visitantes,
      epis,
      avisos,
      ocorrencias,
      entradasSaidas,
      autorizacoes,
      primeirosSocorros: getFirstAidByDate(date),
      insumos: getFirstAidInventory()
    };
  }

  async function collectModulesDataByPeriod(start, end) {
    const [chaves, visitantes, epis, avisos, ocorrencias, entradasSaidas, autorizacoes, pessoas] = await Promise.all([
      getByPeriod('chaves', start, end),
      getByPeriod('visitantes', start, end),
      getByPeriod('epis', start, end),
      getByPeriod('avisos', start, end),
      getByPeriod('ocorrencias', start, end),
      getByPeriod('entradas_saidas', start, end),
      getByPeriod('autorizacoes', start, end),
      (typeof DB === 'undefined' || !DB.store) ? Promise.resolve([]) : DB.store('pessoas').getAll()
    ]);
    return {
      start,
      end,
      chaves,
      visitantes,
      epis,
      avisos,
      ocorrencias,
      entradasSaidas,
      autorizacoes,
      pessoas,
      primeirosSocorros: getFirstAidByPeriod(start, end),
      insumos: getFirstAidInventory()
    };
  }

  /* ===================================================================
     EXCEL — PLANILHA GERAL DO SISTEMA (uma aba por funcionalidade)
     =================================================================== */
  const XLSX_LIB = new URL('libs/xlsx/xlsx.full.min.js', BASE_URL).href;

  async function loadXlsx() {
    if (!window.XLSX) await loadScript(XLSX_LIB);
    if (!window.XLSX) throw new Error('Não foi possível carregar a biblioteca de planilhas.');
    return window.XLSX;
  }

  function byDataHora(a, b) {
    return String(b.dataHora || b.data || '').localeCompare(String(a.dataHora || a.data || ''));
  }

  function fmtData(s) {
    return formatDateBR(s);
  }

  function buildSheets(m) {
    const sheets = [];

    sheets.push({
      name: 'Chaves e Itens',
      cols: ['Data', 'Hora', 'Categoria', 'Chave / Veículo', 'Funcionário', 'Quem devolveu', 'Status', 'Observação'],
      rows: (m.chaves || []).slice().sort(byDataHora).map((r) => [
        fmtData(r.data),
        r.hora || '-',
        r.tipo === 'veiculo' ? 'Veículo' : (r.tipo === 'comum' ? 'Chave Comum' : 'Almoxarifado'),
        r.tipo === 'veiculo' ? `${r.veiculo} (${r.placa || ''})` : (r.chave || '-'),
        r.funcionario || '-',
        r.status === 'devolvida' ? (r.retornoFuncionario || '-') : '-',
        r.status === 'devolvida' ? 'Devolvida' : 'Em uso',
        r.observacao || ''
      ])
    });

    sheets.push({
      name: 'Visitantes',
      cols: ['Data', 'Entrada', 'Saída', 'Visitante', 'Empresa', 'CPF/RG', 'Porteiro', 'Responsável', 'Setor', 'Motivo', 'Observações'],
      rows: (m.visitantes || []).slice().sort(byDataHora).map((r) => [
        fmtData(r.data),
        r.horaEntrada || '-',
        r.horaSaida || '-',
        r.nome || '-',
        r.empresa || '-',
        r.cpfRg || '-',
        r.porteiro || '-',
        r.responsavel || '-',
        r.setor || '-',
        r.motivo || '-',
        r.observacoes || ''
      ])
    });

    sheets.push({
      name: 'EPIs',
      cols: ['Data', 'Hora', 'Visitante', 'Porteiro', 'Responsável', 'EPIs', 'Operação', 'Status', 'Observações'],
      rows: (m.epis || []).slice().sort(byDataHora).map((r) => [
        fmtData(r.data),
        r.hora || '-',
        r.visitante || '-',
        r.porteiro || '-',
        r.responsavel || '-',
        (Array.isArray(r.epis) ? r.epis.map((nome) => (r.episQtd && r.episQtd[nome] > 1 ? `${nome} x${r.episQtd[nome]}` : nome)).join(', ') : (r.epis || '-')),
        r.operacao || '-',
        r.status === 'devolvido' ? 'Devolvido' : 'Pendente',
        r.observacoes || ''
      ])
    });

    sheets.push({
      name: 'Insumos',
      cols: ['Item', 'Qtd. Restante', 'Situação'],
      rows: (m.insumos || []).map((i) => [
        i.item || '-',
        i.remaining != null ? String(i.remaining) : '-',
        i.remaining <= 0 ? 'Sem estoque' : i.remaining <= 1 ? 'Crítico' : i.remaining <= 3 ? 'Atenção' : i.remaining <= 5 ? 'Alerta' : 'OK'
      ])
    });

    sheets.push({
      name: 'Primeiros Socorros',
      cols: ['Nº', 'Data', 'Hora', 'Líder', 'Setor', 'Usuário', 'Descrição'],
      rows: (m.primeirosSocorros || []).map((o) => [
        o.number != null ? String(o.number) : '-',
        fmtData(o.data || localDateOf(o.createdAt || o.timestamp)),
        (o.timestamp || o.createdAt) ? new Date(o.timestamp || o.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-',
        o.lider || '-',
        o.setor || '-',
        o.usuario || '-',
        o.descricao || '-'
      ])
    });

    sheets.push({
      name: 'Avisos e Recados',
      cols: ['Data', 'Hora', 'Porteiro', 'Deixado por', 'Texto'],
      rows: (m.avisos || []).slice().sort(byDataHora).map((a) => [
        fmtData(a.data),
        a.hora || '-',
        a.porteiro || '-',
        a.nome || '-',
        a.texto || ''
      ])
    });

    sheets.push({
      name: 'Ocorrências',
      cols: ['Data', 'Porteiro', 'Descrição'],
      rows: (m.ocorrencias || []).slice().sort(byDataHora).map((o) => [
        fmtData(o.data),
        o.porteiro || '-',
        o.descricao || '-'
      ])
    });

    sheets.push({
      name: 'Entrada e Saída',
      cols: ['Data', 'Entrada', 'Saída', 'Pessoa', 'Tipo', 'Doc.', 'Porteiro', 'Responsável', 'Situação', 'Observações'],
      rows: (m.entradasSaidas || []).slice().sort(byDataHora).map((r) => [
        fmtData(r.data),
        r.horaEntrada || '-',
        r.horaSaida || '-',
        r.nome || '-',
        r.tipo || '-',
        r.documento || '-',
        r.porteiro || '-',
        r.responsavel || '-',
        r.status === 'fora' ? 'Fora' : 'Dentro',
        r.observacoes || ''
      ])
    });

    sheets.push({
      name: 'Autorizações',
      cols: ['Data', 'Responsável', 'Autorizado', 'Tipo', 'Período', 'Forma', 'Observações', 'Status'],
      rows: (m.autorizacoes || []).slice().sort(byDataHora).map((a) => [
        fmtData(a.data),
        a.responsavelNome || '-',
        a.pessoaNome || '-',
        a.pessoaTipo || '-',
        `${fmtData(a.dataInicial)} ${a.horaInicial || ''} a ${fmtData(a.dataFinal)} ${a.horaFinal || ''}`,
        a.forma || '-',
        a.observacoes || '',
        a.status === 'cancelada' ? 'Cancelada' : (a.status || 'Ativa')
      ])
    });

    sheets.push({
      name: 'Cadastro de Pessoas',
      cols: ['Nome', 'Tipo', 'Documento', 'Empresa', 'Telefone', 'E-mail', 'Unidade', 'Setor', 'Observações', 'Situação'],
      rows: (m.pessoas || []).filter((p) => p.ativo !== false).map((p) => [
        p.nome || '-',
        p.tipo || '-',
        p.documento || '',
        p.empresa || '',
        p.telefone || '',
        p.email || '',
        p.unidade || '',
        p.setor || '',
        p.observacoes || '',
        'Ativo'
      ])
    });

    return sheets;
  }

  async function buildWorkbookXlsx(m) {
    const XLSX = await loadXlsx();
    const wb = XLSX.utils.book_new();
    const sheets = buildSheets(m);

    sheets.forEach((s) => {
      const aoa = [s.cols, ...s.rows];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let c = 0; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
        if (cell) {
          cell.s = {
            fill: { fgColor: { rgb: '1A73E8' } },
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }
          };
        }
      }
      ws['!cols'] = s.cols.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
      XLSX.utils.book_append_sheet(wb, ws, s.name);
    });

    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
    return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  const ReportService = {
    async prepareDailyTurnoverReport() {
      const date = todayISO();
      const modulesData = await collectModulesData(date);
      const pdf = await PdfService.generateDailyReport(modulesData);
      const dateText = formatDateBR2(date);
      const draft = EmailService.prepareEmail({
        dateText,
        pdfName: pdf.pdfName,
        pdfBlob: pdf.pdfBlob,
        pdfBase64: pdf.pdfBase64
      });
      return { date, dateText, modulesData, pdf, draft };
    },

    async preparePeriodReport(start, end) {
      const modulesData = await collectModulesDataByPeriod(start, end);
      const pdf = await PdfService.generatePeriodReport(modulesData);
      const periodText = `${formatDateBR2(start)} a ${formatDateBR2(end)}`;
      return { start, end, periodText, modulesData, pdf };
    },

    async preparePeriodExcel(start, end) {
      const modulesData = await collectModulesDataByPeriod(start, end);
      const excelBlob = await buildWorkbookXlsx(modulesData);
      const excelBase64 = await FileService.blobToBase64(excelBlob);
      const excelName = `relatorio_excel_periodo_${start}_a_${end}.xlsx`;
      return { start, end, excelBlob, excelName, excelBase64, modulesData };
    }
  };

  /* ===================================================================
     EXPOSIÇÃO GLOBAL
     =================================================================== */
  window.PortariaServices = {
    ConfigService,
    PdfService,
    EmailService,
    EmailDraft,
    FileService,
    ReportService
  };
})();
