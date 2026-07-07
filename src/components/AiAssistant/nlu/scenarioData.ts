import type { OrderCardData } from '../OrderCard/orderCardTypes';
import type { ReservationInfoCardData } from '../ReservationInfoCard';
import type { RedeemReminder } from '../../../types';
import type { FeatureCardData } from '../FeatureCard/types';

export const MOCK_ORDERS: Record<string, OrderCardData> = {};

function registerOrder(order: OrderCardData) {
  MOCK_ORDERS[order.id] = order;
  return order;
}

export const ORDER_FOOD_UNUSED_VOUCHER = registerOrder({
  id: 'food-unused-voucher',
  category: 'food',
  categoryLabel: '餐饮',
  productType: 'group_voucher',
  productTypeLabel: '团购券',
  redeemMethod: 'voucher',
  redeemMethodLabel: '到店用券',
  redeemTypes: ['voucher'],
  orderStatus: 'unused',
  orderStatusLabel: '待使用',
  productName: '海底捞火锅 2-3人餐 团购券',
  price: 288,
  thumbnail: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200&h=200&fit=crop',
  tags: ['人气爆款', '周末通用'],
  storeName: '海底捞火锅(陆家嘴店)',
  distance: '1.2km',
  statusText: '待使用',
  statusColor: '#f59e0b',
  validDate: '有效期至 2026-08-31',
  actions: [
    { label: '立即使用', type: 'primary' },
    { label: '查看券码', type: 'secondary' },
  ],
  suggestions: ['提前预约免排队', '订单使用提醒'],
});

export const ORDER_FOOD_UNUSED_SELFORDER = registerOrder({
  id: 'food-unused-selforder',
  category: 'food',
  categoryLabel: '餐饮',
  productType: 'group_voucher',
  productTypeLabel: '团购券',
  redeemMethod: 'self_order',
  redeemMethodLabel: '点单核销',
  redeemTypes: ['voucher', 'order'],
  orderStatus: 'unused',
  orderStatusLabel: '待使用',
  productName: '喜茶 多肉葡萄 大杯',
  price: 28,
  thumbnail: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=200&h=200&fit=crop',
  tags: ['免排队', '可预约'],
  storeName: '喜茶(人民广场店)',
  distance: '0.8km',
  statusText: '待使用',
  statusColor: '#f59e0b',
  validDate: '有效期至 2026-07-31',
  actions: [
    { label: '立即点单', type: 'primary' },
    { label: '查看券码', type: 'secondary' },
  ],
  suggestions: ['帮我约', '订单使用提醒'],
});

export const ORDER_FOOD_UNUSED_DELIVERY = registerOrder({
  id: 'food-unused-delivery',
  category: 'food',
  categoryLabel: '餐饮',
  productType: 'group_voucher',
  productTypeLabel: '团购券',
  redeemMethod: 'delivery',
  redeemMethodLabel: '外卖配送',
  redeemTypes: ['delivery'],
  orderStatus: 'unused',
  orderStatusLabel: '待使用',
  productName: '肯德基 全家桶套餐',
  price: 128,
  thumbnail: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=200&h=200&fit=crop',
  tags: ['热卖', '支持配送'],
  storeName: '肯德基(陆家嘴店)',
  distance: '1.5km',
  statusText: '待使用',
  statusColor: '#f59e0b',
  validDate: '有效期至 2026-08-15',
  actions: [
    { label: '立即配送', type: 'primary' },
    { label: '查看券码', type: 'secondary' },
  ],
  suggestions: ['预约配送', '订单使用提醒'],
});

export const ORDER_FOOD_PREPARING = registerOrder({
  id: 'food-preparing',
  category: 'food',
  categoryLabel: '餐饮',
  productType: 'group_voucher',
  productTypeLabel: '团购券',
  redeemMethod: 'self_order',
  redeemMethodLabel: '点单核销',
  orderStatus: 'preparing',
  orderStatusLabel: '备餐中',
  productName: '喜茶 多肉葡萄 大杯',
  price: 28,
  thumbnail: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=200&h=200&fit=crop',
  tags: ['已下单'],
  storeName: '喜茶(人民广场店)',
  distance: '0.8km',
  statusText: '备餐中 · 约15分钟',
  statusColor: '#f59e0b',
  extension: {
    type: 'pickup_completed',
    title: '取餐信息',
    pickupCode: 'A886',
    hasPickupCode: true,
    pickupTime: '备餐中 · 约15分钟',
    estimatedTime: '约15分钟',
    info: [
      { label: '门店', value: '喜茶(人民广场店)' },
    ],
    steps: [
      { label: '下单成功', state: 'done', time: '14:20' },
      { label: '商家已接单', state: 'done', time: '14:21' },
      { label: '制作中', state: 'active', time: '14:25' },
      { label: '待取餐', state: 'pending' },
      { label: '已取餐', state: 'pending' },
    ],
  },
  actions: [],
  suggestions: [],
});

