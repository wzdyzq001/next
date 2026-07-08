import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type {
  AiAssistantContextValue,
  OverlayMode,
  EntrySource,
  ChatMessage,
  ConversationContext,
  DegradeLevel,
  BubbleConfig,
  GuideMessageConfig,
  GuidedQuestion,
  WSConnectionState,
  MessageAction,
  OrderData,
  CollapseState,
  CollapseStateItem,
  LastEntryState,
  QuickAction,
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
  updateReminderSource as updateReminderSourceStorage,
} from '../../redeemReminder';
import type { OrderListItem } from '../../types';
import { createReorderFromOriginal } from './OrderCard/orderCardUtils';
import type { OrderCardData } from './OrderCard/orderCardTypes';
import type { ReachConfig } from './reach/types';
import { isFreeReservationOrder } from './nlu/reservationReminderUtils';
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
    if (msg.redeemReminder && msg.redeemReminder.orderId === orderId) {
      return true;
    }
  }
  return false;
};

const QR_CANCEL_REMINDER_AFTER_RESERVATION_CANCEL = 'qr-cancel-reminder-after-reservation-cancel';
const QR_KEEP_REMINDER_AFTER_RESERVATION_CANCEL = 'qr-keep-reminder-after-reservation-cancel';
const QR_ADJUST_REMINDER_AFTER_REBOOK = 'qr-adjust-reminder-after-rebook';
const QR_CONFIRM_SET_REMINDER_AFTER_RESERVATION = 'qr-confirm-set-reminder-after-reservation';

function parseArrivalTimeToTimestamp(arrivalTime: string): number | null {
  if (!arrivalTime) return null;
  const parts = arrivalTime.split(' ');
  if (parts.length < 2) return null;
  const datePart = parts[0];
  const timePart = parts[1];
  const now = new Date();
  const currentYear = now.getFullYear();
  let date: Date | null = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    date = new Date(datePart + 'T00:00:00');
  } else if (/^\d{1,2}\.\d{1,2}$/.test(datePart)) {
    const [month, day] = datePart.split('.').map(Number);
    date = new Date(currentYear, month - 1, day);
    if (date.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
      date.setFullYear(currentYear + 1);
    }
  } else if (/^\d{1,2}月\d{1,2}日$/.test(datePart)) {
    const match = datePart.match(/^(\d{1,2})月(\d{1,2})日$/);
    if (match) {
      const month = parseInt(match[1]);
      const day = parseInt(match[2]);
      date = new Date(currentYear, month - 1, day);
      if (date.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
        date.setFullYear(currentYear + 1);
      }
    }
  }
  if (!date || isNaN(date.getTime())) return null;
  const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) return null;
  const hour = parseInt(timeMatch[1]);
  const min = parseInt(timeMatch[2]);
  if (hour < 0 || hour > 23 || min < 0 || min > 59) return null;
  date.setHours(hour, min, 0, 0);
  return date.getTime();
}

