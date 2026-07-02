// ===========================================================================
// 类型定义 / Domain types
// ===========================================================================

import {
  resolveCategory,
  getCategoryName,
  fromLegacyCategory,
  resolveDisplayCategory,
  type StandardCategory,
  type StandardCategoryName,
  type SubCategory,
  type ProductType,
} from './categoryMapping';

export type { StandardCategory, StandardCategoryName, SubCategory, ProductType };

/**
 * 将任意类目字符串（旧枚举值/别名/中文名）解析为标准一级类目
 * 统一类目映射体系的便捷入口，业务代码应优先使用此函数
 */
export const toStandardCategory = resolveCategory;

/** 获取标准类目中文名称 */
export const getStandardCategoryName = getCategoryName;

/** 旧类目枚举 → 新标准类目（兼容函数） */
export const legacyToStandard = fromLegacyCategory;

/**
 * 解析适合标签显示的类目信息（含二级类目）
 * 对于综合类目下的子类目（休闲娱乐/演出/度假），返回二级类目名
 */
export const getDisplayCategory = resolveDisplayCategory;

/** 用户下单渠道 */
export type OrderChannel =
  | 'miniprogram_self_order' // 小程序闭环点单
  | 'miniprogram_other'      // 小程序其它来源
  | 'third_party'            // 三方平台 (美团/饿了么 等)
  | 'pos'                    // 门店 POS
  | 'unknown';

/** 订单核销方式 */
export type RedeemMethod =
  | 'self_order'   // 点单核销
  | 'delivery'     // 配送核销
  | 'voucher'      // 券码核销
  | 'manual'       // 门店人工
  | 'none';        // 未核销

/** 订单状态 */
export type OrderStatus =
  | 'pending_payment'
  | 'pending_use'
  | 'pending_booking'
  | 'confirmed'
  | 'in_delivery'
  | 'unredeemed'
  | 'redeemed'
  | 'completed'
  | 'canceled'
  | 'refunding'
  | 'refunded'
  | 'refund_card'
  | 'refund_failed';

/** 酒店商品类型 */
export type HotelProductType = 'presale_voucher' | 'calendar_room';

/** 景区商品类型 */
export type ScenicProductType = 'group_buy' | 'group_voucher' | 'presale_voucher' | 'calendar_ticket';

/** 景区预售券订单状态 */
export type ScenicPresaleStatus =
  | 'pending_payment'
  | 'unredeemed'
  | 'booking_confirming'
  | 'booking_confirmed'
  | 'visited'
  | 'redeemed'
  | 'booking_canceled'
  | 'canceled'
  | 'refunding'
  | 'refunded'
  | 'refund_failed';

/** 景区日历票订单状态 */
export type ScenicCalendarStatus =
  | 'pending_payment'
  | 'booking_confirming'
  | 'booking_confirmed'
  | 'visited'
  | 'redeemed'
  | 'canceled'
  | 'refunding'
  | 'refunded'
  | 'refund_failed';

/** 酒店预售券订单状态 */
export type HotelPresaleStatus =
  | 'pending_payment'
  | 'unredeemed'
  | 'booking_confirming'
  | 'booking_confirmed'
  | 'checked_in'
  | 'redeemed'
  | 'booking_canceled'
  | 'canceled'
  | 'refunding'
  | 'refunded'
  | 'refund_failed';

/** 酒店日历房订单状态 */
export type HotelCalendarStatus =
  | 'pending_payment'
  | 'booking_confirming'
  | 'booking_confirmed'
  | 'checked_in'
  | 'redeemed'
  | 'canceled'
  | 'refunding'
  | 'refunded'
  | 'refund_failed';

/** 旅行社商品类型 */
export type TravelProductType = 'presale_voucher';

/** 旅行社预售券订单状态 */
export type TravelPresaleStatus =
  | 'pending_payment'
  | 'pending_book'
  | 'booking_confirming'
  | 'booking_confirmed'
  | 'completed'
  | 'canceled'
  | 'refunding'
  | 'refunded'
  | 'refund_failed';

