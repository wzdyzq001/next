import type { OrderData, OrderCategory, OrderStatus } from './types';
import type { OrderCardData } from './OrderCard/orderCardTypes';
import type { OrderListItem } from '../../types';

const CATEGORY_LABEL_MAP: Record<string, string> = {
  food: '餐饮',
  hotel: '酒店',
  scenic: '景区',
  general: '综合',
  travel: '旅行社',
  travel_agency: '旅行社',
};

const PRODUCT_TYPE_LABEL_MAP: Record<string, string> = {
  group_voucher: '团购券',
  presale_voucher: '预售券',
  calendar_room: '日历房',
  calendar_ticket: '日历票',
  voucher: '券码',
  order_takeout: '点单/外卖',
  calendar: '日历预约',
};

const STATUS_TEXT_MAP: Record<OrderStatus, string> = {
  pending_payment: '待支付',
  pending_use: '待使用',
  pending_booking: '待预约',
  confirmed: '已确认',
  in_delivery: '配送中',
  completed: '交易完成',
  refunding: '退款中',
  refunded: '退款成功',
  refund_card: '退卡中',
  refund_failed: '退款失败',
  canceled: '已取消',
};

const STATUS_COLOR_MAP: Record<OrderStatus, string> = {
  pending_payment: 'orange',
  pending_use: 'orange',
  pending_booking: 'orange',
  confirmed: 'blue',
  in_delivery: 'blue',
  completed: 'green',
  refunding: 'blue',
  refunded: 'gray',
  refund_card: 'gray',
  refund_failed: 'orange',
  canceled: 'gray',
};

const ORDER_STATUS_MAP: Record<OrderStatus, OrderCardData['orderStatus']> = {
  pending_payment: 'pending_pay',
  pending_use: 'unused',
  pending_booking: 'to_book',
  confirmed: 'booked',
  in_delivery: 'delivering',
  completed: 'completed',
  refunding: 'refunding',
  refunded: 'refund_success',
  refund_card: 'refunding',
  refund_failed: 'refund_fail',
  canceled: 'cancelled',
};

function mapCategory(category: OrderCategory): OrderCardData['category'] {
  if (category === 'travel') return 'travel_agency';
  return category as OrderCardData['category'];
}

function mapProductType(order: OrderData): OrderCardData['productType'] {
  const { category, productType } = order;
  if (category === 'hotel') {
    return productType === 'calendar' ? 'calendar_room' : 'presale_voucher';
  }
  if (category === 'scenic') {
    return productType === 'calendar' ? 'calendar_ticket' : 'presale_voucher';
  }
  return 'group_voucher';
}

function isEmoji(str: string): boolean {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/u;
  return emojiRegex.test(str);
}

function getDefaultThumbnail(category: OrderCategory): string {
  const map: Record<OrderCategory, string> = {
    food: '🍽️',
    hotel: '🏨',
    scenic: '🎢',
    general: '📦',
    travel: '✈️',
  };
  return map[category] || '📦';
}

