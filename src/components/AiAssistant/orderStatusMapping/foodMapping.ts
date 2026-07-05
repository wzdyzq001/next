import type { FoodStatusMappingItem, FoodSubStatus, MainOrderStatus, FoodFulfillmentType, MainStatusColor } from './types';

export const FOOD_MAIN_STATUSES: Array<{
  value: MainOrderStatus;
  label: string;
  color: MainStatusColor;
}> = [
  { value: 'pending_pay', label: '待支付', color: 'orange' },
  { value: 'unused', label: '待使用', color: 'orange' },
  { value: 'cancelled', label: '订单取消', color: 'gray' },
  { value: 'redeemed', label: '交易完成', color: 'green' },
  { value: 'refunding', label: '退款申请中', color: 'blue' },
  { value: 'refund_success', label: '退款成功', color: 'gray' },
  { value: 'refund_fail', label: '退款失败', color: 'orange' },
];

export const FOOD_MAIN_STATUS_LABELS: Record<MainOrderStatus, string> = {
  pending_pay: '待支付',
  unused: '待使用',
  cancelled: '订单取消',
  redeemed: '交易完成',
  refunding: '退款申请中',
  refund_success: '退款成功',
  refund_fail: '退款失败',
};

export const FOOD_MAIN_STATUS_COLORS: Record<MainOrderStatus, MainStatusColor> = {
  pending_pay: 'orange',
  unused: 'orange',
  cancelled: 'gray',
  redeemed: 'green',
  refunding: 'blue',
  refund_success: 'gray',
  refund_fail: 'orange',
};

export const FOOD_SUB_STATUSES: Record<FoodFulfillmentType, Array<{ value: FoodSubStatus; label: string }>> = {
  self_order: [
    { value: 'self_01_pending_accept', label: '待商家接单' },
    { value: 'self_02_accepted', label: '商家已接单' },
    { value: 'self_03_preparing', label: '制作中' },
    { value: 'self_04_waiting_pickup', label: '待取餐' },
    { value: 'self_05_picked_up', label: '已取餐' },
  ],
  delivery: [
    { value: 'delivery_01_pending_accept', label: '待商家接单' },
    { value: 'delivery_02_accepted', label: '商家已接单' },
    { value: 'delivery_03_preparing', label: '商家备餐中' },
    { value: 'delivery_04_waiting_rider', label: '待骑手取餐' },
    { value: 'delivery_05_delivering', label: '配送中' },
    { value: 'delivery_06_delivered', label: '已送达' },
  ],
  voucher: [
    { value: 'voucher_redeemed', label: '已核销' },
  ],
};

export const FOOD_STATUS_MAPPING: FoodStatusMappingItem[] = [
  {
    subStatus: 'self_01_pending_accept',
    subStatusLabel: '待商家接单',
    mainStatus: 'redeemed',
    mainStatusLabel: '交易完成',
    fulfillmentType: 'self_order',
    mainStatusColor: 'green',
  },
  {
    subStatus: 'self_02_accepted',
    subStatusLabel: '商家已接单',
    mainStatus: 'redeemed',
    mainStatusLabel: '交易完成',
    fulfillmentType: 'self_order',
    mainStatusColor: 'green',
  },
  {
    subStatus: 'self_03_preparing',
    subStatusLabel: '制作中',
    mainStatus: 'redeemed',
    mainStatusLabel: '交易完成',
    fulfillmentType: 'self_order',
    mainStatusColor: 'green',
  },
  {
    subStatus: 'self_04_waiting_pickup',
    subStatusLabel: '待取餐',
    mainStatus: 'redeemed',
    mainStatusLabel: '交易完成',
    fulfillmentType: 'self_order',
    mainStatusColor: 'green',
  },
  {
    subStatus: 'self_05_picked_up',
    subStatusLabel: '已取餐',
    mainStatus: 'redeemed',
    mainStatusLabel: '交易完成',
    fulfillmentType: 'self_order',
    mainStatusColor: 'green',
  },
  {
    subStatus: 'delivery_01_pending_accept',
    subStatusLabel: '待商家接单',
    mainStatus: 'redeemed',
    mainStatusLabel: '交易完成',
    fulfillmentType: 'delivery',
    mainStatusColor: 'green',
  },
  {
    subStatus: 'delivery_02_accepted',
    subStatusLabel: '商家已接单',
    mainStatus: 'redeemed',
    mainStatusLabel: '交易完成',
    fulfillmentType: 'delivery',
    mainStatusColor: 'green',
  },
  {
    subStatus: 'delivery_03_preparing',
    subStatusLabel: '商家备餐中',
    mainStatus: 'redeemed',
    mainStatusLabel: '交易完成',
    fulfillmentType: 'delivery',
    mainStatusColor: 'green',
  },
  {
    subStatus: 'delivery_04_waiting_rider',
    subStatusLabel: '待骑手取餐',
    mainStatus: 'redeemed',
    mainStatusLabel: '交易完成',
    fulfillmentType: 'delivery',
    mainStatusColor: 'green',
  },
  {
    subStatus: 'delivery_05_delivering',
    subStatusLabel: '配送中',
    mainStatus: 'redeemed',
    mainStatusLabel: '交易完成',
    fulfillmentType: 'delivery',
    mainStatusColor: 'green',
  },
  {
    subStatus: 'delivery_06_delivered',
    subStatusLabel: '已送达',
    mainStatus: 'redeemed',
    mainStatusLabel: '交易完成',
    fulfillmentType: 'delivery',
    mainStatusColor: 'green',
  },
  {
    subStatus: 'voucher_redeemed',
    subStatusLabel: '已核销',
    mainStatus: 'redeemed',
    mainStatusLabel: '交易完成',
    fulfillmentType: 'voucher',
    mainStatusColor: 'green',
  },
];

