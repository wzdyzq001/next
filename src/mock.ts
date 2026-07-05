// ===========================================================================
// 模拟数据层 / Mock data layer
// 真实工程中替换为后端订单服务调用即可。
// ===========================================================================

import type { HotelProductType, ScenicProductType, TravelProductType, OrderData, OrderListItem, OrderCategory, OrderStatus, RefundInfo } from './types';
import { validateNoticeTagsConsistency } from './redeemReminder';
import { CATEGORY_MAPPING_TABLE, type StandardCategory } from './categoryMapping';
import { toStandardCategory } from './types';

export interface ScenarioMock {
  id: string;
  name: string;
  tag: string;
  meta: string;
  /** 用户进入此场景时初始的提问 */
  question: string;
  order: OrderData;
}

export function mapStatusTextToOrderStatus(statusText: string): OrderStatus {
  if (statusText === '待支付') return 'pending_payment';
  if (statusText === '交易完成' || statusText === '已核销') return 'redeemed';
  if (statusText === '订单取消') return 'canceled';
  if (statusText === '退款成功') return 'refunded';
  if (statusText === '退款申请中') return 'refunding';
  if (statusText === '退款失败') return 'refund_failed';
  return 'unredeemed';
}

function getDefaultTotalQuantity(listItem: OrderListItem) {
  return listItem.totalQuantity ?? (listItem.category === 'fun' ? 2 : 1);
}

function getRefundQuantity(listItem: OrderListItem) {
  const totalQuantity = getDefaultTotalQuantity(listItem);
  return Math.min(listItem.refundQuantity ?? totalQuantity, totalQuantity);
}

export function buildRefundInfoFromListItem(listItem: OrderListItem): RefundInfo | undefined {
  const totalQuantity = getDefaultTotalQuantity(listItem);
  const refundQuantity = getRefundQuantity(listItem);
  const refundTimes = listItem.refundTimes ?? 1;
  const paymentMethod = ['支付宝', '抖音支付招商银行尾号 2688', '抖音月付', '微信支付'][Number(listItem.orderId.slice(-1)) % 4];

  if (listItem.statusText === '退款成功') {
    return {
      status: 'success',
      amount: Math.round((listItem.price / totalQuantity) * refundQuantity),
      totalQuantity,
      refundQuantity,
      refundTimes,
      paymentMethod,
      reason: refundQuantity < totalQuantity ? '部分商品退款成功' : '用户申请退款',
      updatedAt: '2026-06-18 15:20:00',
      progressSteps: [
        { label: '提交退款申请', time: '13:00', state: 'done' },
        { label: '平台/商家审核通过', time: '14:10', state: 'done' },
        { label: '钱款原路退回', time: '15:20', state: 'done' },
      ],
    };
  }

  if (listItem.statusText === '退款申请中') {
    return {
      status: 'refunding',
      amount: Math.round((listItem.price / totalQuantity) * refundQuantity),
      totalQuantity,
      refundQuantity,
      refundTimes,
      paymentMethod,
      reason: refundQuantity < totalQuantity ? '部分商品申请退款' : '用户申请退款',
      appliedAt: '2026-06-18 13:00:00',
      progressSteps: [
        { label: '提交退款申请', time: '13:00', state: 'done' },
        { label: '等待商家审核', time: '处理中', state: 'active' },
        { label: '审核通过后原路退回', time: '--:--', state: 'pending' },
      ],
    };
  }

  if (listItem.statusText === '退款失败') {
    return {
      status: 'failed',
      amount: Math.round((listItem.price / totalQuantity) * refundQuantity),
      totalQuantity,
      refundQuantity,
      refundTimes,
      paymentMethod,
      reason: refundQuantity < totalQuantity ? '部分商品申请退款' : '用户申请退款',
      failReason: '商家审核未通过或订单不满足退款规则',
      updatedAt: '2026-06-18 14:30:00',
      progressSteps: [
        { label: '提交退款申请', time: '13:00', state: 'done' },
        { label: '商家审核', time: '14:30', state: 'done' },
        { label: '退款失败', time: '14:30', state: 'active' },
      ],
    };
  }

  return undefined;
}

function inferScenarioCategory(order: OrderData): OrderCategory | undefined {
  if (order.category) return order.category;
  if (order.hotelInfo) return 'hotel';
  if (order.vacationInfo) return 'vacation';
  if (order.showInfo) return 'show';
  if (order.travelInfo) return 'travel';
  if (order.productRules?.playStrategy) return 'play';
  if (order.channel === 'miniprogram_self_order') return 'food';
  if (/咖啡|拿铁|美式|贝果|可颂|火锅|羊肉|餐|茶|饭|面|甜品/.test(`${order.store}${order.itemSummary}`)) {
    return 'food';
  }
  return undefined;
}

