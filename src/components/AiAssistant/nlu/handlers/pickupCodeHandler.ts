import type { NluContext, NluResponse } from '../types';
import { createQuickReply } from '../utils';
import {
  ORDER_FOOD_PREPARING,
  ORDER_FOOD_PREPARING_2,
  ORDER_FOOD_WAITING_PICKUP,
  ORDER_FOOD_PENDING_ACCEPT,
  ORDER_FOOD_COMPLETED_SELFORDER,
  ORDER_FOOD_COMPLETED_DELIVERY,
} from '../scenarioData';

export function handlePickupCodeIntent(
  message: string,
  context: NluContext
): NluResponse {
  const { dialogState, orderCard } = context;

  if (dialogState.currentStep === 'waiting_order_confirm') {
    return handlePickupOrderConfirm(message, context);
  }

  if (dialogState.currentStep === 'waiting_self_order_confirm') {
    return handleSelfOrderConfirm(message, context);
  }

  if (dialogState.currentStep === 'waiting_delivery_confirm') {
    return handleDeliveryConfirm(message, context);
  }

  if (orderCard) {
    return handlePickupWithContext(orderCard, context);
  }

  return handlePickupWithoutContext(context);
}

function handlePickupWithContext(
  orderCard: any,
  context: NluContext
): NluResponse {
  const { dialogState } = context;
  const category = orderCard.category;
  const status = orderCard.orderStatus;
  const redeemMethod = orderCard.redeemMethod;

  if (category !== 'food') {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '您咨询的订单不是餐饮订单，没有取餐码，是否要咨询其他订单？',
          quickReplies: [createQuickReply('qr-select-order', '选择订单')],
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'pickup_code',
        currentStep: 'completed',
      },
    };
  }

  if (status === 'cancelled') {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '该订单已取消，没有取餐码。',
          quickReplies: [createQuickReply('qr-select-order', '选择订单')],
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'pickup_code',
        currentStep: 'completed',
      },
    };
  }

  if (status === 'refund_success') {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '该订单已退款，没有取餐码。',
          quickReplies: [createQuickReply('qr-select-order', '选择订单')],
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'pickup_code',
        currentStep: 'completed',
      },
    };
  }

  if (status === 'unused') {
    if (redeemMethod === 'voucher') {
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content: '该订单为到店券码核销订单，暂时没有取餐码。',
            quickReplies: [createQuickReply('qr-view-voucher', '查看券码')],
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'pickup_code',
          currentStep: 'completed',
        },
      };
    }

    if (redeemMethod === 'self_order') {
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content: '订单需到店点单核销，暂无取餐码，是否需要我帮你点单？',
            quickReplies: [
              createQuickReply('qr-no', '否'),
              createQuickReply('qr-yes-order', '是，帮我点单'),
            ],
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'pickup_code',
          currentStep: 'waiting_self_order_confirm',
        },
      };
    }

    if (redeemMethod === 'delivery') {
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content: '该订单为配送订单，没有取餐码，是否需要我帮你预约配送？',
            quickReplies: [
              createQuickReply('qr-no', '否'),
              createQuickReply('qr-yes-delivery', '是，预约配送'),
            ],
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'pickup_code',
          currentStep: 'waiting_delivery_confirm',
        },
      };
    }
  }

  if (status === 'completed') {
    if (redeemMethod === 'voucher') {
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content: '该订单为到店券码核销订单，没有取餐码。',
            quickReplies: [createQuickReply('qr-select-order', '选择订单')],
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'pickup_code',
          currentStep: 'completed',
        },
      };
    }

    if (redeemMethod === 'self_order') {
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content: '帮你查到取餐码信息啦~',
            delay: 300,
          },
          {
            role: 'assistant',
            contentType: 'text',
            content: '',
            orderCard: ORDER_FOOD_COMPLETED_SELFORDER,
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'pickup_code',
          currentStep: 'completed',
        },
      };
    }

    if (redeemMethod === 'delivery') {
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content: '该订单为配送订单，没有取餐码，可以查看配送进度。',
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'pickup_code',
          currentStep: 'completed',
        },
      };
    }
  }

  if (
    status === 'pending_accept' ||
    status === 'preparing' ||
    status === 'waiting_pickup'
  ) {
    let pickupOrder = orderCard;
    let replyText = '';

    if (status === 'pending_accept') {
      replyText = '订单已提交，商家确认后将生成取餐码。';
      pickupOrder = ORDER_FOOD_PENDING_ACCEPT;
    } else if (status === 'preparing') {
      replyText = '商家正在备餐中，请耐心等待取餐~';
      pickupOrder = ORDER_FOOD_PREPARING;
    } else if (status === 'waiting_pickup') {
      replyText = '餐品已备好，可以取餐啦！';
      pickupOrder = ORDER_FOOD_WAITING_PICKUP;
    }

    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: replyText,
          delay: 300,
        },
        {
          role: 'assistant',
          contentType: 'text',
          content: '',
          orderCard: pickupOrder,
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'pickup_code',
        currentStep: 'completed',
      },
    };
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '暂时没有找到该订单的取餐码信息。',
        quickReplies: [createQuickReply('qr-select-order', '选择订单')],
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'pickup_code',
      currentStep: 'completed',
    },
  };
}

