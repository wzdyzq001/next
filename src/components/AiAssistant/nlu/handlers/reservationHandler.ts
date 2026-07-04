import type { NluContext, NluResponse } from '../types';
import { createQuickReply } from '../utils';
import { extractDate, extractTime, extractPeopleCount } from '../entityExtractor';
import {
  MOCK_RESERVATION_PENDING,
  MOCK_RESERVATION_ACCEPTED,
  MOCK_RESERVATION_FEATURE_CARD,
} from '../scenarioData';

export function handleReservationIntent(
  message: string,
  context: NluContext
): NluResponse {
  const { dialogState, orderCard } = context;

  if (dialogState.currentStep === 'collecting_info') {
    return handleReservationCollectInfo(message, context);
  }

  if (dialogState.currentStep === 'confirming') {
    return handleReservationConfirm(message, context);
  }

  if (orderCard && orderCard.category === 'food') {
    return handleReservationWithContext(orderCard, context);
  }

  return handleReservationWithoutContext(context);
}

function handleReservationWithContext(
  orderCard: any,
  context: NluContext
): NluResponse {
  const { dialogState } = context;

  const tips = [
    '这家店最近客流量较大，建议提前预约免排队哦~',
    '周末和假期门店繁忙，提前预约更省心~',
    '限时特惠进行中，立即预约享优先服务！',
  ];
  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: randomTip,
        quickReplies: [createQuickReply('qr-reserve', '帮我约')],
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'reservation',
      currentStep: 'prompted',
    },
  };
}

function handleReservationWithoutContext(context: NluContext): NluResponse {
  const { dialogState } = context;

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content:
          '请告诉我你要预约什么时间、几个人，我会帮你预约最近的门店。',
        quickReplies: [createQuickReply('qr-reserve-now', '立即预约')],
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'reservation',
      currentStep: 'collecting_info',
      entities: {},
    },
  };
}

function handleReservationCollectInfo(
  message: string,
  context: NluContext
): NluResponse {
  const { dialogState } = context;
  const entities = { ...dialogState.entities };

  const dateEntity = extractDate(message);
  const timeEntity = extractTime(message);
  const peopleEntity = extractPeopleCount(message);

  if (dateEntity && dateEntity.value) {
    entities.date = dateEntity.value;
  }
  if (timeEntity && timeEntity.value) {
    entities.time = timeEntity.value;
  }
  if (peopleEntity && peopleEntity.value) {
    entities.peopleCount = peopleEntity.value;
  }

  const hasDate = !!entities.date;
  const hasTime = !!entities.time;
  const hasPeople = !!entities.peopleCount;

  const missingItems: string[] = [];
  if (!hasDate) missingItems.push('日期');
  if (!hasTime) missingItems.push('时间');
  if (!hasPeople) missingItems.push('人数');

  if (missingItems.length > 0) {
    let reply = '';
    if (missingItems.length === 2) {
      reply = `好的，请问${missingItems[0]}和${missingItems[1]}呢？`;
    } else if (missingItems.length === 1) {
      reply = `好的，请问${missingItems[0]}是多少呢？`;
    } else {
      reply = '请告诉我你要预约的日期、时间和人数~';
    }

    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: reply,
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'reservation',
        currentStep: 'collecting_info',
        entities,
      },
    };
  }

  const isInvalidTime = entities.time === '23:00' || entities.time === '22:30';

  if (isInvalidTime) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content:
            '抱歉，这个时间门店已经不营业了。您可以选择以下时间：',
          quickReplies: [
            createQuickReply('qr-time-1', '明天 18:00'),
            createQuickReply('qr-time-2', '明天 19:30'),
            createQuickReply('qr-time-3', '后天 18:30'),
          ],
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'reservation',
        currentStep: 'collecting_info',
        entities,
      },
    };
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: `好的，已为您记录：${entities.date} ${entities.time}，${entities.peopleCount}人。正在为您预约...`,
        delay: 800,
      },
      {
        role: 'assistant',
        contentType: 'text',
        content: '预约申请已提交，商家确认后会第一时间通知您。',
        reservationInfo: {
          ...MOCK_RESERVATION_PENDING,
          arrivalTime: `2026-07-05 ${entities.time}`,
          pax: parseInt(entities.peopleCount) || 2,
        },
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'reservation',
      currentStep: 'completed',
      entities,
    },
  };
}

function handleReservationConfirm(
  message: string,
  context: NluContext
): NluResponse {
  const { dialogState } = context;

  const isYes = message.includes('是') || message.includes('好') || message.includes('确认');
  const isNo = message.includes('不') || message.includes('否') || message.includes('算了');

  if (isNo) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '好的，预约已取消，需要时随时告诉我~',
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
          content: '正在为您提交预约申请，请稍候...',
          delay: 1000,
        },
        {
          role: 'assistant',
          contentType: 'text',
          content: '预约申请已提交，商家确认后会第一时间通知您。',
          reservationInfo: MOCK_RESERVATION_PENDING,
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'reservation',
        currentStep: 'completed',
      },
    };
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '请问是否确认预约？',
        quickReplies: [
          createQuickReply('qr-cancel', '取消'),
          createQuickReply('qr-confirm', '确认预约'),
        ],
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'reservation',
      currentStep: 'confirming',
    },
  };
}