export const SCENARIOS: ScenarioMock[] = [
  {
    id: 'unredeemed_both',
    name: '待使用·点单/券码均支持',
    tag: 'CASE 01',
    meta: '待使用 · 可自助点单或到店券码',
    question: '我的取餐码呢？怎么找不到？订单号 RX2026061700123',
    order: {
      orderId: 'RX2026061700123',
      channel: 'miniprogram_self_order',
      status: 'unredeemed',
      redeemMethod: 'none',
      supportedRedeemMethods: ['self_order', 'voucher'],
      category: 'food',
      store: '南山·海岸城旗舰店',
      storeAddress: '深圳市南山区文心五路 33 号',
      itemSummary: '燕麦拿铁 (热) × 1，抹茶可颂 × 1',
      orderDetailUrl: '#/orders/RX2026061700123',
      productRules: {
        validDate: '2026-06-17 至 2026-06-30',
        notice: ['不与其他优惠同享', '限工作日使用'],
        packageDetails: ['燕麦拿铁 1杯', '抹茶可颂 1个'],
        featuredItems: ['人气推荐：燕麦拿铁'],
        recommendedPax: '建议1人使用',
        recommendedChoices: ['冰燕麦拿铁', '热燕麦拿铁'],
        refundRule: '随时退 · 过期自动退'
      },
      storeInfo: {
        name: '南山·海岸城旗舰店',
        address: '深圳市南山区文心五路 33 号',
        distance: '850m',
        phone: '0755-88888888',
        businessHours: '08:00 - 22:00',
        status: 'open'
      }
    },
  },
  {
    id: 'unredeemed_self_only',
    name: '待使用·仅点单核销',
    tag: 'CASE 02',
    meta: '待使用 · 可拉起AI助手点单',
    question: '我没有取餐码，帮我看下订单 RX2026061700224',
    order: {
      orderId: 'RX2026061700224',
      channel: 'miniprogram_self_order',
      status: 'unredeemed',
      redeemMethod: 'none',
      supportedRedeemMethods: ['self_order'],
      category: 'food',
      store: '前海·万象前海店',
      storeAddress: '深圳市南山区桂湾四路 169 号',
      itemSummary: '厚乳拿铁 (冰) × 1',
      orderDetailUrl: '#/orders/RX2026061700224',
    },
  },
  {
    id: 'unredeemed_voucher_only',
    name: '待使用·仅券码核销',
    tag: 'CASE 03',
    meta: '待使用 · 到店展示券码',
    question: '取餐码在哪里？订单 RX2026061700199',
    order: {
      orderId: 'RX2026061700199',
      channel: 'miniprogram_self_order',
      status: 'unredeemed',
      redeemMethod: 'none',
      supportedRedeemMethods: ['voucher'],
      category: 'food',
      store: '龙华·壹方天地店',
      storeAddress: '深圳市龙华区人民路 4022 号',
      itemSummary: '橙C美式 × 1，原味贝果 × 1',
      orderDetailUrl: '#/orders/RX2026061700199',
      voucherCode: 'QN-20260617-5567',
    },
  },
  {
    id: 'unredeemed_self_delivery',
    name: '待使用·点单/配送均支持',
    tag: 'CASE 03B',
    meta: '待使用 · 可点单或配送',
    question: '这个订单怎么用？订单 RX2026061700666',
    order: {
      orderId: 'RX2026061700666',
      channel: 'miniprogram_self_order',
      status: 'unredeemed',
      redeemMethod: 'none',
      supportedRedeemMethods: ['self_order', 'delivery'],
      category: 'food',
      store: '南山·科技园智慧餐厅',
      storeAddress: '深圳市南山区科技园科苑路 15 号',
      itemSummary: '黑椒牛肉饭 × 1，柠檬茶 × 1',
      orderDetailUrl: '#/orders/RX2026061700666',
      productRules: {
        validDate: '2026-06-17 至 2026-07-17',
        notice: ['可提前点单', '支持同城配送'],
        refundRule: '未使用可随时退',
      },
      storeInfo: {
        name: '南山·科技园智慧餐厅',
        address: '深圳市南山区科技园科苑路 15 号',
        distance: '620m',
        phone: '0755-66668888',
        businessHours: '10:00 - 21:30',
        status: 'open',
        crowdLevel: 'medium',
      },
    },
  },
  {
    id: 'unredeemed_delivery_voucher',
    name: '待使用·配送/券码均支持',
    tag: 'CASE 03C',
    meta: '待使用 · 可配送或看券码',
    question: '这个订单能配送吗？订单 RX2026061700777',
    order: {
      orderId: 'RX2026061700777',
      channel: 'miniprogram_self_order',
      status: 'unredeemed',
      redeemMethod: 'none',
      supportedRedeemMethods: ['voucher', 'delivery'],
      category: 'food',
      store: '罗湖·万象城轻食铺',
      storeAddress: '深圳市罗湖区宝安南路 1881 号',
      itemSummary: '鸡胸肉沙拉 × 1，鲜榨橙汁 × 1',
      orderDetailUrl: '#/orders/RX2026061700777',
      voucherCode: 'DL-20260617-7788',
      productRules: {
        validDate: '2026-06-17 至 2026-07-17',
        notice: ['支持到店券码核销', '可配送到家'],
        refundRule: '未使用可随时退',
      },
      storeInfo: {
        name: '罗湖·万象城轻食铺',
        address: '深圳市罗湖区宝安南路 1881 号',
        distance: '1.1km',
        phone: '0755-77779999',
        businessHours: '09:30 - 22:00',
        status: 'open',
        crowdLevel: 'low',
      },
    },
  },
  {
    id: 'self_order_redeemed',
    name: '点单核销·已分配取餐码',
    tag: 'CASE 04',
    meta: '正在制作 · 显示取餐码',
    question: '亲，我刚下完单，取餐码是多少呀？订单 RX2026061700088',
    order: {
      orderId: 'RX2026061700088',
      channel: 'miniprogram_self_order',
      status: 'redeemed',
      redeemMethod: 'self_order',
      store: '福田·卓越中心店',
      storeAddress: '深圳市福田区福华三路 88 号',
      itemSummary: '生椰拿铁 (冰) × 2',
      orderDetailUrl: '#/orders/RX2026061700088',
      pickupCode: 'A 0 7 3',
      progress: [
        { key: 'placed', label: '订单已下单', time: '14:02', state: 'done' },
        { key: 'queued', label: '门店已接单', time: '14:02', state: 'done' },
        { key: 'making', label: '咖啡师制作中', time: '14:04', state: 'active' },
        { key: 'ready', label: '出杯待取', state: 'pending' },
        { key: 'picked', label: '已被取走', state: 'pending' },
      ],
    },
  },
  {
    id: 'delivery',
    name: '配送核销',
    tag: 'CASE 05',
    meta: '无取餐码 · 展示配送进度',
    question: '我那杯咖啡的取餐码发我一下！订单 RX2026061700311',
    order: {
      orderId: 'RX2026061700311',
      channel: 'miniprogram_self_order',
      status: 'redeemed',
      redeemMethod: 'delivery',
      store: '罗湖·万象城店',
      itemSummary: '美式 (热) × 1，丹麦曲奇 × 1',
      orderDetailUrl: '#/orders/RX2026061700311',
      riderName: '周师傅',
      estimatedArrival: '预计 14:28 送达',
      fulfillmentAlert: {
        type: 'delivery_delay',
        severity: 'warning',
        title: '配送轻微延迟',
        description: '骑手当前路线稍有拥堵，预计延迟 5-8 分钟送达。已为您自动跟进，如有问题可联系骑手或客服。',
        suggestedActions: [
          { label: '联系骑手', action: 'contact_rider' },
          { label: '联系客服', action: 'contact_service' },
        ],
      },
      deliveryProgress: [
        { key: 'ordered', label: '订单已提交', time: '14:02', detail: '门店已收到配送订单', state: 'done' },
        { key: 'assigned', label: '骑手已接单', time: '14:08', detail: '周师傅正在前往门店', state: 'done' },
        { key: 'picked_up', label: '骑手已取货', time: '14:15', detail: '餐品已从罗湖·万象城店取出', state: 'done' },
        { key: 'delivering', label: '配送中', time: '14:19', detail: '距离收货地址约 1.2 公里', state: 'active' },
        { key: 'arrived', label: '已送达', detail: '等待骑手完成送达确认', state: 'pending' },
      ],
    },
  },
  {
    id: 'not_self_order',
    name: '非点单核销',
    tag: 'CASE 06',
    meta: '非点单核销 · 查看订单',
    question: '我的取餐码是哪个？券码我已经给店员看过了。订单 VC2026061700045',
    order: {
      orderId: 'VC2026061700045',
      channel: 'third_party',
      status: 'redeemed',
      redeemMethod: 'voucher',
      store: '宝安·壹方城店',
      itemSummary: '冰美式 × 1',
      orderDetailUrl: '#/orders/VC2026061700045',
      productRules: {
        validDate: '2026-06-16 至 2026-06-30',
        notice: ['仅限到店使用'],
        packageDetails: ['冰美式 1杯'],
        refundRule: '随时退'
      },
      storeInfo: {
        name: '宝安·壹方城店',
        address: '深圳市宝安区新湖路 99 号',
        distance: '1.2km',
        phone: '0755-66666666',
        businessHours: '09:00 - 22:30',
        status: 'open',
        crowdLevel: 'high',
        reservable: true
      }
    },
  },
  {
    id: 'refund_progress',
    name: '退款进度查询',
    tag: 'CASE 07',
    meta: '退款中 · 展示退款进度',
    question: '我申请的退款怎么还没到账？订单 MT2026061700200',
    order: {
      orderId: 'MT2026061700200',
      channel: 'third_party',
      status: 'refunding',
      redeemMethod: 'none',
      store: '牛街德兴顺铜锅涮肉(清华店)',
      itemSummary: '鲜肉现烤羊肉串（约20串）团购券',
      orderDetailUrl: '#/orders/MT2026061700200',
      refundInfo: {
        status: 'refunding',
        amount: 4699,
        reason: '拍错/多拍/不喜欢',
        appliedAt: '2026-06-17 13:00:00',
        progressSteps: [
          { label: '提交退款申请', time: '13:00', state: 'done' },
          { label: '商家处理中', time: '13:05', state: 'active' },
          { label: '退款成功', time: '--:--', state: 'pending' }
        ]
      }
    }
  },
  {
    id: 'play_strategy',
    name: '游玩订单咨询',
    tag: 'CASE 09',
    meta: '游玩订单 · 咨询入园与攻略',
    question: '这门票需要换票吗？附近有什么好吃的推荐？订单 MT2026061400503',
    order: {
      orderId: 'MT2026061400503',
      channel: 'third_party',
      status: 'unredeemed',
      redeemMethod: 'manual',
      store: '欢乐谷主题乐园',
      itemSummary: '成人全日票 · 周末通用',
      orderDetailUrl: '#/orders/MT2026061400503',
      productRules: {
        entryTime: '09:30 - 21:00',
        needExchangeTicket: false,
        validDate: '2026-06-14 至 2026-06-30',
        playStrategy: [
          '建议下午15:00后错峰入园，避开高峰期',
          '必玩项目：过山车、激流勇进、大摆锤',
          '可提前在小程序上预约快速通行证'
        ],
        notice: ['禁止携带大型宠物', '请保管好随身物品'],
        refundRule: '未使用可随时退'
      },
      storeInfo: {
        name: '欢乐谷主题乐园',
        address: '深圳市南山区侨城西街 1 号',
        distance: '4.2km',
        phone: '0755-22222222',
        businessHours: '09:30 - 21:30',
        status: 'open',
        imageUrl: 'https://images.unsplash.com/photo-1513885045260-6b3086b24c17?auto=format&fit=crop&q=80&w=200&h=200',
        mapUrl: 'https://map.baidu.com/'
      }
    }
  },
  {
    id: 'hotel_info',
    name: '住宿订单咨询',
    tag: 'CASE 10',
    meta: '住宿订单 · 咨询入离时间与设施',
    question: '几点能入住？含早餐吗？订单 MT2026061300604',
    order: {
      orderId: 'MT2026061300604',
      channel: 'third_party',
      status: 'redeemed',
      redeemMethod: 'manual',
      store: '深圳湾万丽酒店',
      itemSummary: '豪华海景大床房 · 含双早',
      orderDetailUrl: '#/orders/MT2026061300604',
      hotelInfo: {
        checkInTime: '14:00 之后',
        checkOutTime: '12:00 之前',
        breakfast: '含双早（用餐时间 07:00 - 10:30）',
        roomFacilities: ['免费 Wi-Fi', '海景浴缸', '智能客控', '胶囊咖啡机'],
        hotelPolicy: ['不可携带宠物', '入住需提供身份证件', '可延迟退房至14:00（视房态）']
      },
      storeInfo: {
        name: '深圳湾万丽酒店',
        address: '深圳市南山区科技南路 18 号',
        distance: '5.6km',
        phone: '0755-33333333',
        businessHours: '24小时营业',
        status: 'open',
        imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=200&h=200',
        mapUrl: 'https://map.baidu.com/'
      }
    }
  },
  {
    id: 'vacation_info',
    name: '度假订单咨询',
    tag: 'CASE 11',
    meta: '度假订单 · 咨询行程与集合信息',
    question: '我们的行程是几号出发？在哪个机场集合？订单 MT2026061000806',
    order: {
      orderId: 'MT2026061000806',
      channel: 'third_party',
      status: 'redeemed',
      redeemMethod: 'manual',
      store: '三亚5日纯玩小包团',
      itemSummary: '三亚5日4晚纯玩小包团 · 含往返机票',
      orderDetailUrl: '#/orders/MT2026061000806',
      vacationInfo: {
        departureDate: '2026-06-20',
        returnDate: '2026-06-24',
        agency: '海南椰风国际旅行社',
        passengers: ['张三', '李四'],
        gatheringInfo: '2026-06-20 07:00 深圳宝安国际机场 T3 航站楼 4 号门内集合'
      },
      productRules: {
        refundRule: '提前7天免费退订，7天内按比例扣除违约金',
        notice: ['请务必携带好有效身份证件', '当地气温较高，请注意防晒']
      }
    }
  },
  {
    id: 'show_info',
    name: '演出订单咨询',
    tag: 'CASE 12',
    meta: '演出订单 · 咨询时间与座位',
    question: '演唱会几点开始？我的座位在哪？订单 MT2026061600301',
    order: {
      orderId: 'MT2026061600301',
      channel: 'third_party',
      status: 'unredeemed',
      redeemMethod: 'manual',
      store: '2026陈小春巡回演唱会',
      itemSummary: '【北京】2026 陈小春 BIGMAN 巡回演唱会',
      orderDetailUrl: '#/orders/MT2026061600301',
      showInfo: {
        showTime: '2026-06-28 19:30',
        duration: '约 120 分钟',
        seatInfo: '内场 A 区 8 排 12 座',
        venue: '国家体育场（鸟巢）'
      },
      productRules: {
        refundRule: '不支持退换',
        notice: ['禁止携带荧光棒、激光笔等物品', '建议提前 90 分钟入场']
      }
    }
  },
  {
    id: 'travel_info',
    name: '旅行订单咨询',
    tag: 'CASE 13',
    meta: '机票/火车票订单',
    question: '这趟航班几点起飞？订单 MT2026061200705',
    order: {
      orderId: 'MT2026061200705',
      channel: 'third_party',
      status: 'redeemed',
      redeemMethod: 'manual',
      store: '南方航空 · 深圳-成都',
      itemSummary: '经济舱往返机票 · 含行李',
      orderDetailUrl: '#/orders/MT2026061200705',
      travelInfo: {
        departureTime: '2026-06-12 10:00',
        arrivalTime: '2026-06-12 12:30',
        departureStation: '深圳宝安国际机场 T3',
        arrivalStation: '成都天府国际机场 T2',
        seatClass: '经济舱',
        passenger: '张三'
      },
      productRules: {
        refundRule: '起飞前2小时可免费改签，退票收取手续费',
        notice: ['请提前120分钟到达机场办理值机', '免费托运行李额 20kg']
      }
    }
  },
  {
    id: 'fun_ktv',
    name: 'KTV订单咨询',
    tag: 'CASE 14',
    meta: '休闲娱乐 · KTV 预订',
    question: '这个包间能坐几个人？门店现在人多吗？订单 MT2026061800101',
    order: {
      orderId: 'MT2026061800101',
      channel: 'third_party',
      status: 'unredeemed',
      redeemMethod: 'manual',
      store: '星聚会KTV(南山店)',
      itemSummary: '【小包】3小时欢唱套餐',
      orderDetailUrl: '#/orders/MT2026061800101',
      productRules: {
        validDate: '2026-06-18 至 2026-07-18',
        notice: ['周一至周日可用', '包含果盘1份，爆米花1份，茶水1壶', '超出套餐时间按门市价收费'],
        applicableStoreCount: 1,
        recommendedPax: '建议 2-4 人使用',
        refundRule: '随时退 · 过期自动退'
      },
      storeInfo: {
        name: '星聚会KTV(南山店)',
        address: '深圳市南山区海德二道 288 号',
        distance: '2.5km',
        phone: '0755-88889999',
        businessHours: '14:00 - 02:00',
        status: 'open',
        crowdLevel: 'high',
        reservable: true,
        mapUrl: 'https://map.baidu.com/'
      }
    }
  },
  {
    id: 'fun_massage',
    name: '足疗按摩订单咨询',
    tag: 'CASE 15',
    meta: '休闲娱乐 · 足疗 SPA',
    question: '这个 SPA 包含什么项目？需要预约吗？订单 MT2026061800102',
    order: {
      orderId: 'MT2026061800102',
      channel: 'third_party',
      status: 'unredeemed',
      redeemMethod: 'manual',
      store: '康悦故事足疗SPA',
      itemSummary: '【招牌】全身精油SPA 90分钟',
      orderDetailUrl: '#/orders/MT2026061800102',
      productRules: {
        validDate: '2026-06-18 至 2026-08-18',
        notice: ['周末及法定节假日通用', '如需指定技师请提前电话沟通', '提供免费茶水点心'],
        packageDetails: ['肩颈舒缓 30分钟', '背部精油推拿 40分钟', '头部放松 20分钟'],
        refundRule: '随时退 · 过期自动退'
      },
      storeInfo: {
        name: '康悦故事足疗SPA',
        address: '深圳市福田区滨河大道 9001 号',
        distance: '4.8km',
        phone: '0755-66667777',
        businessHours: '11:00 - 01:00',
        status: 'open',
        crowdLevel: 'medium',
        reservable: true,
        mapUrl: 'https://map.baidu.com/'
      }
    }
  },
  {
    id: 'fun_billiards',
    name: '台球订单咨询',
    tag: 'CASE 16',
    meta: '休闲娱乐 · 台球畅打',
    question: '这个券周末能用吗？怎么退款？订单 MT2026061800103',
    order: {
      orderId: 'MT2026061800103',
      channel: 'third_party',
      status: 'unredeemed',
      redeemMethod: 'manual',
      store: '乔氏台球俱乐部',
      itemSummary: '【大厅】单人畅打3小时',
      orderDetailUrl: '#/orders/MT2026061800103',
      productRules: {
        validDate: '2026-06-18 至 2026-07-18',
        notice: ['周末及法定节假日通用', '如遇满台需排队等候'],
        refundRule: '随时退 · 过期自动退'
      },
      storeInfo: {
        name: '乔氏台球俱乐部',
        address: '深圳市龙华区民治大道 111 号',
        distance: '8.2km',
        phone: '0755-22223333',
        businessHours: '10:00 - 02:00',
        status: 'open',
        crowdLevel: 'low',
        reservable: true,
        mapUrl: 'https://map.baidu.com/'
      }
    }
  }
];

