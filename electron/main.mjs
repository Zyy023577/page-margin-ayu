import { app, BrowserWindow, dialog } from 'electron';
import { startServer } from '../server.mjs';

let mainWindow;
let runtime;
let quitting = false;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  app.whenReady().then(boot).catch(async error => {
    await dialog.showMessageBox({ type: 'error', title: '页边的阿屿启动失败', message: error?.message || String(error) });
    app.quit();
  });
}

async function boot() {
  process.env.NODE_ENV = 'production';
  runtime = await startServer({ production: true, port: 0, desktop: true });
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#ede6d8',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = undefined; });
  await mainWindow.loadURL(`http://127.0.0.1:${runtime.port}`);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', event => {
  if (quitting || !runtime?.server) return;
  event.preventDefault();
  quitting = true;
  runtime.server.close(() => app.quit());
});
