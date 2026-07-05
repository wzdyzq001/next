import type { OrderData, OrderCategory, OrderStatus } from '../../types';
import type { OrderCardData } from './OrderCard/orderCardTypes';
import type { OrderListItem } from '../../types';
import {
  inferFoodSubStatusFromText,
  inferMainStatusFromText,
  inferFulfillmentTypeFromModes,
  getFoodSubStatusLabel,
  getMainStatusLabel,
  getMainStatusColor,
  getFoodSubStatusMainStatus,
  isFoodSubStatus,
  getFoodSubStatusFulfillmentType,
} from './orderStatusMapping';

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
  unredeemed: '待核销',
  redeemed: '已核销',
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
  unredeemed: 'orange',
  redeemed: 'green',
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
  unredeemed: 'unused',
  redeemed: 'completed',
  completed: 'completed',
  refunding: 'refunding',
  refunded: 'refund_success',
  refund_card: 'refunding',
  refund_failed: 'refund_fail',
  canceled: 'cancelled',
};

function mapCategory(category: OrderCategory): OrderCardData['category'] {
  if (category === 'travel') return 'travel_agency';
  if (category === 'play') return 'scenic';
  if (category === 'fun' || category === 'vacation' || category === 'show') return 'general';
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
    fun: '🎮',
    play: '🎡',
    vacation: '🏖️',
    show: '🎭',
    transport: '🚄',
    all: '📦',
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
        hotelName: order.storeName || order.store,
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
        scenicName: order.storeName || order.store,
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
      const methods = order.supportedRedeemMethods || [];
      const hasVoucher = methods.includes('voucher');
      const hasSelfOrder = methods.includes('self_order');
      const hasDelivery = methods.includes('delivery');

      if (hasVoucher && hasSelfOrder && hasDelivery) {
        actions.push({ label: '🎫 查看券码', type: 'secondary' });
        actions.push({ label: '立即点单', type: 'secondary' });
        actions.push({ label: '立即配送', type: 'primary' });
      } else if (hasVoucher && hasSelfOrder) {
        actions.push({ label: '🎫 查看券码', type: 'secondary' });
        actions.push({ label: '立即点单', type: 'primary' });
      } else if (hasVoucher && hasDelivery) {
        actions.push({ label: '🎫 查看券码', type: 'secondary' });
        actions.push({ label: '立即配送', type: 'primary' });
      } else if (hasSelfOrder && hasDelivery) {
        actions.push({ label: '立即点单', type: 'secondary' });
        actions.push({ label: '立即配送', type: 'primary' });
      } else if (hasVoucher) {
        actions.push({ label: '🎫 查看券码', type: 'primary' });
      } else if (hasSelfOrder) {
        actions.push({ label: '立即点单', type: 'primary' });
      } else if (hasDelivery) {
        actions.push({ label: '立即配送', type: 'primary' });
      } else {
        actions.push({ label: '🎫 查看券码', type: 'primary' });
      }
    } else if (category === 'hotel') {
      actions.push({ label: '立即预约', type: 'primary' });
      actions.push({ label: '查看详情', type: 'secondary' });
    } else if (category === 'scenic') {
      actions.push({ label: '立即预约', type: 'primary' });
      actions.push({ label: '入园指引', type: 'secondary' });
    } else {
      actions.push({ label: '🎫 查看券码', type: 'primary' });
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
    if (category === 'food' && order.foodSubOrder) {
      if (order.foodSubOrder.type === 'delivery') {
        suggestions.push('漏送错送怎么办');
        suggestions.push('餐品有问题怎么办');
        suggestions.push('再次购买');
      } else if (order.foodSubOrder.type === 'self_order') {
        suggestions.push('餐品有问题怎么办');
        suggestions.push('怎么开发票');
        suggestions.push('再次购买');
      } else {
        suggestions.push('味道怎么样');
        suggestions.push('怎么开发票');
        suggestions.push('再来一单');
      }
    } else {
      suggestions.push('怎么开发票？');
      suggestions.push('再来一单');
      suggestions.push('去评价');
    }
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
  const orderCategory = order.category || 'general';
  const category = mapCategory(orderCategory);
  const productType = mapProductType(order);
  const orderStatus = ORDER_STATUS_MAP[order.status] || 'unused';
  const statusText = STATUS_TEXT_MAP[order.status] || order.status;
  const rawStatusColor = STATUS_COLOR_MAP[order.status] || 'gray';

  const mainStatus = inferMainStatusFromText(statusText, category as any);
  const mainStatusLabel = getMainStatusLabel(mainStatus);
  const mainStatusColor = getMainStatusColor(mainStatus);

  let subStatus: string | undefined;
  let subStatusLabel: string | undefined;
  let fulfillmentType: 'self_order' | 'delivery' | 'voucher' | undefined;

  if (category === 'food' && mainStatus === 'redeemed') {
    const modes: Array<'code' | 'order' | 'delivery'> = [];
    if (order.supportedRedeemMethods?.includes('voucher')) modes.push('code');
    if (order.supportedRedeemMethods?.includes('self_order')) modes.push('order');
    if (order.supportedRedeemMethods?.includes('delivery')) modes.push('delivery');

    const inferredSubStatus = inferFoodSubStatusFromText(statusText, modes);
    if (inferredSubStatus) {
      subStatus = inferredSubStatus;
      subStatusLabel = getFoodSubStatusLabel(inferredSubStatus);
      fulfillmentType = getFoodSubStatusFulfillmentType(inferredSubStatus);
    } else if (order.foodSubOrder) {
      fulfillmentType = order.foodSubOrder.type;
    } else if (order.redeemMethod && order.redeemMethod !== 'none') {
      fulfillmentType = order.redeemMethod as any;
    }
  }

  const thumbnail = order.productImage && isEmoji(order.productImage)
    ? order.productImage
    : order.productImage || getDefaultThumbnail(orderCategory);

  const extension = buildExtension(order);
  const actions = buildActions(order);
  const suggestions = buildSuggestions(order);

  return {
    id: order.orderId,
    category,
    categoryLabel: CATEGORY_LABEL_MAP[category] || category,
    productType,
    productTypeLabel: PRODUCT_TYPE_LABEL_MAP[productType] || productType,
    fulfillmentType,
    mainStatus,
    mainStatusLabel,
    subStatus,
    subStatusLabel,
    orderStatus,
    orderStatusLabel: statusText,
    productName: order.itemSummary,
    price: order.totalAmount || 0,
    thumbnail,
    tags: order.tags || [],
    storeName: order.store,
    distance: order.distance || '',
    statusText: mainStatusLabel,
    statusColor: mainStatusColor,
    extension,
    actions,
    suggestions,
    validDate: order.productRules?.validDate,
  };
}

