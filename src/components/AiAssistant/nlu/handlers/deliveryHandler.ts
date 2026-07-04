import type { NluContext, NluResponse, NluResponseMessage } from '../types';
import { createQuickReply } from '../utils';
import {
  ORDER_FOOD_DELIVERY_PENDING_ACCEPT,
  ORDER_FOOD_DELIVERY_PREPARING,
  ORDER_FOOD_DELIVERY_WAITING_RIDER,
  ORDER_FOOD_DELIVERING,
  ORDER_FOOD_DELIVERING_2,
  ORDER_FOOD_COMPLETED_DELIVERY,
} from '../scenarioData';

export function handleDeliveryIntent(
  message: string,
  context: NluContext
): NluResponse {
  const { dialogState, orderCard } = context;

  if (dialogState.currentStep === 'waiting_reserve_confirm') {
    return handleReserveDeliveryConfirm(message, context);
  }

  if (dialogState.currentStep === 'reserve_in_progress') {
    return handleReserveInProgress(context);
  }

  if (orderCard) {
    return handleDeliveryWithContext(orderCard, context);
  }

  return handleDeliveryWithoutContext(context);
}

function handleDeliveryWithContext(
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
          content: '您咨询的订单不是餐饮配送订单，暂时没有配送进度。',
          quickReplies: [createQuickReply('qr-select-order', '选择订单')],
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'delivery',
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
          content: '该订单已取消，没有配送进度。',
          quickReplies: [createQuickReply('qr-select-order', '选择订单')],
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'delivery',
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
          content: '该订单已退款，没有配送进度。',
          quickReplies: [createQuickReply('qr-select-order', '选择订单')],
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'delivery',
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
            content: '该订单为到店券码核销订单，暂时没有配送进度。',
            quickReplies: [createQuickReply('qr-view-voucher', '查看券码')],
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'delivery',
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
            content: '订单不支持配送，暂无配送进度，是否需要帮你点单到店自提？',
            quickReplies: [
              createQuickReply('qr-no', '否'),
              createQuickReply('qr-yes', '是'),
            ],
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'delivery',
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
            content: '该订单还未预约配送，是否需要帮你预约配送？',
            quickReplies: [
              createQuickReply('qr-no', '否'),
              createQuickReply('qr-yes-delivery', '是，立即预约'),
            ],
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'delivery',
          currentStep: 'waiting_reserve_confirm',
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
            content: '该订单为到店券码核销订单，没有配送进度。',
            quickReplies: [createQuickReply('qr-select-order', '选择订单')],
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'delivery',
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
            content: '该订单为到店自取订单，没有配送进度。',
            quickReplies: [createQuickReply('qr-view-pickup', '查看取餐码')],
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'delivery',
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
            content: '帮你查到配送信息啦~',
            delay: 300,
          },
          {
            role: 'assistant',
            contentType: 'text',
            content: '',
            orderCard: ORDER_FOOD_COMPLETED_DELIVERY,
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'delivery',
          currentStep: 'completed',
        },
      };
    }
  }

  if (
    status === 'pending_accept' ||
    status === 'preparing' ||
    status === 'waiting_pickup' ||
    status === 'delivering'
  ) {
    let replyText = '';
    let deliveryOrder = orderCard;

    if (status === 'pending_accept') {
      replyText = '商家正在确认订单，请稍后查看配送进度。';
      deliveryOrder = ORDER_FOOD_DELIVERY_PENDING_ACCEPT;
    } else if (status === 'preparing') {
      replyText = '商家正在备餐，备餐完成后将安排骑手配送。';
      deliveryOrder = ORDER_FOOD_DELIVERY_PREPARING;
    } else if (status === 'waiting_pickup') {
      replyText = '订单已备好，正在等待骑手取餐。';
      deliveryOrder = ORDER_FOOD_DELIVERY_WAITING_RIDER;
    } else if (status === 'delivering') {
      replyText = '骑手正在配送中，预计很快送达~';
      deliveryOrder = ORDER_FOOD_DELIVERING;
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
          orderCard: deliveryOrder,
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'delivery',
        currentStep: 'completed',
      },
    };
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '暂时没有找到该订单的配送进度信息。',
        quickReplies: [createQuickReply('qr-select-order', '选择订单')],
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'delivery',
      currentStep: 'completed',
    },
  };
}

function handleDeliveryWithoutContext(context: NluContext): NluResponse {
  const { dialogState } = context;

  const deliveryOrders: any[] = [ORDER_FOOD_DELIVERING, ORDER_FOOD_DELIVERING_2];

  if (deliveryOrders.length === 0) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '没有找到正在配送中的订单。',
          quickReplies: [createQuickReply('qr-select-order', '选择订单')],
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'delivery',
        currentStep: 'completed',
      },
    };
  }

  if (deliveryOrders.length === 1) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '帮你找到一个配送中的订单',
          delay: 300,
        },
        {
          role: 'assistant',
          contentType: 'text',
          content: '',
          orderCard: deliveryOrders[0],
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'delivery',
        currentStep: 'completed',
        orderContext: {
          orderId: deliveryOrders[0].id,
        },
      },
    };
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '你有多个配送中的订单，请选择要查看的订单',
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'delivery',
      currentStep: 'select_order',
      data: { orderList: deliveryOrders },
    },
  };
}

function handleReserveDeliveryConfirm(
  message: string,
  context: NluContext
): NluResponse {
  const { dialogState, orderCard } = context;

  const isYes = message.includes('是') || message.includes('好') || message.includes('立即') || message.includes('预约');
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
          content: '正在为你预约配送，请稍候...',
          delay: 1000,
        },
        {
          role: 'assistant',
          contentType: 'text',
          content: '预约成功！骑手将在预计时间内上门取餐',
          delay: 1000,
        },
        {
          role: 'assistant',
          contentType: 'text',
          content: '',
          orderCard: ORDER_FOOD_DELIVERY_PENDING_ACCEPT,
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'delivery',
        currentStep: 'completed',
      },
    };
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '请问是否需要预约配送呢？',
        quickReplies: [
          createQuickReply('qr-no', '否'),
          createQuickReply('qr-yes-delivery', '是，立即预约'),
        ],
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'delivery',
      currentStep: 'waiting_reserve_confirm',
    },
  };
}

function handleReserveInProgress(context: NluContext): NluResponse {
  const { dialogState } = context;
  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '正在为您预约配送，请稍候...',
      },
    ],
    newDialogState: dialogState,
  };
}
