const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8584308416:AAE9Bz0te9XDwZwDGjPOZuE1po1GHTN0xgY";
const ADMINS = ["8145917560"]; // Add more admin IDs
const PAY_URL = "https://transcondyloid-marcellus-subangularly.ngrok-free.dev/";

const bot = new TelegramBot(TOKEN, { polling: true });

const waitingForCheck = new Map();   // userId -> waiting boolean
const pendingChecks = new Map();      // userId -> fileId
const spamCooldown = new Map();       // userId -> lastMessageTime

const SPAM_DELAY = 1500;
const BLOCKED_TOKENS = ["http", "t.me", "joinchat", "://"]; // simple protection

const PAY_BUTTON = {
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: "📱 Открыть оплату",
          web_app: { url: PAY_URL }
        }
      ]
    ]
  }
};


function antiSpam(chatId) {
  const now = Date.now();
  const last = spamCooldown.get(chatId) || 0;
  if (now - last < SPAM_DELAY) return true;
  spamCooldown.set(chatId, now);
  return false;
}


function isSuspicious(text) {
  if (!text) return false;
  const low = text.toLowerCase();
  return BLOCKED_TOKENS.some(w => low.includes(w));
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "✨ *Ночная Фея*\n\n1) Нажми *Открыть оплату*\n2) После оплаты напиши: *Оплатил* или *Оплачено*.",
    { parse_mode: "Markdown", ...PAY_BUTTON }
  );
});


bot.on("callback_query", async (q) => {
  try {
    await bot.answerCallbackQuery(q.id); // prevents spinner freeze

    const adminId = q.from.id.toString();
    if (!ADMINS.includes(adminId)) return;

    const data = q.data;
    const [action, userId] = data.split(":");
    if (!userId) return bot.sendMessage(adminId, "❌ Ошибка: userId отсутствует.");

    if (action === "approve") {
      await bot.sendMessage(userId, "✅ *Оплата подтверждена!*", { parse_mode: "Markdown" });
      await bot.sendMessage(adminId, `✔ Чек подтверждён (user: ${userId}).`);
      pendingChecks.delete(userId);
    }

    if (action === "reject") {
      await bot.sendMessage(userId, "❌ *Оплата отклонена.*", { parse_mode: "Markdown" });
      await bot.sendMessage(adminId, `✖ Чек отклонён (user: ${userId}).`);
      pendingChecks.delete(userId);
    }

  } catch (err) {
    console.error("Callback error:", err);
  }
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.toLowerCase() || "";


  if (antiSpam(chatId)) return;


  if (isSuspicious(text)) {
    return bot.sendMessage(chatId, "⚠ Подозрительная ссылка заблокирована.");
  }

  if (waitingForCheck.has(chatId)) {
    const file = msg.photo?.[msg.photo.length - 1]?.file_id || (msg.document ? msg.document.file_id : null);

    if (!file) {
      return bot.sendMessage(chatId, "📎 Пришли *фото или файл* чека.", { parse_mode: "Markdown" });
    }

    pendingChecks.set(chatId, file);
    waitingForCheck.delete(chatId);

    // Send to admins
    ADMINS.forEach(admin => {
      const caption = `💳 *Новый чек*\nОт: ${msg.from.first_name} (ID: ${chatId})`;

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✔ Подтвердить", callback_data: `approve:${chatId}` },
              { text: "✖ Отклонить", callback_data: `reject:${chatId}` }
            ]
          ]
        }
      };

      if (msg.photo) bot.sendPhoto(admin, file, { caption, parse_mode: "Markdown", ...keyboard });
      else bot.sendDocument(admin, file, { caption, parse_mode: "Markdown", ...keyboard });
    });

    return bot.sendMessage(chatId, "⏳ Чек отправлен на проверку.");
  }

  if (text.includes("оплатил") || text.includes("оплачено")) {
    waitingForCheck.set(chatId, true);
    return bot.sendMessage(chatId, "📸 Пришли *чек об оплате* (фото или файл):", { parse_mode: "Markdown" });
  }

});

console.log("🤖 CLEAN PAYMENT BOT RUNNING...");