function buildExtension(order: OrderData): OrderCardData['extension'] {
  const { category, status, hotelInfo, scenicInfo, travelInfo, pickupCode, payExpireAt } = order;

  if (status === 'pending_payment' && payExpireAt) {
    const remainingMs = payExpireAt - Date.now();
    const minutes = Math.max(0, Math.floor(remainingMs / 60000));
    const seconds = Math.max(0, Math.floor((remainingMs % 60000) / 1000));
    return {
      type: 'payment_countdown',
      title: '支付倒计时',
      summary: `${minutes}分${seconds.toString().padStart(2, '0')}秒`,
    };
  }

  if (pickupCode && (status === 'pending_use' || status === 'in_delivery' || status === 'confirmed')) {
    return {
      type: 'pickup_code',
      title: '取餐码',
      pickupCode,
      hasPickupCode: true,
    };
  }

  if (category === 'hotel' && hotelInfo && (status === 'confirmed' || status === 'completed')) {
    const nights = order.checkInDate && order.checkOutDate
      ? Math.ceil((new Date(order.checkOutDate).getTime() - new Date(order.checkInDate).getTime()) / (1000 * 60 * 60 * 24))
      : 1;
    return {
      type: 'hotel_stay',
      title: '入住信息',
      hotelInfo: {
        hotelName: order.storeName,
        checkInDate: order.checkInDate || '',
        checkOutDate: order.checkOutDate || '',
        nights,
        statusTags: status === 'completed' ? [{ text: '已入住', type: 'success' as const }] : undefined,
      },
    };
  }

  if (category === 'scenic' && scenicInfo && (status === 'confirmed' || status === 'completed')) {
    return {
      type: 'scenic_entry',
      title: '入园信息',
      scenicInfo: {
        scenicName: order.storeName,
        visitDate: order.visitDate || '',
        entryTime: scenicInfo.visitTime || '',
        statusTags: status === 'completed' ? [{ text: '已入园', type: 'success' as const }] : undefined,
      },
    };
  }

  if (category === 'travel' && travelInfo && (status === 'confirmed' || status === 'pending_use')) {
    return {
      type: 'travel_info',
      title: '行程信息',
      info: [
        { label: '出发时间', value: travelInfo.departureTime || '-' },
        { label: '到达时间', value: travelInfo.arrivalTime || '-' },
        { label: '出发站点', value: travelInfo.departureStation || '-' },
        { label: '到达站点', value: travelInfo.arrivalStation || '-' },
        { label: '座位等级', value: travelInfo.seatClass || '-' },
        { label: '乘客', value: travelInfo.passenger || '-' },
      ],
    };
  }

  if (status === 'refunding') {
    return {
      type: 'refund',
      title: '退款进度',
      summary: '退款处理中，请耐心等待',
    };
  }

  if (status === 'refunded') {
    return {
      type: 'refund_success',
      title: '退款成功',
      summary: '退款已原路退回',
    };
  }

  if (status === 'in_delivery') {
    return {
      type: 'progress',
      title: '配送进度',
      steps: [
        { label: '商家已接单', state: 'done' as const },
        { label: '骑手取货中', state: 'done' as const },
        { label: '配送中', state: 'active' as const },
        { label: '已送达', state: 'pending' as const },
      ],
      estimatedTime: order.deliveryEta,
    };
  }

  return undefined;
}

function buildActions(order: OrderData): OrderCardData['actions'] {
  const { category, status } = order;
  const actions: OrderCardData['actions'] = [];

  if (status === 'pending_payment') {
    actions.push({ label: '立即支付', type: 'primary' });
    return actions;
  }

  if (status === 'pending_use') {
    if (category === 'food') {
      actions.push({ label: '立即点单', type: 'primary' });
      actions.push({ label: '查看券码', type: 'secondary' });
    } else if (category === 'hotel') {
      actions.push({ label: '立即预约', type: 'primary' });
      actions.push({ label: '查看详情', type: 'secondary' });
    } else if (category === 'scenic') {
      actions.push({ label: '立即预约', type: 'primary' });
      actions.push({ label: '入园指引', type: 'secondary' });
    } else {
      actions.push({ label: '去使用', type: 'primary' });
    }
    return actions;
  }

  if (status === 'pending_booking') {
    actions.push({ label: '立即预约', type: 'primary' });
    return actions;
  }

  if (status === 'confirmed' || status === 'in_delivery') {
    actions.push({ label: '联系商家', type: 'secondary' });
    if (category === 'food' && status === 'in_delivery') {
      actions.unshift({ label: '催配送', type: 'primary' });
    }
    return actions;
  }

  if (status === 'completed') {
    actions.push({ label: '再来一单', type: 'primary' });
    actions.push({ label: '去评价', type: 'secondary' });
    return actions;
  }

  if (status === 'refunding') {
    actions.push({ label: '催退款', type: 'primary' });
    return actions;
  }

  if (status === 'refund_failed') {
    actions.push({ label: '联系客服', type: 'primary' });
    return actions;
  }

  actions.push({ label: '查看详情', type: 'secondary' });
  return actions;
}

