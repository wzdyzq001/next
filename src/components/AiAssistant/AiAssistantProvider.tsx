import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type {
  AiAssistantContextValue,
  OverlayMode,
  EntrySource,
  ChatMessage,
  ConversationContext,
  DegradeLevel,
  BubbleConfig,
  GuidedQuestion,
  WSConnectionState,
  MessageAction,
} from './types';
import type { RedeemReminder } from '../../types';
import {
  BRAND_NAME,
  SESSION_EXPIRE_MS,
  API_BASE_URL,
} from './constants';
import { chat, getOrder } from './api';
const AiAssistantContext = createContext<AiAssistantContextValue | null>(null);

export const useAiAssistantContext = () => {
  const ctx = useContext(AiAssistantContext);
  if (!ctx) throw new Error('useAiAssistantContext must be used within AiAssistantProvider');
  return ctx;
};

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const createEmptyContext = (): ConversationContext => ({
  sessionId: genId(),
  resolvedQuestions: [],
  conversationTurns: 0,
  createdAt: Date.now(),
  lastActiveAt: Date.now(),
});

export const AiAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('closed');
  const [entrySource, setEntrySource] = useState<EntrySource>('order_list');
  const [currentOrderId, setCurrentOrderId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [degradeLevel, setDegradeLevel] = useState<DegradeLevel>('none');
  const [transferHuman, setTransferHuman] = useState<'idle' | 'transferring' | 'chatting'>('idle');
  const [currentBubble, setCurrentBubble] = useState<BubbleConfig | undefined>();
  const [bubbleEventContext, setBubbleEventContext] = useState<{ eventType: string; orderId: string } | undefined>();
  const [wsState, setWsState] = useState<WSConnectionState>('disconnected');
  const [hasUnread, setHasUnread] = useState(false);
  const [reminderSheetOpen, setReminderSheetOpen] = useState(false);
  const [reminderSheetOrderId, setReminderSheetOrderId] = useState<string | null>(null);
  const [reminderSheetProductName, setReminderSheetProductName] = useState<string | undefined>(undefined);
  const [reminderSheetValidDate, setReminderSheetValidDate] = useState<string | undefined>(undefined);
  const [reservationPanelOpen, setReservationPanelOpen] = useState(false);
  const [reservationStoreName, setReservationStoreName] = useState('');
  const [reservationBusinessHours, setReservationBusinessHours] = useState<string | undefined>(undefined);

  const contextRef = useRef<ConversationContext>(createEmptyContext());
  const sessionIdRef = useRef<string>('');
  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const addUserMessage = useCallback((text: string): ChatMessage => {
    const msg: ChatMessage = {
      id: genId(),
      role: 'user',
      contentType: 'text',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const addAssistantMessage = useCallback((content: string, extra?: Partial<ChatMessage>): ChatMessage => {
    const msg: ChatMessage = {
      id: genId(),
      role: 'assistant',
      contentType: 'text',
      content,
      timestamp: Date.now(),
      ...extra,
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      if (degradeLevel === 'L2') return;

      addUserMessage(message);
      setIsLoading(true);
      contextRef.current.conversationTurns += 1;
      contextRef.current.lastActiveAt = Date.now();

      try {
        const response = await chat({
          sessionId: sessionIdRef.current || undefined,
          message,
          orderId: currentOrderId,
          conversationTurns: contextRef.current.conversationTurns,
          resolvedQuestions: contextRef.current.resolvedQuestions,
        });

        if (!response) {
          setDegradeLevel('L1');
          addAssistantMessage('抱歉，AI 助手暂时无法回复，请稍后再试。');
          setIsLoading(false);
          return;
        }

        if (response.newSessionId) {
          sessionIdRef.current = response.newSessionId;
          contextRef.current.sessionId = response.newSessionId;
        }

        if (response.transferHuman) {
          addAssistantMessage(response.reply);
          setTimeout(() => setTransferHuman('transferring'), 500);
          setTimeout(() => setTransferHuman('chatting'), 2000);
          setIsLoading(false);
          return;
        }

        const quickReplies = response.guideQuestions || response.nextGuideQuestions || [];
        addAssistantMessage(response.reply, { quickReplies });
      } catch {
        setDegradeLevel('L1');
        addAssistantMessage('抱歉，网络连接异常，请稍后再试。');
      } finally {
        setIsLoading(false);
      }
    },
    [degradeLevel, addUserMessage, addAssistantMessage, currentOrderId]
  );

  const openAssistant = useCallback(
    async (orderId?: string, source: EntrySource = 'order_list') => {
      setEntrySource(source);
      setCurrentOrderId(orderId);
      setOverlayMode('minimized');
      setTransferHuman('idle');
      setHasUnread(false);

      contextRef.current = createEmptyContext();
      sessionIdRef.current = contextRef.current.sessionId;

      const initialMessages: ChatMessage[] = [];

      if (orderId) {
        try {
          const order = await getOrder(orderId);
          if (order) {
            contextRef.current.currentOrderId = orderId;
            contextRef.current.orderContext = {
              category: order.category,
              productType: order.productType,
              status: order.status,
              refundStage: 'none',
            };
          }
        } catch {
          setDegradeLevel('L1');
        }
      }

      const welcome: ChatMessage = {
        id: genId(),
        role: 'assistant',
        contentType: 'text',
        content: `你好呀！我是${BRAND_NAME}，有什么可以帮你的吗？`,
        timestamp: Date.now(),
      };
      initialMessages.push(welcome);

      setMessages(initialMessages);
      contextRef.current.lastActiveAt = Date.now();
    },
    []
  );

  const closeAssistant = useCallback(() => {
    setOverlayMode('closed');
    setBubbleEventContext(undefined);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setOverlayMode((prev) => (prev === 'fullscreen' ? 'minimized' : 'fullscreen'));
  }, []);

  const triggerBubble = useCallback((bubble: BubbleConfig) => {
    setCurrentBubble(bubble);
    if (overlayMode === 'closed') {
      setHasUnread(true);
    }
  }, [overlayMode]);

  const clickBubble = useCallback(() => {
    if (!currentBubble) return;
    setBubbleEventContext({ eventType: currentBubble.eventType, orderId: currentBubble.orderId });
    openAssistant(currentBubble.orderId, 'bubble');
  }, [currentBubble, openAssistant]);

  const hideBubble = useCallback(() => {
    setCurrentBubble(undefined);
  }, []);

  const clickGuidedQuestion = useCallback(
    (question: GuidedQuestion) => {
      contextRef.current.resolvedQuestions.push(question.id);
      sendMessage(question.question);
    },
    [sendMessage]
  );

  const executeAction = useCallback((action: MessageAction) => {
    switch (action.kind) {
      case 'set_redeem_reminder':
        setReminderSheetOrderId(action.orderId);
        setReminderSheetOpen(true);
        break;
      case 'open_reservation':
        setReservationStoreName('预约门店');
        setReservationPanelOpen(true);
        break;
      default:
        console.log('executeAction:', action);
    }
  }, []);

  const openReminderSheet = useCallback((orderId: string, productName?: string, validDate?: string) => {
    setReminderSheetOrderId(orderId);
    setReminderSheetProductName(productName);
    setReminderSheetValidDate(validDate);
    setReminderSheetOpen(true);
  }, []);

  const closeReminderSheet = useCallback(() => {
    setReminderSheetOpen(false);
  }, []);

  const confirmReminder = useCallback((reminder: RedeemReminder) => {
    console.log('Reminder confirmed:', reminder);
    setReminderSheetOpen(false);
  }, []);

  const openReservationPanel = useCallback((storeName: string, businessHours?: string) => {
    setReservationStoreName(storeName);
    setReservationBusinessHours(businessHours);
    setReservationPanelOpen(true);
  }, []);

  const closeReservationPanel = useCallback(() => {
    setReservationPanelOpen(false);
  }, []);

  const confirmReservation = useCallback((data: any) => {
    console.log('Reservation confirmed:', data);
    setReservationPanelOpen(false);
  }, []);

  const checkServiceHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        setDegradeLevel('L2');
      } else {
        setDegradeLevel('none');
      }
    } catch {
      setDegradeLevel('L1');
    }
  }, []);

  const handleWsStateChange = useCallback((state: WSConnectionState) => {
    setWsState(state);
  }, []);

  useEffect(() => {
    if (overlayMode === 'closed') return;

    const connectWs = () => {
      try {
        setWsState('connecting');
        const wsUrl = sessionIdRef.current
          ? `ws://localhost:3001/ws?sessionId=${sessionIdRef.current}`
          : 'ws://localhost:3001/ws';
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          wsReconnectAttempts.current = 0;
          setWsState('connected');
          handleWsStateChange('connected');
        };

        ws.onmessage = () => {
        };

        ws.onclose = () => {
          setWsState('disconnected');
          handleWsStateChange('disconnected');
          tryReconnect();
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        setWsState('disconnected');
        handleWsStateChange('disconnected');
        tryReconnect();
      }
    };

    const tryReconnect = () => {
      if (wsReconnectAttempts.current >= maxReconnectAttempts) return;
      wsReconnectAttempts.current += 1;
      const delay = 3000 * Math.pow(2, wsReconnectAttempts.current - 1);
      setTimeout(() => connectWs(), delay);
    };

    connectWs();

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [overlayMode, handleWsStateChange]);

  useEffect(() => {
    if (overlayMode === 'closed') return;
    const check = () => {
      if (Date.now() - contextRef.current.lastActiveAt > SESSION_EXPIRE_MS) {
        closeAssistant();
      }
    };
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, [overlayMode, closeAssistant]);

  const value: AiAssistantContextValue = {
    overlayMode,
    entrySource,
    currentOrderId,
    sessionId: sessionIdRef.current || contextRef.current.sessionId,
    context: contextRef.current,
    messages,
    degradeLevel,
    currentBubble,
    isLoading,
    bubbleEventContext,
    currentOrder: undefined,
    hasUnread,
    reminderSheetOpen,
    reminderSheetOrderId,
    reminderSheetProductName,
    reminderSheetValidDate,
    reservationPanelOpen,
    reservationStoreName,
    reservationBusinessHours,
    openAssistant,
    closeAssistant,
    toggleFullscreen,
    sendMessage,
    triggerBubble,
    clickBubble,
    hideBubble,
    markAsRead: () => setHasUnread(false),
    switchOrder: () => {},
    executeAction,
    clickGuidedQuestion,
    submitFeatureCard: () => {},
    cancelFeatureCard: () => {},
    checkServiceHealth,
    setDegradeLevel,
    resetSession: () => {
      setMessages([]);
      contextRef.current = createEmptyContext();
      sessionIdRef.current = '';
      closeAssistant();
      setTransferHuman('idle');
    },
    setTransferHuman,
    transferHuman,
    wsState,
    showToast: () => {},
    dismissNotification: () => {},
    openReminderSheet,
    closeReminderSheet,
    confirmReminder,
    openReservationPanel,
    closeReservationPanel,
    confirmReservation,
  };

  return (
    <AiAssistantContext.Provider value={value as any}>
      {children}
    </AiAssistantContext.Provider>
  );
};

export default AiAssistantProvider;
