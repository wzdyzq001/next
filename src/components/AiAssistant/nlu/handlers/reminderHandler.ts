import type { NluContext, NluResponse } from '../types';
import { createQuickReply } from '../utils';
import { extractDate, extractTime, parseDateToTimestamp } from '../entityExtractor';
import { canOrderSetReminder } from './reminderOrderValidator';
import { getReminderBeforeReservation, validateReminderTimeAgainstReservation } from '../reservationReminderUtils';
import { MOCK_REMINDER } from '../scenarioData';
import type { ReminderStep } from '../types';
import { setReminder as saveReminderToStorage } from '../../../../redeemReminder';

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function isPositiveAnswer(message: string): boolean {
  const positiveKeywords = ['是', '确认', '好的', '对', '没问题', '可以', '嗯', '行', 'ok', 'OK', '好', '设置'];
  return positiveKeywords.some((keyword) => message.includes(keyword));
}

function isNegativeAnswer(message: string): boolean {
  const negativeKeywords = ['不', '否', '算了', '不用', '不要', '取消', '换'];
  return negativeKeywords.some((keyword) => message.includes(keyword));
}

function formatReminderDate(timestamp: number): string {
  const d = new Date(timestamp);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekDay = DAY_LABELS[d.getDay()];
  return `${month}月${day}日（周${weekDay}）`;
}

function formatReminderTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

function formatReminderDateTime(remindAt: number): { dateStr: string; timeStr: string } {
  return {
    dateStr: formatReminderDate(remindAt),
    timeStr: formatReminderTime(remindAt),
  };
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function buildQuickDateOptions(validDate: string, now: number): string[] {
  const today = startOfDay(now);
  const validDateTs = parseDateToTimestamp('最后一天', validDate, now);
  if (!validDateTs) return [];

  const candidates: { label: string; ts: number; priority: number }[] = [
    { label: '明天', ts: parseDateToTimestamp('明天', validDate, now) || 0, priority: 1 },
    { label: '后天', ts: parseDateToTimestamp('后天', validDate, now) || 0, priority: 2 },
    { label: '过期前1天', ts: parseDateToTimestamp('过期前1天', validDate, now) || 0, priority: 3 },
    { label: '过期前3天', ts: parseDateToTimestamp('过期前3天', validDate, now) || 0, priority: 4 },
  ];

  const validCandidates = candidates.filter(
    (c) => c.ts > 0 && c.ts >= today && c.ts <= validDateTs
  );

  const seenDays = new Set<number>();
  const result: string[] = [];

  validCandidates.sort((a, b) => a.priority - b.priority);

  for (const c of validCandidates) {
    const dayKey = startOfDay(c.ts);
    if (!seenDays.has(dayKey)) {
      seenDays.add(dayKey);
      result.push(c.label);
      if (result.length >= 4) break;
    }
  }

  return result;
}

export function validateDateTime(
  dateStr: string,
  timeStr: string,
  validDate: string,
  now: number
): { valid: boolean; error?: string; dateTimestamp?: number; remindAt?: number } {
  const dateTimestamp = parseDateToTimestamp(dateStr, validDate, now);
  if (!dateTimestamp) {
    return { valid: false, error: '无法识别日期，请重新表述' };
  }

  const today = startOfDay(now);
  const validDateTs = parseDateToTimestamp('最后一天', validDate, now);

  if (dateTimestamp < today) {
    return { valid: false, error: '提醒日期不能是过去的时间，请调整日期' };
  }

  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) {
    return { valid: false, error: '无法识别时间，请重新表述' };
  }

  const hour = parseInt(timeMatch[1]);
  const minute = parseInt(timeMatch[2]);
  const remindAt = dateTimestamp + hour * 3600 * 1000 + minute * 60 * 1000;

  if (dateTimestamp === today && remindAt <= now) {
    return { valid: false, error: '提醒时间已过，请调整时间' };
  }

  if (validDateTs && dateTimestamp > validDateTs) {
    return { valid: false, error: '提醒日期不能晚于订单有效期，请调整日期' };
  }

  if (validDateTs && dateTimestamp === validDateTs) {
    const timeMinutes = hour * 60 + minute;
    if (timeMinutes > 18 * 60) {
      return { valid: false, error: '提醒时间不能晚于有效期当天18:00' };
    }
  }

  return { valid: true, dateTimestamp, remindAt };
}

