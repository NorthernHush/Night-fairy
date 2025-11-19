const TelegramBot = require('node-telegram-bot-api');

/*
  Bot configuration constants.
  BOT_TOKEN: Telegram bot token.
  ADMIN_IDS: array of admin user IDs (strings).
  ADMIN_PASSWORD: required password for /accept.
  PAYMENT_URL: URL shown to users for payment (web app button).
*/
const BOT_TOKEN = "8584308416:AAE9Bz0te9XDwZwDGjPOZuE1po1GHTN0xgY";
const ADMIN_IDS = ["8145917560"];
const ADMIN_PASSWORD = "root1";
const PAYMENT_URL = "https://transcondyloid-marcellus-subangularly.ngrok-free.dev/";

/*
  Security and behaviour constants.
  SPAM_INTERVAL_MS: minimal ms between messages per user to avoid spam.
  PENDING_PAYMENT_TTL_MS: how long a pending payment is valid (24 hours).
  BLOCKED_SUBSTRINGS: simple blacklist of substrings to block links.
*/
const SPAM_INTERVAL_MS = 1500;
const PENDING_PAYMENT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const BLOCKED_SUBSTRINGS = ["http", "https://", "t.me", "joinchat", "://"];

/*
  Utility: simple logger that prints timestamped messages.
*/
class Logger {
  static info(...args) {
    console.log(new Date().toISOString(), 'INFO', ...args);
  }
  static warn(...args) {
    console.warn(new Date().toISOString(), 'WARN', ...args);
  }
  static error(...args) {
    console.error(new Date().toISOString(), 'ERROR', ...args);
  }
}

/*
  Class SpamGuard
  Maintains last-seen timestamps per user to prevent rapid repeated messages.
*/
class SpamGuard {
  constructor(intervalMs) {
    this.intervalMs = intervalMs;
    this.lastSeen = new Map();
  }

  /*
    Returns true if the message from userId should be treated as spam (too fast).
  */
  isSpam(userId) {
    const now = Date.now();
    const last = this.lastSeen.get(userId) || 0;
    if (now - last < this.intervalMs) {
      return true;
    }
    this.lastSeen.set(userId, now);
    return false;
  }
}

/*
  Class Validator
  Contains static validation helper functions.
*/
class Validator {
  /*
    Check if a text contains substrings from the blocklist.
  */
  static containsBlockedSubstring(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return BLOCKED_SUBSTRINGS.some(substr => lower.includes(substr));
  }

  /*
    Normalize and check whether the message indicates a payment confirmation.
    Accepts common Russian phrases and a few English ones, robust substring checks.
  */
  static isPaymentConfirmation(text) {
    if (!text) return false;
    const t = text.toLowerCase();

    const patterns = [
      'оплатил',
      'оплатила',
      'оплачено',
      'я оплатил',
      'я оплатила',
      'готово',
      'платёж отправлен',
      'платеж отправлен',
      'payment sent',
      'paid'
    ];

    return patterns.some(p => t.includes(p));
  }

  /*
    Check if a string is a valid Telegram numeric id.
  */
  static isValidUserId(id) {
    if (!id) return false;
    // allow numbers only, positive, up to 12 digits (Telegram ids fit in signed 32/64 bits)
    return /^[0-9]{5,12}$/.test(String(id));
  }

  /*
    Sanitize text for admin notifications (shorten very long texts).
  */
  static sanitizeForAdmin(text, maxLen = 1000) {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 3) + '...';
  }
}

