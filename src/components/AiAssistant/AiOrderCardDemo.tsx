import { useState, useEffect, useRef } from 'react';
import './orderCardDemo.css';
import { ReservationPanel } from './ReservationPanel';
import type { ReservationInfoCardData } from './ReservationInfoCard';
import { RedeemReminderSheet } from './RedeemReminderSheet';
import type { RedeemReminder } from '../../types';
import { VoucherCodeSheet } from './VoucherCodeSheet';

interface DemoOrder {
  id: string;
  category: 'food' | 'hotel' | 'scenic' | 'general' | 'travel_agency';
  categoryLabel: string;
  productType: 'group_voucher' | 'presale_voucher' | 'calendar_room' | 'calendar_ticket';
  productTypeLabel: string;
  redeemMethod?: 'voucher' | 'self_order' | 'delivery';
  redeemMethodLabel?: string;
  redeemTypes?: ('voucher' | 'order' | 'delivery')[];
  orderStatus: 'pending_pay' | 'unused' | 'pending_accept' | 'preparing' | 'delivering' | 'waiting_pickup' | 'picked_up' | 'to_book' | 'booking_confirming' | 'booked' | 'checked_in' | 'entered' | 'pending_travel' | 'in_travel' | 'refunding' | 'refund_success' | 'refund_fail' | 'cancelled' | 'completed';
  orderStatusLabel: string;
  productName: string;
  price: number;
  thumbnail: string;
  tags: string[];
  storeName: string;
  distance: string;
  statusText: string;
  statusColor: string;
  hideStoreLine?: boolean;
  urgeReason?: string;
  extension?: {
    type: 'progress' | 'hotel_stay' | 'refund' | 'payment_countdown' | 'travel_info' | 'pickup_code' | 'delivery_completed' | 'scenic_entry' | 'refund_success';
    title: string;
    summary?: string;
    pickupCode?: string;
    pickupTime?: string;
    hasPickupCode?: boolean;
    channel?: string;
    steps?: { label: string; state: 'done' | 'active' | 'pending'; time?: string }[];
    info?: { label: string; value: string }[];
    estimatedTime?: string;
    hotelInfo?: {
      hotelName: string;
      checkInDate: string;
      checkOutDate: string;
      nights: number;
      statusTags?: { text: string; type?: 'warn' | 'success' | 'default' }[];
    };
    scenicInfo?: {
      scenicName: string;
      visitDate: string;
      entryTime: string;
      statusTags?: { text: string; type?: 'warn' | 'success' | 'default' }[];
    };
  };
  actions: { label: string; type: 'primary' | 'secondary' }[];
  paymentCountdown?: string;
  suggestions: string[];
  voucherInfo?: {
    code: string;
    number: string;
    validDate: string;
    notes: string[];
  };
}