export const FOOD_SUB_STATUS_TO_MAIN: Record<FoodSubStatus, MainOrderStatus> = {
  self_01_pending_accept: 'redeemed',
  self_02_accepted: 'redeemed',
  self_03_preparing: 'redeemed',
  self_04_waiting_pickup: 'redeemed',
  self_05_picked_up: 'redeemed',
  delivery_01_pending_accept: 'redeemed',
  delivery_02_accepted: 'redeemed',
  delivery_03_preparing: 'redeemed',
  delivery_04_waiting_rider: 'redeemed',
  delivery_05_delivering: 'redeemed',
  delivery_06_delivered: 'redeemed',
  voucher_redeemed: 'redeemed',
};

export const FOOD_SUB_STATUS_LABELS: Record<FoodSubStatus, string> = {
  self_01_pending_accept: '待商家接单',
  self_02_accepted: '商家已接单',
  self_03_preparing: '制作中',
  self_04_waiting_pickup: '待取餐',
  self_05_picked_up: '已取餐',
  delivery_01_pending_accept: '待商家接单',
  delivery_02_accepted: '商家已接单',
  delivery_03_preparing: '商家备餐中',
  delivery_04_waiting_rider: '待骑手取餐',
  delivery_05_delivering: '配送中',
  delivery_06_delivered: '已送达',
  voucher_redeemed: '已核销',
};

export const FOOD_SUB_STATUS_FULFILLMENT: Record<FoodSubStatus, FoodFulfillmentType> = {
  self_01_pending_accept: 'self_order',
  self_02_accepted: 'self_order',
  self_03_preparing: 'self_order',
  self_04_waiting_pickup: 'self_order',
  self_05_picked_up: 'self_order',
  delivery_01_pending_accept: 'delivery',
  delivery_02_accepted: 'delivery',
  delivery_03_preparing: 'delivery',
  delivery_04_waiting_rider: 'delivery',
  delivery_05_delivering: 'delivery',
  delivery_06_delivered: 'delivery',
  voucher_redeemed: 'voucher',
};

export const STATUS_TEXT_TO_FOOD_SUB_STATUS: Record<string, FoodSubStatus> = {
  '待接单': 'self_01_pending_accept',
  '待商家接单': 'self_01_pending_accept',
  '商家已接单': 'self_02_accepted',
  '制作中': 'self_03_preparing',
  '商家备餐中': 'delivery_03_preparing',
  '待取餐': 'self_04_waiting_pickup',
  '已取餐': 'self_05_picked_up',
  '待骑手取餐': 'delivery_04_waiting_rider',
  '配送中': 'delivery_05_delivering',
  '已送达': 'delivery_06_delivered',
  '已核销': 'voucher_redeemed',
};

export const STATUS_TEXT_WITH_DELIVERY_TO_SUB_STATUS: Record<string, FoodSubStatus> = {
  '待接单': 'delivery_01_pending_accept',
  '待商家接单': 'delivery_01_pending_accept',
  '商家已接单': 'delivery_02_accepted',
  '制作中': 'delivery_03_preparing',
  '商家备餐中': 'delivery_03_preparing',
  '待骑手取餐': 'delivery_04_waiting_rider',
  '配送中': 'delivery_05_delivering',
  '已送达': 'delivery_06_delivered',
};

export const STATUS_TEXT_WITH_SELF_TO_SUB_STATUS: Record<string, FoodSubStatus> = {
  '待接单': 'self_01_pending_accept',
  '待商家接单': 'self_01_pending_accept',
  '商家已接单': 'self_02_accepted',
  '制作中': 'self_03_preparing',
  '待取餐': 'self_04_waiting_pickup',
  '已取餐': 'self_05_picked_up',
};
