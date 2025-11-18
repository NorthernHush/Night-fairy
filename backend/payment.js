// backend/payment.js
const { YooKassa } = require('yookassa');

const yooKassa = new YooKassa({
  shopId: '1209622', // ← замени
  secretKey: 'test_UDNZWKJC7HLHaN-6ykY7DZxhDQYgjT8P2r4hYiIf22I' // твой ключ
});

async function createPayment(amount, description) {
  try {
    const payment = await yooKassa.createPayment({
      amount: { value: amount, currency: 'RUB' },
      confirmation: {
        type: 'redirect',
        return_url: 'https://t.me/nochnayafeya_bot'
      },
      capture: true,
      description: description
    });

    console.log('✅ Платеж создан:', payment.id);
    console.log('🔗 Ссылка для оплаты:', payment.confirmation.confirmation_url);
    return payment.confirmation.confirmation_url;
  } catch (error) {
    console.error('❌ Ошибка при создании платежа:', error.message);
    throw error;
  }
}

// Пример использования
createPayment(1000, 'Оплата Сбербанк').then(url => {
  console.log('Откройте ссылку в браузере:', url);
});