function formatShortDate(timestamp: number): string {
  const d = new Date(timestamp);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}月${day}日`;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

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
  const [reminderSheetInitialRemindAt, setReminderSheetInitialRemindAt] = useState<number | undefined>(undefined);
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
  const [reachPayload, setReachPayloadState] = useState<{
    reachId: string;
    config: ReachConfig;
    orderId: string;
  } | null>(null);
  const [reservationsByOrder, setReservationsByOrder] = useState<Record<string, ReservationInfoCardData>>(loadSavedReservations);
  const [toastText, setToastText] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reservationTimersRef = useRef<Record<string, { simulate: ReturnType<typeof setTimeout>; timeout: ReturnType<typeof setTimeout> }>>({});
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [collapsedCount, setCollapsedCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(2);

  const contextRef = useRef<ConversationContext>(createEmptyContext());
  const sessionIdRef = useRef<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const pendingOrderCardRef = useRef<OrderCardData | null>(null);
  const lastCheckedReservationRef = useRef<Record<string, { arrivalTime: string; acceptStatus: string; linkageChecked: boolean }>>({});

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

  const sendOrderCard = useCallback((order: OrderListItem | OrderCardData | any) => {
    let orderCard: OrderCardData;

    if ('extension' in order && 'thumbnail' in order && 'price' in order) {
      orderCard = order as OrderCardData;
    } else if ('category' in order && 'productType' in order && 'id' in order) {
      orderCard = convertOrderDataToCardData(order as any);
    } else {
      orderCard = convertOrderListItemToCardData(order as OrderListItem);
    }

    contextRef.current.currentOrderId = orderCard.id;
    setCurrentOrderId(orderCard.id);
    contextRef.current.orderContext = {
      category: orderCard.category,
      productType: orderCard.productType,
      status: orderCard.mainStatus || orderCard.orderStatus,
      refundStage: 'none',
    };

    pendingOrderCardRef.current = orderCard;
    addAssistantMessage('', { orderCard });
  }, [addAssistantMessage]);

  const sendRedeemReminderWithOrder = useCallback((order: OrderListItem | OrderCardData | any) => {
    let orderCard: OrderCardData;

    if ('extension' in order && 'thumbnail' in order && 'price' in order) {
      orderCard = order as OrderCardData;
    } else if ('category' in order && 'productType' in order && 'id' in order) {
      orderCard = convertOrderDataToCardData(order as any);
    } else {
      orderCard = convertOrderListItemToCardData(order as OrderListItem);
    }

    const orderId = orderCard.id;
    const reminder = getReminderByOrder(orderId);

    contextRef.current.currentOrderId = orderId;
    setCurrentOrderId(orderId);
    contextRef.current.orderContext = {
      category: orderCard.category,
      productType: orderCard.productType,
      status: orderCard.mainStatus || orderCard.orderStatus,
      refundStage: 'none',
    };

    if (!hasReminderCardInLastN(messages, orderId, 3)) {
      addAssistantMessage('', {
        orderCard,
        redeemReminder: reminder,
      });
    }

    pendingOrderCardRef.current = orderCard;
  }, [addAssistantMessage, messages]);

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
      const toastMsg = isPending ? '已经有进行中的预约单' : '已经有预约成功的预约单';
      showToast(toastMsg);
      return;
    }
    const isPending = reservation.acceptStatus === 'pending';
    const alertText = isPending ? '已经有预约进行中' : '已经有预约成功的预约单';
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

  const setReachPayload = useCallback((payload: {
    reachId: string;
    config: ReachConfig;
    orderId: string;
  } | null) => {
    setReachPayloadState(payload);
  }, []);

  const clearReachPayload = useCallback(() => {
    setReachPayloadState(null);
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
        addAssistantMessage('好的，使用提醒已设置，我会在指定时间提醒您。如果后续取消预约或预约失败，我会自动帮您取消使用提醒～');
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
          const addedMsg = addAssistantMessage(msg.content || '', {
            quickReplies: msg.quickReplies,
            actions: msg.actions,
            orderCard: msg.orderCard,
            orderList: msg.orderList,
            featureCard: msg.featureCard,
            reservationInfo: msg.reservationInfo,
            redeemReminder: msg.redeemReminder,
          });
          if (msg.reservationInfo && msg.reservationInfo.orderId) {
            const orderId = msg.reservationInfo.orderId;
            setReservationsByOrder((prev) => ({
              ...prev,
              [orderId!]: msg.reservationInfo!,
            }));
          }
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

      if (message === QR_CANCEL_REMINDER_AFTER_RESERVATION_CANCEL || message === '取消提醒') {
        const orderId = currentOrderId || findLastOrderCard()?.id;
        if (orderId) {
          cancelReminderStorage(orderId);
          setMessages((prev) => prev.map((msg) => {
            if (msg.redeemReminder && msg.redeemReminder.orderId === orderId && msg.redeemReminder.status !== 'canceled') {
              return {
                ...msg,
                content: '使用提醒已取消',
                redeemReminder: { ...msg.redeemReminder, status: 'canceled' as const },
              };
            }
            return msg;
          }));
        }
        setTimeout(() => {
          addAssistantMessage('好的，使用提醒已取消。');
          setIsLoading(false);
        }, 300);
        return;
      }

      if (message === QR_KEEP_REMINDER_AFTER_RESERVATION_CANCEL || message === '保持提醒') {
        const orderId = currentOrderId || findLastOrderCard()?.id;
        if (orderId) {
          updateReminderSourceStorage(orderId, 'user_custom');
        }
        setTimeout(() => {
          addAssistantMessage('好的，提醒保持有效～');
          setIsLoading(false);
        }, 300);
        return;
      }

      if (message === QR_CONFIRM_SET_REMINDER_AFTER_RESERVATION || message === '确认设置') {
        const dialogState = (contextRef.current.dialogState || {}) as any;
        const reminderStep = dialogState.reservationReminderStep;
        const reminderData = (dialogState.data || {}) as Record<string, any>;

        if (reminderStep === 'confirming_custom' && reminderData.remindAt) {
          const orderId = reminderData.orderId || currentOrderId || findLastOrderCard()?.id;
          if (orderId) {
            const lastOrderCard = findLastOrderCard();
            const updated = setReminderStorage(orderId, reminderData.remindAt, {
              productName: reminderData.productName || lastOrderCard?.productName,
              validDate: formatShortDate(reminderData.remindAt),
              source: 'user_custom',
            });
            addAssistantMessage('', { redeemReminder: updated });
            contextRef.current.dialogState = {
              ...dialogState,
              currentIntent: null,
              currentStep: 'idle',
              reservationReminderStep: 'completed',
            } as any;
          }
          setTimeout(() => {
            addAssistantMessage('好的，使用提醒已设置，我会在指定时间提醒您。如果后续取消预约或预约失败，我会自动帮您取消使用提醒～');
            setIsLoading(false);
          }, 200);
          return;
        }

        const orderId = currentOrderId || findLastOrderCard()?.id;
        if (orderId) {
          const reservation = reservationsByOrder[orderId];
          if (reservation && reservation.arrivalTime) {
            const reservationTs = parseArrivalTimeToTimestamp(reservation.arrivalTime);
            if (reservationTs) {
              const newRemindAt = reservationTs - 60 * 60 * 1000;
              const lastOrderCard = findLastOrderCard();
              const updated = setReminderStorage(orderId, newRemindAt, {
                productName: reservation.storeName || lastOrderCard?.productName,
                validDate: formatShortDate(reservationTs),
                source: 'auto_from_reservation',
              });
              addAssistantMessage('', { redeemReminder: updated });
            }
          }
        }
        setTimeout(() => {
          addAssistantMessage('好的，使用提醒已设置，我会在指定时间提醒您。如果后续取消预约或预约失败，我会自动帮您取消使用提醒～');
          setIsLoading(false);
        }, 200);
        return;
      }

      if (message === QR_ADJUST_REMINDER_AFTER_REBOOK || message === '帮我调整') {
        const orderId = currentOrderId || findLastOrderCard()?.id;
        if (orderId) {
          const reservation = reservationsByOrder[orderId];
          if (reservation && reservation.arrivalTime) {
            const reservationTs = parseArrivalTimeToTimestamp(reservation.arrivalTime);
            if (reservationTs) {
              const newRemindAt = reservationTs - 60 * 60 * 1000;
              const existing = getReminderByOrder(orderId);
              const updated = setReminderStorage(orderId, newRemindAt, {
                productName: existing?.productName,
                validDate: existing?.validDate,
                source: 'auto_from_reservation',
              });
              setMessages((prev) => prev.map((msg) => {
                if (msg.redeemReminder && msg.redeemReminder.orderId === orderId) {
                  return { ...msg, redeemReminder: updated };
                }
                return msg;
              }));
              const remDate = formatShortDate(newRemindAt);
              const remTime = formatTime(newRemindAt);
              addAssistantMessage('', { redeemReminder: updated });
              setTimeout(() => {
                addAssistantMessage(`好的，已为您调整提醒时间为${remDate} ${remTime}～`);
                setIsLoading(false);
              }, 200);
              return;
            }
          }
        }
        setTimeout(() => {
          addAssistantMessage('好的，已为您调整提醒时间～');
          setIsLoading(false);
        }, 300);
        return;
      }

      if (USE_LOCAL_NLU) {
        try {
          let orderCard: OrderCardData | undefined;
          if (pendingOrderCardRef.current) {
            orderCard = pendingOrderCardRef.current;
            pendingOrderCardRef.current = null;
          } else {
            orderCard = findLastOrderCard();
          }
          const currentDialogState = (contextRef.current.dialogState as any) || createInitialDialogState();

          const nluContext: NluContext = {
            sessionId: sessionIdRef.current || contextRef.current.sessionId,
            dialogState: currentDialogState,
            currentOrderId: currentOrderId,
            orderCard,
            reservationsByOrder,
            conversationTurns: contextRef.current.conversationTurns,
            resolvedQuestions: contextRef.current.resolvedQuestions,
          };

          const response = processNluMessage(message, nluContext);

          contextRef.current.dialogState = response.newDialogState as any;

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
    [degradeLevel, addUserMessage, addAssistantMessage, currentOrderId, findLastOrderCard, sendNluResponse, messages, updateMessageById, reservationsByOrder, sendRedeemReminderWithOrder]
  );

  const openAssistant = useCallback(
    async (orderId?: string, source: EntrySource = 'order_list', guideMessage?: GuideMessageConfig) => {
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

      const reminder = orderId ? getReminderByOrder(orderId) : undefined;
      const hasActiveReminder = reminder && reminder.status === 'active';
      const isBubbleWithReminder = source === 'bubble' && orderId && hasActiveReminder;

      if (savedHistory && savedHistory.messages && savedHistory.messages.length > 0) {
        contextRef.current = savedHistory.context;
        sessionIdRef.current = savedHistory.context.sessionId;
        initialMessages = [...savedHistory.messages];
      } else {
        contextRef.current = createEmptyContext();
        sessionIdRef.current = contextRef.current.sessionId;

        if (!isBubbleWithReminder) {
          const quickActions: QuickAction[] = [
            { id: 'qa-reservation', label: '预约', type: 'reservation' },
            { id: 'qa-reminder', label: '提醒', type: 'reminder' },
            { id: 'qa-pickup-code', label: '取餐码', type: 'pickup_code' },
            { id: 'qa-delivery', label: '配送进度', type: 'delivery' },
          ];
          const welcome: ChatMessage = {
            id: genId(),
            role: 'assistant',
            contentType: 'text',
            content: `你好呀！我是${BRAND_NAME}，有什么可以帮你的吗？可以➕选择订单或者直接问我～`,
            quickActions,
            timestamp: Date.now(),
          };
          initialMessages.push(welcome);
        }
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
          ? convertOrderDataToCardData(currentOrder as any)
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

            if (isBubbleWithReminder) {
              const orderCardMsg: ChatMessage = {
                id: genId(),
                role: 'assistant',
                contentType: 'text',
                content: '',
                orderCard,
                timestamp: Date.now(),
              };
              initialMessages.push(orderCardMsg);

              const reminderMsg: ChatMessage = {
                id: genId(),
                role: 'assistant',
                contentType: 'text',
                content: '',
                redeemReminder: reminder,
                timestamp: Date.now(),
              };
              initialMessages.push(reminderMsg);
            } else {
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
      }

      if (guideMessage && !isBubbleWithReminder) {
        const lastMessage = initialMessages.length > 0
          ? initialMessages[initialMessages.length - 1]
          : null;

        const isDuplicate = lastMessage
          && lastMessage.role === 'assistant'
          && lastMessage.contentType === 'text'
          && lastMessage.content === guideMessage.text
          && (
            (lastMessage.actions && guideMessage.actions
              && lastMessage.actions.length === guideMessage.actions.length
              && lastMessage.actions.every((act, i) => act.label === guideMessage.actions![i].label))
            || (!lastMessage.actions && !guideMessage.actions)
          );

        if (!isDuplicate) {
          const guideMsg: ChatMessage = {
            id: genId(),
            role: 'assistant',
            contentType: 'text',
            content: guideMessage.text,
            actions: guideMessage.actions,
            quickReplies: guideMessage.quickReplies,
            timestamp: Date.now(),
          };
          initialMessages.push(guideMsg);
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
              acceptStatus: 'accepted' as const,
              merchantAcceptAt: Date.now(),
            };
            updatedReservations[timedOut.orderId] = updated;
            return {
              ...msg,
              content: '预约成功，商家已接单',
              reservationInfo: updated,
            };
          }
          return msg;
        });
      }

      if (orderId) {
        const reservation = updatedReservations[orderId];
        const reminder = getReminderByOrder(orderId);

        if (reminder && reminder.status === 'canceled') {
          const canceledReminder = { ...reminder, status: 'canceled' as const };
          finalMessages = finalMessages.map((msg) => {
            if (msg.redeemReminder && msg.redeemReminder.orderId === orderId && msg.redeemReminder.status !== 'canceled') {
              return { ...msg, redeemReminder: canceledReminder };
            }
            return msg;
          });
        }

        if (reservation && reservation.acceptStatus === 'canceled' && reminder && reminder.status === 'active') {
          cancelReminderStorage(orderId);
          const canceledReminder = { ...reminder, status: 'canceled' as const };
          finalMessages = finalMessages.map((msg) => {
            if (msg.redeemReminder && msg.redeemReminder.orderId === orderId) {
              return { ...msg, redeemReminder: canceledReminder };
            }
            return msg;
          });
          const hasExistingCancelMsg = finalMessages.some((msg) => {
            if (msg.role !== 'assistant') return false;
            const content = msg.content || '';
            return content.includes('使用提醒已同步取消') ||
                   content.includes('是否同时取消使用提醒');
          });
          if (!hasExistingCancelMsg) {
            finalMessages = [...finalMessages, {
              id: genId(),
              role: 'assistant',
              contentType: 'text',
              content: '预约已取消，使用提醒已同步取消，如有需求可重新设置使用提醒～',
              timestamp: Date.now(),
            }];
          }
        }
      }

      setMessages(finalMessages);
      setReservationsByOrder(updatedReservations);

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
      case 'view_redeem_reminder': {
        const orderId = (action as any).orderId || currentOrderId;
        if (orderId) {
          const orderMsg = messages.find(m => m.orderCard && m.orderCard.id === orderId);
          const orderCard = orderMsg?.orderCard;
          if (orderCard && !hasReminderCardInLastN(messages, orderId, 3)) {
            const reminder = getReminderByOrder(orderId);
            addAssistantMessage('', {
              orderCard,
              redeemReminder: reminder,
            });
          }
        }
        break;
      }
      case 'open_reservation': {
        const orderId = (action as any).orderId || currentOrderId;
        if (orderId && orderId !== currentOrderId) {
          setCurrentOrderId(orderId);
          contextRef.current.currentOrderId = orderId;
        }
        const existing = orderId ? reservationsByOrder[orderId] : null;
        if (existing) {
          let isActive = false;
          if (existing.acceptStatus === 'pending') {
            isActive = true;
          } else if (existing.acceptStatus === 'accepted') {
            const arrivalTs = parseArrivalTimeToTimestamp(existing.arrivalTime);
            isActive = arrivalTs === null || arrivalTs > Date.now();
          }
          if (isActive) {
            showExistingReservationAlert(existing);
            return;
          }
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

  const openReminderSheet = useCallback((orderId: string, productName?: string, validDate?: string, initialRemindAt?: number) => {
    closeAllSheets();
    setReminderSheetOrderId(orderId);
    setReminderSheetProductName(productName);
    setReminderSheetValidDate(validDate);
    setReminderSheetInitialRemindAt(initialRemindAt);
    setReminderSheetOpen(true);
  }, [closeAllSheets]);

  const closeReminderSheet = useCallback(() => {
    setReminderSheetOpen(false);
    setReminderEditMode('new');
    setReminderFromMessageId(null);
    setReminderSheetInitialRemindAt(undefined);
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
      acceptStatus: newStatus,
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
            const status = msg.reservationInfo.acceptStatus;
            if (status === 'pending' || status === 'accepted') {
              return msg;
            }
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

    if (currentOrderId && newReservationInfo.arrivalTime) {
      const lastOrderCard = findLastOrderCard();
      const isFree = lastOrderCard ? isFreeReservationOrder(lastOrderCard) : false;
      if (isFree) {
        const reminder = getReminderByOrder(currentOrderId);
        const reservationTs = parseArrivalTimeToTimestamp(newReservationInfo.arrivalTime);
        if (reservationTs) {
          const hoursUntilReservation = (reservationTs - Date.now()) / (1000 * 60 * 60);
          if (hoursUntilReservation < 2) {
            return;
          }
          const defaultRemindAt = reservationTs - 60 * 60 * 1000;
          const remDate = formatShortDate(defaultRemindAt);
          const remTime = formatTime(defaultRemindAt);

          if (currentOrderId) {
            lastCheckedReservationRef.current[currentOrderId] = {
              arrivalTime: newReservationInfo.arrivalTime,
              acceptStatus: newReservationInfo.acceptStatus,
              linkageChecked: true,
            };
          }

          if (!reminder || reminder.status !== 'active') {
            setTimeout(() => {
              const currentDialogState = (contextRef.current.dialogState || {}) as any;
              contextRef.current.dialogState = {
                ...currentDialogState,
                currentIntent: 'reservation',
                reservationReminderStep: 'asking_setting',
                data: {
                  ...(currentDialogState.data || {}),
                  reservationTimestamp: reservationTs,
                  orderId: currentOrderId,
                  productName: newReservationInfo.storeName || lastOrderCard?.productName,
                  defaultRemindAt,
                  existingReminder: reminder,
                },
              } as any;
              addAssistantMessage(
                `是否需要帮你设置一个 ${remDate} ${remTime} 的使用提醒？也可以告诉我你想设置的日期、时间，需要早于预约时间哦～`,
                {
                  quickReplies: [
                    { id: QR_CONFIRM_SET_REMINDER_AFTER_RESERVATION, question: '确认设置', score: 1, priority: 0 },
                  ],
                }
              );
            }, 800);
          } else if (reminder.remindAt > reservationTs) {
            setTimeout(() => {
              const currentDialogState = (contextRef.current.dialogState || {}) as any;
              contextRef.current.dialogState = {
                ...currentDialogState,
                currentIntent: 'reservation',
                reservationReminderStep: 'asking_adjust_late',
                data: {
                  ...(currentDialogState.data || {}),
                  reservationTimestamp: reservationTs,
                  orderId: currentOrderId,
                  productName: newReservationInfo.storeName || lastOrderCard?.productName,
                  defaultRemindAt,
                  existingReminder: reminder,
                },
              } as any;
              addAssistantMessage(
                `订单使用提醒晚于预约时间，是否需要改为预约时间前 1 个小时？也可以告诉我要设置什么日期、时间～`,
                {
                  quickReplies: [
                    { id: QR_ADJUST_REMINDER_AFTER_REBOOK, question: '帮我调整', score: 1, priority: 0 },
                  ],
                }
              );
            }, 800);
          } else {
            const diffHours = (reservationTs - reminder.remindAt) / (1000 * 60 * 60);
            if (diffHours > 12) {
              setTimeout(() => {
                const currentDialogState = (contextRef.current.dialogState || {}) as any;
                contextRef.current.dialogState = {
                  ...currentDialogState,
                  currentIntent: 'reservation',
                  reservationReminderStep: 'asking_adjust_early',
                  data: {
                    ...(currentDialogState.data || {}),
                    reservationTimestamp: reservationTs,
                    orderId: currentOrderId,
                    productName: newReservationInfo.storeName || lastOrderCard?.productName,
                    defaultRemindAt,
                    existingReminder: reminder,
                  },
                } as any;
                const existingRemDate = formatShortDate(reminder.remindAt);
                const existingRemTime = formatTime(reminder.remindAt);
                addAssistantMessage(
                  `订单当前已设置${existingRemDate} ${existingRemTime}的使用提醒，使用提醒时间距离预约时间太久可能中间会忘记，是否重新设置为预约时间前 1 个小时提醒？`,
                  {
                    quickReplies: [
                      { id: QR_ADJUST_REMINDER_AFTER_REBOOK, question: '帮我调整', score: 1, priority: 0 },
                    ],
                  }
                );
              }, 800);
            }
          }
        }
      }
    }

    if (isRebook && currentOrderId && newReservationInfo.arrivalTime) {
      const reminder = getReminderByOrder(currentOrderId);
      if (reminder && reminder.status === 'active') {
        const newReservationTs = parseArrivalTimeToTimestamp(newReservationInfo.arrivalTime);
        if (newReservationTs) {
          const newRemindAt = newReservationTs - 60 * 60 * 1000;
          if (reminder.source === 'auto_from_reservation') {
            const updated = setReminderStorage(currentOrderId, newRemindAt, {
              productName: reminder.productName,
              validDate: reminder.validDate,
              source: 'auto_from_reservation',
            });
            setMessages((prev) => prev.map((msg) => {
              if (msg.redeemReminder && msg.redeemReminder.orderId === currentOrderId) {
                return { ...msg, redeemReminder: updated };
              }
              return msg;
            }));
            setTimeout(() => {
              const resDate = formatShortDate(newReservationTs);
              const resTime = formatTime(newReservationTs);
              const remDate = formatShortDate(newRemindAt);
              const remTime = formatTime(newRemindAt);
              addAssistantMessage(
                `您的预约时间已变更为 ${resDate} ${resTime}，为您自动调整使用提醒至 ${remDate} ${remTime}（预约前1小时）`,
                {
                  quickReplies: [
                    { id: 'qr-modify-reminder-time', question: '修改提醒时间', score: 1, priority: 0 },
                  ],
                }
              );
            }, 800);
          } else if (reminder.source === 'user_custom') {
            const diffHours = Math.abs(reminder.remindAt - newReservationTs) / (1000 * 60 * 60);
            if (diffHours < 1) {
              setTimeout(() => {
                const resDate = formatShortDate(newReservationTs);
                const resTime = formatTime(newReservationTs);
                addAssistantMessage(
                  `您的预约时间已变更为 ${resDate} ${resTime}，当前提醒距离预约时间不足 1 小时，是否调整为预约前 1 小时提醒？`,
                  {
                    quickReplies: [
                      { id: QR_ADJUST_REMINDER_AFTER_REBOOK, question: '帮我调整', score: 1, priority: 0 },
                    ],
                  }
                );
              }, 800);
            }
          }
        }
      }
    }
  }, [addAssistantMessage, updateMessageById, updateReservationStatus, reservationEditMode, rebookFromMessageId, currentOrderId, messages, clearReservationTimers, findLastOrderCard]);

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
    let orderId: string | undefined;
    if (currentOrderId) {
      orderId = currentOrderId;
      setReservationsByOrder((prev) => ({
        ...prev,
        [currentOrderId]: { ...canceledReservation, orderId: currentOrderId },
      }));
      clearReservationTimers(currentOrderId);
    } else if (reservation.orderId) {
      const resOrderId = reservation.orderId;
      orderId = resOrderId;
      setReservationsByOrder((prev) => ({
        ...prev,
        [resOrderId]: { ...canceledReservation, orderId: resOrderId },
      }));
      clearReservationTimers(resOrderId);
    }
    const currentDialogState = (contextRef.current.dialogState || {}) as any;
    if (currentDialogState.currentIntent === 'reservation') {
      contextRef.current.dialogState = {
        ...currentDialogState,
        currentIntent: null,
        currentStep: 'idle',
        reservationStep: 'idle',
      };
    }
    if (orderId) {
      const reminder = getReminderByOrder(orderId);
      if (reminder && reminder.status === 'active') {
        cancelReminderStorage(orderId);
        setMessages((prev) => prev.map((msg) => {
          if (msg.redeemReminder && msg.redeemReminder.orderId === orderId) {
            return { ...msg, redeemReminder: { ...msg.redeemReminder, status: 'canceled' as const } };
          }
          return msg;
        }));
        setTimeout(() => {
          addAssistantMessage('预约已取消，使用提醒已同步取消，如有需求可重新设置使用提醒～');
        }, 400);
      }
    }
  }, [updateMessageById, currentOrderId, clearReservationTimers, addAssistantMessage, messages]);

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
    const newReservations = {
      ...reservationsByOrder,
      [orderId]: canceledReservation,
    };
    setReservationsByOrder(newReservations);
    try {
      localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(newReservations));
    } catch (e) {
      console.error('Failed to save reservations:', e);
    }
    clearReservationTimers(orderId);
    const relatedMsg = messages.find((m) => m.reservationInfo && m.reservationInfo.orderId === orderId);
    if (relatedMsg) {
      updateMessageById(relatedMsg.id, {
        content: '预约已取消',
        reservationInfo: canceledReservation,
      });
    }
    const reminder = getReminderByOrder(orderId);
    if (reminder && reminder.status === 'active') {
      cancelReminderStorage(orderId);
      setMessages((prev) => prev.map((msg) => {
        if (msg.redeemReminder && msg.redeemReminder.orderId === orderId) {
          return { ...msg, redeemReminder: { ...msg.redeemReminder, status: 'canceled' as const } };
        }
        return msg;
      }));
      setTimeout(() => {
        addAssistantMessage('预约已取消，使用提醒已同步取消，如有需求可重新设置使用提醒～');
      }, 400);
    }
  }, [reservationsByOrder, messages, updateMessageById, clearReservationTimers, addAssistantMessage]);

  const rebookOrderReservation = useCallback((orderId: string) => {
    console.log('Rebook order reservation:', orderId);
    const reservation = reservationsByOrder[orderId];
    if (!reservation) return;
    openReservationPanel(reservation.storeName, reservation.businessHours, 'rebook', reservation);
  }, [reservationsByOrder, openReservationPanel]);

  const cancelReminder = useCallback((orderId: string) => {
    console.log('Cancel reminder:', orderId);
    cancelReminderStorage(orderId);
    setMessages((prev) => prev.map((msg) => {
      if (msg.redeemReminder && msg.redeemReminder.orderId === orderId && msg.redeemReminder.status !== 'canceled') {
        return {
          ...msg,
          content: '使用提醒已取消',
          redeemReminder: { ...msg.redeemReminder, status: 'canceled' as const },
        };
      }
      return msg;
    }));
  }, [messages, updateMessageById]);

  const modifyReminder = useCallback((orderId: string, productName?: string, validDate?: string) => {
    console.log('Modify reminder:', orderId);
    const relatedMsg = messages.find((m) => m.redeemReminder && m.redeemReminder.orderId === orderId);
    if (relatedMsg) {
      setReminderEditMode('modify');
      setReminderFromMessageId(relatedMsg.id);
    }
    const existingReminder = getReminderByOrder(orderId);
    openReminderSheet(orderId, productName, validDate, existingReminder?.remindAt);
  }, [messages, openReminderSheet]);

  const resetReminder = useCallback((orderId: string, productName?: string, validDate?: string) => {
    console.log('Reset reminder:', orderId);
    const relatedMsg = messages.find((m) => m.redeemReminder && m.redeemReminder.orderId === orderId);
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
    if (overlayMode === 'closed') return;
    if (!currentOrderId) return;

    const reservation = reservationsByOrder[currentOrderId];
    if (!reservation) {
      if (lastCheckedReservationRef.current[currentOrderId]) {
        delete lastCheckedReservationRef.current[currentOrderId];
      }
      return;
    }

    const lastChecked = lastCheckedReservationRef.current[currentOrderId];

    if (!lastChecked) {
      lastCheckedReservationRef.current[currentOrderId] = {
        arrivalTime: reservation.arrivalTime,
        acceptStatus: reservation.acceptStatus,
        linkageChecked: true,
      };
      if (reservation.acceptStatus === 'canceled') {
        const reminder = getReminderByOrder(currentOrderId);
        if (reminder && reminder.status === 'active') {
          cancelReminderStorage(currentOrderId);
          setMessages((prev) => prev.map((msg) => {
            if (msg.redeemReminder && msg.redeemReminder.orderId === currentOrderId && msg.redeemReminder.status !== 'canceled') {
              return { ...msg, redeemReminder: { ...msg.redeemReminder, status: 'canceled' as const } };
            }
            return msg;
          }));
          const hasExistingCancelMsg = messages.some((msg) => {
            if (msg.role !== 'assistant') return false;
            const content = msg.content || '';
            return content.includes('使用提醒已同步取消') ||
                   content.includes('是否同时取消使用提醒');
          });
          if (!hasExistingCancelMsg) {
            setTimeout(() => {
              addAssistantMessage('预约已取消，使用提醒已同步取消，如有需求可重新设置使用提醒～');
            }, 300);
          }
        } else if (reminder && reminder.status === 'canceled') {
          setMessages((prev) => prev.map((msg) => {
            if (msg.redeemReminder && msg.redeemReminder.orderId === currentOrderId && msg.redeemReminder.status !== 'canceled') {
              return { ...msg, redeemReminder: { ...msg.redeemReminder, status: 'canceled' as const } };
            }
            return msg;
          }));
        }
      }
      return;
    }

    const arrivalTimeChanged = lastChecked.arrivalTime !== reservation.arrivalTime;
    const statusChanged = lastChecked.acceptStatus !== reservation.acceptStatus;

    if (!arrivalTimeChanged && !statusChanged) {
      return;
    }

    const reminder = getReminderByOrder(currentOrderId);
    const isRebook = statusChanged && 
      lastChecked.acceptStatus === 'canceled' && 
      (reservation.acceptStatus === 'accepted' || reservation.acceptStatus === 'pending');

    if (isRebook && (!reminder || reminder.status !== 'active')) {
      lastCheckedReservationRef.current[currentOrderId] = {
        arrivalTime: reservation.arrivalTime,
        acceptStatus: reservation.acceptStatus,
        linkageChecked: true,
      };
      const reservationTs = parseArrivalTimeToTimestamp(reservation.arrivalTime);
      if (reservationTs) {
        const hoursUntil = (reservationTs - Date.now()) / (1000 * 60 * 60);
        if (hoursUntil >= 2) {
          const lastOrderCard = findLastOrderCard();
          const isFree = lastOrderCard ? isFreeReservationOrder(lastOrderCard) : false;
          if (isFree) {
            const defaultRemindAt = reservationTs - 60 * 60 * 1000;
            const remDate = formatShortDate(defaultRemindAt);
            const remTime = formatTime(defaultRemindAt);
            setTimeout(() => {
              const currentDialogState = (contextRef.current.dialogState || {}) as any;
              contextRef.current.dialogState = {
                ...currentDialogState,
                currentIntent: 'reservation',
                reservationReminderStep: 'asking_setting',
                data: {
                  ...(currentDialogState.data || {}),
                  reservationTimestamp: reservationTs,
                  orderId: currentOrderId,
                  productName: lastOrderCard?.productName || reservation.storeName,
                  defaultRemindAt,
                  existingReminder: reminder,
                },
              } as any;
              addAssistantMessage(
                `是否需要帮你设置一个 ${remDate} ${remTime} 的使用提醒？也可以告诉我你想设置的日期、时间，需要早于预约时间哦～`,
                {
                  quickReplies: [
                    { id: QR_CONFIRM_SET_REMINDER_AFTER_RESERVATION, question: '确认设置', score: 1, priority: 0 },
                  ],
                }
              );
            }, 800);
          }
        }
      }
      return;
    }

    if (!reminder || reminder.status !== 'active') {
      lastCheckedReservationRef.current[currentOrderId] = {
        arrivalTime: reservation.arrivalTime,
        acceptStatus: reservation.acceptStatus,
        linkageChecked: true,
      };
      return;
    }

    const hasExistingLinkageMsg = messages.some((msg) => {
      if (msg.role !== 'assistant') return false;
      const content = msg.content || '';
      return content.includes('使用提醒已同步取消') ||
             content.includes('是否同时取消使用提醒') ||
             content.includes('为您自动调整使用提醒') ||
             content.includes('当前提醒距离预约时间不足');
    });

    if (hasExistingLinkageMsg) {
      lastCheckedReservationRef.current[currentOrderId] = {
        arrivalTime: reservation.arrivalTime,
        acceptStatus: reservation.acceptStatus,
        linkageChecked: true,
      };
      return;
    }

    if (statusChanged && reservation.acceptStatus === 'canceled') {
      lastCheckedReservationRef.current[currentOrderId] = {
        arrivalTime: reservation.arrivalTime,
        acceptStatus: reservation.acceptStatus,
        linkageChecked: true,
      };
      if (reminder && reminder.status === 'active') {
        cancelReminderStorage(currentOrderId);
      }
      setMessages((prev) => prev.map((msg) => {
        if (msg.redeemReminder && msg.redeemReminder.orderId === currentOrderId && msg.redeemReminder.status !== 'canceled') {
          return { ...msg, redeemReminder: { ...msg.redeemReminder, status: 'canceled' as const } };
        }
        return msg;
      }));
      setTimeout(() => {
        addAssistantMessage('预约已取消，使用提醒已同步取消，如有需求可重新设置使用提醒～');
      }, 400);
      return;
    }

    if (arrivalTimeChanged && (reservation.acceptStatus === 'accepted' || reservation.acceptStatus === 'pending')) {
      const newReservationTs = parseArrivalTimeToTimestamp(reservation.arrivalTime);
      if (newReservationTs) {
        const newRemindAt = newReservationTs - 60 * 60 * 1000;
        if (reminder.source === 'auto_from_reservation') {
          const updated = setReminderStorage(currentOrderId, newRemindAt, {
            productName: reminder.productName,
            validDate: reminder.validDate,
            source: 'auto_from_reservation',
          });
          setMessages((prev) => prev.map((msg) => {
            if (msg.redeemReminder && msg.redeemReminder.orderId === currentOrderId) {
              return { ...msg, redeemReminder: updated };
            }
            return msg;
          }));
          lastCheckedReservationRef.current[currentOrderId] = {
            arrivalTime: reservation.arrivalTime,
            acceptStatus: reservation.acceptStatus,
            linkageChecked: true,
          };
          setTimeout(() => {
            const resDate = formatShortDate(newReservationTs);
            const resTime = formatTime(newReservationTs);
            const remDate = formatShortDate(newRemindAt);
            const remTime = formatTime(newRemindAt);
            addAssistantMessage(
              `您的预约时间已变更为 ${resDate} ${resTime}，为您自动调整使用提醒至 ${remDate} ${remTime}（预约前1小时）`,
              {
                quickReplies: [
                  { id: 'qr-modify-reminder-time', question: '修改提醒时间', score: 1, priority: 0 },
                ],
              }
            );
          }, 600);
        } else if (reminder.source === 'user_custom') {
          const diffHours = Math.abs(reminder.remindAt - newReservationTs) / (1000 * 60 * 60);
          if (diffHours < 1) {
            lastCheckedReservationRef.current[currentOrderId] = {
              arrivalTime: reservation.arrivalTime,
              acceptStatus: reservation.acceptStatus,
              linkageChecked: true,
            };
            setTimeout(() => {
              const resDate = formatShortDate(newReservationTs);
              const resTime = formatTime(newReservationTs);
              addAssistantMessage(
                `您的预约时间已变更为 ${resDate} ${resTime}，当前提醒距离预约时间不足 1 小时，是否调整为预约前 1 小时提醒？`,
                {
                  quickReplies: [
                    { id: QR_ADJUST_REMINDER_AFTER_REBOOK, question: '帮我调整', score: 1, priority: 0 },
                  ],
                }
              );
            }, 600);
          } else {
            lastCheckedReservationRef.current[currentOrderId] = {
              arrivalTime: reservation.arrivalTime,
              acceptStatus: reservation.acceptStatus,
              linkageChecked: true,
            };
          }
        }
        return;
      }
    }

    lastCheckedReservationRef.current[currentOrderId] = {
      arrivalTime: reservation.arrivalTime,
      acceptStatus: reservation.acceptStatus,
      linkageChecked: true,
    };
  }, [currentOrderId, reservationsByOrder, overlayMode, messages, addAssistantMessage, updateMessageById]);

  useEffect(() => {
    const now = Date.now();

    Object.entries(reservationsByOrder).forEach(([orderId, reservation]) => {
      if (reservation.acceptStatus !== 'pending') return;
      if (reservationTimersRef.current[orderId]) return;

      const totalDuration = 5 * 60 * 1000;
      const createdAt = (reservation.acceptDeadlineAt || now + totalDuration) - totalDuration;
      const elapsed = now - createdAt;
      const autoAcceptDelay = Math.max(0, 30 * 1000 - elapsed);

      const timer = setTimeout(() => {
        const relatedMsg = messages.find((m) => m.reservationInfo && m.reservationInfo.orderId === orderId);
        if (relatedMsg) {
          updateReservationStatus(relatedMsg.id, reservation, 'accepted');
        } else {
          setReservationsByOrder((prev) => {
            const current = prev[orderId];
            if (!current || current.acceptStatus !== 'pending') return prev;
            return {
              ...prev,
              [orderId]: {
                ...current,
                acceptStatus: 'accepted',
                merchantAcceptAt: Date.now(),
              },
            };
          });
          delete reservationTimersRef.current[orderId];
        }
      }, autoAcceptDelay);

      reservationTimersRef.current[orderId] = { simulate: timer, timeout: timer };
    });

    return () => {
      Object.keys(reservationTimersRef.current).forEach((orderId) => {
        if (!reservationsByOrder[orderId] || reservationsByOrder[orderId].acceptStatus !== 'pending') {
          clearTimeout(reservationTimersRef.current[orderId].simulate);
          delete reservationTimersRef.current[orderId];
        }
      });
    };
  }, [reservationsByOrder, messages, updateReservationStatus]);

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
    reminderSheetInitialRemindAt,
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
    sendRedeemReminderWithOrder,
    placeOrder,
    startDelivery,
    checkExistingReservation,
    showExistingReservationAlert,
    clearChatHistory,
    setReachPayload,
    clearReachPayload,
    reachPayload,
  };

  return (
    <AiAssistantContext.Provider value={value as any}>
      {children}
    </AiAssistantContext.Provider>
  );
};

export default AiAssistantProvider;