function buildSuggestions(order: OrderData): string[] {
  const { category, status } = order;
  const suggestions: string[] = [];

  if (status === 'pending_payment') {
    suggestions.push('支付遇到问题怎么办？');
    suggestions.push('可以取消订单吗？');
    suggestions.push('支持哪些支付方式？');
    return suggestions;
  }

  if (status === 'pending_use' || status === 'pending_booking') {
    if (category === 'food') {
      suggestions.push('怎么使用这张券？');
      suggestions.push('可以退款吗？');
      suggestions.push('附近还有哪些门店？');
    } else if (category === 'hotel') {
      suggestions.push('怎么预约入住？');
      suggestions.push('可以改期吗？');
      suggestions.push('酒店设施有哪些？');
    } else if (category === 'scenic') {
      suggestions.push('怎么预约入园？');
      suggestions.push('需要带什么证件？');
      suggestions.push('有什么游玩攻略？');
    } else if (category === 'travel') {
      suggestions.push('行程详情是什么？');
      suggestions.push('可以改签吗？');
      suggestions.push('行李额是多少？');
    } else {
      suggestions.push('怎么使用？');
      suggestions.push('可以退款吗？');
      suggestions.push('有效期多久？');
    }
    return suggestions;
  }

  if (status === 'confirmed') {
    if (category === 'hotel') {
      suggestions.push('入住时间是几点？');
      suggestions.push('含早餐吗？');
      suggestions.push('怎么去酒店？');
    } else if (category === 'scenic') {
      suggestions.push('入园时间是几点？');
      suggestions.push('需要换票吗？');
      suggestions.push('必玩项目有哪些？');
    } else {
      suggestions.push('订单详情');
      suggestions.push('联系商家');
      suggestions.push('申请退款');
    }
    return suggestions;
  }

  if (status === 'completed') {
    suggestions.push('怎么开发票？');
    suggestions.push('再来一单');
    suggestions.push('去评价');
    return suggestions;
  }

  if (status === 'refunding') {
    suggestions.push('退款多久到账？');
    suggestions.push('退款进度查询');
    suggestions.push('可以取消退款吗？');
    return suggestions;
  }

  if (status === 'refunded') {
    suggestions.push('退款到哪里了？');
    suggestions.push('为什么没收到退款？');
    suggestions.push('再来一单');
    return suggestions;
  }

  if (status === 'canceled') {
    suggestions.push('为什么取消了？');
    suggestions.push('可以恢复订单吗？');
    suggestions.push('再来一单');
    return suggestions;
  }

  suggestions.push('查看订单详情');
  suggestions.push('联系客服');
  suggestions.push('申请售后');
  return suggestions;
}

export function convertOrderDataToCardData(order: OrderData): OrderCardData {
  const category = mapCategory(order.category);
  const productType = mapProductType(order);
  const orderStatus = ORDER_STATUS_MAP[order.status] || 'unused';
  const statusText = STATUS_TEXT_MAP[order.status] || order.status;
  const statusColor = STATUS_COLOR_MAP[order.status] || 'gray';

  const thumbnail = order.productImage && isEmoji(order.productImage)
    ? order.productImage
    : order.productImage || getDefaultThumbnail(order.category);

  const extension = buildExtension(order);
  const actions = buildActions(order);
  const suggestions = buildSuggestions(order);

  return {
    id: order.id,
    category,
    categoryLabel: CATEGORY_LABEL_MAP[category] || category,
    productType,
    productTypeLabel: PRODUCT_TYPE_LABEL_MAP[productType] || productType,
    orderStatus,
    orderStatusLabel: statusText,
    productName: order.productName,
    price: order.price,
    thumbnail,
    tags: order.tags || [],
    storeName: order.storeName,
    distance: order.distance || '',
    statusText,
    statusColor,
    extension,
    actions,
    suggestions,
  };
}

const LIST_ITEM_STATUS_MAP: Record<string, OrderCardData['orderStatus']> = {
  '待支付': 'pending_pay',
  '待使用': 'unused',
  '待预约': 'to_book',
  '预约确认中': 'booking',
  '预约成功': 'booked',
  '预订确认中': 'booking',
  '预订成功': 'booked',
  '配送中': 'delivering',
  '已送达': 'completed',
  '已入住': 'completed',
  '已入园': 'completed',
  '交易完成': 'completed',
  '退款申请中': 'refunding',
  '退款中': 'refunding',
  '退款成功': 'refund_success',
  '退款失败': 'refund_fail',
  '已取消': 'cancelled',
  '订单取消': 'cancelled',
};

const LIST_ITEM_CATEGORY_MAP: Record<string, OrderCardData['category']> = {
  food: 'food',
  hotel: 'hotel',
  scenic: 'scenic',
  play: 'scenic',
  fun: 'general',
  general: 'general',
  travel: 'travel_agency',
  travel_agency: 'travel_agency',
};

