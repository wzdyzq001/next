import { useState, useEffect } from 'react';
import OrderCenter from './OrderCenter';
import type { OrderListItem } from './types';

function App() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChatWithOrder = (_payload: string | OrderListItem) => {
    console.log('[AI 智能助手 V2.0] AI 对话功能即将上线');
  };

  return (
    <div className="app">
      <OrderCenter
        onChatWithOrder={handleChatWithOrder}
        reservationsByOrder={{}}
        reservationNow={now}
      />
    </div>
  );
}

export default App;
