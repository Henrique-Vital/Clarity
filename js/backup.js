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
    return {
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
        primeiros_socorros: firstAidStore,
        insumos: firstAid && Array.isArray(firstAid.inventory) ? firstAid.inventory : [],
        primeirosSocorros: firstAid
      },
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

  /** Gera e salva o backup (silenciosamente). */
  async function save() {
    const backup = await build();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const name = fileName();

    const FileService = window.PortariaServices && window.PortariaServices.FileService;
    if (FileService && typeof FileService.savePdf === 'function') {
      const res = await FileService.savePdf(blob, name);
      return { ok: true, fileName: name, res };
    }
    if (window.UI && typeof UI.saveFile === 'function') {
      await UI.saveFile(blob, name);
      return { ok: true, fileName: name };
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { ok: true, fileName: name, downloaded: true };
  }

  window.PortariaBackup = { build, save };
})();
