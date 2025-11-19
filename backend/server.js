/*
  *  Server component for sending requests to payment systems.
  *  It won’t work without it, the YUKASSA payment system is connected here.
  *  And also crypto nowpayments
*/
const express = require('express');
const cors = require('cors');
const YooKassa = require('yookassa');
const axios = require('axios');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// ЮKassa
const yooKassa = new YooKassa({
  shopId: '',                   // SHOP Store ID for YouKassa, get in your personal account.
  secretKey: ''                //  You can receive the API key for YouKassa in your personal account.
});

// NOWPayments
const NOWPAYMENTS_API_KEY = '';   // API Key for NowPayment, get in your personal account
const NOWPAYMENTS_API_URL = '';  // API URL for NowPayment, get it in your personal account

// Мок-база пользователей
const userBalances = new Map();

// Эндпоинт создания платежа (для Сбер, Т-Банк)
app.post('/api/create-payment', async (req, res) => {
  const { amount, description, method, currency = 'RUB', user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id обязателен' });
  }

  try {
    if (method === 'crypto') {
      return res.status(400).json({ error: 'Для крипты используйте /api/create-crypto-payment' });
    }

    const payment = await yooKassa.createPayment({
      amount: { value: amount.toString(), currency: 'RUB' },
      confirmation: { type: 'redirect', return_url: 'https://t.me/@nochnayafeya_bot' },
      description: description || 'Платеж через Ночная Фея',
      capture: true,
      metadata: { user_id: user_id.toString() }
    });

    res.json({
      id: payment.id,
      confirmation_url: payment.confirmation.confirmation_url
    });
  } catch (error) {
    console.error('Payment creation error:', error.message);
    res.status(500).json({ error: 'Payment creation failed', details: error.message });
  }
});

app.post('/api/create-crypto-payment', async (req, res) => {
  const { amount, description, user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id обязателен' });
  }

  try {
    const response = await axios.post(`${NOWPAYMENTS_API_URL}/invoice`, {
      price_amount: amount, // сумма в USD (или другой price_currency)
      price_currency: 'usd',
      pay_currency: 'btc', // Используем BTC вместо USDT
      order_id: `user_${user_id}_${Date.now()}`,
      order_description: description || `Платеж от пользователя ${user_id}`,
      success_url: 'https://yourwebsite.com/success',
      cancel_url: 'https://yourwebsite.com/cancel',
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': NOWPAYMENTS_API_KEY,
      }
    });

    res.json({
      invoice_url: response.data.invoice_url,
      order_id: response.data.order_id,
      price_amount: response.data.price_amount,
      price_currency: response.data.price_currency,
      pay_address: response.data.pay_address,
      pay_amount: response.data.pay_amount,
      pay_currency: response.data.pay_currency,
    });

  } catch (error) {
    console.error('NowPayments API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Ошибка при создании инвойса', details: error.message });
  }
});

// Эндпоинт получения баланса
app.get('/api/balance', (req, res) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id обязателен' });
  }

  const balance = userBalances.get(user_id) || 0;
  res.json({ balance });
});

// Вебхук от ЮKassa
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const event = req.body;
  const type = event.event;
  const payment = event.object;

  if (type === 'payment.succeeded') {
    const paymentId = payment.id;
    const userId = payment.metadata?.user_id;
    const amount = parseFloat(payment.amount.value);

    try {
      const paymentDetails = await yooKassa.getPayment(paymentId);

      if (paymentDetails.status === 'succeeded' && paymentDetails.paid === true) {
        if (userId) {
          const currentBalance = userBalances.get(userId) || 0;
          userBalances.set(userId, currentBalance + amount);

          console.log(`✅ Платёж ${paymentId} подтверждён. Баланс пользователя ${userId} пополнен на ${amount} ₽. Новый баланс: ${currentBalance + amount}`);
        } else {
          console.log(`⚠️ В платеже ${paymentId} отсутствует user_id в metadata`);
        }
      } else {
        console.log(`❌ Платёж ${paymentId} не прошёл проверку: статус = ${paymentDetails.status}, paid = ${paymentDetails.paid}`);
      }
    } catch (err) {
      console.error(`❌ Ошибка проверки платежа ${paymentId}:`, err.message);
    }
  }

  res.sendStatus(200);
});

app.get('/api/debug-balances', (req, res) => {
  res.json(Object.fromEntries(userBalances));
});

app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

const PORT = 3009;    // The port at which the server starts, the main thing is to synchronize with the frontend.
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 