/* ===================================================================
   CLARITY GLASS - PORTARIA - ELECTRON/EMAILSENDER.JS
   ===================================================================
   Cliente SMTP mínimo (sem dependências externas) usado pelo processo
   principal do Electron para enviar o relatório por e-mail.

   Suporta:
   - Conexão segura direta (SSL/TLS, normalmente porta 465).
   - STARTTLS (normalmente porta 587).
   - Autenticação AUTH LOGIN e AUTH PLAIN.
   - Anexo PDF em base64 (multipart/mixed).

   Observação: é um envio SMTP básico, suficiente para servidores
   corporativos (Office 365, Gmail com senha de app, etc.).
   =================================================================== */

'use strict';

const net = require('net');
const tls = require('tls');

/** Codifica o valor de um cabeçalho (assunto) com acentos. */
function encodeHeader(text) {
  const s = String(text == null ? '' : text);
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  return '=?UTF-8?B?' + Buffer.from(s, 'utf8').toString('base64') + '?=';
}

/** Quebra uma string base64 em linhas de 76 caracteres. */
function chunkBase64(b64) {
  const s = String(b64 || '');
  const out = [];
  for (let i = 0; i < s.length; i += 76) out.push(s.slice(i, i + 76));
  return out.join('\r\n');
}

/** Monta a mensagem MIME (texto + anexo PDF). */
function buildMime({ from, to, cc, subject, body, attachment }) {
  const boundary = 'clarity_' + Date.now().toString(16);
  const toList = (to || []).join(', ');
  const ccList = (cc || []).join(', ');

  const headers = [
    `From: ${from}`,
    `To: ${toList}`,
    ccList ? `Cc: ${ccList}` : null,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`
  ].filter(Boolean).join('\r\n');

  const parts = [];
  parts.push(
    `--${boundary}\r\n` +
    'Content-Type: text/plain; charset="UTF-8"\r\n' +
    'Content-Transfer-Encoding: 8bit\r\n\r\n' +
    String(body || '') + '\r\n'
  );

  if (attachment && attachment.base64) {
    const name = attachment.name || 'anexo.pdf';
    parts.push(
      `--${boundary}\r\n` +
      `Content-Type: ${attachment.mime || 'application/pdf'}; name="${name}"\r\n` +
      'Content-Transfer-Encoding: base64\r\n' +
      `Content-Disposition: attachment; filename="${name}"\r\n\r\n` +
      chunkBase64(attachment.base64) + '\r\n'
    );
  }

  parts.push(`--${boundary}--`);

  return headers + '\r\n\r\n' + parts.join('\r\n') + '\r\n';
}

/**
 * Executa a conversa SMTP.
 * @param {Object} cfg - { host, port, secure, user, pass, from }
 * @param {Object} msg - { to, cc, subject, body, attachment }
 * @returns {Promise<{ok: boolean}>}
 */
function sendMail(cfg, msg) {
  return new Promise((resolve, reject) => {
    const host = cfg.host;
    const port = Number(cfg.port) || (cfg.secure ? 465 : 587);
    const secure = !!cfg.secure;
    const from = cfg.from || cfg.user;
    const recipients = [].concat(msg.to || []).concat(msg.cc || []).filter(Boolean);

    if (!host || !from || !recipients.length) {
      reject(new Error('Configuração de e-mail incompleta (servidor, remetente ou destinatários).'));
      return;
    }

    const data = buildMime({
      from,
      to: msg.to || [],
      cc: msg.cc || [],
      subject: msg.subject,
      body: msg.body,
      attachment: msg.attachment
    });

    let socket = null;
    let buffer = '';
    let pending = null; // { resolve, reject, expect, accept }
    let done = false;

    const finish = (err) => {
      if (done) return;
      done = true;
      try { if (socket) socket.destroy(); } catch (e) { /* ignore */ }
      if (err) reject(err); else resolve({ ok: true });
    };

    const attach = (sock) => {
      socket = sock;
      socket.setTimeout(30000);
      socket.on('data', (chunk) => onData(chunk));
      socket.on('error', (err) => finish(err));
      socket.on('timeout', () => finish(new Error('Tempo esgotado ao falar com o servidor de e-mail.')));
      socket.on('close', () => { if (!done && pending) finish(new Error('Conexão encerrada pelo servidor de e-mail.')); });
    };

    const onData = (chunk) => {
      buffer += chunk.toString('utf8');
      let idx;
      while ((idx = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        handleLine(line);
      }
    };

    const handleLine = (line) => {
      if (!pending) return;
      if (line.length >= 4 && line[3] === '-') return; // continuação multi-linha
      const code = parseInt(line.slice(0, 3), 10);
      const p = pending;
      pending = null;
      if (p.accept.includes(code)) p.resolve(line);
      else p.reject(new Error('Servidor de e-mail respondeu: ' + line));
    };

    const command = (cmd, accept) => new Promise((res, rej) => {
      pending = { resolve: res, reject: rej, accept };
      socket.write(cmd + '\r\n');
    });

    const auth = async () => {
      if (!cfg.user) return;
      const user = Buffer.from(cfg.user, 'utf8').toString('base64');
      const pass = Buffer.from(cfg.pass || '', 'utf8').toString('base64');
      try {
        // Tenta AUTH LOGIN (mais comum).
        await command('AUTH LOGIN', [334]);
        await command(user, [334]);
        await command(pass, [235]);
      } catch (e) {
        // Fallback: AUTH PLAIN.
        const plain = Buffer.from('\u0000' + cfg.user + '\u0000' + (cfg.pass || ''), 'utf8').toString('base64');
        await command('AUTH PLAIN ' + plain, [235]);
      }
    };

    const sendEnvelope = async () => {
      await command(`MAIL FROM:<${from}>`, [250]);
      for (const rcpt of recipients) {
        await command(`RCPT TO:<${rcpt}>`, [250, 251]);
      }
      await command('DATA', [354]);
      await command(data.replace(/\r\n\./g, '\r\n..') + '\r\n.', [250]);
      await command('QUIT', [221]);
      finish(null);
    };

    // Fluxo principal.
    (async () => {
      try {
        const sock = secure
          ? tls.connect({ host, port, servername: host })
          : net.connect({ host, port });
        attach(sock);

        // Espera a saudação 220.
        await new Promise((res, rej) => { pending = { resolve: res, reject: rej, accept: [220] }; });

        await command('EHLO clarity-glass', [250]);

        if (!secure) {
          await command('STARTTLS', [220]);
          // Atualiza para TLS mantendo o mesmo socket.
          socket.removeAllListeners('data');
          socket.removeAllListeners('error');
          socket.removeAllListeners('timeout');
          socket.removeAllListeners('close');
          const tlsSock = tls.connect({ socket, servername: host });
          attach(tlsSock);
          await new Promise((res, rej) => {
            tlsSock.once('secureConnect', res);
            tlsSock.once('error', rej);
          });
          await command('EHLO clarity-glass', [250]);
        }

        await auth();
        await sendEnvelope();
      } catch (err) {
        finish(err);
      }
    })();
  });
}

module.exports = { sendMail, buildMime, encodeHeader, chunkBase64 };
