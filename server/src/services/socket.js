import Device from '../models/Device.js';
import {
  notifyDeviceOnline,
  notifyDeviceOffline,
  notifyDeviceUnexpectedOffline,
  notifyTimerEnded,
  notifyUnlockSuccess,
} from './telegram.js';

function generatePairCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PAIR-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function ensureUniquePairCode(suggestedCode) {
  if (suggestedCode && suggestedCode.startsWith('PAIR-')) {
    const existing = await Device.findOne({ pairCode: suggestedCode });
    if (!existing) return suggestedCode;
  }
  let code;
  do {
    code = generatePairCode();
  } while (await Device.findOne({ pairCode: code }));
  return code;
}

const pairAttempts = new Map();

function checkRateLimit(deviceId) {
  const now = Date.now();
  const windowMs = 60000;
  const maxAttempts = 5;
  const record = pairAttempts.get(deviceId) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
  } else {
    record.count++;
  }
  pairAttempts.set(deviceId, record);
  if (record.count > maxAttempts) {
    return false;
  }
  return true;
}

export function setupSocket(io) {
  io.use((socket, next) => {
    const { deviceId, deviceSecret, deviceName, pairCode } = socket.handshake.auth || {};
    if (!deviceId) {
      return next(new Error('deviceId is required'));
    }
    socket.deviceData = { deviceId, deviceSecret, deviceName: deviceName || 'Unknown', pairCode };
    next();
  });

  io.on('connection', async (socket) => {
    const { deviceId, deviceSecret, deviceName, pairCode } = socket.deviceData;

    try {
      let device = await Device.findOne({ deviceId });

      if (device) {
        if (device.deviceSecret && device.deviceSecret !== deviceSecret) {
          socket.emit('error', { message: 'Device secret mismatch — reinstall required' });
          socket.disconnect(true);
          return;
        }
        if (!device.deviceSecret && deviceSecret) {
          device.deviceSecret = deviceSecret;
        }
        device.status = 'online';
        device.socketId = socket.id;
        device.deviceName = deviceName;
        device.gracefulDisconnect = false;
        device.lastSeen = new Date();
        await device.save();

        if (device.paired && device.ownerId) {
          await notifyDeviceOnline(device.ownerId, device.deviceName, device.deviceId);
        }
      } else {
        const finalPairCode = await ensureUniquePairCode(pairCode);
        device = await Device.create({
          deviceId,
          deviceSecret,
          deviceName,
          pairCode: finalPairCode,
          status: 'online',
          socketId: socket.id,
          lastSeen: new Date(),
        });
      }

      if (device.timerMinutes > 0 && device.timerStartedAt) {
        const elapsed = (Date.now() - new Date(device.timerStartedAt).getTime()) / 60000;
        const remaining = Math.max(0, device.timerMinutes - elapsed);
        if (remaining > 0) {
          socket.emit('set-timer', {
            minutes: remaining,
            startedAt: device.timerStartedAt,
          });
        } else {
          device.timerMinutes = 0;
          device.timerStartedAt = null;
          await device.save();
        }
      }

      socket.emit('registered', {
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        pairCode: device.pairCode,
        paired: device.paired,
        status: device.status,
        timerMinutes: device.timerMinutes || 0,
        timerStartedAt: device.timerStartedAt,
      });
    } catch (error) {
      console.error('Socket registration error:', error.message);
      socket.emit('error', { message: 'Registration failed' });
    }

    socket.on('regenerate-pair-code', async () => {
      try {
        if (!checkRateLimit(deviceId)) {
          return socket.emit('error', { message: 'Too many requests — try again later' });
        }
        const dev = await Device.findOne({ deviceId });
        if (!dev || dev.paired) {
          return socket.emit('error', { message: 'Cannot regenerate code for paired device' });
        }
        const newCode = await ensureUniquePairCode();
        dev.pairCode = newCode;
        await dev.save();
        socket.emit('pair-code-updated', { pairCode: newCode });
      } catch (error) {
        console.error('Regenerate pair code error:', error.message);
        socket.emit('error', { message: 'Failed to regenerate pair code' });
      }
    });

    socket.on('set-timer', async ({ minutes }) => {
      try {
        const dev = await Device.findOne({ deviceId });
        if (!dev) return;
        dev.timerMinutes = minutes;
        dev.timerStartedAt = new Date();
        await dev.save();
        socket.emit('set-timer', { minutes, startedAt: dev.timerStartedAt });
      } catch (error) {
        console.error('Set timer error:', error.message);
      }
    });

    socket.on('timer-ended', async () => {
      try {
        const dev = await Device.findOne({ deviceId });
        if (dev) {
          dev.timerMinutes = 0;
          dev.timerStartedAt = null;
          await dev.save();
          if (dev.paired && dev.ownerId) {
            await notifyTimerEnded(dev.ownerId, dev.deviceName, dev.deviceId);
          }
        }
      } catch (error) {
        console.error('Timer ended error:', error.message);
      }
    });

    // ── Unlock acknowledged: client confirmed it ran the unlock script ────────
    socket.on('unlock-acknowledged', async () => {
      try {
        const dev = await Device.findOne({ deviceId });
        if (dev && dev.paired && dev.ownerId) {
          await notifyUnlockSuccess(dev.ownerId, dev.deviceName);
        }
      } catch (error) {
        console.error('Unlock acknowledged error:', error.message);
      }
    });
    // ─────────────────────────────────────────────────────────────────────────

    socket.on('going-offline', async () => {
      try {
        await Device.findOneAndUpdate({ socketId: socket.id }, { gracefulDisconnect: true });
      } catch (error) {
        console.error('Going-offline error:', error.message);
      }
    });

    socket.on('disconnect', async () => {
      try {
        const dev = await Device.findOne({ socketId: socket.id });
        if (dev) {
          const wasGraceful = dev.gracefulDisconnect;
          dev.status = 'offline';
          dev.socketId = null;
          dev.gracefulDisconnect = false;
          dev.lastSeen = new Date();
          await dev.save();

          if (dev.paired && dev.ownerId) {
            if (wasGraceful) {
              await notifyDeviceOffline(dev.ownerId, dev.deviceName, dev.deviceId);
            } else {
              await notifyDeviceUnexpectedOffline(dev.ownerId, dev.deviceName, dev.deviceId);
            }
          }
        }
      } catch (error) {
        console.error('Socket disconnect error:', error.message);
      }
    });
  });
}