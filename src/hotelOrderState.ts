import type { HotelOrderStatusText, HotelProductType, OrderListItem } from './types';
import { toStandardCategory } from './types';

export type HotelReservationEvent =
  | 'submit_reservation'
  | 'merchant_accept'
  | 'merchant_reject'
  | 'merchant_timeout'
  | 'cancel_reservation';

export interface HotelReservationState {
  status: HotelOrderStatusText;
  deadlineAt?: number;
  notice?: string;
}

export interface HotelStatusView {
  status: HotelOrderStatusText;
  title: string;
  subtitle: string;
  tone: 'pay' | 'waiting' | 'success' | 'done' | 'refund' | 'danger';
  headerHint: string;
  tags: string[];
  primaryAction?: string;
  secondaryAction?: string;
}

export const HOTEL_PRODUCT_TYPE_LABEL: Record<HotelProductType, string> = {
  presale_voucher: '预售券',
  calendar_room: '日历房',
};

const PRESALE_STATUS_VIEW: Record<HotelOrderStatusText, HotelStatusView> = {
  待支付: {
    status: '待支付',
    title: '待支付',
    subtitle: '支付后可预约入住日期',
    tone: 'pay',
    headerHint: '请尽快完成支付，支付成功后再选择门店和房型',
    tags: ['预售券', '支付后预约'],
    primaryAction: '立即支付',
  },
  待预约: {
    status: '待预约',
    title: '待预约',
    subtitle: '选择门店、房型和入住日期后提交预约',
    tone: 'waiting',
    headerHint: '当前通兑券还未预约，请先完成入住预约',
    tags: ['可选门店', '可选房型', '需商家确认'],
    primaryAction: '立即预约',
  },
  预约确认中: {
    status: '预约确认中',
    title: '预约确认中',
    subtitle: '商家正在确认房态，请留意预约结果',
    tone: 'waiting',
    headerHint: '请等待商家接单，超时未接单将自动回到待预约',
    tags: ['房态确认中', '等待商家接单'],
    secondaryAction: '取消预约',
  },
  预约成功: {
    status: '预约成功',
    title: '预约成功',
    subtitle: '商家已确认预约，到店办理入住即可',
    tone: 'success',
    headerHint: '预约已锁定，请按约定日期到店办理入住',
    tags: ['已接单', '入住已确认'],
    primaryAction: '查看预约',
    secondaryAction: '取消预约',
  },
  预订确认中: {
    status: '预订确认中',
    title: '预订确认中',
    subtitle: '该状态通常用于日历房，请检查商品类型配置',
    tone: 'waiting',
    headerHint: '状态与预售券类型不匹配',
    tags: ['状态待确认'],
  },
  预订成功: {
    status: '预订成功',
    title: '预订成功',
    subtitle: '该状态通常用于日历房，请检查商品类型配置',
    tone: 'success',
    headerHint: '状态与预售券类型不匹配',
    tags: ['状态待确认'],
  },
  交易完成: {
    status: '交易完成',
    title: '交易成功',
    subtitle: '感谢到店成功消费，期待再次光临',
    tone: 'done',
    headerHint: '订单已完成，可继续查看订单详情',
    tags: ['已完成', '可评价'],
    primaryAction: '去评价',
  },
  订单取消: {
    status: '订单取消',
    title: '订单取消',
    subtitle: '支付超时，订单已取消',
    tone: 'done',
    headerHint: '订单已取消，可重新购买',
    tags: ['已取消'],
    primaryAction: '再来一单',
  },
  退款成功: {
    status: '退款成功',
    title: '退款成功',
    subtitle: '钱款已原路退回',
    tone: 'refund',
    headerHint: '退款已完成，请以支付账户到账时间为准',
    tags: ['退款完成'],
    primaryAction: '再来一单',
  },
  退款申请中: {
    status: '退款申请中',
    title: '退款申请中',
    subtitle: '退款待审核，审核通过后原路退回',
    tone: 'waiting',
    headerHint: '退款正在处理中，请留意处理结果',
    tags: ['审核中', '原路退回'],
    primaryAction: '催退款',
  },
  退款失败: {
    status: '退款失败',
    title: '退款失败',
    subtitle: '可联系客服核实失败原因',
    tone: 'danger',
    headerHint: '退款未成功，可联系客服继续处理',
    tags: ['退款失败', '客服协助'],
    primaryAction: '联系客服',
  },
  已入住: {
    status: '已入住',
    title: '已入住',
    subtitle: '祝您入住愉快，有问题随时联系前台',
    tone: 'success',
    headerHint: '已办理入住，享受您的旅程',
    tags: ['入住中', '前台服务'],
    primaryAction: '联系前台',
  },
  预约已取消: {
    status: '预约已取消',
    title: '预约已取消',
    subtitle: '预约已取消，券码仍有效可重新预约',
    tone: 'done',
    headerHint: '本次预约已取消，可重新预约其他日期',
    tags: ['预约取消', '券码有效'],
    primaryAction: '重新预约',
  },
};