const LIST_ITEM_STATUS_MAP: Record<string, OrderCardData['orderStatus']> = {
  '待支付': 'pending_pay',
  '待使用': 'unused',
  '待预约': 'to_book',
  '预约确认中': 'booking_confirming',
  '预约成功': 'booked',
  '预订确认中': 'booking_confirming',
  '预订成功': 'booked',
  '待接单': 'pending_accept',
  '待商家接单': 'pending_accept',
  '商家已接单': 'preparing',
  '商家备餐中': 'preparing',
  '制作中': 'preparing',
  '配送中': 'delivering',
  '待骑手取餐': 'delivering',
  '待取餐': 'waiting_pickup',
  '已取餐': 'picked_up',
  '已送达': 'completed',
  '已入住': 'checked_in',
  '已入园': 'entered',
  '待出行': 'pending_travel',
  '行程中': 'in_travel',
  '交易完成': 'completed',
  '已完成': 'completed',
  '已使用': 'completed',
  '已结束': 'completed',
  '退款申请中': 'refunding',
  '退款中': 'refunding',
  '退款成功': 'refund_success',
  '退款失败': 'refund_fail',
  '已取消': 'cancelled',
  '订单取消': 'cancelled',
  '预约已取消': 'cancelled',
};

const LIST_ITEM_CATEGORY_MAP: Record<string, OrderCardData['category']> = {
  food: 'food',
  hotel: 'hotel',
  scenic: 'scenic',
  play: 'scenic',
  fun: 'general',
  general: 'general',
  vacation: 'general',
  show: 'general',
  travel: 'travel_agency',
  travel_agency: 'travel_agency',
};

function mapListItemProductType(item: OrderListItem): OrderCardData['productType'] {
  const { category, hotelProductType, scenicProductType, travelProductType } = item;
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
  return 'group_voucher';
}

function getRedeemTypes(item: OrderListItem): OrderCardData['redeemTypes'] {
  const modes = item.fulfillmentModes || [];
  const types: OrderCardData['redeemTypes'] = [];
  if (modes.includes('code')) types.push('voucher');
  if (modes.includes('order')) types.push('order');
  if (modes.includes('delivery')) types.push('delivery');
  return types.length > 0 ? types : undefined;
}

function buildListItemTags(item: OrderListItem): string[] {
  const tags: string[] = [];
  const category = LIST_ITEM_CATEGORY_MAP[item.category] || item.category;

  const addTag = (tag: string) => {
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  };

  if (item.productRules?.refundRule) {
    const ruleText = item.productRules.refundRule;
    const parts = ruleText.split(/[·•]/).map(s => s.trim()).filter(Boolean);
    parts.forEach(part => {
      let normalized = part;
      if (normalized === '过期自动退') {
        normalized = '过期退';
      }
      addTag(normalized);
    });
  } else if (category === 'food' || category === 'general') {
    addTag('随时退');
  }

  if (category === 'food') {
    addTag('过期退');
  }

  if (category === 'hotel') {
    if (item.hotelProductType === 'presale_voucher') {
      addTag('预售券');
    }
  }

  if (category === 'scenic') {
    if (item.scenicProductType === 'calendar_ticket') {
      addTag('指定日');
      addTag('身份证入园');
    } else if (item.scenicProductType === 'presale_voucher') {
      addTag('预售券');
    }
  }

  if (tags.length === 0 && category === 'food') {
    addTag('免预约');
  }

  return tags;
}

