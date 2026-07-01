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
  COLLAPSE_VISIBLE_COUNT,
} from './constants';
import { chat, getOrder } from './api';
import { convertOrderDataToCardData, convertOrderListItemToCardData } from './orderDataAdapter';
import { ORDER_LIST } from '../../mock';
import {
  cancelReminder as cancelReminderStorage,
  setReminder as setReminderStorage,
  getReminderByOrder,
} from '../../redeemReminder';
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
    return JSON.parse(raw) as CollapseState;
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
  const [reservationsByOrder, setReservationsByOrder] = useState<Record<string, ReservationInfoCardData>>(initialReservations);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [collapsedCount, setCollapsedCount] = useState(0);

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
      status: orderCard.status,
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

  const showExistingReservationAlert = useCallback((reservation: ReservationInfoCardData) => {
    const isPending = reservation.acceptStatus === 'pending';
    const alertText = isPending ? '已经有预约进行中' : '已经有预约成功';
    addAssistantMessage(alertText, { reservationInfo: reservation });
  }, [addAssistantMessage]);

  const updateMessageById = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg)));
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

        if (source === 'order_detail') {
          const lastOrderCardOrderId = findLastOrderCardOrderId(initialMessages);
          const currentOrderCardId = orderCard.id || (orderCard as any).orderId;
          if (lastOrderCardOrderId !== currentOrderCardId) {
            isNewOrderCard = true;
            newOrderCardMessageIndex = initialMessages.length;
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
        }

        const reminder = getReminderByOrder(orderId);
        if (reminder && reminder.status === 'active') {
          const hasReminderCard = hasReminderCardInLastN(initialMessages, orderId, 3);
          if (!hasReminderCard) {
            const reminderMessage: ChatMessage = {
              id: genId(),
              role: 'assistant',
              contentType: 'text',
              content: '已为您设置使用提醒',
              redeemReminder: reminder,
              orderCard,
              timestamp: Date.now(),
            };
            initialMessages.push(reminderMessage);
          }
        }
      }

      const collapseState = loadCollapseState();
      let initialCollapsed = false;
      let initialCollapsedCount = 0;

      if (source === 'order_list' || !orderId) {
        const key = 'order_list';
        if (collapseState[key] !== undefined) {
          initialCollapsed = collapseState[key]!;
        } else {
          initialCollapsed = initialMessages.length > COLLAPSE_VISIBLE_COUNT;
        }
        initialCollapsedCount = Math.max(0, initialMessages.length - COLLAPSE_VISIBLE_COUNT);
      } else {
        if (isNewOrderCard) {
          initialCollapsed = true;
          initialCollapsedCount = newOrderCardMessageIndex >= 0 ? newOrderCardMessageIndex : 0;
        } else {
          if (collapseState[orderId] !== undefined) {
            initialCollapsed = collapseState[orderId]!;
          } else {
            initialCollapsed = false;
          }
          if (initialCollapsed) {
            const orderCardIndex = initialMessages.findIndex(
              (msg) => msg.orderCard && (msg.orderCard.id || (msg.orderCard as any).orderId) === orderId
            );
            initialCollapsedCount = orderCardIndex >= 0 ? orderCardIndex : 0;
          }
        }
      }

      setIsHistoryCollapsed(initialCollapsed);
      setCollapsedCount(initialCollapsedCount);
      setMessages(initialMessages);
      contextRef.current.lastActiveAt = Date.now();

      const persistenceKey = source === 'order_list' || !orderId ? 'order_list' : orderId;
      if (isNewOrderCard) {
        collapseState[persistenceKey] = initialCollapsed;
        saveCollapseState(collapseState);
      } else if (collapseState[persistenceKey] === undefined) {
        collapseState[persistenceKey] = initialCollapsed;
        saveCollapseState(collapseState);
      }
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
      collapseState[key] = newState;
      saveCollapseState(collapseState);
      return newState;
    });
  }, [entrySource, currentOrderId]);

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
          const isPending = existing.acceptStatus === 'pending';
          const alertText = isPending ? '已经有预约进行中' : '已经有预约成功';
          addAssistantMessage(alertText, { reservationInfo: existing });
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
  }, [addAssistantMessage, closeAllSheets]);

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
      addAssistantMessage('已为您设置使用提醒', { redeemReminder: reminder, orderCard });
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
    }
    return updatedReservation;
  }, [updateMessageById]);

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
      const msg = addAssistantMessage('已为您提交预约申请', {
        reservationInfo: newReservationInfo,
      });
      targetMessageId = msg.id;
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

    if (targetMessageId) {
      const responseDelay = 3000 + Math.random() * 5000;
      const timeoutDelay = Math.max(0, (newReservationInfo.acceptDeadlineAt || 0) - Date.now());
      const timer = setTimeout(() => {
        const random = Math.random();
        if (random < 0.6) {
          updateReservationStatus(targetMessageId!, newReservationInfo, 'accepted');
        } else if (random < 0.85) {
          updateReservationStatus(targetMessageId!, newReservationInfo, 'failed', 'rejected');
        }
      }, Math.min(responseDelay, timeoutDelay - 500));
      const timeoutTimer = setTimeout(() => {
        clearTimeout(timer);
        updateReservationStatus(targetMessageId!, newReservationInfo, 'failed', 'timeout');
      }, timeoutDelay);
      return () => {
        clearTimeout(timer);
        clearTimeout(timeoutTimer);
      };
    }
  }, [addAssistantMessage, updateMessageById, updateReservationStatus, reservationEditMode, rebookFromMessageId, currentOrderId]);

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
    } else if (reservation.orderId) {
      setReservationsByOrder((prev) => ({
        ...prev,
        [reservation.orderId]: { ...canceledReservation, orderId: reservation.orderId },
      }));
    }
  }, [updateMessageById, currentOrderId]);

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
    const relatedMsg = messages.find((m) => m.reservationInfo && m.reservationInfo.orderId === orderId);
    if (relatedMsg) {
      updateMessageById(relatedMsg.id, {
        content: '预约已取消',
        reservationInfo: canceledReservation,
      });
    }
  }, [reservationsByOrder, messages, updateMessageById]);

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
    showToast: () => {},
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
    checkExistingReservation,
    showExistingReservationAlert,
  };

  return (
    <AiAssistantContext.Provider value={value as any}>
      {children}
    </AiAssistantContext.Provider>
  );
};

export default AiAssistantProvider;