const CALENDAR_STATUS_VIEW: Record<HotelOrderStatusText, HotelStatusView> = {
  待支付: {
    status: '待支付',
    title: '待支付',
    subtitle: '请在支付时效内完成支付，超时房价可能变化',
    tone: 'pay',
    headerHint: '日历房需先支付锁定房价和入住日期',
    tags: ['日历房', '锁价中'],
    primaryAction: '立即支付',
  },
  待预约: {
    status: '待预约',
    title: '待确认信息',
    subtitle: '请补充入住人信息后提交预订',
    tone: 'waiting',
    headerHint: '日历房已选定日期，请继续确认入住信息',
    tags: ['指定日期', '待补充信息'],
    primaryAction: '继续预订',
  },
  预约确认中: {
    status: '预约确认中',
    title: '预约确认中',
    subtitle: '该状态通常用于预售券，请检查商品类型配置',
    tone: 'waiting',
    headerHint: '状态与日历房类型不匹配',
    tags: ['状态待确认'],
  },
  预约成功: {
    status: '预约成功',
    title: '预约成功',
    subtitle: '该状态通常用于预售券，请检查商品类型配置',
    tone: 'success',
    headerHint: '状态与日历房类型不匹配',
    tags: ['状态待确认'],
  },
  预订确认中: {
    status: '预订确认中',
    title: '预订确认中',
    subtitle: '酒店正在确认房态，请等待预订结果',
    tone: 'waiting',
    headerHint: '酒店确认中，确认后将更新入住凭证',
    tags: ['房态确认中', '入住人已提交'],
    secondaryAction: '联系酒店',
  },
  预订成功: {
    status: '预订成功',
    title: '预订成功',
    subtitle: '房间已预订成功，请按入住日期到店',
    tone: 'success',
    headerHint: '房间已确认，凭入住人证件办理入住',
    tags: ['无需预约', '凭证入住'],
    primaryAction: '查看凭证',
  },
  交易完成: {
    status: '交易完成',
    title: '交易完成',
    subtitle: '感谢入住，期待再次光临',
    tone: 'done',
    headerHint: '订单已完成，可继续查看订单详情',
    tags: ['已离店', '可评价'],
    primaryAction: '去评价',
  },
  订单取消: {
    status: '订单取消',
    title: '订单取消',
    subtitle: '支付超时，订单已取消',
    tone: 'done',
    headerHint: '订单已取消，可重新预订',
    tags: ['已取消'],
    primaryAction: '再来一单',
  },
  退款成功: {
    status: '退款成功',
    title: '退款成功',
    subtitle: '钱款已原路退回',
    tone: 'refund',
    headerHint: '退款已完成，请以支付账户到账时间为准',
    tags: ['退款完成'],
    primaryAction: '再来一单',
  },
  退款申请中: {
    status: '退款申请中',
    title: '退款申请中',
    subtitle: '酒店订单退款审核中',
    tone: 'waiting',
    headerHint: '退款正在处理中，请留意处理结果',
    tags: ['审核中', '按规则退款'],
    primaryAction: '催退款',
  },
  退款失败: {
    status: '退款失败',
    title: '退款失败',
    subtitle: '可联系客服核实失败原因',
    tone: 'danger',
    headerHint: '退款未成功，可联系客服继续处理',
    tags: ['退款失败', '客服协助'],
    primaryAction: '联系客服',
  },
  已入住: {
    status: '已入住',
    title: '已入住',
    subtitle: '祝您入住愉快，有问题随时联系前台',
    tone: 'success',
    headerHint: '已办理入住，享受您的旅程',
    tags: ['入住中', '前台服务'],
    primaryAction: '联系前台',
  },
  预约已取消: {
    status: '预约已取消',
    title: '预订已取消',
    subtitle: '该状态通常用于预售券，请检查商品类型配置',
    tone: 'done',
    headerHint: '状态与日历房类型不匹配',
    tags: ['状态待确认'],
  },
};

export const HOTEL_STATUS_VIEWS: Record<HotelProductType, Record<HotelOrderStatusText, HotelStatusView>> = {
  presale_voucher: PRESALE_STATUS_VIEW,
  calendar_room: CALENDAR_STATUS_VIEW,
};