function mapListItemProductType(item: OrderListItem): OrderCardData['productType'] {
  const { category, hotelProductType, scenicProductType, travelProductType, fulfillmentModes } = item;
  if (category === 'hotel') {
    if (hotelProductType === 'calendar_room') return 'calendar_room';
    return 'presale_voucher';
  }
  if (category === 'scenic' || category === 'play') {
    if (scenicProductType === 'calendar_ticket') return 'calendar_ticket';
    if (scenicProductType === 'presale_voucher') return 'presale_voucher';
    return 'group_voucher';
  }
  if (category === 'travel') {
    return 'presale_voucher';
  }
  if (fulfillmentModes?.includes('delivery')) {
    return 'order_takeout';
  }
  return 'group_voucher';
}

function buildListItemExtension(item: OrderListItem): OrderCardData['extension'] {
  const status = item.statusText;
  const category = LIST_ITEM_CATEGORY_MAP[item.category] || item.category;

  if (status === '待支付') {
    return {
      type: 'payment_countdown',
      title: '支付倒计时',
      summary: '29分59秒',
    };
  }

  if (status === '退款申请中' || status === '退款中') {
    return {
      type: 'refund',
      title: '退款进度',
      summary: '退款处理中，请耐心等待',
    };
  }

  if (status === '退款成功') {
    return {
      type: 'refund_success',
      title: '退款成功',
      summary: '退款已原路退回',
    };
  }

  if (status === '配送中') {
    return {
      type: 'progress',
      title: '配送进度',
      steps: [
        { label: '商家已接单', state: 'done' },
        { label: '骑手取货中', state: 'done' },
        { label: '配送中', state: 'active' },
        { label: '已送达', state: 'pending' },
      ],
    };
  }

  if (status === '已送达') {
    return {
      type: 'delivery_completed',
      title: '配送完成',
      summary: '骑手已送达，请确认收货',
    };
  }

  if ((category === 'hotel') && (status === '预约成功' || status === '预订成功' || status === '已入住' || status === '交易完成')) {
    return {
      type: 'hotel_stay',
      title: '入住信息',
      hotelInfo: {
        hotelName: item.merchant,
        checkInDate: '2026-07-10',
        checkOutDate: '2026-07-12',
        nights: 2,
        statusTags: status === '已入住' || status === '交易完成' ? [{ text: '已入住', type: 'success' as const }] : undefined,
      },
    };
  }

  if ((category === 'scenic') && (status === '预约成功' || status === '预订成功' || status === '已入园' || status === '交易完成')) {
    return {
      type: 'scenic_entry',
      title: '入园信息',
      scenicInfo: {
        scenicName: item.merchant,
        visitDate: '2026-07-15',
        entryTime: '09:00-10:00',
        statusTags: status === '已入园' || status === '交易完成' ? [{ text: '已入园', type: 'success' as const }] : undefined,
      },
    };
  }

  if (category === 'travel_agency' && (status === '预约成功' || status === '待出行' || status === '行程中' || status === '交易完成')) {
    return {
      type: 'travel_info',
      title: '行程信息',
      info: [
        { label: '出发时间', value: '2026-07-20 08:00' },
        { label: '返回时间', value: '2026-07-23 18:00' },
        { label: '集合地点', value: '指定酒店大堂' },
        { label: '导游', value: '张导 138****8888' },
      ],
    };
  }

  if (status === '待使用' && item.fulfillmentModes?.includes('code')) {
    return {
      type: 'pickup_code',
      title: '取餐码/核销码',
      pickupCode: '9001 1345 653',
      hasPickupCode: true,
    };
  }

  return undefined;
}

