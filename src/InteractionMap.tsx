import { useState, useCallback, useMemo } from 'react';
import { ReservationFeatureCard } from './components/AiAssistant/FeatureCard/ReservationFeatureCard';
import { RedeemReminderFeatureCard } from './components/AiAssistant/FeatureCard/RedeemReminderFeatureCard';
import type { FeatureCardData } from './components/AiAssistant/FeatureCard/types';
import { ReservationInfoCard } from './components/AiAssistant/ReservationInfoCard';
import type { ReservationInfoCardData } from './components/AiAssistant/ReservationInfoCard';
import { RedeemReminderCard } from './components/AiAssistant/RedeemReminderCard';
import type { RedeemReminder } from './types';
import { FullOrderCard } from './components/AiAssistant/OrderCard/FullOrderCard';
import { OrderCardExtension } from './components/AiAssistant/OrderCard/OrderCardExtension';
import type { OrderCardData } from './components/AiAssistant/OrderCard/orderCardTypes';
import './interactionMap.css';
import './components/AiAssistant/aiAssistant.css';
import './components/AiAssistant/OrderCard/orderCard.css';

// ==================== Mock 数据 ====================

const MOCK_RESERVATION_FEATURE_CARD: FeatureCardData = {
  type: 'reservation_form',
  reservation: {
    storeName: '海底捞火锅(陆家嘴店)',
    businessHours: '10:00-22:00',
  },
};

const MOCK_REMINDER_FEATURE_CARD: FeatureCardData = {
  type: 'redeem_reminder',
  redeemReminder: {
    productName: '海底捞火锅 2-3人餐 团购券',
    validDate: '2026-08-31',
  },
};

const MOCK_RESERVATION_PENDING: ReservationInfoCardData = {
  orderId: 'MT20260701001',
  reservationNo: 'YY20260701001',
  serviceType: '堂食预约',
  storeName: '海底捞火锅(陆家嘴店)',
  storeAddress: '浦东新区陆家嘴环路1000号',
  businessHours: '10:00-22:00',
  arrivalTime: '2026-07-03 18:30',
  pax: 4,
  phone: '138****8888',
  acceptStatus: 'pending',
  estimatedAcceptTime: '3分钟内',
  acceptDeadlineAt: Date.now() + 3 * 60 * 1000,
};

const MOCK_RESERVATION_ACCEPTED: ReservationInfoCardData = {
  orderId: 'MT20260701002',
  reservationNo: 'YY20260701002',
  serviceType: '堂食预约',
  storeName: '西贝莜面村(五角场店)',
  storeAddress: '杨浦区邯郸路600号',
  businessHours: '11:00-21:30',
  arrivalTime: '2026-07-04 12:00',
  pax: 2,
  phone: '139****6666',
  acceptStatus: 'accepted',
  estimatedAcceptTime: '已确认',
  merchantAcceptAt: Date.now() - 1800 * 1000,
};

const MOCK_REMINDER: RedeemReminder = {
  id: 'rem-001',
  orderId: 'MT20260701003',
  remindAt: Date.now() + 1 * 24 * 60 * 60 * 1000,
  createdAt: Date.now() - 3600 * 1000,
  status: 'active',
};

// 餐饮待使用 - 券码核销
const ORDER_FOOD_UNUSED_VOUCHER: OrderCardData = {
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
};

// 餐饮待使用 - 支持点单核销
const ORDER_FOOD_UNUSED_SELFORDER: OrderCardData = {
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
};

// 餐饮备餐中 - 有取餐码
const ORDER_FOOD_PREPARING: OrderCardData = {
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
    type: 'pickup_code',
    title: '取餐码',
    pickupCode: 'A886',
    hasPickupCode: true,
    steps: [
      { label: '已下单', state: 'done', time: '14:20' },
      { label: '备餐中', state: 'active', time: '制作中' },
      { label: '待取餐', state: 'pending', time: '--' },
    ],
  },
  actions: [
    { label: '查看取餐码', type: 'primary' },
  ],
  suggestions: [],
};

// 餐饮备餐中2 - 有取餐码
const ORDER_FOOD_PREPARING_2: OrderCardData = {
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
    type: 'pickup_code',
    title: '取餐码',
    pickupCode: 'B233',
    hasPickupCode: true,
    steps: [
      { label: '已下单', state: 'done', time: '14:30' },
      { label: '备餐中', state: 'active', time: '制作中' },
      { label: '待取餐', state: 'pending', time: '--' },
    ],
  },
  actions: [
    { label: '查看取餐码', type: 'primary' },
  ],
  suggestions: [],
};

// 餐饮待取餐 - 有取餐码
const ORDER_FOOD_WAITING_PICKUP: OrderCardData = {
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
    type: 'pickup_code',
    title: '取餐码',
    pickupCode: 'C101',
    hasPickupCode: true,
    steps: [
      { label: '已下单', state: 'done', time: '14:10' },
      { label: '备餐中', state: 'done', time: '14:20' },
      { label: '待取餐', state: 'active', time: '请取餐' },
    ],
  },
  actions: [
    { label: '查看取餐码', type: 'primary' },
  ],
  suggestions: [],
};

