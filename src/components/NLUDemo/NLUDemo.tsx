import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SceneSelector } from './components/SceneSelector';
import { ChatWindow } from './components/ChatWindow';
import {
  detectIntent,
  extractReservationInfo,
  extractReminderInfo,
  parseDate,
} from './nluEngine';
import { NLU_DEMO_ORDERS, getOrderById } from './mockOrders';
import type {
  ChatMessage,
  DialogState,
  IntentType,
  QuickReplyOption,
  SceneConfig,
  ReservationSlot,
} from './types';
import { genId } from './types';
import type { OrderCardData } from '../AiAssistant/OrderCard/orderCardTypes';
import type { ReservationInfoCardData } from '../AiAssistant/ReservationInfoCard';
import type { RedeemReminder } from '../../types';
import '../AiAssistant/OrderCard/orderCard.css';
import '../AiAssistant/aiAssistant.css';
import './nluDemo.css';

const SCENES: SceneConfig[] = [
  {
    id: 'res-1',
    module: 'reservation',
    title: 'AC-1 预约提示展示',
    description: '订单卡片+预约引导提示',
    initialOrderId: 'res-food-dine-in',
    autoTriggerIntent: false,
  },
  {
    id: 'res-2',
    module: 'reservation',
    title: 'AC-2 意图识别与引导',
    description: '输入"帮我约"触发预约流程',
    initialOrderId: 'res-food-dine-in',
    autoTriggerIntent: false,
  },
  {
    id: 'res-3',
    module: 'reservation',
    title: 'AC-3 多轮信息收集',
    description: '缺项追问（日期/时间/人数）',
    initialOrderId: 'res-food-dine-in',
    autoTriggerIntent: false,
  },
  {
    id: 'res-4',
    module: 'reservation',
    title: 'AC-5 生成预约卡片',
    description: '信息完整后自动生成预约卡',
    initialOrderId: 'res-food-dine-in',
    autoTriggerIntent: false,
  },
  {
    id: 'rem-1',
    module: 'reminder',
    title: 'AC-6 临期气泡提醒',
    description: '订单卡片后延迟弹出临期提醒',
    initialOrderId: 'remind-food-unused',
    autoTriggerIntent: false,
  },
  {
    id: 'rem-2',
    module: 'reminder',
    title: 'AC-7 快捷选项',
    description: '输入"提醒"展示快捷日期选项',
    initialOrderId: 'remind-food-unused',
    autoTriggerIntent: false,
  },
  {
    id: 'rem-3',
    module: 'reminder',
    title: 'AC-8 有效期校验',
    description: '超期时提示并建议过期前一天',
    initialOrderId: 'remind-food-unused',
    autoTriggerIntent: false,
  },
  {
    id: 'rem-4',
    module: 'reminder',
    title: 'AC-9 生成提醒卡片',
    description: '确认后生成使用提醒卡片',
    initialOrderId: 'remind-food-unused',
    autoTriggerIntent: false,
  },
  {
    id: 'pick-1',
    module: 'pickup_code',
    title: 'AC-10 无前置-单个',
    description: '无订单卡时找到1个待取餐',
    initialOrderId: undefined,
    initialMessage: '取餐码',
    autoTriggerIntent: true,
  },
  {
    id: 'pick-2',
    module: 'pickup_code',
    title: 'AC-10 无前置-多个',
    description: '无订单卡时多个待取餐',
    initialOrderId: undefined,
    initialMessage: '取餐码',
    autoTriggerIntent: true,
  },
  {
    id: 'pick-3',
    module: 'pickup_code',
    title: 'AC-11 有前置-非餐饮',
    description: '非餐饮订单查询取餐码',
    initialOrderId: 'delivery-non-food',
    autoTriggerIntent: false,
  },
  {
    id: 'pick-4',
    module: 'pickup_code',
    title: 'AC-12 有前置-待使用',
    description: '餐饮待使用（券码/点单/配送）',
    initialOrderId: 'pickup-voucher-only',
    autoTriggerIntent: false,
  },
  {
    id: 'pick-5',
    module: 'pickup_code',
    title: 'AC-13 有前置-已完成',
    description: '餐饮已完成各履约方式',
    initialOrderId: 'pickup-completed-voucher',
    autoTriggerIntent: false,
  },
  {
    id: 'del-1',
    module: 'delivery',
    title: 'AC-14 无前置-单个配送中',
    description: '无订单卡时1个配送中订单',
    initialOrderId: undefined,
    initialMessage: '配送',
    autoTriggerIntent: true,
  },
  {
    id: 'del-2',
    module: 'delivery',
    title: 'AC-14 无前置-多个配送中',
    description: '无订单卡时多个配送中订单',
    initialOrderId: undefined,
    initialMessage: '配送',
    autoTriggerIntent: true,
  },
  {
    id: 'del-3',
    module: 'delivery',
    title: 'AC-15 有前置-非餐饮',
    description: '非餐饮订单查配送进度',
    initialOrderId: 'delivery-non-food',
    autoTriggerIntent: false,
  },
  {
    id: 'del-4',
    module: 'delivery',
    title: 'AC-16 取消/退款状态',
    description: '已取消或退款中订单',
    initialOrderId: 'delivery-canceled',
    autoTriggerIntent: false,
  },
  {
    id: 'del-5',
    module: 'delivery',
    title: 'AC-17 待使用-按履约模式',
    description: '待使用订单各履约分支',
    initialOrderId: 'pickup-voucher-only',
    autoTriggerIntent: false,
  },
  {
    id: 'del-6',
    module: 'delivery',
    title: 'AC-18/19 已完成配送进度',
    description: '配送核销各子状态展示',
    initialOrderId: 'delivery-single-delivering',
    autoTriggerIntent: false,
  },
  {
    id: 'del-7',
    module: 'delivery',
    title: 'AC-20 配送异常',
    description: '配送异常场景处理',
    initialOrderId: 'delivery-exception',
    autoTriggerIntent: false,
  },
];

