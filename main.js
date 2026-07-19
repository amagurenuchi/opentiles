const { app, BrowserWindow, session, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow;
let server;

function createLocalServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // Decode URL-encoded paths (e.g., %20 -> space)
      let filePath = decodeURIComponent(req.url);
      if (filePath === '/') {
        filePath = '/index.html';
      }

      // Resolve path relative to __dirname
      const resolvedPath = path.resolve(__dirname, '.' + filePath);

      const extname = String(path.extname(filePath)).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ttf': 'font/ttf',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.csv': 'text/csv',
        '.mp3': 'audio/mpeg'
      };

      const contentType = mimeTypes[extname] || 'application/octet-stream';

      fs.readFile(resolvedPath, (error, content) => {
        if (error) {
          if (error.code === 'ENOENT') {
            console.log('File not found:', resolvedPath);
            res.writeHead(404);
            res.end('File not found: ' + req.url);
          } else {
            console.log('Server error:', error);
            res.writeHead(500);
            res.end('Server error: ' + error.code);
          }
        } else {
          // Determine if file is binary or text
          const isBinary = ['.png', '.jpg', '.jpeg', '.gif', '.mp3', '.ttf', '.woff', '.woff2'].includes(extname);
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, isBinary ? null : 'utf-8');
        }
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      console.log(`Local server running on http://127.0.0.1:${port}`);
      resolve({ server, port });
    });

    server.on('error', reject);
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 900,
    minWidth: 400,
    minHeight: 700,
    maxWidth: 600,
    maxHeight: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'special', 'logo.png'),
    title: 'OpenTile - Piano Tiles'
  });

  // Load from local server
  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  // Open DevTools in development (optional)
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create app directory for storing user data
function createAppDataDir() {
  const userDataPath = app.getPath('userData');
  const songsDir = path.join(userDataPath, 'songs');
  
  if (!fs.existsSync(songsDir)) {
    fs.mkdirSync(songsDir, { recursive: true });
  }
}

app.whenReady().then(async () => {
  createAppDataDir();
  
  // Set up session for Firebase
  const ses = session.defaultSession;
  
  // Allow Firebase domains
  ses.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https://*.firebaseio.com https://*.googleapis.com https://*.gstatic.com https://*.firebase.com https://*.cloudfunctions.net; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.firebase.com https://*.cloudfunctions.net wss://*.firebaseio.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseio.com https://*.googleapis.com https://*.gstatic.com https://*.firebase.com; style-src 'self' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com; img-src 'self' data: blob: https://*.firebaseio.com https://*.googleapis.com https://*.gstatic.com https://*.firebase.com; font-src 'self' data: https://*.firebaseio.com https://*.googleapis.com https://*.gstatic.com;"]
      }
    });
  });
  
  const { server: localServer, port } = await createLocalServer();
  server = localServer;
  createWindow(port);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(port);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (server) {
      server.close();
    }
    app.quit();
  }
});

app.on('before-quit', () => {
  if (server) {
    server.close();
  }
});

// Handle protocol for custom songs
app.setAsDefaultProtocolClient('opentile');

app.on('open-url', (event, url) => {
  event.preventDefault();
  // Handle custom song URLs if needed
  console.log('Opened URL:', url);
});

// Security: Prevent navigation to external URLs
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // Allow local server and file protocol
    if (parsedUrl.protocol !== 'http:' || parsedUrl.hostname !== '127.0.0.1') {
      event.preventDefault();
    }
  });

  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});
