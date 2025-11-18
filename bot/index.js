// bot/index.js
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN || '8584308416:AAE9Bz0te9XDwZwDGjPOZuE1po1GHTN0xgY';
const bot = new TelegramBot(token, { polling: true });

// Состояния пользователей: { chatId: { status: 'ожидает_чек', orderId: '...' } }
const userStates = {};

// ТВОЙ РЕАЛЬНЫЙ ID (заменить!)
const ADMIN_CHAT_ID = '8145917560'; // ← ВЗЯЛ ИЗ ОШИБКИ (твой ID)

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, 'Ночная Фея 🔞\nВыбери способ оплаты:', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '📱 Открыть оплату',
            web_app: { url: 'https://transcondyloid-marcellus-subangularly.ngrok-free.dev/' }
          }
        ]
      ]
    }
  });
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Привет! Это бот для оплаты услуг Ночной Феи.\n\n1. Нажми "Открыть оплату" и выбери способ.\n2. После оплаты напиши "Оплачено".\n3. Пришли чек/подтверждение оплаты.');
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const userId = msg.from.id;

  // Обработка команды "Оплачено"
  if (text && (text.toLowerCase() === 'оплачено' || text.toLowerCase() === 'оплата')) {
    userStates[chatId] = { status: 'ожидает_чек', timestamp: Date.now() };
    bot.sendMessage(chatId, '✅ Спасибо! Теперь пришли чек или скриншот оплаты (фото/файл).');
    return;
  }

  // Если пользователь прислал фото/документ после команды "Оплачено"
  if (userStates[chatId] && userStates[chatId].status === 'ожидает_чек') {
    if (msg.photo || msg.document) {
      const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.document.file_id;
      const caption = msg.caption || `Чек от пользователя ${userId} (${chatId})`;

      // Отправляем чек админу
      bot.sendPhoto(ADMIN_CHAT_ID, fileId, { caption }).then(() => {
        bot.sendMessage(chatId, '✅ Чек получен! Мы проверим его в ближайшее время.');
        delete userStates[chatId]; // Сброс состояния
      }).catch(err => {
        console.error('❌ Ошибка при отправке чека:', err);
        bot.sendMessage(chatId, '❌ Ошибка при отправке чека. Попробуйте еще раз.');
      });
    } else {
      bot.sendMessage(chatId, '❌ Пожалуйста, пришли фото или файл с чеком.');
    }
    return;
  }

  // Обработка любых других сообщений
  if (text) {
    // Проверяем, не находится ли пользователь в ожидании чека
    if (userStates[chatId] && userStates[chatId].status === 'ожидает_чек') {
      bot.sendMessage(chatId, '⚠️ Ожидается чек. Пожалуйста, пришли фото или файл.');
    } else {
      bot.sendMessage(chatId, 'Напиши "Оплачено", чтобы подтвердить оплату и отправить чек.');
    }
  }
});

console.log('🤖 Бот запущен...');