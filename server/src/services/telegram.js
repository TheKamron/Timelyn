import TelegramBot from 'node-telegram-bot-api';
import Device from '../models/Device.js';
import { msg as t, getKeyboard, getTimerKeyboard, setLang, getLang } from './i18n.js';

let bot;
let telegramIo;
const userState = new Map();

async function handleMyDevices(chatId) {
  const devices = await Device.find({ ownerId: String(chatId) });

  if (devices.length === 0) {
    return bot.sendMessage(chatId, t(chatId, 'no_devices'), getKeyboard(chatId));
  }

  const message = devices.map(d => {
    const status = d.status === 'online' ? t(chatId, 'online') : t(chatId, 'offline');
    const lastSeen = d.lastSeen
      ? new Date(d.lastSeen).toLocaleString()
      : t(chatId, 'never');
    return `\uD83D\uDCF1 ${d.deviceName || t(chatId, 'unnamed')}\n${status}\n${t(chatId, 'last_seen')}: ${lastSeen}`;
  }).join('\n\n');

  bot.sendMessage(chatId, `${t(chatId, 'your_devices')}\n\n${message}`, {
    parse_mode: 'Markdown',
    ...getKeyboard(chatId),
  });
}

async function handlePairCode(chatId, userId, pairCode) {
  try {
    const device = await Device.findOne({ pairCode });

    if (!device) {
      return bot.sendMessage(chatId, t(chatId, 'invalid_pair'), getKeyboard(chatId));
    }

    if (device.paired) {
      return bot.sendMessage(chatId, t(chatId, 'already_paired'), getKeyboard(chatId));
    }

    device.ownerId = String(chatId);
    device.paired = true;
    await device.save();

    bot.sendMessage(chatId, t(chatId, 'linked'), getKeyboard(chatId));
  } catch (error) {
    console.error('Pairing error:', error.message);
    bot.sendMessage(chatId, t(chatId, 'pair_error'), getKeyboard(chatId));
  }
}

async function handleStatus(chatId) {
  const totalDevices = await Device.countDocuments();
  const onlineDevices = await Device.countDocuments({ status: 'online' });
  const myDevices = await Device.countDocuments({ ownerId: String(chatId) });
  const myOnlineDevices = await Device.countDocuments({
    ownerId: String(chatId),
    status: 'online',
  });

  const message =
    `${t(chatId, 'status_title')}\n\n` +
    `${t(chatId, 'bot_running')}\n` +
    `${t(chatId, 'total_devices')}: ${totalDevices}\n` +
    `${t(chatId, 'online')}: ${onlineDevices}\n` +
    `${t(chatId, 'offline')}: ${totalDevices - onlineDevices}\n\n` +
    `${t(chatId, 'your_devices_stat')}: ${myDevices}\n` +
    `${t(chatId, 'online')}: ${myOnlineDevices}\n` +
    `${t(chatId, 'offline')}: ${myDevices - myOnlineDevices}`;

  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    ...getKeyboard(chatId),
  });
}

// ── Unlock: asks parent to type Windows password ──────────────────────────────

async function handleUnlock(chatId) {
  const devices = await Device.find({ ownerId: String(chatId), paired: true, status: 'online' });

  if (devices.length === 0) {
    return bot.sendMessage(chatId, t(chatId, 'no_online_devices'), getKeyboard(chatId));
  }

  if (devices.length === 1) {
    // Only one device — go straight to password prompt
    userState.set(chatId, {
      expecting: 'unlock_password',
      deviceId: devices[0].deviceId,
    });
    return bot.sendMessage(chatId, t(chatId, 'enter_unlock_password'), {
      reply_markup: {
        inline_keyboard: [[{ text: t(chatId, 'back_btn'), callback_data: 'menu' }]],
      },
    });
  }

  // Multiple devices — show picker first
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        ...devices.map(d => [{
          text: `\uD83D\uDCBB ${d.deviceName || t(chatId, 'unnamed')}`,
          callback_data: `unlock_device_${d.deviceId}`,
        }]),
        [{ text: t(chatId, 'back_btn'), callback_data: 'menu' }],
      ],
    },
  };
  bot.sendMessage(chatId, t(chatId, 'select_device_unlock'), keyboard);
}

// ─────────────────────────────────────────────────────────────────────────────