export const ORDER_FOOD_PREPARING_2 = registerOrder({
  id: 'food-preparing-2',
  category: 'food',
  categoryLabel: '餐饮',
  productType: 'group_voucher',
  productTypeLabel: '团购券',
  redeemMethod: 'self_order',
  redeemMethodLabel: '点单核销',
  orderStatus: 'preparing',
  orderStatusLabel: '备餐中',
  productName: '星巴克 拿铁 大杯',
  price: 38,
  thumbnail: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&h=200&fit=crop',
  tags: ['已下单'],
  storeName: '星巴克(南京西路店)',
  distance: '1.5km',
  statusText: '备餐中 · 约8分钟',
  statusColor: '#f59e0b',
  extension: {
    type: 'pickup_completed',
    title: '取餐信息',
    pickupCode: 'B233',
    hasPickupCode: true,
    pickupTime: '备餐中 · 约8分钟',
    estimatedTime: '约8分钟',
    info: [
      { label: '门店', value: '星巴克(南京西路店)' },
    ],
    steps: [
      { label: '下单成功', state: 'done', time: '14:30' },
      { label: '商家已接单', state: 'done', time: '14:31' },
      { label: '制作中', state: 'active', time: '14:35' },
      { label: '待取餐', state: 'pending' },
      { label: '已取餐', state: 'pending' },
    ],
  },
  actions: [],
  suggestions: [],
});

export const ORDER_FOOD_WAITING_PICKUP = registerOrder({
  id: 'food-waiting-pickup',
  category: 'food',
  categoryLabel: '餐饮',
  productType: 'group_voucher',
  productTypeLabel: '团购券',
  redeemMethod: 'self_order',
  redeemMethodLabel: '点单核销',
  orderStatus: 'waiting_pickup',
  orderStatusLabel: '待取餐',
  productName: '麦当劳 麦辣鸡腿堡套餐',
  price: 39.9,
  thumbnail: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop',
  tags: ['已下单'],
  storeName: '麦当劳(徐家汇店)',
  distance: '1.8km',
  statusText: '待取餐',
  statusColor: '#10b981',
  extension: {
    type: 'pickup_completed',
    title: '取餐信息',
    summary: '已完成制作请尽快取餐',
    pickupCode: 'C101',
    pickupTime: '待取餐',
    info: [
      { label: '门店', value: '麦当劳(徐家汇店)' },
    ],
    steps: [
      { label: '下单成功', state: 'done', time: '14:10' },
      { label: '商家已接单', state: 'done', time: '14:11' },
      { label: '制作中', state: 'done', time: '14:20' },
      { label: '待取餐', state: 'active', time: '请取餐' },
      { label: '已取餐', state: 'pending' },
    ],
  },
  actions: [],
  suggestions: [],
});

export const ORDER_FOOD_DELIVERY_PENDING_ACCEPT = registerOrder({
  id: 'food-delivery-pending-accept',
  category: 'food',
  categoryLabel: '餐饮',
  productType: 'group_voucher',
  productTypeLabel: '团购券',
  redeemMethod: 'delivery',
  redeemMethodLabel: '外卖配送',
  orderStatus: 'pending_accept',
  orderStatusLabel: '待商家接单',
  productName: '肯德基 全家桶套餐',
  price: 128,
  thumbnail: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=200&h=200&fit=crop',
  tags: ['热卖'],
  storeName: '肯德基(陆家嘴店)',
  distance: '1.5km',
  statusText: '待商家接单',
  statusColor: '#f59e0b',
  extension: {
    type: 'progress',
    title: '配送进度',
    summary: '等待商家接单',
    estimatedTime: '预计2分钟内接单',
    steps: [
      { label: '下单成功', state: 'done', time: '15:00' },
      { label: '商家已接单', state: 'active', time: '确认中' },
      { label: '备餐中', state: 'pending' },
      { label: '配送中', state: 'pending' },
      { label: '已送达', state: 'pending' },
    ],
  },
  actions: [
    { label: '联系商家', type: 'primary' },
    { label: '查看详情', type: 'secondary' },
  ],
  suggestions: [],
});

