/* ===================================================================
   CLARITY GLASS - PORTARIA - SERVICES/EMAIL_DRAFT.JS
   ===================================================================
   Objeto central de e-mail. Todo o sistema deve manipular o rascunho
   SOMENTE pelos métodos desta classe, nunca acessando os campos
   diretamente. Dessa forma, quando o Electron entrar, basta substituir
   a camada de envio sem alterar as telas.
   =================================================================== */

export class EmailDraft {
  #to = [];
  #cc = [];
  #subject = '';
  #body = '';
  #attachment = null;

  setTo(list) {
    this.#to = Array.isArray(list) ? [...list] : [];
    return this;
  }

  setCc(list) {
    this.#cc = Array.isArray(list) ? [...list] : [];
    return this;
  }

  setSubject(text) {
    this.#subject = String(text || '');
    return this;
  }

  setBody(text) {
    this.#body = String(text || '');
    return this;
  }

  setAttachment(attachment) {
    this.#attachment = attachment || null;
    return this;
  }

  getTo() {
    return [...this.#to];
  }

  getCc() {
    return [...this.#cc];
  }

  getSubject() {
    return this.#subject;
  }

  getBody() {
    return this.#body;
  }

  getAttachment() {
    return this.#attachment;
  }

  getAttachmentName() {
    return this.#attachment ? this.#attachment.name : '';
  }

  getAttachmentSize() {
    return this.#attachment && this.#attachment.size ? this.#attachment.size : 0;
  }

  getAttachmentBlob() {
    return this.#attachment ? this.#attachment.blob : null;
  }

  getAttachmentBase64() {
    return this.#attachment ? this.#attachment.base64 : '';
  }

  /**
   * Retorna uma representação serializável do rascunho.
   * @returns {{to: string[], cc: string[], subject: string, body: string, attachment: object|null}}
   */
  toObject() {
    return {
      to: this.getTo(),
      cc: this.getCc(),
      subject: this.getSubject(),
      body: this.getBody(),
      attachment: this.#attachment
        ? {
            name: this.#attachment.name,
            size: this.#attachment.size,
            base64: this.#attachment.base64
          }
        : null
    };
  }
}