/** 酒店订单状态文案 */
export type HotelOrderStatusText =
  | '待支付'
  | '待预约'
  | '预约确认中'
  | '预约成功'
  | '预订确认中'
  | '预订成功'
  | '已入住'
  | '交易完成'
  | '预约已取消'
  | '订单取消'
  | '退款申请中'
  | '退款成功'
  | '退款失败';

/** 退款相关信息 */
export interface RefundInfo {
  status: 'refunding' | 'success' | 'failed';
  amount?: number;
  totalQuantity?: number;
  refundQuantity?: number;
  refundTimes?: number;
  paymentMethod?: string;
  reason?: string;
  failReason?: string;
  appliedAt?: string;
  updatedAt?: string;
  progressSteps?: {
    label: string;
    time: string;
    state: 'done' | 'active' | 'pending';
  }[];
}

/** 门店信息 */
export interface RecommendationItem {
  type: 'play' | 'hotel' | 'food' | 'transport';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  distance?: string;
  price?: number;
  tags?: string[];
  actionLabel?: string;
  recommendReason?: string;
}

export interface PlayStrategyData {
  title: string;
  description?: string;
  recommendations: RecommendationItem[];
}
export interface StoreInfo {
  name: string;
  address: string;
  distance?: string;
  phone?: string;
  businessHours?: string;
  status?: 'open' | 'closed' | 'rest';
  imageUrl?: string;
  mapUrl?: string;
  storeListUrl?: string;
  crowdLevel?: 'low' | 'medium' | 'high';
  reservable?: boolean;
}

/** 商品使用规则与套餐详情 */
export interface ProductRules {
  validDate?: string;
  notice?: string[];
  applicableStoreCount?: number;
  packageDetails?: string[];
  featuredItems?: string[];
  recommendedPax?: string;
  recommendedChoices?: string[];
  refundRule?: string;
  entryTime?: string;
  needExchangeTicket?: boolean;
  playStrategy?: string[];
  invalidDate?: string;
  usageRules?: string[];
  entryAddress?: string;
  entryValidity?: string;
  entryCount?: string;
  purchaseDelay?: string;
}

/** 酒店住宿信息 */
export interface HotelInfo {
  productType?: HotelProductType;
  checkInTime?: string;
  checkOutTime?: string;
  breakfast?: string;
  roomFacilities?: string[];
  hotelPolicy?: string[];
  hotelSubStatus?: string;
  roomCount?: number;
}

/** 景区游客信息 */
export interface ScenicVisitor {
  name: string;
  idCard: string;
}

/** 景区门票券码 */
export interface ScenicCoupon {
  code: string;
  used?: boolean;
}

/** 景区门票信息 */
export interface ScenicInfo {
  productType?: ScenicProductType;
  visitDate?: string;
  visitTime?: string;
  ticketType?: string;
  ticketCount?: number;
  visitorName?: string;
  senicSubStatus?: string;
  visitors?: ScenicVisitor[];
  coupons?: ScenicCoupon[];
  insuranceIncluded?: boolean;
  expireDate?: string;
}

export interface ShowInfo {
  showTime?: string;
  duration?: string;
  seatInfo?: string;
  venue?: string;
}

export interface VacationInfo {
  departureDate?: string;
  returnDate?: string;
  agency?: string;
  passengers?: string[];
  gatheringInfo?: string;
}

export interface TravelInfo {
  departureTime?: string;
  arrivalTime?: string;
  departureStation?: string;
  arrivalStation?: string;
  seatClass?: string;
  passenger?: string;
}

/** 商家支持的待使用订单履约/核销能力 */
export type SupportedRedeemMethod = 'self_order' | 'voucher' | 'delivery';

/** 制作进度节点 */
export interface MakeStep {
  key: 'placed' | 'queued' | 'making' | 'ready' | 'picked';
  label: string;
  time?: string;
  state: 'done' | 'active' | 'pending';
}

