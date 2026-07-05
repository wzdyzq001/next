import type { MainOrderStatus, FoodSubStatus, FoodFulfillmentType, MainStatusColor, OrderCategory } from './types';
import {
  FOOD_MAIN_STATUS_LABELS,
  FOOD_MAIN_STATUS_COLORS,
  FOOD_SUB_STATUS_TO_MAIN,
  FOOD_SUB_STATUS_LABELS,
  FOOD_SUB_STATUS_FULFILLMENT,
  STATUS_TEXT_TO_FOOD_SUB_STATUS,
  STATUS_TEXT_WITH_DELIVERY_TO_SUB_STATUS,
  STATUS_TEXT_WITH_SELF_TO_SUB_STATUS,
} from './foodMapping';

export function getMainStatusLabel(status: MainOrderStatus): string {
  return FOOD_MAIN_STATUS_LABELS[status] || status;
}

export function getMainStatusColor(status: MainOrderStatus): MainStatusColor {
  return FOOD_MAIN_STATUS_COLORS[status] || 'gray';
}

export function getFoodSubStatusLabel(subStatus: FoodSubStatus): string {
  return FOOD_SUB_STATUS_LABELS[subStatus] || subStatus;
}

export function getFoodSubStatusMainStatus(subStatus: FoodSubStatus): MainOrderStatus {
  return FOOD_SUB_STATUS_TO_MAIN[subStatus] || 'redeemed';
}

export function getFoodSubStatusFulfillmentType(subStatus: FoodSubStatus): FoodFulfillmentType {
  return FOOD_SUB_STATUS_FULFILLMENT[subStatus] || 'voucher';
}

export type FoodSubStatusGroup = 'pending' | 'processing' | 'completed' | 'cancelled';

const FOOD_SUB_STATUS_GROUPS: Record<FoodSubStatus, FoodSubStatusGroup> = {
  self_01_pending_accept: 'pending',
  self_02_accepted: 'processing',
  self_03_preparing: 'processing',
  self_04_waiting_pickup: 'processing',
  self_05_picked_up: 'completed',
  delivery_01_pending_accept: 'pending',
  delivery_02_accepted: 'processing',
  delivery_03_preparing: 'processing',
  delivery_04_waiting_rider: 'processing',
  delivery_05_delivering: 'processing',
  delivery_06_delivered: 'completed',
  voucher_redeemed: 'completed',
};

export function getFoodSubStatusGroup(subStatus: FoodSubStatus): FoodSubStatusGroup {
  return FOOD_SUB_STATUS_GROUPS[subStatus] || 'processing';
}

const FULFILLMENT_TYPE_LABELS: Record<FoodFulfillmentType, string> = {
  self_order: '自提',
  delivery: '配送',
  voucher: '券码',
};

export function getFulfillmentTypeLabel(type: FoodFulfillmentType): string {
  return FULFILLMENT_TYPE_LABELS[type] || type;
}

export function isFoodSubStatus(status: string): status is FoodSubStatus {
  return status in FOOD_SUB_STATUS_TO_MAIN;
}

export function isRedeemedSubStatus(status: string): boolean {
  return isFoodSubStatus(status) && FOOD_SUB_STATUS_TO_MAIN[status] === 'redeemed';
}

export function inferFoodSubStatusFromText(
  statusText: string,
  fulfillmentModes?: Array<'code' | 'order' | 'delivery'>
): FoodSubStatus | null {
  const hasDelivery = fulfillmentModes?.includes('delivery');
  const hasOrder = fulfillmentModes?.includes('order');

  if (hasDelivery && !hasOrder) {
    const subStatus = STATUS_TEXT_WITH_DELIVERY_TO_SUB_STATUS[statusText];
    if (subStatus) return subStatus;
  }

  if (hasOrder && !hasDelivery) {
    const subStatus = STATUS_TEXT_WITH_SELF_TO_SUB_STATUS[statusText];
    if (subStatus) return subStatus;
  }

  const subStatus = STATUS_TEXT_TO_FOOD_SUB_STATUS[statusText];
  if (subStatus) return subStatus;

  return null;
}

export function inferFoodMainStatusFromText(
  statusText: string,
  category?: OrderCategory
): MainOrderStatus {
  if (category && category !== 'food') {
    return inferNonFoodMainStatusFromText(statusText);
  }

  if (statusText === '待支付') return 'pending_pay';
  if (statusText === '待使用') return 'unused';
  if (statusText === '订单取消' || statusText === '已取消') return 'cancelled';
  if (statusText === '交易完成' || statusText === '已完成' || statusText === '已使用' || statusText === '已结束') return 'redeemed';
  if (statusText === '退款申请中' || statusText === '退款中') return 'refunding';
  if (statusText === '退款成功') return 'refund_success';
  if (statusText === '退款失败') return 'refund_fail';

  const subStatus = inferFoodSubStatusFromText(statusText);
  if (subStatus) {
    return getFoodSubStatusMainStatus(subStatus);
  }

  return 'unused';
}

export function inferNonFoodMainStatusFromText(statusText: string): MainOrderStatus {
  if (statusText === '待支付') return 'pending_pay';
  if (['待使用', '待预约', '预约确认中', '预约成功', '预订确认中', '预订成功', '待出行'].includes(statusText)) return 'unused';
  if (statusText === '订单取消' || statusText === '已取消' || statusText === '预约已取消') return 'cancelled';
  if (['交易完成', '已完成', '已使用', '已结束', '已入住', '已入园', '行程中', '已核销'].includes(statusText)) return 'redeemed';
  if (statusText === '退款申请中' || statusText === '退款中' || statusText === '退卡中') return 'refunding';
  if (statusText === '退款成功') return 'refund_success';
  if (statusText === '退款失败') return 'refund_fail';
  return 'unused';
}

export function inferMainStatusFromText(
  statusText: string,
  category?: OrderCategory
): MainOrderStatus {
  if (category === 'food') {
    return inferFoodMainStatusFromText(statusText, category);
  }
  return inferNonFoodMainStatusFromText(statusText);
}

export function inferFulfillmentTypeFromModes(
  modes?: Array<'code' | 'order' | 'delivery'>,
  statusText?: string
): FoodFulfillmentType | null {
  if (!modes || modes.length === 0) return null;

  if (modes.includes('delivery')) return 'delivery';
  if (modes.includes('order')) return 'self_order';
  if (modes.includes('code')) return 'voucher';

  return null;
}
