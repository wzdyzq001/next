import { useState, useEffect, useCallback, useMemo } from 'react';
import OrderCenter from './OrderCenter';
import type { OrderListItem } from './types';
import type { ReservationInfoCardData } from './OrderCenter';
import { AiAssistantProvider, useAiAssistantContext, AiAssistantOverlay } from './components/AiAssistant';
import TestPanel from './components/TestPanel';
import CardMarginDemo from './components/AiAssistant/CardMarginDemo';
import WidthAlignmentDemo from './components/AiAssistant/WidthAlignmentDemo';
import FeatureDemo from './FeatureDemo';
import StatusFlowDemo from './StatusFlowDemo';
import InteractionMap from './InteractionMap';
import { AiOrderCardDemo } from './components/AiAssistant/AiOrderCardDemo';
import ReachDemo from './ReachDemo';
import './components/AiAssistant/aiAssistant.css';
import './components/AiAssistant/cardMarginDemo.css';
import './components/AiAssistant/widthAlignmentDemo.css';
import './interactionMap.css';
import './components/AiAssistant/orderCardDemo.css';

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
    </>
  );
}

function App() {
  const [reservationTrigger, setReservationTrigger] = useState<{ orderId: string; category: string; productType?: string } | null>(null);
  const [showCardMarginDemo, setShowCardMarginDemo] = useState(false);
  const [showWidthAlignmentDemo, setShowWidthAlignmentDemo] = useState(false);
  const [showFeatureDemo, setShowFeatureDemo] = useState(false);
  const [showStatusFlowDemo, setShowStatusFlowDemo] = useState(false);
  const [showInteractionMap, setShowInteractionMap] = useState(false);
  const [showOrderCardDemo, setShowOrderCardDemo] = useState(false);
  const [showReachDemo, setShowReachDemo] = useState(false);

  const handleOpenReservation = useCallback((orderId: string, category: string, productType?: string) => {
    setReservationTrigger({ orderId, category, productType });
  }, []);

  const handleReservationTriggerConsumed = useCallback(() => {
    setReservationTrigger(null);
  }, []);

  if (showWidthAlignmentDemo) {
    return (
      <>
        <WidthAlignmentDemo />
        <button
          onClick={() => setShowWidthAlignmentDemo(false)}
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 9999,
            padding: '8px 16px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          ← 返回
        </button>
      </>
    );
  }

  if (showCardMarginDemo) {
    return (
      <div className="app">
        <CardMarginDemo />
        <button
          onClick={() => setShowCardMarginDemo(false)}
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 9999,
            padding: '8px 16px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          ← 返回
        </button>
      </div>
    );
  }

  if (showStatusFlowDemo) {
    return (
      <>
        <StatusFlowDemo />
        <button
          onClick={() => setShowStatusFlowDemo(false)}
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 9999,
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          📋 订单中心
        </button>
      </>
    );
  }

  if (showInteractionMap) {
    return (
      <>
        <InteractionMap />
        <button
          onClick={() => setShowInteractionMap(false)}
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 9999,
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          📋 订单中心
        </button>
      </>
    );
  }

  if (showOrderCardDemo) {
    return (
      <AiAssistantProvider>
        <AiOrderCardDemo />
        <button
          onClick={() => setShowOrderCardDemo(false)}
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 9999,
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          📋 订单中心
        </button>
      </AiAssistantProvider>
    );
  }

  if (showReachDemo) {
    return (
      <>
        <ReachDemo />
        <button
          onClick={() => setShowReachDemo(false)}
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 9999,
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          📋 订单中心
        </button>
      </>
    );
  }

  if (showFeatureDemo) {
    return (
      <>
        <FeatureDemo />
        <button
          onClick={() => setShowFeatureDemo(false)}
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 9999,
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          📋 订单中心
        </button>
      </>
    );
  }

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
        <TestPanel
          onOpenStatusFlowDemo={() => setShowStatusFlowDemo(true)}
          onOpenInteractionMap={() => setShowInteractionMap(true)}
          onOpenOrderCardDemo={() => setShowOrderCardDemo(true)}
          onOpenReachDemo={() => setShowReachDemo(true)}
        />
      </AiAssistantProvider>
    </div>
  );
}

export default App;
