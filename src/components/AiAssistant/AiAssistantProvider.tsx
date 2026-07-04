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
  OrderData,
  CollapseState,
  CollapseStateItem,
  LastEntryState,
} from './types';
import type { RedeemReminder } from '../../types';
import type { FeatureCardData } from './FeatureCard/types';
import type { ReservationInfoCardData } from './ReservationInfoCard';
import {
  BRAND_NAME,
  SESSION_EXPIRE_MS,
  API_BASE_URL,
  STORAGE_KEY_CHAT_HISTORY,
  CHAT_HISTORY_MAX_AGE,
  COLLAPSE_STATE_STORAGE_KEY,
  LAST_ENTRY_STORAGE_KEY,
  STORAGE_KEY_RESERVATIONS,
  COLLAPSE_VISIBLE_COUNT_ORDER_LIST_FROM_DETAIL,
  COLLAPSE_VISIBLE_COUNT_ORDER_LIST_DEFAULT,
  COLLAPSE_VISIBLE_COUNT_NEW_ORDER,
  USE_LOCAL_NLU,
} from './constants';
import { chat, getOrder } from './api';
import { processNluMessage, createInitialDialogState } from './nlu';
import type { NluContext, NluResponseMessage } from './nlu';
import { convertOrderDataToCardData, convertOrderListItemToCardData } from './orderDataAdapter';
import { ORDER_LIST } from '../../mock';
import {
  cancelReminder as cancelReminderStorage,
  setReminder as setReminderStorage,
  getReminderByOrder,
} from '../../redeemReminder';
import type { OrderListItem } from '../../types';
import { createReorderFromOriginal } from './OrderCard/orderCardUtils';
import type { OrderCardData } from './OrderCard/orderCardTypes';
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
  dialogState: createInitialDialogState(),
});

interface ChatHistoryItem {
  messages: ChatMessage[];
  context: ConversationContext;
  savedAt: number;
}

const findLastOrderCardOrderId = (messages: ChatMessage[]): string | undefined => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.orderCard) {
      return msg.orderCard.id || (msg.orderCard as any).orderId;
    }
  }
  return undefined;
};

const hasReminderCardInLastN = (messages: ChatMessage[], orderId: string, n: number): boolean => {
  const start = Math.max(0, messages.length - n);
  for (let i = start; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.redeemReminder && msg.orderCard?.id === orderId) {
      return true;
    }
  }
  return false;
};

const loadCollapseState = (): CollapseState => {
  try {
    const raw = localStorage.getItem(COLLAPSE_STATE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, any>;
    const result: CollapseState = {};
    for (const key of Object.keys(parsed)) {
      const val = parsed[key];
      if (typeof val === 'boolean') {
        result[key] = { collapsed: val, visibleCount: 2 };
      } else if (val && typeof val === 'object' && 'collapsed' in val) {
        result[key] = val as CollapseStateItem;
      }
    }
    return result;
  } catch {
    return {};
  }
};

const saveCollapseState = (state: CollapseState): void => {
  try {
    localStorage.setItem(COLLAPSE_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
};

const loadLastEntry = (): LastEntryState | null => {
  try {
    const raw = localStorage.getItem(LAST_ENTRY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastEntryState;
  } catch {
    return null;
  }
};

const saveLastEntry = (state: LastEntryState): void => {
  try {
    localStorage.setItem(LAST_ENTRY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
};

const loadChatHistory = (): ChatHistoryItem | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHAT_HISTORY);
    if (!raw) return null;
    const allHistory = JSON.parse(raw) as Record<string, ChatHistoryItem>;
    const history = allHistory['default'];
    if (!history) return null;
    if (Date.now() - history.savedAt > CHAT_HISTORY_MAX_AGE) return null;
    return history;
  } catch {
    return null;
  }
};

const saveChatHistory = (messages: ChatMessage[], context: ConversationContext) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHAT_HISTORY);
    const allHistory = raw ? (JSON.parse(raw) as Record<string, ChatHistoryItem>) : {};
    allHistory['default'] = {
      messages,
      context,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY_CHAT_HISTORY, JSON.stringify(allHistory));
  } catch {
    // ignore
  }
};