export function handleReminderIntent(
  message: string,
  context: NluContext
): NluResponse {
  const { dialogState, orderCard } = context;
  const reminderStep = (dialogState.reminderStep || 'idle') as ReminderStep;

  if (reminderStep === 'selecting_order') {
    return handleSelectingOrder(message, context);
  }

  if (reminderStep === 'validating_order') {
    return handleValidatingOrder(message, context);
  }

  if (reminderStep === 'checking_existing') {
    return handleCheckingExisting(message, context);
  }

  if (reminderStep === 'collecting_datetime') {
    return handleCollectingDateTime(message, context);
  }

  if (reminderStep === 'confirming') {
    return handleConfirming(message, context);
  }

  if (reminderStep === 'completed') {
    return handleCompleted(message, context);
  }

  if (orderCard) {
    return startValidatingOrder(orderCard, context);
  }

  return startSelectingOrder(context);
}

function startSelectingOrder(context: NluContext): NluResponse {
  const { dialogState } = context;
  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '请选择要提醒使用的订单',
        quickReplies: [createQuickReply('qr-select-order', '选择订单', 'open_order_selector')],
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'reminder',
      currentStep: 'selecting_order',
      reminderStep: 'selecting_order',
    },
  };
}

function handleSelectingOrder(_message: string, context: NluContext): NluResponse {
  const { dialogState, orderCard } = context;
  if (orderCard) {
    return startValidatingOrder(orderCard, context);
  }
  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '请选择要提醒使用的订单',
        quickReplies: [createQuickReply('qr-select-order', '选择订单', 'open_order_selector')],
      },
    ],
    newDialogState: dialogState,
  };
}

function startValidatingOrder(orderCard: any, context: NluContext): NluResponse {
  const { dialogState } = context;
  const validation = canOrderSetReminder(orderCard);

  if (!validation.canSet) {
    let content = '';
    if (validation.reason === 'status') {
      content = '仅待使用订单支持设置使用提醒，请选择其他订单';
    } else if (validation.reason === 'has_booking') {
      content = validation.hint || '该订单已有预约，请按预约时间出行';
    } else {
      content = '该订单不支持设置使用提醒，请选择其他订单';
    }

    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content,
          quickReplies: [createQuickReply('qr-reselect-order', '重新选择', 'open_order_selector')],
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'reminder',
        currentStep: 'selecting_order',
        reminderStep: 'selecting_order',
      },
    };
  }

  const orderId = orderCard.id || '';
  const productName = orderCard.productName || '';
  const validDate = orderCard.validDate || '';
  const reservationTimestamp = validation.reservationTimestamp;
  const isFromReservation = !!reservationTimestamp;

  const data = (dialogState.data || {}) as Record<string, any>;
  const newData = {
    ...data,
    reservationTimestamp,
    isFromReservation,
  };

  return startCheckingExisting(orderId, productName, validDate, context, newData);
}

function handleValidatingOrder(_message: string, context: NluContext): NluResponse {
  const { orderCard } = context;
  if (orderCard) {
    return startValidatingOrder(orderCard, context);
  }
  return startSelectingOrder(context);
}

function startCheckingExisting(
  orderId: string,
  productName: string,
  validDate: string,
  context: NluContext,
  extraData?: Record<string, any>
): NluResponse {
  const { dialogState } = context;
  const data = (dialogState.data || {}) as Record<string, any>;
  const mergedData = { ...data, ...extraData };

  const existingReminder = (mergedData as any).existingReminder;
  if (existingReminder && existingReminder.status === 'active') {
    const { dateStr, timeStr } = formatReminderDateTime(existingReminder.remindAt);
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: `您已设置了 ${dateStr} ${timeStr} 的使用提醒，是否修改？`,
          quickReplies: [
            createQuickReply('qr-keep-reminder', '保持不变'),
            createQuickReply('qr-modify-reminder', '修改提醒'),
          ],
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'reminder',
        currentStep: 'checking_existing',
        reminderStep: 'checking_existing',
        data: {
          ...mergedData,
          orderId,
          productName,
          validDate,
          existingReminder,
        },
      },
    };
  }

  return startCollectingDateTime(orderId, productName, validDate, context, false, undefined, undefined, extraData);
}

