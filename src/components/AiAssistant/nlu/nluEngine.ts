import type {
  NluContext,
  NluResponse,
  NluResponseMessage,
  NluDialogState,
  IntentType,
} from './types';
import { recognizeIntent, isCancelIntent, isAffirmative, isNegative } from './intentRecognizer';
import { extractEntities, extractDate, extractTime, extractPeopleCount } from './entityExtractor';
import {
  handleDeliveryIntent,
  handlePickupCodeIntent,
  handleReservationIntent,
  handleReminderIntent,
} from './handlers';
import { createQuickReply } from './utils';
import { MOCK_ORDERS } from './scenarioData';

export function createInitialDialogState(): NluDialogState {
  return {
    currentIntent: null,
    entities: {},
    currentStep: 'idle',
    orderContext: {},
    data: {},
  };
}

export function processNluMessage(
  message: string,
  context: NluContext
): NluResponse {
  const { dialogState } = context;

  if (isCancelIntent(message) && dialogState.currentIntent && dialogState.currentIntent !== 'greeting' && dialogState.currentIntent !== 'unknown') {
    return handleCancelFlow(context);
  }

  const reservationReminderStep = dialogState.reservationReminderStep;
  if (reservationReminderStep && reservationReminderStep !== 'completed') {
    const newIntent = recognizeIntent(message);
    const isNewReservationRequest =
      newIntent === 'reservation' &&
      !isAffirmative(message) &&
      !isNegative(message) &&
      !isReminderRelatedResponse(message);
    if (isNewReservationRequest) {
      const clearedState = {
        ...dialogState,
        reservationReminderStep: undefined,
        currentStep: 'idle',
        reservationStep: 'idle',
        data: {
          ...dialogState.data,
          date: undefined,
          time: undefined,
          peopleCount: undefined,
          phone: undefined,
          reservationTimestamp: undefined,
          defaultRemindAt: undefined,
          existingReminder: undefined,
        },
      };
      return processNluMessage(message, {
        ...context,
        dialogState: clearedState,
      });
    }
    return handleReservationIntent(message, context);
  }

  const newIntent = recognizeIntent(message);
  const entities = extractEntities(message);

  const entityMap: Record<string, string> = {};
  for (const entity of entities) {
    entityMap[entity.type] = entity.value;
  }

  const currentIntent = dialogState.currentIntent;
  const currentStep = dialogState.currentStep;

  const criticalSteps = [
    'waiting_reserve_confirm',
    'waiting_order_confirm',
    'waiting_self_order_confirm',
    'waiting_delivery_confirm',
    'waiting_date_confirm',
    'waiting_time_confirm',
    'waiting_people_confirm',
    'waiting_reminder_date_confirm',
    'waiting_reminder_time_confirm',
  ];

  const isInCriticalStep = criticalSteps.includes(currentStep);

  if (currentIntent && currentStep !== 'idle' && currentStep !== 'completed' && isInCriticalStep) {
    if (newIntent === currentIntent || newIntent === 'unknown' || newIntent === 'greeting') {
      switch (currentIntent) {
        case 'reservation':
          return handleReservationIntent(message, context);
        case 'reminder':
          return handleReminderIntent(message, context);
        case 'pickup_code':
          return handlePickupCodeIntent(message, context);
        case 'delivery':
          return handleDeliveryIntent(message, context);
      }
    }
  }

  if (currentIntent && currentStep !== 'idle' && currentStep !== 'completed' && !isInCriticalStep) {
    if (newIntent === currentIntent || newIntent === 'unknown' || newIntent === 'greeting') {
      switch (currentIntent) {
        case 'reservation':
          return handleReservationIntent(message, context);
        case 'reminder':
          return handleReminderIntent(message, context);
        case 'pickup_code':
          return handlePickupCodeIntent(message, context);
        case 'delivery':
          return handleDeliveryIntent(message, context);
      }
    }
  }

  const newContext: NluContext = {
    ...context,
    dialogState: {
      ...dialogState,
      currentIntent: newIntent,
      entities: {
        ...dialogState.entities,
        ...entityMap,
      },
    },
  };

  switch (newIntent) {
    case 'greeting':
      return handleGreeting(newContext);
    case 'delivery':
      return handleDeliveryIntent(message, newContext);
    case 'pickup_code':
      return handlePickupCodeIntent(message, newContext);
    case 'reservation':
      return handleReservationIntent(message, newContext);
    case 'reminder':
      return handleReminderIntent(message, newContext);
    case 'unknown':
    default:
      return handleUnknownIntent(message, newContext);
  }
}

function handleGreeting(context: NluContext): NluResponse {
  const greetings = [
    '你好呀！我是团小帮，有什么可以帮你的吗？',
    '您好！我是团小帮，很高兴为您服务~',
    '嗨！有什么我能帮您的吗？',
  ];

  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

  const quickReplies = [
    createQuickReply('qr-reserve', '预约'),
    createQuickReply('qr-remind', '提醒'),
    createQuickReply('qr-pickup', '取餐码'),
    createQuickReply('qr-delivery', '配送进度'),
  ];

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: randomGreeting,
        quickReplies,
      },
    ],
    newDialogState: {
      ...context.dialogState,
      currentIntent: 'greeting',
      currentStep: 'idle',
    },
  };
}

function handleCancelFlow(context: NluContext): NluResponse {
  const currentIntent = context.dialogState.currentIntent;

  let reply = '好的，已取消当前操作。';
  if (currentIntent === 'reservation') {
    reply = '好的，预约已取消，需要时随时告诉我~';
  } else if (currentIntent === 'reminder') {
    reply = '好的，提醒设置已取消。';
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: reply,
      },
    ],
    newDialogState: createInitialDialogState(),
  };
}

function isReminderRelatedResponse(message: string): boolean {
  const lowerMsg = message.toLowerCase().trim();
  if (lowerMsg.startsWith('qr-')) return true;
  if (/提醒/.test(message) && /(设置|调整|改|换|我|确认)/.test(message)) return true;
  if (/(设置|调整|改|换|确认).*提醒/.test(message)) return true;
  return false;
}

function handleUnknownIntent(message: string, context: NluContext): NluResponse {
  const reply = '后续接入agent通过相关数据源总结回答，可先体验帮预约、订单使用提醒功能';

  const actions = [
    {
      label: '预约',
      kind: 'guide_primary',
      variant: 'guide_primary',
    } as any,
    {
      label: '提醒',
      kind: 'guide_primary',
      variant: 'guide_primary',
    } as any,
  ];

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: reply,
        actions,
      },
    ],
    newDialogState: {
      ...context.dialogState,
      currentIntent: 'unknown',
      currentStep: 'idle',
    },
  };
}

export function getMockOrderList() {
  return Object.values(MOCK_ORDERS);
}

export type { IntentType, NluDialogState as DialogState, NluResponseMessage };
