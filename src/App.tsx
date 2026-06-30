import { useState, useEffect, useCallback } from 'react';
import OrderCenter from './OrderCenter';
import type { OrderListItem } from './types';
import { AiAssistantProvider, useAiAssistantContext, AiAssistantOverlay } from './components/AiAssistant';
import './components/AiAssistant/aiAssistant.css';

function AppContent() {
  const { openAssistant } = useAiAssistantContext();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChatWithOrder = useCallback(
    (payload: string | OrderListItem) => {
      const orderId = typeof payload === 'string' ? payload : payload.orderId;
      const source = orderId ? 'order_detail' : 'order_list';
      openAssistant(orderId || undefined, source);
    },
    [openAssistant]
  );

  return (
    <>
      <OrderCenter
        onChatWithOrder={handleChatWithOrder}
        reservationsByOrder={{}}
        reservationNow={now}
      />
      <AiAssistantOverlay />
    </>
  );
}

function App() {
  return (
    <div className="app">
      <AiAssistantProvider>
        <AppContent />
      </AiAssistantProvider>
    </div>
  );
}

export default App;