export const HOTEL_STATUS_TEXTS: HotelOrderStatusText[] = [
  '待支付',
  '待预约',
  '预约确认中',
  '预约成功',
  '预订确认中',
  '预订成功',
  '交易完成',
  '订单取消',
  '退款成功',
  '退款申请中',
  '退款失败',
];

export function isHotelOrder(order: OrderListItem | null | undefined) {
  return order ? toStandardCategory(order.category) === 'hotel' && Boolean(order.hotelProductType) : false;
}

export function getHotelStatusView(productType: HotelProductType, statusText: string) {
  const normalized = HOTEL_STATUS_TEXTS.includes(statusText as HotelOrderStatusText)
    ? statusText as HotelOrderStatusText
    : '待预约';
  return HOTEL_STATUS_VIEWS[productType][normalized];
}

export function getHotelStatusColor(statusText: HotelOrderStatusText): OrderListItem['statusColor'] {
  if (statusText === '预约成功' || statusText === '预订成功') return 'green';
  if (statusText === '预约确认中' || statusText === '预订确认中' || statusText === '退款申请中') return 'blue';
  if (statusText === '待支付' || statusText === '待预约' || statusText === '退款失败') return 'orange';
  return 'gray';
}

export function getHotelCountdownText(deadlineAt: number | undefined, now: number) {
  if (!deadlineAt) return '00:00';
  const remaining = Math.max(0, deadlineAt - now);
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function isValidChinaMobile(phone: string) {
  return /^(?:13\d|14[5-9]|15[0-35-9]|16[2567]|17[0-8]|18\d|19[0-35-9])\d{8}$/.test(phone);
}

function toLocalDate(input: string | number | Date): Date {
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }

  if (typeof input === 'number') {
    const date = new Date(input);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  const matched = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matched) {
    return new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]));
  }

  const date = new Date(input);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatHotelLocalDate(date: string | number | Date) {
  const value = toLocalDate(date);
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');
}

export function addHotelLocalDays(date: string | number | Date, days: number) {
  const value = toLocalDate(date);
  value.setDate(value.getDate() + days);
  return formatHotelLocalDate(value);
}

export function formatHotelStayDateLabel(date: string | number | Date, now: string | number | Date) {
  const target = toLocalDate(date);
  const today = toLocalDate(now);
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((target.getTime() - today.getTime()) / dayMs);
  const weekdayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const dayLabel = diffDays === 0 ? '今天' : diffDays === 1 ? '明天' : weekdayLabels[target.getDay()];

  return `${target.getMonth() + 1}月${target.getDate()}日 ${dayLabel}`;
}

export function getHotelStayDateLabels({
  checkInDate,
  checkOutDate,
  now,
}: {
  checkInDate: string | number | Date;
  checkOutDate: string | number | Date;
  now: string | number | Date;
}) {
  const checkIn = toLocalDate(checkInDate);
  const checkOut = toLocalDate(checkOutDate);
  const dayMs = 24 * 60 * 60 * 1000;
  const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / dayMs));

  return {
    checkInText: formatHotelStayDateLabel(checkIn, now),
    checkOutText: formatHotelStayDateLabel(checkOut, now),
    nights,
  };
}

export function transitionHotelReservation(
  current: HotelReservationState,
  event: HotelReservationEvent,
  now: number,
  confirmWindowMs = 5 * 60 * 1000,
): HotelReservationState {
  if (event === 'submit_reservation') {
    return {
      status: '预约确认中',
      deadlineAt: now + confirmWindowMs,
      notice: '预约已提交，等待商家确认',
    };
  }

  if (event === 'merchant_accept') {
    if (current.status !== '预约确认中' && current.status !== '预订确认中') {
      return current;
    }
    return {
      status: current.status === '预订确认中' ? '预订成功' : '预约成功',
      notice: '商家已接单，预约成功',
    };
  }

  if (event === 'merchant_reject') {
    if (current.status !== '预约确认中' && current.status !== '预订确认中') {
      return current;
    }
    return {
      status: '待预约',
      notice: '商家未能确认本次预约，请重新发起预约',
    };
  }

  if (event === 'cancel_reservation') {
    return {
      status: '待预约',
      notice: '当前预约已取消，可重新发起预约',
    };
  }

  if (event === 'merchant_timeout') {
    return {
      status: '待预约',
      notice: '商家未在规定时间内接单，请重新发起预约',
    };
  }

  return current;
}

export function refreshHotelReservationByTime(
  current: HotelReservationState,
  now: number,
): HotelReservationState {
  if (
    (current.status === '预约确认中' || current.status === '预订确认中') &&
    current.deadlineAt &&
    now >= current.deadlineAt
  ) {
    return transitionHotelReservation(current, 'merchant_timeout', now);
  }
  return current;
}