const demoOrders: DemoOrder[] = [
  {
    id: 'food-delivery-delivering',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'delivery',
    redeemMethodLabel: '外卖',
    orderStatus: 'delivering',
    orderStatusLabel: '配送中',
    productName: '巨无霸套餐 中薯 可乐(中) 三人餐',
    price: 88.0,
    thumbnail: '🍔',
    tags: ['随时退', '免预约'],
    storeName: '麦当劳(南山科技园店)',
    distance: '1.2km',
    statusText: '配送中',
    statusColor: 'blue',
    extension: {
      type: 'progress',
      title: '配送进度',
      estimatedTime: '预计15分钟送达',
      steps: [
        { label: '下单成功', state: 'done', time: '11:20' },
        { label: '商家已接单', state: 'done', time: '11:22' },
        { label: '骑手配送中', state: 'active', time: '11:30' },
        { label: '已送达', state: 'pending' },
      ],
    },
    actions: [],
    suggestions: ['还有多久送达？', '骑手到哪了？', '可以改配送地址吗？'],
  },
  {
    id: 'food-voucher-unused',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'voucher',
    redeemMethodLabel: '到店套餐',
    redeemTypes: ['voucher'],
    orderStatus: 'unused',
    orderStatusLabel: '待使用',
    productName: '【仅券码】单人下午茶套餐 咖啡+蛋糕',
    price: 29.9,
    thumbnail: '☕',
    tags: ['仅券码核销', '随时退', '过期退'],
    storeName: '星巴克(万象城店)',
    distance: '0.8km',
    statusText: '待使用',
    statusColor: 'orange',
    actions: [
      { label: '⏰ 使用提醒', type: 'secondary' },
      { label: '🎫 查看券码', type: 'primary' },
    ],
    suggestions: ['这个券怎么用', '有效期到什么时候', '可以退吗'],
    voucherInfo: {
      code: '8829 4561 2345',
      number: 'NO.2026063000123456',
      validDate: '2026-06-30 至 2026-12-31',
      notes: ['凭券码到店核销使用', '不与其他优惠同享', '周末节假日通用', '每人限购2份'],
    },
  },
  {
    id: 'food-voucher-order-unused',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'voucher',
    redeemMethodLabel: '到店套餐',
    redeemTypes: ['voucher', 'order'],
    orderStatus: 'unused',
    orderStatusLabel: '待使用',
    productName: '【券码+点单】双人烤肉套餐 含主食+饮品',
    price: 168.0,
    thumbnail: '🥩',
    tags: ['券码+点单', '随时退'],
    storeName: '西塔老太太烤肉(国贸店)',
    distance: '1.5km',
    statusText: '待使用',
    statusColor: 'orange',
    actions: [
      { label: '⏰ 使用提醒', type: 'secondary' },
      { label: '🎫 查看券码', type: 'secondary' },
      { label: '立即点单', type: 'primary' },
    ],
    suggestions: ['可以到店点单吗', '怎么用券', '可以退吗'],
    voucherInfo: {
      code: '6628 3451 8762',
      number: 'NO.2026063000234567',
      validDate: '2026-06-30 至 2026-12-31',
      notes: ['到店出示券码核销', '支持扫码点单使用', '周末节假日通用'],
    },
  },
  {
    id: 'food-voucher-delivery-unused',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'voucher',
    redeemMethodLabel: '到店套餐',
    redeemTypes: ['voucher', 'delivery'],
    orderStatus: 'unused',
    orderStatusLabel: '待使用',
    productName: '【券码+配送】招牌酸菜鱼套餐 2人份',
    price: 98.0,
    thumbnail: '🐟',
    tags: ['券码+配送', '随时退'],
    storeName: '太二酸菜鱼(三里屯店)',
    distance: '2.3km',
    statusText: '待使用',
    statusColor: 'orange',
    actions: [
      { label: '⏰ 使用提醒', type: 'secondary' },
      { label: '🎫 查看券码', type: 'secondary' },
      { label: '立即配送', type: 'primary' },
    ],
    suggestions: ['可以外卖配送吗', '配送费多少', '多久送到'],
    voucherInfo: {
      code: '5521 6783 4521',
      number: 'NO.2026063000345678',
      validDate: '2026-06-30 至 2026-12-31',
      notes: ['到店出示券码核销', '支持外卖配送使用', '配送范围3公里内'],
    },
  },
  {
    id: 'food-order-delivery-unused',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'voucher',
    redeemMethodLabel: '到店套餐',
    redeemTypes: ['order', 'delivery'],
    orderStatus: 'unused',
    orderStatusLabel: '待使用',
    productName: '【点单+配送】超值汉堡套餐 含薯条可乐',
    price: 39.9,
    thumbnail: '🍔',
    tags: ['点单+配送', '随时退'],
    storeName: '麦当劳(王府井店)',
    distance: '0.5km',
    statusText: '待使用',
    statusColor: 'orange',
    actions: [
      { label: '⏰ 使用提醒', type: 'secondary' },
      { label: '立即点单', type: 'secondary' },
      { label: '立即配送', type: 'primary' },
    ],
    suggestions: ['可以到店取吗', '支持外卖吗', '怎么用'],
    voucherInfo: {
      code: '3345 2187 6543',
      number: 'NO.2026063000456789',
      validDate: '2026-06-30 至 2026-12-31',
      notes: ['支持到店扫码点单', '支持外卖配送', '全天可用'],
    },
  },
  {
    id: 'food-order-only-unused',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'voucher',
    redeemMethodLabel: '到店套餐',
    redeemTypes: ['order'],
    orderStatus: 'unused',
    orderStatusLabel: '待使用',
    productName: '【仅点单】麻辣香锅双人餐 含米饭',
    price: 59.9,
    thumbnail: '🍲',
    tags: ['仅点单', '随时退'],
    storeName: '川成元麻辣香锅(朝阳大悦城店)',
    distance: '3.1km',
    statusText: '待使用',
    statusColor: 'orange',
    actions: [
      { label: '⏰ 使用提醒', type: 'secondary' },
      { label: '立即点单', type: 'primary' },
    ],
    suggestions: ['怎么点单', '可以自取吗', '有效期多久'],
    voucherInfo: {
      code: '2234 5678 9012',
      number: 'NO.2026063000567890',
      validDate: '2026-06-30 至 2026-12-31',
      notes: ['到店扫码点单使用', '不支持外卖配送', '工作日可用'],
    },
  },
  {
    id: 'food-all-unused',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'voucher',
    redeemMethodLabel: '到店套餐',
    redeemTypes: ['voucher', 'order', 'delivery'],
    orderStatus: 'unused',
    orderStatusLabel: '待使用',
    productName: '【全方式】招牌奶茶双人餐 任选2杯',
    price: 29.9,
    thumbnail: '🧋',
    tags: ['券码+点单+配送', '随时退', '过期退'],
    storeName: '喜茶(合生汇店)',
    distance: '1.8km',
    statusText: '待使用',
    statusColor: 'orange',
    actions: [
      { label: '🎫 查看券码', type: 'secondary' },
      { label: '立即点单', type: 'secondary' },
      { label: '立即配送', type: 'primary' },
    ],
    suggestions: ['可以外卖吗', '可以到店取吗', '怎么用最划算'],
    voucherInfo: {
      code: '7788 1234 5678',
      number: 'NO.2026063000678901',
      validDate: '2026-06-30 至 2026-12-31',
      notes: ['支持到店出示券码', '支持扫码点单', '支持外卖配送', '全国门店通用'],
    },
  },
  {
    id: 'food-instore-completed',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'voucher',
    redeemMethodLabel: '到店套餐',
    orderStatus: 'completed',
    orderStatusLabel: '已完成',
    productName: '海底捞火锅 4人套餐 含锅底蘸料',
    price: 288.0,
    thumbnail: '🍲',
    tags: ['随时退'],
    storeName: '海底捞(海岸城店)',
    distance: '2.1km',
    statusText: '已完成',
    statusColor: 'green',
    actions: [
      { label: '评价晒单', type: 'secondary' },
    ],
    suggestions: ['附近还有什么好吃的？', '味道怎么样？', '怎么开发票？'],
  },
  {
    id: 'food-delivery-pending-pay',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'delivery',
    redeemMethodLabel: '外卖',
    orderStatus: 'pending_pay',
    orderStatusLabel: '待支付',
    productName: '肯德基全家桶 超值家庭套餐',
    price: 99.0,
    thumbnail: '🍗',
    tags: ['随时退', '免预约'],
    storeName: '肯德基(华强北店)',
    distance: '1.5km',
    statusText: '待支付',
    statusColor: 'orange',
    extension: {
      type: 'payment_countdown',
      title: '支付倒计时',
      info: [{ label: '剩余时间', value: '29分45秒' }],
    },
    actions: [{ label: '立即支付', type: 'primary' }],
    suggestions: ['随时退吗？', '包含什么？', '门店在哪？'],
  },
  {
    id: 'food-delivery-pending-accept',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'delivery',
    redeemMethodLabel: '外卖',
    orderStatus: 'pending_accept',
    orderStatusLabel: '待接单',
    productName: '喜茶多肉葡萄 大杯 少冰 标准糖',
    price: 29.0,
    thumbnail: '🧋',
    tags: ['免配送费', '极速达'],
    storeName: '喜茶(万象城店)',
    distance: '1.5km',
    statusText: '待接单',
    statusColor: 'orange',
    extension: {
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
    },
    actions: [],
    suggestions: ['多久能接单？', '可以取消吗？', '怎么催单？'],
  },
  {
    id: 'food-delivery-preparing',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'delivery',
    redeemMethodLabel: '外卖',
    orderStatus: 'preparing',
    orderStatusLabel: '制作中',
    productName: '瑞幸生椰拿铁 大杯 热 标准糖',
    price: 19.9,
    thumbnail: '☕',
    tags: ['限时折扣', '免配送费'],
    storeName: '瑞幸咖啡(科技园店)',
    distance: '0.6km',
    statusText: '制作中',
    statusColor: 'blue',
    extension: {
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
    },
    actions: [],
    suggestions: ['还需要等多久？', '帮我催一下', '可以取消吗？'],
  },
  {
    id: 'food-delivery-completed',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'delivery',
    redeemMethodLabel: '外卖',
    orderStatus: 'completed',
    orderStatusLabel: '已完成',
    productName: '麦当劳麦辣鸡腿堡套餐 中薯 可乐',
    price: 39.9,
    thumbnail: '🍔',
    tags: ['满减优惠', '免配送费'],
    storeName: '麦当劳(南山店)',
    distance: '1.2km',
    statusText: '已完成',
    statusColor: 'green',
    extension: {
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
    },
    actions: [],
    suggestions: ['怎么开发票？', '有问题找谁？', '再来一单'],
  },
  {
    id: 'food-pickup-pending-accept',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'self_order',
    redeemMethodLabel: '自提',
    orderStatus: 'pending_accept',
    orderStatusLabel: '待接单',
    productName: '星巴克冰美式 大杯 少冰',
    price: 32.0,
    thumbnail: '☕',
    tags: ['到店取', '免排队'],
    storeName: '星巴克(华润城店)',
    distance: '0.8km',
    statusText: '待接单',
    statusColor: 'orange',
    extension: {
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
    },
    actions: [],
    suggestions: ['多久能接单', '可以取消吗', '怎么催单'],
  },
  {
    id: 'food-pickup-preparing',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'self_order',
    redeemMethodLabel: '自提',
    orderStatus: 'preparing',
    orderStatusLabel: '制作中',
    productName: '星巴克冰美式 大杯 少冰',
    price: 32.0,
    thumbnail: '☕',
    tags: ['到店取', '免排队'],
    storeName: '星巴克(华润城店)',
    distance: '0.8km',
    statusText: '制作中',
    statusColor: 'blue',
    extension: {
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
    },
    actions: [],
    suggestions: ['还需要等多久', '帮我催一下', '可以取消吗'],
  },
  {
    id: 'food-pickup-waiting',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'self_order',
    redeemMethodLabel: '自提',
    orderStatus: 'waiting_pickup',
    orderStatusLabel: '待取餐',
    productName: '星巴克冰美式 大杯 少冰',
    price: 32.0,
    thumbnail: '☕',
    tags: ['到店取', '免排队'],
    storeName: '星巴克(华润城店)',
    distance: '0.8km',
    statusText: '待取餐',
    statusColor: 'blue',
    extension: {
      type: 'pickup_code',
      title: '取餐信息',
      pickupCode: 'A088',
      pickupTime: '约5分钟后可取餐',
      info: [
        { label: '取餐号', value: 'A088' },
        { label: '预计取餐', value: '约5分钟后可取餐' },
      ],
    },
    actions: [],
    suggestions: ['门店在哪？', '可以改配送吗？', '过期能退吗？'],
  },
  {
    id: 'food-pickup-no-code',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'self_order',
    redeemMethodLabel: '自提',
    orderStatus: 'waiting_pickup',
    orderStatusLabel: '待取餐',
    productName: '喜茶多肉葡萄 大杯 少冰 标准糖',
    price: 29.0,
    thumbnail: '🧋',
    tags: ['抖音小程序', '原生核销'],
    storeName: '喜茶(万象城店)',
    distance: '1.5km',
    statusText: '待取餐',
    statusColor: 'blue',
    extension: {
      type: 'pickup_code',
      title: '取餐信息',
      hasPickupCode: false,
      channel: 'douyin',
    },
    actions: [],
    suggestions: ['取餐码在哪', '门店在哪', '可以退款吗'],
  },
  {
    id: 'food-dine-in-preparing',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'voucher',
    redeemMethodLabel: '到店套餐',
    orderStatus: 'preparing',
    orderStatusLabel: '制作中',
    productName: '海底捞番茄锅底双人套餐 含6荤6素',
    price: 268.0,
    thumbnail: '🍲',
    tags: ['堂食', '免预约'],
    storeName: '海底捞(海岸城店)',
    distance: '2.1km',
    statusText: '制作中',
    statusColor: 'blue',
    actions: [],
    suggestions: ['可以加菜吗', '帮我催一下', '有儿童椅吗'],
  },
  {
    id: 'food-dine-in-completed',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'voucher',
    redeemMethodLabel: '到店套餐',
    orderStatus: 'completed',
    orderStatusLabel: '已完成',
    productName: '太二酸菜鱼双人套餐 含米饭饮料',
    price: 158.0,
    thumbnail: '🐟',
    tags: ['堂食', '人气爆款'],
    storeName: '太二酸菜鱼(益田假日店)',
    distance: '3.2km',
    statusText: '已完成',
    statusColor: 'green',
    actions: [
      { label: '评价晒单', type: 'secondary' },
    ],
    suggestions: ['味道怎么样？', '怎么开发票？', '再来一单'],
  },
  {
    id: 'food-voucher-used',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'voucher',
    redeemMethodLabel: '到店套餐',
    orderStatus: 'completed',
    orderStatusLabel: '已使用',
    productName: '探鱼 重庆豆花烤鱼3人套餐',
    price: 198.0,
    thumbnail: '🐠',
    tags: ['随时退', '过期退'],
    storeName: '探鱼(海上世界店)',
    distance: '4.5km',
    statusText: '已使用',
    statusColor: 'green',
    actions: [
      { label: '评价商家', type: 'secondary' },
    ],
    suggestions: ['味道怎么样？', '开发票', '有优惠吗？'],
  },
  {
    id: 'food-voucher-refunding',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'voucher',
    redeemMethodLabel: '到店套餐',
    orderStatus: 'refunding',
    orderStatusLabel: '退款中',
    productName: '必胜客双人披萨套餐',
    price: 128.0,
    thumbnail: '🍕',
    tags: ['随时退'],
    storeName: '必胜客(南山店)',
    distance: '1.8km',
    statusText: '退款中',
    statusColor: 'gray',
    extension: {
      type: 'refund',
      title: '退款进度',
      info: [
        { label: '退款金额', value: '¥128.00' },
        { label: '退款方式', value: '原路退回' },
        { label: '预计到账', value: '1-3个工作日' },
      ],
      steps: [
        { label: '提交申请', state: 'done' },
        { label: '商家审核', state: 'active' },
        { label: '退款到账', state: 'pending' },
      ],
    },
    actions: [],
    suggestions: ['多久能到账？', '可以取消退款吗？', '退到哪里？'],
  },
  {
    id: 'hotel-presale-booked',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'booked',
    orderStatusLabel: '预约成功',
    productName: '【豪华大床房】含双早 免费取消 海景房',
    price: 688.0,
    thumbnail: '🏨',
    tags: ['含双早', '免费取消', '预售券'],
    storeName: '三亚海棠湾君悦酒店',
    distance: '1,234km',
    statusText: '预约成功',
    statusColor: 'green',
    extension: {
      type: 'hotel_stay',
      title: '入住信息',
      hotelInfo: {
        hotelName: '三亚海棠湾君悦酒店',
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
    },
    actions: [
      { label: '入住指引', type: 'primary' },
      { label: '帮我改期', type: 'secondary' },
    ],
    suggestions: ['酒店电话是多少？', '可以延迟退房吗？', '有接机服务吗？'],
  },
  {
    id: 'hotel-presale-to-book',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'to_book',
    orderStatusLabel: '待预约',
    productName: '深圳湾万怡酒店 高级双床房 含早',
    price: 599.0,
    thumbnail: '🛏️',
    tags: ['含双早', '预售券'],
    storeName: '深圳湾万怡酒店',
    distance: '5.2km',
    statusText: '待预约',
    statusColor: 'orange',
    urgeReason: '库存紧张',
    actions: [
      { label: '立即预约', type: 'primary' },
    ],
    suggestions: ['周末可以用吗？', '怎么预约？', '可以退吗？'],
  },
  {
    id: 'general-voucher-unused',
    category: 'general',
    categoryLabel: '综合',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    orderStatus: 'unused',
    orderStatusLabel: '待使用',
    productName: '【全天场】2小时小包欢唱套餐 含小吃饮料',
    price: 68.0,
    thumbnail: '🎤',
    tags: ['随时退', '免预约'],
    storeName: '纯K(车公庙店)',
    distance: '3.5km',
    statusText: '待使用',
    statusColor: 'orange',
    actions: [
      { label: '🎫 查看券码', type: 'primary' },
      { label: '提前预约免排队', type: 'secondary' },
    ],
    suggestions: ['可以带零食进去吗？', '周末可以用吗？', '怎么预约？'],
    voucherInfo: {
      code: '6688 2341 5678',
      number: 'NO.2026063000987654',
      validDate: '2026-06-30 至 2026-09-30',
      notes: ['凭券码到店核销使用', '请提前1天电话预约', '节假日需补差价', '不与其他优惠同享'],
    },
  },
  {
    id: 'general-instore-completed',
    category: 'general',
    categoryLabel: '综合',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    orderStatus: 'completed',
    orderStatusLabel: '已完成',
    productName: '泰式古法按摩 60分钟 全身精油SPA',
    price: 198.0,
    thumbnail: '💆',
    tags: ['随时退'],
    storeName: '泰美好SPA(万象城店)',
    distance: '2.8km',
    statusText: '已完成',
    statusColor: 'green',
    actions: [
      { label: '评价服务', type: 'secondary' },
    ],
    suggestions: ['附近还有什么推荐？', '办卡有优惠吗？', '开发票'],
  },
  {
    id: 'general-voucher-refunding',
    category: 'general',
    categoryLabel: '综合',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    orderStatus: 'refunding',
    orderStatusLabel: '退款中',
    productName: '自然语言演示桌游馆 四人桌游畅玩套餐',
    price: 128.0,
    thumbnail: '🎲',
    tags: ['随时退'],
    storeName: '自然语言演示桌游馆',
    distance: '4.2km',
    statusText: '退款中',
    statusColor: 'gray',
    extension: {
      type: 'refund',
      title: '退款进度',
      info: [
        { label: '退款金额', value: '¥128.00' },
        { label: '退款方式', value: '原路退回' },
        { label: '预计到账', value: '1-3个工作日' },
      ],
      steps: [
        { label: '提交申请', state: 'done' },
        { label: '商家审核', state: 'active' },
        { label: '退款到账', state: 'pending' },
      ],
    },
    actions: [],
    suggestions: ['多久能到账？', '可以取消退款吗？', '退到哪里？'],
  },
  // ========== 酒店行业 ==========
  {
    id: 'hotel-presale-pending-pay',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'pending_pay',
    orderStatusLabel: '待支付',
    productName: '深圳湾万怡酒店 高级双床房 含早',
    price: 599.0,
    thumbnail: '🛏️',
    tags: ['含双早', '预售券'],
    storeName: '深圳湾万怡酒店',
    distance: '5.2km',
    statusText: '待支付',
    statusColor: 'orange',
    extension: {
      type: 'payment_countdown',
      title: '支付倒计时',
      info: [{ label: '剩余时间', value: '14分20秒' }],
    },
    actions: [{ label: '立即支付', type: 'primary' }],
    suggestions: ['未预约随时退', '入住政策是什么', '商品包含什么'],
  },
  {
    id: 'hotel-presale-to-book',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'to_book',
    orderStatusLabel: '待预约',
    productName: '深圳湾万怡酒店 高级双床房 含早',
    price: 599.0,
    thumbnail: '🛏️',
    tags: ['含双早', '整单未约随时退'],
    storeName: '深圳湾万怡酒店',
    distance: '5.2km',
    statusText: '待预约',
    statusColor: 'orange',
    urgeReason: '仅剩3间',
    actions: [
      { label: '立即预约', type: 'primary' },
    ],
    suggestions: ['未预约随时退', '入住政策是什么', '商品包含什么'],
  },
  {
    id: 'hotel-presale-booking-confirming',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'booking_confirming',
    orderStatusLabel: '预约确认中',
    productName: '【豪华大床房】含双早 免费取消 海景房',
    price: 688.0,
    thumbnail: '🏨',
    tags: ['含双早', '免费取消', '预售券'],
    storeName: '三亚海棠湾君悦酒店',
    distance: '1,234km',
    statusText: '预约确认中',
    statusColor: 'blue',
    hideStoreLine: true,
    extension: {
      type: 'hotel_stay',
      title: '入住信息',
      hotelInfo: {
        hotelName: '三亚海棠湾君悦酒店',
        checkInDate: '7月15日 周二',
        checkOutDate: '7月17日 周四',
        nights: 2,
        statusTags: [
          { text: '预订确认中', type: 'warn' },
          { text: '预计15分钟内确认', type: 'default' },
        ],
      },
      info: [
        { label: '入住时间', value: '2026-07-15 14:00后' },
        { label: '离店时间', value: '2026-07-17 12:00前' },
        { label: '房间数量', value: '1间 · 2人' },
      ],
    },
    actions: [],
    suggestions: ['多久能确认', '可以改期吗', '退订政策是什么'],
  },
  {
    id: 'hotel-presale-booked',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'booked',
    orderStatusLabel: '预约成功',
    productName: '【豪华大床房】含双早 免费取消 海景房',
    price: 688.0,
    thumbnail: '🏨',
    tags: ['含双早', '免费取消', '预售券'],
    storeName: '三亚海棠湾君悦酒店',
    distance: '1,234km',
    statusText: '预约成功',
    statusColor: 'green',
    hideStoreLine: true,
    extension: {
      type: 'hotel_stay',
      title: '入住信息',
      hotelInfo: {
        hotelName: '三亚海棠湾君悦酒店',
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
    },
    actions: [
      { label: '入住指引', type: 'primary' },
      { label: '帮我改期', type: 'secondary' },
    ],
    suggestions: ['酒店电话是多少', '可以延迟退房吗', '有接机服务吗'],
  },
  {
    id: 'hotel-presale-checked-in',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'checked_in',
    orderStatusLabel: '已入住',
    productName: '【豪华大床房】含双早 免费取消 海景房',
    price: 688.0,
    thumbnail: '🏨',
    tags: ['含双早', '免费取消', '预售券'],
    storeName: '三亚海棠湾君悦酒店',
    distance: '1,234km',
    statusText: '已入住',
    statusColor: 'green',
    hideStoreLine: true,
    extension: {
      type: 'hotel_stay',
      title: '入住信息',
      hotelInfo: {
        hotelName: '三亚海棠湾君悦酒店',
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
    },
    actions: [],
    suggestions: ['可以延迟退房吗', '有早餐吗', '酒店设施怎么用'],
  },
  {
    id: 'hotel-presale-completed',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'completed',
    orderStatusLabel: '交易完成',
    productName: '希尔顿欢朋酒店 舒适大床房 不含早',
    price: 388.0,
    thumbnail: '🏩',
    tags: ['随时退', '免预约'],
    storeName: '希尔顿欢朋(福田店)',
    distance: '8.5km',
    statusText: '交易完成',
    statusColor: 'green',
    actions: [
      { label: '再来一单', type: 'primary' },
      { label: '去评价', type: 'secondary' },
    ],
    suggestions: ['怎么开发票', '有优惠吗', '再来一单'],
  },
  {
    id: 'hotel-presale-refunding',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'refunding',
    orderStatusLabel: '退款中',
    productName: '深圳湾万怡酒店 高级双床房 含早',
    price: 599.0,
    thumbnail: '🛏️',
    tags: ['含双早', '预售券'],
    storeName: '深圳湾万怡酒店',
    distance: '5.2km',
    statusText: '退款中',
    statusColor: 'gray',
    extension: {
      type: 'refund',
      title: '退款进度',
      info: [
        { label: '退款金额', value: '¥599.00' },
        { label: '退款方式', value: '原路退回' },
        { label: '预计到账', value: '1-3个工作日' },
      ],
      steps: [
        { label: '提交申请', state: 'done' },
        { label: '商家审核', state: 'active' },
        { label: '退款到账', state: 'pending' },
      ],
    },
    actions: [],
    suggestions: ['多久能到账', '可以取消退款吗', '退到哪里'],
  },
  {
    id: 'hotel-calendar-pending-pay',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'calendar_room',
    productTypeLabel: '日历房',
    orderStatus: 'pending_pay',
    orderStatusLabel: '待支付',
    productName: '深圳湾万怡酒店 高级双床房 含早',
    price: 658.0,
    thumbnail: '🛏️',
    tags: ['含双早', '免费取消'],
    storeName: '深圳湾万怡酒店',
    distance: '5.2km',
    statusText: '待支付',
    statusColor: 'orange',
    extension: {
      type: 'hotel_stay',
      title: '入住信息',
      hotelInfo: {
        hotelName: '深圳湾万怡酒店',
        checkInDate: '7月20日 周一',
        checkOutDate: '7月22日 周三',
        nights: 2,
      },
      info: [
        { label: '入住时间', value: '2026-07-20 14:00后' },
        { label: '离店时间', value: '2026-07-22 12:00前' },
        { label: '房间数量', value: '1间 · 2人' },
      ],
    },
    actions: [{ label: '立即支付', type: 'primary' }],
    paymentCountdown: '28分30秒',
    suggestions: ['取消政策是什么', '入住时间', '随时退吗'],
  },
  {
    id: 'hotel-calendar-booking-confirming',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'calendar_room',
    productTypeLabel: '日历房',
    orderStatus: 'booking_confirming',
    orderStatusLabel: '预订确认中',
    productName: '【豪华大床房】含双早 免费取消 海景房',
    price: 788.0,
    thumbnail: '🏨',
    tags: ['含双早', '免费取消'],
    storeName: '三亚海棠湾君悦酒店',
    distance: '1,234km',
    statusText: '预订确认中',
    statusColor: 'blue',
    extension: {
      type: 'hotel_stay',
      title: '入住信息',
      hotelInfo: {
        hotelName: '三亚海棠湾君悦酒店',
        checkInDate: '7月15日 周二',
        checkOutDate: '7月17日 周四',
        nights: 2,
        statusTags: [
          { text: '预订确认中', type: 'warn' },
          { text: '预计15分钟内确认', type: 'default' },
        ],
      },
      info: [
        { label: '入住时间', value: '2026-07-15 14:00后' },
        { label: '离店时间', value: '2026-07-17 12:00前' },
        { label: '房间数量', value: '1间 · 2人' },
      ],
    },
    actions: [],
    suggestions: ['多久能确认', '可以改期吗', '退订政策是什么'],
  },
  {
    id: 'hotel-calendar-booked',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'calendar_room',
    productTypeLabel: '日历房',
    orderStatus: 'booked',
    orderStatusLabel: '预订成功',
    productName: '【豪华大床房】含双早 免费取消 海景房',
    price: 788.0,
    thumbnail: '🏨',
    tags: ['含双早', '免费取消'],
    storeName: '三亚海棠湾君悦酒店',
    distance: '1,234km',
    statusText: '预订成功',
    statusColor: 'green',
    extension: {
      type: 'hotel_stay',
      title: '入住信息',
      hotelInfo: {
        hotelName: '三亚海棠湾君悦酒店',
        checkInDate: '7月15日 周二',
        checkOutDate: '7月17日 周四',
        nights: 2,
      },
      info: [
        { label: '入住时间', value: '2026-07-15 14:00后' },
        { label: '离店时间', value: '2026-07-17 12:00前' },
        { label: '房间数量', value: '1间 · 2人' },

      ],
    },
    actions: [
      { label: '入住指引', type: 'primary' },
    ],
    suggestions: ['酒店电话是多少', '可以延迟退房吗', '有接机服务吗'],
  },
  {
    id: 'hotel-calendar-checked-in',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'calendar_room',
    productTypeLabel: '日历房',
    orderStatus: 'checked_in',
    orderStatusLabel: '已入住',
    productName: '【豪华大床房】含双早 免费取消 海景房',
    price: 788.0,
    thumbnail: '🏨',
    tags: ['含双早', '免费取消'],
    storeName: '三亚海棠湾君悦酒店',
    distance: '1,234km',
    statusText: '已入住',
    statusColor: 'green',
    extension: {
      type: 'hotel_stay',
      title: '入住信息',
      hotelInfo: {
        hotelName: '三亚海棠湾君悦酒店',
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
    },
    actions: [],
    suggestions: ['可以延迟退房吗', '有早餐吗', '酒店设施怎么用'],
  },
  {
    id: 'hotel-calendar-completed',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'calendar_room',
    productTypeLabel: '日历房',
    orderStatus: 'completed',
    orderStatusLabel: '交易完成',
    productName: '希尔顿欢朋酒店 舒适大床房 不含早',
    price: 428.0,
    thumbnail: '🏩',
    tags: ['含双早', '免费取消'],
    storeName: '希尔顿欢朋(福田店)',
    distance: '8.5km',
    statusText: '交易完成',
    statusColor: 'green',
    actions: [
      { label: '再来一单', type: 'primary' },
      { label: '去评价', type: 'secondary' },
    ],
    suggestions: ['再次预订', '怎么开发票', '有优惠吗', '再来一单'],
  },
  {
    id: 'hotel-calendar-refunding',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'calendar_room',
    productTypeLabel: '日历房',
    orderStatus: 'refunding',
    orderStatusLabel: '退款中',
    productName: '深圳湾万怡酒店 高级双床房 含早',
    price: 658.0,
    thumbnail: '🛏️',
    tags: ['含双早', '免费取消'],
    storeName: '深圳湾万怡酒店',
    distance: '5.2km',
    statusText: '退款中',
    statusColor: 'gray',
    extension: {
      type: 'refund',
      title: '退款进度',
      info: [
        { label: '退款金额', value: '¥658.00' },
        { label: '退款方式', value: '原路退回' },
        { label: '预计到账', value: '1-3个工作日' },
      ],
      steps: [
        { label: '提交申请', state: 'done' },
        { label: '商家审核', state: 'active' },
        { label: '退款到账', state: 'pending' },
      ],
    },
    actions: [],
    suggestions: ['多久能到账', '可以取消退款吗', '退到哪里'],
  },
  // ========== 景区行业 ==========
  {
    id: 'scenic-group-pending-pay',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    orderStatus: 'pending_pay',
    orderStatusLabel: '待支付',
    productName: '深圳欢乐谷全天票 成人票 周末通用',
    price: 280.0,
    thumbnail: '🎡',
    tags: ['随时退', '过期退'],
    storeName: '深圳欢乐谷',
    distance: '12.3km',
    statusText: '待支付',
    statusColor: 'orange',
    extension: {
      type: 'payment_countdown',
      title: '支付倒计时',
      info: [{ label: '剩余时间', value: '19分30秒' }],
    },
    actions: [{ label: '立即支付', type: 'primary' }],
    suggestions: ['随时退吗', '包含什么', '门店在哪'],
  },
  {
    id: 'scenic-group-unused',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    orderStatus: 'unused',
    orderStatusLabel: '待使用',
    productName: '深圳欢乐谷全天票 成人票 周末通用',
    price: 280.0,
    thumbnail: '🎡',
    tags: ['随时退', '过期退'],
    storeName: '深圳欢乐谷',
    distance: '12.3km',
    statusText: '待使用',
    statusColor: 'orange',
    actions: [
      { label: '🎫 查看券码', type: 'primary' },
      { label: '⏰ 使用提醒', type: 'secondary' },
    ],
    suggestions: ['这个券怎么用', '有效期到什么时候', '可以退吗'],
    voucherInfo: {
      code: '6688 2341 5678',
      number: 'NO.2026063000987654',
      validDate: '2026-06-30 至 2026-09-30',
      notes: ['凭券码到店核销使用', '请提前1天电话预约', '节假日需补差价', '不与其他优惠同享'],
    },
  },
  {
    id: 'scenic-group-completed',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    orderStatus: 'completed',
    orderStatusLabel: '交易完成',
    productName: '深圳欢乐谷全天票 成人票 周末通用',
    price: 280.0,
    thumbnail: '🎡',
    tags: ['随时退', '过期退'],
    storeName: '深圳欢乐谷',
    distance: '12.3km',
    statusText: '交易完成',
    statusColor: 'green',
    actions: [
      { label: '再来一单', type: 'primary' },
      { label: '去评价', type: 'secondary' },
    ],
    suggestions: ['怎么开发票', '有优惠吗', '再来一单'],
  },
  {
    id: 'scenic-group-refunding',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    orderStatus: 'refunding',
    orderStatusLabel: '退款中',
    productName: '深圳欢乐谷全天票 成人票 周末通用',
    price: 280.0,
    thumbnail: '🎡',
    tags: ['随时退'],
    storeName: '深圳欢乐谷',
    distance: '12.3km',
    statusText: '退款中',
    statusColor: 'gray',
    extension: {
      type: 'refund',
      title: '退款进度',
      info: [
        { label: '退款金额', value: '¥280.00' },
        { label: '退款方式', value: '原路退回' },
        { label: '预计到账', value: '1-3个工作日' },
      ],
      steps: [
        { label: '提交申请', state: 'done' },
        { label: '商家审核', state: 'active' },
        { label: '退款到账', state: 'pending' },
      ],
    },
    actions: [],
    suggestions: ['多久能到账', '可以取消退款吗', '退到哪里'],
  },
  {
    id: 'scenic-presale-pending-pay',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'pending_pay',
    orderStatusLabel: '待支付',
    productName: '上海迪士尼度假区 1日票 成人票',
    price: 499.0,
    thumbnail: '🎢',
    tags: ['随时退', '预售券'],
    storeName: '上海迪士尼度假区',
    distance: '1,200km',
    statusText: '待支付',
    statusColor: 'orange',
    extension: {
      type: 'payment_countdown',
      title: '支付倒计时',
      info: [{ label: '剩余时间', value: '23分10秒' }],
    },
    actions: [{ label: '立即支付', type: 'primary' }],
    suggestions: ['未预约随时退', '有效期多久', '入园规则是什么'],
  },
  {
    id: 'scenic-presale-to-book',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'to_book',
    orderStatusLabel: '待预约',
    productName: '上海迪士尼度假区 1日票 成人票',
    price: 499.0,
    thumbnail: '🎢',
    tags: ['随时退', '预售券'],
    storeName: '上海迪士尼度假区',
    distance: '1,200km',
    statusText: '待预约',
    statusColor: 'orange',
    urgeReason: '预约火爆',
    actions: [
      { label: '立即预约', type: 'primary' },
    ],
    suggestions: ['未预约随时退', '有效期多久', '入园规则是什么'],
  },
  {
    id: 'scenic-presale-booking-confirming',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'booking_confirming',
    orderStatusLabel: '预约确认中',
    productName: '广州长隆野生动物园 2日票 亲子套票',
    price: 699.0,
    thumbnail: '🦁',
    tags: ['亲子票', '预售券'],
    storeName: '广州长隆野生动物园',
    distance: '108km',
    statusText: '预约确认中',
    statusColor: 'blue',
    hideStoreLine: true,
    extension: {
      type: 'scenic_entry',
      title: '入园凭证',
      scenicInfo: {
        scenicName: '广州长隆野生动物园',
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
    },
    actions: [],
    suggestions: ['多久能确认', '预约后可以改期吗', '有快速通道吗'],
  },
  {
    id: 'scenic-presale-booked',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'booked',
    orderStatusLabel: '预约成功',
    productName: '欢乐谷全天票 成人票 周末通用',
    price: 280.0,
    thumbnail: '🎡',
    tags: ['随时退', '已预约'],
    storeName: '深圳欢乐谷',
    distance: '12.3km',
    statusText: '预约成功',
    statusColor: 'green',
    hideStoreLine: true,
    extension: {
      type: 'scenic_entry',
      title: '入园凭证',
      scenicInfo: {
        scenicName: '深圳欢乐谷',
        visitDate: '7月5日 周六',
        entryTime: '09:30-22:00',
      },
      info: [
        { label: '预约日期', value: '2026-07-05' },
        { label: '入园时间', value: '09:30-22:00' },
        { label: '入园方式', value: '刷身份证入园' },
        { label: '预约单号', value: 'YY2026063000789' },
      ],
    },
    actions: [],
    suggestions: ['一站式游玩攻略', '有什么必玩项目', '可以带食物进去吗', '停车方便吗'],
  },
  {
    id: 'scenic-presale-entered',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'entered',
    orderStatusLabel: '已入园',
    productName: '广州长隆野生动物园 2日票 亲子套票',
    price: 699.0,
    thumbnail: '🦁',
    tags: ['亲子票', '预售券'],
    storeName: '广州长隆野生动物园',
    distance: '108km',
    statusText: '已入园',
    statusColor: 'green',
    hideStoreLine: true,
    extension: {
      type: 'scenic_entry',
      title: '入园凭证',
      scenicInfo: {
        scenicName: '广州长隆野生动物园',
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
    },
    actions: [],
    suggestions: ['有什么必玩项目', '可以带食物进去吗', '停车方便吗'],
  },
  {
    id: 'scenic-presale-completed',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'completed',
    orderStatusLabel: '交易完成',
    productName: '上海迪士尼度假区 1日票 成人票',
    price: 499.0,
    thumbnail: '🎢',
    tags: ['随时退', '预售券'],
    storeName: '上海迪士尼度假区',
    distance: '1,200km',
    statusText: '交易完成',
    statusColor: 'green',
    actions: [
      { label: '再来一单', type: 'primary' },
      { label: '去评价', type: 'secondary' },
    ],
    suggestions: ['怎么开发票', '有优惠吗', '再来一单'],
  },
  {
    id: 'scenic-presale-refunding',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'refunding',
    orderStatusLabel: '退款中',
    productName: '上海迪士尼度假区 1日票 成人票',
    price: 499.0,
    thumbnail: '🎢',
    tags: ['随时退'],
    storeName: '上海迪士尼度假区',
    distance: '1,200km',
    statusText: '退款中',
    statusColor: 'gray',
    extension: {
      type: 'refund',
      title: '退款进度',
      info: [
        { label: '退款金额', value: '¥499.00' },
        { label: '退款方式', value: '原路退回' },
        { label: '预计到账', value: '1-3个工作日' },
      ],
      steps: [
        { label: '提交申请', state: 'done' },
        { label: '商家审核', state: 'active' },
        { label: '退款到账', state: 'pending' },
      ],
    },
    actions: [],
    suggestions: ['多久能到账', '可以取消退款吗', '退到哪里'],
  },
  {
    id: 'scenic-calendar-pending-pay',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'calendar_ticket',
    productTypeLabel: '日历票',
    orderStatus: 'pending_pay',
    orderStatusLabel: '待支付',
    productName: '上海迪士尼度假区 1日票 成人票',
    price: 529.0,
    thumbnail: '🎢',
    tags: ['指定日', '身份证入园'],
    storeName: '上海迪士尼度假区',
    distance: '1,200km',
    statusText: '待支付',
    statusColor: 'orange',
    extension: {
      type: 'scenic_entry',
      title: '入园凭证',
      scenicInfo: {
        scenicName: '上海迪士尼度假区',
        visitDate: '7月10日 周五',
        entryTime: '09:30-22:00',
      },
      info: [
        { label: '入园日期', value: '2026-07-10' },
        { label: '入园时间', value: '09:30-22:00' },
      ],
    },
    actions: [{ label: '立即支付', type: 'primary' }],
    paymentCountdown: '24分15秒',
    suggestions: ['取消政策是什么', '入园时间', '随时退吗'],
  },
  {
    id: 'scenic-calendar-booking-confirming',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'calendar_ticket',
    productTypeLabel: '日历票',
    orderStatus: 'booking_confirming',
    orderStatusLabel: '预订确认中',
    productName: '上海迪士尼度假区 1日票 成人票',
    price: 529.0,
    thumbnail: '🎢',
    tags: ['指定日', '身份证入园'],
    storeName: '上海迪士尼度假区',
    distance: '1,200km',
    statusText: '预订确认中',
    statusColor: 'blue',
    extension: {
      type: 'scenic_entry',
      title: '入园凭证',
      info: [
        { label: '入园日期', value: '2026-07-10' },
        { label: '入园时间', value: '09:30-22:00' },
      ],
    },
    actions: [],
    suggestions: ['多久能确认', '可以改期吗', '退订政策是什么'],
  },
  {
    id: 'scenic-calendar-booked',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'calendar_ticket',
    productTypeLabel: '日历票',
    orderStatus: 'booked',
    orderStatusLabel: '预订成功',
    productName: '上海迪士尼度假区 1日票 成人票',
    price: 529.0,
    thumbnail: '🎢',
    tags: ['指定日', '身份证入园'],
    storeName: '上海迪士尼度假区',
    distance: '1,200km',
    statusText: '预订成功',
    statusColor: 'green',
    extension: {
      type: 'scenic_entry',
      title: '入园凭证',
      scenicInfo: {
        scenicName: '上海迪士尼度假区',
        visitDate: '7月10日 周五',
        entryTime: '09:30-22:00',
      },
      info: [
        { label: '入园日期', value: '2026-07-10' },
        { label: '入园时间', value: '09:30-22:00' },
        { label: '入园方式', value: '刷身份证入园' },

      ],
    },
    actions: [],
    suggestions: ['一站式游玩攻略', '有什么必玩项目', '可以带食物进去吗', '停车方便吗'],
  },
  {
    id: 'scenic-calendar-entered',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'calendar_ticket',
    productTypeLabel: '日历票',
    orderStatus: 'entered',
    orderStatusLabel: '已入园',
    productName: '上海迪士尼度假区 1日票 成人票',
    price: 529.0,
    thumbnail: '🎢',
    tags: ['指定日', '身份证入园'],
    storeName: '上海迪士尼度假区',
    distance: '1,200km',
    statusText: '已入园',
    statusColor: 'green',
    extension: {
      type: 'scenic_entry',
      title: '入园凭证',
      scenicInfo: {
        scenicName: '上海迪士尼度假区',
        visitDate: '7月10日 周五',
        entryTime: '09:45',
        statusTags: [
          { text: '已入园', type: 'success' },
        ],
      },
      info: [
        { label: '入园日期', value: '2026-07-10' },
        { label: '入园时间', value: '09:45' },
        { label: '已入园', value: '已入园' },
      ],
    },
    actions: [],
    suggestions: ['有什么必玩项目', '可以带食物进去吗', '停车方便吗'],
  },
  {
    id: 'scenic-calendar-completed',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'calendar_ticket',
    productTypeLabel: '日历票',
    orderStatus: 'completed',
    orderStatusLabel: '交易完成',
    productName: '上海迪士尼度假区 1日票 成人票',
    price: 529.0,
    thumbnail: '🎢',
    tags: ['指定日', '身份证入园'],
    storeName: '上海迪士尼度假区',
    distance: '1,200km',
    statusText: '交易完成',
    statusColor: 'green',
    actions: [
      { label: '再来一单', type: 'primary' },
      { label: '去评价', type: 'secondary' },
    ],
    suggestions: ['再次预订', '怎么开发票', '有优惠吗', '再来一单'],
  },
  {
    id: 'scenic-calendar-refunding',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'calendar_ticket',
    productTypeLabel: '日历票',
    orderStatus: 'refunding',
    orderStatusLabel: '退款中',
    productName: '上海迪士尼度假区 1日票 成人票',
    price: 529.0,
    thumbnail: '🎢',
    tags: ['指定日', '身份证入园'],
    storeName: '上海迪士尼度假区',
    distance: '1,200km',
    statusText: '退款中',
    statusColor: 'gray',
    extension: {
      type: 'refund',
      title: '退款进度',
      info: [
        { label: '退款金额', value: '¥529.00' },
        { label: '退款方式', value: '原路退回' },
        { label: '预计到账', value: '1-3个工作日' },
      ],
      steps: [
        { label: '提交申请', state: 'done' },
        { label: '商家审核', state: 'active' },
        { label: '退款到账', state: 'pending' },
      ],
    },
    actions: [],
    suggestions: ['多久能到账', '可以取消退款吗', '退到哪里'],
  },
  // ========== 旅行社行业 ==========
  {
    id: 'travel-presale-pending-pay',
    category: 'travel_agency',
    categoryLabel: '旅行社',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'pending_pay',
    orderStatusLabel: '待支付',
    productName: '云南大理丽江6日5晚跟团游 纯玩无购物',
    price: 2999.0,
    thumbnail: '✈️',
    tags: ['纯玩团', '含机票'],
    storeName: '携程旅游专营店',
    distance: '2.3km',
    statusText: '待支付',
    statusColor: 'orange',
    extension: {
      type: 'payment_countdown',
      title: '支付倒计时',
      info: [{ label: '剩余时间', value: '29分50秒' }],
    },
    actions: [{ label: '立即支付', type: 'primary' }],
    suggestions: ['未约可退', '行程介绍', '费用包含什么'],
  },
  {
    id: 'travel-presale-to-book',
    category: 'travel_agency',
    categoryLabel: '旅行社',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'to_book',
    orderStatusLabel: '待预约',
    productName: '云南大理丽江6日5晚跟团游 纯玩无购物',
    price: 2999.0,
    thumbnail: '✈️',
    tags: ['纯玩团', '含机票'],
    storeName: '携程旅游专营店',
    distance: '2.3km',
    statusText: '待预约',
    statusColor: 'orange',
    urgeReason: '预约有礼',
    actions: [
      { label: '立即预约', type: 'primary' },
    ],
    suggestions: ['未约可退', '有效期多久', '费用包含什么'],
  },
  {
    id: 'travel-presale-booking-confirming',
    category: 'travel_agency',
    categoryLabel: '旅行社',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'booking_confirming',
    orderStatusLabel: '预约确认中',
    productName: '云南大理丽江6日5晚跟团游 纯玩无购物',
    price: 2999.0,
    thumbnail: '✈️',
    tags: ['纯玩团', '含机票'],
    storeName: '携程旅游专营店',
    distance: '2.3km',
    statusText: '预约确认中',
    statusColor: 'blue',
    extension: {
      type: 'travel_info',
      title: '出行信息',
      info: [
        { label: '出发日期', value: '2026-07-15' },
        { label: '行程天数', value: '6天5晚' },
      ],
    },
    actions: [],
    suggestions: ['多久能确认', '预约后可以改期吗', '导游联系方式'],
  },
  {
    id: 'travel-presale-booked',
    category: 'travel_agency',
    categoryLabel: '旅行社',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'booked',
    orderStatusLabel: '预约成功',
    productName: '云南大理丽江6日5晚跟团游 纯玩无购物',
    price: 2999.0,
    thumbnail: '✈️',
    tags: ['纯玩团', '已预约'],
    storeName: '携程旅游专营店',
    distance: '2.3km',
    statusText: '预约成功',
    statusColor: 'green',
    extension: {
      type: 'travel_info',
      title: '出行信息',
      info: [
        { label: '出发日期', value: '2026-07-15' },
        { label: '行程天数', value: '6天5晚' },
        { label: '集合地点', value: '长水机场T2航站楼' },
        { label: '导游电话', value: '138****8888' },
      ],
    },
    actions: [],
    suggestions: ['查看完整行程', '需要带什么', '天气怎么样', '可以改期吗'],
  },
  {
    id: 'travel-presale-pending-travel',
    category: 'travel_agency',
    categoryLabel: '旅行社',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'pending_travel',
    orderStatusLabel: '待出行',
    productName: '云南大理丽江6日5晚跟团游 纯玩无购物',
    price: 2999.0,
    thumbnail: '✈️',
    tags: ['纯玩团', '待出行'],
    storeName: '携程旅游专营店',
    distance: '2.3km',
    statusText: '待出行',
    statusColor: 'green',
    extension: {
      type: 'travel_info',
      title: '出行信息',
      info: [
        { label: '出发日期', value: '2026-07-15' },
        { label: '行程天数', value: '6天5晚' },
        { label: '集合地点', value: '长水机场T2航站楼' },
        { label: '导游电话', value: '138****8888' },
      ],
    },
    actions: [],
    suggestions: ['查看完整行程', '需要带什么', '天气怎么样', '接机安排'],
  },
  {
    id: 'travel-presale-in-travel',
    category: 'travel_agency',
    categoryLabel: '旅行社',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'in_travel',
    orderStatusLabel: '行程中',
    productName: '云南大理丽江6日5晚跟团游 纯玩无购物',
    price: 2999.0,
    thumbnail: '✈️',
    tags: ['纯玩团', '行程中'],
    storeName: '携程旅游专营店',
    distance: '2.3km',
    statusText: '行程中',
    statusColor: 'green',
    extension: {
      type: 'travel_info',
      title: '今日行程',
      info: [
        { label: '第3天', value: '大理古城 - 洱海游船' },
        { label: '导游电话', value: '138****8888' },
        { label: '集合时间', value: '08:30' },
      ],
    },
    actions: [
      { label: '联系导游', type: 'primary' },
    ],
    suggestions: ['附近美食推荐', '紧急联系人', '天气怎么样'],
  },
  {
    id: 'travel-presale-completed',
    category: 'travel_agency',
    categoryLabel: '旅行社',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'completed',
    orderStatusLabel: '交易完成',
    productName: '云南大理丽江6日5晚跟团游 纯玩无购物',
    price: 2999.0,
    thumbnail: '✈️',
    tags: ['纯玩团', '含机票'],
    storeName: '携程旅游专营店',
    distance: '2.3km',
    statusText: '交易完成',
    statusColor: 'green',
    actions: [
      { label: '再来一单', type: 'primary' },
      { label: '去评价', type: 'secondary' },
    ],
    suggestions: ['怎么开发票', '有其他线路吗', '再来一单'],
  },
  {
    id: 'travel-presale-refunding',
    category: 'travel_agency',
    categoryLabel: '旅行社',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'refunding',
    orderStatusLabel: '退款中',
    productName: '云南大理丽江6日5晚跟团游 纯玩无购物',
    price: 2999.0,
    thumbnail: '✈️',
    tags: ['纯玩团'],
    storeName: '携程旅游专营店',
    distance: '2.3km',
    statusText: '退款中',
    statusColor: 'gray',
    extension: {
      type: 'refund',
      title: '退款进度',
      info: [
        { label: '退款金额', value: '¥2999.00' },
        { label: '退款方式', value: '原路退回' },
        { label: '预计到账', value: '3-7个工作日' },
      ],
      steps: [
        { label: '提交申请', state: 'done' },
        { label: '商家审核', state: 'active' },
        { label: '退款到账', state: 'pending' },
      ],
    },
    actions: [],
    suggestions: ['多久能到账', '可以取消退款吗', '退到哪里'],
  },
  {
    id: 'food-group-pending-pay',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'voucher',
    redeemMethodLabel: '到店套餐',
    orderStatus: 'pending_pay',
    orderStatusLabel: '待支付',
    productName: '【双人餐】招牌烤鱼套餐 含配菜+饮品',
    price: 128.0,
    thumbnail: '🍲',
    tags: ['双人餐', '随时退'],
    storeName: '江边城外烤鱼（望京店）',
    distance: '1.2km',
    statusText: '待支付',
    statusColor: 'orange',
    extension: {
      type: 'payment_countdown',
      title: '支付倒计时',
      info: [{ label: '剩余时间', value: '26分15秒' }],
    },
    actions: [
      { label: '立即支付', type: 'primary' },
    ],
    suggestions: ['可以用优惠券吗', '怎么取消订单', '支持什么支付方式'],
    voucherInfo: {
      code: '8829 4561 2345',
      number: 'NO.2026063000123456',
      validDate: '2026-06-30 至 2026-12-31',
      notes: ['凭券码到店核销使用', '不与其他优惠同享', '周末节假日通用'],
    },
  },
  {
    id: 'food-group-completed',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'voucher',
    redeemMethodLabel: '到店套餐',
    orderStatus: 'completed',
    orderStatusLabel: '交易完成',
    productName: '【双人餐】招牌烤鱼套餐 含配菜+饮品',
    price: 128.0,
    thumbnail: '🍲',
    tags: ['已核销'],
    storeName: '江边城外烤鱼（望京店）',
    distance: '1.2km',
    statusText: '交易完成',
    statusColor: 'gray',
    actions: [
      { label: '再来一单', type: 'primary' },
      { label: '去评价', type: 'secondary' },
    ],
    suggestions: ['味道怎么样', '怎么开发票', '再来一单'],
  },
  {
    id: 'food-group-cancelled',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'voucher',
    redeemMethodLabel: '到店套餐',
    orderStatus: 'cancelled',
    orderStatusLabel: '已取消',
    productName: '【双人餐】招牌烤鱼套餐 含配菜+饮品',
    price: 128.0,
    thumbnail: '🍲',
    tags: ['已取消', '未支付'],
    storeName: '江边城外烤鱼（望京店）',
    distance: '1.2km',
    statusText: '已取消',
    statusColor: 'gray',
    actions: [],
    suggestions: ['为什么取消了', '可以重新下单吗', '类似推荐'],
  },
  {
    id: 'food-group-refund-success',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'voucher',
    redeemMethodLabel: '到店套餐',
    orderStatus: 'refund_success',
    orderStatusLabel: '退款成功',
    productName: '【双人餐】招牌烤鱼套餐 含配菜+饮品',
    price: 128.0,
    thumbnail: '🍲',
    tags: ['退款成功'],
    storeName: '江边城外烤鱼（望京店）',
    distance: '1.2km',
    statusText: '退款成功',
    statusColor: 'green',
    extension: {
      type: 'refund_success',
      title: '退款成功',
      info: [
        { label: '退款金额', value: '¥128.00' },
        { label: '退款方式', value: '原路退回' },
        { label: '到账时间', value: '2026-06-28 15:32' },
      ],
    },
    actions: [],
    suggestions: ['退到哪里了', '多久到账的', '再来一单'],
  },
  {
    id: 'food-group-refund-fail',
    category: 'food',
    categoryLabel: '餐饮',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    redeemMethod: 'voucher',
    redeemMethodLabel: '到店套餐',
    orderStatus: 'refund_fail',
    orderStatusLabel: '退款失败',
    productName: '【双人餐】招牌烤鱼套餐 含配菜+饮品',
    price: 128.0,
    thumbnail: '🍲',
    tags: ['退款失败'],
    storeName: '江边城外烤鱼（望京店）',
    distance: '1.2km',
    statusText: '退款失败',
    statusColor: 'red',
    actions: [],
    suggestions: ['为什么退款失败', '可以重新申请吗', '怎么联系客服'],
  },
  {
    id: 'hotel-presale-cancelled',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'cancelled',
    orderStatusLabel: '已取消',
    productName: '【三亚海棠湾】豪华海景房2晚通兑券 含双早',
    price: 1599.0,
    thumbnail: '🏨',
    tags: ['已取消', '未支付'],
    storeName: '三亚海棠湾仁恒皇冠假日度假酒店',
    distance: '三亚·海棠湾',
    statusText: '已取消',
    statusColor: 'gray',
    actions: [],
    suggestions: ['为什么取消了', '可以重新下单吗', '类似酒店推荐'],
  },
  {
    id: 'hotel-presale-refund-success',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'refund_success',
    orderStatusLabel: '退款成功',
    productName: '【三亚海棠湾】豪华海景房2晚通兑券 含双早',
    price: 1599.0,
    thumbnail: '🏨',
    tags: ['退款成功', '随时退'],
    storeName: '三亚海棠湾仁恒皇冠假日度假酒店',
    distance: '三亚·海棠湾',
    statusText: '退款成功',
    statusColor: 'green',
    extension: {
      type: 'refund_success',
      title: '退款成功',
      info: [
        { label: '退款金额', value: '¥1599.00' },
        { label: '退款方式', value: '原路退回' },
        { label: '到账时间', value: '2026-06-28 15:32' },
      ],
    },
    actions: [],
    suggestions: ['退到哪里了', '多久到账的', '可以再买吗'],
  },
  {
    id: 'hotel-presale-refund-fail',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'refund_fail',
    orderStatusLabel: '退款失败',
    productName: '【三亚海棠湾】豪华海景房2晚通兑券 含双早',
    price: 1599.0,
    thumbnail: '🏨',
    tags: ['退款失败'],
    storeName: '三亚海棠湾仁恒皇冠假日度假酒店',
    distance: '三亚·海棠湾',
    statusText: '退款失败',
    statusColor: 'red',
    actions: [],
    suggestions: ['为什么退款失败', '可以重新申请吗', '怎么联系客服'],
  },
  {
    id: 'hotel-calendar-cancelled',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'calendar_room',
    productTypeLabel: '日历房',
    orderStatus: 'cancelled',
    orderStatusLabel: '已取消',
    productName: '豪华海景房（大床） 含双早',
    price: 899.0,
    thumbnail: '🛏️',
    tags: ['已取消', '未支付'],
    storeName: '三亚海棠湾仁恒皇冠假日度假酒店',
    distance: '三亚·海棠湾',
    statusText: '已取消',
    statusColor: 'gray',
    actions: [],
    suggestions: ['再次预订', '为什么取消了', '可以重新预订吗', '类似房型推荐'],
  },
  {
    id: 'hotel-calendar-refund-success',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'calendar_room',
    productTypeLabel: '日历房',
    orderStatus: 'refund_success',
    orderStatusLabel: '退款成功',
    productName: '豪华海景房（大床） 含双早',
    price: 899.0,
    thumbnail: '🛏️',
    tags: ['退款成功'],
    storeName: '三亚海棠湾仁恒皇冠假日度假酒店',
    distance: '三亚·海棠湾',
    statusText: '退款成功',
    statusColor: 'green',
    extension: {
      type: 'refund_success',
      title: '退款成功',
      info: [
        { label: '退款金额', value: '¥899.00' },
        { label: '退款方式', value: '原路退回' },
        { label: '到账时间', value: '2026-06-28 15:32' },
      ],
    },
    actions: [],
    suggestions: ['再次预订', '退到哪里了', '多久到账的', '可以再订吗'],
  },
  {
    id: 'hotel-calendar-refund-fail',
    category: 'hotel',
    categoryLabel: '酒店',
    productType: 'calendar_room',
    productTypeLabel: '日历房',
    orderStatus: 'refund_fail',
    orderStatusLabel: '退款失败',
    productName: '豪华海景房（大床） 含双早',
    price: 899.0,
    thumbnail: '🛏️',
    tags: ['退款失败'],
    storeName: '三亚海棠湾仁恒皇冠假日度假酒店',
    distance: '三亚·海棠湾',
    statusText: '退款失败',
    statusColor: 'red',
    actions: [],
    suggestions: ['为什么退款失败', '可以重新申请吗', '怎么联系客服'],
  },
  {
    id: 'scenic-group-pending-pay',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    orderStatus: 'pending_pay',
    orderStatusLabel: '待支付',
    productName: '故宫博物院成人票 含珍宝馆钟表馆',
    price: 80.0,
    thumbnail: '🏯',
    tags: ['成人票', '随时退'],
    storeName: '故宫博物院',
    distance: '北京·东城',
    statusText: '待支付',
    statusColor: 'orange',
    extension: {
      type: 'payment_countdown',
      title: '支付倒计时',
      info: [{ label: '剩余时间', value: '26分15秒' }],
    },
    actions: [
      { label: '立即支付', type: 'primary' },
    ],
    suggestions: ['可以用优惠券吗', '怎么取消订单', '支持什么支付方式'],
    voucherInfo: {
      code: 'GJ202606300012',
      number: 'NO.GJ202606300001',
      validDate: '2026-06-30 至 2026-07-30',
      notes: ['凭券码入园核销', '不与其他优惠同享', '营业时间内可用'],
    },
  },
  {
    id: 'scenic-group-completed',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    orderStatus: 'completed',
    orderStatusLabel: '交易完成',
    productName: '故宫博物院成人票 含珍宝馆钟表馆',
    price: 80.0,
    thumbnail: '🏯',
    tags: ['已入园'],
    storeName: '故宫博物院',
    distance: '北京·东城',
    statusText: '交易完成',
    statusColor: 'gray',
    actions: [
      { label: '再来一单', type: 'primary' },
      { label: '去评价', type: 'secondary' },
    ],
    suggestions: ['游玩攻略', '怎么开发票', '附近有什么好吃的'],
  },
  {
    id: 'scenic-group-cancelled',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    orderStatus: 'cancelled',
    orderStatusLabel: '已取消',
    productName: '故宫博物院成人票 含珍宝馆钟表馆',
    price: 80.0,
    thumbnail: '🏯',
    tags: ['已取消', '未支付'],
    storeName: '故宫博物院',
    distance: '北京·东城',
    statusText: '已取消',
    statusColor: 'gray',
    actions: [],
    suggestions: ['为什么取消了', '可以重新下单吗', '其他景点推荐'],
  },
  {
    id: 'scenic-group-refunding',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    orderStatus: 'refunding',
    orderStatusLabel: '退款中',
    productName: '故宫博物院成人票 含珍宝馆钟表馆',
    price: 80.0,
    thumbnail: '🏯',
    tags: ['退款中'],
    storeName: '故宫博物院',
    distance: '北京·东城',
    statusText: '退款中',
    statusColor: 'gray',
    extension: {
      type: 'refund',
      title: '退款进度',
      info: [
        { label: '退款金额', value: '¥80.00' },
        { label: '退款方式', value: '原路退回' },
        { label: '预计到账', value: '1-3个工作日' },
      ],
      steps: [
        { label: '提交申请', state: 'done' },
        { label: '商家审核', state: 'active' },
        { label: '退款到账', state: 'pending' },
      ],
    },
    actions: [],
    suggestions: ['多久能到账', '可以取消退款吗', '退到哪里'],
  },
  {
    id: 'scenic-group-refund-success',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    orderStatus: 'refund_success',
    orderStatusLabel: '退款成功',
    productName: '故宫博物院成人票 含珍宝馆钟表馆',
    price: 80.0,
    thumbnail: '🏯',
    tags: ['退款成功'],
    storeName: '故宫博物院',
    distance: '北京·东城',
    statusText: '退款成功',
    statusColor: 'green',
    extension: {
      type: 'refund_success',
      title: '退款成功',
      info: [
        { label: '退款金额', value: '¥80.00' },
        { label: '退款方式', value: '原路退回' },
        { label: '到账时间', value: '2026-06-28 15:32' },
      ],
    },
    actions: [],
    suggestions: ['退到哪里了', '多久到账的', '其他景点推荐'],
  },
  {
    id: 'scenic-group-refund-fail',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    orderStatus: 'refund_fail',
    orderStatusLabel: '退款失败',
    productName: '故宫博物院成人票 含珍宝馆钟表馆',
    price: 80.0,
    thumbnail: '🏯',
    tags: ['退款失败'],
    storeName: '故宫博物院',
    distance: '北京·东城',
    statusText: '退款失败',
    statusColor: 'red',
    actions: [],
    suggestions: ['为什么退款失败', '可以重新申请吗', '怎么联系客服'],
  },
  {
    id: 'scenic-presale-pending-pay',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'pending_pay',
    orderStatusLabel: '待支付',
    productName: '【早鸟特惠】北京环球影城指定单日成人票',
    price: 418.0,
    thumbnail: '🎢',
    tags: ['早鸟特惠', '随时退'],
    storeName: '北京环球影城度假区',
    distance: '北京·通州',
    statusText: '待支付',
    statusColor: 'orange',
    extension: {
      type: 'payment_countdown',
      title: '支付倒计时',
      info: [{ label: '剩余时间', value: '26分15秒' }],
    },
    actions: [
      { label: '立即支付', type: 'primary' },
    ],
    suggestions: ['可以用优惠券吗', '怎么取消订单', '支持什么支付方式'],
    voucherInfo: {
      code: 'HQ202606300088',
      number: 'NO.HQ202606300088',
      validDate: '2026-07-01 至 2026-09-30',
      notes: ['凭券码预约入园', '需提前1天预约', '不与其他优惠同享'],
    },
  },
  {
    id: 'scenic-presale-completed',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'completed',
    orderStatusLabel: '交易完成',
    productName: '【早鸟特惠】北京环球影城指定单日成人票',
    price: 418.0,
    thumbnail: '🎢',
    tags: ['已入园'],
    storeName: '北京环球影城度假区',
    distance: '北京·通州',
    statusText: '交易完成',
    statusColor: 'gray',
    actions: [
      { label: '再来一单', type: 'primary' },
      { label: '去评价', type: 'secondary' },
    ],
    suggestions: ['游玩攻略', '怎么开发票', '附近有什么好吃的'],
  },
  {
    id: 'scenic-presale-cancelled',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'cancelled',
    orderStatusLabel: '已取消',
    productName: '【早鸟特惠】北京环球影城指定单日成人票',
    price: 418.0,
    thumbnail: '🎢',
    tags: ['已取消', '未支付'],
    storeName: '北京环球影城度假区',
    distance: '北京·通州',
    statusText: '已取消',
    statusColor: 'gray',
    actions: [],
    suggestions: ['为什么取消了', '可以重新下单吗', '其他景点推荐'],
  },
  {
    id: 'scenic-presale-refund-success',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'refund_success',
    orderStatusLabel: '退款成功',
    productName: '【早鸟特惠】北京环球影城指定单日成人票',
    price: 418.0,
    thumbnail: '🎢',
    tags: ['退款成功', '随时退'],
    storeName: '北京环球影城度假区',
    distance: '北京·通州',
    statusText: '退款成功',
    statusColor: 'green',
    extension: {
      type: 'refund_success',
      title: '退款成功',
      info: [
        { label: '退款金额', value: '¥418.00' },
        { label: '退款方式', value: '原路退回' },
        { label: '到账时间', value: '2026-06-28 15:32' },
      ],
    },
    actions: [],
    suggestions: ['退到哪里了', '多久到账的', '其他景点推荐'],
  },
  {
    id: 'scenic-presale-refund-fail',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'refund_fail',
    orderStatusLabel: '退款失败',
    productName: '【早鸟特惠】北京环球影城指定单日成人票',
    price: 418.0,
    thumbnail: '🎢',
    tags: ['退款失败'],
    storeName: '北京环球影城度假区',
    distance: '北京·通州',
    statusText: '退款失败',
    statusColor: 'red',
    actions: [],
    suggestions: ['为什么退款失败', '可以重新申请吗', '怎么联系客服'],
  },
  {
    id: 'scenic-calendar-pending-pay',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'calendar_ticket',
    productTypeLabel: '日历票',
    orderStatus: 'pending_pay',
    orderStatusLabel: '待支付',
    productName: '上海迪士尼度假区1日票 成人票 7月1日',
    price: 475.0,
    thumbnail: '🏰',
    tags: ['成人票', '指定日'],
    storeName: '上海迪士尼度假区',
    distance: '上海·浦东',
    statusText: '待支付',
    statusColor: 'orange',
    extension: {
      type: 'scenic_entry',
      title: '入园信息',
      info: [
        { label: '入园日期', value: '2026年7月1日 周三' },
        { label: '入园时间', value: '08:30 - 20:30' },
        { label: '支付倒计时', value: '27分30秒' },
      ],
    },
    actions: [
      { label: '立即支付', type: 'primary' },
    ],
    suggestions: ['可以用优惠券吗', '怎么取消订单', '支持什么支付方式'],
    voucherInfo: {
      code: 'DNY202607010088',
      number: 'NO.DNY202607010088',
      validDate: '2026-07-01 当日有效',
      notes: ['凭身份证入园', '需预约', '不与其他优惠同享'],
    },
  },
  {
    id: 'scenic-calendar-booking-confirming',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'calendar_ticket',
    productTypeLabel: '日历票',
    orderStatus: 'booking_confirming',
    orderStatusLabel: '预订确认中',
    productName: '上海迪士尼度假区1日票 成人票 7月1日',
    price: 475.0,
    thumbnail: '🏰',
    tags: ['确认中', '成人票'],
    storeName: '上海迪士尼度假区',
    distance: '上海·浦东',
    statusText: '确认中',
    statusColor: 'blue',
    extension: {
      type: 'scenic_entry',
      title: '入园信息',
      info: [
        { label: '入园日期', value: '2026年7月1日 周三' },
        { label: '入园时间', value: '08:30 - 20:30' },
        { label: '确认状态', value: '景区确认中' },
      ],
    },
    actions: [],
    suggestions: ['多久能确认', '可以取消吗', '确认失败怎么办'],
  },
  {
    id: 'scenic-calendar-booked',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'calendar_ticket',
    productTypeLabel: '日历票',
    orderStatus: 'booked',
    orderStatusLabel: '预订成功',
    productName: '上海迪士尼度假区1日票 成人票 7月1日',
    price: 475.0,
    thumbnail: '🏰',
    tags: ['已预订', '成人票'],
    storeName: '上海迪士尼度假区',
    distance: '上海·浦东',
    statusText: '预订成功',
    statusColor: 'green',
    extension: {
      type: 'scenic_entry',
      title: '入园信息',
      info: [
        { label: '入园日期', value: '2026年7月1日 周三' },
        { label: '入园时间', value: '08:30 - 20:30' },

      ],
    },
    actions: [],
    suggestions: ['一站式游玩攻略', '必玩项目推荐', '怎么去最方便', '有什么演出'],
  },
  {
    id: 'scenic-calendar-entered',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'calendar_ticket',
    productTypeLabel: '日历票',
    orderStatus: 'entered',
    orderStatusLabel: '已入园',
    productName: '上海迪士尼度假区1日票 成人票 7月1日',
    price: 475.0,
    thumbnail: '🏰',
    tags: ['已入园', '成人票'],
    storeName: '上海迪士尼度假区',
    distance: '上海·浦东',
    statusText: '已入园',
    statusColor: 'green',
    extension: {
      type: 'scenic_entry',
      title: '入园信息',
      info: [
        { label: '入园日期', value: '2026年7月1日 周三' },
        { label: '入园时间', value: '09:15' },
        { label: '状态', value: '已入园' },
      ],
    },
    actions: [],
    suggestions: ['必玩项目推荐', '快速通道怎么用', '花车几点'],
  },
  {
    id: 'scenic-calendar-completed',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'calendar_ticket',
    productTypeLabel: '日历票',
    orderStatus: 'completed',
    orderStatusLabel: '交易完成',
    productName: '上海迪士尼度假区1日票 成人票 7月1日',
    price: 475.0,
    thumbnail: '🏰',
    tags: ['已结束', '成人票'],
    storeName: '上海迪士尼度假区',
    distance: '上海·浦东',
    statusText: '交易完成',
    statusColor: 'gray',
    actions: [
      { label: '再来一单', type: 'primary' },
      { label: '去评价', type: 'secondary' },
    ],
    suggestions: ['再次预订', '游玩攻略', '怎么开发票', '下次什么时候去'],
  },
  {
    id: 'scenic-calendar-cancelled',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'calendar_ticket',
    productTypeLabel: '日历票',
    orderStatus: 'cancelled',
    orderStatusLabel: '已取消',
    productName: '上海迪士尼度假区1日票 成人票 7月1日',
    price: 475.0,
    thumbnail: '🏰',
    tags: ['已取消', '未支付'],
    storeName: '上海迪士尼度假区',
    distance: '上海·浦东',
    statusText: '已取消',
    statusColor: 'gray',
    actions: [],
    suggestions: ['再次预订', '为什么取消了', '可以重新预订吗', '其他日期推荐'],
  },
  {
    id: 'scenic-calendar-refunding',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'calendar_ticket',
    productTypeLabel: '日历票',
    orderStatus: 'refunding',
    orderStatusLabel: '退款中',
    productName: '上海迪士尼度假区1日票 成人票 7月1日',
    price: 475.0,
    thumbnail: '🏰',
    tags: ['退款中'],
    storeName: '上海迪士尼度假区',
    distance: '上海·浦东',
    statusText: '退款中',
    statusColor: 'gray',
    extension: {
      type: 'refund',
      title: '退款进度',
      info: [
        { label: '退款金额', value: '¥475.00' },
        { label: '退款方式', value: '原路退回' },
        { label: '预计到账', value: '1-3个工作日' },
      ],
      steps: [
        { label: '提交申请', state: 'done' },
        { label: '商家审核', state: 'active' },
        { label: '退款到账', state: 'pending' },
      ],
    },
    actions: [],
    suggestions: ['多久能到账', '可以取消退款吗', '退到哪里'],
  },
  {
    id: 'scenic-calendar-refund-success',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'calendar_ticket',
    productTypeLabel: '日历票',
    orderStatus: 'refund_success',
    orderStatusLabel: '退款成功',
    productName: '上海迪士尼度假区1日票 成人票 7月1日',
    price: 475.0,
    thumbnail: '🏰',
    tags: ['退款成功'],
    storeName: '上海迪士尼度假区',
    distance: '上海·浦东',
    statusText: '退款成功',
    statusColor: 'green',
    extension: {
      type: 'refund_success',
      title: '退款成功',
      info: [
        { label: '退款金额', value: '¥475.00' },
        { label: '退款方式', value: '原路退回' },
        { label: '到账时间', value: '2026-06-28 15:32' },
      ],
    },
    actions: [],
    suggestions: ['再次预订', '退到哪里了', '多久到账的', '其他日期推荐'],
  },
  {
    id: 'scenic-calendar-refund-fail',
    category: 'scenic',
    categoryLabel: '景区',
    productType: 'calendar_ticket',
    productTypeLabel: '日历票',
    orderStatus: 'refund_fail',
    orderStatusLabel: '退款失败',
    productName: '上海迪士尼度假区1日票 成人票 7月1日',
    price: 475.0,
    thumbnail: '🏰',
    tags: ['退款失败'],
    storeName: '上海迪士尼度假区',
    distance: '上海·浦东',
    statusText: '退款失败',
    statusColor: 'red',
    actions: [
      { label: '联系客服', type: 'primary' },
    ],
    suggestions: ['为什么退款失败', '可以重新申请吗', '怎么联系客服'],
  },
  {
    id: 'general-group-pending-pay',
    category: 'general',
    categoryLabel: '综合',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    orderStatus: 'pending_pay',
    orderStatusLabel: '待支付',
    productName: '【周末通用】足道养生SPA 70分钟全身按摩',
    price: 199.0,
    thumbnail: '💆',
    tags: ['全身按摩', '随时退'],
    storeName: '华夏良子（国贸店）',
    distance: '0.8km',
    statusText: '待支付',
    statusColor: 'orange',
    extension: {
      type: 'payment_countdown',
      title: '支付倒计时',
      info: [{ label: '剩余时间', value: '26分15秒' }],
    },
    actions: [
      { label: '立即支付', type: 'primary' },
    ],
    suggestions: ['可以用优惠券吗', '怎么取消订单', '支持什么支付方式'],
    voucherInfo: {
      code: 'HX202606300066',
      number: 'NO.HX202606300066',
      validDate: '2026-06-30 至 2026-12-31',
      notes: ['凭券码到店核销使用', '需提前1天预约', '周末节假日通用'],
    },
  },
  {
    id: 'general-group-completed',
    category: 'general',
    categoryLabel: '综合',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    orderStatus: 'completed',
    orderStatusLabel: '交易完成',
    productName: '【周末通用】足道养生SPA 70分钟全身按摩',
    price: 199.0,
    thumbnail: '💆',
    tags: ['已核销'],
    storeName: '华夏良子（国贸店）',
    distance: '0.8km',
    statusText: '交易完成',
    statusColor: 'gray',
    actions: [
      { label: '再来一单', type: 'primary' },
      { label: '去评价', type: 'secondary' },
    ],
    suggestions: ['体验怎么样', '怎么开发票', '再来一单'],
  },
  {
    id: 'general-group-cancelled',
    category: 'general',
    categoryLabel: '综合',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    orderStatus: 'cancelled',
    orderStatusLabel: '已取消',
    productName: '【周末通用】足道养生SPA 70分钟全身按摩',
    price: 199.0,
    thumbnail: '💆',
    tags: ['已取消', '未支付'],
    storeName: '华夏良子（国贸店）',
    distance: '0.8km',
    statusText: '已取消',
    statusColor: 'gray',
    actions: [],
    suggestions: ['为什么取消了', '可以重新下单吗', '类似推荐'],
  },
  {
    id: 'general-group-refunding',
    category: 'general',
    categoryLabel: '综合',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    orderStatus: 'refunding',
    orderStatusLabel: '退款中',
    productName: '【周末通用】足道养生SPA 70分钟全身按摩',
    price: 199.0,
    thumbnail: '💆',
    tags: ['退款中'],
    storeName: '华夏良子（国贸店）',
    distance: '0.8km',
    statusText: '退款中',
    statusColor: 'gray',
    extension: {
      type: 'refund',
      title: '退款进度',
      info: [
        { label: '退款金额', value: '¥199.00' },
        { label: '退款方式', value: '原路退回' },
        { label: '预计到账', value: '1-3个工作日' },
      ],
      steps: [
        { label: '提交申请', state: 'done' },
        { label: '商家审核', state: 'active' },
        { label: '退款到账', state: 'pending' },
      ],
    },
    actions: [],
    suggestions: ['多久能到账', '可以取消退款吗', '退到哪里'],
  },
  {
    id: 'general-group-refund-success',
    category: 'general',
    categoryLabel: '综合',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    orderStatus: 'refund_success',
    orderStatusLabel: '退款成功',
    productName: '【周末通用】足道养生SPA 70分钟全身按摩',
    price: 199.0,
    thumbnail: '💆',
    tags: ['退款成功'],
    storeName: '华夏良子（国贸店）',
    distance: '0.8km',
    statusText: '退款成功',
    statusColor: 'green',
    extension: {
      type: 'refund_success',
      title: '退款成功',
      info: [
        { label: '退款金额', value: '¥199.00' },
        { label: '退款方式', value: '原路退回' },
        { label: '到账时间', value: '2026-06-28 15:32' },
      ],
    },
    actions: [],
    suggestions: ['退到哪里了', '多久到账的', '其他门店推荐'],
  },
  {
    id: 'general-group-refund-fail',
    category: 'general',
    categoryLabel: '综合',
    productType: 'group_voucher',
    productTypeLabel: '团购券',
    orderStatus: 'refund_fail',
    orderStatusLabel: '退款失败',
    productName: '【周末通用】足道养生SPA 70分钟全身按摩',
    price: 199.0,
    thumbnail: '💆',
    tags: ['退款失败'],
    storeName: '华夏良子（国贸店）',
    distance: '0.8km',
    statusText: '退款失败',
    statusColor: 'red',
    actions: [],
    suggestions: ['为什么退款失败', '可以重新申请吗', '怎么联系客服'],
  },
  {
    id: 'travel-presale-completed',
    category: 'travel_agency',
    categoryLabel: '旅行社',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'completed',
    orderStatusLabel: '交易完成',
    productName: '云南大理丽江6日5晚跟团游 纯玩无购物',
    price: 2999.0,
    thumbnail: '✈️',
    tags: ['纯玩团', '已结束'],
    storeName: '携程旅游专营店',
    distance: '2.3km',
    statusText: '交易完成',
    statusColor: 'gray',
    actions: [
      { label: '再来一单', type: 'primary' },
      { label: '去评价', type: 'secondary' },
    ],
    suggestions: ['行程怎么样', '怎么开发票', '其他路线推荐'],
  },
  {
    id: 'travel-presale-cancelled',
    category: 'travel_agency',
    categoryLabel: '旅行社',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'cancelled',
    orderStatusLabel: '已取消',
    productName: '云南大理丽江6日5晚跟团游 纯玩无购物',
    price: 2999.0,
    thumbnail: '✈️',
    tags: ['已取消', '未支付'],
    storeName: '携程旅游专营店',
    distance: '2.3km',
    statusText: '已取消',
    statusColor: 'gray',
    actions: [],
    suggestions: ['为什么取消了', '可以重新下单吗', '其他路线推荐'],
  },
  {
    id: 'travel-presale-refund-success',
    category: 'travel_agency',
    categoryLabel: '旅行社',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'refund_success',
    orderStatusLabel: '退款成功',
    productName: '云南大理丽江6日5晚跟团游 纯玩无购物',
    price: 2999.0,
    thumbnail: '✈️',
    tags: ['退款成功'],
    storeName: '携程旅游专营店',
    distance: '2.3km',
    statusText: '退款成功',
    statusColor: 'green',
    extension: {
      type: 'refund_success',
      title: '退款成功',
      info: [
        { label: '退款金额', value: '¥2999.00' },
        { label: '退款方式', value: '原路退回' },
        { label: '到账时间', value: '2026-06-28 15:32' },
      ],
    },
    actions: [],
    suggestions: ['退到哪里了', '多久到账的', '其他路线推荐'],
  },
  {
    id: 'travel-presale-refund-fail',
    category: 'travel_agency',
    categoryLabel: '旅行社',
    productType: 'presale_voucher',
    productTypeLabel: '预售券',
    orderStatus: 'refund_fail',
    orderStatusLabel: '退款失败',
    productName: '云南大理丽江6日5晚跟团游 纯玩无购物',
    price: 2999.0,
    thumbnail: '✈️',
    tags: ['退款失败'],
    storeName: '携程旅游专营店',
    distance: '2.3km',
    statusText: '退款失败',
    statusColor: 'red',
    actions: [],
    suggestions: ['为什么退款失败', '可以重新申请吗', '怎么联系客服'],
  },
];

export function AiOrderCardDemo() {
  const [activeTab, setActiveTab] = useState<'full' | 'compact' | 'scenes' | 'function'>('full');
  const [expandedCompact, setExpandedCompact] = useState<string | null>(null);
  const [showFunctionCard, setShowFunctionCard] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterProductType, setFilterProductType] = useState<string>('all');
  const [filterRedeemMethod, setFilterRedeemMethod] = useState<string>('all');
  const [filterOrderStatus, setFilterOrderStatus] = useState<string>('all');
  const [reservationOpen, setReservationOpen] = useState(false);
  const [reservationOrder, setReservationOrder] = useState<DemoOrder | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderOrder, setReminderOrder] = useState<DemoOrder | null>(null);
  const [demoReservationResult, setDemoReservationResult] = useState<ReservationInfoCardData | null>(null);
  const [demoReminderResult, setDemoReminderResult] = useState<RedeemReminder | null>(null);
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherOrder, setVoucherOrder] = useState<DemoOrder | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      document.querySelectorAll('.demo-suggestions-list').forEach(el => {
        el.scrollLeft = el.scrollWidth;
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab, filterCategory, filterProductType, filterOrderStatus, expandedCompact]);

  useEffect(() => {
    const sliders = document.querySelectorAll<HTMLElement>('.demo-suggestions-list');
    const handlers: { el: HTMLElement; down: (e: MouseEvent) => void; move: (e: MouseEvent) => void; up: () => void; leave: () => void }[] = [];

    sliders.forEach(el => {
      let isDown = false;
      let startX = 0;
      let scrollLeft = 0;

      const onMouseDown = (e: MouseEvent) => {
        isDown = true;
        el.classList.add('dragging');
        startX = e.pageX - el.offsetLeft;
        scrollLeft = el.scrollLeft;
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - el.offsetLeft;
        const walk = (x - startX) * 1.5;
        el.scrollLeft = scrollLeft - walk;
      };

      const onMouseUp = () => {
        isDown = false;
        el.classList.remove('dragging');
      };

      const onMouseLeave = () => {
        isDown = false;
        el.classList.remove('dragging');
      };

      el.addEventListener('mousedown', onMouseDown);
      el.addEventListener('mousemove', onMouseMove);
      el.addEventListener('mouseup', onMouseUp);
      el.addEventListener('mouseleave', onMouseLeave);

      handlers.push({ el, down: onMouseDown, move: onMouseMove, up: onMouseUp, leave: onMouseLeave });
    });

    return () => {
      handlers.forEach(h => {
        h.el.removeEventListener('mousedown', h.down);
        h.el.removeEventListener('mousemove', h.move);
        h.el.removeEventListener('mouseup', h.up);
        h.el.removeEventListener('mouseleave', h.leave);
      });
    };
  }, [activeTab, filterCategory, filterProductType, filterOrderStatus, expandedCompact]);

  const categoryOptions = [
    { value: 'all', label: '全部行业' },
    { value: 'food', label: '餐饮' },
    { value: 'hotel', label: '酒店' },
    { value: 'scenic', label: '景区' },
    { value: 'general', label: '综合' },
    { value: 'travel_agency', label: '旅行社' },
  ];

  const productTypeOptions = [
    { value: 'all', label: '全部类型' },
    { value: 'group_voucher', label: '团购券' },
    { value: 'presale_voucher', label: '预售券' },
    { value: 'calendar_room', label: '日历房' },
    { value: 'calendar_ticket', label: '日历票' },
  ];

  const redeemMethodOptions = [
    { value: 'all', label: '全部履约方式' },
    { value: 'voucher', label: '到店套餐' },
    { value: 'self_order', label: '自提' },
    { value: 'delivery', label: '外卖' },
  ];

  const orderStatusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'pending_pay', label: '待支付' },
    { value: 'unused', label: '待使用' },
    { value: 'pending_accept', label: '待接单' },
    { value: 'preparing', label: '制作中' },
    { value: 'delivering', label: '配送中' },
    { value: 'waiting_pickup', label: '待取餐' },
    { value: 'picked_up', label: '已取餐' },
    { value: 'to_book', label: '待预约' },
    { value: 'booking_confirming', label: '预约确认中' },
    { value: 'booked', label: '预约成功' },
    { value: 'checked_in', label: '已入住' },
    { value: 'entered', label: '已入园' },
    { value: 'pending_travel', label: '待出行' },
    { value: 'in_travel', label: '行程中' },
    { value: 'refunding', label: '退款中' },
    { value: 'refund_success', label: '退款成功' },
    { value: 'refund_fail', label: '退款失败' },
    { value: 'cancelled', label: '已取消' },
    { value: 'completed', label: '已完成' },
  ];

  const handleActionClick = (order: DemoOrder, actionLabel: string) => {
    if (actionLabel.includes('帮我约')) {
      setReservationOrder(order);
      setReservationOpen(true);
    } else if (actionLabel.includes('使用提醒')) {
      setReminderOrder(order);
      setReminderOpen(true);
    } else if (actionLabel.includes('查看券码')) {
      setVoucherOrder(order);
      setVoucherOpen(true);
    }
  };

  const filteredOrders = demoOrders.filter(order => {
    if (filterCategory !== 'all' && order.category !== filterCategory) return false;
    if (filterProductType !== 'all' && order.productType !== filterProductType) return false;
    if (filterRedeemMethod !== 'all' && order.redeemMethod !== filterRedeemMethod) return false;
    if (filterOrderStatus !== 'all' && order.orderStatus !== filterOrderStatus) return false;
    return true;
  });

  const resetFilters = () => {
    setFilterCategory('all');
    setFilterProductType('all');
    setFilterRedeemMethod('all');
    setFilterOrderStatus('all');
  };

  const renderButtonIcon = (label: string) => {
    if (label.startsWith('⏰')) {
      return (
        <svg className="demo-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="13" r="8"/>
          <path d="M12 9v4l2 2"/>
          <path d="M5 3 2 6"/>
          <path d="m22 6-3-3"/>
          <path d="M6.38 18.7 4 21"/>
          <path d="M20 21l-2.38-2.3"/>
        </svg>
      );
    }
    if (label.startsWith('🎫')) {
      return (
        <svg className="demo-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
          <path d="M13 5v2"/>
          <path d="M13 17v2"/>
          <path d="M13 11v2"/>
        </svg>
      );
    }
    return null;
  };

  const getButtonText = (label: string) => {
    if (label.startsWith('⏰') || label.startsWith('🎫')) {
      return label.slice(2);
    }
    return label;
  };

  const renderOrderCard = (order: DemoOrder, mode: 'full' | 'compact' = 'full') => {
    const isCompact = mode === 'compact';
    const isExpanded = expandedCompact === order.id;

    return (
      <div
        key={order.id}
        className={`demo-order-card ${isCompact ? 'compact' : 'full'}`}
        onClick={() => {
          if (isCompact) {
            setExpandedCompact(isExpanded ? null : order.id);
          }
        }}
      >
        <div className="demo-card-base">
          <div className="demo-card-thumb">{order.thumbnail}</div>
          <div className="demo-card-info">
            <div className="demo-card-title-row">
              <div className="demo-card-title-main">
                <div className="demo-card-name">{order.productName}</div>
                <div className="demo-card-tags">
                  {order.tags.map((tag, i) => (
                    <span key={i} className="demo-tag">
                      {i > 0 && <span className="demo-tag-sep">·</span>}
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="demo-card-right">
                <div className={`demo-card-status status-${order.statusColor}`}>
                  {order.statusText}
                </div>
                <div className="demo-card-price">
                  <span className="demo-price-symbol">¥</span>
                  <span className="demo-price-num">{order.price.toFixed(2)}</span>
                </div>
              </div>
            </div>
            {!order.hideStoreLine && order.storeName && !order.extension?.hotelInfo && !order.extension?.scenicInfo && order.extension?.type !== 'scenic_entry' && order.extension?.type !== 'hotel_stay' && (
              <div className="demo-card-store">
                {order.category !== 'travel_agency' && (
                  <span className="demo-store-distance">{order.distance}</span>
                )}
                <span className="demo-store-name">{order.storeName}</span>
                <div className="demo-store-actions">
                  {order.category !== 'travel_agency' && (
                    <button className="demo-store-icon-btn" title="导航">
                      <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                        <path d="M2.5 12L13.5 2.5L8.5 13.5L6.8 10.7L4 11.5L2.5 12Z" fill="#86909c"/>
                      </svg>
                    </button>
                  )}
                  <button className="demo-store-icon-btn" title="电话">
                    <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                      <path d="M3.5 2.5L5.5 2L7 5.5L5.5 6.5C6 7.5 7 8.5 8 9.5C9 10.5 10 11 11 11.5L12 10L15 11.5V14C15 14.5 14.5 15 14 15C6 15 1.5 10.5 1.5 3C1.5 2.5 2 2.5 2.5 2.5Z" fill="#86909c"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {!isCompact && order.extension && order.extension.type !== 'payment_countdown' && (
          <div className="demo-card-extension">
            {order.extension.type === 'delivery_completed' ? (
              <div
                className="demo-delivery-completed"
                onClick={() => {
                  setExpandedDelivery(expandedDelivery === order.id ? null : order.id);
                }}
              >
                <div className="demo-delivery-summary">
                  <span className="demo-delivery-summary-text">{order.extension.summary}</span>
                  <span className="demo-delivery-arrow">
                    {expandedDelivery === order.id ? '∧' : '∨'}
                  </span>
                </div>
                {expandedDelivery === order.id && order.extension.steps && (
                  <div className="demo-delivery-detail">
                    <div className="demo-progress-steps">
                      {order.extension.steps.map((step, i) => (
                        <div key={i} className={`demo-step ${step.state}`}>
                          <div className="demo-step-dot"></div>
                          <div className="demo-step-label">{step.label}</div>
                          {i < order.extension!.steps!.length - 1 && <div className="demo-step-line"></div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {order.extension.type === 'pickup_code' && order.extension.hasPickupCode === false ? (
                  null
                ) : order.extension.type === 'pickup_code' && order.extension.pickupCode ? (
                  <div className="demo-pickup-simple">
                    <span className="demo-pickup-code">{order.extension.pickupCode}</span>
                    <span className="demo-pickup-time">{order.extension.pickupTime}</span>
                  </div>
                ) : order.extension.type === 'hotel_stay' && order.extension.hotelInfo ? (
                  <div className="demo-hotel-extension">
                    <div className="demo-hotel-stay-row">
                      <span className="demo-hotel-stay-label">入住酒店</span>
                      <span className="demo-hotel-stay-name">{order.extension.hotelInfo.hotelName}</span>
                      <div className="demo-hotel-stay-actions">
                        <button className="demo-hotel-icon-btn" title="导航">
                          <svg className="demo-nav-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                          </svg>
                        </button>
                        <button className="demo-hotel-icon-btn" title="电话">📞</button>
                      </div>
                    </div>
                    <div className="demo-hotel-date-row">
                      <span className="demo-hotel-date-label">入住</span>
                      <span className="demo-hotel-date-value">{order.extension.hotelInfo.checkInDate}</span>
                      <span className="demo-hotel-nights">{order.extension.hotelInfo.nights}晚</span>
                      <span className="demo-hotel-date-label">离店</span>
                      <span className="demo-hotel-date-value">{order.extension.hotelInfo.checkOutDate}</span>
                    </div>
                  </div>
                ) : order.extension.type === 'scenic_entry' ? (
                  <div className="demo-hotel-extension">
                    <div className="demo-hotel-stay-row">
                      <span className="demo-hotel-stay-label">景区名称</span>
                      <span className="demo-hotel-stay-name">
                        {order.extension.scenicInfo?.scenicName || order.storeName}
                      </span>
                      <div className="demo-hotel-stay-actions">
                        <button className="demo-hotel-icon-btn" title="导航">
                          <svg className="demo-nav-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                          </svg>
                        </button>
                        <button className="demo-hotel-icon-btn" title="电话">📞</button>
                      </div>
                    </div>
                    <div className="demo-hotel-date-row">
                      <span className="demo-hotel-date-label">入园时间</span>
                      <span className="demo-hotel-date-value">
                        {order.extension.scenicInfo
                          ? `${order.extension.scenicInfo.visitDate} ${order.extension.scenicInfo.entryTime}`
                          : `${order.extension.info?.find((i: { label: string; value: string }) => i.label === '入园日期')?.value || ''} ${order.extension.info?.find((i: { label: string; value: string }) => i.label === '入园时间')?.value || ''}`.trim()}
                      </span>
                    </div>
                  </div>
                ) : order.extension.type === 'refund' || order.extension.type === 'refund_success' ? (
                  <div className="demo-refund-status">
                    <span className="demo-refund-status-text">
                      {order.extension.type === 'refund' ? '商家审核中' : '已原路退回'}
                    </span>
                    <span className="demo-refund-status-amount">
                      {order.extension.info?.find((i: { label: string; value: string }) => i.label === '退款金额')?.value || ''}
                    </span>
                  </div>
                ) : (
                  <>
                    {order.extension.type === 'progress' && (
                      <div className="demo-progress-header">
                        <span className="demo-progress-title">
                          {order.extension.title.includes('配送') ? (
                            <svg className="demo-progress-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="5.5" cy="17.5" r="2.5"/>
                              <circle cx="18.5" cy="17.5" r="2.5"/>
                              <path d="M15 17.5h-5V14h-3l3-7h4l1.5 5H18v4.5z"/>
                              <path d="M8 10h4"/>
                            </svg>
                          ) : order.extension.title.includes('取餐') ? (
                            <svg className="demo-progress-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6 7h12l1 13H5L6 7z"/>
                              <path d="M9 7a3 3 0 0 1 6 0"/>
                              <path d="M6 11h12"/>
                            </svg>
                          ) : (
                            <svg className="demo-progress-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="13" r="8"/>
                              <path d="M12 9v4l2 2"/>
                              <path d="M5 3 2 6"/>
                              <path d="m22 6-3-3"/>
                            </svg>
                          )}
                          {order.extension.title}
                        </span>
                        {order.extension.estimatedTime && (
                          <span className={`demo-progress-estimate ${order.extension.title.includes('取餐') || order.extension.title.includes('履约') ? 'orange' : 'blue'}`}>
                            {order.extension.estimatedTime}
                          </span>
                        )}
                      </div>
                    )}
                    {order.extension.steps && (
                      <div className="demo-progress-steps">
                        {order.extension.steps.map((step, i) => (
                          <div key={i} className={`demo-step ${step.state}`}>
                            <div className="demo-step-dot"></div>
                            <div className="demo-step-label">{step.label}</div>
                            {step.time && <div className="demo-step-time">{step.time}</div>}
                            {i < order.extension!.steps!.length - 1 && <div className="demo-step-line"></div>}
                          </div>
                        ))}
                      </div>
                    )}
                    {order.extension.info && (
                      <div className="demo-info-list">
                        {order.extension.info.map((item, i) => (
                          <div key={i} className="demo-info-item">
                            <span className="demo-info-label">{item.label}</span>
                            <span className="demo-info-value">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {!isCompact && (order.actions.length > 0 || order.extension?.type === 'payment_countdown' || order.paymentCountdown) && (
          <div className={`demo-card-actions ${order.extension?.type === 'payment_countdown' || order.paymentCountdown ? 'with-countdown' : ''}`}>
            {(order.extension?.type === 'payment_countdown' || order.paymentCountdown) && (
              <div className="demo-payment-countdown">
                <span className="demo-countdown-value">
                  {order.paymentCountdown || order.extension?.info?.[0]?.value || (order.extension?.summary?.replace(/后订单自动取消/g, '') || '')}
                </span>
              </div>
            )}
            <div className="demo-action-btns">
              {order.actions.filter(a => a.type === 'secondary').map((action, i) => (
                <button
                  key={`sec-${i}`}
                  className={`demo-action-btn ${action.type}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActionClick(order, action.label);
                  }}
                >
                  {renderButtonIcon(action.label)}
                  {getButtonText(action.label)}
                </button>
              ))}
              {order.urgeReason && (
                <span className="demo-urge-reason">{order.urgeReason}</span>
              )}
              {order.actions.filter(a => a.type === 'primary').map((action, i) => (
                <button
                  key={`pri-${i}`}
                  className={`demo-action-btn ${action.type}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActionClick(order, action.label);
                  }}
                >
                  {renderButtonIcon(action.label)}
                  {getButtonText(action.label)}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isCompact && order.suggestions.length > 0 && (
          <div className="demo-card-suggestions">
            <div className="demo-suggestions-list">
              {order.suggestions.map((s, i) => (
                <button key={i} className="demo-suggestion-btn">
                  {s.replace(/\？|\?/g, '')}
                </button>
              ))}
            </div>
          </div>
        )}

        {isCompact && isExpanded && (
          <div className="demo-compact-expand">
            {order.extension && (
              <div className="demo-card-extension">
                {order.extension.type === 'hotel_stay' && order.extension.hotelInfo ? (
                  <div className="demo-hotel-extension">
                    <div className="demo-hotel-stay-row">
                      <span className="demo-hotel-stay-label">入住酒店</span>
                      <span className="demo-hotel-stay-name">{order.extension.hotelInfo.hotelName}</span>
                      <div className="demo-hotel-stay-actions">
                        <button className="demo-hotel-icon-btn" title="导航">
                          <svg className="demo-nav-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                          </svg>
                        </button>
                        <button className="demo-hotel-icon-btn" title="电话">📞</button>
                      </div>
                    </div>
                    <div className="demo-hotel-date-row">
                      <span className="demo-hotel-date-label">入住</span>
                      <span className="demo-hotel-date-value">{order.extension.hotelInfo.checkInDate}</span>
                      <span className="demo-hotel-nights">{order.extension.hotelInfo.nights}晚</span>
                      <span className="demo-hotel-date-label">离店</span>
                      <span className="demo-hotel-date-value">{order.extension.hotelInfo.checkOutDate}</span>
                    </div>
                  </div>
                ) : order.extension.type === 'scenic_entry' ? (
                  <div className="demo-hotel-extension">
                    <div className="demo-hotel-stay-row">
                      <span className="demo-hotel-stay-label">景区名称</span>
                      <span className="demo-hotel-stay-name">
                        {order.extension.scenicInfo?.scenicName || order.storeName}
                      </span>
                      <div className="demo-hotel-stay-actions">
                        <button className="demo-hotel-icon-btn" title="导航">
                          <svg className="demo-nav-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                          </svg>
                        </button>
                        <button className="demo-hotel-icon-btn" title="电话">📞</button>
                      </div>
                    </div>
                    <div className="demo-hotel-date-row">
                      <span className="demo-hotel-date-label">入园时间</span>
                      <span className="demo-hotel-date-value">
                        {order.extension.scenicInfo
                          ? `${order.extension.scenicInfo.visitDate} ${order.extension.scenicInfo.entryTime}`
                          : `${order.extension.info?.find((i: { label: string; value: string }) => i.label === '入园日期')?.value || ''} ${order.extension.info?.find((i: { label: string; value: string }) => i.label === '入园时间')?.value || ''}`.trim()}
                      </span>
                    </div>
                  </div>
                ) : order.extension.type === 'refund' || order.extension.type === 'refund_success' ? (
                  <div className="demo-refund-status">
                    <span className="demo-refund-status-text">
                      {order.extension.type === 'refund' ? '商家审核中' : '已原路退回'}
                    </span>
                    <span className="demo-refund-status-amount">
                      {order.extension.info?.find((i: { label: string; value: string }) => i.label === '退款金额')?.value || ''}
                    </span>
                  </div>
                ) : (
                  <>
                    {order.extension.type === 'progress' && (
                      <div className="demo-progress-header">
                        <span className="demo-progress-title">
                          {order.extension.title.includes('配送') ? (
                            <svg className="demo-progress-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="5.5" cy="17.5" r="2.5"/>
                              <circle cx="18.5" cy="17.5" r="2.5"/>
                              <path d="M15 17.5h-5V14h-3l3-7h4l1.5 5H18v4.5z"/>
                              <path d="M8 10h4"/>
                            </svg>
                          ) : order.extension.title.includes('取餐') ? (
                            <svg className="demo-progress-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6 7h12l1 13H5L6 7z"/>
                              <path d="M9 7a3 3 0 0 1 6 0"/>
                              <path d="M6 11h12"/>
                            </svg>
                          ) : (
                            <svg className="demo-progress-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="13" r="8"/>
                              <path d="M12 9v4l2 2"/>
                              <path d="M5 3 2 6"/>
                              <path d="m22 6-3-3"/>
                            </svg>
                          )}
                          {order.extension.title}
                        </span>
                        {order.extension.estimatedTime && (
                          <span className={`demo-progress-estimate ${order.extension.title.includes('取餐') || order.extension.title.includes('履约') ? 'orange' : 'blue'}`}>
                            {order.extension.estimatedTime}
                          </span>
                        )}
                      </div>
                    )}
                    {order.extension.steps && (
                      <div className="demo-progress-steps">
                        {order.extension.steps.map((step, i) => (
                          <div key={i} className={`demo-step ${step.state}`}>
                            <div className="demo-step-dot"></div>
                            <div className="demo-step-label">{step.label}</div>
                            {step.time && <div className="demo-step-time">{step.time}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                    {order.extension.info && (
                      <div className="demo-info-list">
                        {order.extension.info.map((item, i) => (
                          <div key={i} className="demo-info-item">
                            <span className="demo-info-label">{item.label}</span>
                            <span className="demo-info-value">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {order.actions.length > 0 && (
              <div className="demo-card-actions">
                {order.actions.filter(a => a.type === 'secondary').map((action, i) => (
                  <button
                    key={`sec-${i}`}
                    className={`demo-action-btn ${action.type}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActionClick(order, action.label);
                    }}
                  >
                    {renderButtonIcon(action.label)}
                    {getButtonText(action.label)}
                  </button>
                ))}
                {order.urgeReason && (
                  <span className="demo-urge-reason">{order.urgeReason}</span>
                )}
                {order.actions.filter(a => a.type === 'primary').map((action, i) => (
                  <button
                    key={`pri-${i}`}
                    className={`demo-action-btn ${action.type}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActionClick(order, action.label);
                    }}
                  >
                    {renderButtonIcon(action.label)}
                    {getButtonText(action.label)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderFunctionCardDemo = () => (
    <div className="demo-function-cards">
      <div className="demo-function-section">
        <div className="demo-section-title">📅 帮我约</div>
        <div className="demo-function-desc">点击下方按钮，拉起预约选择弹层（复用 V1.1 预约面板）</div>
        <div className="demo-function-card simple">
          <div className="demo-func-card-header">
            <span className="demo-func-icon">📅</span>
            <span>上海迪士尼度假区 1日票 成人票</span>
          </div>
          <div className="demo-func-card-cta">
            <button
              className="demo-func-btn primary"
              onClick={() => {
                setReservationOrder(demoOrders.find(o => o.id === 'scenic-ticket-tobook') || demoOrders[0]);
                setReservationOpen(true);
              }}
            >
              立即预约
            </button>
          </div>
          {demoReservationResult && (
            <div className="demo-result-badge">
              ✅ 已预约：{demoReservationResult.arrivalTime} · {demoReservationResult.pax}人
            </div>
          )}
        </div>
      </div>

      <div className="demo-function-section">
        <div className="demo-section-title">⏰ 使用提醒</div>
        <div className="demo-function-desc">点击下方按钮，拉起使用提醒设置弹层（复用 V1.1 提醒面板）</div>
        <div className="demo-function-card simple">
          <div className="demo-func-card-header">
            <span className="demo-func-icon">⏰</span>
            <span>【热销爆款】单人下午茶套餐 咖啡+蛋糕</span>
          </div>
          <div className="demo-func-card-cta">
            <button
              className="demo-func-btn primary"
              onClick={() => {
                setReminderOrder(demoOrders.find(o => o.id === 'food-voucher-unused') || demoOrders[0]);
                setReminderOpen(true);
              }}
            >
              设置提醒
            </button>
          </div>
          {demoReminderResult && (
            <div className="demo-result-badge">
              ✅ 已设置：{new Date(demoReminderResult.remindAt).toLocaleDateString()} 提醒
            </div>
          )}
        </div>
      </div>

      <div className="demo-function-section">
        <div className="demo-section-title">💰 退款申请</div>
        <div className="demo-function-card">
          <div className="demo-func-card-header">
            <span className="demo-func-icon">💰</span>
            <span>申请退款</span>
          </div>
          <div className="demo-func-card-product">
            巨无霸套餐 中薯 可乐(中) 三人餐 · ¥88.00
          </div>
          <div className="demo-refund-notice">
            当前支持全额退款，退款 ¥88.00 将原路退回
          </div>
          <div className="demo-func-form">
            <div className="demo-func-row">
              <span className="demo-func-label">退款原因</span>
              <div className="demo-func-reasons">
                {['不想要了', '计划有变', '商家原因', '其他'].map((r, i) => (
                  <div key={i} className={`demo-reason-item ${i === 0 ? 'active' : ''}`}>
                    <span className="demo-reason-radio"></span>
                    {r}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="demo-func-card-footer">
            <button className="demo-func-btn secondary">取消</button>
            <button className="demo-func-btn danger">确认退款</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderScenesDemo = () => (
    <div className="demo-scenes">
      <div className="demo-scene-section">
        <div className="demo-section-title">📍 场景一：订单详情页入口带入</div>
        <div className="demo-scene-desc">从订单详情页点击 AI 入口进入，自动带入当前订单卡片</div>
        <div className="demo-chat-mock">
          <div className="demo-msg assistant">
            <div className="demo-msg-avatar">🤖</div>
            <div className="demo-msg-content">
              {renderOrderCard(demoOrders[1], 'full')}
              <div className="demo-msg-text">
                您好～这是您的「星巴克单人下午茶套餐」订单，请问有什么可以帮您的？
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="demo-scene-section">
        <div className="demo-section-title">➕ 场景二：手动选择订单带入</div>
        <div className="demo-scene-desc">点击底部 + 号选择订单，在聊天流中插入订单卡片</div>
        <div className="demo-chat-mock">
          <div className="demo-msg assistant">
            <div className="demo-msg-avatar">🤖</div>
            <div className="demo-msg-content">
              <div className="demo-msg-text">您好，请问有什么可以帮您的？</div>
            </div>
          </div>
          <div className="demo-msg user">
            <div className="demo-msg-content">
              <div className="demo-msg-text">我想查一下我的订单</div>
            </div>
          </div>
          <div className="demo-msg assistant">
            <div className="demo-msg-avatar">🤖</div>
            <div className="demo-msg-content">
              <div className="demo-msg-text">为您找到以下订单：</div>
              <div className="demo-multi-cards">
                {demoOrders.slice(0, 3).map(order => renderOrderCard(order, 'full'))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="demo-scene-section">
        <div className="demo-section-title">💬 场景三：自然语言查询</div>
        <div className="demo-scene-desc">用户输入"我的订单到哪了"，AI 解析后展示匹配订单</div>
        <div className="demo-chat-mock">
          <div className="demo-msg user">
            <div className="demo-msg-content">
              <div className="demo-msg-text">我的外卖到哪了？</div>
            </div>
          </div>
          <div className="demo-msg assistant">
            <div className="demo-msg-avatar">🤖</div>
            <div className="demo-msg-content">
              <div className="demo-msg-text">您的麦当劳订单正在配送中，骑手距离您约 1.2km，预计 8 分钟送达 🚀</div>
              {renderOrderCard(demoOrders[0], 'full')}
            </div>
          </div>
        </div>
      </div>

      <div className="demo-scene-section">
        <div className="demo-section-title">🔔 场景四：气泡消息带入</div>
        <div className="demo-scene-desc">点击气泡推送进入助手，自动带入关联订单 + 突出对应模块</div>
        <div className="demo-chat-mock">
          <div className="demo-bubble-entry">
            <div className="demo-bubble-icon">📦</div>
            <div className="demo-bubble-content">
              <div className="demo-bubble-title">骑手已取餐</div>
              <div className="demo-bubble-desc">您的麦当劳订单正在快马加鞭赶来～</div>
            </div>
          </div>
          <div className="demo-msg assistant">
            <div className="demo-msg-avatar">🤖</div>
            <div className="demo-msg-content">
              <div className="demo-msg-text">
                您的订单骑手已取餐，正在配送中 🛵
              </div>
              {renderOrderCard(demoOrders[0], 'full')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="ai-order-card-demo">
      <div className="demo-header">
        <div className="demo-title">团小帮 · 订单卡片 Demo</div>
        <div className="demo-subtitle">四层架构 · 5大行业 · 4种带入场景</div>
      </div>

      <div className="demo-tabs">
        <button
          className={`demo-tab ${activeTab === 'full' ? 'active' : ''}`}
          onClick={() => setActiveTab('full')}
        >
          完整卡片
        </button>
        <button
          className={`demo-tab ${activeTab === 'compact' ? 'active' : ''}`}
          onClick={() => setActiveTab('compact')}
        >
          精简卡片
        </button>
        <button
          className={`demo-tab ${activeTab === 'function' ? 'active' : ''}`}
          onClick={() => setActiveTab('function')}
        >
          功能卡片
        </button>
        <button
          className={`demo-tab ${activeTab === 'scenes' ? 'active' : ''}`}
          onClick={() => setActiveTab('scenes')}
        >
          带入场景
        </button>
      </div>

      {(activeTab === 'full' || activeTab === 'compact') && (
        <div className="demo-filters">
          <div className="demo-filter-row">
            <div className="demo-filter-group">
              <div className="demo-filter-label">行业</div>
              <div className="demo-filter-options">
                {categoryOptions.map(opt => (
                  <button
                    key={opt.value}
                    className={`demo-filter-chip ${filterCategory === opt.value ? 'active' : ''}`}
                    onClick={() => {
                      setFilterCategory(opt.value);
                      if (opt.value !== 'food') {
                        setFilterRedeemMethod('all');
                      }
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="demo-filter-row">
            <div className="demo-filter-group">
              <div className="demo-filter-label">商品类型</div>
              <div className="demo-filter-options">
                {productTypeOptions.map(opt => (
                  <button
                    key={opt.value}
                    className={`demo-filter-chip ${filterProductType === opt.value ? 'active' : ''}`}
                    onClick={() => setFilterProductType(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {filterCategory === 'food' && (
            <div className="demo-filter-row">
              <div className="demo-filter-group">
                <div className="demo-filter-label">履约方式</div>
                <div className="demo-filter-options">
                  {redeemMethodOptions.map(opt => (
                    <button
                      key={opt.value}
                      className={`demo-filter-chip ${filterRedeemMethod === opt.value ? 'active' : ''}`}
                      onClick={() => setFilterRedeemMethod(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="demo-filter-row">
            <div className="demo-filter-group">
              <div className="demo-filter-label">订单状态</div>
              <div className="demo-filter-options">
                {orderStatusOptions.map(opt => (
                  <button
                    key={opt.value}
                    className={`demo-filter-chip ${filterOrderStatus === opt.value ? 'active' : ''}`}
                    onClick={() => setFilterOrderStatus(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="demo-filter-footer">
            <span className="demo-filter-count">共 {filteredOrders.length} 张卡片</span>
            <button className="demo-filter-reset" onClick={resetFilters}>重置筛选</button>
          </div>
        </div>
      )}

      <div className="demo-content">
        {activeTab === 'full' && (
          <div className="demo-card-list">
            {filteredOrders.length === 0 ? (
              <div className="demo-empty">暂无符合条件的订单卡片</div>
            ) : (
              filteredOrders.map((order, idx) => (
                <div key={`${order.id}-${idx}`} className="demo-card-item">
                  <div className="demo-card-label">{order.categoryLabel} · {order.productTypeLabel} · {order.orderStatusLabel}</div>
                  {renderOrderCard(order, 'full')}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'compact' && (
          <div className="demo-card-list">
            {filteredOrders.length === 0 ? (
              <div className="demo-empty">暂无符合条件的订单卡片</div>
            ) : (
              filteredOrders.map((order, idx) => (
                <div key={`${order.id}-compact-${idx}`} className="demo-card-item">
                  <div className="demo-card-label">{order.categoryLabel} · {order.productTypeLabel}（点击展开）</div>
                  {renderOrderCard(order, 'compact')}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'function' && renderFunctionCardDemo()}
        {activeTab === 'scenes' && renderScenesDemo()}
      </div>

      <ReservationPanel
        open={reservationOpen}
        onClose={() => setReservationOpen(false)}
        onConfirm={(data) => {
          setDemoReservationResult(data);
          setReservationOpen(false);
        }}
        storeName={reservationOrder?.storeName || '门店'}
        businessHours="09:00-22:00"
      />

      <RedeemReminderSheet
        orderId={reminderOrder?.id || null}
        productName={reminderOrder?.productName}
        validDate="2026-06-30 至 2026-12-31"
        open={reminderOpen}
        onClose={() => setReminderOpen(false)}
        onConfirm={(reminder) => {
          setDemoReminderResult(reminder);
        }}
      />

      <VoucherCodeSheet
        open={voucherOpen}
        onClose={() => setVoucherOpen(false)}
        storeName={voucherOrder?.storeName}
        productName={voucherOrder?.productName}
        voucherCode={voucherOrder?.voucherInfo?.code}
      />
    </div>
  );
}