/** 模拟一次"远程查询"，带轻微延迟便于演示 */
export function fetchOrderById(orderId: string): Promise<OrderData | null> {
  return new Promise((resolve) => {
    const hit = SCENARIOS.find((s) => s.order.orderId === orderId);
    const listItem = ORDER_LIST.find((item) => item.orderId === orderId);
    const stdCat = listItem ? toStandardCategory(listItem.category) : 'general';
    const isVirtualStore = stdCat === 'general' && ['fun', 'show', 'vacation'].includes(listItem?.category ?? '');
    const isTransport = stdCat === 'transport';
    const isTravel = stdCat === 'travel';
    const isScenic = stdCat === 'scenic';
    const isScenicGroupBuy = isScenic && listItem?.scenicProductType === 'group_buy';
    const isScenicCalendar = isScenic && listItem?.scenicProductType === 'calendar_ticket';
    const isScenicPresale = isScenic && listItem?.scenicProductType === 'presale_voucher';
    const isTravelPresale = isTravel && listItem?.travelProductType === 'presale_voucher';
    const isScenicActive = isScenicGroupBuy || isScenicCalendar || isScenicPresale;
    const fallback: OrderData | null = listItem
      ? {
          orderId: listItem.orderId,
          channel: 'miniprogram_other',
          status: mapStatusTextToOrderStatus(listItem.statusText),
          redeemMethod: 'voucher',
          supportedRedeemMethods: ['voucher'] as const,
          category: listItem.category,
          store: listItem.merchant,
          storeAddress: isVirtualStore
            ? '出发前以短信通知集合信息'
            : isTransport
              ? '请提前2小时到达机场/车站办理值机'
              : isTravel
                ? '出发前以导游通知为准'
                : isScenic
                  ? '广东省广州市番禺区汉溪大道东299号'
                  : '距你488m · 海淀区知春路76号',
          itemSummary: listItem.product,
          orderDetailUrl: `#/orders/${listItem.orderId}`,
          paymentExpireAt: Date.now() + 28 * 60 * 1000 + 34 * 1000,
          voucherCode: isScenic ? undefined : `9001 ${listItem.orderId.slice(-4)} 653`,
          refundInfo: buildRefundInfoFromListItem(listItem),
          productRules: {
            validDate: listItem.productRules?.validDate || (isScenicGroupBuy ? '2026.07.01至2026.08.31' : isScenicCalendar ? '2026.06.29至2026.06.29' : isScenicPresale ? '2026.07.01至2026.10.31' : '2026-06-25 至 2026-07-25'),
            invalidDate: isScenicGroupBuy ? '2026.07.15至2026.07.21' : undefined,
            notice: isTransport
              ? ['请携带有效身份证件', '建议提前2小时到达']
              : isTravel || listItem.category === 'vacation'
                ? ['请携带有效身份证件', '出发前注意查看天气']
                : isScenic
                  ? ['需携带身份证入园']
                  : ['周一至周日可用', '免预约'],
            refundRule: stdCat === 'food' || (stdCat === 'general' && ['fun', 'show'].includes(listItem.category))
              ? '随时退 · 过期自动退'
              : isTransport || isTravel || listItem.category === 'vacation'
                ? '按退改规则执行，逾期有违约金'
                : isScenic
                  ? '随时退·过期退'
                  : '过期自动退',
            applicableStoreCount: isScenicActive ? 1 : 1,
            usageRules: isScenicGroupBuy ? ['购买后2小时可用', '免预约', '无需取票'] : isScenicCalendar ? ['出票后不可改期', '需携带身份证原件'] : isScenicPresale ? ['需提前1天在线预约', '不约可退', '无需取票'] : undefined,
            entryTime: isScenicGroupBuy ? '09:00-17:00' : isScenicCalendar ? '上午场 08:30-12:00' : isScenicPresale ? '08:30-17:00' : undefined,
            entryAddress: isScenicGroupBuy ? '长隆欢乐世界正门检票口' : isScenicCalendar ? '午门（南门）检票口' : isScenicPresale ? '故宫博物院午门检票口' : undefined,
            entryValidity: isScenicGroupBuy ? '所选日期当日有效' : isScenicCalendar ? '所选日期当日当次有效' : isScenicPresale ? '所选日期当日有效' : undefined,
            entryCount: isScenicGroupBuy ? '仅可入园1次' : isScenicCalendar ? '仅可入园1次' : isScenicPresale ? '3日内可多次入园' : undefined,
            packageDetails: isScenicPresale ? ['3日通票2张'] : undefined,
          },
          storeInfo: {
            name: listItem.merchant,
            address: isVirtualStore
              ? '线上服务，无需到店'
              : isTransport
                ? '请前往出发机场/车站'
                : isTravel
                  ? '具体集合地点以导游通知为准'
                  : isScenicCalendar
                    ? '北京市东城区景山前街4号'
                    : isScenicPresale
                      ? '北京市东城区景山前街4号'
                    : isScenic
                    ? '广东省广州市番禺区汉溪大道东299号'
                    : '海淀区知春路76号京东大厦F1层102',
            distance: isVirtualStore || isTransport || isTravel ? '—' : isScenic ? '3.4km' : '488m',
            phone: '400-000-8888',
            businessHours: isTransport || isTravel || listItem.category === 'vacation' ? '24小时服务' : isScenic ? '08:30 - 17:00' : '09:00 - 22:00',
            status: 'open',
            reservable: false,
            crowdLevel: 'medium',
            mapUrl: 'https://map.baidu.com/',
            imageUrl: isScenicCalendar
              ? 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20photo%20of%20Forbidden%20City%20Palace%20Museum%20main%20gate%20Wumen%20in%20Beijing%2C%20red%20walls%20golden%20roof%2C%20clear%20blue%20sky%2C%20historic%20Chinese%20architecture%2C%20travel%20destination%2C%20commercial%20photo&image_size=square'
              : isScenicPresale
                ? 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20photo%20of%20Forbidden%20City%20Palace%20Museum%20aerial%20view%20with%20golden%20roofs%2C%20Beijing%20China%2C%20historic%20imperial%20palace%2C%20clear%20day%2C%20travel%20photography%2C%20commercial%20photo&image_size=square'
              : isScenicGroupBuy
              ? 'https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=realistic%20colorful%20amusement%20park%20entrance%20gate%20with%20roller%20coaster%20in%20background%2C%20Chimelong%20theme%20park%2C%20bright%20sunny%20day%2C%20commercial%20travel%20photo&image_size=square'
              : undefined,
          },
          scenicInfo: isScenicGroupBuy ? {
            productType: 'group_buy',
            ticketCount: listItem.totalQuantity ?? 1,
            ticketType: listItem.product,
            insuranceIncluded: true,
            expireDate: '2026.09.23',
            visitors: listItem.statusText === '待使用' || listItem.statusText === '交易完成'
              ? [
                  { name: '江海强', idCard: '130229********7211' },
                  { name: '李平', idCard: '130229********8790' },
                ]
              : [
                  { name: '王胜凯', idCard: '' },
                  { name: '刘铭心', idCard: '' },
                ],
            coupons: listItem.statusText === '待使用'
              ? [
                  { code: '9001 1345 653', used: false },
                  { code: '9001 1345 654', used: false },
                  { code: '9001 1345 655', used: false },
                ]
              : listItem.statusText === '交易完成'
                ? [
                    { code: '9001 1345 653', used: true },
                    { code: '9001 1345 654', used: true },
                  ]
                : undefined,
          } : isScenicCalendar ? {
            productType: 'calendar_ticket',
            ticketCount: listItem.totalQuantity ?? 2,
            ticketType: '上午场·成人票',
            visitDate: '2026-06-29',
            visitTime: '08:30-12:00',
            insuranceIncluded: true,
            expireDate: '2026-06-29',
            visitors: ['预订成功', '已使用', '退款申请中', '退款成功', '退款失败'].includes(listItem.statusText)
              ? [
                  { name: '江海强', idCard: '110101********1234' },
                  { name: '李平', idCard: '110101********5678' },
                ]
              : listItem.statusText === '预订确认中'
                ? [
                    { name: '江海强', idCard: '110101********1234' },
                    { name: '李平', idCard: '' },
                  ]
                : [
                    { name: '江海强', idCard: '' },
                    { name: '李平', idCard: '' },
                  ],
            coupons: ['预订成功', '已使用'].includes(listItem.statusText)
              ? [
                  { code: '9001 2026 0629', used: listItem.statusText === '已使用' },
                  { code: '9001 2026 0630', used: listItem.statusText === '已使用' },
                ]
              : undefined,
          } : isScenicPresale ? {
            productType: 'presale_voucher',
            ticketCount: listItem.totalQuantity ?? 2,
            ticketType: '成人通票',
            visitDate: ['预约成功', '已使用', '已入园', '预约确认中', '预订确认中'].includes(listItem.statusText) ? '2026-08-15' : undefined,
            visitTime: ['预约成功', '已使用', '已入园', '预约确认中', '预订确认中'].includes(listItem.statusText) ? '08:30' : undefined,
            insuranceIncluded: true,
            expireDate: '2026.10.31',
            visitors: ['待支付', '订单取消'].includes(listItem.statusText)
              ? undefined
              : listItem.statusText === '待预约'
                ? [
                    { name: '江海强', idCard: '' },
                    { name: '李平', idCard: '' },
                  ]
                : listItem.statusText === '预约确认中' || listItem.statusText === '预订确认中'
                  ? [
                      { name: '江海强', idCard: '130229********7211' },
                      { name: '李平', idCard: '' },
                    ]
                  : [
                      { name: '江海强', idCard: '130229********7211' },
                      { name: '李平', idCard: '130229********8790' },
                    ],
            coupons: ['预约成功', '已使用', '已入园', '预订成功'].includes(listItem.statusText)
              ? [
                  { code: '9001 1345 653', used: listItem.statusText === '已使用' || listItem.statusText === '已入园' },
                  { code: '9001 1345 654', used: listItem.statusText === '已使用' || listItem.statusText === '已入园' },
                ]
              : undefined,
          } : undefined,
          vacationInfo: isTravelPresale ? {
            departureDate: ['预约成功', '预约确认中', '交易完成'].includes(listItem.statusText) ? '2026-08-10' : undefined,
            returnDate: ['预约成功', '预约确认中', '交易完成'].includes(listItem.statusText) ? '2026-08-15' : undefined,
            agency: '云南国旅国际旅行社',
            passengers: ['待支付', '订单取消'].includes(listItem.statusText)
              ? undefined
              : listItem.statusText === '待预约'
                ? ['张三']
                : ['张三', '李四'],
            gatheringInfo: ['预约成功', '交易完成'].includes(listItem.statusText)
              ? '2026-08-10 06:30 昆明长水国际机场 T1 航站楼 3 号门集合'
              : undefined,
          } : undefined,
        }
      : null;
    const shouldUseListRefundState = listItem && ['退款成功', '退款申请中', '退款失败'].includes(listItem.statusText);
    const resolvedOrder = hit?.order && fallback
      ? (() => {
          validateNoticeTagsConsistency(
            hit.order,
            fallback,
            `fetchOrderById(${orderId}) - SCENARIOS vs fallback`
          );
          return {
            ...hit.order,
            category: hit.order.category ?? fallback.category ?? inferScenarioCategory(hit.order),
            store: shouldUseListRefundState ? fallback.store : hit.order.store,
            itemSummary: shouldUseListRefundState ? fallback.itemSummary : hit.order.itemSummary,
            storeAddress: shouldUseListRefundState ? fallback.storeAddress : hit.order.storeAddress,
            status: shouldUseListRefundState ? fallback.status : hit.order.status,
            refundInfo: shouldUseListRefundState ? fallback.refundInfo : hit.order.refundInfo,
            productRules: {
              ...hit.order.productRules,
              ...fallback.productRules,
              validDate: fallback.productRules?.validDate || hit.order.productRules?.validDate,
            },
          };
        })()
      : hit?.order
        ? { ...hit.order, category: hit.order.category ?? inferScenarioCategory(hit.order) }
        : fallback;
    setTimeout(() => resolve(resolvedOrder), 520);
  });
}