export const ORDER_FOOD_DELIVERY_PREPARING = registerOrder({
  id: 'food-delivery-preparing',
  category: 'food',
  categoryLabel: '餐饮',
  productType: 'group_voucher',
  productTypeLabel: '团购券',
  redeemMethod: 'delivery',
  redeemMethodLabel: '外卖配送',
  orderStatus: 'preparing',
  orderStatusLabel: '备餐中',
  productName: '肯德基 全家桶套餐',
  price: 128,
  thumbnail: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=200&h=200&fit=crop',
  tags: ['热卖'],
  storeName: '肯德基(陆家嘴店)',
  distance: '1.5km',
  statusText: '备餐中 · 约15分钟出餐',
  statusColor: '#f59e0b',
  extension: {
    type: 'progress',
    title: '配送进度',
    summary: '商家正在备餐',
    estimatedTime: '预计 15:40 送达',
    steps: [
      { label: '下单成功', state: 'done', time: '15:00' },
      { label: '商家已接单', state: 'done', time: '15:02' },
      { label: '备餐中', state: 'active', time: '制作中' },
      { label: '配送中', state: 'pending' },
      { label: '已送达', state: 'pending' },
    ],
    info: [
      { label: '预计出餐时间', value: '15:15' },
    ],
  },
  actions: [
    { label: '联系商家', type: 'primary' },
    { label: '查看详情', type: 'secondary' },
  ],
  suggestions: [],
});

export const ORDER_FOOD_DELIVERY_WAITING_RIDER = registerOrder({
  id: 'food-delivery-waiting-rider',
  category: 'food',
  categoryLabel: '餐饮',
  productType: 'group_voucher',
  productTypeLabel: '团购券',
  redeemMethod: 'delivery',
  redeemMethodLabel: '外卖配送',
  orderStatus: 'waiting_pickup',
  orderStatusLabel: '待骑手取餐',
  productName: '肯德基 全家桶套餐',
  price: 128,
  thumbnail: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=200&h=200&fit=crop',
  tags: ['热卖'],
  storeName: '肯德基(陆家嘴店)',
  distance: '1.5km',
  statusText: '待骑手取餐',
  statusColor: '#3b82f6',
  extension: {
    type: 'progress',
    title: '配送进度',
    summary: '骑手即将到店取餐',
    estimatedTime: '预计 15:40 送达',
    steps: [
      { label: '下单成功', state: 'done', time: '15:00' },
      { label: '商家已接单', state: 'done', time: '15:02' },
      { label: '备餐中', state: 'done', time: '15:15' },
      { label: '配送中', state: 'active', time: '待取餐' },
      { label: '已送达', state: 'pending' },
    ],
    info: [
      { label: '骑手状态', value: '等待骑手接单' },
    ],
  },
  actions: [
    { label: '联系商家', type: 'primary' },
    { label: '查看详情', type: 'secondary' },
  ],
  suggestions: [],
});

export const ORDER_FOOD_DELIVERING = registerOrder({
  id: 'food-delivering',
  category: 'food',
  categoryLabel: '餐饮',
  productType: 'group_voucher',
  productTypeLabel: '团购券',
  redeemMethod: 'delivery',
  redeemMethodLabel: '外卖配送',
  orderStatus: 'delivering',
  orderStatusLabel: '配送中',
  productName: '必胜客 超级至尊披萨套餐',
  price: 99,
  thumbnail: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop',
  tags: ['热卖'],
  storeName: '必胜客(五角场店)',
  distance: '2.3km',
  statusText: '配送中 · 约20分钟',
  statusColor: '#3b82f6',
  extension: {
    type: 'progress',
    title: '配送进度',
    summary: '骑手正在配送中',
    estimatedTime: '预计 15:20 送达',
    steps: [
      { label: '下单成功', state: 'done', time: '14:50' },
      { label: '商家已接单', state: 'done', time: '14:52' },
      { label: '备餐中', state: 'done', time: '15:00' },
      { label: '配送中', state: 'done', time: '15:05' },
      { label: '已送达', state: 'active', time: '距您1.2km' },
    ],
    riderInfo: {
      name: '张师傅',
      phone: '138****8888',
    },
  },
  actions: [
    { label: '联系骑手', type: 'primary' },
    { label: '查看详情', type: 'secondary' },
  ],
  suggestions: [],
});

