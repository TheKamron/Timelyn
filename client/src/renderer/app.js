function showError(msg) {
  const el = document.getElementById('error-text');
  const section = document.getElementById('error-section');
  if (el && section) {
    el.textContent = msg;
    section.classList.remove('hidden');
  }
}

let isForcedOverlay = false;

function showOverlay(mode) {
  isForcedOverlay = (mode === 'unlock' || mode === 'setup');
  const overlay = document.getElementById('overlay');
  document.getElementById('overlay-setup').classList.toggle('hidden', mode !== 'setup');
  document.getElementById('overlay-lock').classList.toggle('hidden', mode !== 'unlock');
  document.getElementById('overlay-quit').classList.toggle('hidden', mode !== 'quit');
  overlay.classList.remove('hidden');

  if (mode === 'setup') {
    setTimeout(() => document.getElementById('setup-password')?.focus(), 100);
  } else if (mode === 'unlock') {
    setTimeout(() => document.getElementById('lock-password')?.focus(), 100);
  } else if (mode === 'quit') {
    setTimeout(() => document.getElementById('quit-password')?.focus(), 100);
  }
}

function hideOverlay() {
  document.getElementById('overlay').classList.add('hidden');
}

try {
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const pairCodeEl = document.getElementById('pair-code');
  const pairSection = document.getElementById('pair-section');
  const deviceNameEl = document.getElementById('device-name');
  const pairedStatusEl = document.getElementById('paired-status');
  const errorSection = document.getElementById('error-section');
  const errorText = document.getElementById('error-text');
  const regenerateBtn = document.getElementById('regenerate-btn');
  const closeBtn = document.getElementById('close-btn');
  const minimizeBtn = document.getElementById('minimize-btn');

  const api = window.timelyn;
  if (!api) {
    showError('Preload API not available \u2014 check console (F12)');
    throw new Error('timelyn API not exposed');
  }

  closeBtn.addEventListener('click', () => {
    window.close();
  });

  minimizeBtn.addEventListener('click', () => {
    api.minimize();
  });

  regenerateBtn.addEventListener('click', () => {
    api.regeneratePairCode();
  });

  api.onConnectionStatus((status) => {
    statusIndicator.className = '';
    switch (status) {
      case 'online':
        statusIndicator.classList.add('online');
        statusText.textContent = 'Connected';
        break;
      case 'offline':
        statusIndicator.classList.add('offline');
        statusText.textContent = 'Disconnected';
        break;
      case 'error':
        statusIndicator.classList.add('offline');
        statusText.textContent = 'Connection Error';
        break;
      default:
        statusIndicator.classList.add('connecting');
        statusText.textContent = 'Connecting...';
    }
  });

  api.onPairCode((code) => {
    pairCodeEl.textContent = code;
  });

  api.onDeviceInfo((info) => {
    deviceNameEl.textContent = info.deviceName;
    if (info.paired) {
      pairedStatusEl.textContent = '\u2705 Linked';
      pairSection.classList.add('hidden');
    } else {
      pairedStatusEl.textContent = '\uD83D\uDD17 Not linked \u2014 pair via Telegram';
      pairSection.classList.remove('hidden');
    }
  });

  api.onConnectionError((msg) => {
    errorText.textContent = msg;
    errorSection.classList.remove('hidden');
    setTimeout(() => errorSection.classList.add('hidden'), 5000);
  });

  api.onShowPasswordOverlay((mode) => {
    showOverlay(mode);
  });

  api.onPasswordSetupComplete(() => {
    hideOverlay();
    api.unlocked();
  });

  const timerSection = document.getElementById('timer-section');
  const timerDisplay = document.getElementById('timer-display');

  api.onTimerUpdate((data) => {
    const remaining = data.remaining;
    const totalSec = Math.ceil(remaining / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    timerSection.classList.remove('hidden');
    timerSection.classList.remove('warning', 'critical');

    if (remaining > 0) {
      if (totalSec <= 60) {
        timerSection.classList.add('critical');
      } else if (totalSec <= 300) {
        timerSection.classList.add('warning');
      }
      timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
      timerDisplay.textContent = '00:00';
      timerSection.classList.add('critical');
    }
  });

  const initialData = api.getInitialData();
  deviceNameEl.textContent = initialData.deviceName || 'Unknown Device';
  if (initialData.pairCode) {
    pairCodeEl.textContent = initialData.pairCode;
  }
  const serverUrlText = document.getElementById('server-url-text');
  if (serverUrlText && initialData.serverUrl) {
    serverUrlText.textContent = 'Server: ' + initialData.serverUrl;
  }

  // Show a hint if Windows password is already saved
  if (initialData.hasWindowsPassword) {
    const winpwdInput = document.getElementById('setup-winpwd');
    if (winpwdInput) {
      winpwdInput.placeholder = 'Windows password already saved (leave blank to keep)';
    }
  }

  if (initialData.locked) {
    showOverlay('unlock');
  } else if (!initialData.passwordSetup) {
    showOverlay('setup');
  }

  // ── Setup form ─────────────────────────────────────────────────────────────
  document.getElementById('setup-submit')?.addEventListener('click', () => {
    const pwd = document.getElementById('setup-password').value;
    const confirmPwd = document.getElementById('setup-confirm').value;
    const winPwd = document.getElementById('setup-winpwd')?.value?.trim();
    const err = document.getElementById('setup-error');

    if (pwd.length < 4) {
      err.textContent = 'Password must be at least 4 characters';
      err.classList.remove('hidden');
      return;
    }
    if (pwd !== confirmPwd) {
      err.textContent = 'Passwords do not match';
      err.classList.remove('hidden');
      return;
    }
    err.classList.add('hidden');
    document.getElementById('setup-submit').textContent = 'Saving...';

    // Save Windows password if provided
    if (winPwd && winPwd.length > 0) {
      api.saveWindowsPassword(winPwd);
    }

    api.setupPassword(pwd);
  });

  document.getElementById('setup-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('setup-submit')?.click();
  });
  document.getElementById('setup-confirm')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('setup-submit')?.click();
  });
  document.getElementById('setup-winpwd')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('setup-submit')?.click();
  });

  // ── Lock form ──────────────────────────────────────────────────────────────
  document.getElementById('lock-submit')?.addEventListener('click', async () => {
    const pwd = document.getElementById('lock-password').value;
    const err = document.getElementById('lock-error');
    const ok = await api.verifyPassword(pwd);
    if (ok) {
      err.classList.add('hidden');
      hideOverlay();
      api.unlocked();
    } else {
      err.classList.remove('hidden');
      document.getElementById('lock-password').value = '';
      document.getElementById('lock-password').focus();
    }
  });

  document.getElementById('lock-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('lock-submit')?.click();
  });

  // ── Quit form ──────────────────────────────────────────────────────────────
  document.getElementById('quit-submit')?.addEventListener('click', async () => {
    const pwd = document.getElementById('quit-password').value;
    const err = document.getElementById('quit-error');
    const ok = await api.verifyPassword(pwd);
    if (ok) {
      err.classList.add('hidden');
      document.getElementById('quit-submit').textContent = 'Quitting...';
      document.getElementById('quit-submit').disabled = true;
      api.confirmQuit();
    } else {
      err.classList.remove('hidden');
      document.getElementById('quit-password').value = '';
      document.getElementById('quit-password').focus();
    }
  });

  document.getElementById('quit-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('quit-submit')?.click();
  });

  document.getElementById('quit-cancel')?.addEventListener('click', () => {
    if (isForcedOverlay) return;
    hideOverlay();
  });

} catch (err) {
  showError(err.message);
}