function buildListItemExtension(item: OrderListItem): OrderCardData['extension'] {
  const statusText = item.statusText;
  const category = LIST_ITEM_CATEGORY_MAP[item.category] || item.category;
  const productType = mapListItemProductType(item);

  if (statusText === '待支付') {
    if (category === 'hotel' && productType === 'calendar_room') {
      return {
        type: 'hotel_stay',
        title: '入住信息',
        hotelInfo: {
          hotelName: item.merchant,
          checkInDate: '7月20日 周一',
          checkOutDate: '7月22日 周三',
          nights: 2,
        },
        info: [
          { label: '入住时间', value: '2026-07-20 14:00后' },
          { label: '离店时间', value: '2026-07-22 12:00前' },
          { label: '房间数量', value: '1间 · 2人' },
        ],
      };
    }
    if (category === 'scenic' && productType === 'calendar_ticket') {
      return {
        type: 'scenic_entry',
        title: '入园信息',
        scenicInfo: {
          scenicName: item.merchant,
          visitDate: '7月10日 周五',
          entryTime: '09:30-22:00',
        },
        info: [
          { label: '入园日期', value: '2026-07-10' },
          { label: '入园时间', value: '09:30-22:00' },
        ],
      };
    }
    return {
      type: 'payment_countdown',
      title: '支付倒计时',
      info: [{ label: '剩余时间', value: '29分59秒' }],
    };
  }

  if (statusText === '退款申请中' || statusText === '退款中') {
    return {
      type: 'refund',
      title: '退款进度',
      info: [
        { label: '退款金额', value: `¥${(item.price / 100).toFixed(2)}` },
        { label: '退款方式', value: '原路退回' },
        { label: '预计到账', value: category === 'travel_agency' ? '3-7个工作日' : '1-3个工作日' },
      ],
      steps: [
        { label: '提交申请', state: 'done' },
        { label: '商家审核', state: 'active' },
        { label: '退款到账', state: 'pending' },
      ],
    };
  }

  if (statusText === '退款成功') {
    return {
      type: 'refund_success',
      title: '退款成功',
      info: [
        { label: '退款金额', value: `¥${(item.price / 100).toFixed(2)}` },
        { label: '退款方式', value: '原路退回' },
        { label: '到账时间', value: '2026-06-28 15:32' },
      ],
    };
  }

  if (statusText === '配送中') {
    return {
      type: 'progress',
      title: '配送进度',
      estimatedTime: '预计15分钟送达',
      steps: [
        { label: '下单成功', state: 'done', time: '11:20' },
        { label: '商家已接单', state: 'done', time: '11:22' },
        { label: '骑手配送中', state: 'active', time: '11:30' },
        { label: '已送达', state: 'pending' },
      ],
    };
  }

  if (statusText === '待接单' || statusText === '待商家接单') {
    if (item.fulfillmentModes?.includes('delivery')) {
      return {
        type: 'progress',
        title: '配送进度',
        estimatedTime: '预计2分钟内接单',
        steps: [
          { label: '下单成功', state: 'done', time: '11:20' },
          { label: '商家接单中', state: 'active' },
          { label: '骑手取餐', state: 'pending' },
          { label: '配送中', state: 'pending' },
          { label: '已送达', state: 'pending' },
        ],
      };
    }
    return {
      type: 'progress',
      title: '取餐进度',
      estimatedTime: '预计3分钟内接单',
      steps: [
        { label: '下单成功', state: 'done', time: '10:02' },
        { label: '商家接单中', state: 'active' },
        { label: '制作中', state: 'pending' },
        { label: '待取餐', state: 'pending' },
        { label: '已完成', state: 'pending' },
      ],
    };
  }

  if (statusText === '制作中') {
    if (item.fulfillmentModes?.includes('delivery')) {
      return {
        type: 'progress',
        title: '配送进度',
        estimatedTime: '预计10分钟后取餐',
        steps: [
          { label: '下单成功', state: 'done', time: '11:20' },
          { label: '商家已接单', state: 'done', time: '11:22' },
          { label: '制作中', state: 'active', time: '11:25' },
          { label: '骑手取餐', state: 'pending' },
          { label: '已送达', state: 'pending' },
        ],
      };
    }
    return {
      type: 'progress',
      title: '取餐进度',
      estimatedTime: '预计8分钟后可取',
      steps: [
        { label: '下单成功', state: 'done', time: '10:02' },
        { label: '商家已确认', state: 'done', time: '10:03' },
        { label: '制作中', state: 'active', time: '10:05' },
        { label: '待取餐', state: 'pending' },
        { label: '已完成', state: 'pending' },
      ],
    };
  }

  if (statusText === '商家已接单') {
    if (item.fulfillmentModes?.includes('delivery')) {
      return {
        type: 'progress',
        title: '配送进度',
        estimatedTime: '预计15分钟送达',
        steps: [
          { label: '下单成功', state: 'done', time: '11:20' },
          { label: '商家已接单', state: 'done', time: '11:22' },
          { label: '商家备餐中', state: 'active', time: '11:25' },
          { label: '骑手取餐', state: 'pending' },
          { label: '配送中', state: 'pending' },
          { label: '已送达', state: 'pending' },
        ],
      };
    }
    return {
      type: 'progress',
      title: '取餐进度',
      estimatedTime: '预计8分钟后可取',
      steps: [
        { label: '下单成功', state: 'done', time: '10:02' },
        { label: '商家已接单', state: 'done', time: '10:03' },
        { label: '制作中', state: 'active', time: '10:05' },
        { label: '待取餐', state: 'pending' },
        { label: '已取餐', state: 'pending' },
      ],
    };
  }

  if (statusText === '商家备餐中') {
    return {
      type: 'progress',
      title: '配送进度',
      estimatedTime: '预计12分钟送达',
      steps: [
        { label: '下单成功', state: 'done', time: '11:20' },
        { label: '商家已接单', state: 'done', time: '11:22' },
        { label: '商家备餐中', state: 'active', time: '11:25' },
        { label: '骑手取餐', state: 'pending' },
        { label: '配送中', state: 'pending' },
        { label: '已送达', state: 'pending' },
      ],
    };
  }

  if (statusText === '待骑手取餐') {
    return {
      type: 'progress',
      title: '配送进度',
      estimatedTime: '预计12分钟送达',
      steps: [
        { label: '下单成功', state: 'done', time: '11:20' },
        { label: '商家已接单', state: 'done', time: '11:22' },
        { label: '商家备餐中', state: 'done', time: '11:25' },
        { label: '待骑手取餐', state: 'active', time: '11:35' },
        { label: '配送中', state: 'pending' },
        { label: '已送达', state: 'pending' },
      ],
    };
  }

  if (statusText === '待取餐') {
    return {
      type: 'pickup_completed',
      title: '取餐信息',
      summary: '已完成制作请尽快取餐',
      pickupCode: 'A088',
      pickupTime: '待取餐',
      info: [
        { label: '取餐号', value: 'A088' },
        { label: '门店', value: '瑞幸咖啡(科兴店)' },
      ],
      steps: [
        { label: '下单成功', state: 'done' as const, time: '10:02' },
        { label: '商家已接单', state: 'done' as const, time: '10:03' },
        { label: '制作中', state: 'done' as const, time: '10:05' },
        { label: '已完成', state: 'active' as const, time: '10:12' },
        { label: '待取餐', state: 'pending' as const },
      ],
    };
  }

  if (statusText === '已取餐') {
    return {
      type: 'pickup_completed',
      title: '取餐信息',
      summary: '已取餐，祝用餐愉快',
      pickupCode: 'A066',
      pickupTime: '已取餐',
      info: [
        { label: '取餐号', value: 'A066' },
        { label: '取餐时间', value: '10:28' },
      ],
      steps: [
        { label: '下单成功', state: 'done' as const, time: '10:02' },
        { label: '商家已接单', state: 'done' as const, time: '10:03' },
        { label: '制作中', state: 'done' as const, time: '10:05' },
        { label: '待取餐', state: 'done' as const, time: '10:15' },
        { label: '已取餐', state: 'done' as const, time: '10:28' },
      ],
    };
  }

  if (statusText === '已送达') {
    return {
      type: 'delivery_completed',
      title: '配送信息',
      summary: '已为你送达，祝用餐愉快',
      info: [
        { label: '配送时间', value: '2026-06-30 12:35' },
        { label: '配送骑手', value: '张师傅' },
      ],
      steps: [
        { label: '提交订单', state: 'done', time: '11:50' },
        { label: '商家接单', state: 'done', time: '11:52' },
        { label: '商家制作', state: 'done', time: '12:05' },
        { label: '骑手配送', state: 'done', time: '12:20' },
        { label: '已送达', state: 'done', time: '12:35' },
      ],
    };
  }

  if (category === 'hotel') {
    if (statusText === '预约确认中' || statusText === '预订确认中') {
      return {
        type: 'hotel_stay',
        title: '入住信息',
        hotelInfo: {
          hotelName: item.merchant,
          checkInDate: '7月15日 周二',
          checkOutDate: '7月17日 周四',
          nights: 2,
          statusTags: [
            { text: productType === 'calendar_room' ? '预订确认中' : '预订确认中', type: 'warn' },
            { text: '预计15分钟内确认', type: 'default' },
          ],
        },
        info: [
          { label: '入住时间', value: '2026-07-15 14:00后' },
          { label: '离店时间', value: '2026-07-17 12:00前' },
          { label: '房间数量', value: '1间 · 2人' },
        ],
      };
    }

    if (statusText === '预约成功' || statusText === '预订成功') {
      return {
        type: 'hotel_stay',
        title: '入住信息',
        hotelInfo: {
          hotelName: item.merchant,
          checkInDate: '7月15日 周二',
          checkOutDate: '7月17日 周四',
          nights: 2,
        },
        info: [
          { label: '入住时间', value: '2026-07-15 14:00后' },
          { label: '离店时间', value: '2026-07-17 12:00前' },
          { label: '房间数量', value: '1间 · 2人' },
          { label: '预约单号', value: 'YZ2026061800123' },
        ],
      };
    }

    if (statusText === '已入住') {
      return {
        type: 'hotel_stay',
        title: '入住信息',
        hotelInfo: {
          hotelName: item.merchant,
          checkInDate: '7月15日 周二',
          checkOutDate: '7月17日 周四',
          nights: 2,
          statusTags: [
            { text: '已入住', type: 'success' },
          ],
        },
        info: [
          { label: '入住时间', value: '2026-07-15 14:30' },
          { label: '离店时间', value: '2026-07-17 12:00前' },
        ],
      };
    }
  }

  if (category === 'scenic') {
    if (statusText === '预约确认中' || statusText === '预订确认中') {
      return {
        type: 'scenic_entry',
        title: '入园凭证',
        scenicInfo: {
          scenicName: item.merchant,
          visitDate: '7月5日 周六',
          entryTime: '09:30',
          statusTags: [
            { text: '预约确认中', type: 'warn' },
            { text: '预计30分钟内确认', type: 'default' },
          ],
        },
        info: [
          { label: '预约日期', value: '2026-07-05' },
          { label: '入园时间', value: '09:30-22:00' },
        ],
      };
    }

    if (statusText === '预约成功' || statusText === '预订成功') {
      return {
        type: 'scenic_entry',
        title: '入园凭证',
        scenicInfo: {
          scenicName: item.merchant,
          visitDate: '7月5日 周六',
          entryTime: '09:30-22:00',
        },
        info: [
          { label: '预约日期', value: '2026-07-05' },
          { label: '入园时间', value: '09:30-22:00' },
          { label: '入园方式', value: '刷身份证入园' },
          { label: '预约单号', value: 'YY2026063000789' },
        ],
      };
    }

    if (statusText === '已入园') {
      return {
        type: 'scenic_entry',
        title: '入园凭证',
        scenicInfo: {
          scenicName: item.merchant,
          visitDate: '7月5日 周六',
          entryTime: '09:45',
          statusTags: [
            { text: '已入园', type: 'success' },
          ],
        },
        info: [
          { label: '预约日期', value: '2026-07-05' },
          { label: '入园时间', value: '09:45' },
          { label: '已入园', value: '已入园' },
        ],
      };
    }
  }

  if (category === 'travel_agency') {
    if (statusText === '预约确认中') {
      return {
        type: 'travel_info',
        title: '出行信息',
        info: [
          { label: '出发日期', value: '2026-07-15' },
          { label: '行程天数', value: '6天5晚' },
        ],
      };
    }

    if (statusText === '预约成功') {
      return {
        type: 'travel_info',
        title: '出行信息',
        info: [
          { label: '出发日期', value: '2026-07-15' },
          { label: '行程天数', value: '6天5晚' },
          { label: '集合地点', value: '长水机场T2航站楼' },
          { label: '导游电话', value: '138****8888' },
        ],
      };
    }

    if (statusText === '待出行') {
      return {
        type: 'travel_info',
        title: '出行信息',
        info: [
          { label: '出发日期', value: '2026-07-15' },
          { label: '行程天数', value: '6天5晚' },
          { label: '集合地点', value: '长水机场T2航站楼' },
          { label: '导游电话', value: '138****8888' },
        ],
      };
    }

    if (statusText === '行程中') {
      return {
        type: 'travel_info',
        title: '今日行程',
        info: [
          { label: '第3天', value: '大理古城 - 洱海游船' },
          { label: '导游电话', value: '138****8888' },
          { label: '集合时间', value: '08:30' },
        ],
      };
    }
  }

  return undefined;
}