// 餐饮配送中
const ORDER_FOOD_DELIVERING: OrderCardData = {
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
    estimatedTime: '预计 15:20 送达',
    steps: [
      { label: '已下单', state: 'done', time: '14:50' },
      { label: '商家已出餐', state: 'done', time: '15:00' },
      { label: '骑手配送中', state: 'active', time: '距您1.2km' },
      { label: '已送达', state: 'pending', time: '--' },
    ],
  },
  actions: [
    { label: '联系骑手', type: 'primary' },
    { label: '查看详情', type: 'secondary' },
  ],
  suggestions: [],
};

// 餐饮已完成 - 点单核销
const ORDER_FOOD_COMPLETED_SELFORDER: OrderCardData = {
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
    type: 'pickup_code',
    title: '取餐信息',
    pickupCode: 'A886',
    pickupTime: '14:32',
    hasPickupCode: true,
    channel: 'self_order',
  },
  actions: [
    { label: '再来一单', type: 'primary' },
    { label: '去评价', type: 'secondary' },
  ],
  suggestions: [],
};

// 餐饮已完成 - 券码核销（端内）
const ORDER_FOOD_COMPLETED_VOUCHER: OrderCardData = {
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
  tags: ['已核销'],
  storeName: '海底捞火锅(陆家嘴店)',
  distance: '1.2km',
  statusText: '已完成 · 6月20日核销',
  statusColor: '#10b981',
  actions: [
    { label: '再来一单', type: 'primary' },
    { label: '去评价', type: 'secondary' },
  ],
  suggestions: [],
};

// 餐饮已完成 - 券码核销（端外）
const ORDER_FOOD_COMPLETED_OFFCHANNEL: OrderCardData = {
  id: 'food-completed-offchannel',
  category: 'food',
  categoryLabel: '餐饮',
  productType: 'group_voucher',
  productTypeLabel: '团购券',
  redeemMethod: 'voucher',
  redeemMethodLabel: '到店用券',
  orderStatus: 'completed',
  orderStatusLabel: '已完成',
  productName: '星巴克 拿铁 大杯',
  price: 38,
  thumbnail: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&h=200&fit=crop',
  tags: ['已核销'],
  storeName: '星巴克(南京西路店)',
  distance: '1.5km',
  statusText: '已完成 · 6月18日核销',
  statusColor: '#10b981',
  extension: {
    type: 'pickup_code',
    title: '核销信息',
    hasPickupCode: false,
    channel: 'offline_merchant',
  },
  actions: [
    { label: '再来一单', type: 'primary' },
    { label: '去评价', type: 'secondary' },
  ],
  suggestions: [],
};

// 餐饮已完成 - 配送核销
const ORDER_FOOD_COMPLETED_DELIVERY: OrderCardData = {
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
  tags: ['已送达'],
  storeName: '必胜客(五角场店)',
  distance: '2.3km',
  statusText: '已完成 · 今日 12:45 送达',
  statusColor: '#10b981',
  extension: {
    type: 'delivery_completed',
    title: '配送完成',
    summary: '骑手已送达，请确认收货',
    steps: [
      { label: '已下单', state: 'done', time: '12:00' },
      { label: '商家已出餐', state: 'done', time: '12:20' },
      { label: '骑手配送中', state: 'done', time: '12:25' },
      { label: '已送达', state: 'done', time: '12:45' },
    ],
  },
  actions: [
    { label: '再来一单', type: 'primary' },
    { label: '去评价', type: 'secondary' },
  ],
  suggestions: [],
};

// 酒店订单
const ORDER_HOTEL: OrderCardData = {
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
  extension: {
    type: 'hotel_stay',
    title: '入住信息',
    hotelInfo: {
      hotelName: '上海外滩华尔道夫酒店',
      checkInDate: '7月10日 周五',
      checkOutDate: '7月12日 周日',
      nights: 2,
      statusTags: [{ text: '待入住', type: 'warn' }],
    },
  },
  actions: [
    { label: '立即预约', type: 'primary' },
    { label: '查看详情', type: 'secondary' },
  ],
  suggestions: ['催一下', '订单使用提醒'],
};

// 餐饮待使用 - 仅配送
const ORDER_FOOD_UNUSED_DELIVERY: OrderCardData = {
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
  productName: '麦当劳 麦辣鸡腿堡套餐',
  price: 39.9,
  thumbnail: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop',
  tags: ['配送免运费'],
  storeName: '麦当劳(徐家汇店)',
  distance: '1.8km',
  statusText: '待使用',
  statusColor: '#f59e0b',
  validDate: '有效期至 2026-08-15',
  actions: [
    { label: '立即配送', type: 'primary' },
    { label: '查看详情', type: 'secondary' },
  ],
  suggestions: ['订单使用提醒'],
};

// ==================== 场景定义 ====================

export type SceneStepType = 
  | 'text' 
  | 'order_card' 
  | 'reservation_card' 
  | 'reminder_card'
  | 'reservation_feature_card'
  | 'reminder_feature_card'
  | 'extension_only'
  | 'order_list'
  | 'quick_replies';