function handleCheckingExisting(message: string, context: NluContext): NluResponse {
  const { dialogState } = context;
  const data = (dialogState.data || {}) as Record<string, any>;

  const orderId = data.orderId || '';
  const productName = data.productName || '';
  const validDate = data.validDate || '';
  const existingReminder = data.existingReminder;

  const isModify = message === 'qr-modify-reminder' || message.includes('修改') || message.includes('改');
  const isKeep = message === 'qr-keep-reminder' || message.includes('保持') || message.includes('不变') || message.includes('不用');

  if (isModify) {
    let prefillDate = '';
    let prefillTime = '';
    if (existingReminder) {
      const ts = existingReminder.remindAt;
      const d = new Date(ts);
      prefillDate = `${d.getMonth() + 1}月${d.getDate()}日`;
      prefillTime = formatReminderTime(ts);
    }
    return startCollectingDateTime(orderId, productName, validDate, context, true, prefillDate, prefillTime);
  }

  if (isKeep) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '好的，提醒保持不变~',
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: null,
        currentStep: 'idle',
        reminderStep: 'idle',
      },
    };
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '请问是否要修改提醒？',
        quickReplies: [
          createQuickReply('qr-keep-reminder', '保持不变'),
          createQuickReply('qr-modify-reminder', '修改提醒'),
        ],
      },
    ],
    newDialogState: dialogState,
  };
}

