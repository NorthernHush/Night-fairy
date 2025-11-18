// components/status.js

// Состояние заказов
// Структура: Map<userId, { status: 'pending'|'approved'|'rejected'|'not_found', timestamp: Date, file_id: String }>
const orderStatuses = new Map();

// Обновляет статус заказа
function updateOrderStatus(userId, status, fileId = null) {
  const userStatus = orderStatuses.get(userId) || {};
  orderStatuses.set(userId, {
    ...userStatus,
    status,
    timestamp: new Date(),
    ...(fileId && { file_id: fileId })
  });
}

// Получает статус заказа пользователя
function getOrderStatus(userId) {
  return orderStatuses.get(userId) || { status: 'not_found', timestamp: null };
}

// Форматирует отображение статуса
function formatStatusMessage(statusObj) {
  const { status, timestamp } = statusObj;
  
  const statusEmojis = {
    pending: '⏳',
    approved: '✅',
    rejected: '❌',
    not_found: '❓'
  };
  
  const statusTexts = {
    pending: 'ожидает проверки',
    approved: 'подтверждена',
    rejected: 'отклонена',
    not_found: 'не найдена'
  };
  
  let message = `💳 *Статус оплаты*\n\n`;
  message += `${statusEmojis[status]} *${statusTexts[status].toUpperCase()}*\n`;
  
  if (timestamp) {
    message += `📅 Время: ${timestamp.toLocaleString('ru-RU')}`;
  } else {
    message += `📅 Время: неизвестно`;
  }
  
  return message;
}

module.exports = {
  updateOrderStatus,
  getOrderStatus,
  formatStatusMessage,
  orderStatuses // для отладки/доступа к полному состоянию при необходимости
};