export const ORDER_FOOD_DELIVERING_2 = registerOrder({
  id: 'food-delivering-2',
  category: 'food',
  categoryLabel: '餐饮',
  productType: 'group_voucher',
  productTypeLabel: '团购券',
  redeemMethod: 'delivery',
  redeemMethodLabel: '外卖配送',
  orderStatus: 'delivering',
  orderStatusLabel: '配送中',
  productName: '麦当劳 麦辣鸡腿堡套餐',
  price: 39.9,
  thumbnail: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop',
  tags: ['热卖'],
  storeName: '麦当劳(徐家汇店)',
  distance: '1.8km',
  statusText: '配送中 · 约15分钟',
  statusColor: '#3b82f6',
  extension: {
    type: 'progress',
    title: '配送进度',
    summary: '骑手正在配送中',
    estimatedTime: '预计 15:30 送达',
    steps: [
      { label: '下单成功', state: 'done', time: '14:55' },
      { label: '商家已接单', state: 'done', time: '14:57' },
      { label: '备餐中', state: 'done', time: '15:05' },
      { label: '配送中', state: 'done', time: '15:10' },
      { label: '已送达', state: 'active', time: '距您0.8km' },
    ],
    riderInfo: {
      name: '李师傅',
      phone: '139****6666',
    },
  },
  actions: [
    { label: '联系骑手', type: 'primary' },
    { label: '查看详情', type: 'secondary' },
  ],
  suggestions: [],
});

export const ORDER_FOOD_COMPLETED_DELIVERY = registerOrder({
  id: 'food-completed-delivery',
  category: 'food',
  categoryLabel: '餐饮',
  productType: 'group_voucher',
  productTypeLabel: '团购券',
  redeemMethod: 'delivery',
  redeemMethodLabel: '外卖配送',
  orderStatus: 'completed',
  orderStatusLabel: '已完成',
  productName: '必胜客 超级至尊披萨套餐',
  price: 99,
  thumbnail: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop',
  tags: ['已完成'],
  storeName: '必胜客(五角场店)',
  distance: '2.3km',
  statusText: '已送达 · 今日 15:18',
  statusColor: '#10b981',
  extension: {
    type: 'delivery_completed',
    title: '配送信息',
    summary: '已送达，祝您用餐愉快',
    steps: [
      { label: '下单成功', state: 'done', time: '14:50' },
      { label: '商家已接单', state: 'done', time: '14:52' },
      { label: '备餐中', state: 'done', time: '15:00' },
      { label: '配送中', state: 'done', time: '15:05' },
      { label: '已送达', state: 'done', time: '15:18' },
    ],
    info: [
      { label: '送达时间', value: '15:18' },
      { label: '配送骑手', value: '张师傅' },
    ],
  },
  actions: [
    { label: '再来一单', type: 'primary' },
    { label: '去评价', type: 'secondary' },
  ],
  suggestions: [],
});

export const ORDER_FOOD_COMPLETED_VOUCHER = registerOrder({
  id: 'food-completed-voucher',
  category: 'food',
  categoryLabel: '餐饮',
  productType: 'group_voucher',
  productTypeLabel: '团购券',
  redeemMethod: 'voucher',
  redeemMethodLabel: '到店用券',
  orderStatus: 'completed',
  orderStatusLabel: '已完成',
  productName: '海底捞火锅 2-3人餐 团购券',
  price: 288,
  thumbnail: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200&h=200&fit=crop',
  tags: ['已完成'],
  storeName: '海底捞火锅(陆家嘴店)',
  distance: '1.2km',
  statusText: '已核销 · 昨日 18:30',
  statusColor: '#10b981',
  actions: [
    { label: '再来一单', type: 'primary' },
    { label: '去评价', type: 'secondary' },
  ],
  suggestions: [],
});

