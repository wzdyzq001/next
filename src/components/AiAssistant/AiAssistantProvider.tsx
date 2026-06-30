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
import type { FeatureCardData } from './FeatureCard/types';
import {
  BRAND_NAME,
  SESSION_EXPIRE_MS,
  API_BASE_URL,
} from './constants';
import { chat, getOrder } from './api';
import { convertOrderDataToCardData, convertOrderListItemToCardData } from './orderDataAdapter';
import { ORDER_LIST } from '../../mock';
import type { OrderListItem } from '../../types';
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
      let currentOrder: OrderData | null = null;
      let currentOrderListItem: OrderListItem | null = null;

      if (orderId) {
        try {
          const order = await getOrder(orderId);
          if (order) {
            currentOrder = order;
            contextRef.current.currentOrderId = orderId;
            contextRef.current.orderContext = {
              category: order.category,
              productType: order.productType,
              status: order.status,
              refundStage: 'none',
            };
          } else {
            const localOrder = ORDER_LIST.find(o => o.orderId === orderId) || null;
            if (localOrder) {
              currentOrderListItem = localOrder;
              contextRef.current.currentOrderId = orderId;
              contextRef.current.orderContext = {
                category: localOrder.category,
                status: localOrder.statusText,
                refundStage: 'none',
              };
            }
          }
        } catch {
          const localOrder = ORDER_LIST.find(o => o.orderId === orderId) || null;
          if (localOrder) {
            currentOrderListItem = localOrder;
            contextRef.current.currentOrderId = orderId;
            contextRef.current.orderContext = {
              category: localOrder.category,
              status: localOrder.statusText,
              refundStage: 'none',
            };
          }
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

      if (source === 'order_detail' && (currentOrder || currentOrderListItem)) {
        const orderCard = currentOrder
          ? convertOrderDataToCardData(currentOrder)
          : convertOrderListItemToCardData(currentOrderListItem!);
        const orderCardMessage: ChatMessage = {
          id: genId(),
          role: 'assistant',
          contentType: 'text',
          content: '',
          orderCard,
          timestamp: Date.now(),
        };
        initialMessages.push(orderCardMessage);
      }

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
        const label = action.label || '';
        let featureCardData: FeatureCardData | null = null;

        if (label.includes('使用提醒') || label.includes('⏰')) {
          featureCardData = {
            type: 'redeem_reminder',
            title: '设置使用提醒',
            redeemReminder: {
              productName: '商品名称',
              validDate: '2024-12-31',
            },
          };
        } else if (label.includes('立即预约') || label.includes('帮我约')) {
          featureCardData = {
            type: 'reservation_form',
            title: '预约服务',
            reservation: {
              storeName: '预约门店',
              businessHours: '09:00-22:00',
            },
          };
        } else if (label.includes('帮我加急')) {
          featureCardData = {
            type: 'urgent_request',
            title: '加急请求',
            urgent: {
              reason: '订单配送较慢，希望尽快处理',
              target: 'rider',
            },
          };
        } else if (label.includes('再来一单')) {
          featureCardData = {
            type: 'reorder',
            title: '再来一单',
            reorder: {
              productName: '招牌奶茶套餐',
              storeName: '茶百道(科技园店)',
              price: 28.8,
              thumbnail: 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=bubble%20tea%20drink%20product%20photo&image_size=square',
            },
          };
        } else if (label.includes('入住指引') || label.includes('一站式游玩攻略') || label.includes('出行指引')) {
          let category: 'hotel' | 'scenic' | 'travel' = 'scenic';
          let title = '游玩攻略';
          let content = [
            '提前预约门票，避免现场排队',
            '建议穿着舒适的运动鞋',
            '携带防晒霜和饮用水',
            '注意景区开放时间',
            '保管好个人财物',
          ];

          if (label.includes('入住指引')) {
            category = 'hotel';
            title = '酒店入住指引';
            content = [
              '请携带有效身份证件办理入住',
              '入住时间通常为14:00后',
              '退房时间通常为12:00前',
              '如有特殊需求请提前联系酒店',
              '酒店提供免费早餐服务',
            ];
          } else if (label.includes('出行指引')) {
            category = 'travel';
            title = '出行指引';
            content = [
              '请提前到达车站/机场',
              '携带有效身份证件',
              '注意行李重量限制',
              '建议购买旅行保险',
              '保持手机畅通',
            ];
          }

          featureCardData = {
            type: 'guide',
            title,
            guide: {
              category,
              title,
              content,
            },
          };
        } else if (label.includes('查看券码') || label.includes('🎫')) {
          featureCardData = {
            type: 'voucher_code',
            title: '券码展示',
            voucher: {
              code: '8829 4561 2345',
              number: 'NO.20240101001',
              validDate: '2024-01-01 至 2024-12-31',
              notes: [
                '到店后向店员出示券码完成核销',
                '每笔订单仅限使用一张券码',
                '券码不可兑换现金，不找零',
                '最终解释权归商家所有',
              ],
            },
          };
        }

        if (featureCardData) {
          addAssistantMessage('', { featureCard: featureCardData });
          return;
        }

        console.log('executeAction:', action);
    }
  }, [addAssistantMessage]);

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
    submitFeatureCard: (cardType: string, data: Record<string, unknown>) => {
      console.log('submitFeatureCard:', cardType, data);
      let reply = '操作已提交';
      switch (cardType) {
        case 'redeem_reminder':
          reply = '好的，使用提醒已设置，我会在指定时间提醒您。';
          break;
        case 'reservation_form':
          reply = '预约申请已提交，商家确认后会第一时间通知您。';
          break;
        case 'urgent_request':
          reply = '加急请求已提交，我们会尽快为您处理，请保持电话畅通。';
          break;
        case 'reorder':
          reply = '好的，正在为您重新下单，请稍候...';
          break;
        case 'refund_apply':
          reply = '退款申请已提交，预计1-3个工作日内处理完成，退款将原路返回。';
          break;
        default:
          reply = '操作成功';
      }
      addAssistantMessage(reply);
    },
    cancelFeatureCard: () => {
      console.log('cancelFeatureCard');
    },
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
