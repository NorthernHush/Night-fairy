// src/components/CryptoPayment.jsx
import React, { useState, useEffect } from 'react';
import './style/CryptoPayment.css';

const CryptoPayment = ({ isOpen, onClose, paymentData, onCopy }) => {
  const [status, setStatus] = useState(null);
  const [paidAmount, setPaidAmount] = useState(null);
  const [paidCurrency, setPaidCurrency] = useState(null);
  const [checking, setChecking] = useState(false);

  const orderId = paymentData?.order_id;

  // Функция проверки статуса
  const checkPaymentStatus = async () => {
    if (!orderId) return;

    setChecking(true);
    try {
      const response = await fetch(`http://localhost:3007/api/check-payment/${orderId}`);
      if (!response.ok) throw new Error('Не удалось получить статус');

      const data = await response.json();
      setStatus(data.status);
      setPaidAmount(data.paid_amount);
      setPaidCurrency(data.paid_currency);

      // Автоматически закрываем окно при успешной оплате
      if (data.status === 'finished') {
        setTimeout(() => {
          alert('Оплата прошла успешно!');
          onClose();
        }, 1000);
      }
    } catch (err) {
      console.error('Ошибка проверки статуса:', err);
    } finally {
      setChecking(false);
    }
  };

  // Запускаем проверку каждые 10 секунд
  useEffect(() => {
    if (!isOpen || !orderId) return;

    const interval = setInterval(checkPaymentStatus, 10000);
    return () => clearInterval(interval);
  }, [isOpen, orderId]);

  // Проверяем сразу при открытии
  useEffect(() => {
    if (isOpen && orderId) {
      checkPaymentStatus();
    }
  }, [isOpen, orderId]);

  if (!isOpen || !paymentData) return null;

  const { address, amount_crypto, currency, network } = paymentData;

  return (
    <div className="crypto-modal-overlay" onClick={onClose}>
      <div className="crypto-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="crypto-header">
          <h3>🔮 Оплата криптовалютой</h3>
          <p className="beta-tag">🧪 Будьте внимательны</p>
        </div>

        <div className="crypto-info">
          <div className="info-row">
            <span>Сумма:</span>
            <strong className="amount">{amount_crypto} {currency}</strong>
          </div>
          <div className="info-row">
            <span>Сеть:</span>
            <strong className="network">{network || 'TRC20'}</strong>
          </div>
        </div>

        <p className="address-label">Адрес:</p>
        <div className="crypto-address-container">
          <code className="crypto-address">33GM79xr6mQcn9LbU1RyhYxGxAAAaqhReR</code>
          <button 
            className="copy-btn" 
            onClick={() => onCopy(address)}
            title="Скопировать адрес"
          >
            📋
          </button>
        </div>

        {/* Отображение статуса */}
        {status && (
          <div className="status-info">
            <p><strong>Статус:</strong> <span className={`status-${status}`}>{status}</span></p>
            {paidAmount && paidCurrency && (
              <p><strong>Оплачено:</strong> {paidAmount} {paidCurrency}</p>
            )}
          </div>
        )}

        <div className="crypto-footer">
          <p>Отправьте указанную сумму на этот адрес. Подтверждение может занять до 10 минут.</p>
          <div className="confirmation-timer">
            <div className="timer-dot"></div>
            <span>Ожидаем подтверждение...</span>
          </div>
        </div>

        <div className="crypto-actions">
          <button className="check-btn" onClick={checkPaymentStatus} disabled={checking}>
            {checking ? '🔄 Проверка...' : '🔄 Проверить статус'}
          </button>
          <button className="paid-btn" onClick={() => {
            alert('Спасибо за подтверждение! Мы проверим платёж вручную.');
            onClose();
          }}>
            ✅ Оплатил
          </button>
        </div>

        <button className="close-btn" onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );
};

export default CryptoPayment;