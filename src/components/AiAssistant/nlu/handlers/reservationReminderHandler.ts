import type { NluContext, NluResponse, NluDialogState } from '../types';
import { createQuickReply } from '../utils';
import { extractDate, extractTime } from '../entityExtractor';
import { parseReservationTimestamp, getReminderBeforeReservation, isMoreThan12Hours, validateReminderTimeAgainstReservation } from '../reservationReminderUtils';
import { setReminder as saveReminderToStorage, getReminderByOrder } from '../../../../redeemReminder';
import type { RedeemReminder } from '../../../../types';

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function isPositiveAnswer(message: string): boolean {
  const positiveKeywords = ['是', '确认', '好的', '对', '没问题', '可以', '嗯', '行', 'ok', 'OK', '好', '设置', '调整'];
  return positiveKeywords.some((keyword) => message.includes(keyword));
}

function isNegativeAnswer(message: string): boolean {
  const negativeKeywords = ['不', '否', '算了', '不用', '不要', '取消', '换', '保持'];
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

function formatShortDate(timestamp: number): string {
  const d = new Date(timestamp);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}月${day}日`;
}

export function buildReservationReminderFollowUp(
  reservationTimestamp: number,
  orderId: string,
  productName: string,
  existingReminder?: RedeemReminder
): null | {
  step: 'asking_setting' | 'asking_adjust_late' | 'asking_adjust_early';
  content: string;
  buttonText: string;
  buttonId: string;
  defaultRemindAt: number;
  reservationTimestamp: number;
  orderId: string;
  productName: string;
  existingReminder?: RedeemReminder;
} {
  const hoursUntil = (reservationTimestamp - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil < 2) {
    return null;
  }
  const defaultRemindAt = getReminderBeforeReservation(reservationTimestamp);
  const shortDate = formatShortDate(defaultRemindAt);
  const timeStr = formatReminderTime(defaultRemindAt);

  if (!existingReminder || existingReminder.status !== 'active') {
    return {
      step: 'asking_setting',
      content: `是否需要帮你设置一个 ${shortDate} ${timeStr} 的使用提醒？也可以告诉我你想设置的日期、时间，需要早于预约时间哦～`,
      buttonText: '确认设置',
      buttonId: 'qr-confirm-set-reminder',
      defaultRemindAt,
      reservationTimestamp,
      orderId,
      productName,
      existingReminder,
    };
  }

  if (existingReminder.remindAt >= reservationTimestamp) {
    return {
      step: 'asking_adjust_late',
      content: `订单使用提醒晚于预约时间，是否需要改为预约时间前 1 个小时？也可以告诉我要设置什么日期、时间～`,
      buttonText: '帮我调整',
      buttonId: 'qr-adjust-reminder',
      defaultRemindAt,
      reservationTimestamp,
      orderId,
      productName,
      existingReminder,
    };
  }

  if (isMoreThan12Hours(existingReminder.remindAt, reservationTimestamp)) {
    const existingDate = formatShortDate(existingReminder.remindAt);
    const existingTime = formatReminderTime(existingReminder.remindAt);
    return {
      step: 'asking_adjust_early',
      content: `订单当前已设置${existingDate} ${existingTime}的使用提醒，使用提醒时间距离预约时间太久可能中间会忘记，是否重新设置为预约时间前 1 个小时提醒？`,
      buttonText: '帮我调整',
      buttonId: 'qr-adjust-reminder',
      defaultRemindAt,
      reservationTimestamp,
      orderId,
      productName,
      existingReminder,
    };
  }

  return {
    step: 'asking_setting',
    content: `是否需要帮你设置一个 ${shortDate} ${timeStr} 的使用提醒？也可以告诉我你想设置的日期、时间，需要早于预约时间哦～`,
    buttonText: '确认设置',
    buttonId: 'qr-confirm-set-reminder',
    defaultRemindAt,
    reservationTimestamp,
    orderId,
    productName,
    existingReminder,
  };
}

function completeReservationReminder(
  remindAt: number,
  source: 'auto_from_reservation' | 'user_custom',
  context: NluContext
): NluResponse {
  const { dialogState, orderCard } = context;
  const data = (dialogState.data || {}) as Record<string, any>;

  const orderId = data.orderId || '';
  const productName = data.productName || orderCard?.productName || '';
  const validDate = orderCard?.validDate || '';

  let savedReminder: RedeemReminder;
  try {
    savedReminder = saveReminderToStorage(orderId, remindAt, { productName, validDate, source });
  } catch (e) {
    console.warn('[reservationReminderHandler] saveReminderToStorage failed:', e);
    savedReminder = {
      id: 'rem-' + Date.now(),
      orderId,
      remindAt,
      status: 'active',
      createdAt: Date.now(),
      productName,
      validDate,
      source,
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
      reservationReminderStep: 'completed',
      data: {
        ...data,
        existingReminder: savedReminder,
      },
    },
  };
}

function handleAskingStep(message: string, context: NluContext): NluResponse {
  const { dialogState } = context;
  const data = (dialogState.data || {}) as Record<string, any>;
  const step = dialogState.reservationReminderStep as 'asking_setting' | 'asking_adjust_late' | 'asking_adjust_early';

  const reservationTimestamp = data.reservationTimestamp as number;
  const orderId = data.orderId || '';
  const productName = data.productName || '';
  const defaultRemindAt = data.defaultRemindAt as number;
  const existingReminder = data.existingReminder as RedeemReminder | undefined;

  const isConfirmButton =
    message === 'qr-confirm-set-reminder' ||
    message === 'qr-adjust-reminder' ||
    (isPositiveAnswer(message) && (message.includes('确认') || message.includes('设置') || message.includes('调整') || message.includes('帮我')));

  if (isConfirmButton) {
    const result = completeReservationReminder(defaultRemindAt, 'auto_from_reservation', context);
    if (step === 'asking_adjust_late' || step === 'asking_adjust_early') {
      const remDate = formatShortDate(defaultRemindAt);
      const remTime = formatReminderTime(defaultRemindAt);
      return {
        ...result,
        messages: [
          {
            ...result.messages[0],
            content: `好的，已为您调整提醒时间为${remDate} ${remTime}～`,
          },
        ],
      };
    }
    return result;
  }

  if (isNegativeAnswer(message)) {
    let content = '';
    if (step === 'asking_setting') {
      content = '好哒～如果之后需要设置提醒随时告诉我哦～';
    } else {
      content = '好的，提醒保持不变～';
    }

    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content,
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: null,
        currentStep: 'idle',
        reservationReminderStep: 'completed',
      },
    };
  }

  const dateEntity = extractDate(message);
  const timeEntity = extractTime(message);

  let date = data.date || '';
  let time = data.time || '';

  if (dateEntity && dateEntity.value) {
    date = dateEntity.value;
  }
  if (timeEntity && timeEntity.value) {
    time = timeEntity.value;
  }

  if (!date && !time) {
    const buttonText = step === 'asking_setting' ? '确认设置' : '帮我调整';
    const buttonId = step === 'asking_setting' ? 'qr-confirm-set-reminder' : 'qr-adjust-reminder';
    let content = '';
    if (step === 'asking_setting') {
      const shortDate = formatShortDate(defaultRemindAt);
      const timeStr = formatReminderTime(defaultRemindAt);
      content = `是否需要帮你设置一个 ${shortDate} ${timeStr} 的使用提醒？也可以告诉我你想设置的日期、时间，需要早于预约时间哦～`;
    } else if (step === 'asking_adjust_late') {
      content = `订单使用提醒晚于预约时间，是否需要改为预约时间前 1 个小时？也可以告诉我要设置什么日期、时间～`;
    } else {
      if (existingReminder && existingReminder.remindAt) {
        const existingDate = formatShortDate(existingReminder.remindAt);
        const existingTime = formatReminderTime(existingReminder.remindAt);
        content = `订单当前已设置${existingDate} ${existingTime}的使用提醒，使用提醒时间距离预约时间太久可能中间会忘记，是否重新设置为预约时间前 1 个小时提醒？`;
      } else {
        content = `订单使用提醒时间距离预约时间太久可能中间会忘记，是否重新设置为预约时间前 1 个小时提醒？`;
      }
    }

    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content,
          quickReplies: [createQuickReply(buttonId, buttonText)],
        },
      ],
      newDialogState: dialogState,
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
        data: {
          ...data,
          date,
          time,
        },
      },
    };
  }

  if (!time) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateTimestamp = parseReservationTimestamp(date, '00:00');
    if (dateTimestamp && dateTimestamp < today.getTime()) {
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content: '这个日期已经过去了哦，请设置一个未来的日期吧～',
          },
        ],
        newDialogState: {
          ...dialogState,
          data: {
            ...data,
            date: '',
            time,
          },
        },
      };
    }

    if (dateTimestamp && dateTimestamp >= reservationTimestamp) {
      const resDate = formatShortDate(reservationTimestamp);
      const resTime = formatReminderTime(reservationTimestamp);
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content: `提醒时间不能晚于预约时间哦，请设置不晚于${resDate} ${resTime}的提醒时间～`,
          },
        ],
        newDialogState: {
          ...dialogState,
          data: {
            ...data,
            date: '',
            time,
          },
        },
      };
    }

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
        data: {
          ...data,
          date,
          time,
        },
      },
    };
  }

  const remindAtTimestamp = parseReservationTimestamp(date, time);
  if (!remindAtTimestamp) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '无法识别日期时间，请重新表述',
        },
      ],
      newDialogState: {
        ...dialogState,
        data: {
          ...data,
          date,
          time,
        },
      },
    };
  }

  const validation = validateReminderTimeAgainstReservation(remindAtTimestamp, reservationTimestamp);

  if (!validation.valid) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: validation.error || '提醒时间无效，请重新输入',
        },
      ],
      newDialogState: {
        ...dialogState,
        data: {
          ...data,
          date,
          time,
        },
      },
    };
  }

  const dateStr = formatReminderDate(remindAtTimestamp);
  const timeStr = formatReminderTime(remindAtTimestamp);

  let confirmContent = `确认设置 <strong>${dateStr}</strong> <strong>${timeStr}</strong> 的使用提醒吗？`;
  if (validation.warning) {
    confirmContent = validation.warning + '\n' + confirmContent;
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: confirmContent,
        quickReplies: [
          createQuickReply('qr-cancel', '取消'),
          createQuickReply('qr-confirm', '确认设置'),
        ],
      },
    ],
    newDialogState: {
      ...dialogState,
      reservationReminderStep: 'confirming_custom',
      data: {
        ...data,
        date,
        time,
        remindAt: remindAtTimestamp,
      },
    },
  };
}

function handleConfirmingCustom(message: string, context: NluContext): NluResponse {
  const { dialogState } = context;
  const data = (dialogState.data || {}) as Record<string, any>;

  const reservationTimestamp = data.reservationTimestamp as number;
  const remindAt = data.remindAt as number;
  const date = data.date || '';
  const time = data.time || '';

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
        reservationReminderStep: 'completed',
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
    const remindAtTimestamp = parseReservationTimestamp(newDate, newTime);
    if (!remindAtTimestamp) {
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content: '无法识别日期时间，请重新表述',
          },
        ],
        newDialogState: {
          ...dialogState,
          data: {
            ...data,
            date: newDate,
            time: newTime,
          },
        },
      };
    }

    const validation = validateReminderTimeAgainstReservation(remindAtTimestamp, reservationTimestamp);

    if (!validation.valid) {
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content: validation.error || '提醒时间无效，请重新输入',
          },
        ],
        newDialogState: {
          ...dialogState,
          data: {
            ...data,
            date: newDate,
            time: newTime,
          },
        },
      };
    }

    const dateStr = formatReminderDate(remindAtTimestamp);
    const timeStr = formatReminderTime(remindAtTimestamp);

    let confirmContent = `确认设置 <strong>${dateStr}</strong> <strong>${timeStr}</strong> 的使用提醒吗？`;
    if (validation.warning) {
      confirmContent = validation.warning + '\n' + confirmContent;
    }

    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: confirmContent,
          quickReplies: [
            createQuickReply('qr-cancel', '取消'),
            createQuickReply('qr-confirm', '确认设置'),
          ],
        },
      ],
      newDialogState: {
        ...dialogState,
        reservationReminderStep: 'confirming_custom',
        data: {
          ...data,
          date: newDate,
          time: newTime,
          remindAt: remindAtTimestamp,
        },
      },
    };
  }

  if (isYes) {
    return completeReservationReminder(remindAt, 'user_custom', context);
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

export function handleReservationReminderIntent(
  message: string,
  context: NluContext
): NluResponse {
  const { dialogState } = context;
  const step = dialogState.reservationReminderStep;

  if (step === 'completed') {
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

  if (step === 'confirming_custom') {
    return handleConfirmingCustom(message, context);
  }

  if (step === 'asking_setting' || step === 'asking_adjust_late' || step === 'asking_adjust_early') {
    return handleAskingStep(message, context);
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '请问有什么可以帮您？',
      },
    ],
    newDialogState: dialogState,
  };
}
