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

export const ConfigService = {
  getEmpresaNome() {
    return CONFIG.empresa.nome;
  },

  getNomeSistema() {
    return CONFIG.nomeSistema;
  },

  getDestinatarios() {
    return [...CONFIG.email.to];
  },

  getCC() {
    return [...CONFIG.email.cc];
  },

  getAssuntoPadrao() {
    return CONFIG.assuntoPadrao;
  },

  getPastaRelatorios() {
    return CONFIG.pastas.relatorios;
  },

  getPastaBackups() {
    return CONFIG.pastas.backups;
  }
};