function buildListItemHideStoreLine(item: OrderListItem): boolean {
  const category = LIST_ITEM_CATEGORY_MAP[item.category] || item.category;
  const statusText = item.statusText;

  if (category === 'hotel') {
    if (statusText === '预约确认中' || statusText === '预订确认中' ||
        statusText === '预约成功' || statusText === '预订成功' ||
        statusText === '已入住') {
      return true;
    }
  }

  if (category === 'scenic') {
    if (item.scenicProductType === 'presale_voucher' || item.scenicProductType === 'calendar_ticket') {
      if (statusText === '预约确认中' || statusText === '预订确认中' ||
          statusText === '预约成功' || statusText === '预订成功' ||
          statusText === '已入园') {
        return true;
      }
    }
  }

  return false;
}

function buildListItemUrgeReason(item: OrderListItem): string | undefined {
  const category = LIST_ITEM_CATEGORY_MAP[item.category] || item.category;
  const statusText = item.statusText;

  if (statusText === '待预约') {
    if (category === 'hotel') {
      return '仅剩3间';
    }
    if (category === 'scenic') {
      return '预约火爆';
    }
    if (category === 'travel_agency') {
      return '预约有礼';
    }
    return '库存紧张';
  }

  return undefined;
}

function buildListItemVoucherInfo(item: OrderListItem): OrderCardData['voucherInfo'] | undefined {
  const category = LIST_ITEM_CATEGORY_MAP[item.category] || item.category;
  const statusText = item.statusText;
  const modes = item.fulfillmentModes || [];

  const hasVoucher = modes.includes('code') ||
    (category === 'general' && statusText === '待使用') ||
    (category === 'scenic' && item.scenicProductType === 'group_voucher' && statusText === '待使用') ||
    (statusText === '待支付' && (category === 'food' || category === 'scenic' || category === 'general'));

  if (!hasVoucher) return undefined;

  return {
    code: '8829 4561 2345',
    number: 'NO.2026063000123456',
    validDate: '2026-06-30 至 2026-12-31',
    notes: [
      '凭券码到店核销使用',
      '不与其他优惠同享',
      '周末节假日通用',
      '每人限购2份',
    ],
  };
}