function formatShortDate(timestamp: number): string {
  const d = new Date(timestamp);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}月${day}日`;
}

function startCollectingDateTime(
  orderId: string,
  productName: string,
  validDate: string,
  context: NluContext,
  isModifying: boolean,
  prefillDate?: string,
  prefillTime?: string,
  extraData?: Record<string, any>
): NluResponse {
  const { dialogState } = context;
  const data = (dialogState.data || {}) as Record<string, any>;
  const mergedData = { ...data, ...extraData };
  const now = Date.now();

  const reservationTimestamp = mergedData.reservationTimestamp as number | undefined;
  const isFromReservation = !!reservationTimestamp;

  const quickDateOptions = buildQuickDateOptions(validDate, now);
  const quickReplies = quickDateOptions.map((opt, i) =>
    createQuickReply(`qr-date-${i + 1}`, opt)
  );

  const newData: Record<string, any> = {
    ...mergedData,
    orderId,
    productName,
    validDate,
    isModifying,
    isDefaultTimeUsed: false,
  };

  let content = '请告诉我提醒日期、时间';

  if (isFromReservation && reservationTimestamp && !prefillDate && !prefillTime) {
    const defaultRemindAt = getReminderBeforeReservation(reservationTimestamp);
    const reservationShortDate = formatShortDate(reservationTimestamp);
    const reservationTimeStr = formatReminderTime(reservationTimestamp);
    const reminderShortDate = formatShortDate(defaultRemindAt);
    const reminderTimeStr = formatReminderTime(defaultRemindAt);

    const d = new Date(defaultRemindAt);
    newData.date = `${d.getMonth() + 1}月${d.getDate()}日`;
    newData.time = formatReminderTime(defaultRemindAt);
    newData.isDefaultTimeUsed = true;

    content = `您已有 ${reservationShortDate} ${reservationTimeStr} 的预约，推荐设置预约前 1 小时（${reminderShortDate} ${reminderTimeStr}）的使用提醒，也可以告诉我其他时间～`;
  } else if (prefillDate || prefillTime) {
    if (prefillDate) {
      newData.date = prefillDate;
    }
    if (prefillTime) {
      newData.time = prefillTime;
    }
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content,
        quickReplies,
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'reminder',
      currentStep: 'collecting_datetime',
      reminderStep: 'collecting_datetime',
      data: newData,
    },
  };
}

function handleCollectingDateTime(message: string, context: NluContext): NluResponse {
  const { dialogState } = context;
  const data = (dialogState.data || {}) as Record<string, any>;

  const orderId = data.orderId || '';
  const productName = data.productName || '';
  const validDate = data.validDate || '';
  const isModifying = !!data.isModifying;
  const reservationTimestamp = data.reservationTimestamp as number | undefined;
  const isFromReservation = !!reservationTimestamp;

  let date = data.date || '';
  let time = data.time || '';
  let isDefaultTimeUsed = !!data.isDefaultTimeUsed;

  const dateEntity = extractDate(message);
  const timeEntity = extractTime(message);

  if (dateEntity && dateEntity.value) {
    date = dateEntity.value;
    isDefaultTimeUsed = false;
  }
  if (timeEntity && timeEntity.value) {
    time = timeEntity.value;
    isDefaultTimeUsed = false;
  }

  const newData = {
    ...data,
    date,
    time,
    isDefaultTimeUsed,
  };

  if (!date && !time) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '请告诉我提醒日期、时间',
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'reminder',
        currentStep: 'collecting_datetime',
        reminderStep: 'collecting_datetime',
        data: newData,
      },
    };
  }

  if (!date) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: `请问提醒哪天的「${time}」呢？如：明天、周六、7月10日`,
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'reminder',
        currentStep: 'collecting_datetime',
        reminderStep: 'collecting_datetime',
        data: newData,
      },
    };
  }

  if (!time) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: `请问提醒「${date}」的几点呢？如：18:00、六点半、晚上7点`,
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'reminder',
        currentStep: 'collecting_datetime',
        reminderStep: 'collecting_datetime',
        data: newData,
      },
    };
  }

  const now = Date.now();
  const validation = validateDateTime(date, time, validDate, now);

  if (!validation.valid) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: validation.error || '日期时间无效，请重新输入',
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'reminder',
        currentStep: 'collecting_datetime',
        reminderStep: 'collecting_datetime',
        data: {
          ...newData,
          dateTimestamp: validation.dateTimestamp,
        },
      },
    };
  }

  let reservationWarning: string | undefined;
  if (isFromReservation && reservationTimestamp) {
    const reservationValidation = validateReminderTimeAgainstReservation(validation.remindAt!, reservationTimestamp);
    if (!reservationValidation.valid) {
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content: reservationValidation.error || '提醒时间无效，请重新输入',
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'reminder',
          currentStep: 'collecting_datetime',
          reminderStep: 'collecting_datetime',
          data: {
            ...newData,
            dateTimestamp: validation.dateTimestamp,
          },
        },
      };
    }
    reservationWarning = reservationValidation.warning;
  }

  return startConfirming(
    orderId,
    productName,
    validDate,
    date,
    time,
    validation.dateTimestamp!,
    validation.remindAt!,
    isModifying,
    context,
    {
      reservationWarning,
      isDefaultTimeUsed,
    }
  );
}

function startConfirming(
  orderId: string,
  productName: string,
  validDate: string,
  date: string,
  time: string,
  dateTimestamp: number,
  remindAt: number,
  isModifying: boolean,
  context: NluContext,
  extraData?: Record<string, any>
): NluResponse {
  const { dialogState } = context;
  const data = (dialogState.data || {}) as Record<string, any>;
  const mergedData = { ...data, ...extraData };

  const reservationTimestamp = mergedData.reservationTimestamp as number | undefined;
  const isFromReservation = !!reservationTimestamp;
  const isDefaultTimeUsed = !!mergedData.isDefaultTimeUsed;
  const reservationWarning = mergedData.reservationWarning as string | undefined;

  const dateStr = formatReminderDate(dateTimestamp);
  const timeStr = formatReminderTime(remindAt);

  let content = `确认设置 <strong>${dateStr}</strong> <strong>${timeStr}</strong> 的使用提醒吗？`;

  if (isFromReservation && isDefaultTimeUsed) {
    content = `确认设置 <strong>${dateStr}</strong> <strong>${timeStr}</strong>（预约前1小时）的使用提醒吗？`;
  }

  if (reservationWarning) {
    content = reservationWarning + '\n' + content;
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content,
        quickReplies: [
          createQuickReply('qr-cancel', '取消'),
          createQuickReply('qr-confirm', '确认设置'),
        ],
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'reminder',
      currentStep: 'confirming',
      reminderStep: 'confirming',
      data: {
        ...mergedData,
        orderId,
        productName,
        validDate,
        date,
        time,
        dateTimestamp,
        remindAt,
        isModifying,
      },
    },
  };
}

function handleConfirming(message: string, context: NluContext): NluResponse {
  const { dialogState } = context;
  const data = (dialogState.data || {}) as Record<string, any>;

  const orderId = data.orderId || '';
  const productName = data.productName || '';
  const validDate = data.validDate || '';
  const date = data.date || '';
  const time = data.time || '';
  const isModifying = !!data.isModifying;
  const reservationTimestamp = data.reservationTimestamp as number | undefined;
  const isFromReservation = !!reservationTimestamp;

  const isYes = isPositiveAnswer(message) || message === 'qr-confirm';
  const isNo = isNegativeAnswer(message) || message === 'qr-cancel';

  if (isNo) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '好的，提醒设置已取消。',
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: null,
        currentStep: 'idle',
        reminderStep: 'idle',
      },
    };
  }

  const dateEntity = extractDate(message);
  const timeEntity = extractTime(message);

  let newDate = date;
  let newTime = time;
  let hasDateTimeChange = false;

  if (dateEntity && dateEntity.value && dateEntity.value !== date) {
    newDate = dateEntity.value;
    hasDateTimeChange = true;
  }
  if (timeEntity && timeEntity.value && timeEntity.value !== time) {
    newTime = timeEntity.value;
    hasDateTimeChange = true;
  }

  if (hasDateTimeChange) {
    const now = Date.now();
    const validation = validateDateTime(newDate, newTime, validDate, now);

    if (!validation.valid) {
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content: validation.error || '日期时间无效，请重新输入',
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'reminder',
          currentStep: 'confirming',
          reminderStep: 'confirming',
          data: {
            ...data,
            date: newDate,
            time: newTime,
          },
        },
      };
    }

    let reservationWarning: string | undefined;
    if (isFromReservation && reservationTimestamp) {
      const reservationValidation = validateReminderTimeAgainstReservation(validation.remindAt!, reservationTimestamp);
      if (!reservationValidation.valid) {
        return {
          messages: [
            {
              role: 'assistant',
              contentType: 'text',
              content: reservationValidation.error || '提醒时间无效，请重新输入',
            },
          ],
          newDialogState: {
            ...dialogState,
            currentIntent: 'reminder',
            currentStep: 'confirming',
            reminderStep: 'confirming',
            data: {
              ...data,
              date: newDate,
              time: newTime,
            },
          },
        };
      }
      reservationWarning = reservationValidation.warning;
    }

    return startConfirming(
      orderId,
      productName,
      validDate,
      newDate,
      newTime,
      validation.dateTimestamp!,
      validation.remindAt!,
      isModifying,
      context,
      {
        reservationWarning,
        isDefaultTimeUsed: false,
      }
    );
  }

  if (isYes) {
    return completeReminder(context);
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '请确认是否设置该提醒，或直接输入新的提醒日期时间',
        quickReplies: [
          createQuickReply('qr-cancel', '取消'),
          createQuickReply('qr-confirm', '确认设置'),
        ],
      },
    ],
    newDialogState: dialogState,
  };
}

function completeReminder(context: NluContext): NluResponse {
  const { dialogState, orderCard } = context;
  const data = (dialogState.data || {}) as Record<string, any>;

  const orderId = data.orderId || '';
  const remindAt = data.remindAt || Date.now();
  const productName = data.productName || orderCard?.productName || '';
  const validDate = data.validDate || orderCard?.validDate || '';
  const isFromReservation = !!data.isFromReservation;
  const isDefaultTimeUsed = !!data.isDefaultTimeUsed;

  let source: 'auto_from_reservation' | 'user_custom' | undefined;
  if (isFromReservation) {
    source = isDefaultTimeUsed ? 'auto_from_reservation' : 'user_custom';
  }

  let savedReminder;
  try {
    savedReminder = saveReminderToStorage(orderId, remindAt, { productName, validDate, source });
  } catch (e) {
    console.warn('[reminderHandler] saveReminderToStorage failed:', e);
    savedReminder = {
      ...MOCK_REMINDER,
      id: 'rem-' + Date.now(),
      orderId,
      remindAt,
      status: 'active' as const,
      createdAt: Date.now(),
      productName,
      validDate,
      ...(source ? { source } : {}),
    };
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '好的，使用提醒已设置，我会在指定时间提醒您。如果后续取消预约或预约失败，我会自动帮您取消使用提醒～',
        redeemReminder: savedReminder,
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'reminder',
      currentStep: 'completed',
      reminderStep: 'completed',
      data: {
        ...data,
        existingReminder: savedReminder,
      },
    },
  };
}

function handleCompleted(message: string, context: NluContext): NluResponse {
  const { dialogState } = context;
  const data = (dialogState.data || {}) as Record<string, any>;

  const orderId = data.orderId || '';
  const productName = data.productName || '';
  const validDate = data.validDate || '';

  const isModifyRequest = message.includes('改') || message.includes('修改') || message.includes('换') || message.includes('调整');
  const isCancelRequest = message.includes('取消') || message.includes('撤销');

  if (isModifyRequest) {
    return startCollectingDateTime(orderId, productName, validDate, context, true);
  }

  if (isCancelRequest) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '确定要取消提醒吗？',
          quickReplies: [
            createQuickReply('qr-keep-reminder', '不取消了'),
            createQuickReply('qr-cancel-reminder', '取消提醒'),
          ],
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'reminder',
        currentStep: 'completed',
        reminderStep: 'completed',
      },
    };
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '您的使用提醒已设置，如需修改或取消请随时告诉我~',
      },
    ],
    newDialogState: dialogState,
  };
}
