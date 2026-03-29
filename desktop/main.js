const { app, BrowserWindow, Menu, globalShortcut } = require('electron');
const path = require('path');

let mainWindow;

// Server URL - change this to your backend server address
const SERVER_URL = 'http://localhost:3000';

// The Expo web URL - when running `npx expo start --web`
const EXPO_WEB_URL = 'http://localhost:8081';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0A0A0F',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'icon.png'),
    show: false,
  });

  // Load the Expo web app
  mainWindow.loadURL(EXPO_WEB_URL).catch(() => {
    // If Expo dev server isn't running, show a helpful message
    mainWindow.loadURL(`data:text/html;charset=utf-8,
      <html>
        <head>
          <style>
            body {
              background: #0A0A0F;
              color: white;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            h1 { color: #8B5CF6; font-size: 2em; }
            p { color: #A1A1AA; font-size: 1.1em; line-height: 1.8; }
            code {
              background: #1C1C2E;
              padding: 4px 12px;
              border-radius: 6px;
              color: #8B5CF6;
              font-size: 0.95em;
            }
          </style>
        </head>
        <body>
          <div>
            <h1>🎵 OwnSpotify</h1>
            <p>
              The Expo web server is not running.<br><br>
              Start it by running:<br>
              <code>cd app && npx expo start --web</code><br><br>
              Then restart this desktop app.
            </p>
          </div>
        </body>
      </html>
    `);
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Custom menu
  const menu = Menu.buildFromTemplate([
    {
      label: 'OwnSpotify',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' },
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ]
    },
    {
      label: 'Playback',
      submenu: [
        {
          label: 'Play/Pause',
          accelerator: 'Space',
          click: () => {
            mainWindow?.webContents.executeJavaScript(
              'document.dispatchEvent(new CustomEvent("toggle-playback"))'
            );
          }
        },
        {
          label: 'Next Track',
          accelerator: 'CommandOrControl+Right',
          click: () => {
            mainWindow?.webContents.executeJavaScript(
              'document.dispatchEvent(new CustomEvent("next-track"))'
            );
          }
        },
        {
          label: 'Previous Track',
          accelerator: 'CommandOrControl+Left',
          click: () => {
            mainWindow?.webContents.executeJavaScript(
              'document.dispatchEvent(new CustomEvent("previous-track"))'
            );
          }
        },
      ]
    },
  ]);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