function buildListItemActions(item: OrderListItem): OrderCardData['actions'] {
  const statusText = item.statusText;
  const category = LIST_ITEM_CATEGORY_MAP[item.category];
  const productType = mapListItemProductType(item);
  const actions: OrderCardData['actions'] = [];
  const modes = item.fulfillmentModes || [];
  const hasCode = modes.includes('code');
  const hasOrder = modes.includes('order');
  const hasDelivery = modes.includes('delivery');

  if (statusText === '待支付') {
    actions.push({ label: '立即支付', type: 'primary' });
    return actions;
  }

  if (statusText === '待使用') {
    if (category === 'food') {
      const hasFulfillmentAction = hasOrder || hasDelivery;

      if (hasCode && hasOrder && hasDelivery) {
        actions.push({ label: '🎫 查看券码', type: 'secondary' });
        actions.push({ label: '立即点单', type: 'secondary' });
        actions.push({ label: '立即配送', type: 'primary' });
      } else if (hasCode && hasOrder) {
        actions.push({ label: '🎫 查看券码', type: 'secondary' });
        actions.push({ label: '立即点单', type: 'primary' });
      } else if (hasCode && hasDelivery) {
        actions.push({ label: '🎫 查看券码', type: 'secondary' });
        actions.push({ label: '立即配送', type: 'primary' });
      } else if (hasOrder && hasDelivery) {
        actions.push({ label: '立即点单', type: 'secondary' });
        actions.push({ label: '立即配送', type: 'primary' });
      } else if (hasCode) {
        actions.push({ label: '⏰ 使用提醒', type: 'secondary' });
        actions.push({ label: '🎫 查看券码', type: 'primary' });
      } else if (hasOrder) {
        actions.push({ label: '⏰ 使用提醒', type: 'secondary' });
        actions.push({ label: '立即点单', type: 'primary' });
      } else if (hasDelivery) {
        actions.push({ label: '⏰ 使用提醒', type: 'secondary' });
        actions.push({ label: '立即配送', type: 'primary' });
      } else {
        actions.push({ label: '⏰ 使用提醒', type: 'secondary' });
        actions.push({ label: '🎫 查看券码', type: 'primary' });
      }
    } else if (category === 'scenic' && productType === 'group_voucher') {
      actions.push({ label: '⏰ 使用提醒', type: 'secondary' });
      actions.push({ label: '🎫 查看券码', type: 'primary' });
    } else if (category === 'general') {
      actions.push({ label: '帮我约', type: 'secondary' });
      actions.push({ label: '🎫 查看券码', type: 'primary' });
    } else {
      actions.push({ label: '🎫 查看券码', type: 'primary' });
    }
    return actions;
  }

  if (statusText === '待预约') {
    actions.push({ label: '立即预约', type: 'primary' });
    return actions;
  }

  if (statusText === '预约确认中' || statusText === '预订确认中') {
    return actions;
  }

  if (statusText === '预约成功' || statusText === '预订成功') {
    if (category === 'hotel') {
      actions.push({ label: '入住指引', type: 'primary' });
      if (productType === 'presale_voucher') {
        actions.push({ label: '帮我改期', type: 'secondary' });
      }
    }
    return actions;
  }

  if (statusText === '待接单' || statusText === '待商家接单' || statusText === '制作中' || statusText === '配送中' || statusText === '待取餐' || statusText === '已取餐') {
    return actions;
  }

  if (statusText === '已送达') {
    return actions;
  }

  if (statusText === '已入住') {
    return actions;
  }

  if (statusText === '已入园') {
    return actions;
  }

  if (statusText === '待出行') {
    return actions;
  }

  if (statusText === '行程中') {
    if (category === 'travel_agency') {
      actions.push({ label: '联系导游', type: 'primary' });
    }
    return actions;
  }

  if (statusText === '交易完成') {
    actions.push({ label: '再来一单', type: 'primary' });
    if (category !== 'food' || !item.fulfillmentModes || item.fulfillmentModes.length === 0) {
      actions.push({ label: '去评价', type: 'secondary' });
    }
    return actions;
  }

  if (statusText === '已完成' || statusText === '已使用') {
    if (category === 'food') {
      actions.push({ label: statusText === '已使用' ? '评价商家' : '评价晒单', type: 'secondary' });
    } else if (category === 'general') {
      actions.push({ label: '评价服务', type: 'secondary' });
    }
    return actions;
  }

  if (statusText === '退款申请中' || statusText === '退款中') {
    return actions;
  }

  if (statusText === '退款成功') {
    return actions;
  }

  if (statusText === '退款失败') {
    if (category === 'scenic' && productType === 'calendar_ticket') {
      actions.push({ label: '联系客服', type: 'primary' });
    }
    return actions;
  }

  if (statusText === '已取消' || statusText === '订单取消') {
    return actions;
  }

  return actions;
}