const RESERVATION_TIPS = [
  '门店客流量大，提前预约免排队～',
  '临近假期门店繁忙，建议提前预约哦',
  '周末人气旺，建议提前预约留座～',
  '预约到店优先接待，不用等座哦',
];

function getValidUntil(order: OrderCardData | undefined): Date | null {
  if (!order?.validDate) return null;
  const parts = order.validDate.split('至');
  if (parts.length < 2) return null;
  const endStr = parts[1].trim();
  const d = new Date(endStr);
  if (isNaN(d.getTime())) return null;
  return d;
}

function formatDateShort(d: Date): string {
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  return `${month}月${day}日 ${weekday}`;
}

function calcNaturalDayDiff(from: Date, to: Date): number {
  const a = new Date(from);
  a.setHours(0, 0, 0, 0);
  const b = new Date(to);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function buildReminderQuickOptions(validUntil: Date | null): QuickReplyOption[] {
  const options: QuickReplyOption[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const addOption = (label: string, date: Date) => {
    if (validUntil && date > validUntil) return;
    const diff = calcNaturalDayDiff(today, date);
    options.push({
      id: `opt-${options.length}`,
      label: diff === 0 ? '今天' : diff === 1 ? '明天' : diff === 2 ? '后天' : label,
      value: date.toISOString(),
    });
  };

  addOption('明天', tomorrow);
  addOption('后天', dayAfter);

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
      const label = `本周${['日', '一', '二', '三', '四', '五', '六'][dayOfWeek]}`;
      const diff = calcNaturalDayDiff(today, d);
      if (diff > 2) {
        addOption(label, d);
      }
    }
  }

  for (let i = 7; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
      const label = `下周${['日', '一', '二', '三', '四', '五', '六'][dayOfWeek]}`;
      addOption(label, d);
    }
  }

  if (validUntil) {
    const lastDay = new Date(validUntil);
    const lastDayDiff = calcNaturalDayDiff(today, lastDay);
    if (lastDayDiff > 0) {
      options.push({
        id: `opt-last`,
        label: '最后一天',
        value: lastDay.toISOString(),
      });
    }
    const oneDayBefore = new Date(validUntil);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    const oneDayDiff = calcNaturalDayDiff(today, oneDayBefore);
    if (oneDayDiff >= 0) {
      options.push({
        id: `opt-1day-before`,
        label: '过期前1天',
        value: oneDayBefore.toISOString(),
      });
    }
    const threeDaysBefore = new Date(validUntil);
    threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
    const threeDayDiff = calcNaturalDayDiff(today, threeDaysBefore);
    if (threeDayDiff >= 0) {
      options.push({
        id: `opt-3day-before`,
        label: '过期前3天',
        value: threeDaysBefore.toISOString(),
      });
    }
  }

  return options;
}