export type SceneStep = {
  role: 'user' | 'assistant';
  type: SceneStepType;
  content: string;
  quickReplies?: string[];
  orderCardData?: OrderCardData;
  reservationData?: ReservationInfoCardData;
  reminderData?: RedeemReminder;
  reminderProductName?: string;
  featureCardData?: FeatureCardData;
  extensionData?: OrderCardData['extension'];
  orderListData?: OrderCardData[];
};

export type Scene = {
  id: string;
  module: string;
  title: string;
  description: string;
  userPath: string[];
  systemLogic: string;
  steps: SceneStep[];
};

export type SceneModule = {
  id: string;
  name: string;
  icon: string;
  color: string;
  scenes: Scene[];
};

const SCENE_MODULES: SceneModule[] = [
  {
    id: 'reservation',
    name: '帮我约',
    icon: '📅',
    color: '#6366f1',
    scenes: [
      {
        id: 'res-1',
        module: '帮我约',
        title: '预约提示展示',
        description: '展示需要预约的订单时，卡片旁显示预约引导提示',
        userPath: [
          '用户进入 AI 助手界面',
          '系统带入需预约的订单',
          '订单卡片展示时附带预约建议'
        ],
        systemLogic: '根据订单类型（综合类/餐饮正餐）和当前时间场景，动态选择预约提示语模板，引导用户发起预约',
        steps: [
          {
            role: 'assistant',
            type: 'order_card',
            content: '',
            orderCardData: ORDER_FOOD_UNUSED_VOUCHER,
          },
          {
            role: 'assistant',
            type: 'text',
            content: '门店客流量大，提前预约免排队～',
            quickReplies: ['帮我约']
          }
        ]
      },
      {
        id: 'res-2',
        module: '帮我约',
        title: '意图识别与引导',
        description: '用户输入预约关键词，AI 识别意图并回复引导语',
        userPath: [
          '用户输入"帮我约一下"',
          'AI 识别预约意图',
          'AI 回复引导语 + 快捷按钮'
        ],
        systemLogic: '关键词匹配检测到预约意图（预约、帮我约、立即预约等），回复标准引导语并提供"帮我约"快捷入口',
        steps: [
          { role: 'user', type: 'text', content: '帮我约一下' },
          {
            role: 'assistant',
            type: 'text',
            content: '请告诉我你要预约什么时间、几个人，我会帮你预约最近的门店',
            quickReplies: ['帮我约']
          }
        ]
      },
      {
        id: 'res-3',
        module: '帮我约',
        title: '多轮信息收集 - 缺信息追问',
        description: '用户只提供部分信息时，AI 主动追问缺失项',
        userPath: [
          '用户说"明天晚上"',
          'AI 识别已收集日期+时间',
          'AI 追问人数信息'
        ],
        systemLogic: '解析用户输入中的日期、时间、人数信息，检测缺失项，按优先级依次追问',
        steps: [
          { role: 'user', type: 'text', content: '明天晚上' },
          {
            role: 'assistant',
            type: 'text',
            content: '好的，明天晚上几点呢？另外请问有几位用餐呀？'
          }
        ]
      },
      {
        id: 'res-4',
        module: '帮我约',
        title: '日期时间校验 - 不可约提示',
        description: '用户选择的时间不可预约时，提示并展示可约选项',
        userPath: [
          '用户说"今天晚上8点"',
          'AI 校验时间已过期',
          'AI 提示不可约并给出可约建议'
        ],
        systemLogic: '校验用户选择的日期和时间是否在可约范围内，不在范围内时展示可约时段列表供用户选择',
        steps: [
          { role: 'user', type: 'text', content: '今天晚上8点，2个人' },
          {
            role: 'assistant',
            type: 'text',
            content: '抱歉，今天晚上 8 点已经过了营业时间了。明天下午 6 点还有空位，是否需要帮你预约明天 18:00 呢？',
            quickReplies: ['预约明天18:00', '换个时间']
          }
        ]
      },
      {
        id: 'res-5',
        module: '帮我约',
        title: '生成预约卡片',
        description: '信息收集完成后，展示预约表单卡片供用户确认',
        userPath: [
          '用户提供完整信息（日期+时间+人数）',
          'AI 校验信息完整',
          '展示预约功能卡片，用户确认后提交'
        ],
        systemLogic: '所有必填信息收集完成后，自动发起预约，AI 助手发送预约卡片，状态为"预约确认中"',
        steps: [
          { role: 'user', type: 'text', content: '明天晚上6点半，4个人' },
          { role: 'assistant', type: 'text', content: '好的，已为您提交预约申请：' },
          {
            role: 'assistant',
            type: 'reservation_card',
            content: '',
            reservationData: MOCK_RESERVATION_PENDING,
          }
        ]
      }
    ]
  },
  {
    id: 'reminder',
    name: '订单使用提醒',
    icon: '⏰',
    color: '#f59e0b',
    scenes: [
      {
        id: 'rem-1',
        module: '订单使用提醒',
        title: '临期气泡提醒',
        description: '订单临期时，订单卡片旁弹出气泡提醒',
        userPath: [
          '用户打开订单详情页/AI助手',
          '订单卡片展示后 1.5 秒',
          '气泡弹出长文案提醒',
          '5 秒后收起为"临期提醒"短文案'
        ],
        systemLogic: '检测订单有效期，剩余 ≤7 天判定为临期。订单卡片展示后延迟 1.5 秒弹出气泡，5 秒后自动收起为短标签',
        steps: [
          {
            role: 'assistant',
            type: 'order_card',
            content: '',
            orderCardData: ORDER_FOOD_UNUSED_VOUCHER,
          },
          {
            role: 'assistant',
            type: 'text',
            content: '订单还有 3 天过期，请尽快使用～',
          }
        ]
      },
      {
        id: 'rem-2',
        module: '订单使用提醒',
        title: '意图识别与快捷选项',
        description: '用户输入提醒关键词，展示快捷日期选项',
        userPath: [
          '用户输入"设置一个提醒"',
          'AI 识别提醒意图',
          '回复引导语 + 快捷日期选项'
        ],
        systemLogic: '关键词匹配检测到提醒意图，根据订单有效期生成快捷日期选项（重叠去重、超期过滤），优先级：明天/后天 > 本周X > 下周X',
        steps: [
          { role: 'user', type: 'text', content: '设置一个提醒' },
          {
            role: 'assistant',
            type: 'text',
            content: '请告诉我提醒时间',
            quickReplies: ['明天', '后天', '本周五', '本周六', '本周日', '下周五', '最后一天', '过期前3天']
          }
        ]
      },
      {
        id: 'rem-3',
        module: '订单使用提醒',
        title: '有效期校验 - 超期提示',
        description: '提醒日期超过订单有效期时，提示并建议过期前一天',
        userPath: [
          '用户选择/输入超期日期',
          'AI 校验超过有效期',
          '提示超期 + 建议过期前一天提醒'
        ],
        systemLogic: '校验提醒日期是否在订单有效期内，超期时给出友好提示并一键设置过期前一天提醒的快捷选项',
        steps: [
          { role: 'user', type: 'text', content: '下周五提醒我' },
          {
            role: 'assistant',
            type: 'text',
            content: '提醒日期不可以超过订单有效期哦，是否需要在过期前一天提醒？',
            quickReplies: ['是，设置过期前一天', '我再想想']
          }
        ]
      },
      {
        id: 'rem-4',
        module: '订单使用提醒',
        title: '生成提醒卡片',
        description: '确认提醒日期后，展示提醒设置卡片',
        userPath: [
          '用户选择提醒日期',
          'AI 校验日期有效',
          '展示提醒功能卡片供用户确认设置'
        ],
        systemLogic: '用户选择提醒日期后，自动生成使用提醒卡片，显示提醒日期和订单信息',
        steps: [
          { role: 'user', type: 'text', content: '明天提醒我' },
          {
            role: 'assistant',
            type: 'reminder_card',
            content: '',
            reminderData: MOCK_REMINDER,
            reminderProductName: '海底捞火锅 2-3人餐 团购券',
          }
        ]
      }
    ]
  },
  {
    id: 'pickup',
    name: '取餐码查询',
    icon: '🎫',
    color: '#10b981',
    scenes: [
      {
        id: 'pick-1',
        module: '取餐码查询',
        title: '无前置订单 - 找到1个',
        description: '无订单上下文时查询取餐码，找到1个待取餐订单',
        userPath: [
          '用户输入"我的取餐码"',
          'AI 查询待取餐订单',
          '找到1个，发送订单卡片+取餐码'
        ],
        systemLogic: '无前置订单时，查询用户所有待取餐订单。找到1个时直接发送订单卡片并展示取餐码',
        steps: [
          { role: 'user', type: 'text', content: '我的取餐码是多少' },
          { role: 'assistant', type: 'text', content: '帮你找到一个待取餐订单，可以通过订单卡片查看取餐码' },
          {
            role: 'assistant',
            type: 'order_card',
            content: '',
            orderCardData: ORDER_FOOD_PREPARING,
          }
        ]
      },
      {
        id: 'pick-2',
        module: '取餐码查询',
        title: '无前置订单 - 找到多个',
        description: '无订单上下文时查询取餐码，找到多个待取餐订单',
        userPath: [
          '用户输入"取餐码"',
          'AI 查询到多个待取餐订单',
          '展示多个简化订单卡片'
        ],
        systemLogic: '查询到多个待取餐订单时，展示简化订单卡片列表，每张卡片显示基础信息和取餐码，超过2个时底部显示"查看全部"按钮',
        steps: [
          { role: 'user', type: 'text', content: '取餐码' },
          { role: 'assistant', type: 'text', content: '帮你找到 3 个待取餐订单：' },
          {
            role: 'assistant',
            type: 'order_list',
            content: '',
            orderListData: [ORDER_FOOD_PREPARING, ORDER_FOOD_PREPARING_2, ORDER_FOOD_WAITING_PICKUP],
          }
        ]
      },
      {
        id: 'pick-3',
        module: '取餐码查询',
        title: '无前置订单 - 未找到',
        description: '无订单上下文时查询取餐码，未找到待取餐订单',
        userPath: [
          '用户输入"取餐码"',
          'AI 查询无待取餐订单',
          '提示 + "选择订单"按钮'
        ],
        systemLogic: '未查询到待取餐订单时，给出友好提示并提供订单选择入口，用户可手动选择订单咨询',
        steps: [
          { role: 'user', type: 'text', content: '取餐码' },
          {
            role: 'assistant',
            type: 'text',
            content: '没有找到待取餐订单，可以选择要咨询的订单',
            quickReplies: ['选择订单']
          }
        ]
      },
      {
        id: 'pick-4',
        module: '取餐码查询',
        title: '有前置订单 - 非餐饮',
        description: '有非餐饮订单时查询取餐码，提示无取餐码',
        userPath: [
          'AI 助手中有酒店订单卡片',
          '用户输入"取餐码"',
          'AI 判断非餐饮，提示无取餐码'
        ],
        systemLogic: '第一层判断：订单行业。非餐饮类订单没有取餐码概念，直接提示并引导选择其他订单',
        steps: [
          { role: 'assistant', type: 'order_card', content: '', orderCardData: ORDER_HOTEL },
          { role: 'user', type: 'text', content: '取餐码' },
          {
            role: 'assistant',
            type: 'text',
            content: '您咨询的订单不是餐饮订单，没有取餐码，是否要咨询其他订单？',
            quickReplies: ['选择订单']
          }
        ]
      },
      {
        id: 'pick-5',
        module: '取餐码查询',
        title: '有前置订单 - 餐饮待使用（仅券码）',
        description: '餐饮待使用订单，仅支持券码核销',
        userPath: [
          'AI 助手中有餐饮待使用订单',
          '用户输入"取餐码"',
          'AI 判断仅券码核销，提示无取餐码'
        ],
        systemLogic: '第二层判断：订单状态。待使用状态下，判断履约模式。仅券码核销的订单需到店验券，暂无取餐码',
        steps: [
          { role: 'assistant', type: 'order_card', content: '', orderCardData: ORDER_FOOD_UNUSED_VOUCHER },
          { role: 'user', type: 'text', content: '我的取餐码' },
          {
            role: 'assistant',
            type: 'text',
            content: '订单还未使用没有取餐码，可以直接到店出示券码验券',
            quickReplies: ['查看券码']
          }
        ]
      },
      {
        id: 'pick-6',
        module: '取餐码查询',
        title: '有前置订单 - 餐饮待使用（支持点单）',
        description: '餐饮待使用订单，支持点单核销，引导点单',
        userPath: [
          'AI 助手中有点单核销订单',
          '用户输入"取餐码"',
          'AI 提示无取餐码，询问是否点单',
          '用户选择"是"，触发点单流程'
        ],
        systemLogic: '待使用且支持点单核销的订单，引导用户先点单。点单后订单状态流转为已确认/备餐中，生成取餐码',
        steps: [
          { role: 'assistant', type: 'order_card', content: '', orderCardData: ORDER_FOOD_UNUSED_SELFORDER },
          { role: 'user', type: 'text', content: '取餐码' },
          {
            role: 'assistant',
            type: 'text',
            content: '订单还未使用没有取餐码，是否需要我帮你点单？',
            quickReplies: ['是，帮我点单', '暂不需要']
          }
        ]
      },
      {
        id: 'pick-7',
        module: '取餐码查询',
        title: '有前置订单 - 餐饮待使用（仅配送）',
        description: '餐饮待使用订单，仅支持配送，引导预约配送',
        userPath: [
          'AI 助手中有配送类订单',
          '用户输入"取餐码"',
          'AI 提示无取餐码，询问是否预约配送'
        ],
        systemLogic: '待使用且仅支持配送的订单，没有取餐码概念，引导用户预约配送',
        steps: [
          { role: 'assistant', type: 'order_card', content: '', orderCardData: ORDER_FOOD_UNUSED_DELIVERY },
          { role: 'user', type: 'text', content: '取餐码' },
          {
            role: 'assistant',
            type: 'text',
            content: '订单还未使用没有取餐码，可以配送到家，是否需要我帮你预约配送？',
            quickReplies: ['是，预约配送', '暂不需要']
          }
        ]
      },
      {
        id: 'pick-8',
        module: '取餐码查询',
        title: '有前置订单 - 餐饮已完成（券码端内）',
        description: '餐饮已完成订单，抖音端内核销，提示无取餐码',
        userPath: [
          'AI 助手中有已完成券码订单',
          '用户输入"取餐码"',
          'AI 判断券码核销，提示无取餐码'
        ],
        systemLogic: '第三层判断：履约方式。已完成订单中，券码核销的订单没有取餐码记录，引导选择其他订单',
        steps: [
          { role: 'assistant', type: 'order_card', content: '', orderCardData: ORDER_FOOD_COMPLETED_VOUCHER },
          { role: 'user', type: 'text', content: '取餐码' },
          {
            role: 'assistant',
            type: 'text',
            content: '订单为券码核销，没有取餐码，是否要咨询其他订单？',
            quickReplies: ['选择订单']
          }
        ]
      },
      {
        id: 'pick-9',
        module: '取餐码查询',
        title: '有前置订单 - 餐饮已完成（券码端外）',
        description: '餐饮已完成订单，端外（商家App/小程序）核销',
        userPath: [
          'AI 助手中有已完成券码订单',
          '用户输入"取餐码"',
          'AI 判断为端外核销，提示通过原渠道查找'
        ],
        systemLogic: '已完成订单中，券码核销且为端外渠道（商家App/微信小程序）的订单，提示用户通过原渠道查找取餐码',
        steps: [
          { role: 'assistant', type: 'order_card', content: '', orderCardData: ORDER_FOOD_COMPLETED_OFFCHANNEL },
          { role: 'user', type: 'text', content: '取餐码' },
          {
            role: 'assistant',
            type: 'text',
            content: '没有找到取餐码，如果在商家App/微信小程序核销，可通过原渠道查找取餐码'
          }
        ]
      },
      {
        id: 'pick-10',
        module: '取餐码查询',
        title: '有前置订单 - 餐饮已完成（点单核销）',
        description: '餐饮已完成订单，点单核销，展示取餐码和进度',
        userPath: [
          'AI 助手中有已完成点单订单',
          '用户输入"取餐码"',
          'AI 展示取餐码和取餐进度'
        ],
        systemLogic: '已完成订单中，点单核销的订单有取餐码记录，展示取餐码和取餐信息',
        steps: [
          { role: 'assistant', type: 'order_card', content: '', orderCardData: ORDER_FOOD_COMPLETED_SELFORDER },
          { role: 'user', type: 'text', content: '取餐码' },
          { role: 'assistant', type: 'text', content: '已为你找到取餐码：' },
          {
            role: 'assistant',
            type: 'extension_only',
            content: '',
            extensionData: ORDER_FOOD_COMPLETED_SELFORDER.extension,
          }
        ]
      },
      {
        id: 'pick-11',
        module: '取餐码查询',
        title: '有前置订单 - 餐饮已完成（配送核销）',
        description: '餐饮已完成订单，配送核销，展示配送进度',
        userPath: [
          'AI 助手中有已完成配送订单',
          '用户输入"取餐码"',
          'AI 提示配送订单，展示配送进度'
        ],
        systemLogic: '已完成订单中，配送核销的订单没有取餐码，展示订单的配送进度信息',
        steps: [
          { role: 'assistant', type: 'order_card', content: '', orderCardData: ORDER_FOOD_COMPLETED_DELIVERY },
          { role: 'user', type: 'text', content: '取餐码' },
          { role: 'assistant', type: 'text', content: '订单为配送订单，无取餐码，可以查看配送进度' },
          {
            role: 'assistant',
            type: 'extension_only',
            content: '',
            extensionData: ORDER_FOOD_COMPLETED_DELIVERY.extension,
          }
        ]
      }
    ]
  },
  {
    id: 'delivery',
    name: '配送进度查询',
    icon: '🛵',
    color: '#3b82f6',
    scenes: [
      {
        id: 'del-1',
        module: '配送进度查询',
        title: '有前置订单 - 配送中',
        description: '有配送中订单时，展示配送进度',
        userPath: [
          'AI 助手中有配送中订单',
          '用户输入"外卖送到哪了"',
          'AI 展示配送进度'
        ],
        systemLogic: '识别配送查询意图后，判断前置订单状态。配送中订单展示进度条、骑手信息、预计送达时间',
        steps: [
          { role: 'assistant', type: 'order_card', content: '', orderCardData: ORDER_FOOD_DELIVERING },
          { role: 'user', type: 'text', content: '外卖送到哪了' },
          {
            role: 'assistant',
            type: 'extension_only',
            content: '',
            extensionData: ORDER_FOOD_DELIVERING.extension,
          }
        ]
      },
      {
        id: 'del-2',
        module: '配送进度查询',
        title: '无前置订单 - 找到配送中',
        description: '无订单上下文时查询配送，找到配送中订单',
        userPath: [
          '用户输入"我的外卖"',
          'AI 查询配送中订单',
          '找到并展示配送进度'
        ],
        systemLogic: '无前置订单时，查询用户所有配送中订单。找到时直接展示配送进度卡片',
        steps: [
          { role: 'user', type: 'text', content: '我的外卖到哪了' },
          { role: 'assistant', type: 'text', content: '帮你找到一个正在配送的订单：' },
          {
            role: 'assistant',
            type: 'order_card',
            content: '',
            orderCardData: ORDER_FOOD_DELIVERING,
          }
        ]
      },
      {
        id: 'del-3',
        module: '配送进度查询',
        title: '有前置订单 - 非配送订单',
        description: '有非配送订单时查询配送，引导选择订单',
        userPath: [
          'AI 助手中有非配送订单',
          '用户输入"配送进度"',
          'AI 提示非配送订单，引导选择'
        ],
        systemLogic: '前置订单为非配送类时，提示当前订单无配送信息，引导用户选择其他订单查询',
        steps: [
          { role: 'assistant', type: 'order_card', content: '', orderCardData: ORDER_FOOD_UNUSED_VOUCHER },
          { role: 'user', type: 'text', content: '配送进度' },
          {
            role: 'assistant',
            type: 'text',
            content: '您咨询的订单不是配送订单，是否要选择其他配送订单查询？',
            quickReplies: ['选择订单']
          }
        ]
      }
    ]
  }
];