export const ORDER_FOOD_COMPLETED_OFFCHANNEL = registerOrder({
  id: 'food-completed-offchannel',
  category: 'food',
  categoryLabel: '餐饮',
  productType: 'group_voucher',
  productTypeLabel: '团购券',
  redeemMethod: 'voucher',
  redeemMethodLabel: '到店用券',
  orderStatus: 'completed',
  orderStatusLabel: '已完成',
  productName: '西贝莜面村 双人餐 团购券',
  price: 168,
  thumbnail: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop',
  tags: ['已完成'],
  storeName: '西贝莜面村(五角场店)',
  distance: '2.1km',
  statusText: '已核销 · 3天前',
  statusColor: '#10b981',
  actions: [
    { label: '再来一单', type: 'primary' },
    { label: '去评价', type: 'secondary' },
  ],
  suggestions: [],
});

export const ORDER_FOOD_COMPLETED_SELFORDER = registerOrder({
  id: 'food-completed-selforder',
  category: 'food',
  categoryLabel: '餐饮',
  productType: 'group_voucher',
  productTypeLabel: '团购券',
  redeemMethod: 'self_order',
  redeemMethodLabel: '点单核销',
  orderStatus: 'completed',
  orderStatusLabel: '已完成',
  productName: '喜茶 多肉葡萄 大杯',
  price: 28,
  thumbnail: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=200&h=200&fit=crop',
  tags: ['已完成'],
  storeName: '喜茶(人民广场店)',
  distance: '0.8km',
  statusText: '已完成 · 今日 14:32 取餐',
  statusColor: '#10b981',
  extension: {
    type: 'pickup_completed',
    title: '取餐信息',
    summary: '已取餐，祝用餐愉快',
    pickupCode: 'A886',
    pickupTime: '已取餐',
    hasPickupCode: true,
    channel: 'self_order',
    info: [
      { label: '取餐时间', value: '14:32' },
    ],
    steps: [
      { label: '下单成功', state: 'done', time: '14:20' },
      { label: '商家已接单', state: 'done', time: '14:21' },
      { label: '制作中', state: 'done', time: '14:25' },
      { label: '待取餐', state: 'done', time: '14:30' },
      { label: '已取餐', state: 'done', time: '14:32' },
    ],
  },
  actions: [
    { label: '再来一单', type: 'primary' },
    { label: '去评价', type: 'secondary' },
  ],
  suggestions: [],
});

export const ORDER_FOOD_CANCELLED = registerOrder({
  id: 'food-cancelled',
  category: 'food',
  categoryLabel: '餐饮',
  productType: 'group_voucher',
  productTypeLabel: '团购券',
  redeemMethod: 'delivery',
  redeemMethodLabel: '外卖配送',
  orderStatus: 'cancelled',
  orderStatusLabel: '已取消',
  productName: '海底捞火锅 2-3人餐 团购券',
  price: 288,
  thumbnail: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200&h=200&fit=crop',
  tags: ['已取消'],
  storeName: '海底捞火锅(陆家嘴店)',
  distance: '1.2km',
  statusText: '已取消',
  statusColor: '#86909c',
  actions: [
    { label: '再来一单', type: 'primary' },
    { label: '查看详情', type: 'secondary' },
  ],
  suggestions: [],
});

export const ORDER_FOOD_REFUND_SUCCESS = registerOrder({
  id: 'food-refund-success',
  category: 'food',
  categoryLabel: '餐饮',
  productType: 'group_voucher',
  productTypeLabel: '团购券',
  redeemMethod: 'delivery',
  redeemMethodLabel: '外卖配送',
  orderStatus: 'refund_success',
  orderStatusLabel: '退款成功',
  productName: '必胜客 超级至尊披萨套餐',
  price: 99,
  thumbnail: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop',
  tags: ['退款成功'],
  storeName: '必胜客(五角场店)',
  distance: '2.3km',
  statusText: '退款成功',
  statusColor: '#86909c',
  extension: {
    type: 'refund_success',
    title: '退款信息',
    info: [
      { label: '退款金额', value: '¥99.00' },
      { label: '退款状态', value: '已原路退回' },
    ],
  },
  actions: [
    { label: '再来一单', type: 'primary' },
    { label: '查看详情', type: 'secondary' },
  ],
  suggestions: [],
});

