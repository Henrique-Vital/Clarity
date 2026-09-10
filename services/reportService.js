/* ===================================================================
   CLARITY GLASS - PORTARIA - SERVICES/REPORT_SERVICE.JS
   ===================================================================
   Orquestra o fluxo do relatório diário:

   1. Coleta os dados de todos os módulos (IndexedDB + LocalStorage);
   2. Gera o PDF (pdfService);
   3. Prepara o rascunho do e-mail (emailService).

   Nenhum download é iniciado aqui e nenhum e-mail é enviado.
   =================================================================== */

import { PdfService } from './pdfService.js';
import { EmailService } from './emailService.js';
import { FileService } from './fileService.js';

// Biblioteca de planilhas (cópia local, para funcionar offline).
const XLSX_LIB = new URL('../libs/xlsx/xlsx.full.min.js', import.meta.url).href;

/** Data de hoje em YYYY-MM-DD (fuso local, não UTC). */
function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Data local YYYY-MM-DD de uma data ISO (fallback para a comparação por timestamp). */
function localDateOf(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Formata YYYY-MM-DD para DD/MM/AAAA. */
function formatDateBR(iso) {
  const parts = String(iso).split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/** Lê os registros de uma store do IndexedDB filtrando pela data. */
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

/** Lê os registros de uma store do IndexedDB filtrando por período (inclusive). */
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

/** Lê as ocorrências de primeiros socorros (LocalStorage do módulo existente). */
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

/** Lê as ocorrências de primeiros socorros (LocalStorage do módulo existente) por período. */
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

/** Lê o estoque de insumos de primeiros socorros (LocalStorage do módulo existente). */
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

/** Coleta os dados de todos os módulos referentes a uma data. */
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

/** Coleta os dados de todos os módulos referentes a um período. */
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

/** Garante que o SheetJS (XLSX) esteja carregado. */
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

/** Monta as abas da planilha (uma por funcionalidade do sistema). */
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

/** Constrói a planilha (workbook) com uma aba por funcionalidade. */
async function buildWorkbookXlsx(m) {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();
  const sheets = buildSheets(m);

  sheets.forEach((s) => {
    const aoa = [s.cols, ...s.rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const range = XLSX.utils.decode_range(ws['!ref']);
    // Cabeçalho em azul com texto branco (identidade visual do sistema).
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

export const ReportService = {
  /**
   * Prepara o relatório diário completo (PDF + rascunho de e-mail).
   * @returns {Promise<{
   *   date: string,
   *   dateText: string,
   *   modulesData: Object,
   *   pdf: {pdfBlob: Blob, pdfName: string, pdfBase64: string},
   *   draft: EmailDraft
   * }>}
   */
  async prepareDailyTurnoverReport() {
    const date = todayISO();
    const modulesData = await collectModulesData(date);
    const pdf = await PdfService.generateDailyReport(modulesData);
    const dateText = formatDateBR(date);
    const draft = EmailService.prepareEmail({
      dateText,
      pdfName: pdf.pdfName,
      pdfBlob: pdf.pdfBlob,
      pdfBase64: pdf.pdfBase64
    });
    return { date, dateText, modulesData, pdf, draft };
  },

  /**
   * Prepara o relatório por período de todos os módulos (PDF).
   * @returns {Promise<{start, end, periodText, modulesData, pdf}>}
   */
  async preparePeriodReport(start, end) {
    const modulesData = await collectModulesDataByPeriod(start, end);
    const pdf = await PdfService.generatePeriodReport(modulesData);
    const periodText = `${formatDateBR(start)} a ${formatDateBR(end)}`;
    return { start, end, periodText, modulesData, pdf };
  },

  /**
   * Prepara a planilha Excel geral do período (uma aba por módulo).
   * @returns {Promise<{start, end, excelBlob, excelName, excelBase64, modulesData}>}
   */
  async preparePeriodExcel(start, end) {
    const modulesData = await collectModulesDataByPeriod(start, end);
    const excelBlob = await buildWorkbookXlsx(modulesData);
    const excelBase64 = await FileService.blobToBase64(excelBlob);
    const excelName = `relatorio_excel_periodo_${start}_a_${end}.xlsx`;
    return { start, end, excelBlob, excelName, excelBase64, modulesData };
  }
};
