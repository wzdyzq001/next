import { useState, useEffect, useCallback, useMemo } from 'react';
import OrderCenter from './OrderCenter';
import type { OrderListItem } from './types';
import type { ReservationInfoCardData } from './OrderCenter';
import { AiAssistantProvider, useAiAssistantContext, AiAssistantOverlay } from './components/AiAssistant';
import TestPanel from './components/TestPanel';
import './components/AiAssistant/aiAssistant.css';

const INITIAL_RESERVATIONS: Record<string, ReservationInfoCardData> = {
  'MT2026061800101': {
    orderId: 'MT2026061800101',
    reservationNo: 'YY20260618001',
    serviceType: '堂食预约',
    storeName: '海底捞火锅(陆家嘴店)',
    storeAddress: '浦东新区陆家嘴环路1000号',
    businessHours: '10:00-22:00',
    arrivalTime: '2026-06-20 18:30',
    pax: 4,
    phone: '138****8888',
    acceptStatus: 'accepted',
    estimatedAcceptTime: '5分钟内',
    merchantAcceptAt: Date.now() - 3600 * 1000,
  },
  'MT2026061800102': {
    orderId: 'MT2026061800102',
    reservationNo: 'YY20260618002',
    serviceType: '堂食预约',
    storeName: '西贝莜面村(五角场店)',
    storeAddress: '杨浦区邯郸路600号',
    businessHours: '11:00-21:30',
    arrivalTime: '2026-06-21 12:00',
    pax: 2,
    phone: '139****6666',
    acceptStatus: 'pending',
    estimatedAcceptTime: '3分钟内',
    acceptDeadlineAt: Date.now() + 3 * 60 * 1000,
  },
  'MT2026061800103': {
    orderId: 'MT2026061800103',
    reservationNo: 'YY20260618003',
    serviceType: '堂食预约',
    storeName: '外婆家(南京东路店)',
    storeAddress: '黄浦区南京东路300号',
    businessHours: '10:30-22:00',
    arrivalTime: '2026-06-19 19:00',
    pax: 6,
    phone: '137****5555',
    acceptStatus: 'failed',
    estimatedAcceptTime: '-',
  },
};

function AppContent({ reservationTrigger, onReservationTriggerConsumed }: {
  reservationTrigger: { orderId: string; category: string; productType?: string } | null;
  onReservationTriggerConsumed: () => void;
}) {
  const { openAssistant, closeAssistant, reservationsByOrder, cancelOrderReservation, rebookOrderReservation } = useAiAssistantContext();
  const [now, setNow] = useState(Date.now());
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;
    setInitialized(true);
  }, [initialized]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!reservationTrigger) return;
    closeAssistant();
  }, [reservationTrigger, closeAssistant]);

  const handleCancelReservation = useCallback((orderId?: string) => {
    if (!orderId) return;
    cancelOrderReservation(orderId);
  }, [cancelOrderReservation]);

  const handleRebookReservation = useCallback((reservation: ReservationInfoCardData) => {
    if (!reservation.orderId) return;
    rebookOrderReservation(reservation.orderId);
  }, [rebookOrderReservation]);

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
        reservationsByOrder={reservationsByOrder}
        reservationNow={now}
        onCancelReservation={handleCancelReservation}
        onRebookReservation={handleRebookReservation}
        reservationTrigger={reservationTrigger}
        onReservationTriggerConsumed={onReservationTriggerConsumed}
      />
      <AiAssistantOverlay />
      <TestPanel />
    </>
  );
}

function App() {
  const [reservationTrigger, setReservationTrigger] = useState<{ orderId: string; category: string; productType?: string } | null>(null);

  const handleOpenReservation = useCallback((orderId: string, category: string, productType?: string) => {
    setReservationTrigger({ orderId, category, productType });
  }, []);

  const handleReservationTriggerConsumed = useCallback(() => {
    setReservationTrigger(null);
  }, []);

  return (
    <div className="app">
      <AiAssistantProvider
        initialReservations={INITIAL_RESERVATIONS}
        onOpenReservation={handleOpenReservation}
      >
        <AppContent
          reservationTrigger={reservationTrigger}
          onReservationTriggerConsumed={handleReservationTriggerConsumed}
        />
      </AiAssistantProvider>
    </div>
  );
}

export default App;
