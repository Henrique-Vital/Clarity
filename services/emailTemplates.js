/* ===================================================================
   CLARITY GLASS - PORTARIA - SERVICES/EMAIL_TEMPLATES.JS
   ===================================================================
   Textos das mensagens de e-mail, isolados em um arquivo próprio para
   que possam ser alterados facilmente sem tocar na lógica do sistema.
   =================================================================== */

export const EmailTemplates = {
  /**
   * Corpo padrão do e-mail de relatório diário.
   * @param {string} dateText - Data do turno formatada (ex.: 01/08/2026).
   * @returns {string}
   */
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