function buildListItemActions(item: OrderListItem): OrderCardData['actions'] {
  const status = item.statusText;
  const category = LIST_ITEM_CATEGORY_MAP[item.category];
  const actions: OrderCardData['actions'] = [];

  if (status === '待支付') {
    actions.push({ label: '去支付', type: 'primary' });
    actions.push({ label: '取消订单', type: 'secondary' });
    return actions;
  }

  if (status === '待使用') {
    actions.push({ label: '去使用', type: 'primary' });
    actions.push({ label: '申请退款', type: 'secondary' });
    return actions;
  }

  if (status === '待预约') {
    actions.push({ label: '立即预约', type: 'primary' });
    actions.push({ label: '申请退款', type: 'secondary' });
    return actions;
  }

  if (status === '预约确认中' || status === '预订确认中') {
    actions.push({ label: '查看详情', type: 'primary' });
    actions.push({ label: '取消预约', type: 'secondary' });
    return actions;
  }

  if (status === '预约成功' || status === '预订成功') {
    actions.push({ label: '查看凭证', type: 'primary' });
    actions.push({ label: '修改预约', type: 'secondary' });
    return actions;
  }

  if (status === '配送中') {
    actions.push({ label: '联系骑手', type: 'primary' });
    actions.push({ label: '查看地图', type: 'secondary' });
    return actions;
  }

  if (status === '已送达' || status === '已入住' || status === '已入园') {
    actions.push({ label: '评价', type: 'primary' });
    actions.push({ label: '再来一单', type: 'secondary' });
    return actions;
  }

  if (status === '交易完成') {
    actions.push({ label: '再来一单', type: 'primary' });
    actions.push({ label: '申请售后', type: 'secondary' });
    return actions;
  }

  if (status === '退款申请中' || status === '退款中') {
    actions.push({ label: '撤销退款', type: 'primary' });
    actions.push({ label: '查看进度', type: 'secondary' });
    return actions;
  }

  if (status === '退款成功') {
    actions.push({ label: '再来一单', type: 'primary' });
    return actions;
  }

  if (status === '退款失败') {
    actions.push({ label: '重新申请', type: 'primary' });
    actions.push({ label: '联系客服', type: 'secondary' });
    return actions;
  }

  if (status === '已取消' || status === '订单取消') {
    actions.push({ label: '重新下单', type: 'primary' });
    actions.push({ label: '删除订单', type: 'secondary' });
    return actions;
  }

  actions.push({ label: '查看详情', type: 'primary' });
  return actions;
}

function buildListItemSuggestions(item: OrderListItem): string[] {
  const status = item.statusText;
  const category = LIST_ITEM_CATEGORY_MAP[item.category];
  const suggestions: string[] = [];

  if (status === '待使用' || status === '待预约') {
    suggestions.push('怎么使用？');
    suggestions.push('可以退款吗？');
    suggestions.push('有效期多久？');
    return suggestions;
  }

  if (status === '预约成功' || status === '预订成功') {
    suggestions.push('怎么修改预约？');
    suggestions.push('可以取消吗？');
    suggestions.push('需要带什么？');
    return suggestions;
  }

  if (status === '配送中') {
    suggestions.push('还有多久到？');
    suggestions.push('能联系骑手吗？');
    suggestions.push('可以改地址吗？');
    return suggestions;
  }

  if (status === '交易完成') {
    suggestions.push('怎么开发票？');
    suggestions.push('能再买一单吗？');
    suggestions.push('评价有什么奖励？');
    return suggestions;
  }

  if (status === '退款申请中' || status === '退款中') {
    suggestions.push('退款多久到账？');
    suggestions.push('能撤销退款吗？');
    suggestions.push('退到哪里？');
    return suggestions;
  }

  suggestions.push('订单详情');
  suggestions.push('联系客服');
  return suggestions.slice(0, 3);
}

export function convertOrderListItemToCardData(item: OrderListItem): OrderCardData {
  const category = LIST_ITEM_CATEGORY_MAP[item.category] || 'general';
  const productType = mapListItemProductType(item);
  const orderStatus = LIST_ITEM_STATUS_MAP[item.statusText] || 'unused';
  const statusText = item.statusText;
  const statusColor = item.statusColor;

  const tags: string[] = [];
  if (item.productRules?.refundRule) tags.push(item.productRules.refundRule);
  if (item.productRules?.validDate) tags.push(item.productRules.validDate);
  if (tags.length === 0 && item.category === 'food') tags.push('免预约');

  const extension = buildListItemExtension(item);
  const actions = buildListItemActions(item);
  const suggestions = buildListItemSuggestions(item);

  return {
    id: item.orderId,
    category,
    categoryLabel: CATEGORY_LABEL_MAP[category] || category,
    productType,
    productTypeLabel: PRODUCT_TYPE_LABEL_MAP[productType] || productType,
    orderStatus,
    orderStatusLabel: statusText,
    productName: item.product,
    price: item.price / 100,
    thumbnail: item.thumbnail,
    tags,
    storeName: item.merchant,
    distance: '',
    statusText,
    statusColor,
    extension,
    actions,
    suggestions,
    urgeReason: statusText === '待预约' ? '预约后可随时退款' : undefined,
  };
}