/*
  Class PendingPaymentManager
  Tracks pending payment requests and their timestamps.
*/
class PendingPaymentManager {
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
    this.map = new Map();
  }

  /*
    Add or refresh a pending payment for a userId.
    Stores timestamp and optional metadata.
  */
  add(userId, meta = {}) {
    this.map.set(userId, { ts: Date.now(), meta });
  }

  /*
    Returns true if there is a valid pending payment for userId.
  */
  has(userId) {
    const record = this.map.get(userId);
    if (!record) return false;
    if (Date.now() - record.ts > this.ttlMs) {
      this.map.delete(userId);
      return false;
    }
    return true;
  }

  /*
    Remove a pending payment for a userId.
  */
  remove(userId) {
    this.map.delete(userId);
  }

  /*
    Return metadata for a pending payment, or null.
  */
  getMeta(userId) {
    const rec = this.map.get(userId);
    if (!rec) return null;
    return rec.meta || null;
  }

  /*
    Clean expired entries. Should be called periodically if desired.
  */
  cleanup() {
    const now = Date.now();
    for (const [userId, rec] of this.map.entries()) {
      if (now - rec.ts > this.ttlMs) this.map.delete(userId);
    }
  }
}

/*
  Class AdminController
  Handles administration commands and notifications.
*/
class AdminController {
  constructor(bot, pendingPaymentManager) {
    this.bot = bot;
    this.pending = pendingPaymentManager;
    this.commandThrottle = new Map(); // throttle per admin for accept/reject
    this.THROTTLE_MS = 1000;
  }

  /*
    Return true if chatId is one of configured admins.
  */
  isAdmin(chatId) {
    return ADMIN_IDS.includes(String(chatId));
  }

  /*
    Notify all admins with the provided message (Russian text).
    Message is sent as-is to admins.
  */
  async notifyAdmins(text) {
    for (const adminId of ADMIN_IDS) {
      try {
        await this.bot.sendMessage(adminId, text);
      } catch (err) {
        Logger.warn('Failed to send admin notification to', adminId, err.message);
      }
    }
  }

  /*
    Send admin help text (Russian).
  */
  async sendAdminHelp(adminId) {
    const help = [
      "Команды администратора:",
      "/accept <userId> <password> — подтвердить оплату",
      "/reject <userId> — отклонить оплату",
      "/adminhelp — показать это сообщение"
    ].join("\n");
    try {
      await this.bot.sendMessage(adminId, help);
    } catch (err) {
      Logger.warn('Failed to send admin help to', adminId, err.message);
    }
  }

  /*
    Internal throttle to prevent accidental double-execution of admin commands.
    Returns true if allowed, false if throttled.
  */
  _allowCommand(adminId) {
    const now = Date.now();
    const last = this.commandThrottle.get(adminId) || 0;
    if (now - last < this.THROTTLE_MS) return false;
    this.commandThrottle.set(adminId, now);
    return true;
  }

  /*
    Handle /accept <userId> <password>.
    Validates admin, password, userId format, and existence of pending payment.
    Sends a Russian status message back to the admin and attempts to notify the user.
  */
  async handleAccept(adminId, parts) {
    if (!this._allowCommand(adminId)) {
      await this.bot.sendMessage(adminId, "Команды выполняются слишком часто. Попробуйте позже.");
      return;
    }

    if (parts.length < 2) {
      await this.bot.sendMessage(adminId, "Неверный формат. Использование: /accept <userId> <password>");
      return;
    }

    const userId = parts[0];
    const password = parts[1];

    if (!Validator.isValidUserId(userId)) {
      await this.bot.sendMessage(adminId, "Неверный userId. Укажите корректный числовой идентификатор.");
      return;
    }

    if (password !== ADMIN_PASSWORD) {
      await this.bot.sendMessage(adminId, "Неверный пароль. Доступ запрещен.");
      return;
    }

    if (!this.pending.has(userId)) {
      await this.bot.sendMessage(adminId, "Нет активной заявки на оплату от указанного пользователя или срок её истёк.");
      return;
    }

    let delivered = false;

    try {
      await this.bot.sendMessage(userId, "Оплата подтверждена. Спасибо.");
      delivered = true;
    } catch (err) {
      Logger.warn('Failed to notify user after accept', userId, err.message);
      delivered = false;
    }

    this.pending.remove(userId);

    if (delivered) {
      await this.bot.sendMessage(adminId, `Оплата подтверждена для пользователя ${userId}. Уведомление доставлено.`);
    } else {
      await this.bot.sendMessage(adminId, `Оплата отмечена как подтверждённая для пользователя ${userId}. Не удалось доставить уведомление (пользователь недоступен).`);
    }
  }

