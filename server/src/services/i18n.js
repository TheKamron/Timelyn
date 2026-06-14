const userLang = new Map();

export function setLang(chatId, lang) {
  userLang.set(String(chatId), lang);
}

export function getLang(chatId) {
  return userLang.get(String(chatId)) || 'en';
}

const t = {
  en: {
    start: 'Welcome to Timelyn! Choose an option:',
    my_devices_btn: '\uD83D\uDCF1 My Devices',
    connect_btn: '\uD83D\uDD17 Connect Device',
    status_btn: '\uD83D\uDCCA Status',
    unlock_btn: '\uD83D\uDD13 Unlock Device',
    no_devices: 'You have no paired devices. Use \uD83D\uDD17 Connect Device to pair one.',
    your_devices: '*Your Devices:*',
    online: '\uD83D\uDFE2 Online',
    offline: '\uD83D\uDD34 Offline',
    never: 'Never',
    unnamed: 'Unnamed',
    last_seen: 'Last seen',
    invalid_pair: '\u274C Invalid pair code. Please check and try again.',
    already_paired: '\u274C This device is already paired.',
    linked: '\u2705 Device linked successfully! You will now receive connection notifications.',
    pair_error: '\u274C An error occurred during pairing. Please try again.',
    status_title: '\uD83D\uDCCA *Timelyn Status*',
    bot_running: '\uD83E\uDD16 Bot: \u2705 Running',
    total_devices: '\uD83D\uDCE1 Total devices',
    your_devices_stat: '*Your devices:*',
    no_online_devices: 'No online paired devices. Make sure a device is connected.',
    timer_set: '\u23F1\uFE0F Timer set for *{{name}}*: {{minutes}} minutes.',
    socket_not_found: '\u274C Device is online but socket not found. Try again.',
    select_device: 'Select a device:',
    select_device_unlock: 'Select a device to unlock:',
    device_not_found: '\u274C Device not found.',
    device_offline: '\u274C Device is offline or socket not found.',
    send_pair_code: 'Please send me your pair code (e.g., PAIR-X7KQ9M2B):',
    notify_online: '\uD83D\uDFE2 *Device Online*\n\n\uD83D\uDCF1 {{name}}\n\uD83D\uDD11 `{{id}}`',
    notify_offline: '\uD83D\uDD34 *Device Offline*\n\n\uD83D\uDCF1 {{name}}\n\uD83D\uDD11 `{{id}}`',
    notify_unexpected: '\u26A0\uFE0F *Device Disconnected Unexpectedly*\n\n\uD83D\uDCF1 {{name}}\n\uD83D\uDD11 `{{id}}`\n\uD83D\uDD50 {{time}}\n\nThe app may have been closed using Task Manager. The device will be locked on next startup.',
    timer_started: '\u23F1\uFE0F *Timer Started*\n\n\uD83D\uDCF1 {{name}}\n\u23F0 {{minutes}} minutes',
    timer_ended: '\uD83D\uDD12 *Timer Ended*\n\n\uD83D\uDCF1 {{name}}\n\uD83D\uDD11 `{{id}}`\n\nDevice has been locked.',
    enter_unlock_password: '\uD83D\uDD11 Type the Windows login password for this device:\n\n\u26A0\uFE0F Your message will be deleted immediately for security.',
    unlock_sent: '\uD83D\uDD13 Unlock command sent to *{{name}}*! Typing password on lock screen...',
    unlock_success: '\u2705 *{{name}}* has been successfully unlocked.',
    unlock_socket_error: '\u274C Could not reach *{{name}}*. The device may be offline.',
    language_prompt: 'Select your language:',
    language_set: '\u2705 Language set to {{lang}}.',
    timer_btn: '\u23F1\uFE0F Set Timer',
    language_btn: '\uD83C\uDF10 Language',
    menu_btn: '\uD83C\uDFE0 Menu',
    back_btn: '\u25C0\uFE0F Back',
    timer_presets: 'Select timer duration:',
    enter_minutes: 'Enter the number of minutes for the timer:',
    timer_15: '15 min',
    timer_30: '30 min',
    timer_45: '45 min',
    timer_60: '60 min',
    timer_90: '90 min',
    timer_120: '120 min',
    custom_timer: '\u270F\uFE0F Custom...',
  },
  ru: {
    start: 'Добро пожаловать в Timelyn! Выберите опцию:',
    my_devices_btn: '\uD83D\uDCF1 Мои устройства',
    connect_btn: '\uD83D\uDD17 Подключить устройство',
    status_btn: '\uD83D\uDCCA Статус',
    unlock_btn: '\uD83D\uDD13 Разблокировать',
    no_devices: 'У вас нет подключенных устройств. Используйте \uD83D\uDD17, чтобы добавить.',
    your_devices: '*Ваши устройства:*',
    online: '\uD83D\uDFE2 Онлайн',
    offline: '\uD83D\uDD34 Офлайн',
    never: 'Никогда',
    unnamed: 'Без имени',
    last_seen: 'Последний раз',
    invalid_pair: '\u274C Неверный код пары. Проверьте и попробуйте снова.',
    already_paired: '\u274C Это устройство уже подключено.',
    linked: '\u2705 Устройство успешно подключено! Теперь вы будете получать уведомления.',
    pair_error: '\u274C Произошла ошибка при подключении. Попробуйте снова.',
    status_title: '\uD83D\uDCCA *Статус Timelyn*',
    bot_running: '\uD83E\uDD16 Бот: \u2705 Работает',
    total_devices: '\uD83D\uDCE1 Всего устройств',
    your_devices_stat: '*Ваши устройства:*',
    no_online_devices: 'Нет онлайн устройств. Убедитесь, что устройство подключено.',
    timer_set: '\u23F1\uFE0F Таймер установлен для *{{name}}*: {{minutes}} мин.',
    socket_not_found: '\u274C Устройство онлайн, но сокет не найден. Попробуйте снова.',
    select_device: 'Выберите устройство:',
    select_device_unlock: 'Выберите устройство для разблокировки:',
    device_not_found: '\u274C Устройство не найдено.',
    device_offline: '\u274C Устройство офлайн или сокет не найден.',
    send_pair_code: 'Пожалуйста, отправьте код пары (например, PAIR-X7KQ9M2B):',
    notify_online: '\uD83D\uDFE2 *Устройство Онлайн*\n\n\uD83D\uDCF1 {{name}}\n\uD83D\uDD11 `{{id}}`',
    notify_offline: '\uD83D\uDD34 *Устройство Офлайн*\n\n\uD83D\uDCF1 {{name}}\n\uD83D\uDD11 `{{id}}`',
    notify_unexpected: '\u26A0\uFE0F *Устройство отключилось неожиданно*\n\n\uD83D\uDCF1 {{name}}\n\uD83D\uDD11 `{{id}}`\n\uD83D\uDD50 {{time}}\n\nВозможно, приложение было закрыто через Диспетчер задач. Устройство будет заблокировано при следующем запуске.',
    timer_started: '\u23F1\uFE0F *Таймер Запущен*\n\n\uD83D\uDCF1 {{name}}\n\u23F0 {{minutes}} мин',
    timer_ended: '\uD83D\uDD12 *Таймер Завершён*\n\n\uD83D\uDCF1 {{name}}\n\uD83D\uDD11 `{{id}}`\n\nУстройство заблокировано.',
    enter_unlock_password: '\uD83D\uDD11 Введите пароль Windows для разблокировки:\n\n\u26A0\uFE0F Ваше сообщение будет сразу удалено в целях безопасности.',
    unlock_sent: '\uD83D\uDD13 Команда отправлена на *{{name}}*! Вводим пароль на экране блокировки...',
    unlock_success: '\u2705 *{{name}}* успешно разблокирован.',
    unlock_socket_error: '\u274C Не удалось связаться с *{{name}}*. Устройство может быть офлайн.',
    language_prompt: 'Выберите язык:',
    language_set: '\u2705 Язык установлен: {{lang}}.',
    timer_btn: '\u23F1\uFE0F Таймер',
    language_btn: '\uD83C\uDF10 Язык',
    menu_btn: '\uD83C\uDFE0 Меню',
    back_btn: '\u25C0\uFE0F Назад',
    timer_presets: 'Выберите длительность таймера:',
    enter_minutes: 'Введите количество минут для таймера:',
    timer_15: '15 мин',
    timer_30: '30 мин',
    timer_45: '45 мин',
    timer_60: '60 мин',
    timer_90: '90 мин',
    timer_120: '120 мин',
    custom_timer: '\u270F\uFE0F Своё...',
  },
  uz: {
    start: 'Timelyn\'ga xush kelibsiz! Variantni tanlang:',
    my_devices_btn: '\uD83D\uDCF1 Mening qurilmalarim',
    connect_btn: '\uD83D\uDD17 Qurilmani ulash',
    status_btn: '\uD83D\uDCCA Holat',
    unlock_btn: '\uD83D\uDD13 Qurilmani ochish',
    no_devices: 'Sizda ulangan qurilmalar yo\'q. Ulash uchun \uD83D\uDD17 tugmasidan foydalaning.',
    your_devices: '*Sizning qurilmalaringiz:*',
    online: '\uD83D\uDFE2 Online',
    offline: '\uD83D\uDD34 Offline',
    never: 'Hech qachon',
    unnamed: 'Nomsiz',
    last_seen: 'Oxirgi marta',
    invalid_pair: '\u274C Noto\'g\'ri juftlik kodi. Tekshirib qayta urinib ko\'ring.',
    already_paired: '\u274C Bu qurilma allaqachon ulangan.',
    linked: '\u2705 Qurilma muvaffaqiyatli ulandi! Endi ulanish haqida xabarlar olasiz.',
    pair_error: '\u274C Juftlashda xatolik yuz berdi. Qayta urinib ko\'ring.',
    status_title: '\uD83D\uDCCA *Timelyn Holati*',
    bot_running: '\uD83E\uDD16 Bot: \u2705 Ishlamoqda',
    total_devices: '\uD83D\uDCE1 Jami qurilmalar',
    your_devices_stat: '*Sizning qurilmalaringiz:*',
    no_online_devices: 'Online ulangan qurilmalar yo\'q. Qurilma ulanganligiga ishonch hosil qiling.',
    timer_set: '\u23F1\uFE0F Taymer o\'rnatildi *{{name}}* uchun: {{minutes}} daqiqa.',
    socket_not_found: '\u274C Qurilma online, lekin socket topilmadi. Qayta urinib ko\'ring.',
    select_device: 'Qurilmani tanlang:',
    select_device_unlock: 'Ochish uchun qurilmani tanlang:',
    device_not_found: '\u274C Qurilma topilmadi.',
    device_offline: '\u274C Qurilma offline yoki socket topilmadi.',
    send_pair_code: 'Iltimos, juftlik kodingizni yuboring (masalan, PAIR-X7KQ9M2B):',
    notify_online: '\uD83D\uDFE2 *Qurilma Online*\n\n\uD83D\uDCF1 {{name}}\n\uD83D\uDD11 `{{id}}`',
    notify_offline: '\uD83D\uDD34 *Qurilma Offline*\n\n\uD83D\uDCF1 {{name}}\n\uD83D\uDD11 `{{id}}`',
    notify_unexpected: '\u26A0\uFE0F *Qurilma kutilmaganda uzildi*\n\n\uD83D\uDCF1 {{name}}\n\uD83D\uDD11 `{{id}}`\n\uD83D\uDD50 {{time}}\n\nIlova Task Manager orqali yopilgan bo\'lishi mumkin. Qurilma keyingi ishga tushirishda bloklanadi.',
    timer_started: '\u23F1\uFE0F *Taymer Boshlandi*\n\n\uD83D\uDCF1 {{name}}\n\u23F0 {{minutes}} daqiqa',
    timer_ended: '\uD83D\uDD12 *Taymer Tugadi*\n\n\uD83D\uDCF1 {{name}}\n\uD83D\uDD11 `{{id}}`\n\nQurilma bloklandi.',
    enter_unlock_password: '\uD83D\uDD11 Qurilmani ochish uchun Windows parolini kiriting:\n\n\u26A0\uFE0F Xabaringiz xavfsizlik uchun darhol o\'chiriladi.',
    unlock_sent: '\uD83D\uDD13 *{{name}}* ga buyruq yuborildi! Qulf ekraniga parol kiritilmoqda...',
    unlock_success: '\u2705 *{{name}}* muvaffaqiyatli ochildi.',
    unlock_socket_error: '\u274C *{{name}}* ga ulanib bo\'lmadi. Qurilma offline bo\'lishi mumkin.',
    language_prompt: 'Tilni tanlang:',
    language_set: '\u2705 Til o\'rnatildi: {{lang}}.',
    timer_btn: '\u23F1\uFE0F Taymer',
    language_btn: '\uD83C\uDF10 Til',
    menu_btn: '\uD83C\uDFE0 Menyu',
    back_btn: '\u25C0\uFE0F Orqaga',
    timer_presets: 'Taymer muddatini tanlang:',
    enter_minutes: 'Taymer uchun daqiqalar sonini kiriting:',
    timer_15: '15 daq',
    timer_30: '30 daq',
    timer_45: '45 daq',
    timer_60: '60 daq',
    timer_90: '90 daq',
    timer_120: '120 daq',
    custom_timer: '\u270F\uFE0F Boshqa...',
  },
};

