# 🌙 Night Fairy  
**Express.js API • React.js Frontend • Node.js Telegram Bot**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green)]()
[![Express](https://img.shields.io/badge/Backend-Express.js-blue)]()
[![React](https://img.shields.io/badge/Frontend-React.js-61dafb)]()
[![Telegram Bot](https://img.shields.io/badge/Telegram%20Bot-Node.js-26a5e4)]()
[![NOWPayments](https://img.shields.io/badge/Payments-NOWPayments-yellow)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-orange)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen)]()

---

## 📌 О проекте

**Night Fairy** — это полнофункциональный стек:
- 🚀 **Express.js** сервер с интеграцией **YooKassa API**
- 🧚 **React.js** фронтенд
- 🤖 **Telegram Bot на Node.js**
- 💳 **ONLY Open Payment** через **NOWPayments**

Проект предназначен для интеграции платежей, автоматизации, продажи цифровых товаров и взаимодействия с пользователями через Telegram.

---

## 📁 Структура репозитория

/server — Express.js API (YooKassa)  
/client — React.js Frontend  
/bot — Telegram Bot (Node.js)

---

# 🚀 Установка и запуск

## 1️⃣ Клонирование
```bash
git clone https://github.com/your-repo/night-fairy.git
cd night-fairy
```
# 🖥 Backend — Express.js API

### 📦 Установка
```bash
cd server
npm install
```

### ⚙️ Настройка .env

```ini
PORT=5000

# YOOKASSA
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=your_secret_key
```

# ▶️ Запуск
```bash
npm run dev   # dev mode
npm start     # productio
```

---

# 🎨 Frontend — React.js

### 📦 Установка
```bash
cd client
npm install

```
### ⚙️ .env
```ini
REACT_APP_API_URL=http://localhost:5000
```

### ▶️ Запуск
```bash
npm start
```

# 🤖 Telegram Bot — Node.js

### 📦 Установка
```bash
cd bot
npm install

```

### ⚙️ .env
```ini
BOT_TOKEN=your_telegram_bot_token
```
# NOWPayments
```ini
NOWPAYMENTS_API_KEY=your_api_key
PAYMENT_CURRENCY=USDT
```

### ✔️ Функционал бота
- inline-клавиатуры  
- генерация платежных ссылок  
- ONLY Open Payment  
- интеграция NOWPayments  

### ▶️ Запуск
```bash
npm start

```

# 💳 Платежи — NOWPayments

Проект использует **NOWPayments Open Payment**, что означает:

- мгновенная генерация платежа  
- поддержка криптовалют  
- простая интеграция  

Документация:  
https://nowpayments.io/

---

# 🛠 Скрипты

### Сервер
```bash
npm run start
npm run dev
```

# 🚢 Деплой

Ниже — готовые варианты деплоя.  


## 🐳 Docker
Поддерживается.  
Готов собрать **Dockerfile** по запросу.

---

## ☁️ Хостинг
- **Railway**  
- **Render**  
- **Vercel** (только frontend)  
- **PM2 на VPS**

---

# 🔐 Безопасность
- не коммитьте `.env`  
- используйте **HTTPS**  
- храните ключи в **CI/CD variables** или **Docker secrets**

---

# 🤝 Contributing
PR’ы, улучшения и идеи приветствуются!

---

# 📄 Лицензия
MIT License

---

### ⭐ Если проект помог — поставь звезду!