/** 配送进度节点 */
export interface DeliveryStep {
  key: 'ordered' | 'assigned' | 'picked_up' | 'delivering' | 'arrived';
  label: string;
  time?: string;
  detail?: string;
  state: 'done' | 'active' | 'pending';
}

export type FoodSubOrderType = 'self_order' | 'delivery';
export type FoodSubOrderStatus =
  | 'merchant_pending'
  | 'merchant_making'
  | 'ready_for_pickup'
  | 'picked'
  | 'rider_assigned'
  | 'rider_arrived_store'
  | 'delivering'
  | 'delivered';

export interface RiderInfo {
  name: string;
  avatar?: string;
  phone?: string;
  etaToStore?: string;
  distanceToDestination?: string;
}

export interface FoodSubOrder {
  type: FoodSubOrderType;
  status: FoodSubOrderStatus;
  storeInfo?: StoreInfo;
  pickupCode?: string;
  estimatedWaitTime?: string;
  estimatedReadyTime?: string;
  receiverAddress?: string;
  estimatedArrival?: string;
  deliveredAt?: string;
  rider?: RiderInfo;
}

/** 履约异常预警 */
export interface FulfillmentAlert {
  type: 'delivery_delay' | 'making_delay' | 'refund_failed' | 'other';
  severity: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  suggestedActions?: { label: string; action: string }[];
}

/** 使用提醒 */
export interface RedeemReminder {
  id: string;
  orderId: string;
  remindAt: number;
  createdAt: number;
  status: 'active' | 'canceled' | 'triggered';
}

/** 订单数据模型 */
export interface OrderData {
  orderId: string;
  channel: OrderChannel;
  status: OrderStatus;
  redeemMethod: RedeemMethod;
  supportedRedeemMethods?: SupportedRedeemMethod[];
  category?: OrderCategory;
  subCategory?: 'drink' | 'fast_food' | 'formal_meal' | string;
  productType?: string;
  store: string;
  storeName?: string;
  storeAddress?: string;
  itemSummary: string;
  totalAmount?: number;
  productImage?: string;
  tags?: string[];
  distance?: string;
  orderDetailUrl?: string;
  pickupCode?: string;
  voucherCode?: string;
  paymentExpireAt?: number;
  payExpireAt?: number;
  progress?: MakeStep[];
  deliveryProgress?: DeliveryStep[];
  riderName?: string;
  estimatedArrival?: string;
  foodSubOrder?: FoodSubOrder;
  refundInfo?: RefundInfo;
  storeInfo?: StoreInfo;
  productRules?: ProductRules;
  hotelInfo?: HotelInfo;
  scenicInfo?: ScenicInfo;
  showInfo?: ShowInfo;
  vacationInfo?: VacationInfo;
  travelInfo?: TravelInfo;
  fulfillmentAlert?: FulfillmentAlert;
  redeemReminder?: RedeemReminder;
  checkInDate?: string;
  checkOutDate?: string;
  visitDate?: string;
  deliveryEta?: string;
}

/** 订单品类（兼容旧枚举值 + 新标准类目） */
export type OrderCategory = 'all' | 'food' | 'fun' | 'travel' | 'hotel' | 'play' | 'vacation' | 'show' | 'scenic' | 'general' | 'transport';

