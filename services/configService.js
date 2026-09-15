/* ===================================================================
   CLARITY GLASS - PORTARIA - SERVICES/CONFIG_SERVICE.JS
   ===================================================================
   Configurações centralizadas do sistema.

   Para alterar a empresa, destinatários, CC, assunto padrão ou os nomes
   das pastas criadas na Área de Trabalho, edite apenas este arquivo.
   O texto da mensagem do e-mail fica em emailTemplates.js.
   =================================================================== */

const CONFIG = {
  // Dados da empresa exibidos nos relatórios.
  empresa: {
    nome: 'Clarity Glass'
  },

  // Nome do sistema exibido em cabeçalhos e rodapés.
  nomeSistema: 'Portaria - Clarity Glass',

  // Destinatários fixos do relatório diário.
  email: {
    to: [
      'portaria@clarityglass.com.br'
    ],
    cc: [
      'gerencia@clarityglass.com.br'
    ]
  },

  // Assunto padrão do e-mail.
  assuntoPadrao: 'Relatório Diário da Portaria - Clarity Glass',

  // Pasta única onde TODOS os arquivos gerados pelo sistema são salvos
  // (PDFs e backups JSON). Nas três versões (web, Windows 32 e 64 bits)
  // a pasta "controle-da-portaria" é criada automaticamente se não existir.
  pastas: {
    relatorios: 'controle-da-portaria',
    backups: 'controle-da-portaria'
  }
};

/**
 * Lê a configuração de e-mail salva pela tela de Configurações
 * (localStorage `clarityEmailConfig`), com fallback para os padrões acima.
 */
function readEmailOverride() {
  try {
    const raw = localStorage.getItem('clarityEmailConfig');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export const ConfigService = {
  getEmpresaNome() {
    return CONFIG.empresa.nome;
  },

  getNomeSistema() {
    return CONFIG.nomeSistema;
  },

  getDestinatarios() {
    const o = readEmailOverride();
    if (o && Array.isArray(o.to) && o.to.length) return [...o.to];
    return [...CONFIG.email.to];
  },

  getCC() {
    const o = readEmailOverride();
    if (o && Array.isArray(o.cc)) return [...o.cc];
    return [...CONFIG.email.cc];
  },

  getAssuntoPadrao() {
    const o = readEmailOverride();
    if (o && o.subject) return o.subject;
    return CONFIG.assuntoPadrao;
  },

  /** Mensagem personalizada (null = usar o template padrão). */
  getMensagemPadrao() {
    const o = readEmailOverride();
    return (o && o.body) ? o.body : null;
  },

  getPastaRelatorios() {
    return CONFIG.pastas.relatorios;
  },

  getPastaBackups() {
    return CONFIG.pastas.backups;
  }
};
