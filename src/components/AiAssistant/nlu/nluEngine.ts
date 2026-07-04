import type {
  NluContext,
  NluResponse,
  NluResponseMessage,
  DialogState,
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

export function createInitialDialogState(): DialogState {
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

  const currentIntent = dialogState.currentIntent;

  if (currentIntent === 'reservation' && dialogState.currentStep !== 'idle') {
    return handleReservationIntent(message, context);
  }

  if (currentIntent === 'reminder' && dialogState.currentStep !== 'idle') {
    return handleReminderIntent(message, context);
  }

  if (currentIntent === 'pickup_code' && dialogState.currentStep !== 'idle') {
    return handlePickupCodeIntent(message, context);
  }

  if (currentIntent === 'delivery' && dialogState.currentStep !== 'idle') {
    return handleDeliveryIntent(message, context);
  }

  const intent = recognizeIntent(message);
  const entities = extractEntities(message);

  const entityMap: Record<string, string> = {};
  for (const entity of entities) {
    entityMap[entity.type] = entity.value;
  }

  const newContext: NluContext = {
    ...context,
    dialogState: {
      ...dialogState,
      currentIntent: intent,
      entities: entityMap,
    },
  };

  switch (intent) {
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
    createQuickReply('qr-1', '帮我查取餐码'),
    createQuickReply('qr-2', '配送进度在哪看'),
    createQuickReply('qr-3', '我要预约'),
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

function handleUnknownIntent(message: string, context: NluContext): NluResponse {
  const reply = '抱歉，我暂时还不太理解您的问题。您可以试试问我关于订单配送、取餐码、预约或使用提醒的问题~';

  const quickReplies = [
    createQuickReply('qr-delivery', '查配送进度'),
    createQuickReply('qr-pickup', '查取餐码'),
    createQuickReply('qr-reserve', '我要预约'),
    createQuickReply('qr-remind', '设置使用提醒'),
  ];

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: reply,
        quickReplies,
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

export type { IntentType, DialogState, NluResponseMessage };
