import type { NluContext, NluResponse } from '../types';
import { createQuickReply } from '../utils';
import { extractDate } from '../entityExtractor';
import {
  MOCK_REMINDER,
  MOCK_REMINDER_FEATURE_CARD,
} from '../scenarioData';

const REMINDER_OPTIONS = [
  '明天',
  '后天',
  '本周五',
  '本周六',
  '本周日',
  '下周五',
  '最后一天',
  '过期前3天',
];

export function handleReminderIntent(
  message: string,
  context: NluContext
): NluResponse {
  const { dialogState, orderCard } = context;

  if (dialogState.currentStep === 'selecting_date') {
    return handleReminderDateSelect(message, context);
  }

  if (dialogState.currentStep === 'confirming') {
    return handleReminderConfirm(message, context);
  }

  if (orderCard) {
    return handleReminderWithContext(orderCard, context);
  }

  return handleReminderWithoutContext(context);
}

function handleReminderWithContext(
  orderCard: any,
  context: NluContext
): NluResponse {
  const { dialogState } = context;

  const validDate = orderCard.validDate || '有效期至 2026-08-31';
  const productName = orderCard.productName || '商品';

  const filteredOptions = filterReminderOptions(REMINDER_OPTIONS, validDate);

  const quickReplies = filteredOptions.map((opt, i) =>
    createQuickReply(`qr-rem-${i}`, opt)
  );

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '请告诉我提醒时间',
        quickReplies,
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'reminder',
      currentStep: 'selecting_date',
      data: {
        productName,
        validDate,
      },
    },
  };
}

function handleReminderWithoutContext(context: NluContext): NluResponse {
  const { dialogState } = context;

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '请选择要设置提醒的订单，或告诉我您要设置什么提醒。',
        quickReplies: [createQuickReply('qr-select-order', '选择订单')],
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'reminder',
      currentStep: 'select_order',
    },
  };
}

function handleReminderDateSelect(
  message: string,
  context: NluContext
): NluResponse {
  const { dialogState } = context;
  const data = (dialogState.data || {}) as Record<string, any>;

  const dateEntity = extractDate(message);
  let selectedDate = dateEntity?.value || '';

  for (const option of REMINDER_OPTIONS) {
    if (message.includes(option)) {
      selectedDate = option;
      break;
    }
  }

  if (!selectedDate) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '抱歉，我没有理解您说的时间，请重新表述一下~',
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'reminder',
        currentStep: 'selecting_date',
      },
    };
  }

  const isOverdue = checkIsOverdue(selectedDate, data.validDate);

  if (isOverdue) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content:
            '提醒日期不可以超过订单有效期哦，是否需要在过期前一天提醒？',
          quickReplies: [
            createQuickReply('qr-no-think', '我再想想'),
            createQuickReply('qr-yes-daybefore', '是，设置过期前一天'),
          ],
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'reminder',
        currentStep: 'overdue_check',
        data: {
          ...data,
          selectedDate,
        },
      },
    };
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '',
        featureCard: {
          ...MOCK_REMINDER_FEATURE_CARD,
          redeemReminder: {
            ...MOCK_REMINDER_FEATURE_CARD.redeemReminder,
            productName: data.productName,
            validDate: data.validDate?.replace('有效期至 ', ''),
          },
        },
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'reminder',
      currentStep: 'confirming',
      data: {
        ...data,
        selectedDate,
      },
    },
  };
}

function handleReminderConfirm(
  message: string,
  context: NluContext
): NluResponse {
  const { dialogState } = context;
  const data = (dialogState.data || {}) as Record<string, any>;

  const isYes =
    message.includes('是') ||
    message.includes('确认') ||
    message.includes('好的') ||
    message.includes('设置');
  const isNo =
    message.includes('不') ||
    message.includes('取消') ||
    message.includes('算了');

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
      },
    };
  }

  if (isYes) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '好的，使用提醒已设置，我会在指定时间提醒您。',
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'reminder',
        currentStep: 'completed',
      },
    };
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '请问是否确认设置提醒？',
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
    },
  };
}

function filterReminderOptions(options: string[], validDateStr: string): string[] {
  return options.slice(0, 6);
}

function checkIsOverdue(selectedDate: string, validDateStr: string): boolean {
  if (selectedDate === '最后一天' || selectedDate.startsWith('过期前')) {
    return false;
  }
  return false;
}
