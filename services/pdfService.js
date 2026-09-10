/* ===================================================================
   CLARITY GLASS - PORTARIA - SERVICES/PDF_SERVICE.JS
   ===================================================================
   Responsável pela geração do PDF do relatório diário (todos os
   módulos). Utiliza jsPDF + autotable. Não realiza download: apenas
   devolve { pdfBlob, pdfName, pdfBase64 }.
   =================================================================== */

import { FileService } from './fileService.js';

// URLs das bibliotecas (cópias locais, para funcionar offline).
const PDF_LIBS = {
  jsPDF: new URL('../libs/jspdf/jspdf.umd.min.js', import.meta.url).href,
  autoTable: new URL('../libs/jspdf-autotable/jspdf.plugin.autotable.min.js', import.meta.url).href
};

const COR_PRIMARIA = [26, 115, 232];
const COR_TEXTO = [33, 33, 33];
const COR_CINZA = [95, 99, 104];

/** Injeta um <script> e aguarda o carregamento. */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Falha ao carregar ' + src));
    document.head.appendChild(s);
  });
}

/**
 * Carrega jsPDF e autotable (builds UMD). Reutiliza as versões já
 * carregadas pela página (window.jspdf), quando disponíveis.
 */
async function loadPdfLibs() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    await loadScript(PDF_LIBS.jsPDF);
  }
  // O plugin autotable também patcha window.jspdf.jsPDF.API.
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

/** Formata uma data ISO (YYYY-MM-DD) para DD/MM/AAAA. */
function formatDateBR(dateISO) {
  if (!dateISO) return '-';
  const parts = String(dateISO).split('-');
  if (parts.length !== 3) return dateISO;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/** Extrai HH:MM de uma data ISO, quando possível. */
function timeFromISO(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Lista de EPIs com quantidade (Capacete x3), quando informada. */
function formatEpiList(e) {
  const arr = Array.isArray(e.epis) ? e.epis : [];
  if (arr.length === 0) return e.epis || '-';
  const qtd = e.episQtd || {};
  return arr.map((nome) => (qtd[nome] > 1 ? `${nome} x${qtd[nome]}` : nome)).join(', ');
}

/** Situação de um insumo com base na quantidade restante. */
function insumoStatusText(remaining) {
  if (remaining <= 0) return 'Sem estoque';
  if (remaining <= 1) return 'Crítico';
  if (remaining <= 3) return 'Atenção';
  if (remaining <= 5) return 'Alerta';
  return 'OK';
}

/** Situação de uma autorização calculada no momento (texto para o PDF). */
function autorizacaoStatusText(a) {
  if (a.status === 'cancelada') return 'CANCELADA';
  const ini = new Date(a.dataInicial + 'T' + (a.horaInicial || '00:00'));
  const fim = new Date(a.dataFinal + 'T' + (a.horaFinal || '23:59'));
  const now = new Date();
  if (now < ini) return 'AGENDADA';
  if (now > fim) return 'EXPIRADA';
  return 'ATIVA';
}

/** Desenha o cabeçalho azul com logo (placeholder) e título. */
function drawHeader(doc, pageWidth, title) {
  doc.setFillColor(...COR_PRIMARIA);
  doc.rect(0, 0, pageWidth, 34, 'F');

  // Logo placeholder (a logo oficial será incluída no futuro).
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

/** Desenha o bloco de metadados (data do turno ou período, e geração). */
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

/** Desenha o título de uma seção de módulo. */
function drawSectionTitle(doc, y, title) {
  doc.setFillColor(...COR_PRIMARIA);
  doc.roundedRect(14, y - 4, 6, 6, 1, 1, 'F');
  doc.setTextColor(...COR_TEXTO);
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text(title, 24, y);
  return y + 5;
}

/** Mensagem exibida quando um módulo não possui registros no período. */
function drawEmpty(doc, y, label) {
  doc.setTextColor(...COR_CINZA);
  doc.setFontSize(9);
  doc.setFont(undefined, 'italic');
  doc.text(`Sem ${label} registradas.`, 14, y);
  return y + 8;
}

/**
 * Renderiza a tabela de um módulo (com quebra automática de página).
 * Retorna a coordenada Y onde o próximo bloco deve começar.
 */
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

/** Desenha o rodapé com paginação e data de geração apenas na última página. */
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

export const PdfService = {
  /**
   * Gera o relatório diário com os dados de todos os módulos.
   * @param {Object} modulesData
   * @returns {Promise<{pdfBlob: Blob, pdfName: string, pdfBase64: string}>}
   */
  async generateDailyReport(modulesData) {
    return generateReport(modulesData, {
      title: 'RELATÓRIO DIÁRIO DA PORTARIA',
      periodText: '',
      fileBase: `relatorio_diario_portaria_${modulesData.date || new Date().toISOString().split('T')[0]}`
    });
  },

  /**
   * Gera o relatório por período com os dados de todos os módulos.
   * @param {Object} modulesData - Dados com { start, end, ...módulos }.
   * @returns {Promise<{pdfBlob: Blob, pdfName: string, pdfBase64: string}>}
   */
  async generatePeriodReport(modulesData) {
    return generateReport(modulesData, {
      title: 'RELATÓRIO POR PERÍODO DA PORTARIA',
      periodText: `Período: ${formatDateBR(modulesData.start)} a ${formatDateBR(modulesData.end)}`,
      fileBase: `relatorio_periodo_portaria_${modulesData.start}_a_${modulesData.end}`
    });
  }
};

/** Constrói o PDF com todos os módulos (usado pelo diário e pelo período). */
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

    // ===== Controle de Chaves ou Item =====
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

    // ===== CONTROLE DE EPIs =====
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

    // ===== CONTROLE DE INSUMOS =====
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

    // ===== CONTROLE DE PRIMEIROS SOCORROS =====
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

    // ===== CONTROLE DE VISITANTES =====
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

    // ===== CONTROLE DE AVISOS E RECADOS =====
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

    // ===== CONTROLE DE OCORRÊNCIAS =====
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

    // ===== ENTRADA E SAÍDA =====
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

    // ===== AUTORIZAÇÕES =====
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