/** 从用户输入文本中粗略抽取订单号（演示用） */
export function extractOrderId(text: string): string | null {
  const m = text.match(/[A-Z]{2}\d{10,}/i);
  return m ? m[0].toUpperCase() : null;
}

// ===========================================================================
// 品类筛选配置
// ===========================================================================

export interface CategoryTab {
  key: 'all' | StandardCategory;
  label: string;
}

export const CATEGORY_TABS: CategoryTab[] = [
  { key: 'all', label: '全部' },
  ...CATEGORY_MAPPING_TABLE.map(cat => ({
    key: cat.key,
    label: cat.name,
  })),
];

// ===========================================================================
// 模拟订单列表（用于浮层选择）
// ===========================================================================

const STATIC_ORDER_LIST: OrderListItem[] = [
  {
    orderId: 'NL202606250001',
    merchant: '自然语言演示桌游馆',
    product: '四人桌游畅玩套餐 · 需预约',
    price: 12800,
    statusText: '待使用',
    statusColor: 'orange',
    category: 'fun',
    orderTime: '2026-06-25 10:20:00',
    thumbnail: '🎲',
    productRules: {
      validDate: '2026-06-25 至 2026-07-31',
      notice: ['周一至周日可用', '需提前1天预约', '不与其他优惠同享'],
      refundRule: '随时退 · 过期自动退'
    },
  },
  {
    orderId: 'NL202606250002',
    merchant: '自然语言演示桌游馆',
    product: '四人桌游畅玩套餐 · 已核销',
    price: 12800,
    statusText: '交易完成',
    statusColor: 'green',
    category: 'fun',
    orderTime: '2026-06-24 18:30:00',
    thumbnail: '🎲',
    productRules: {
      validDate: '2026-06-20 至 2026-07-20',
      notice: ['周一至周日可用', '需提前1天预约'],
      refundRule: '随时退 · 过期自动退'
    },
  },
  {
    orderId: 'MT2026061800101',
    merchant: '星聚会KTV(南山店)',
    product: '【小包】3小时欢唱套餐',
    price: 15800,
    statusText: '待使用',
    statusColor: 'orange',
    category: 'fun',
    orderTime: '2026-06-18 10:15:00',
    thumbnail: '🎤',
    productRules: {
      validDate: '2026-06-18 至 2026-07-18',
      notice: ['周一至周日可用', '包含果盘1份，爆米花1份，茶水1壶', '超出套餐时间按门市价收费'],
      refundRule: '随时退 · 过期自动退'
    },
  },
  {
    orderId: 'MT2026061800102',
    merchant: '康悦故事足疗SPA',
    product: '【招牌】全身精油SPA 90分钟',
    price: 29800,
    statusText: '待使用',
    statusColor: 'orange',
    category: 'fun',
    orderTime: '2026-06-18 11:20:00',
    thumbnail: '💆',
    productRules: {
      validDate: '2026-06-18 至 2026-08-18',
      notice: ['周末及法定节假日通用', '如需指定技师请提前电话沟通', '提供免费茶水点心'],
      refundRule: '随时退 · 过期自动退'
    },
  },
  {
    orderId: 'MT2026061800103',
    merchant: '乔氏台球俱乐部',
    product: '【大厅】单人畅打3小时',
    price: 5800,
    statusText: '待使用',
    statusColor: 'orange',
    category: 'fun',
    orderTime: '2026-06-18 14:05:00',
    thumbnail: '🎱',
    productRules: {
      validDate: '2026-06-18 至 2026-07-18',
      notice: ['周末及法定节假日通用', '如遇满台需排队等候'],
      refundRule: '随时退 · 过期自动退'
    },
  },
  {
    orderId: 'RX2026061700123',
    merchant: '瑞幸咖啡（海岸城旗舰店）',
    product: '燕麦拿铁 (热) × 1，抹茶可颂 × 1',
    price: 2990,
    statusText: '待使用',
    statusColor: 'orange',
    category: 'food',
    orderTime: '2026-06-17 12:30:15',
    thumbnail: '☕',
    productRules: {
      validDate: '2026-06-17 至 2026-06-30',
      notice: ['不与其他优惠同享', '限工作日使用'],
      refundRule: '随时退 · 过期自动退'
    },
  },
  {
    orderId: 'RX2026061700199',
    merchant: '瑞幸咖啡（壹方天地店）',
    product: '橙C美式 × 1，原味贝果 × 1',
    price: 2480,
    statusText: '待使用',
    statusColor: 'orange',
    category: 'food',
    orderTime: '2026-06-17 11:46:28',
    thumbnail: '🧃',
    productRules: {
      validDate: '2026-06-17 至 2026-07-31',
      notice: ['不与其他优惠同享', '周末节假日通用'],
      refundRule: '随时退 · 过期自动退'
    },
  },
  {
    orderId: 'MT2026061700200',
    merchant: '牛街德兴顺铜锅涮肉(清华店)',
    product: '鲜肉现烤羊肉串（约20串）团购券',
    price: 4699,
    statusText: '退款成功',
    statusColor: 'gray',
    category: 'food',
    orderTime: '2026-06-17 12:40:47',
    thumbnail: '🍖',
  },
  {
    orderId: 'MT2026061600301',
    merchant: '2026陈小春巡回演唱会',
    product: '【北京】2026 陈小春 BIGMAN 巡回演唱会',
    price: 128800,
    statusText: '待使用',
    statusColor: 'orange',
    category: 'show',
    orderTime: '2026-06-16 15:07:18',
    thumbnail: '🎤',
  },
  {
    orderId: 'MT2026061000806',
    merchant: '三亚5日纯玩小包团',
    product: '三亚5日4晚纯玩小包团 · 含往返机票',
    price: 399900,
    statusText: '待预约',
    statusColor: 'orange',
    category: 'travel',
    travelProductType: 'presale_voucher',
    orderTime: '2026-06-10 09:15:33',
    thumbnail: '🌴',
  },
  {
    orderId: 'VL2026062800002',
    merchant: '泰国普吉岛5日自由行',
    product: '泰国普吉岛5日自由行 · 预售券 · 含往返机票+酒店',
    price: 459900,
    statusText: '待支付',
    statusColor: 'orange',
    category: 'travel',
    travelProductType: 'presale_voucher',
    orderTime: '2026-06-28 10:30:00',
    thumbnail: '🏝️',
  },
  {
    orderId: 'VL2026062000003',
    merchant: '张家界3日精华游',
    product: '湖南张家界3日精华游 · 含玻璃栈道门票',
    price: 129900,
    statusText: '交易完成',
    statusColor: 'green',
    category: 'travel',
    travelProductType: 'presale_voucher',
    orderTime: '2026-06-15 08:00:00',
    thumbnail: '⛰️',
  },
  {
    orderId: 'MT2026061600402',
    merchant: '团购订单',
    product: '【新春大吉】牛油果系列5选1',
    price: 2480,
    statusText: '退款成功',
    statusColor: 'gray',
    category: 'food',
    orderTime: '2026-06-16 11:46:28',
    thumbnail: '🥑',
  },
  {
    orderId: 'MT2026061400503',
    merchant: '欢乐谷主题乐园',
    product: '成人全日票 · 周末通用',
    price: 29900,
    statusText: '待使用',
    statusColor: 'orange',
    category: 'play',
    scenicProductType: 'group_buy',
    orderTime: '2026-06-14 10:22:00',
    thumbnail: '🎢',
  },
  {
    orderId: 'MT2026061300604',
    merchant: '深圳湾万丽酒店',
    product: '豪华海景大床房 · 含双早',
    price: 68800,
    statusText: '交易完成',
    statusColor: 'green',
    category: 'hotel',
    hotelProductType: 'calendar_room',
    orderTime: '2026-06-13 09:15:33',
    thumbnail: '🏨',
  },
  {
    orderId: 'MT2026061200705',
    merchant: '南方航空 · 深圳-成都',
    product: '经济舱往返机票 · 含行李',
    price: 156000,
    statusText: '交易完成',
    statusColor: 'green',
    category: 'transport',
    orderTime: '2026-06-12 08:30:00',
    thumbnail: '✈️',
  },
  {
    orderId: 'TR2026062800001',
    merchant: '中国国航 · 北京-上海',
    product: '经济舱单程机票 · CA1831',
    price: 89000,
    statusText: '待使用',
    statusColor: 'orange',
    category: 'transport',
    orderTime: '2026-06-27 16:00:00',
    thumbnail: '🛫',
  },
  {
    orderId: 'SC2026062800101',
    merchant: '长隆欢乐世界',
    product: '假日单人夜场票',
    price: 53800,
    statusText: '待支付',
    statusColor: 'orange',
    category: 'scenic',
    scenicProductType: 'group_buy',
    orderTime: '2026-06-28 09:30:00',
    thumbnail: '🎢',
    totalQuantity: 1,
  },
  {
    orderId: 'SC2026062800102',
    merchant: '长隆欢乐世界',
    product: '假日单人夜场票',
    price: 53800,
    statusText: '待使用',
    statusColor: 'orange',
    category: 'scenic',
    scenicProductType: 'group_buy',
    orderTime: '2026-06-27 14:20:00',
    thumbnail: '🎢',
    totalQuantity: 3,
  },
  {
    orderId: 'SC2026062800103',
    merchant: '长隆欢乐世界',
    product: '假日单人夜场票',
    price: 53800,
    statusText: '交易完成',
    statusColor: 'green',
    category: 'scenic',
    scenicProductType: 'group_buy',
    orderTime: '2026-06-20 10:15:00',
    thumbnail: '🎢',
    totalQuantity: 2,
  },
  {
    orderId: 'SC2026062800104',
    merchant: '长隆欢乐世界',
    product: '假日单人夜场票',
    price: 53800,
    statusText: '订单取消',
    statusColor: 'gray',
    category: 'scenic',
    scenicProductType: 'group_buy',
    orderTime: '2026-06-26 16:45:00',
    thumbnail: '🎢',
    totalQuantity: 1,
  },
  {
    orderId: 'SC2026062800105',
    merchant: '长隆欢乐世界',
    product: '假日单人夜场票',
    price: 53800,
    statusText: '退款申请中',
    statusColor: 'blue',
    category: 'scenic',
    scenicProductType: 'group_buy',
    orderTime: '2026-06-25 11:30:00',
    thumbnail: '🎢',
    totalQuantity: 1,
    refundQuantity: 1,
  },
  {
    orderId: 'SC2026062800106',
    merchant: '长隆欢乐世界',
    product: '假日单人夜场票',
    price: 53800,
    statusText: '退款成功',
    statusColor: 'gray',
    category: 'scenic',
    scenicProductType: 'group_buy',
    orderTime: '2026-06-22 13:00:00',
    thumbnail: '🎢',
    totalQuantity: 1,
    refundQuantity: 1,
  },
  {
    orderId: 'SC2026062800107',
    merchant: '长隆欢乐世界',
    product: '假日单人夜场票',
    price: 53800,
    statusText: '退款失败',
    statusColor: 'orange',
    category: 'scenic',
    scenicProductType: 'group_buy',
    orderTime: '2026-06-23 09:50:00',
    thumbnail: '🎢',
    totalQuantity: 1,
    refundQuantity: 1,
  },
  {
    orderId: 'SC2026062800201',
    merchant: '故宫博物院',
    product: '故宫博物院门票（上午场）',
    price: 15800,
    statusText: '待支付',
    statusColor: 'orange',
    category: 'scenic',
    scenicProductType: 'calendar_ticket',
    orderTime: '2026-06-28 10:15:00',
    thumbnail: '🏯',
    totalQuantity: 2,
  },
  {
    orderId: 'SC2026062800202',
    merchant: '故宫博物院',
    product: '故宫博物院门票（上午场）',
    price: 15800,
    statusText: '预订确认中',
    statusColor: 'blue',
    category: 'scenic',
    scenicProductType: 'calendar_ticket',
    orderTime: '2026-06-28 09:20:00',
    thumbnail: '🏯',
    totalQuantity: 2,
  },
  {
    orderId: 'SC2026062800203',
    merchant: '故宫博物院',
    product: '故宫博物院门票（上午场）',
    price: 15800,
    statusText: '预订成功',
    statusColor: 'green',
    category: 'scenic',
    scenicProductType: 'calendar_ticket',
    orderTime: '2026-06-27 16:40:00',
    thumbnail: '🏯',
    totalQuantity: 2,
  },
  {
    orderId: 'SC2026062800204',
    merchant: '故宫博物院',
    product: '故宫博物院门票（上午场）',
    price: 15800,
    statusText: '已使用',
    statusColor: 'gray',
    category: 'scenic',
    scenicProductType: 'calendar_ticket',
    orderTime: '2026-06-20 11:00:00',
    thumbnail: '🏯',
    totalQuantity: 2,
  },
  {
    orderId: 'SC2026062800205',
    merchant: '故宫博物院',
    product: '故宫博物院门票（上午场）',
    price: 15800,
    statusText: '订单取消',
    statusColor: 'gray',
    category: 'scenic',
    scenicProductType: 'calendar_ticket',
    orderTime: '2026-06-26 14:30:00',
    thumbnail: '🏯',
    totalQuantity: 2,
  },
  {
    orderId: 'SC2026062800206',
    merchant: '故宫博物院',
    product: '故宫博物院门票（上午场）',
    price: 15800,
    statusText: '退款申请中',
    statusColor: 'blue',
    category: 'scenic',
    scenicProductType: 'calendar_ticket',
    orderTime: '2026-06-25 13:20:00',
    thumbnail: '🏯',
    totalQuantity: 2,
    refundQuantity: 2,
  },
  {
    orderId: 'SC2026062800207',
    merchant: '故宫博物院',
    product: '故宫博物院门票（上午场）',
    price: 15800,
    statusText: '退款成功',
    statusColor: 'gray',
    category: 'scenic',
    scenicProductType: 'calendar_ticket',
    orderTime: '2026-06-22 10:40:00',
    thumbnail: '🏯',
    totalQuantity: 2,
    refundQuantity: 2,
  },
  {
    orderId: 'SC2026062800208',
    merchant: '故宫博物院',
    product: '故宫博物院门票（上午场）',
    price: 15800,
    statusText: '退款失败',
    statusColor: 'orange',
    category: 'scenic',
    scenicProductType: 'calendar_ticket',
    orderTime: '2026-06-23 15:10:00',
    thumbnail: '🏯',
    totalQuantity: 2,
    refundQuantity: 2,
  },
  // ---------- 景区预售券 ----------
  {
    orderId: 'SP20260701001',
    merchant: '故宫博物院',
    product: '故宫博物院3日通票预售',
    price: 18000,
    statusText: '待支付',
    statusColor: 'orange',
    category: 'scenic',
    scenicProductType: 'presale_voucher',
    orderTime: '2026-07-01 14:20:00',
    thumbnail: '🏛️',
    totalQuantity: 2,
  },
  {
    orderId: 'SP20260701002',
    merchant: '故宫博物院',
    product: '故宫博物院3日通票预售',
    price: 18000,
    statusText: '待预约',
    statusColor: 'orange',
    category: 'scenic',
    scenicProductType: 'presale_voucher',
    orderTime: '2026-06-30 10:10:00',
    thumbnail: '🏛️',
    totalQuantity: 2,
  },
  {
    orderId: 'SP20260701003',
    merchant: '故宫博物院',
    product: '故宫博物院3日通票预售',
    price: 18000,
    statusText: '预约确认中',
    statusColor: 'blue',
    category: 'scenic',
    scenicProductType: 'presale_voucher',
    orderTime: '2026-06-29 16:45:00',
    thumbnail: '🏛️',
    totalQuantity: 2,
  },
  {
    orderId: 'SP20260701004',
    merchant: '故宫博物院',
    product: '故宫博物院3日通票预售',
    price: 18000,
    statusText: '预约成功',
    statusColor: 'green',
    category: 'scenic',
    scenicProductType: 'presale_voucher',
    orderTime: '2026-06-28 09:30:00',
    thumbnail: '🏛️',
    totalQuantity: 2,
  },
  {
    orderId: 'SP20260701005',
    merchant: '故宫博物院',
    product: '故宫博物院3日通票预售',
    price: 18000,
    statusText: '已使用',
    statusColor: 'gray',
    category: 'scenic',
    scenicProductType: 'presale_voucher',
    orderTime: '2026-06-20 11:00:00',
    thumbnail: '🏛️',
    totalQuantity: 2,
  },
  {
    orderId: 'SP20260701006',
    merchant: '故宫博物院',
    product: '故宫博物院3日通票预售',
    price: 18000,
    statusText: '交易完成',
    statusColor: 'gray',
    category: 'scenic',
    scenicProductType: 'presale_voucher',
    orderTime: '2026-06-15 10:00:00',
    thumbnail: '🏛️',
    totalQuantity: 2,
  },
  {
    orderId: 'SP20260701007',
    merchant: '故宫博物院',
    product: '故宫博物院3日通票预售',
    price: 18000,
    statusText: '订单取消',
    statusColor: 'gray',
    category: 'scenic',
    scenicProductType: 'presale_voucher',
    orderTime: '2026-06-26 14:30:00',
    thumbnail: '🏛️',
    totalQuantity: 2,
  },
  {
    orderId: 'SP20260701008',
    merchant: '故宫博物院',
    product: '故宫博物院3日通票预售',
    price: 18000,
    statusText: '退款申请中',
    statusColor: 'blue',
    category: 'scenic',
    scenicProductType: 'presale_voucher',
    orderTime: '2026-06-25 13:20:00',
    thumbnail: '🏛️',
    totalQuantity: 2,
    refundQuantity: 2,
  },
  {
    orderId: 'SP20260701009',
    merchant: '故宫博物院',
    product: '故宫博物院3日通票预售',
    price: 18000,
    statusText: '退款成功',
    statusColor: 'gray',
    category: 'scenic',
    scenicProductType: 'presale_voucher',
    orderTime: '2026-06-22 10:40:00',
    thumbnail: '🏛️',
    totalQuantity: 2,
    refundQuantity: 2,
  },
  {
    orderId: 'SP20260701010',
    merchant: '故宫博物院',
    product: '故宫博物院3日通票预售',
    price: 18000,
    statusText: '退款失败',
    statusColor: 'orange',
    category: 'scenic',
    scenicProductType: 'presale_voucher',
    orderTime: '2026-06-23 15:10:00',
    thumbnail: '🏛️',
    totalQuantity: 2,
    refundQuantity: 2,
  },
];

