/* ===================================================================
   CLARITY GLASS - PORTARIA - ELECTRON/MAIN.JS
   ===================================================================
   Processo principal do Electron.

   - Serve o sistema via um servidor HTTP local (sem dependências
     externas), permitindo o uso dos ES modules das services/.
   - Abre a janela do aplicativo.
   - Recebe (IPC) os arquivos gerados pela tela (PDFs e backups) e os
     grava na pasta "controle-da-portaria" da raiz do projeto, criando
     a pasta se não existir.

   A camada de e-mail NÃO é implementada aqui: o envio futuro ficará
   em electronEmailService, mantendo as telas intactas.
   =================================================================== */

const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const { sendMail } = require('./emailSender');

const ROOT_DIR = path.join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

/** Remove caracteres inválidos para nomes de pasta/arquivo no Windows. */
function sanitizeName(name) {
  return String(name || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim();
}

/**
 * Verifica se uma URL é de WhatsApp. Essas URLs devem abrir no navegador
 * padrão do usuário (ou no app do WhatsApp) e NÃO dentro da janela do
 * Electron, pois o WhatsApp Web não funciona em navegador embutido.
 */
function isExternalWhatsAppUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch (e) {
    return false;
  }
  if (url.protocol === 'whatsapp:') return true;
  const host = url.hostname.toLowerCase();
  return host === 'wa.me' ||
    host === 'whatsapp.com' ||
    host === 'web.whatsapp.com' ||
    host === 'api.whatsapp.com' ||
    host.endsWith('.whatsapp.com');
}

/** Serve os arquivos do sistema a partir da raiz do projeto. */
function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        if (urlPath === '/') urlPath = '/index.html';
        const filePath = path.normalize(path.join(ROOT_DIR, urlPath));
        if (!filePath.startsWith(ROOT_DIR)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
          }
          res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream' });
          res.end(data);
        });
      } catch (e) {
        res.writeHead(500);
        res.end('Internal error');
      }
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

/**
 * Grava um arquivo (PDF ou backup JSON) na pasta "controle-da-portaria",
 * localizada na raiz do projeto. A pasta é criada automaticamente se não
 * existir (é a mesma para as versões 32 e 64 bits, pois ambas usam a mesma
 * raiz do aplicativo).
 *
 * Se o arquivo estiver aberto/bloqueado (ex.: aberto em um visualizador
 * de PDF), o arquivo é salvo com um sufixo de tempo no nome para nunca
 * falhar de forma silenciosa.
 */
ipcMain.handle('save-pdf', async (event, payload) => {
  const { folderName, fileName, base64 } = payload || {};
  const safeFolder = sanitizeName(folderName) || 'controle-da-portaria';
  const safeFile = sanitizeName(fileName) || 'relatorio.pdf';
  const targetDir = path.join(ROOT_DIR, safeFolder);
  fs.mkdirSync(targetDir, { recursive: true });
  const data = Buffer.from(String(base64 || ''), 'base64');

  let filePath = path.join(targetDir, safeFile);
  let renamed = false;
  try {
    fs.writeFileSync(filePath, data);
  } catch (err) {
    if (err.code === 'EBUSY' || err.code === 'EPERM' || err.code === 'EACCES') {
      const dot = safeFile.lastIndexOf('.');
      const base = dot > 0 ? safeFile.slice(0, dot) : safeFile;
      const ext = dot > 0 ? safeFile.slice(dot) : '';
      const stamp = new Date().toISOString().slice(11, 16).replace(':', '');
      const altName = `${base}_${stamp}${ext}`;
      filePath = path.join(targetDir, altName);
      fs.writeFileSync(filePath, data);
      renamed = true;
    } else {
      throw err;
    }
  }
  return { ok: true, path: filePath, fileName: path.basename(filePath), renamed };
});

/** Codifica texto em base64 (UTF-8) para passar com segurança ao PowerShell. */
function b64(text) {
  return Buffer.from(String(text || ''), 'utf8').toString('base64');
}

