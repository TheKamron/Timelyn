const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('timelyn', {
  onConnectionStatus: (callback) => {
    ipcRenderer.on('connection-status', (_event, status) => callback(status));
  },
  onPairCode: (callback) => {
    ipcRenderer.on('pair-code', (_event, code) => callback(code));
  },
  onDeviceInfo: (callback) => {
    ipcRenderer.on('device-info', (_event, info) => callback(info));
  },
  onConnectionError: (callback) => {
    ipcRenderer.on('connection-error', (_event, error) => callback(error));
  },
  regeneratePairCode: () => {
    ipcRenderer.send('regenerate-pair-code');
  },
  getInitialData: () => {
    return ipcRenderer.sendSync('get-initial-data');
  },
  minimize: () => {
    ipcRenderer.send('minimize');
  },
  verifyPassword: (password) => {
    return ipcRenderer.invoke('verify-password', password);
  },
  setupPassword: (password) => {
    ipcRenderer.send('setup-password', password);
  },
  checkPasswordSetup: () => {
    return ipcRenderer.invoke('is-password-setup');
  },
  onPasswordSetupComplete: (callback) => {
    ipcRenderer.on('password-setup-complete', () => callback());
  },
  onShowPasswordOverlay: (callback) => {
    ipcRenderer.on('show-password-overlay', (_event, mode) => callback(mode));
  },
  confirmQuit: () => {
    ipcRenderer.send('confirm-quit');
  },
  unlocked: () => {
    ipcRenderer.send('unlocked');
  },
  onTimerUpdate: (callback) => {
    ipcRenderer.on('timer-update', (_event, data) => callback(data));
  },
  getTimerState: () => {
    return ipcRenderer.sendSync('get-timer-state');
  },

});