export function setupTelegram(io) {
  telegramIo = io;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN not set — bot disabled');
    return null;
  }

  bot = new TelegramBot(token, { polling: true });

  bot.setMyCommands([
    { command: 'start', description: 'Open main menu' },
    { command: 'menu', description: 'Open main menu' },
  ]);

  async function handleShowMenu(chatId) {
    bot.sendMessage(chatId, t(chatId, 'start'), getKeyboard(chatId));
  }

  bot.onText(/\/start|\/menu/, (msg) => {
    handleShowMenu(msg.chat.id);
  });

  async function handleTimerPresets(chatId) {
    const devices = await Device.find({ ownerId: String(chatId), paired: true, status: 'online' });
    if (devices.length === 0) {
      return bot.sendMessage(chatId, t(chatId, 'no_online_devices'), getKeyboard(chatId));
    }
    bot.sendMessage(chatId, t(chatId, 'timer_presets'), getTimerKeyboard(chatId));
  }

  async function applyTimer(chatId, minutes, deviceId) {
    const query = { ownerId: String(chatId), paired: true, status: 'online' };
    if (deviceId) query.deviceId = deviceId;
    const dev = await Device.findOne(query);
    if (!dev) {
      return bot.sendMessage(chatId, t(chatId, 'device_offline'), getKeyboard(chatId));
    }
    const sock = telegramIo && dev.socketId ? telegramIo.sockets.sockets.get(dev.socketId) : null;
    if (!sock) {
      return bot.sendMessage(chatId, t(chatId, 'socket_not_found'), getKeyboard(chatId));
    }
    sock.emit('set-timer', { minutes, startedAt: new Date() });
    dev.timerMinutes = minutes;
    dev.timerStartedAt = new Date();
    await dev.save();
    bot.sendMessage(
      chatId,
      t(chatId, 'timer_set', { name: dev.deviceName || t(chatId, 'unnamed'), minutes: String(minutes) }),
      { parse_mode: 'Markdown', ...getKeyboard(chatId) }
    );
  }

  async function handleTimerPreset(chatId, minutes) {
    const devices = await Device.find({ ownerId: String(chatId), paired: true, status: 'online' });
    if (devices.length === 0) {
      return bot.sendMessage(chatId, t(chatId, 'no_online_devices'), getKeyboard(chatId));
    }
    if (devices.length === 1) {
      return await applyTimer(chatId, minutes, devices[0].deviceId);
    }
    const keyboard = {
      reply_markup: {
        inline_keyboard: devices.map(d => [{
          text: d.deviceName || t(chatId, 'unnamed'),
          callback_data: `timer_set_${d.deviceId}_${minutes}`,
        }]),
      },
    };
    bot.sendMessage(chatId, t(chatId, 'select_device'), keyboard);
  }

  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    await bot.answerCallbackQuery(query.id);

    if (data.startsWith('lang_')) {
      const langCode = data.slice(5);
      const langNames = { en: 'English', ru: 'Русский', uz: "O'zbek" };
      setLang(chatId, langCode);
      bot.editMessageText(t(chatId, 'language_set', { lang: langNames[langCode] || langCode }), {
        chat_id: chatId,
        message_id: query.message.message_id,
        ...getKeyboard(chatId),
      });
      return;
    }

    if (data.startsWith('timer_set_')) {
      const parts = data.split('_');
      const deviceId = parts[2];
      const minutes = parseInt(parts[3], 10);
      const dev = await Device.findOne({ deviceId, ownerId: String(chatId) });
      if (!dev) {
        return bot.sendMessage(chatId, t(chatId, 'device_not_found'), getKeyboard(chatId));
      }
      const sock = telegramIo ? telegramIo.sockets.sockets.get(dev.socketId) : null;
      if (sock) {
        sock.emit('set-timer', { minutes, startedAt: new Date() });
        dev.timerMinutes = minutes;
        dev.timerStartedAt = new Date();
        await dev.save();
        bot.sendMessage(
          chatId,
          t(chatId, 'timer_set', { name: dev.deviceName || t(chatId, 'unnamed'), minutes: String(minutes) }),
          { parse_mode: 'Markdown', ...getKeyboard(chatId) }
        );
      } else {
        bot.sendMessage(chatId, t(chatId, 'device_offline'), getKeyboard(chatId));
      }
      return;
    }

    if (data.startsWith('timer_preset_')) {
      const minutes = parseInt(data.replace('timer_preset_', ''), 10);
      return await handleTimerPreset(chatId, minutes);
    }

    // ── Unlock: device picker callback (multi-device case) ────────────────────
    if (data.startsWith('unlock_device_')) {
      const deviceId = data.replace('unlock_device_', '');
      const dev = await Device.findOne({ deviceId, ownerId: String(chatId) });
      if (!dev) {
        return bot.sendMessage(chatId, t(chatId, 'device_not_found'), getKeyboard(chatId));
      }
      // Device chosen — now ask for password
      userState.set(chatId, { expecting: 'unlock_password', deviceId });
      return bot.sendMessage(chatId, t(chatId, 'enter_unlock_password'), {
        reply_markup: {
          inline_keyboard: [[{ text: t(chatId, 'back_btn'), callback_data: 'menu' }]],
        },
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    switch (data) {
      case 'menu':
        await handleShowMenu(chatId);
        break;
      case 'my_devices':
        await handleMyDevices(chatId);
        break;
      case 'connect_device':
        await bot.sendMessage(chatId, t(chatId, 'send_pair_code'));
        break;
      case 'status':
        await handleStatus(chatId);
        break;
      case 'set_timer':
        await handleTimerPresets(chatId);
        break;
      case 'unlock':
        await handleUnlock(chatId);
        break;
      case 'timer_custom':
        userState.set(chatId, { expecting: 'timer_minutes' });
        bot.sendMessage(chatId, t(chatId, 'enter_minutes'), {
          reply_markup: { inline_keyboard: [[{ text: t(chatId, 'back_btn'), callback_data: 'set_timer' }]] },
        });
        break;
      case 'language': {
        const keyboard = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '\uD83C\uDDEC\uD83C\uDDE7 English', callback_data: 'lang_en' },
              ],
              [
                { text: '\uD83C\uDDF7\uD83C\uDDFA Русский', callback_data: 'lang_ru' },
                { text: '\uD83C\uDDFA\uD83C\uDDFF O\'zbek', callback_data: 'lang_uz' },
              ],
              [
                { text: t(chatId, 'back_btn'), callback_data: 'menu' },
              ],
            ],
          },
        };
        bot.sendMessage(chatId, t(chatId, 'language_prompt'), keyboard);
        break;
      }
    }
  });

  bot.on('message', async (msg) => {
    if (!msg.text) return;
    if (msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const state = userState.get(chatId);

    // ── Handle timer custom minutes input ─────────────────────────────────────
    if (state && state.expecting === 'timer_minutes') {
      userState.delete(chatId);
      const minutes = parseInt(msg.text, 10);
      if (!minutes || minutes < 1) {
        return bot.sendMessage(chatId, t(chatId, 'enter_minutes'), getKeyboard(chatId));
      }
      return await handleTimerPreset(chatId, minutes);
    }

    // ── Handle Windows password input for unlock ──────────────────────────────
    if (state && state.expecting === 'unlock_password') {
      userState.delete(chatId);
      const password = msg.text.trim();

      // Delete the message immediately so password is not visible in chat history
      try { await bot.deleteMessage(chatId, msg.message_id); } catch {}

      // Re-check device is still online at the moment of sending
      const dev = await Device.findOne({ deviceId: state.deviceId, ownerId: String(chatId) });
      if (!dev || dev.status !== 'online') {
        return bot.sendMessage(
          chatId,
          t(chatId, 'device_offline'),
          getKeyboard(chatId)
        );
      }

      const sock = telegramIo?.sockets.sockets.get(dev.socketId);
      if (!sock) {
        return bot.sendMessage(
          chatId,
          t(chatId, 'unlock_socket_error', { name: dev.deviceName || t(chatId, 'unnamed') }),
          { parse_mode: 'Markdown', ...getKeyboard(chatId) }
        );
      }

      // Send password directly to the client app via socket
      sock.emit('unlock-workstation', { password });

      return bot.sendMessage(
        chatId,
        t(chatId, 'unlock_sent', { name: dev.deviceName || t(chatId, 'unnamed') }),
        { parse_mode: 'Markdown', ...getKeyboard(chatId) }
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (/^PAIR-[A-Z0-9]{4,8}$/i.test(msg.text.trim())) {
      await handlePairCode(chatId, msg.from.id, msg.text.toUpperCase());
    }
  });

  console.log('Telegram bot started');
  return bot;
}

export async function notifyDeviceOnline(ownerId, deviceName, deviceId) {
  if (!bot) return;
  try {
    await bot.sendMessage(
      ownerId,
      t(ownerId, 'notify_online', { name: deviceName, id: deviceId }),
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Notify online error:', error.message);
  }
}

export async function notifyDeviceOffline(ownerId, deviceName, deviceId) {
  if (!bot) return;
  try {
    await bot.sendMessage(
      ownerId,
      t(ownerId, 'notify_offline', { name: deviceName, id: deviceId }),
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Notify offline error:', error.message);
  }
}

export async function notifyTimerSet(ownerId, deviceName, minutes) {
  if (!bot) return;
  try {
    await bot.sendMessage(
      ownerId,
      t(ownerId, 'timer_started', { name: deviceName, minutes: String(minutes) }),
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Notify timer set error:', error.message);
  }
}

export async function notifyTimerEnded(ownerId, deviceName, deviceId) {
  if (!bot) return;
  try {
    await bot.sendMessage(
      ownerId,
      t(ownerId, 'timer_ended', { name: deviceName, id: deviceId }),
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Notify timer ended error:', error.message);
  }
}

export async function notifyDeviceUnexpectedOffline(ownerId, deviceName, deviceId) {
  if (!bot) return;
  try {
    const time = new Date().toLocaleString();
    await bot.sendMessage(
      ownerId,
      t(ownerId, 'notify_unexpected', { name: deviceName, id: deviceId, time }),
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Notify unexpected offline error:', error.message);
  }
}

export async function notifyUnlockSuccess(ownerId, deviceName) {
  if (!bot) return;
  try {
    await bot.sendMessage(
      ownerId,
      t(ownerId, 'unlock_success', { name: deviceName }),
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Notify unlock success error:', error.message);
  }
}