/**
 * Abre o Outlook com um e-mail pronto para enviar (destinatários, CC,
 * assunto, corpo e o PDF anexado). Usa a automação COM do Outlook via
 * PowerShell. O e-mail NÃO é enviado — apenas exibido (Display).
 *
 * Requisitos: Outlook instalado e perfil configurado no Windows.
 */
ipcMain.handle('send-outlook', async (event, payload) => {
  const { to, cc, subject, body, fileName, base64 } = payload || {};
  const toList = Array.isArray(to) ? to : [];
  const ccList = Array.isArray(cc) ? cc : [];
  const safeFile = sanitizeName(fileName) || 'relatorio.pdf';

  // Grava o PDF num arquivo temporário para anexar no e-mail.
  const tempDir = path.join(app.getPath('temp'), 'clarity-portaria');
  fs.mkdirSync(tempDir, { recursive: true });
  const pdfPath = path.join(tempDir, safeFile);
  fs.writeFileSync(pdfPath, Buffer.from(String(base64 || ''), 'base64'));

  const ps = [
    "$ErrorActionPreference = 'Stop'",
    'try {',
    '  $outlook = New-Object -ComObject Outlook.Application',
    '  $mail = $outlook.CreateItem(0)',
    `  $mail.To = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${b64(toList.join('; '))}'))`,
    `  $mail.CC = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${b64(ccList.join('; '))}'))`,
    `  $mail.Subject = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${b64(subject)}'))`,
    `  $mail.Body = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${b64(body)}'))`,
    `  $mail.Attachments.Add('${String(pdfPath).replace(/'/g, "''")}')`,
    '  $mail.Display()',
    "  Write-Output 'OK'",
    '} catch {',
    "  Write-Output ('ERR: ' + $_.Exception.Message)",
    '  exit 1',
    '}'
  ].join("\n");

  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], { windowsHide: true });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('error', (err) => {
      reject(err);
    });
    child.on('close', (code) => {
      if (code === 0 && out.includes('OK')) {
        resolve({ ok: true, pdfPath });
      } else {
        const msg = (out || '').trim() || 'Não foi possível abrir o Outlook.';
        reject(new Error(msg));
      }
    });
  });
});

/**
 * Envia o relatório por e-mail direto via SMTP (sem Outlook).
 * @param {Object} payload - { smtp: {host,port,secure,user,pass,from}, to, cc, subject, body, fileName, base64 }
 */
ipcMain.handle('send-email', async (event, payload) => {
  const { smtp, to, cc, subject, body, fileName, base64 } = payload || {};
  try {
    await sendMail(smtp || {}, {
      to,
      cc,
      subject,
      body,
      attachment: { name: fileName || 'relatorio.pdf', mime: 'application/pdf', base64 }
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err && err.message) || 'Falha ao enviar o e-mail.' };
  }
});

/** Alterna o modo tela cheia da janela do aplicativo. */
ipcMain.handle('toggle-fullscreen', async () => {
  if (!mainWindow) return { ok: false, fullscreen: false };
  const next = !mainWindow.isFullScreen();
  mainWindow.setFullScreen(next);
  return { ok: true, fullscreen: next };
});

/** Liga/desliga o modo quiosque (tela cheia travada, sem sair com Esc). */
ipcMain.handle('set-kiosk', async (event, enabled) => {
  if (!mainWindow) return { ok: false, kiosk: false };
  mainWindow.setKiosk(!!enabled);
  return { ok: true, kiosk: mainWindow.isKiosk() };
});

let mainWindow = null;

async function createWindow() {
  const port = await startStaticServer();
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    title: 'Portaria - Clarity Glass',
    backgroundColor: '#f0f4f8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  Menu.setApplicationMenu(null);

  // Links de WhatsApp abrem no navegador padrão do usuário (ou no app),
  // nunca dentro da janela do Electron (onde o WhatsApp Web não funciona).
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalWhatsAppUrl(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isExternalWhatsAppUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}/index.html`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