export const AiAssistantProvider: React.FC<{
  children: React.ReactNode;
  initialReservations?: Record<string, ReservationInfoCardData>;
  onOpenReservation?: (orderId: string, category: string, productType?: string) => void;
}> = ({ children, initialReservations = {}, onOpenReservation }) => {
  const loadSavedReservations = (): Record<string, ReservationInfoCardData> => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RESERVATIONS);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to load reservations:', e);
    }
    return initialReservations;
  };

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
  const [reservationEditMode, setReservationEditMode] = useState<'new' | 'rebook'>('new');
  const [editingReservation, setEditingReservation] = useState<ReservationInfoCardData | null>(null);
  const [rebookFromMessageId, setRebookFromMessageId] = useState<string | null>(null);
  const [editingReminderOrderId, setEditingReminderOrderId] = useState<string | null>(null);
  const [reminderEditMode, setReminderEditMode] = useState<'new' | 'modify' | 'reset'>('new');
  const [reminderFromMessageId, setReminderFromMessageId] = useState<string | null>(null);
  const [voucherSheetOpen, setVoucherSheetOpen] = useState(false);
  const [voucherSheetStoreName, setVoucherSheetStoreName] = useState<string | undefined>(undefined);
  const [voucherSheetProductName, setVoucherSheetProductName] = useState<string | undefined>(undefined);
  const [voucherSheetVoucherCode, setVoucherSheetVoucherCode] = useState<string | undefined>(undefined);
  const [reservationsByOrder, setReservationsByOrder] = useState<Record<string, ReservationInfoCardData>>(loadSavedReservations);
  const [toastText, setToastText] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reservationTimersRef = useRef<Record<string, { simulate: ReturnType<typeof setTimeout>; timeout: ReturnType<typeof setTimeout> }>>({});
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [collapsedCount, setCollapsedCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(2);

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

  const sendOrderCard = useCallback((order: OrderListItem | any) => {
    const orderCard = 'category' in order && 'productType' in order && 'id' in order
      ? convertOrderDataToCardData(order as any)
      : convertOrderListItemToCardData(order as OrderListItem);

    contextRef.current.currentOrderId = orderCard.id;
    setCurrentOrderId(orderCard.id);
    contextRef.current.orderContext = {
      category: orderCard.category,
      productType: orderCard.productType,
      status: orderCard.mainStatus || orderCard.orderStatus,
      refundStage: 'none',
    };

    addAssistantMessage('', { orderCard });
  }, [addAssistantMessage]);

  const checkExistingReservation = useCallback((orderId?: string): ReservationInfoCardData | null => {
    const targetOrderId = orderId || currentOrderId;
    if (!targetOrderId) return null;
    const reservation = reservationsByOrder[targetOrderId];
    if (!reservation) return null;
    if (reservation.acceptStatus === 'pending' || reservation.acceptStatus === 'accepted') {
      return reservation;
    }
    return null;
  }, [currentOrderId, reservationsByOrder]);

  const showToast = useCallback((text: string) => {
    setToastText(text);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastText(null);
      toastTimerRef.current = null;
    }, 2000);
  }, []);

  const showExistingReservationAlert = useCallback((reservation: ReservationInfoCardData) => {
    const orderId = reservation.orderId;
    const latestReservationMsg = messages.reduceRight<ChatMessage | null>((found, msg) => {
      if (found) return found;
      if (msg.reservationInfo && msg.reservationInfo.orderId === orderId) {
        return msg;
      }
      return null;
    }, null);
    if (latestReservationMsg) {
      const isPending = reservation.acceptStatus === 'pending';
      const toastMsg = isPending ? '已经有进行中的预约单' : '已经有预约成功的订单';
      showToast(toastMsg);
      return;
    }
    const isPending = reservation.acceptStatus === 'pending';
    const alertText = isPending ? '已经有预约进行中' : '已经有预约成功';
    addAssistantMessage(alertText, { reservationInfo: reservation });
  }, [addAssistantMessage, messages, showToast]);

  const clearChatHistory = useCallback(() => {
    setMessages([]);
    contextRef.current = createEmptyContext();
    sessionIdRef.current = null;
    setIsHistoryCollapsed(false);
    setCollapsedCount(0);
    setVisibleCount(0);
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CHAT_HISTORY);
      if (raw) {
        const allHistory = JSON.parse(raw);
        delete allHistory['default'];
        localStorage.setItem(STORAGE_KEY_CHAT_HISTORY, JSON.stringify(allHistory));
      }
    } catch (e) {
      console.error('Failed to clear chat history:', e);
    }
  }, []);

  const updateMessageById = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg)));
  }, []);

  const updateOrderCardInMessage = useCallback((messageId: string, order: any) => {
    const orderCard = convertOrderDataToCardData(order);
    updateMessageById(messageId, { orderCard });
  }, [updateMessageById]);

  const findOrderCardMessage = useCallback((orderId: string): ChatMessage | null => {
    return messages.find(m => m.orderCard && (m.orderCard.id === orderId || (m.orderCard as any).orderId === orderId)) || null;
  }, [messages]);

  const placeOrder = useCallback(async (orderId: string) => {
    const msg = findOrderCardMessage(orderId);
    if (!msg?.orderCard) return;

    addAssistantMessage('好的，正在为您提交点单申请，请稍候...');

    await new Promise(resolve => setTimeout(resolve, 1200));

    const updatedOrder = {
      orderId,
      channel: 'douyin',
      status: 'confirmed',
      redeemMethod: 'self_order',
      supportedRedeemMethods: ['self_order', 'delivery'],
      category: 'food',
      store: msg.orderCard.storeName,
      storeName: msg.orderCard.storeName,
      itemSummary: msg.orderCard.productName,
      totalAmount: msg.orderCard.price * 100,
      productImage: msg.orderCard.thumbnail,
      tags: msg.orderCard.tags,
      distance: msg.orderCard.distance,
      progress: [
        { label: '提交订单', state: 'done' },
        { label: '商家接单', state: 'done' },
        { label: '备餐中', state: 'active' },
      ],
    };

    updateOrderCardInMessage(msg.id, updatedOrder);
    addAssistantMessage('✅ 商家已接单，正在为您备餐，请耐心等待~');
  }, [findOrderCardMessage, updateOrderCardInMessage, addAssistantMessage]);

  const startDelivery = useCallback(async (orderId: string) => {
    const msg = findOrderCardMessage(orderId);
    if (!msg?.orderCard) return;

    addAssistantMessage('好的，正在为您安排配送，请稍候...');

    await new Promise(resolve => setTimeout(resolve, 1000));

    const confirmedOrder: any = {
      orderId,
      channel: 'douyin',
      status: 'confirmed',
      redeemMethod: 'delivery',
      supportedRedeemMethods: ['self_order', 'delivery'],
      category: 'food',
      store: msg.orderCard.storeName,
      storeName: msg.orderCard.storeName,
      itemSummary: msg.orderCard.productName,
      totalAmount: msg.orderCard.price * 100,
      productImage: msg.orderCard.thumbnail,
      tags: msg.orderCard.tags,
      distance: msg.orderCard.distance,
      estimatedArrival: '约30分钟',
    };
    updateOrderCardInMessage(msg.id, confirmedOrder);

    await new Promise(resolve => setTimeout(resolve, 1500));

    const deliveryOrder: any = {
      ...confirmedOrder,
      status: 'in_delivery',
      riderName: '张师傅',
      estimatedArrival: '约20分钟',
      deliveryProgress: [
        { label: '订单提交', state: 'done' },
        { label: '商家接单', state: 'done' },
        { label: '骑手取餐', state: 'done' },
        { label: '配送中', state: 'active' },
        { label: '已送达', state: 'pending' },
      ],
    };
    updateOrderCardInMessage(msg.id, deliveryOrder);
    addAssistantMessage('🛵 骑手已取餐，正在飞速赶往您的位置，预计20分钟送达~');

    await new Promise(resolve => setTimeout(resolve, 2000));

    const completedOrder: any = {
      ...deliveryOrder,
      status: 'completed',
      deliveryProgress: [
        { label: '订单提交', state: 'done' },
        { label: '商家接单', state: 'done' },
        { label: '骑手取餐', state: 'done' },
        { label: '配送中', state: 'done' },
        { label: '已送达', state: 'done' },
      ],
    };
    updateOrderCardInMessage(msg.id, completedOrder);
    addAssistantMessage('🎉 订单已送达！请您享用美食，期待您的好评~');
  }, [findOrderCardMessage, updateOrderCardInMessage, addAssistantMessage]);

  const submitFeatureCard = useCallback(async (cardType: string, data: Record<string, unknown>) => {
    console.log('submitFeatureCard:', cardType, data);

    switch (cardType) {
      case 'redeem_reminder':
        addAssistantMessage('好的，使用提醒已设置，我会在指定时间提醒您。');
        break;
      case 'reservation_form':
        addAssistantMessage('预约申请已提交，商家确认后会第一时间通知您。');
        break;
      case 'urgent_request':
        addAssistantMessage('加急请求已提交，我们会尽快为您处理，请保持电话畅通。');
        break;
      case 'reorder': {
        const newOrder = data.newOrder as OrderCardData;
        const originalOrder = data.originalOrder as OrderCardData;

        addAssistantMessage('好的，正在为您重新下单，请稍候...');

        if (newOrder) {
          contextRef.current.currentOrderId = newOrder.id;
          setCurrentOrderId(newOrder.id);
          contextRef.current.orderContext = {
            category: newOrder.category,
            productType: newOrder.productType,
            status: newOrder.orderStatus,
            refundStage: 'none',
          };

          addAssistantMessage('', { orderCard: newOrder });

          await new Promise(resolve => setTimeout(resolve, 1000));

          const confirmedOrder = {
            ...newOrder,
            orderStatus: 'preparing' as const,
            orderStatusLabel: '备餐中',
            statusText: '备餐中 · 约15分钟',
            statusColor: '#f59e0b',
            extension: {
              type: 'pickup_code' as const,
              title: '取餐码',
              pickupCode: 'A' + Math.floor(1000 + Math.random() * 9000),
              steps: [
                { label: '提交订单', state: 'done' as const },
                { label: '商家接单', state: 'done' as const },
                { label: '备餐中', state: 'active' as const },
                { label: '待取餐', state: 'pending' as const },
              ],
            },
          };

          const lastOrderMsg = messages.reduceRight<ChatMessage | null>((found, msg) => {
            if (found) return found;
            if (msg.orderCard && msg.orderCard.id === newOrder.id) return msg;
            return null;
          }, null);

          if (lastOrderMsg) {
            updateOrderCardInMessage(lastOrderMsg.id, confirmedOrder);
          }

          addAssistantMessage('✅ 商家已接单，正在为您备餐，请耐心等待~');
        } else if (originalOrder) {
          const clonedOrder = createReorderFromOriginal(originalOrder);
          contextRef.current.currentOrderId = clonedOrder.id;
          setCurrentOrderId(clonedOrder.id);
          contextRef.current.orderContext = {
            category: clonedOrder.category,
            productType: clonedOrder.productType,
            status: clonedOrder.orderStatus,
            refundStage: 'none',
          };
          addAssistantMessage('', { orderCard: clonedOrder });
        }
        break;
      }
      case 'refund_apply':
        addAssistantMessage('退款申请已提交，预计1-3个工作日内处理完成，退款将原路返回。');
        break;
      default:
        addAssistantMessage('操作成功');
    }
  }, [addAssistantMessage, updateOrderCardInMessage, messages]);

  const cancelFeatureCard = useCallback(() => {
    console.log('cancelFeatureCard');
  }, []);

  const findLastOrderCard = useCallback((): OrderCardData | undefined => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].orderCard) {
        return messages[i].orderCard;
      }
    }
    return undefined;
  }, [messages]);

  const sendNluResponse = useCallback(
    (responseMessages: NluResponseMessage[]) => {
      let totalDelay = 0;
      responseMessages.forEach((msg, index) => {
        const delay = msg.delay ?? (index === 0 ? 400 : 600);
        totalDelay += delay;
        setTimeout(() => {
          addAssistantMessage(msg.content || '', {
            quickReplies: msg.quickReplies,
            orderCard: msg.orderCard,
            featureCard: msg.featureCard,
            reservationInfo: msg.reservationInfo,
            redeemReminder: msg.redeemReminder,
          });
        }, totalDelay);
      });
      return totalDelay;
    },
    [addAssistantMessage]
  );

  const sendMessage = useCallback(
    async (message: string) => {
      if (degradeLevel === 'L2') return;

      addUserMessage(message);
      setIsLoading(true);
      contextRef.current.conversationTurns += 1;
      contextRef.current.lastActiveAt = Date.now();

      if (USE_LOCAL_NLU) {
        try {
          const lastOrderCard = findLastOrderCard();
          const currentDialogState = contextRef.current.dialogState || createInitialDialogState();

          const nluContext: NluContext = {
            sessionId: sessionIdRef.current || contextRef.current.sessionId,
            dialogState: currentDialogState,
            currentOrderId: currentOrderId,
            orderCard: lastOrderCard,
            conversationTurns: contextRef.current.conversationTurns,
            resolvedQuestions: contextRef.current.resolvedQuestions,
          };

          const response = processNluMessage(message, nluContext);

          contextRef.current.dialogState = response.newDialogState;

          if (response.newSessionId) {
            sessionIdRef.current = response.newSessionId;
            contextRef.current.sessionId = response.newSessionId;
          }

          const totalDelay = sendNluResponse(response.messages);

          setTimeout(() => {
            setIsLoading(false);
          }, totalDelay + 200);

          return;
        } catch (e) {
          console.error('NLU processing error:', e);
          addAssistantMessage('抱歉，处理您的问题时出现了错误，请稍后再试。');
          setIsLoading(false);
          return;
        }
      }

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
        if (!USE_LOCAL_NLU) {
          setIsLoading(false);
        }
      }
    },
    [degradeLevel, addUserMessage, addAssistantMessage, currentOrderId, findLastOrderCard, sendNluResponse]
  );

  const openAssistant = useCallback(
    async (orderId?: string, source: EntrySource = 'order_list') => {
      setEntrySource(source);
      setCurrentOrderId(orderId);
      setOverlayMode('minimized');
      setTransferHuman('idle');
      setHasUnread(false);

      const lastEntry = loadLastEntry();
      const savedHistory = loadChatHistory();

      let currentOrder: OrderData | null = null;
      let currentOrderListItem: OrderListItem | null = null;

      if (orderId) {
        try {
          const order = await getOrder(orderId);
          if (order) {
            currentOrder = order;
          } else {
            const localOrder = ORDER_LIST.find(o => o.orderId === orderId) || null;
            if (localOrder) {
              currentOrderListItem = localOrder;
            }
          }
        } catch {
          const localOrder = ORDER_LIST.find(o => o.orderId === orderId) || null;
          if (localOrder) {
            currentOrderListItem = localOrder;
          }
        }
      }

      let initialMessages: ChatMessage[] = [];
      let isNewOrderCard = false;
      let newOrderCardMessageIndex = -1;

      if (savedHistory) {
        contextRef.current = savedHistory.context;
        sessionIdRef.current = savedHistory.context.sessionId;
        initialMessages = [...savedHistory.messages];
      } else {
        contextRef.current = createEmptyContext();
        sessionIdRef.current = contextRef.current.sessionId;

        const welcome: ChatMessage = {
          id: genId(),
          role: 'assistant',
          contentType: 'text',
          content: `你好呀！我是${BRAND_NAME}，有什么可以帮你的吗？`,
          timestamp: Date.now(),
        };
        initialMessages.push(welcome);
      }

      if (orderId && (currentOrder || currentOrderListItem)) {
        if (currentOrder) {
          contextRef.current.currentOrderId = orderId;
          contextRef.current.orderContext = {
            category: currentOrder.category,
            productType: currentOrder.productType,
            status: currentOrder.status,
            refundStage: 'none',
          };
        } else if (currentOrderListItem) {
          contextRef.current.currentOrderId = orderId;
          contextRef.current.orderContext = {
            category: currentOrderListItem.category,
            status: currentOrderListItem.statusText,
            refundStage: 'none',
          };
        }

        const orderCard = currentOrder
          ? convertOrderDataToCardData(currentOrder)
          : convertOrderListItemToCardData(currentOrderListItem!);

        if (source === 'order_detail' || source === 'bubble') {
          const reminder = getReminderByOrder(orderId);
          const hasActiveReminder = reminder && reminder.status === 'active';

          const hasOrderCard = initialMessages.some((msg) => {
            const msgOrderId = msg.orderCard?.id || (msg.orderCard as any)?.orderId;
            return msg.orderCard && msgOrderId === orderId;
          });

          if (!hasOrderCard) {
            isNewOrderCard = true;
            newOrderCardMessageIndex = initialMessages.length;

            const cardMessage: ChatMessage = {
              id: genId(),
              role: 'assistant',
              contentType: 'text',
              content: '',
              orderCard,
              ...(hasActiveReminder ? { redeemReminder: reminder } : {}),
              timestamp: Date.now(),
            };
            initialMessages.push(cardMessage);
          }
        }
      }

      const collapseState = loadCollapseState();
      let initialCollapsed = false;
      let initialCollapsedCount = 0;
      let initialVisibleCount = 2;

      if (source === 'order_list' || !orderId) {
        const lastSource = lastEntry?.source;
        initialVisibleCount = lastSource === 'order_detail'
          ? COLLAPSE_VISIBLE_COUNT_ORDER_LIST_FROM_DETAIL
          : COLLAPSE_VISIBLE_COUNT_ORDER_LIST_DEFAULT;
        initialCollapsed = initialMessages.length > initialVisibleCount;
        initialCollapsedCount = Math.max(0, initialMessages.length - initialVisibleCount);
      } else {
        const isSameOrder = lastEntry?.source === 'order_detail' && lastEntry.orderId === orderId;
        if (isSameOrder) {
          const saved = collapseState[orderId];
          if (saved) {
            initialCollapsed = saved.collapsed;
            initialVisibleCount = saved.visibleCount;
            if (initialCollapsed) {
              const orderCardIndex = initialMessages.findIndex(
                (msg) => msg.orderCard && (msg.orderCard.id || (msg.orderCard as any).orderId) === orderId
              );
              initialCollapsedCount = orderCardIndex >= 0 ? orderCardIndex : Math.max(0, initialMessages.length - initialVisibleCount);
            } else {
              initialCollapsedCount = 0;
            }
          } else {
            initialCollapsed = true;
            initialVisibleCount = COLLAPSE_VISIBLE_COUNT_NEW_ORDER;
            const orderCardIndex = initialMessages.findIndex(
              (msg) => msg.orderCard && (msg.orderCard.id || (msg.orderCard as any).orderId) === orderId
            );
            initialCollapsedCount = orderCardIndex >= 0 ? orderCardIndex : Math.max(0, initialMessages.length - initialVisibleCount);
          }
        } else {
          initialCollapsed = true;
          initialVisibleCount = COLLAPSE_VISIBLE_COUNT_NEW_ORDER;
          if (isNewOrderCard) {
            initialCollapsedCount = newOrderCardMessageIndex >= 0 ? newOrderCardMessageIndex : 0;
          } else {
            const orderCardIndex = initialMessages.findIndex(
              (msg) => msg.orderCard && (msg.orderCard.id || (msg.orderCard as any).orderId) === orderId
            );
            initialCollapsedCount = orderCardIndex >= 0 ? orderCardIndex : Math.max(0, initialMessages.length - initialVisibleCount);
          }
        }
      }

      setIsHistoryCollapsed(initialCollapsed);
      setCollapsedCount(initialCollapsedCount);
      setVisibleCount(initialVisibleCount);

      const savedReservations = loadSavedReservations();
      const allReservations: Record<string, ReservationInfoCardData> = { ...savedReservations };

      const updatedMessages = initialMessages.map((msg) => {
        if (msg.reservationInfo && msg.reservationInfo.orderId) {
          const orderId = msg.reservationInfo.orderId;
          if (savedReservations[orderId]) {
            return {
              ...msg,
              reservationInfo: savedReservations[orderId],
            };
          }
        }
        return msg;
      });

      updatedMessages.forEach((msg) => {
        if (msg.reservationInfo && msg.reservationInfo.orderId) {
          const orderId = msg.reservationInfo.orderId;
          if (!allReservations[orderId]) {
            allReservations[orderId] = msg.reservationInfo;
          }
        }
      });

      const now = Date.now();
      const timedOutReservations: Array<{ orderId: string; reservation: ReservationInfoCardData; messageId: string }> = [];
      const pendingReservations: Array<{ orderId: string; reservation: ReservationInfoCardData; messageId: string }> = [];

      updatedMessages.forEach((msg) => {
        if (msg.reservationInfo && msg.reservationInfo.orderId && msg.reservationInfo.acceptStatus === 'pending') {
          const orderId = msg.reservationInfo.orderId;
          const reservation = allReservations[orderId] || msg.reservationInfo;
          if (reservation.acceptDeadlineAt && reservation.acceptDeadlineAt <= now) {
            timedOutReservations.push({ orderId, reservation, messageId: msg.id });
          } else {
            pendingReservations.push({ orderId, reservation, messageId: msg.id });
          }
        }
      });

      let finalMessages = updatedMessages;
      const updatedReservations: Record<string, ReservationInfoCardData> = { ...allReservations };

      if (timedOutReservations.length > 0) {
        finalMessages = updatedMessages.map((msg) => {
          const timedOut = timedOutReservations.find(t => t.messageId === msg.id);
          if (timedOut) {
            const updated = {
              ...timedOut.reservation,
              acceptStatus: 'failed' as const,
              failReason: 'timeout' as const,
            };
            updatedReservations[timedOut.orderId] = updated;
            return {
              ...msg,
              content: '预约超时，商家未接单',
              reservationInfo: updated,
            };
          }
          return msg;
        });
      }

      setMessages(finalMessages);
      setReservationsByOrder(updatedReservations);

      pendingReservations.forEach(({ orderId, reservation, messageId }) => {
        const timeoutDelay = Math.max(0, (reservation.acceptDeadlineAt || 0) - now);
        const responseDelay = 3000 + Math.random() * 5000;
        const simulateDelay = Math.min(responseDelay, timeoutDelay - 500);
        if (simulateDelay > 0) {
          const simulateTimer = setTimeout(() => {
            const random = Math.random();
            if (random < 0.6) {
              updateReservationStatus(messageId, reservation, 'accepted');
            } else if (random < 0.85) {
              updateReservationStatus(messageId, reservation, 'failed', 'rejected');
            }
          }, simulateDelay);
          const timeoutTimer = setTimeout(() => {
            clearTimeout(simulateTimer);
            updateReservationStatus(messageId, reservation, 'failed', 'timeout');
          }, timeoutDelay);
          reservationTimersRef.current[orderId] = { simulate: simulateTimer, timeout: timeoutTimer };
        }
      });

      const reservationsFromHistory: Record<string, ReservationInfoCardData> = {};
      finalMessages.forEach((msg) => {
        if (msg.reservationInfo && msg.reservationInfo.orderId) {
          const orderId = msg.reservationInfo.orderId;
          if (!savedReservations[orderId]) {
            reservationsFromHistory[orderId] = msg.reservationInfo;
          }
        }
      });
      if (Object.keys(reservationsFromHistory).length > 0) {
        setReservationsByOrder((prev) => ({ ...prev, ...reservationsFromHistory }));
      }

      contextRef.current.lastActiveAt = Date.now();

      if (source === 'order_detail' && orderId) {
        collapseState[orderId] = {
          collapsed: initialCollapsed,
          visibleCount: initialVisibleCount,
        };
        saveCollapseState(collapseState);
      }

      saveLastEntry({
        source,
        orderId,
      });
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

  const toggleHistoryCollapsed = useCallback(() => {
    setIsHistoryCollapsed((prev) => {
      const newState = !prev;
      const collapseState = loadCollapseState();
      const key = entrySource === 'order_list' ? 'order_list' : (currentOrderId || 'order_list');

      if (newState) {
        const currentVisibleCount = entrySource === 'order_list'
          ? (collapseState[key]?.visibleCount || 2)
          : (collapseState[key]?.visibleCount || 1);
        collapseState[key] = {
          collapsed: true,
          visibleCount: currentVisibleCount,
        };
      } else {
        collapseState[key] = {
          collapsed: false,
          visibleCount: collapseState[key]?.visibleCount || (entrySource === 'order_list' ? 2 : 1),
        };
      }

      saveCollapseState(collapseState);

      if (newState) {
        let newCollapsedCount = 0;
        const vc = collapseState[key]?.visibleCount || 2;
        if (entrySource === 'order_list' || !currentOrderId) {
          newCollapsedCount = Math.max(0, messages.length - vc);
        } else {
          const orderCardIndex = messages.findIndex(
            (msg) => msg.orderCard && (msg.orderCard.id || (msg.orderCard as any).orderId) === currentOrderId
          );
          newCollapsedCount = orderCardIndex >= 0 ? orderCardIndex : Math.max(0, messages.length - vc);
        }
        setCollapsedCount(newCollapsedCount);
      } else {
        setCollapsedCount(0);
      }

      return newState;
    });
  }, [entrySource, currentOrderId, messages]);

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

  const closeAllSheets = useCallback(() => {
    setReminderSheetOpen(false);
    setReservationPanelOpen(false);
    setVoucherSheetOpen(false);
  }, []);

  const executeAction = useCallback((action: MessageAction) => {
    const findCurrentOrderCard = (): OrderCardData | null => {
      const targetOrderId = (action as any).orderId || currentOrderId;
      if (!targetOrderId) return null;
      const msg = messages.find(m => m.orderCard && m.orderCard.id === targetOrderId);
      return msg?.orderCard || null;
    };

    switch (action.kind) {
      case 'set_redeem_reminder':
        closeAllSheets();
        setReminderSheetOrderId(action.orderId);
        setReminderSheetOpen(true);
        break;
      case 'open_reservation': {
        const orderId = (action as any).orderId || currentOrderId;
        if (orderId && orderId !== currentOrderId) {
          setCurrentOrderId(orderId);
          contextRef.current.currentOrderId = orderId;
        }
        const existing = orderId ? reservationsByOrder[orderId] : null;
        if (existing && (existing.acceptStatus === 'pending' || existing.acceptStatus === 'accepted')) {
          showExistingReservationAlert(existing);
          return;
        }
        closeAllSheets();
        setReservationStoreName((action as any).storeName || '预约门店');
        setReservationPanelOpen(true);
        break;
      }
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
          const currentOrder = findCurrentOrderCard();
          featureCardData = {
            type: 'reorder',
            title: '再来一单',
            reorder: {
              productName: currentOrder?.productName || '招牌奶茶套餐',
              storeName: currentOrder?.storeName || '茶百道(科技园店)',
              price: currentOrder?.price || 28.8,
              thumbnail: currentOrder?.thumbnail || 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=bubble%20tea%20drink%20product%20photo&image_size=square',
              orderData: currentOrder || undefined,
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
  }, [addAssistantMessage, closeAllSheets, currentOrderId, messages, reservationsByOrder, showExistingReservationAlert, setCurrentOrderId]);

  const openReminderSheet = useCallback((orderId: string, productName?: string, validDate?: string) => {
    closeAllSheets();
    setReminderSheetOrderId(orderId);
    setReminderSheetProductName(productName);
    setReminderSheetValidDate(validDate);
    setReminderSheetOpen(true);
  }, [closeAllSheets]);

  const closeReminderSheet = useCallback(() => {
    setReminderSheetOpen(false);
    setReminderEditMode('new');
    setReminderFromMessageId(null);
  }, []);

  const confirmReminder = useCallback((reminder: RedeemReminder) => {
    console.log('Reminder confirmed:', reminder);
    setReminderSheetOpen(false);

    const isModify = reminderEditMode === 'modify' || reminderEditMode === 'reset';
    if (isModify && reminderFromMessageId) {
      updateMessageById(reminderFromMessageId, {
        content: '已为您更新使用提醒',
        redeemReminder: reminder,
      });
    } else {
      const orderCardMsg = messages.find((m) => m.orderCard && m.orderCard.id === reminder.orderId);
      const orderCard = orderCardMsg?.orderCard;
      addAssistantMessage('', { redeemReminder: reminder, orderCard });
    }

    setReminderEditMode('new');
    setReminderFromMessageId(null);
  }, [addAssistantMessage, updateMessageById, reminderEditMode, reminderFromMessageId, messages]);

  const openReservationPanel = useCallback((storeName: string, businessHours?: string, mode: 'new' | 'rebook' = 'new', initialData?: ReservationInfoCardData, messageId?: string) => {
    closeAllSheets();
    setReservationStoreName(storeName);
    setReservationBusinessHours(businessHours);
    setReservationEditMode(mode);
    setEditingReservation(initialData || null);
    setRebookFromMessageId(messageId || null);
    setReservationPanelOpen(true);
  }, [closeAllSheets]);

  const closeReservationPanel = useCallback(() => {
    setReservationPanelOpen(false);
    setReservationEditMode('new');
    setEditingReservation(null);
    setRebookFromMessageId(null);
  }, []);

  const clearReservationTimers = useCallback((orderId: string) => {
    const timers = reservationTimersRef.current[orderId];
    if (timers) {
      clearTimeout(timers.simulate);
      clearTimeout(timers.timeout);
      delete reservationTimersRef.current[orderId];
    }
  }, []);

  const updateReservationStatus = useCallback((
    messageId: string,
    reservation: ReservationInfoCardData,
    newStatus: 'accepted' | 'failed' | 'canceled',
    failReason?: 'timeout' | 'rejected'
  ) => {
    const updatedReservation = {
      ...reservation,
      acceptStatus: newStatus as const,
      ...(newStatus === 'accepted' ? { merchantAcceptAt: Date.now() } : {}),
      ...(newStatus === 'failed' && failReason ? { failReason } : {}),
    };
    let content = '';
    if (newStatus === 'accepted') {
      content = '商家已接单，预约成功';
    } else if (newStatus === 'failed') {
      content = failReason === 'rejected' ? '商家拒绝了您的预约' : '预约超时，商家未接单';
    } else if (newStatus === 'canceled') {
      content = '预约已取消';
    }
    updateMessageById(messageId, {
      content,
      reservationInfo: updatedReservation,
    });
    const orderId = reservation.orderId;
    if (orderId) {
      setReservationsByOrder((prev) => ({
        ...prev,
        [orderId]: updatedReservation,
      }));
      clearReservationTimers(orderId);
      if (newStatus === 'failed' && failReason === 'timeout') {
        showToast('预约超时，商家未接单');
      }
    }
    return updatedReservation;
  }, [updateMessageById, clearReservationTimers, showToast]);

  const confirmReservation = useCallback((data: ReservationInfoCardData) => {
    console.log('Reservation confirmed:', data);
    setReservationPanelOpen(false);
    const isRebook = reservationEditMode === 'rebook';
    const reservationNo = data.reservationNo || `YY${Date.now().toString().slice(-10)}`;
    const newReservationInfo = {
      ...data,
      reservationNo,
      serviceType: data.serviceType || '堂食预约',
      acceptStatus: 'pending' as const,
      acceptDeadlineAt: Date.now() + 5 * 60 * 1000,
      ...(currentOrderId ? { orderId: currentOrderId } : {}),
    };
    let targetMessageId: string | null = null;
    if (isRebook && rebookFromMessageId) {
      updateMessageById(rebookFromMessageId, {
        content: '已为您重新提交预约申请',
        reservationInfo: newReservationInfo,
      });
      targetMessageId = rebookFromMessageId;
    } else {
      let existingMsgId: string | null = null;
      if (currentOrderId) {
        const existingMsg = messages.reduceRight<ChatMessage | null>((found, msg) => {
          if (found) return found;
          if (msg.reservationInfo && msg.reservationInfo.orderId === currentOrderId) {
            return msg;
          }
          return null;
        }, null);
        if (existingMsg) {
          existingMsgId = existingMsg.id;
        }
      }
      if (existingMsgId) {
        updateMessageById(existingMsgId, {
          content: '已为您重新提交预约申请',
          reservationInfo: newReservationInfo,
        });
        targetMessageId = existingMsgId;
      } else {
        const msg = addAssistantMessage('已为您提交预约申请', {
          reservationInfo: newReservationInfo,
        });
        targetMessageId = msg.id;
      }
    }
    if (currentOrderId) {
      setReservationsByOrder((prev) => ({
        ...prev,
        [currentOrderId]: newReservationInfo,
      }));
    }
    setReservationEditMode('new');
    setEditingReservation(null);
    setRebookFromMessageId(null);

    if (targetMessageId && currentOrderId) {
      clearReservationTimers(currentOrderId);
      const responseDelay = 3000 + Math.random() * 5000;
      const timeoutDelay = Math.max(0, (newReservationInfo.acceptDeadlineAt || 0) - Date.now());
      const simulateTimer = setTimeout(() => {
        const random = Math.random();
        if (random < 0.6) {
          updateReservationStatus(targetMessageId!, newReservationInfo, 'accepted');
        } else if (random < 0.85) {
          updateReservationStatus(targetMessageId!, newReservationInfo, 'failed', 'rejected');
        }
      }, Math.min(responseDelay, timeoutDelay - 500));
      const timeoutTimer = setTimeout(() => {
        clearTimeout(simulateTimer);
        updateReservationStatus(targetMessageId!, newReservationInfo, 'failed', 'timeout');
      }, timeoutDelay);
      reservationTimersRef.current[currentOrderId] = { simulate: simulateTimer, timeout: timeoutTimer };
    }
  }, [addAssistantMessage, updateMessageById, updateReservationStatus, reservationEditMode, rebookFromMessageId, currentOrderId, messages, clearReservationTimers]);

  const cancelReservation = useCallback((messageId: string, reservation: ReservationInfoCardData) => {
    console.log('Cancel reservation:', reservation);
    const canceledReservation = {
      ...reservation,
      acceptStatus: 'canceled' as const,
    };
    updateMessageById(messageId, {
      content: '预约已取消',
      reservationInfo: canceledReservation,
    });
    if (currentOrderId) {
      setReservationsByOrder((prev) => ({
        ...prev,
        [currentOrderId]: { ...canceledReservation, orderId: currentOrderId },
      }));
      clearReservationTimers(currentOrderId);
    } else if (reservation.orderId) {
      setReservationsByOrder((prev) => ({
        ...prev,
        [reservation.orderId]: { ...canceledReservation, orderId: reservation.orderId },
      }));
      clearReservationTimers(reservation.orderId);
    }
  }, [updateMessageById, currentOrderId, clearReservationTimers]);

  const rebookReservation = useCallback((messageId: string, reservation: ReservationInfoCardData) => {
    console.log('Rebook reservation:', reservation);
    openReservationPanel(reservation.storeName, reservation.businessHours, 'rebook', reservation, messageId);
  }, [openReservationPanel]);

  const cancelOrderReservation = useCallback((orderId: string) => {
    console.log('Cancel order reservation:', orderId);
    const reservation = reservationsByOrder[orderId];
    if (!reservation) return;
    const canceledReservation = {
      ...reservation,
      acceptStatus: 'canceled' as const,
    };
    setReservationsByOrder((prev) => ({
      ...prev,
      [orderId]: canceledReservation,
    }));
    clearReservationTimers(orderId);
    const relatedMsg = messages.find((m) => m.reservationInfo && m.reservationInfo.orderId === orderId);
    if (relatedMsg) {
      updateMessageById(relatedMsg.id, {
        content: '预约已取消',
        reservationInfo: canceledReservation,
      });
    }
  }, [reservationsByOrder, messages, updateMessageById, clearReservationTimers]);

  const rebookOrderReservation = useCallback((orderId: string) => {
    console.log('Rebook order reservation:', orderId);
    const reservation = reservationsByOrder[orderId];
    if (!reservation) return;
    openReservationPanel(reservation.storeName, reservation.businessHours, 'rebook', reservation);
  }, [reservationsByOrder, openReservationPanel]);

  const cancelReminder = useCallback((orderId: string) => {
    console.log('Cancel reminder:', orderId);
    cancelReminderStorage(orderId);
    const relatedMsg = messages.find((m) => m.redeemReminder && m.orderCard?.id === orderId);
    if (relatedMsg && relatedMsg.redeemReminder) {
      const canceledReminder = { ...relatedMsg.redeemReminder, status: 'canceled' as const };
      updateMessageById(relatedMsg.id, {
        content: '使用提醒已取消',
        redeemReminder: canceledReminder,
      });
    }
  }, [messages, updateMessageById]);

  const modifyReminder = useCallback((orderId: string, productName?: string, validDate?: string) => {
    console.log('Modify reminder:', orderId);
    const relatedMsg = messages.find((m) => m.redeemReminder && m.orderCard?.id === orderId);
    if (relatedMsg) {
      setReminderEditMode('modify');
      setReminderFromMessageId(relatedMsg.id);
    }
    openReminderSheet(orderId, productName, validDate);
  }, [messages, openReminderSheet]);

  const resetReminder = useCallback((orderId: string, productName?: string, validDate?: string) => {
    console.log('Reset reminder:', orderId);
    const relatedMsg = messages.find((m) => m.redeemReminder && m.orderCard?.id === orderId);
    if (relatedMsg) {
      setReminderEditMode('reset');
      setReminderFromMessageId(relatedMsg.id);
    }
    openReminderSheet(orderId, productName, validDate);
  }, [messages, openReminderSheet]);

  const openVoucherSheet = useCallback((storeName: string, productName: string, voucherCode: string) => {
    closeAllSheets();
    setVoucherSheetStoreName(storeName);
    setVoucherSheetProductName(productName);
    setVoucherSheetVoucherCode(voucherCode);
    setVoucherSheetOpen(true);
  }, [closeAllSheets]);

  const closeVoucherSheet = useCallback(() => {
    setVoucherSheetOpen(false);
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

  useEffect(() => {
    if (overlayMode === 'closed') return;
    saveChatHistory(messages, contextRef.current);
  }, [messages, overlayMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(reservationsByOrder));
    } catch (e) {
      console.error('Failed to save reservations:', e);
    }
  }, [reservationsByOrder]);

  useEffect(() => {
    const now = Date.now();
    const updated: Record<string, ReservationInfoCardData> = {};
    let hasChanges = false;

    Object.entries(reservationsByOrder).forEach(([orderId, reservation]) => {
      if (reservation.acceptStatus === 'pending' && reservation.acceptDeadlineAt && reservation.acceptDeadlineAt <= now) {
        updated[orderId] = {
          ...reservation,
          acceptStatus: 'failed',
          failReason: 'timeout',
        };
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setReservationsByOrder((prev) => ({ ...prev, ...updated }));
    }
  }, []);

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
    isHistoryCollapsed,
    collapsedCount,
    visibleCount,
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
    voucherSheetOpen,
    voucherSheetStoreName,
    voucherSheetProductName,
    voucherSheetVoucherCode,
    openAssistant,
    closeAssistant,
    toggleFullscreen,
    toggleHistoryCollapsed,
    sendMessage,
    triggerBubble,
    clickBubble,
    hideBubble,
    markAsRead: () => setHasUnread(false),
    switchOrder: () => {},
    executeAction,
    clickGuidedQuestion,
    submitFeatureCard,
    cancelFeatureCard,
    checkServiceHealth,
    setDegradeLevel,
    resetSession: () => {
      setMessages([]);
      contextRef.current = createEmptyContext();
      sessionIdRef.current = '';
      closeAssistant();
      setTransferHuman('idle');
      try {
        const raw = localStorage.getItem(STORAGE_KEY_CHAT_HISTORY);
        if (raw) {
          const allHistory = JSON.parse(raw) as Record<string, unknown>;
          delete allHistory['default'];
          localStorage.setItem(STORAGE_KEY_CHAT_HISTORY, JSON.stringify(allHistory));
        }
      } catch {
        // ignore
      }
    },
    setTransferHuman,
    transferHuman,
    wsState,
    showToast,
    toastText,
    dismissNotification: () => {},
    openReminderSheet,
    closeReminderSheet,
    confirmReminder,
    cancelReminder,
    modifyReminder,
    resetReminder,
    openReservationPanel,
    closeReservationPanel,
    confirmReservation,
    cancelReservation,
    rebookReservation,
    reservationEditMode,
    editingReservation,
    openVoucherSheet,
    closeVoucherSheet,
    reservationsByOrder,
    cancelOrderReservation,
    rebookOrderReservation,
    onOpenReservation,
    sendOrderCard,
    placeOrder,
    startDelivery,
    checkExistingReservation,
    showExistingReservationAlert,
    clearChatHistory,
  };

  return (
    <AiAssistantContext.Provider value={value as any}>
      {children}
    </AiAssistantContext.Provider>
  );
};

export default AiAssistantProvider;