// ===========================================================================
// 生成各行业订单样例，覆盖各种不同状态
// ===========================================================================

let generatedIdCounter = 8000;
function gen(
  merchant: string,
  product: string,
  category: OrderCategory,
  statusText: string,
  statusColor: any,
  thumbnail: string,
  hotelProductType?: HotelProductType,
  scenicProductType?: ScenicProductType,
  travelProductType?: TravelProductType,
  fulfillmentModes?: Array<'code' | 'order' | 'delivery'>,
  deliveryAddress?: string,
): OrderListItem {
  generatedIdCounter++;
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 10);
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 30);
  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const validDate = `${formatDate(startDate)} 至 ${formatDate(endDate)}`;

  return {
    orderId: `MT202606${generatedIdCounter}`,
    merchant,
    product,
    price: Math.floor(Math.random() * 50000) + 1000,
    statusText,
    statusColor,
    category,
    hotelProductType,
    scenicProductType,
    travelProductType,
    fulfillmentModes,
    deliveryAddress,
    deliveryNote: fulfillmentModes?.includes('delivery') ? '最快30分钟送达·配送费¥1起' : undefined,
    deliveryDeadlineText: fulfillmentModes?.includes('delivery') ? '09.23前可随时预约' : undefined,
    totalQuantity: category === 'fun' ? 2 : 1,
    refundQuantity: ['退款成功', '退款申请中', '退款失败'].includes(statusText) ? 1 : undefined,
    orderTime: '2026-06-17 10:00:00',
    thumbnail,
    productRules: {
      validDate,
      notice: ['不与其他优惠同享', '周末节假日通用'],
      refundRule: '随时退 · 过期自动退'
    }
  };
}