  /*
    Handle /reject <userId>.
    Validates admin and userId format. Removes pending request and attempts to notify user.
  */
  async handleReject(adminId, parts) {
    if (!this._allowCommand(adminId)) {
      await this.bot.sendMessage(adminId, "Команды выполняются слишком часто. Попробуйте позже.");
      return;
    }

    if (parts.length < 1) {
      await this.bot.sendMessage(adminId, "Неверный формат. Использование: /reject <userId>");
      return;
    }

    const userId = parts[0];

    if (!Validator.isValidUserId(userId)) {
      await this.bot.sendMessage(adminId, "Неверный userId. Укажите корректный числовой идентификатор.");
      return;
    }

    if (!this.pending.has(userId)) {
      await this.bot.sendMessage(adminId, "Нет активной заявки на оплату от указанного пользователя или срок её истёк.");
      return;
    }

    let delivered = false;

    try {
      await this.bot.sendMessage(userId, "Оплата отклонена. Если вы считаете это ошибкой, обратитесь в поддержку командой /support.");
      delivered = true;
    } catch (err) {
      Logger.warn('Failed to notify user after reject', userId, err.message);
      delivered = false;
    }

    this.pending.remove(userId);

    if (delivered) {
      await this.bot.sendMessage(adminId, `Оплата отклонена для пользователя ${userId}. Уведомление доставлено.`);
    } else {
      await this.bot.sendMessage(adminId, `Оплата отклонена для пользователя ${userId}. Не удалось доставить уведомление (пользователь недоступен).`);
    }
  }
}

/*
  Class SupportService
  Coordinates support requests from users and forwards to admins.
*/
class SupportService {
  constructor(bot, adminController, pendingManager) {
    this.bot = bot;
    this.adminController = adminController;
    this.pending = pendingManager;
    this.sessions = new Map();
  }

  /*
    Start support mode for a user (next message is treated as support message).
  */
  enable(userId) {
    this.sessions.set(userId, true);
  }

  /*
    Returns true if user is currently in support mode.
  */
  isEnabled(userId) {
    return this.sessions.get(userId) === true;
  }

  /*
    Process the support message: forward to admins and clear session.
  */
  async processSupportMessage(message) {
    const userId = String(message.from.id);
    const username = message.from.username ? `@${message.from.username}` : 'неизвестно';
    const text = Validator.sanitizeForAdmin(message.text || '');

    const payload = [
      'Новое сообщение в поддержку',
      `ID пользователя: ${userId}`,
      `Username: ${username}`,
      'Сообщение:',
      text
    ].join('\n');

    await this.adminController.notifyAdmins(payload);
    this.sessions.delete(userId);

    try {
      await this.bot.sendMessage(userId, 'Ваше сообщение отправлено в поддержку. Ожидайте ответа.');
    } catch (err) {
      Logger.warn('Failed to send support confirmation to user', userId, err.message);
    }
  }
}

/*
  Class BotApplication
  Orchestrates Telegram bot, controllers and message routing.
*/
class BotApplication {
  constructor() {
    this.bot = new TelegramBot(BOT_TOKEN, { polling: true });

    this.spamGuard = new SpamGuard(SPAM_INTERVAL_MS);
    this.pendingPayments = new PendingPaymentManager(PENDING_PAYMENT_TTL_MS);
    this.adminController = new AdminController(this.bot, this.pendingPayments);
    this.supportService = new SupportService(this.bot, this.adminController, this.pendingPayments);

    this._registerHandlers();
    this._startCleanupInterval();
    Logger.info('Bot initialized');
  }