/** 订单列表中展示的轻量订单摘要 */
export interface OrderListItem {
  orderId: string;
  /** 商家名称 */
  merchant: string;
  /** 商品摘要 */
  product: string;
  /** 价格（分） */
  price: number;
  /** 订单状态文案 */
  statusText: string;
  /** 状态颜色：green=成功, gray=取消, blue=进行中, orange=待使用 */
  statusColor: 'green' | 'gray' | 'blue' | 'orange';
  /** 品类 */
  category: OrderCategory;
  /** 酒店商品类型：预售券 / 日历房 */
  hotelProductType?: HotelProductType;
  /** 景区商品类型：团购票 / 预售券 / 日历票 */
  scenicProductType?: ScenicProductType;
  /** 旅行社商品类型：预售券 */
  travelProductType?: TravelProductType;
  /** 餐饮/综合类核销方式组合：code=券码核销，order=在线点单，delivery=预约配送 */
  fulfillmentModes?: Array<'code' | 'order' | 'delivery'>;
  /** 预约配送地址（delivery 模式下展示） */
  deliveryAddress?: string;
  /** 预约配送说明（如"最快30分钟送达·配送费¥1起"） */
  deliveryNote?: string;
  /** 配送预约截止时间（如"09.23前可随时预约"） */
  deliveryDeadlineText?: string;
  /** 订单总购买份数 */
  totalQuantity?: number;
  /** 退款份数 */
  refundQuantity?: number;
  /** 退款批次数 */
  refundTimes?: number;
  /** 下单时间 */
  orderTime: string;
  /** 缩略图（演示用 emoji 或 URL） */
  thumbnail: string;
  /** 商品使用规则（可选，有则用于生成标签） */
  productRules?: ProductRules;
}

/** 入口来源 */
export type EntrySource = 'order_detail' | 'order_list' | 'general';

/** 一次会话的诊断结果 */
export interface DiagnoseResult {
  order: OrderData;
  /** 命中的话术 key，便于产品/QA 追踪 */
  template:
    | 'unredeemed_self_order_only'
    | 'unredeemed_voucher_only'
    | 'unredeemed_self_order_and_voucher'
    | 'unredeemed_delivery_only'
    | 'food_pending_payment'
    | 'food_canceled'
    | 'not_self_or_delivery'
    | 'delivery_show_entrance'
    | 'self_order_show_code'
    | 'non_food_order'
    | 'no_order_found'
    | 'product_info'
    | 'hotel_info'
    | 'store_info'
    | 'refund_info'
    | 'play_strategy'
    | 'show_info'
    | 'vacation_info'
    | 'travel_info';
  /** 每一步推理日志 */
  trace: string[];
}

/** 品类中文标签（兼容旧代码，基于统一映射体系） */
export const CATEGORY_LABEL: Record<Exclude<OrderCategory, 'all'>, string> = {
  food: '餐饮',
  fun: '休闲娱乐',
  play: '景区',
  hotel: '酒店',
  travel: '旅行社',
  vacation: '度假',
  show: '演出',
  scenic: '景区',
  general: '综合',
  transport: '大交通',
};

export type MessageAction =
  | {
      label: '需要' | '立即点单';
      kind: 'start_self_order';
      orderId: string;
    }
  | {
      label: '不需要';
      kind: 'decline_self_order';
    }
  | {
      label: '查询其他订单取餐码';
      kind: 'query_other_pickup_codes';
    }
  | {
      label: '立即配送';
      kind: 'start_delivery';
      orderId: string;
    }
  | {
      label: '立即支付';
      kind: 'pay_now';
      orderId: string;
    }
  | {
      label: '再来一单';
      kind: 'reorder';
      orderId: string;
    }
  | {
      label: '去评价';
      kind: 'open_review';
      orderId: string;
    }
  | {
      label: '去评价';
      kind: 'write_review';
      orderId: string;
    }
  | {
      label: '生成一站式攻略';
      kind: 'generate_play_strategy';
      orderId: string;
    }
  | {
      label: '催退款';
      kind: 'urge_merchant';
      orderId: string;
    }
  | {
      label: '联系生活服务客服';
      kind: 'contact_service';
      orderId: string;
    }
  | {
      label: '提前预约免排队' | '帮我约';
      kind: 'open_reservation';
      orderId: string;
      storeName?: string;
    }
  | {
      label: '催一下';
      kind: 'urge_order';
      orderId: string;
    }
  | {
      label: '订单使用提醒';
      kind: 'set_redeem_reminder';
      orderId: string;
    };