// ==================== 渲染组件 ====================

const isImageUrl = (str: string): boolean => {
  return /^https?:\/\//i.test(str);
};

function OrderListPreview({ orders }: { orders: OrderCardData[] }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const displayOrders = orders.slice(0, 2);
  const hasMore = orders.length > 2;

  const handleImgError = (orderId: string) => {
    setImgErrors(prev => ({ ...prev, [orderId]: true }));
  };

  const renderThumbnail = (order: OrderCardData) => {
    if (!order.thumbnail) return null;

    if (isImageUrl(order.thumbnail) && !imgErrors[order.id]) {
      return (
        <img
          src={order.thumbnail}
          alt=""
          className="imap-order-list-thumb-img"
          onError={() => handleImgError(order.id)}
        />
      );
    }

    return <span className="imap-order-list-thumb-emoji">{order.thumbnail}</span>;
  };

  return (
    <div className="imap-order-list-wrapper">
      <div className="imap-order-list">
        {displayOrders.map((order) => (
          <div key={order.id} className="imap-order-list-item">
            <div className="imap-order-list-card">
              <div className="imap-order-list-thumb">
                {renderThumbnail(order)}
              </div>
              <div className="imap-order-list-info">
                <div className="imap-order-list-title-row">
                  <div className="imap-order-list-name">{order.productName}</div>
                  <div
                    className={`imap-order-list-status status-${order.statusColor}`}
                  >
                    {order.statusText}
                  </div>
                </div>
                <div className="imap-order-list-store">
                  {order.distance} {order.storeName}
                </div>
                <div className="imap-order-list-code-row">
                  <span className="imap-order-list-code">{order.extension?.pickupCode}</span>
                  <span className="imap-order-list-price">
                    <span className="oc-price-symbol">¥</span>
                    <span className="oc-price-num">{order.price.toFixed(2)}</span>
                  </span>
                </div>
              </div>
            </div>
            {order.extension?.steps && order.extension.steps.length > 0 && (
              <div className="imap-order-list-progress">
                <OrderCardExtension
                  order={{
                    ...order,
                    id: `list-${order.id}`,
                    extension: {
                      ...order.extension,
                      type: 'pickup_code',
                    },
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      {hasMore && (
        <button className="imap-view-all-btn" onClick={() => setSheetOpen(true)}>
          查看全部 {orders.length} 个订单
        </button>
      )}
      {sheetOpen && (
        <div className="imap-order-sheet-mask" onClick={() => setSheetOpen(false)}>
          <div className="imap-order-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="imap-order-sheet-handle"></div>
            <div className="imap-order-sheet-header">
              <span className="imap-order-sheet-title">全部待取餐订单</span>
              <span className="imap-order-sheet-count">共 {orders.length} 个</span>
            </div>
            <div className="imap-order-sheet-list">
              {orders.map((order) => (
                <div key={order.id} className="imap-order-sheet-item">
                  <FullOrderCard order={order} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepBubble({ step }: { step: SceneStep }) {
  const isUser = step.role === 'user';

  const renderContent = () => {
    switch (step.type) {
      case 'text':
        return (
          <div className="imap-step-text">
            <p>{step.content}</p>
            {step.quickReplies && step.quickReplies.length > 0 && (
              <div className="imap-quick-replies">
                {step.quickReplies.map((qr, i) => (
                  <span key={i} className="imap-quick-reply">{qr}</span>
                ))}
              </div>
            )}
          </div>
        );
      case 'order_card':
        return step.orderCardData ? (
          <div className="imap-order-card-wrapper">
            <FullOrderCard order={step.orderCardData} />
          </div>
        ) : null;
      case 'reservation_card':
        return step.reservationData ? (
          <div className="imap-reservation-wrapper">
            <ReservationInfoCard
              data={step.reservationData}
              now={Date.now()}
              onCancel={() => {}}
              onRebook={() => {}}
            />
          </div>
        ) : null;
      case 'reminder_card':
        return step.reminderData ? (
          <div className="imap-reminder-wrapper">
            <RedeemReminderCard
              reminder={step.reminderData}
              productName={step.reminderProductName || '订单使用提醒'}
              onCancel={() => {}}
              onModify={() => {}}
              onReset={() => {}}
            />
          </div>
        ) : null;
      case 'reservation_feature_card':
        return step.featureCardData ? (
          <div className="imap-feature-card-wrapper">
            <ReservationFeatureCard
              data={step.featureCardData}
              onConfirm={() => {}}
              onCancel={() => {}}
            />
          </div>
        ) : null;
      case 'reminder_feature_card':
        return step.featureCardData ? (
          <div className="imap-feature-card-wrapper">
            <RedeemReminderFeatureCard
              data={step.featureCardData}
              onConfirm={() => {}}
              onCancel={() => {}}
            />
          </div>
        ) : null;
      case 'extension_only':
        return step.extensionData ? (
          <div className="imap-extension-only-wrapper">
            <OrderCardExtension
              order={{
                id: 'ext-only',
                category: 'food',
                categoryLabel: '餐饮',
                productType: 'group_voucher',
                productTypeLabel: '团购券',
                orderStatus: 'unused',
                orderStatusLabel: '待使用',
                productName: '',
                price: 0,
                thumbnail: '',
                tags: [],
                storeName: '',
                distance: '',
                statusText: '',
                statusColor: '',
                extension: step.extensionData,
                actions: [],
                suggestions: [],
              }}
              defaultExpanded={true}
            />
          </div>
        ) : null;
      case 'order_list':
        return step.orderListData && step.orderListData.length > 0 ? (
          <OrderListPreview orders={step.orderListData} />
        ) : null;
      default:
        return <p>{step.content}</p>;
    }
  };

  return (
    <div className={`imap-step ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && <div className="imap-avatar">🤖</div>}
      <div className="imap-bubble-container">
        {renderContent()}
      </div>
      {isUser && <div className="imap-avatar user">👤</div>}
    </div>
  );
}

export default function InteractionMap() {
  const [selectedModuleId, setSelectedModuleId] = useState<string>('reservation');
  const [selectedSceneId, setSelectedSceneId] = useState<string>('res-1');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    reservation: true,
    reminder: true,
    pickup: true,
    delivery: true,
  });

  const currentModule = useMemo(
    () => SCENE_MODULES.find(m => m.id === selectedModuleId),
    [selectedModuleId]
  );
  const currentScene = useMemo(
    () => currentModule?.scenes.find(s => s.id === selectedSceneId),
    [currentModule, selectedSceneId]
  );

  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  }, []);

  const selectScene = useCallback((sceneId: string, moduleId: string) => {
    setSelectedSceneId(sceneId);
    setSelectedModuleId(moduleId);
  }, []);

  const totalScenes = SCENE_MODULES.reduce((sum, m) => sum + m.scenes.length, 0);

  return (
    <div className="imap-container">
      <div className="imap-header">
        <div className="imap-header-left">
          <h1 className="imap-title">🗺️ AI 助手全景交互图</h1>
          <p className="imap-subtitle">
            共 {SCENE_MODULES.length} 个功能模块 · {totalScenes} 个交互场景
          </p>
        </div>
        <div className="imap-header-right">
          {SCENE_MODULES.map(module => (
            <div key={module.id} className="imap-stat" style={{ borderLeft: `3px solid ${module.color}` }}>
              <span className="imap-stat-icon">{module.icon}</span>
              <span>{module.name}</span>
              <span className="imap-stat-count">{module.scenes.length}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="imap-body">
        <div className="imap-sidebar">
          <div className="imap-sidebar-header">场景导航</div>
          <div className="imap-module-list">
            {SCENE_MODULES.map(module => (
              <div key={module.id} className="imap-module">
                <div
                  className={`imap-module-header ${selectedModuleId === module.id ? 'active' : ''}`}
                  onClick={() => toggleModule(module.id)}
                  style={{ borderLeftColor: module.color }}
                >
                  <span className="imap-module-icon">{module.icon}</span>
                  <span className="imap-module-name">{module.name}</span>
                  <span className="imap-module-count">{module.scenes.length}</span>
                  <span className={`imap-module-arrow ${expandedModules[module.id] ? 'expanded' : ''}`}>
                    ▸
                  </span>
                </div>
                {expandedModules[module.id] && (
                  <div className="imap-scene-list">
                    {module.scenes.map((scene, index) => (
                      <div
                        key={scene.id}
                        className={`imap-scene-item ${selectedSceneId === scene.id ? 'active' : ''}`}
                        onClick={() => selectScene(scene.id, module.id)}
                      >
                        <span className="imap-scene-index" style={{ color: module.color }}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="imap-scene-title">{scene.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="imap-preview">
          {currentScene && (
            <>
              <div className="imap-preview-header">
                <div 
                  className="imap-scene-module-tag" 
                  style={{ 
                    backgroundColor: currentModule?.color + '15', 
                    color: currentModule?.color,
                    border: `1px solid ${currentModule?.color}30`
                  }}
                >
                  {currentModule?.icon} {currentScene.module}
                </div>
                <h2 className="imap-scene-title-large">{currentScene.title}</h2>
                <p className="imap-scene-desc">{currentScene.description}</p>
              </div>

              <div className="imap-info-grid">
                <div className="imap-info-card">
                  <div className="imap-info-card-title">👤 用户操作路径</div>
                  <ol className="imap-info-list">
                    {currentScene.userPath.map((path, i) => (
                      <li key={i}>{path}</li>
                    ))}
                  </ol>
                </div>
                <div className="imap-info-card">
                  <div className="imap-info-card-title">⚙️ 系统响应逻辑</div>
                  <p className="imap-logic-text">{currentScene.systemLogic}</p>
                </div>
              </div>

              <div className="imap-chat-preview">
                <div className="imap-chat-header">
                  <span className="imap-chat-title">💬 交互预览（真实组件）</span>
                  <span className="imap-chat-steps">{currentScene.steps.length} 个步骤</span>
                </div>
                <div className="imap-chat-body">
                  {currentScene.steps.map((step, i) => (
                    <StepBubble key={i} step={step} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
