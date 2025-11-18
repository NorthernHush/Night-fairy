// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [pulse, setPulse] = useState(false);
  const [glow, setGlow] = useState(false);
  const [activeBtn, setActiveBtn] = useState(null);
  const [showSupport, setShowSupport] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState({ sber: false, tbank: false, crypto: false });

  // Проверка мобильного устройства
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Анимации
  useEffect(() => {
    const pulseInterval = setInterval(() => setPulse(true), 4000);
    const glowInterval = setInterval(() => setGlow(true), 6000);
    setTimeout(() => setPulse(false), 600);
    setTimeout(() => setGlow(false), 1200);
    return () => {
      clearInterval(pulseInterval);
      clearInterval(glowInterval);
    };
  }, []);

  // Функции оплаты через API
  const createPayment = async (method, amount = 1000, description) => {
    setLoading(prev => ({ ...prev, [method]: true }));
    try {
      console.log('Creating payment for:', method, amount, description);
      
      const response = await fetch('http://localhost:3004/api/create-payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          amount,
          description: `${description} (${method})`,
          method
        })
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || `Ошибка: ${response.status}`);
      }

      const data = await response.json();
      console.log('Success response:', data);
      
      if (data.confirmation_url) {
        window.open(data.confirmation_url, '_blank');
      } else {
        throw new Error('Ссылка на оплату не получена');
      }
    } catch (err) {
      console.error('❌ Ошибка при создании платежа:', err);
      alert('Ошибка при создании оплаты: ' + err.message + '. Попробуйте позже или напишите в поддержку.');
    } finally {
      setLoading(prev => ({ ...prev, [method]: false }));
    }
  };

  const handleSber = () => createPayment('sber', 1000, 'Оплата Сбербанк');
  const handleTBank = () => createPayment('tbank', 1000, 'Оплата Т-Банк');
  const handleCrypto = () => createPayment('crypto', 1000, 'Оплата Крипта');

  const handleSupportClick = () => {
    setShowSupport(true);
    setTimeout(() => setShowSupport(false), 3000);
  };

  return (
    <div className="payment-page">
      {/* Анимированный фон */}
      <div className="background-animation"></div>

      <div className="header">
        <div className={`logo-container ${pulse ? 'pulse' : ''}`}>
          <img 
            src="https://i.ibb.co/7db8SSXj/avspvmmjt.png" 
            alt="Ночная Фея" 
            className="fairy-logo"
            onError={(e) => {
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiByeD0iNjAiIGZpbGw9IiMwMDAwMDAiLz4KPHBhdGggZD0iTTM1IDQ1QzM1IDQ1IDQ1IDM1IDYwIDM1Qzc1IDM1IDg1IDQ1IDg1IDQ1VjgwQzg1IDgwIDc1IDkwIDYwIDkwQzQ1IDkwIDM1IDgwIDM1IDgwVjQ1WiIgZmlsbD0iI0ZGNDA2QiIvPgo8Y2lyY2xlIGN4PSI2MCIgY3k9IjU1IiByPSIxMCIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTQ1IDcwTDM1IDgwTDEwIDc1TDIwIDY1TDQ1IDcwWiIgZmlsbD0iI0ZGNDA2QiIvPgo8cGF0aCBkPSJNMTA1IDgwTDgwIDc1TDcwIDY1TDg1IDcwTDEwNSA4MFoiIGZpbGw9IiNGRjQwNkIiLz4KPHBhdGggZD0iTTUwIDU1TDM1IDQwTDQ1IDMwTDYwIDQ1TDUwIDU1WiIgZmlsbD0iI0ZGNDA2QiIvPgo8cGF0aCBkPSJNNzAgNTVMODUgNDBMNzUgMzBMNjAgNDVMNzAgNTVaIiBmaWxsPSIjRkY0MDZCIi8+Cjwvc3ZnPgo=';
            }}
          />
        </div>
        <h1 className={`title ${glow ? 'glow' : ''}`}>Ночная Фея 🔞</h1>
      </div>

      <div className="buttons-container">
        <button 
          className={`btn sber ${activeBtn === 'sber' ? 'active' : ''}`} 
          onClick={handleSber}
          onMouseEnter={() => !isMobile && setActiveBtn('sber')}
          onMouseLeave={() => !isMobile && setActiveBtn(null)}
          onTouchStart={() => setActiveBtn('sber')}
          onTouchEnd={() => setActiveBtn(null)}
          disabled={loading.sber}
        >
          {loading.sber ? '⏳ Обработка...' : '💳 Сбербанк'}
        </button>
        <button 
          className={`btn tbank ${activeBtn === 'tbank' ? 'active' : ''}`} 
          onClick={handleTBank}
          onMouseEnter={() => !isMobile && setActiveBtn('tbank')}
          onMouseLeave={() => !isMobile && setActiveBtn(null)}
          onTouchStart={() => setActiveBtn('tbank')}
          onTouchEnd={() => setActiveBtn(null)}
          disabled={loading.tbank}
        >
          {loading.tbank ? '⏳ Обработка...' : '💳 Т-Банк'}
        </button>
        <button 
          className={`btn crypto ${activeBtn === 'crypto' ? 'active' : ''}`} 
          onClick={handleCrypto}
          onMouseEnter={() => !isMobile && setActiveBtn('crypto')}
          onMouseLeave={() => !isMobile && setActiveBtn(null)}
          onTouchStart={() => setActiveBtn('crypto')}
          onTouchEnd={() => setActiveBtn(null)}
          disabled={loading.crypto}
        >
          {loading.crypto ? '⏳ Обработка...' : '₿ Крипта'}
        </button>
      </div>

      {/* Новая кнопка "Проблема с оплатой" */}
      <div className="support-section">
        <button 
          className="support-btn" 
          onClick={handleSupportClick}
        >
          ❓ Проблема с оплатой?
        </button>
        {showSupport && (
          <div className="support-popup">
            <p>Напишите в бот: <strong>@nochnayafeya_bot</strong></p>
            <p>Мы поможем вам с оплатой!</p>
          </div>
        )}
      </div>

      <div className="footer-note">
        <p>После оплаты напишите в бота: <strong>“Оплачено”</strong></p>
      </div>

      {/* Анимированные полосы */}
      <div className="animation-strips">
        <div className="strip top"></div>
        <div className="strip bottom"></div>
      </div>
    </div>
  );
}

export default App;