  /*
    Register command and message handlers with the Telegram bot.
  */
  _registerHandlers() {
    // /start command
    this.bot.onText(/\/start/, (msg) => {
      if (this.spamGuard.isSpam(msg.chat.id)) return;
      const text = [
        'Ночная Фея',
        '',
        '1) Откройте ссылку оплаты',
        '2) После оплаты напишите: Оплатил или Оплачено'
      ].join('\n');

      try {
        this.bot.sendMessage(msg.chat.id, text, {
          reply_markup: {
            inline_keyboard: [[{ text: 'Открыть оплату', web_app: { url: PAYMENT_URL } }]]
          }
        });
      } catch (err) {
        Logger.error('Failed to send start message', err.message);
      }
    });

    // /support command
    this.bot.onText(/\/support/, (msg) => {
      if (this.spamGuard.isSpam(msg.chat.id)) return;
      this.supportService.enable(String(msg.chat.id));
      this.bot.sendMessage(msg.chat.id, 'Опишите вашу проблему в одном сообщении. После этого сообщение будет отправлено в поддержку.');
    });

    // /adminhelp command
    this.bot.onText(/\/adminhelp/, (msg) => {
      if (!this.adminController.isAdmin(msg.from.id)) return;
      this.adminController.sendAdminHelp(msg.chat.id);
    });

    // /accept command with two arguments
    this.bot.onText(/\/accept (.+)/, (msg, match) => {
      if (!this.adminController.isAdmin(msg.from.id)) return;
      const raw = match[1].trim();
      const parts = raw.split(/\s+/);
      this.adminController.handleAccept(String(msg.chat.id), parts);
    });

    // /reject command with one argument
    this.bot.onText(/\/reject (.+)/, (msg, match) => {
      if (!this.adminController.isAdmin(msg.from.id)) return;
      const raw = match[1].trim();
      const parts = raw.split(/\s+/);
      this.adminController.handleReject(String(msg.chat.id), parts);
    });

    // generic message handler
    this.bot.on('message', async (msg) => {
      // skip messages that are handled by specific handlers (commands)
      if (msg.text && msg.text.startsWith('/')) return;

      const userId = String(msg.chat.id);

      if (this.adminController.isAdmin(msg.from.id)) {
        // ignore admin messages that are not commands to avoid accidental pending creation
        return;
      }

      if (this.spamGuard.isSpam(userId)) return;

      if (Validator.containsBlockedSubstring(msg.text)) {
        await this.bot.sendMessage(userId, 'Сообщение содержит недопустимую ссылку или содержимое и было заблокировано.');
        return;
      }

      // support flow
      if (this.supportService.isEnabled(userId)) {
        await this.supportService.processSupportMessage(msg);
        return;
      }

      // payment confirmation phrases
      if (Validator.isPaymentConfirmation(msg.text)) {
        this.pendingPayments.add(userId, { from: msg.from, text: msg.text });
        const notifyTextUser = 'Заявка на проверку оплаты принята. Ожидайте подтверждения от администрации.';
        await this.bot.sendMessage(userId, notifyTextUser);

        const adminNotification = [
          'Новая заявка на проверку оплаты',
          `Пользователь: ${msg.from.first_name || 'неизвестно'}`,
          `Username: ${msg.from.username ? '@' + msg.from.username : 'неизвестно'}`,
          `ID: ${userId}`,
          '',
          'Чтобы подтвердить: /accept ' + userId + ' <пароль>',
          'Чтобы отклонить: /reject ' + userId
        ].join('\n');

        await this.adminController.notifyAdmins(adminNotification);
        return;
      }

      // fallback response for other messages
      // Do not be verbose; keep the bot polite and minimal
      // This is a deliberate design choice: do not reply to arbitrary texts
    });
  }

  /*
    Start a periodic cleanup to remove expired pending payment entries.
  */
  _startCleanupInterval() {
    setInterval(() => {
      try {
        this.pendingPayments.cleanup();
      } catch (err) {
        Logger.error('Pending cleanup failed', err.message);
      }
    }, 60 * 60 * 1000); // cleanup once per hour
  }
}

/*
  Application entry point: instantiate BotApplication.
*/
new BotApplication();
