/* ===================================================================
   CLARITY GLASS - PORTARIA - ELECTRON/PRELOAD.JS
   ===================================================================
   Ponte segura entre o renderizador e o processo principal.
   Expõe somente a API de gravação de PDF (e a flag isElectron).
   =================================================================== */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('portariaAPI', {
  isElectron: true,

   /**
    * Grava um PDF na pasta de relatórios da Área de Trabalho.
    * @param {{folderName: string, fileName: string, base64: string}} payload
    * @returns {Promise<{ok: boolean, path?: string}>}
    */
  savePdf: (payload) => ipcRenderer.invoke('save-pdf', payload),

  /**
   * Abre o Outlook com um e-mail pronto para envio (com o PDF anexado).
   * @param {{to: string[], cc: string[], subject: string, body: string, fileName: string, base64: string}} payload
   * @returns {Promise<{ok: boolean, pdfPath?: string}>}
   */
  sendOutlook: (payload) => ipcRenderer.invoke('send-outlook', payload)
});
