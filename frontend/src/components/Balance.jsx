// src/components/Balance.jsx
import React, { useState, useEffect } from 'react';
import './style/Balance.css';

const Balance = ({ userId }) => {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await fetch(`http://localhost:3004/api/balance?user_id=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setBalance(data.balance || 0);
        } else {
          console.error('Ошибка получения баланса:', response.status);
        }
      } catch (err) {
        console.error('Ошибка сети:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchBalance();
    }
  }, [userId]);

  return (
    <div className="balance-container">
      {loading ? (
        <span>Загрузка баланса...</span>
      ) : (
        <span>Баланс: <strong>{balance} ₽</strong></span>
      )}
    </div>
  );
};

export default Balance;