export const ORDER_FOOD_PENDING_ACCEPT = registerOrder({
  id: 'food-pending-accept',
  category: 'food',
  categoryLabel: '餐饮',
  productType: 'group_voucher',
  productTypeLabel: '团购券',
  redeemMethod: 'self_order',
  redeemMethodLabel: '点单核销',
  orderStatus: 'pending_accept',
  orderStatusLabel: '待确认',
  productName: '喜茶 多肉葡萄 大杯',
  price: 28,
  thumbnail: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=200&h=200&fit=crop',
  tags: ['已下单'],
  storeName: '喜茶(人民广场店)',
  distance: '0.8km',
  statusText: '待确认 · 商家确认中',
  statusColor: '#f59e0b',
  extension: {
    type: 'pickup_code',
    title: '取餐码',
    hasPickupCode: false,
    steps: [
      { label: '下单成功', state: 'done', time: '14:20' },
      { label: '商家已接单', state: 'active', time: '确认中' },
      { label: '制作中', state: 'pending' },
      { label: '待取餐', state: 'pending' },
      { label: '已取餐', state: 'pending' },
    ],
  },
  actions: [
    { label: '查看详情', type: 'secondary' },
  ],
  suggestions: [],
});

export const ORDER_HOTEL = registerOrder({
  id: 'hotel-unused',
  category: 'hotel',
  categoryLabel: '酒店',
  productType: 'calendar_room',
  productTypeLabel: '日历房',
  orderStatus: 'unused',
  orderStatusLabel: '待入住',
  productName: '上海外滩华尔道夫酒店 豪华大床房',
  price: 1888,
  thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&h=200&fit=crop',
  tags: ['限时特惠', '含早餐'],
  storeName: '上海外滩华尔道夫酒店',
  distance: '3.5km',
  statusText: '待入住 · 7月10日入住',
  statusColor: '#f59e0b',
  actions: [
    { label: '查看详情', type: 'primary' },
  ],
  suggestions: ['入住指引', '行程规划'],
});

export const MOCK_RESERVATION_PENDING: ReservationInfoCardData = {
  orderId: 'food-unused-selforder',
  reservationNo: 'YY20260701001',
  serviceType: '堂食预约',
  storeName: '海底捞火锅(陆家嘴店)',
  storeAddress: '浦东新区陆家嘴环路1000号',
  businessHours: '10:00-22:00',
  arrivalTime: '2026-07-05 18:30',
  pax: 4,
  phone: '138****8888',
  acceptStatus: 'pending',
  estimatedAcceptTime: '3分钟内',
  acceptDeadlineAt: Date.now() + 5 * 60 * 1000,
};

export const MOCK_RESERVATION_ACCEPTED: ReservationInfoCardData = {
  orderId: 'food-unused-voucher',
  reservationNo: 'YY20260701002',
  serviceType: '堂食预约',
  storeName: '西贝莜面村(五角场店)',
  storeAddress: '杨浦区邯郸路600号',
  businessHours: '11:00-21:30',
  arrivalTime: '2026-07-06 12:00',
  pax: 2,
  phone: '139****6666',
  acceptStatus: 'accepted',
  estimatedAcceptTime: '已确认',
  merchantAcceptAt: Date.now() - 1800 * 1000,
};

export const MOCK_REMINDER: RedeemReminder = {
  id: 'rem-001',
  orderId: 'food-unused-voucher',
  remindAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  createdAt: Date.now() - 3600 * 1000,
  status: 'active',
};

export const MOCK_REMINDER_FEATURE_CARD: FeatureCardData = {
  type: 'redeem_reminder',
  title: '设置使用提醒',
  redeemReminder: {
    productName: '海底捞火锅 2-3人餐 团购券',
    validDate: '2026-08-31',
  },
};

export const MOCK_RESERVATION_FEATURE_CARD: FeatureCardData = {
  type: 'reservation_form',
  title: '预约服务',
  reservation: {
    storeName: '海底捞火锅(陆家嘴店)',
    businessHours: '10:00-22:00',
  },
};

export function getOrdersByStatus(
  statuses: string[],
  category?: string
): OrderCardData[] {
  return Object.values(MOCK_ORDERS).filter((order) => {
    const statusMatch = statuses.includes(order.orderStatus);
    const categoryMatch = !category || order.category === category;
    return statusMatch && categoryMatch;
  });
}

export function getDeliveryOrders(): OrderCardData[] {
  return getOrdersByStatus(
    ['pending_accept', 'preparing', 'waiting_pickup', 'delivering'],
    'food'
  ).filter((o) => o.redeemMethod === 'delivery');
}

export function getPickupCodeOrders(): OrderCardData[] {
  return getOrdersByStatus(
    ['pending_accept', 'preparing', 'waiting_pickup'],
    'food'
  ).filter((o) => o.redeemMethod === 'self_order');
}