function handlePickupWithoutContext(context: NluContext): NluResponse {
  const { dialogState } = context;

  const pickupOrders = [ORDER_FOOD_PREPARING, ORDER_FOOD_PREPARING_2];

  if (pickupOrders.length === 0) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '没有找到待取餐订单。',
          quickReplies: [createQuickReply('qr-select-order', '选择订单')],
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'pickup_code',
        currentStep: 'completed',
      },
    };
  }

  if (pickupOrders.length === 1) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '帮你找到一个待取餐订单',
          delay: 300,
        },
        {
          role: 'assistant',
          contentType: 'text',
          content: '',
          orderCard: pickupOrders[0],
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'pickup_code',
        currentStep: 'completed',
        orderContext: {
          orderId: pickupOrders[0].id,
        },
      },
    };
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '你有多个待取餐订单，请选择要查看的订单',
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'pickup_code',
      currentStep: 'select_order',
      data: { orderList: pickupOrders },
    },
  };
}

function handlePickupOrderConfirm(
  message: string,
  context: NluContext
): NluResponse {
  const { dialogState } = context;

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '请选择您要查看的订单',
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'pickup_code',
      currentStep: 'select_order',
    },
  };
}

function handleSelfOrderConfirm(
  message: string,
  context: NluContext
): NluResponse {
  const { dialogState } = context;

  const isYes = message.includes('是') || message.includes('好') || message.includes('点单');
  const isNo = message.includes('不') || message.includes('否') || message.includes('算了');

  if (isNo) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '好的，到店后可以直接点单核销~',
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
          content: '好的，正在为您提交点单申请，请稍候...',
          delay: 1000,
        },
        {
          role: 'assistant',
          contentType: 'text',
          content: '',
          orderCard: ORDER_FOOD_PENDING_ACCEPT,
          delay: 500,
        },
        {
          role: 'assistant',
          contentType: 'text',
          content: '✅ 商家已接单，正在为您备餐，请耐心等待~',
          delay: 1500,
        },
        {
          role: 'assistant',
          contentType: 'text',
          content: '',
          orderCard: ORDER_FOOD_PREPARING,
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'pickup_code',
        currentStep: 'completed',
      },
    };
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '是否需要我帮您点单呢？',
        quickReplies: [
          createQuickReply('qr-no', '否'),
          createQuickReply('qr-yes-order', '是，帮我点单'),
        ],
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'pickup_code',
      currentStep: 'waiting_self_order_confirm',
    },
  };
}

function handleDeliveryConfirm(
  message: string,
  context: NluContext
): NluResponse {
  const { dialogState } = context;

  const isYes = message.includes('是') || message.includes('好') || message.includes('预约');
  const isNo = message.includes('不') || message.includes('否') || message.includes('算了');

  if (isNo) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '好的，需要时随时告诉我~',
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
          content: '好的，正在为您安排配送，请稍候...',
          delay: 1000,
        },
        {
          role: 'assistant',
          contentType: 'text',
          content: '预约成功！骑手将在预计时间内上门取餐',
          delay: 1000,
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'pickup_code',
        currentStep: 'completed',
      },
    };
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '是否需要我帮您预约配送呢？',
        quickReplies: [
          createQuickReply('qr-no', '否'),
          createQuickReply('qr-yes-delivery', '是，预约配送'),
        ],
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'pickup_code',
      currentStep: 'waiting_delivery_confirm',
    },
  };
}
