/* ===================================================================
   CLARITY GLASS - PORTARIA - SERVICES/EMAIL_SERVICE.JS
   ===================================================================
   Responsável por montar o rascunho do e-mail (EmailDraft) a partir das
   configurações e da mensagem padrão. NENHUM envio é realizado aqui.

   Compatibilidade futura com Electron:
   Hoje:    EmailService.prepareEmail(...)
   Futuro:  electronEmailService.send(draft)  -> substitui apenas o envio.
   =================================================================== */

import { ConfigService } from './configService.js';
import { EmailTemplates } from './emailTemplates.js';
import { EmailDraft } from './emailDraft.js';

export const EmailService = {
  /**
   * Monta o rascunho do e-mail do relatório diário.
   * @param {Object} params
   * @param {string} params.dateText - Data do turno formatada (ex.: 01/08/2026).
   * @param {string} params.pdfName - Nome do arquivo PDF.
   * @param {Blob} params.pdfBlob - Conteúdo do PDF.
   * @param {string} params.pdfBase64 - Conteúdo do PDF em base64.
   * @returns {EmailDraft}
   */
  prepareEmail({ dateText, pdfName, pdfBlob, pdfBase64 }) {
    const customBody = ConfigService.getMensagemPadrao();
    const body = customBody
      ? customBody.replace(/\{data\}/g, dateText)
      : EmailTemplates.relatorioDiario(dateText);
    const draft = new EmailDraft();
    draft
      .setTo(ConfigService.getDestinatarios())
      .setCc(ConfigService.getCC())
      .setSubject(ConfigService.getAssuntoPadrao())
      .setBody(body)
      .setAttachment({
        name: pdfName,
        blob: pdfBlob,
        base64: pdfBase64,
        size: pdfBlob ? pdfBlob.size : 0
      });
    return draft;
  }
};