const colorMap: Record<string, any> = {
  '待支付': 'orange',
  '待使用': 'orange',
  '交易完成': 'gray',
  '订单取消': 'gray',
  '退款成功': 'gray',
  '退款申请中': 'blue',
  '退款失败': 'orange',
  '待预约': 'orange',
  '预约确认中': 'blue',
  '预约成功': 'green',
  '预订确认中': 'blue',
  '预订成功': 'green',
  '待接单': 'orange',
  '待商家接单': 'orange',
  '商家已接单': 'blue',
  '制作中': 'blue',
  '商家备餐中': 'blue',
  '待取餐': 'blue',
  '待骑手取餐': 'blue',
  '配送中': 'blue',
  '已取餐': 'green',
  '已送达': 'green',
  '已核销': 'green',
  '已入住': 'green',
  '已入园': 'green',
  '待出行': 'green',
  '行程中': 'green',
};

const cat1Statuses = ['待支付', '待使用', '交易完成', '退款成功', '退款申请中', '退款失败'];
const cat2Statuses = ['待支付', '待预约', '预约确认中', '预约成功', '交易完成', '订单取消', '退款成功', '退款申请中', '退款失败'];
const cat3Statuses = ['待支付', '待预约', '预订确认中', '预订成功', '交易完成', '订单取消', '退款成功', '退款申请中', '退款失败'];