export function msg(chatId, key, params = {}) {
  const lang = getLang(chatId);
  let text = (t[lang] && t[lang][key]) || (t.en[key]) || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
  }
  return text;
}

export function getKeyboard(chatId) {
  const lang = getLang(chatId);
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: t[lang].my_devices_btn, callback_data: 'my_devices' },
          { text: t[lang].connect_btn, callback_data: 'connect_device' },
        ],
        [
          { text: t[lang].status_btn, callback_data: 'status' },
          { text: t[lang].timer_btn, callback_data: 'set_timer' },
        ],
        [
          { text: t[lang].unlock_btn, callback_data: 'unlock' },
          { text: t[lang].language_btn, callback_data: 'language' },
        ],
      ],
    },
  };
}

export function getTimerKeyboard(chatId) {
  const lang = getLang(chatId);
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: t[lang].timer_15, callback_data: 'timer_preset_15' },
          { text: t[lang].timer_30, callback_data: 'timer_preset_30' },
          { text: t[lang].timer_45, callback_data: 'timer_preset_45' },
        ],
        [
          { text: t[lang].timer_60, callback_data: 'timer_preset_60' },
          { text: t[lang].timer_90, callback_data: 'timer_preset_90' },
          { text: t[lang].timer_120, callback_data: 'timer_preset_120' },
        ],
        [
          { text: t[lang].custom_timer, callback_data: 'timer_custom' },
        ],
        [
          { text: t[lang].back_btn, callback_data: 'menu' },
        ],
      ],
    },
  };
}