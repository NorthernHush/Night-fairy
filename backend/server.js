// backend/server.js
const express = require('express');
const cors = require('cors');
const YooKassa = require('yookassa');

const app = express();

// CORS middleware
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

// Create YooKassa instance with configuration
const yooKassa = new YooKassa({
  shopId: '1209622',
  secretKey: 'test_UDNZWKJC7HLHaN-6ykY7DZxhDQYgjT8P2r4hYiIf22I'
});

// Payment creation endpoint
app.post('/api/create-payment', async (req, res) => {
  const { amount, description } = req.body;

  try {
    const payment = await yooKassa.createPayment({
      amount: {
        value: amount.toString(),
        currency: 'RUB'
      },
      confirmation: {
        type: 'redirect',
        return_url: 'https://your-telegram-bot-url.com'
      },
      description: description || 'Платеж через Ночная Фея',
      capture: true
    });

    res.json({
      id: payment.id,
      confirmation_url: payment.confirmation.confirmation_url
    });
  } catch (error) {
    console.error('YooKassa payment creation error:', error);
    res.status(500).json({ 
      error: 'Payment creation failed',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Handle payment notifications (webhook)
app.post('/api/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const notification = req.body;
  console.log('Payment notification:', notification);
  res.sendStatus(200);
});

const PORT = 3004;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});