export const ORDER_LIST: OrderListItem[] = [
  ...STATIC_ORDER_LIST,
  
  // 餐饮、综合、游玩团购订单状态
  ...cat1Statuses.map(s => gen('瑞幸咖啡(科兴店)', '[自提] 丝绒拿铁等2件', 'food', s, colorMap[s] || 'gray', '☕️')),
  ...cat1Statuses.map(s => gen('星聚会KTV', '3小时欢唱套餐', 'fun', s, colorMap[s] || 'gray', '🎤')),
  ...cat1Statuses.map(s => gen('欢乐谷主题乐园', '成人全日票(团购)', 'play', s, colorMap[s] || 'gray', '🎢', undefined, 'group_buy')),

  // 住宿、游玩、旅行预售券类商品订单状态
  ...cat2Statuses.map(s => gen('万豪酒店预售', '豪华海景房2晚通兑券', 'hotel', s, colorMap[s] || 'gray', '🏨', 'presale_voucher')),
  ...cat2Statuses.map(s => gen('环球影城(预售)', '儿童票预售券', 'play', s, colorMap[s] || 'gray', '🎡', undefined, 'presale_voucher')),
  ...cat2Statuses.map(s => gen('南方航空', '随心飞全国通兑券', 'transport', s, colorMap[s] || 'gray', '✈️')),

  // 住宿、游玩预订类商品订单状态
  ...cat3Statuses.map(s => gen('希尔顿酒店(日历房)', '高级大床房 1晚', 'hotel', s, colorMap[s] || 'gray', '🛏️', 'calendar_room')),
  ...cat3Statuses.map(s => gen('故宫博物院', '上午场门票(指定日)', 'play', s, colorMap[s] || 'gray', '🏛️', undefined, 'calendar_ticket')),

  // 旅行社预售券订单（9种状态）—— 待预约状态用参考图商品
  gen('中国青年旅行社', '三亚游艇环岛4天3晚 蓝高450帆船包船出海', 'travel', '待支付', colorMap['待支付'] || 'gray', '🏝️', undefined, undefined, 'presale_voucher'),
  gen('中国青年旅行社', '三亚游艇环岛4天3晚 蓝高450帆船包船出海', 'travel', '待预约', colorMap['待预约'] || 'orange', '🌊', undefined, undefined, 'presale_voucher'),
  gen('中国青年旅行社', '三亚游艇环岛4天3晚 蓝高450帆船包船出海', 'travel', '预约确认中', colorMap['预约确认中'] || 'blue', '🌊', undefined, undefined, 'presale_voucher'),
  gen('中国青年旅行社', '三亚游艇环岛4天3晚 蓝高450帆船包船出海', 'travel', '预约成功', colorMap['预约成功'] || 'green', '🌊', undefined, undefined, 'presale_voucher'),
  gen('中国青年旅行社', '三亚游艇环岛4天3晚 蓝高450帆船包船出海', 'travel', '交易完成', colorMap['交易完成'] || 'gray', '🌊', undefined, undefined, 'presale_voucher'),
  gen('中国青年旅行社', '三亚游艇环岛4天3晚 蓝高450帆船包船出海', 'travel', '订单取消', colorMap['订单取消'] || 'gray', '🌊', undefined, undefined, 'presale_voucher'),
  gen('中国青年旅行社', '三亚游艇环岛4天3晚 蓝高450帆船包船出海', 'travel', '退款成功', colorMap['退款成功'] || 'gray', '🌊', undefined, undefined, 'presale_voucher'),
  gen('中国青年旅行社', '三亚游艇环岛4天3晚 蓝高450帆船包船出海', 'travel', '退款申请中', colorMap['退款申请中'] || 'blue', '🌊', undefined, undefined, 'presale_voucher'),
  gen('中国青年旅行社', '三亚游艇环岛4天3晚 蓝高450帆船包船出海', 'travel', '退款失败', colorMap['退款失败'] || 'orange', '🌊', undefined, undefined, 'presale_voucher'),

  // 餐饮待使用 - 6种核销方式组合场景
  gen('麦当劳(知春路店)', '双人牛排套餐（仅券码）', 'food', '待使用', 'orange', '🥩', undefined, undefined, undefined, ['code']),
  gen('麦当劳(知春路店)', '双人牛排套餐（点单+券码）', 'food', '待使用', 'orange', '🥩', undefined, undefined, undefined, ['order', 'code']),
  gen('蜜雪冰城(知春路店)', '冰鲜柠檬水（仅在线点单）', 'food', '待使用', 'orange', '🍦', undefined, undefined, undefined, ['order']),
  gen('麦当劳(知春路店)', '双人牛排套餐（券码+配送）', 'food', '待使用', 'orange', '🥩', undefined, undefined, undefined, ['code', 'delivery'], '紫金数码科技园4号楼东区'),
  gen('麦当劳(知春路店)', '双人牛排套餐（点单+券码+配送）', 'food', '待使用', 'orange', '🥩', undefined, undefined, undefined, ['order', 'code', 'delivery'], '紫金数码科技园4号楼东区'),
  gen('肯德基(五道口店)', '全家桶套餐（点单+配送）', 'food', '待使用', 'orange', '🍗', undefined, undefined, undefined, ['order', 'delivery'], '中关村软件园2号楼'),

  // ===== 补充：餐饮-仅券码(code) - 其他状态 =====
  gen('麦当劳(知春路店)', '双人牛排套餐（仅券码）', 'food', '待支付', colorMap['待支付'], '🥩', undefined, undefined, undefined, ['code']),
  gen('麦当劳(知春路店)', '双人牛排套餐（仅券码）', 'food', '交易完成', colorMap['交易完成'], '🥩', undefined, undefined, undefined, ['code']),
  gen('麦当劳(知春路店)', '双人牛排套餐（仅券码）', 'food', '订单取消', colorMap['订单取消'], '🥩', undefined, undefined, undefined, ['code']),
  gen('麦当劳(知春路店)', '双人牛排套餐（仅券码）', 'food', '退款申请中', colorMap['退款申请中'], '🥩', undefined, undefined, undefined, ['code']),
  gen('麦当劳(知春路店)', '双人牛排套餐（仅券码）', 'food', '退款成功', colorMap['退款成功'], '🥩', undefined, undefined, undefined, ['code']),
  gen('麦当劳(知春路店)', '双人牛排套餐（仅券码）', 'food', '退款失败', colorMap['退款失败'], '🥩', undefined, undefined, undefined, ['code']),

  // ===== 补充：餐饮-仅点单(order) - 其他状态 =====
  // （点单子履约状态统一由"子履约状态全量覆盖"区块提供，避免重复）

  // ===== 补充：餐饮-仅配送(delivery) - 其他状态 =====
  gen('麦当劳(知春路店)', '巨无霸套餐（仅配送）', 'food', '待支付', colorMap['待支付'], '🍔', undefined, undefined, undefined, ['delivery'], '紫金数码科技园4号楼东区'),
  gen('麦当劳(知春路店)', '巨无霸套餐（仅配送）', 'food', '交易完成', colorMap['交易完成'], '🍔', undefined, undefined, undefined, ['delivery'], '紫金数码科技园4号楼东区'),

  // ===== 补充：酒店 - 已入住 =====
  gen('万豪酒店预售', '豪华海景房2晚通兑券', 'hotel', '已入住', colorMap['已入住'], '🏨', 'presale_voucher'),
  gen('希尔顿酒店(日历房)', '高级大床房 1晚', 'hotel', '已入住', colorMap['已入住'], '🛏️', 'calendar_room'),

  // ===== 补充：景区 - 已入园 =====
  gen('环球影城(预售)', '儿童票预售券', 'scenic', '已入园', colorMap['已入园'], '🎡', undefined, 'presale_voucher'),
  gen('故宫博物院', '上午场门票(指定日)', 'scenic', '已入园', colorMap['已入园'], '🏛️', undefined, 'calendar_ticket'),

  // ===== 补充：旅行社 - 待出行、行程中 =====
  gen('中国青年旅行社', '三亚游艇环岛4天3晚 蓝高450帆船包船出海', 'travel', '待出行', colorMap['待出行'], '🌊', undefined, undefined, 'presale_voucher'),
  gen('中国青年旅行社', '三亚游艇环岛4天3晚 蓝高450帆船包船出海', 'travel', '行程中', colorMap['行程中'], '🌊', undefined, undefined, 'presale_voucher'),

  // ===== 补充：综合娱乐(fun) - 订单取消 =====
  gen('星聚会KTV', '3小时欢唱套餐', 'fun', '订单取消', colorMap['订单取消'], '🎤'),

  // ============================================================
  // 餐饮交易完成订单 - 子履约状态全量覆盖（12种组合）
  // 所有订单主状态均为「交易完成」，通过 statusText + fulfillmentModes 识别子状态
  // ============================================================

  // ---- 自提（self_order）- 5种状态 ----
  gen('瑞幸咖啡(科兴店)', '[自提] 生椰拿铁大杯 × 1', 'food', '待商家接单', colorMap['待商家接单'], '☕️', undefined, undefined, undefined, ['order']),
  gen('瑞幸咖啡(科兴店)', '[自提] 丝绒拿铁 + 抹茶可颂', 'food', '商家已接单', colorMap['商家已接单'], '☕️', undefined, undefined, undefined, ['order']),
  gen('瑞幸咖啡(科兴店)', '[自提] 燕麦拿铁 (热) × 2', 'food', '制作中', colorMap['制作中'], '☕️', undefined, undefined, undefined, ['order']),
  gen('瑞幸咖啡(科兴店)', '[自提] 橙C美式 × 1', 'food', '待取餐', colorMap['待取餐'], '☕️', undefined, undefined, undefined, ['order']),
  gen('瑞幸咖啡(科兴店)', '[自提] 生椰拿铁 + 厚乳拿铁', 'food', '已取餐', colorMap['已取餐'], '☕️', undefined, undefined, undefined, ['order']),

  // ---- 外卖配送（delivery）- 6种状态 ----
  gen('麦当劳(知春路店)', '[配送] 巨无霸套餐 × 1', 'food', '待商家接单', colorMap['待商家接单'], '🍔', undefined, undefined, undefined, ['delivery'], '紫金数码科技园4号楼东区'),
  gen('麦当劳(知春路店)', '[配送] 双人分享桶', 'food', '商家已接单', colorMap['商家已接单'], '🍔', undefined, undefined, undefined, ['delivery'], '紫金数码科技园4号楼东区'),
  gen('麦当劳(知春路店)', '[配送] 麦辣鸡腿堡套餐', 'food', '商家备餐中', colorMap['商家备餐中'], '🍔', undefined, undefined, undefined, ['delivery'], '紫金数码科技园4号楼东区'),
  gen('麦当劳(知春路店)', '[配送] 全家桶套餐', 'food', '待骑手取餐', colorMap['待骑手取餐'], '🍔', undefined, undefined, undefined, ['delivery'], '紫金数码科技园4号楼东区'),
  gen('麦当劳(知春路店)', '[配送] 板烧鸡腿堡套餐', 'food', '配送中', colorMap['配送中'], '🍔', undefined, undefined, undefined, ['delivery'], '紫金数码科技园4号楼东区'),
  gen('麦当劳(知春路店)', '[配送] 麦旋风 + 薯条', 'food', '已送达', colorMap['已送达'], '🍔', undefined, undefined, undefined, ['delivery'], '紫金数码科技园4号楼东区'),

  // ---- 券码核销（voucher）- 1种状态 ----
  gen('海底捞(知春路店)', '[券码] 番茄锅底双人套餐', 'food', '已核销', colorMap['已核销'], '🍲', undefined, undefined, undefined, ['code']),
];