export const NLUDemo: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'reservation' | 'reminder' | 'pickup_code' | 'delivery'>('reservation');
  const [activeSceneId, setActiveSceneId] = useState<string | null>('res-1');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [dialogState, setDialogState] = useState<DialogState>({
    intent: 'unknown',
    step: 'idle',
    reservationSlot: { date: null, time: null, pax: null },
    reminderSlot: { remindAt: null },
    currentOrderId: null,
    hasOrderCard: false,
  });
  const [urgentBubble, setUrgentBubble] = useState<{ text: string; short: boolean } | null>(null);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const currentOrder = dialogState.currentOrderId
    ? getOrderById(dialogState.currentOrderId)
    : undefined;

  const pushAssistantMessage = useCallback((message: Omit<ChatMessage, 'id' | 'role' | 'timestamp'>) => {
    const msg: ChatMessage = {
      id: genId(),
      role: 'assistant',
      timestamp: Date.now(),
      ...message,
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const pushUserMessage = useCallback((content: string) => {
    const msg: ChatMessage = {
      id: genId(),
      role: 'user',
      type: 'text',
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const simulateTyping = useCallback((delay?: number) => {
    setIsTyping(true);
    return new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        setIsTyping(false);
        resolve();
      }, delay ?? 500 + Math.random() * 300);
      timersRef.current.push(t);
    });
  }, []);

  const handleSceneSelect = useCallback(async (scene: SceneConfig) => {
    clearAllTimers();
    setActiveSceneId(scene.id);
    setMessages([]);
    setUrgentBubble(null);
    setDialogState({
      intent: 'unknown',
      step: 'idle',
      reservationSlot: { date: null, time: null, pax: null },
      reminderSlot: { remindAt: null },
      currentOrderId: scene.initialOrderId ?? null,
      hasOrderCard: !!scene.initialOrderId,
    });

    if (scene.initialOrderId) {
      const order = getOrderById(scene.initialOrderId);
      if (order) {
        await simulateTyping(300);
        pushAssistantMessage({
          type: 'order_card',
          orderCard: order,
        });

        if (scene.module === 'reservation') {
          const tip = RESERVATION_TIPS[Math.floor(Math.random() * RESERVATION_TIPS.length)];
          const t1 = setTimeout(() => {
            setUrgentBubble({ text: tip, short: false });
            const t2 = setTimeout(() => {
              setUrgentBubble({ text: '预约提示', short: true });
            }, 5000);
            timersRef.current.push(t2);
          }, 1500);
          timersRef.current.push(t1);
        }

        if (scene.module === 'reminder') {
          const validUntil = getValidUntil(order);
          if (validUntil) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diff = calcNaturalDayDiff(today, validUntil);
            if (diff <= 7 && diff > 0) {
              const t1 = setTimeout(() => {
                setUrgentBubble({
                  text: `订单还有 ${diff} 天过期，请尽快使用～`,
                  short: false,
                });
                const t2 = setTimeout(() => {
                  setUrgentBubble({ text: '临期提醒', short: true });
                }, 5000);
                timersRef.current.push(t2);
              }, 1500);
              timersRef.current.push(t1);
            }
          }
        }
      }
    }

    if (scene.autoTriggerIntent && scene.initialMessage) {
      setTimeout(() => {
        handleSendMessage(scene.initialMessage!);
      }, 800);
    }
  }, [clearAllTimers, simulateTyping, pushAssistantMessage]);

  const handleReservation = useCallback(async (userText: string) => {
    setDialogState((prev) => {
      const newSlot = extractReservationInfo(userText, prev.reservationSlot);
      return { ...prev, reservationSlot: newSlot };
    });

    await simulateTyping();

    setDialogState((prev) => {
      const slot = prev.reservationSlot;
      const missing: string[] = [];
      if (!slot.date) missing.push('预约日期');
      if (!slot.time) missing.push('预约时间');
      if (!slot.pax) missing.push('就餐人数');

      if (missing.length === 0) {
        const order = prev.currentOrderId ? getOrderById(prev.currentOrderId) : undefined;
        const dateStr = slot.date ? formatDateShort(slot.date).split(' ')[0] : '';
        const reservationData: ReservationInfoCardData = {
          orderId: prev.currentOrderId || undefined,
          reservationNo: `YY${Date.now()}`,
          serviceType: '到店预约',
          storeName: order?.storeName || '门店',
          storeAddress: '',
          businessHours: '10:00-22:00',
          arrivalTime: `${dateStr} ${slot.time}`,
          pax: slot.pax || 2,
          phone: '158****8127',
          acceptStatus: 'pending',
          estimatedAcceptTime: '2分钟内',
          acceptDeadlineAt: Date.now() + 120 * 1000,
        };

        setTimeout(() => {
          pushAssistantMessage({
            type: 'reservation_card',
            reservationCard: reservationData,
          });

          const acceptTimer = setTimeout(() => {
            setMessages((msgs) =>
              msgs.map((m) => {
                if (m.reservationCard?.reservationNo === reservationData.reservationNo && m.reservationCard) {
                  return {
                    ...m,
                    reservationCard: {
                      ...m.reservationCard,
                      acceptStatus: 'accepted' as const,
                      merchantAcceptAt: Date.now(),
                    },
                  };
                }
                return m;
              })
            );
          }, 2500);
          timersRef.current.push(acceptTimer);
        }, 100);

        return { ...prev, step: 'completed', intent: 'reservation' };
      }

      if (missing.length === 1) {
        const labelMap: Record<string, string> = {
          '预约日期': '请问预约哪天呢？',
          '预约时间': '请问几点到店呢？',
          '就餐人数': '请问几位呢？',
        };
        pushAssistantMessage({
          type: 'text',
          content: `好的，${labelMap[missing[0]] || missing[0]}`,
        });
      } else if (missing.length === 2) {
        pushAssistantMessage({
          type: 'text',
          content: `好的，请告诉我${missing[0]}和${missing[1]}，我来帮你预约～`,
        });
      } else {
        pushAssistantMessage({
          type: 'quick_replies',
          content: '请告诉我你要预约什么时间、几个人，我会帮你预约最近的门店',
          quickReplies: [{ id: 'help-book', label: '帮我约', value: '帮我约' }],
        });
      }

      return { ...prev, step: 'collecting', intent: 'reservation' };
    });
  }, [simulateTyping, pushAssistantMessage]);

  const handleReminder = useCallback(async (userText: string) => {
    const order = dialogState.currentOrderId ? getOrderById(dialogState.currentOrderId) : undefined;
    const validUntil = getValidUntil(order);

    setDialogState((prev) => {
      const { slot } = extractReminderInfo(userText, prev.reminderSlot, validUntil || undefined);
      return { ...prev, reminderSlot: slot };
    });

    await simulateTyping();

    setDialogState((prev) => {
      const slot = prev.reminderSlot;

      if (!slot.remindAt) {
        const quickOptions = buildReminderQuickOptions(validUntil);
        pushAssistantMessage({
          type: 'quick_replies',
          content: '请告诉我提醒时间',
          quickReplies: quickOptions,
        });
        return { ...prev, step: 'collecting', intent: 'reminder' };
      }

      if (validUntil && slot.remindAt > validUntil) {
        pushAssistantMessage({
          type: 'quick_replies',
          content: '提醒日期不可以超过订单有效期哦，是否需要在过期前一天提醒？',
          quickReplies: [
            { id: 'yes', label: '是', value: '是' },
            { id: 'no', label: '否', value: '否' },
          ],
        });
        return { ...prev, step: 'confirming', intent: 'reminder' };
      }

      const orderProduct = order?.productName || '订单';
      const reminder: RedeemReminder = {
        id: genId(),
        orderId: prev.currentOrderId || '',
        remindAt: slot.remindAt.getTime(),
        status: 'active',
        createdAt: Date.now(),
      };

      pushAssistantMessage({
        type: 'reminder_card',
        reminderCard: {
          reminder,
          productName: orderProduct,
        },
      });

      return { ...prev, step: 'completed', intent: 'reminder' };
    });
  }, [dialogState.currentOrderId, simulateTyping, pushAssistantMessage]);

  const handlePickupCode = useCallback(async () => {
    await simulateTyping();
    const order = currentOrder;

    if (!dialogState.hasOrderCard || !order) {
      const waitingPickupOrders = Object.values(NLU_DEMO_ORDERS).filter(
        (o) => o.orderStatus === 'waiting_pickup' && o.extension?.type === 'pickup_code'
      );

      if (waitingPickupOrders.length === 1) {
        const o = waitingPickupOrders[0];
        pushAssistantMessage({
          type: 'text',
          content: '帮你找到一个待取餐订单',
        });
        setTimeout(() => {
          pushAssistantMessage({
            type: 'order_card',
            orderCard: o,
          });
        }, 200);
        setDialogState((prev) => ({ ...prev, currentOrderId: o.id, hasOrderCard: true }));
      } else if (waitingPickupOrders.length > 1) {
        pushAssistantMessage({
          type: 'text',
          content: '你有多个待取餐订单，请选择要查看的订单',
        });
        waitingPickupOrders.slice(0, 3).forEach((o, i) => {
          setTimeout(() => {
            pushAssistantMessage({
              type: 'order_card',
              orderCard: o,
            });
          }, 200 * (i + 1));
        });
      } else {
        pushAssistantMessage({
          type: 'quick_replies',
          content: '没有找到待取餐订单',
          quickReplies: [{ id: 'select', label: '选择订单', value: '选择订单' }],
        });
      }
      return;
    }

    if (order.category !== 'food') {
      pushAssistantMessage({
        type: 'quick_replies',
        content: '您咨询的订单不是餐饮订单，没有取餐码，是否要咨询其他订单',
        quickReplies: [{ id: 'select', label: '选择订单', value: '选择订单' }],
      });
      return;
    }

    if (order.orderStatus === 'refunding' || order.orderStatus === 'refund_success') {
      pushAssistantMessage({
        type: 'quick_replies',
        content: '该订单已申请退款，没有取餐码',
        quickReplies: [{ id: 'select', label: '选择订单', value: '选择订单' }],
      });
      return;
    }

    if (order.orderStatus === 'cancelled') {
      pushAssistantMessage({
        type: 'quick_replies',
        content: '该订单已取消，没有取餐码',
        quickReplies: [{ id: 'select', label: '选择订单', value: '选择订单' }],
      });
      return;
    }

    if (order.orderStatus === 'unused') {
      const redeemTypes = order.redeemTypes || [];

      if (redeemTypes.length === 0 || redeemTypes.includes('voucher') && redeemTypes.length === 1) {
        pushAssistantMessage({
          type: 'quick_replies',
          content: '该订单为到店券码核销订单，暂时没有取餐码，是否需要查看券码？',
          quickReplies: [{ id: 'voucher', label: '查看券码', value: '查看券码' }],
        });
        return;
      }

      if (redeemTypes.includes('delivery') && !redeemTypes.includes('order')) {
        pushAssistantMessage({
          type: 'quick_replies',
          content: '该订单支持配送，暂时没有取餐码，是否需要我帮你预约配送？',
          quickReplies: [
            { id: 'yes', label: '是', value: '是' },
            { id: 'no', label: '否', value: '否' },
          ],
        });
        return;
      }

      if (redeemTypes.includes('order')) {
        pushAssistantMessage({
          type: 'quick_replies',
          content: '该订单支持到店点单核销，暂时没有取餐码，是否需要我帮你点单？',
          quickReplies: [
            { id: 'yes', label: '是', value: '是' },
            { id: 'no', label: '否', value: '否' },
          ],
        });
        return;
      }
    }

    if (order.orderStatus === 'completed') {
      const redeemMethod = order.redeemMethod;

      if (redeemMethod === 'voucher') {
        if (order.tags?.some((t) => t.includes('商家App') || t.includes('微信'))) {
          pushAssistantMessage({
            type: 'text',
            content:
              '没有找到取餐码，如果在商家App/微信小程序核销，可通过原渠道查找取餐码',
          });
        } else {
          pushAssistantMessage({
            type: 'quick_replies',
            content: '该订单为券码核销订单，没有取餐码',
            quickReplies: [{ id: 'select', label: '选择订单', value: '选择订单' }],
          });
        }
        return;
      }

      if (redeemMethod === 'self_order') {
        pushAssistantMessage({
          type: 'text',
          content: '取餐码信息如下',
        });
        setTimeout(() => {
          pushAssistantMessage({
            type: 'order_card',
            orderCard: order,
          });
        }, 200);
        return;
      }

      if (redeemMethod === 'delivery') {
        pushAssistantMessage({
          type: 'text',
          content: '该订单为配送订单，配送进度如下',
        });
        setTimeout(() => {
          pushAssistantMessage({
            type: 'order_card',
            orderCard: order,
          });
        }, 200);
        return;
      }
    }

    pushAssistantMessage({
      type: 'order_card',
      orderCard: order,
    });
  }, [currentOrder, dialogState.hasOrderCard, simulateTyping, pushAssistantMessage]);

  const handleDelivery = useCallback(async () => {
    await simulateTyping();
    const order = currentOrder;

    if (!dialogState.hasOrderCard || !order) {
      const deliveringOrders = Object.values(NLU_DEMO_ORDERS).filter(
        (o) =>
          (o.orderStatus === 'delivering' ||
            o.orderStatus === 'preparing' ||
            o.orderStatus === 'pending_accept' ||
            o.orderStatus === 'waiting_pickup') &&
          o.redeemMethod === 'delivery'
      );

      if (deliveringOrders.length === 1) {
        const o = deliveringOrders[0];
        pushAssistantMessage({
          type: 'text',
          content: '帮你找到一个配送中的订单',
        });
        setTimeout(() => {
          pushAssistantMessage({
            type: 'order_card',
            orderCard: o,
          });
        }, 200);
        setDialogState((prev) => ({ ...prev, currentOrderId: o.id, hasOrderCard: true }));
      } else if (deliveringOrders.length > 1) {
        pushAssistantMessage({
          type: 'text',
          content: '你有多个配送中的订单，请选择要查看的订单',
        });
        deliveringOrders.slice(0, 3).forEach((o, i) => {
          setTimeout(() => {
            pushAssistantMessage({
              type: 'order_card',
              orderCard: o,
            });
          }, 200 * (i + 1));
        });
      } else {
        pushAssistantMessage({
          type: 'quick_replies',
          content: '没有找到正在配送中的订单',
          quickReplies: [{ id: 'select', label: '选择订单', value: '选择订单' }],
        });
      }
      return;
    }

    if (order.category !== 'food') {
      pushAssistantMessage({
        type: 'quick_replies',
        content: '您咨询的订单不是餐饮配送订单，暂时没有配送进度',
        quickReplies: [{ id: 'select', label: '选择订单', value: '选择订单' }],
      });
      return;
    }

    if (order.orderStatus === 'cancelled') {
      pushAssistantMessage({
        type: 'quick_replies',
        content: '该订单已取消，没有配送进度',
        quickReplies: [{ id: 'select', label: '选择订单', value: '选择订单' }],
      });
      return;
    }

    if (order.orderStatus === 'refunding' || order.orderStatus === 'refund_success') {
      pushAssistantMessage({
        type: 'quick_replies',
        content: '该订单已退款，没有配送进度',
        quickReplies: [{ id: 'select', label: '选择订单', value: '选择订单' }],
      });
      return;
    }

    if (order.orderStatus === 'unused') {
      const redeemTypes = order.redeemTypes || [];

      if (redeemTypes.includes('voucher') && redeemTypes.length === 1) {
        pushAssistantMessage({
          type: 'quick_replies',
          content: '该订单为到店券码核销订单，暂时没有配送进度',
          quickReplies: [{ id: 'voucher', label: '查看券码', value: '查看券码' }],
        });
        return;
      }

      if (redeemTypes.includes('delivery')) {
        pushAssistantMessage({
          type: 'quick_replies',
          content: '该订单还未预约配送，是否需要帮你预约配送？',
          quickReplies: [
            { id: 'yes', label: '是', value: '是' },
            { id: 'no', label: '否', value: '否' },
          ],
        });
        return;
      }

      if (redeemTypes.includes('order')) {
        pushAssistantMessage({
          type: 'quick_replies',
          content: '订单不支持配送，暂无配送进度，是否需要帮你点单到店自提？',
          quickReplies: [
            { id: 'yes', label: '是', value: '是' },
            { id: 'no', label: '否', value: '否' },
          ],
        });
        return;
      }
    }

    if (order.orderStatus === 'completed') {
      const redeemMethod = order.redeemMethod;

      if (redeemMethod === 'voucher') {
        if (order.tags?.some((t) => t.includes('商家App') || t.includes('微信'))) {
          pushAssistantMessage({
            type: 'text',
            content:
              '没有找到配送进度，如果在商家App/微信小程序核销，可通过原渠道查看',
          });
        } else {
          pushAssistantMessage({
            type: 'quick_replies',
            content: '该订单为到店券码核销订单，没有配送进度',
            quickReplies: [{ id: 'select', label: '选择订单', value: '选择订单' }],
          });
        }
        return;
      }

      if (redeemMethod === 'self_order') {
        pushAssistantMessage({
          type: 'quick_replies',
          content: '该订单为到店自取订单，没有配送进度',
          quickReplies: [{ id: 'pickup', label: '查看取餐码', value: '查看取餐码' }],
        });
        return;
      }

      if (redeemMethod === 'delivery') {
        pushAssistantMessage({
          type: 'text',
          content: '配送进度如下',
        });
        setTimeout(() => {
          pushAssistantMessage({
            type: 'order_card',
            orderCard: order,
          });
        }, 200);
        return;
      }
    }

    if (order.orderStatus === 'pending_accept') {
      pushAssistantMessage({
        type: 'text',
        content: '商家正在确认订单，请稍后查看配送进度',
      });
      setTimeout(() => {
        pushAssistantMessage({
          type: 'order_card',
          orderCard: order,
        });
      }, 200);
      return;
    }

    if (order.orderStatus === 'preparing') {
      pushAssistantMessage({
        type: 'text',
        content: '商家正在备餐，备餐完成后将安排骑手配送',
      });
      setTimeout(() => {
        pushAssistantMessage({
          type: 'order_card',
          orderCard: order,
        });
      }, 200);
      return;
    }

    if (order.orderStatus === 'waiting_pickup') {
      pushAssistantMessage({
        type: 'text',
        content: '订单已备好，正在等待骑手取餐',
      });
      setTimeout(() => {
        pushAssistantMessage({
          type: 'order_card',
          orderCard: order,
        });
      }, 200);
      return;
    }

    if (order.orderStatus === 'delivering') {
      if (order.statusText === '配送异常') {
        pushAssistantMessage({
          type: 'text',
          content: '配送可能存在异常，建议联系商家或骑手确认',
        });
        setTimeout(() => {
          pushAssistantMessage({
            type: 'order_card',
            orderCard: order,
          });
        }, 200);
        return;
      }
      pushAssistantMessage({
        type: 'text',
        content: '骑手正在配送中，请耐心等待',
      });
      setTimeout(() => {
        pushAssistantMessage({
          type: 'order_card',
          orderCard: order,
        });
      }, 200);
      return;
    }

    pushAssistantMessage({
      type: 'order_card',
      orderCard: order,
    });
  }, [currentOrder, dialogState.hasOrderCard, simulateTyping, pushAssistantMessage]);

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      pushUserMessage(text.trim());
      setInputValue('');

      const { intent } = detectIntent(text);

      if (dialogState.step === 'confirming' && dialogState.intent === 'reminder') {
        if (text === '是' || text.includes('好') || text.includes('可以')) {
          const order = currentOrder;
          const validUntil = getValidUntil(order);
          if (validUntil) {
            const oneDayBefore = new Date(validUntil);
            oneDayBefore.setDate(oneDayBefore.getDate() - 1);
            setDialogState((prev) => ({
              ...prev,
              reminderSlot: { remindAt: oneDayBefore },
            }));
            await simulateTyping();
            const orderProduct = order?.productName || '订单';
            const reminder: RedeemReminder = {
              id: genId(),
              orderId: dialogState.currentOrderId || '',
              remindAt: oneDayBefore.getTime(),
              status: 'active',
              createdAt: Date.now(),
            };
            pushAssistantMessage({
              type: 'reminder_card',
              reminderCard: {
                reminder,
                productName: orderProduct,
              },
            });
            setDialogState((prev) => ({ ...prev, step: 'completed' }));
          }
          return;
        } else {
          await simulateTyping();
          pushAssistantMessage({
            type: 'text',
            content: '好的，那你可以告诉我想设置哪天的提醒哦',
          });
          setDialogState((prev) => ({ ...prev, step: 'collecting' }));
          return;
        }
      }

      if (intent === 'reservation') {
        setDialogState((prev) => ({ ...prev, intent, step: 'collecting' }));
        handleReservation(text);
        return;
      }

      if (intent === 'reminder') {
        setDialogState((prev) => ({ ...prev, intent, step: 'collecting' }));
        handleReminder(text);
        return;
      }

      if (intent === 'pickup_code') {
        setDialogState((prev) => ({ ...prev, intent, step: 'completed' }));
        handlePickupCode();
        return;
      }

      if (intent === 'delivery') {
        setDialogState((prev) => ({ ...prev, intent, step: 'completed' }));
        handleDelivery();
        return;
      }

      if (dialogState.intent === 'reservation' && dialogState.step === 'collecting') {
        handleReservation(text);
        return;
      }

      if (dialogState.intent === 'reminder' && dialogState.step === 'collecting') {
        handleReminder(text);
        return;
      }

      await simulateTyping();
      pushAssistantMessage({
        type: 'text',
        content: '你可以试试说"帮我约""取餐码""配送""设置提醒"，我来帮你处理哦～',
      });
    },
    [
      pushUserMessage,
      dialogState,
      currentOrder,
      simulateTyping,
      pushAssistantMessage,
      handleReservation,
      handleReminder,
      handlePickupCode,
      handleDelivery,
    ]
  );

  const handleQuickReply = useCallback(
    (option: QuickReplyOption) => {
      if (option.value) {
        handleSendMessage(option.value);
      } else {
        handleSendMessage(option.label);
      }
    },
    [handleSendMessage]
  );

  const handleOrderAction = useCallback(
    (label: string) => {
      if (label.includes('帮我约')) {
        handleSendMessage('帮我约');
      } else if (label.includes('使用提醒') || label.includes('⏰')) {
        handleSendMessage('设置提醒');
      } else if (label.includes('查看券码') || label.includes('🎫')) {
        pushUserMessage(label);
        simulateTyping().then(() => {
          pushAssistantMessage({
            type: 'text',
            content: '好的，这是您的券码信息',
          });
        });
      } else if (label.includes('立即点单')) {
        pushUserMessage(label);
        simulateTyping().then(() => {
          pushAssistantMessage({
            type: 'quick_replies',
            content: '好的，是否需要我帮你点单到店自提？',
            quickReplies: [
              { id: 'yes', label: '是', value: '是' },
              { id: 'no', label: '否', value: '否' },
            ],
          });
        });
      } else if (label.includes('立即配送')) {
        pushUserMessage(label);
        simulateTyping().then(() => {
          pushAssistantMessage({
            type: 'quick_replies',
            content: '好的，是否需要帮你预约配送？',
            quickReplies: [
              { id: 'yes', label: '是', value: '是' },
              { id: 'no', label: '否', value: '否' },
            ],
          });
        });
      }
    },
    [handleSendMessage, pushUserMessage, simulateTyping, pushAssistantMessage]
  );

  const handleSuggestion = useCallback(
    (s: string) => {
      handleSendMessage(s);
    },
    [handleSendMessage]
  );

  const handleReset = useCallback(() => {
    clearAllTimers();
    setMessages([]);
    setUrgentBubble(null);
    setDialogState({
      intent: 'unknown',
      step: 'idle',
      reservationSlot: { date: null, time: null, pax: null },
      reminderSlot: { remindAt: null },
      currentOrderId: activeSceneId
        ? SCENES.find((s) => s.id === activeSceneId)?.initialOrderId ?? null
        : null,
      hasOrderId: false,
    } as any);
    setActiveSceneId(null);
  }, [clearAllTimers, activeSceneId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  useEffect(() => {
    const scene = SCENES.find((s) => s.id === 'res-1');
    if (scene) handleSceneSelect(scene);
  }, [handleSceneSelect]);

  return (
    <div className="nlu-demo-container">
      <SceneSelector
        activeModule={activeModule}
        onModuleChange={(m) => {
          setActiveModule(m);
          const firstScene = SCENES.find((s) => s.module === m);
          if (firstScene) handleSceneSelect(firstScene);
        }}
        scenes={SCENES}
        activeSceneId={activeSceneId}
        onSceneSelect={handleSceneSelect}
      />
      <div className="nlu-demo-main">
        <div className="nlu-demo-header">
          <div>
            <div className="nlu-demo-header-title">AI 助手</div>
            <div className="nlu-demo-header-sub">
              {activeSceneId
                ? SCENES.find((s) => s.id === activeSceneId)?.title
                : '选择左侧场景开始体验'}
            </div>
          </div>
          <button className="nlu-demo-reset-btn" onClick={handleReset}>
            重置对话
          </button>
        </div>
        {urgentBubble && (
          <div
            className={`nlu-demo-urgent-bubble ${urgentBubble.short ? 'short' : ''}`}
            style={{ margin: '12px 20px 0' }}
            onClick={() => setUrgentBubble(null)}
          >
            {urgentBubble.text}
          </div>
        )}
        <ChatWindow
          messages={messages}
          isTyping={isTyping}
          onQuickReply={handleQuickReply}
          onOrderAction={handleOrderAction}
          onSuggestion={handleSuggestion}
        />
        <div className="nlu-demo-input-area">
          <textarea
            className="nlu-demo-input"
            placeholder="输入消息，试试说'帮我约''取餐码''配送''设置提醒'"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className="nlu-demo-send-btn"
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim()}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};

export default NLUDemo;