function buildListItemSuggestions(item: OrderListItem): string[] {
  const statusText = item.statusText;
  const category = LIST_ITEM_CATEGORY_MAP[item.category];
  const productType = mapListItemProductType(item);
  const suggestions: string[] = [];

  if (statusText === '待支付') {
    suggestions.push('随时退吗？');
    suggestions.push('包含什么？');
    suggestions.push('门店在哪？');
    return suggestions;
  }

  if (statusText === '待使用') {
    if (category === 'food') {
      suggestions.push('怎么用券');
      suggestions.push('有效期到什么时候');
      suggestions.push('可以退吗');
    } else if (category === 'general') {
      suggestions.push('可以带零食进去吗？');
      suggestions.push('周末可以用吗？');
      suggestions.push('怎么预约？');
    } else if (category === 'scenic' && productType === 'group_voucher') {
      suggestions.push('这个券怎么用');
      suggestions.push('有效期到什么时候');
      suggestions.push('可以退吗');
    } else {
      suggestions.push('怎么使用？');
      suggestions.push('可以退款吗？');
      suggestions.push('有效期多久？');
    }
    return suggestions;
  }

  if (statusText === '待预约') {
    if (category === 'hotel') {
      suggestions.push('未预约随时退');
      suggestions.push('入住政策是什么');
      suggestions.push('商品包含什么');
    } else if (category === 'scenic') {
      suggestions.push('未预约随时退');
      suggestions.push('有效期多久');
      suggestions.push('入园规则是什么');
    } else if (category === 'travel_agency') {
      suggestions.push('未约可退');
      suggestions.push('有效期多久');
      suggestions.push('费用包含什么');
    } else {
      suggestions.push('怎么预约？');
      suggestions.push('可以退款吗？');
      suggestions.push('有效期多久？');
    }
    return suggestions;
  }

  if (statusText === '预约确认中' || statusText === '预订确认中') {
    suggestions.push('多久能确认');
    suggestions.push('可以改期吗');
    suggestions.push('退订政策是什么');
    return suggestions;
  }

  if (statusText === '预约成功' || statusText === '预订成功') {
    if (category === 'hotel') {
      suggestions.push('酒店电话是多少');
      suggestions.push('可以延迟退房吗');
      suggestions.push('有接机服务吗');
    } else if (category === 'scenic') {
      suggestions.push('一站式游玩攻略');
      suggestions.push('有什么必玩项目');
      suggestions.push('可以带食物进去吗');
      suggestions.push('停车方便吗');
    } else if (category === 'travel_agency') {
      suggestions.push('查看完整行程');
      suggestions.push('需要带什么');
      suggestions.push('天气怎么样');
      suggestions.push('可以改期吗');
    } else {
      suggestions.push('怎么修改预约？');
      suggestions.push('可以取消吗？');
      suggestions.push('需要带什么？');
    }
    return suggestions;
  }

  if (statusText === '配送中') {
    suggestions.push('还有多久送达？');
    suggestions.push('骑手到哪了？');
    suggestions.push('可以改配送地址吗？');
    return suggestions;
  }

  if (statusText === '待接单' || statusText === '待商家接单') {
    suggestions.push('多久能接单？');
    suggestions.push('可以取消吗？');
    suggestions.push('怎么催单？');
    return suggestions;
  }

  if (statusText === '制作中') {
    suggestions.push('还需要等多久？');
    suggestions.push('帮我催一下');
    suggestions.push('可以取消吗？');
    return suggestions;
  }

  if (statusText === '商家已接单') {
    suggestions.push('多久能送到？');
    suggestions.push('可以取消吗？');
    suggestions.push('帮我催一下');
    return suggestions;
  }

  if (statusText === '商家备餐中') {
    suggestions.push('还需要等多久？');
    suggestions.push('帮我催一下');
    suggestions.push('可以取消吗？');
    return suggestions;
  }

  if (statusText === '待骑手取餐') {
    suggestions.push('骑手到哪了？');
    suggestions.push('还有多久到？');
    suggestions.push('可以改地址吗？');
    return suggestions;
  }

  if (statusText === '待取餐') {
    suggestions.push('门店在哪？');
    suggestions.push('可以改配送吗？');
    suggestions.push('过期能退吗？');
    return suggestions;
  }

  if (statusText === '已取餐') {
    suggestions.push('餐品有问题怎么办');
    suggestions.push('怎么开发票');
    suggestions.push('再次购买');
    return suggestions;
  }

  if (statusText === '已送达') {
    suggestions.push('漏送错送怎么办');
    suggestions.push('餐品有问题怎么办');
    suggestions.push('再次购买');
    return suggestions;
  }

  if (statusText === '已核销') {
    suggestions.push('味道怎么样');
    suggestions.push('怎么开发票');
    suggestions.push('再来一单');
    return suggestions;
  }

  if (statusText === '已入住') {
    suggestions.push('可以延迟退房吗');
    suggestions.push('有早餐吗');
    suggestions.push('酒店设施怎么用');
    return suggestions;
  }

  if (statusText === '已入园') {
    suggestions.push('有什么必玩项目');
    suggestions.push('可以带食物进去吗');
    suggestions.push('停车方便吗');
    return suggestions;
  }

  if (statusText === '待出行') {
    suggestions.push('查看完整行程');
    suggestions.push('需要带什么');
    suggestions.push('天气怎么样');
    suggestions.push('接机安排');
    return suggestions;
  }

  if (statusText === '行程中') {
    suggestions.push('附近美食推荐');
    suggestions.push('紧急联系人');
    suggestions.push('天气怎么样');
    return suggestions;
  }

  if (statusText === '交易完成') {
    if (category === 'hotel' || category === 'scenic') {
      suggestions.push('再次预订');
      suggestions.push('怎么开发票');
      suggestions.push('有优惠吗');
      suggestions.push('再来一单');
    } else if (category === 'travel_agency') {
      suggestions.push('怎么开发票');
      suggestions.push('有其他线路吗');
      suggestions.push('再来一单');
    } else {
      suggestions.push('怎么开发票？');
      suggestions.push('有优惠吗？');
      suggestions.push('再来一单');
    }
    return suggestions;
  }

  if (statusText === '已完成' || statusText === '已使用') {
    if (category === 'food') {
      suggestions.push('味道怎么样？');
      suggestions.push('怎么开发票？');
      suggestions.push('再来一单');
    } else if (category === 'general') {
      suggestions.push('体验怎么样');
      suggestions.push('怎么开发票');
      suggestions.push('再来一单');
    } else {
      suggestions.push('怎么开发票？');
      suggestions.push('再来一单');
      suggestions.push('去评价');
    }
    return suggestions;
  }

  if (statusText === '退款申请中' || statusText === '退款中') {
    suggestions.push('多久能到账');
    suggestions.push('可以取消退款吗');
    suggestions.push('退到哪里');
    return suggestions;
  }

  if (statusText === '退款成功') {
    if (category === 'hotel' || category === 'scenic') {
      suggestions.push('再次预订');
      suggestions.push('退到哪里了');
      suggestions.push('多久到账的');
      suggestions.push('可以再订吗');
    } else if (category === 'travel_agency') {
      suggestions.push('退到哪里了');
      suggestions.push('多久到账的');
      suggestions.push('其他路线推荐');
    } else {
      suggestions.push('退到哪里了');
      suggestions.push('多久到账的');
      suggestions.push('再来一单');
    }
    return suggestions;
  }

  if (statusText === '退款失败') {
    suggestions.push('为什么退款失败');
    suggestions.push('可以重新申请吗');
    suggestions.push('怎么联系客服');
    return suggestions;
  }

  if (statusText === '已取消' || statusText === '订单取消') {
    if (category === 'hotel' || category === 'scenic') {
      suggestions.push('再次预订');
      suggestions.push('为什么取消了');
      suggestions.push('可以重新预订吗');
      suggestions.push('类似房型推荐');
    } else if (category === 'travel_agency') {
      suggestions.push('为什么取消了');
      suggestions.push('可以重新下单吗');
      suggestions.push('其他路线推荐');
    } else {
      suggestions.push('为什么取消了');
      suggestions.push('可以重新下单吗');
      suggestions.push('类似推荐');
    }
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

  const mainStatus = inferMainStatusFromText(statusText, category as any);
  const mainStatusLabel = getMainStatusLabel(mainStatus);
  const mainStatusColor = getMainStatusColor(mainStatus);

  let subStatus: string | undefined;
  let subStatusLabel: string | undefined;
  let fulfillmentType: 'self_order' | 'delivery' | 'voucher' | undefined;

  if (category === 'food' && mainStatus === 'redeemed') {
    const inferredSubStatus = inferFoodSubStatusFromText(statusText, item.fulfillmentModes);
    if (inferredSubStatus) {
      subStatus = inferredSubStatus;
      subStatusLabel = getFoodSubStatusLabel(inferredSubStatus);
      fulfillmentType = getFoodSubStatusFulfillmentType(inferredSubStatus);
    } else {
      const inferredFulfillment = inferFulfillmentTypeFromModes(item.fulfillmentModes, statusText);
      if (inferredFulfillment) {
        fulfillmentType = inferredFulfillment;
        if (inferredFulfillment === 'voucher') {
          subStatus = 'voucher_redeemed';
          subStatusLabel = '已核销';
        }
      }
    }
  }

  const tags = buildListItemTags(item);
  const extension = buildListItemExtension(item);
  const actions = buildListItemActions(item);
  const suggestions = buildListItemSuggestions(item);
  const hideStoreLine = buildListItemHideStoreLine(item);
  const urgeReason = buildListItemUrgeReason(item);
  const voucherInfo = buildListItemVoucherInfo(item);
  const redeemTypes = getRedeemTypes(item);

  return {
    id: item.orderId,
    category,
    categoryLabel: CATEGORY_LABEL_MAP[category] || category,
    productType,
    productTypeLabel: PRODUCT_TYPE_LABEL_MAP[productType] || productType,
    redeemTypes,
    fulfillmentType,
    mainStatus,
    mainStatusLabel,
    subStatus,
    subStatusLabel,
    orderStatus,
    orderStatusLabel: statusText,
    productName: item.product,
    price: item.price / 100,
    thumbnail: item.thumbnail,
    tags,
    storeName: item.merchant,
    distance: '',
    statusText: mainStatusLabel,
    statusColor: mainStatusColor,
    hideStoreLine,
    urgeReason,
    extension,
    actions,
    suggestions,
    validDate: item.productRules?.validDate,
    voucherInfo,
  };
}
