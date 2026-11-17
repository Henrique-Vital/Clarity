/* ===================================================================
   CLARITY GLASS - PORTARIA - BACKUP.JS
   ===================================================================
   Núcleo do "Backup Geral" (JSON com todos os dados do sistema).
   Exposto em window.PortariaBackup para ser usado:
     - pelo botão "Backup Geral" e pelo "Finalizar Turno" (dashboard.js);
     - pelo agendador automático (js/backup-auto.js), que roda em todas
       as páginas e salva às 06:00 e às 18:00 sem nenhuma confirmação.
   =================================================================== */

(function () {
  'use strict';

  async function readFirstAid() {
    // IndexedDB é a fonte principal; localStorage é fallback legado.
    try {
      if (typeof DB !== 'undefined' && DB.store) {
        const rec = await DB.store('primeiros_socorros').get('state');
        if (rec) return rec;
      }
    } catch (e) {
      // segue para o fallback
    }
    try {
      const saved = localStorage.getItem('firstAidSystem');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  function countRecords(dados) {
    let total = 0;
    const contagens = {};
    Object.keys(dados).forEach((key) => {
      const value = dados[key];
      let count = 0;
      if (Array.isArray(value)) count = value.length;
      else if (value) count = 1;
      contagens[key] = count;

      // "insumos" duplica o inventário de primeiros socorros e
      // "primeirosSocorros" é contado pelas listas internas abaixo.
      if (key === 'insumos' || key === 'primeirosSocorros') return;
      total += count;
    });
    const firstAid = dados.primeirosSocorros;
    if (firstAid && typeof firstAid === 'object') {
      if (Array.isArray(firstAid.occurrences)) total += firstAid.occurrences.length;
      if (Array.isArray(firstAid.inventory)) total += firstAid.inventory.length;
    }
    return { total, contagens };
  }

  /** Monta o objeto de backup com todos os módulos do sistema. */
  async function build() {
    const firstAid = await readFirstAid();
    let firstAidStore = [];
    try {
      if (typeof DB !== 'undefined' && DB.store) {
        firstAidStore = await DB.exportStore('primeiros_socorros');
      }
    } catch (e) {
      firstAidStore = [];
    }
    const dados = {
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
      primeiros_socorros: firstAidStore,
      insumos: firstAid && Array.isArray(firstAid.inventory) ? firstAid.inventory : [],
      primeirosSocorros: firstAid
    };
    const { total, contagens } = countRecords(dados);
    return {
      sistema: 'Portaria - Clarity Glass',
      versao: '1.1.0',
      geradoEm: new Date().toISOString(),
      origem: window.location.origin,
      url: window.location.href,
      totalRegistros: total,
      contagens,
      dados,
      preferencias: {
        tema: localStorage.getItem('clarityTheme') || 'light',
        logo: localStorage.getItem('clarityLogo') || null
      }
    };
  }

  /** Nome do arquivo: backup_geral_AAAA-MM-DD_HHhMM.json */
  function fileName() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}h${pad(d.getMinutes())}`;
    return `backup_geral_${date}_${time}.json`;
  }

  /**
   * Gera e salva o backup.
   * @param {{requireData?: boolean, requireFolder?: boolean}} [options]
   *   requireData: não gera arquivo quando o banco está sem registros.
   *   requireFolder: só considera concluído se gravou na pasta escolhida
   *                  (usado pelo backup automático, que não pode depender
   *                  de um download silencioso).
   */
  async function save(options) {
    const opts = options || {};
    const backup = await build();
    const base = {
      fileName: null,
      totalRegistros: backup.totalRegistros,
      contagens: backup.contagens,
      origem: backup.origem
    };

    if (opts.requireData && backup.totalRegistros === 0) {
      return Object.assign({}, base, { ok: false, empty: true, saved: false, motivo: 'banco-sem-dados' });
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const name = fileName();
    base.fileName = name;

    const FileService = window.PortariaServices && window.PortariaServices.FileService;

    // Backup automático: grava direto na pasta, sem cair no download.
    // Downloads silenciosos são bloqueados com frequência e não podem
    // ser confirmados; sem a pasta autorizada, o slot fica pendente.
    if (opts.requireFolder) {
      if (FileService && typeof FileService.saveToDesktopFolder === 'function') {
        try {
          const res = await FileService.saveToDesktopFolder(blob, name);
          return Object.assign({}, base, {
            ok: true,
            saved: true,
            savedToFolder: true,
            downloaded: false,
            res
          });
        } catch (e) {
          const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError' || e.name === 'AbortError');
          return Object.assign({}, base, {
            ok: false,
            saved: false,
            fallback: false,
            downloaded: false,
            motivo: denied ? 'pasta-nao-autorizada' : 'falha-ao-salvar',
            erro: String((e && e.message) || e)
          });
        }
      }
      return Object.assign({}, base, {
        ok: false,
        saved: false,
        fallback: false,
        downloaded: false,
        motivo: 'pasta-nao-autorizada'
      });
    }

    if (FileService && typeof FileService.savePdf === 'function') {
      const res = await FileService.savePdf(blob, name);
      const savedToFolder = !!(res && res.savedToDesktop);
      const downloaded = !!(res && res.downloaded);
      return Object.assign({}, base, {
        ok: true,
        saved: true,
        savedToFolder,
        downloaded,
        res
      });
    }

    if (window.UI && typeof UI.saveFile === 'function') {
      const res = await UI.saveFile(blob, name);
      const savedToFolder = !!(res && res.savedToDesktop);
      const downloaded = !!(res && (res.downloaded || (!savedToFolder && res.ok)));
      return Object.assign({}, base, {
        ok: true,
        saved: true,
        savedToFolder,
        downloaded,
        res
      });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return Object.assign({}, base, { ok: true, saved: true, downloaded: true });
  }

  window.PortariaBackup = { build, save };
})();
