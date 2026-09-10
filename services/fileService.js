/* ===================================================================
   CLARITY GLASS - PORTARIA - SERVICES/FILE_SERVICE.JS
   ===================================================================
   Responsável pela manipulação de arquivos no navegador/Electron.

   - No Electron: grava os PDFs direto na pasta de relatórios da Área de
     Trabalho (a pasta é criada automaticamente se não existir).
   - No navegador: mantém o comportamento padrão (download para Downloads).

   A troca de comportamento é transparente para o restante do sistema:
   quem chama savePdf() não precisa saber onde o arquivo será gravado.
   =================================================================== */

import { ConfigService } from './configService.js';

export const FileService = {
  /**
   * Converte um Blob em uma string base64 (sem o prefixo do Data URL).
   * @param {Blob} blob
   * @returns {Promise<string>}
   */
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

  /**
   * Formata um tamanho em bytes para exibição (KB/MB).
   * @param {number} bytes
   * @returns {string}
   */
  formatFileSize(bytes) {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  },

  /**
   * Baixa um Blob no navegador (pasta Downloads).
   * @param {Blob} blob
   * @param {string} fileName
   */
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

  /**
   * Salva um PDF. No Electron grava na pasta da Área de Trabalho
   * (criando a pasta se necessário); no navegador faz o download.
   * @param {Blob} blob
   * @param {string} fileName
   * @returns {Promise<Object>}
   */
  async savePdf(blob, fileName) {
    if (window.portariaAPI && window.portariaAPI.isElectron) {
      const base64 = await this.blobToBase64(blob);
      return window.portariaAPI.savePdf({
        folderName: ConfigService.getPastaRelatorios(),
        fileName,
        base64
      });
    }
    this.downloadBlob(blob, fileName);
    return { ok: true, downloaded: true };
  }
};
