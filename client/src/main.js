import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage } from 'electron';
import { io } from 'socket.io-client';
import os from 'os';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.on('uncaughtException', (err) => {
  try { fs.appendFileSync(path.join(app.getPath('userData'), 'crash.log'), `[${new Date().toISOString()}] UNCAUGHT: ${err.stack}\n`); } catch {}
});
process.on('unhandledRejection', (reason) => {
  try { fs.appendFileSync(path.join(app.getPath('userData'), 'crash.log'), `[${new Date().toISOString()}] UNHANDLED: ${reason}\n`); } catch {}
});
let mainWindow;
let socket;
let deviceId;
let deviceSecret;
let currentPairCode = generatePairCode();
let isQuitting = false;
let wasForceKilled = false;
let isLocked = false;
let isSetupMode = false;
let watchdogTaskNames = [];
let heartbeatTimer;
let timerInterval;

const HOTKEY = 'CmdOrCtrl+Shift+T';

function getStoredDeviceConfig() {
  const configPath = path.join(app.getPath('userData'), 'device.json');
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return null;
  }
}

function saveDeviceConfig(config) {
  const configPath = path.join(app.getPath('userData'), 'device.json');
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config));
}

function getOrCreateDeviceId() {
  const config = getStoredDeviceConfig();
  if (config?.deviceId) {
    if (!config.deviceSecret) {
      deviceSecret = crypto.randomBytes(32).toString('hex');
      saveDeviceConfig({ deviceId: config.deviceId, deviceSecret });
    } else {
      deviceSecret = config.deviceSecret;
    }
    return config.deviceId;
  }
  const id = `device-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  deviceSecret = crypto.randomBytes(32).toString('hex');
  saveDeviceConfig({ deviceId: id, deviceSecret });
  return id;
}

function generatePairCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PAIR-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getPasswordFile() {
  return path.join(app.getPath('userData'), 'password.json');
}

function loadPasswordConfig() {
  try { return JSON.parse(fs.readFileSync(getPasswordFile(), 'utf8')); }
  catch { return null; }
}

function savePasswordConfig(config) {
  const f = getPasswordFile();
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(config));
}

function hashPwd(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function isPasswordSetup() {
  return !!loadPasswordConfig();
}

function setupPassword(password) {
  if (!password || password.length < 4) return;
  const salt = crypto.randomBytes(16).toString('hex');
  savePasswordConfig({ salt, hash: hashPwd(password, salt) });
}

function verifyPassword(password) {
  const c = loadPasswordConfig();
  return c && hashPwd(password, c.salt) === c.hash;
}

function getFlagFile() {
  return path.join(app.getPath('userData'), 'running.flag');
}

function setRunningFlag() {
  const f = getFlagFile();
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, Date.now().toString());
}

function clearRunningFlag() {
  try { fs.unlinkSync(getFlagFile()); } catch {}
}

function checkForceKill() {
  return fs.existsSync(getFlagFile());
}

function log(...args) {
  try {
    const p = path.join(app.getPath('userData'), 'watchdog.log');
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.appendFileSync(p, `[${new Date().toISOString()}] ${args.join(' ')}\n`);
  } catch {}
}

function startWatchdogs() {
  if (process.platform !== 'win32') return;

  const userData = app.getPath('userData');
  fs.mkdirSync(userData, { recursive: true });
  const mainPid = String(process.pid);
  const runId = Date.now();

  log('startWatchdogs: PID=' + mainPid + ' userData=' + userData);

  const hbFile = path.join(userData, 'app.heartbeat');
  const writeHb = () => {
    try { fs.writeFileSync(hbFile, Date.now().toString()); } catch {}
  };
  writeHb();
  heartbeatTimer = setInterval(writeHb, 1000);
  log('  heartbeat started: ' + hbFile);

  const exitFlag = path.join(userData, 'exit.flag');

  const psScriptPath = path.join(userData, 'wd.ps1');
  const psScript = `$hb = "${hbFile}"
$ef = "${exitFlag}"
while($true) {
  if (Test-Path $ef) { break }
  if (-not (Test-Path $hb) -or ((Get-Date) - (Get-Item $hb).LastWriteTime).TotalSeconds -gt 2) {
    break
  }
  Start-Sleep -Milliseconds 500
}`;
  try {
    fs.writeFileSync(psScriptPath, psScript, 'utf8');
    log('  wrote ' + psScriptPath);
  } catch (e) { log('  FAIL write ps script: ' + e.message); return; }

  const psTaskName = `TimelynWdPS_${runId}`;
  log('  creating task ' + psTaskName);
  try {
    const out = execSync(
      `schtasks /create /sc ONCE /tn "${psTaskName}" /tr "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File ${psScriptPath}" /st 00:00 /f`,
      { encoding: 'utf8', timeout: 5000 }
    );
    log('  create OK: ' + out.trim());
  } catch (e) { log('  FAIL create: ' + (e.stderr || e.message)); return; }

  log('  running task ' + psTaskName);
  try {
    const out = execSync(`schtasks /run /tn "${psTaskName}"`, { encoding: 'utf8', timeout: 5000 });
    log('  run OK: ' + out.trim());
    watchdogTaskNames.push(psTaskName);
  } catch (e) { log('  FAIL run: ' + (e.stderr || e.message)); }

  const vbScriptPath = path.join(userData, 'wd.vbs');
  const vbScript = `On Error Resume Next
Dim fso, hbPath, efPath, hb
hbPath = "${hbFile}"
efPath = "${exitFlag}"
Set fso = CreateObject("Scripting.FileSystemObject")
Do While True
  If fso.FileExists(efPath) Then WScript.Quit
  If Not fso.FileExists(hbPath) Then
    WScript.Quit
  End If
  Set hb = fso.GetFile(hbPath)
  If DateDiff("s", hb.DateLastModified, Now) > 2 Then
    WScript.Quit
  End If
  WScript.Sleep 500
Loop`;
  try {
    fs.writeFileSync(vbScriptPath, vbScript, 'utf8');
    log('  wrote ' + vbScriptPath);
  } catch (e) { log('  FAIL write vb script: ' + e.message); return; }

  const vbTaskName = `TimelynWdVB_${runId}`;
  log('  creating task ' + vbTaskName);
  try {
    const out = execSync(
      `schtasks /create /sc ONCE /tn "${vbTaskName}" /tr "wscript.exe //nologo ${vbScriptPath}" /st 00:00 /f`,
      { encoding: 'utf8', timeout: 5000 }
    );
    log('  create OK: ' + out.trim());
  } catch (e) { log('  FAIL create: ' + (e.stderr || e.message)); return; }

  log('  running task ' + vbTaskName);
  try {
    const out = execSync(`schtasks /run /tn "${vbTaskName}"`, { encoding: 'utf8', timeout: 5000 });
    log('  run OK: ' + out.trim());
    watchdogTaskNames.push(vbTaskName);
  } catch (e) { log('  FAIL run: ' + (e.stderr || e.message)); }
}

function stopWatchdogs() {
  for (const t of watchdogTaskNames) {
    try {
      execSync(`schtasks /delete /tn "${t}" /f`, { stdio: 'ignore', timeout: 5000 });
    } catch {}
  }
  watchdogTaskNames = [];
}

function lockWorkstation() {
  const lockScript = path.join(app.getPath('userData'), 'lock.ps1');
  const code = `Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32Lock {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool LockWorkStation();
}
"@; [Win32Lock]::LockWorkStation()`;
  try {
    fs.writeFileSync(lockScript, code, 'utf8');
    execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File ${lockScript}`, { timeout: 15000 });
  } catch (e) {
    log('lockWorkstation failed: ' + (e.stderr || e.message).trim().slice(0, 300));
  }
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function getServerUrl() {
  if (process.env.SERVER_URL) return process.env.SERVER_URL;
  try {
    const configPath = path.join(path.dirname(app.getPath('exe')), 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.serverUrl) return config.serverUrl;
  } catch {}
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.serverUrl) return config.serverUrl;
  } catch {}
  return 'https://osontap.uz';
}

let tray;

function createTray() {
  try {
    const icon = nativeImage.createEmpty();
    tray = new Tray(icon);
    tray.setToolTip('Timelyn');
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show',
        click: () => { mainWindow?.show(); mainWindow?.focus(); }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true;
          if (socket?.connected) socket.emit('going-offline');
          clearInterval(timerInterval);
          clearInterval(heartbeatTimer);
          stopWatchdogs();
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
  } catch (e) {
    log('createTray FAIL: ' + (e.message || e).slice(0, 100));
  }
}

function connectSocket() {
  const serverUrl = getServerUrl();
  deviceId = getOrCreateDeviceId();
  const deviceName = os.hostname();

  socket = io(serverUrl, {
    auth: { deviceId, deviceSecret, deviceName, pairCode: currentPairCode },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    mainWindow?.webContents.send('connection-status', 'online');
  });

  socket.on('disconnect', () => {
    mainWindow?.webContents.send('connection-status', 'offline');
    clearInterval(timerInterval);
    timerInterval = null;
  });

  socket.on('connect_error', (error) => {
    mainWindow?.webContents.send('connection-status', 'error');
    mainWindow?.webContents.send('connection-error', error.message);
  });

  socket.on('registered', (data) => {
    currentPairCode = data.pairCode;
    mainWindow?.webContents.send('pair-code', data.pairCode);
    mainWindow?.webContents.send('device-info', data);
  });

  socket.on('pair-code-updated', (data) => {
    currentPairCode = data.pairCode;
    mainWindow?.webContents.send('pair-code', data.pairCode);
  });

  socket.on('error', (data) => {
    mainWindow?.webContents.send('connection-error', data.message);
  });

  socket.on('set-timer', (data) => {
    clearInterval(timerInterval);
    const minutes = data.minutes;
    const startedAt = data.startedAt ? new Date(data.startedAt).getTime() : Date.now();
    const endTime = startedAt + minutes * 60 * 1000;

    timerInterval = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      mainWindow?.webContents.send('timer-update', {
        remaining,
        totalMinutes: Math.ceil(minutes),
      });

      if (remaining <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        lockWorkstation();
        socket?.emit('timer-ended');
      }
    }, 1000);
  });


}

ipcMain.on('regenerate-pair-code', () => {
  if (!socket?.connected) {
    mainWindow?.webContents.send('connection-error', 'Cannot regenerate — not connected to server');
    return;
  }
  socket.emit('regenerate-pair-code');
});

ipcMain.on('get-initial-data', (event) => {
  event.returnValue = {
    deviceId: getOrCreateDeviceId(),
    deviceName: os.hostname(),
    pairCode: currentPairCode,
    serverUrl: getServerUrl(),
    locked: isLocked,
    passwordSetup: isPasswordSetup(),
  };
});

ipcMain.on('minimize', () => {
  mainWindow?.hide();
});

ipcMain.handle('verify-password', (_event, password) => {
  return verifyPassword(password);
});

ipcMain.on('setup-password', (_event, password) => {
  setupPassword(password);
  isSetupMode = false;
  mainWindow?.webContents.send('password-setup-complete');
});

ipcMain.handle('is-password-setup', () => {
  return isPasswordSetup();
});

ipcMain.on('unlocked', () => {
  isLocked = false;
});

ipcMain.on('get-timer-state', (event) => {
  event.returnValue = { active: !!timerInterval };
});

ipcMain.on('confirm-quit', () => {
  isQuitting = true;
  if (socket?.connected) {
    socket.emit('going-offline');
  }
  clearInterval(timerInterval);
  try { fs.writeFileSync(path.join(app.getPath('userData'), 'exit.flag'), '1'); } catch {}
  clearInterval(heartbeatTimer);
  setTimeout(() => {
    stopWatchdogs();
    app.quit();
  }, 1500);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 460,
    resizable: true,
    minWidth: 380,
    minHeight: 360,
    frame: false,
    skipTaskbar: true,
    title: 'Timelyn',
    backgroundColor: '#0d0d0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    if (isLocked) {
      mainWindow?.webContents.send('show-password-overlay', 'unlock');
    } else if (isSetupMode) {
      mainWindow?.webContents.send('show-password-overlay', 'setup');
    } else {
      mainWindow?.webContents.send('show-password-overlay', 'quit');
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (currentPairCode) {
      mainWindow.webContents.send('pair-code', currentPairCode);
    }
  });
}

app.whenReady().then(() => {
  wasForceKilled = checkForceKill();
  isSetupMode = !isPasswordSetup();
  isLocked = wasForceKilled && !isSetupMode;
  setRunningFlag();
  app.setLoginItemSettings({ openAtLogin: true });
  startWatchdogs();
  createWindow();
  createTray();
  connectSocket();

  globalShortcut.register(HOTKEY, toggleWindow);

  if (isLocked) {
    lockWorkstation();
  }
});

app.on('before-quit', () => {
  clearRunningFlag();
  clearInterval(timerInterval);
  clearInterval(heartbeatTimer);
  try { fs.writeFileSync(path.join(app.getPath('userData'), 'exit.flag'), '1'); } catch {}
  try { fs.unlinkSync(path.join(app.getPath('userData'), 'app.heartbeat')); } catch {}
  stopWatchdogs();
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (socket) {
    socket.removeAllListeners();
    socket.close();
  }
  app.quit();
});
