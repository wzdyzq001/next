import type { IntentType, ReservationSlot, ReminderSlot } from './types';

const RESERVATION_KEYWORDS = [
  '预约', '帮我约', '立即预约', '马上预约', '订座', '预订', '约一下',
  '约个时间', '预约一下', '帮忙预约', '我要预约', '约吗', '预约一下',
];

const REMINDER_KEYWORDS = [
  '提醒', '设置提醒', '帮我提醒', '提醒我', '到期提醒', '使用提醒',
  '设置一个提醒', '记得提醒我', '提醒设置', '帮我设置提醒',
];

const PICKUP_CODE_KEYWORDS = [
  '取餐码', '取餐', '取号', '餐号', '号码', '取餐号', '取餐码在哪',
  '我的取餐码', '查看取餐码', '取餐号码',
];

const DELIVERY_KEYWORDS = [
  '配送', '物流', '骑手', '外卖', '送到哪了', '什么时候到', '配送进度',
  '还要多久', '怎么还没到', '到哪了', '送到哪里了', '配送状态', '外卖到哪了',
  '多久到', '什么时候送到', '配送中', '外卖进度',
];

export function detectIntent(text: string): { intent: IntentType; confidence: number } {
  const lower = text.toLowerCase();
  let maxConfidence = 0;
  let detectedIntent: IntentType = 'unknown';

  const deliveryScore = DELIVERY_KEYWORDS.filter(k => lower.includes(k)).length;
  if (deliveryScore > 0 && deliveryScore / DELIVERY_KEYWORDS.length > maxConfidence) {
    maxConfidence = deliveryScore / DELIVERY_KEYWORDS.length;
    detectedIntent = 'delivery';
  }

  const pickupScore = PICKUP_CODE_KEYWORDS.filter(k => lower.includes(k)).length;
  if (pickupScore > 0 && pickupScore / PICKUP_CODE_KEYWORDS.length > maxConfidence) {
    maxConfidence = pickupScore / PICKUP_CODE_KEYWORDS.length;
    detectedIntent = 'pickup_code';
  }

  const reservationScore = RESERVATION_KEYWORDS.filter(k => lower.includes(k)).length;
  if (reservationScore > 0 && reservationScore / RESERVATION_KEYWORDS.length > maxConfidence) {
    maxConfidence = reservationScore / RESERVATION_KEYWORDS.length;
    detectedIntent = 'reservation';
  }

  const reminderScore = REMINDER_KEYWORDS.filter(k => lower.includes(k)).length;
  if (reminderScore > 0 && reminderScore / REMINDER_KEYWORDS.length > maxConfidence) {
    maxConfidence = reminderScore / REMINDER_KEYWORDS.length;
    detectedIntent = 'reminder';
  }

  return { intent: detectedIntent, confidence: maxConfidence };
}

const WEEKDAY_MAP: Record<string, number> = {
  '日': 0, '天': 0, '周日': 0, '星期天': 0,
  '一': 1, '周一': 1, '星期一': 1,
  '二': 2, '周二': 2, '星期二': 2,
  '三': 3, '周三': 3, '星期三': 3,
  '四': 4, '周四': 4, '星期四': 4,
  '五': 5, '周五': 5, '星期五': 5,
  '六': 6, '周六': 6, '星期六': 6,
};

export function parseDate(text: string, baseDate: Date = new Date()): Date | null {
  const lower = text;
  const today = new Date(baseDate);
  today.setHours(0, 0, 0, 0);

  if (lower.includes('今天') || lower.includes('今日')) {
    return today;
  }

  if (lower.includes('明天') || lower.includes('明日')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }

  if (lower.includes('后天')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return d;
  }

  const beforeExpireMatch = lower.match(/过期前\s*(\d+)\s*天/);
  if (beforeExpireMatch) {
    return null;
  }

  const nextWeekMatch = lower.match(/下(?:周|星期|个周)([日一二三四五六天])/);
  if (nextWeekMatch) {
    const dayName = nextWeekMatch[1];
    const targetDay = WEEKDAY_MAP[dayName];
    if (targetDay !== undefined) {
      const d = new Date(today);
      const daysUntil = (targetDay - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + daysUntil + 7);
      return d;
    }
  }

  const thisWeekMatch = lower.match(/(?:本|这)(?:周|星期)([日一二三四五六天])/);
  if (thisWeekMatch) {
    const dayName = thisWeekMatch[1];
    const targetDay = WEEKDAY_MAP[dayName];
    if (targetDay !== undefined) {
      const d = new Date(today);
      const daysUntil = (targetDay - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + daysUntil);
      return d;
    }
  }

  const weekdayMatch = lower.match(/周([日一二三四五六天])/);
  if (weekdayMatch) {
    const dayName = weekdayMatch[1];
    const targetDay = WEEKDAY_MAP[dayName];
    if (targetDay !== undefined) {
      const d = new Date(today);
      const daysUntil = (targetDay - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + daysUntil);
      return d;
    }
  }

  const mdMatch = lower.match(/(\d{1,2})[月\/\-](\d{1,2})[日号]?/);
  if (mdMatch) {
    const month = parseInt(mdMatch[1], 10) - 1;
    const day = parseInt(mdMatch[2], 10);
    const d = new Date(today.getFullYear(), month, day);
    if (d < today) {
      d.setFullYear(d.getFullYear() + 1);
    }
    return d;
  }

  const inXDaysMatch = lower.match(/(\d+)\s*天后?/);
  if (inXDaysMatch && !lower.includes('过期')) {
    const days = parseInt(inXDaysMatch[1], 10);
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d;
  }

  return null;
}

export function parseTime(text: string): string | null {
  const hmMatch = text.match(/(\d{1,2})[:点](\d{1,2})/);
  if (hmMatch) {
    const h = parseInt(hmMatch[1], 10);
    const m = parseInt(hmMatch[2], 10);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  const hourMatch = text.match(/(\d{1,2})\s*点/);
  if (hourMatch) {
    const h = parseInt(hourMatch[1], 10);
    if (h >= 0 && h < 24) {
      return `${String(h).padStart(2, '0')}:00`;
    }
  }

  const halfMatch = text.match(/(\d{1,2})\s*点半/);
  if (halfMatch) {
    const h = parseInt(halfMatch[1], 10);
    if (h >= 0 && h < 24) {
      return `${String(h).padStart(2, '0')}:30`;
    }
  }

  if (text.includes('早上') || text.includes('上午')) {
    return '10:00';
  }
  if (text.includes('中午') || text.includes('午饭') || text.includes('午餐')) {
    return '12:00';
  }
  if (text.includes('下午')) {
    return '15:00';
  }
  if (text.includes('晚上') || text.includes('晚饭') || text.includes('晚餐') || text.includes('夜宵')) {
    return '18:30';
  }

  return null;
}

const NUM_MAP: Record<string, number> = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
};

export function parsePax(text: string): number | null {
  const digitMatch = text.match(/(\d+)\s*(?:人|位|个)/);
  if (digitMatch) {
    return parseInt(digitMatch[1], 10);
  }

  const chineseMatch = text.match(/([零一二两三四五六七八九十]+)\s*(?:人|位|个)/);
  if (chineseMatch) {
    const cn = chineseMatch[1];
    if (NUM_MAP[cn] !== undefined) return NUM_MAP[cn];
    if (cn === '十一') return 11;
    if (cn === '十二') return 12;
  }

  const justNumMatch = text.match(/^(\d+)$/);
  if (justNumMatch) {
    return parseInt(justNumMatch[1], 10);
  }

  return null;
}

export function extractReservationInfo(text: string, existingSlot: ReservationSlot): ReservationSlot {
  const slot: ReservationSlot = { ...existingSlot };

  const date = parseDate(text);
  if (date) slot.date = date;

  const time = parseTime(text);
  if (time) slot.time = time;

  const pax = parsePax(text);
  if (pax) slot.pax = pax;

  return slot;
}

export function extractReminderInfo(
  text: string,
  existingSlot: ReminderSlot,
  validUntil?: Date
): { slot: ReminderSlot; isBeforeExpire: boolean; expireDays?: number } {
  const slot: ReminderSlot = { ...existingSlot };
  let isBeforeExpire = false;
  let expireDays: number | undefined;

  const beforeExpireMatch = text.match(/过期前\s*(\d+)\s*天/);
  if (beforeExpireMatch && validUntil) {
    expireDays = parseInt(beforeExpireMatch[1], 10);
    const d = new Date(validUntil);
    d.setDate(d.getDate() - expireDays);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d >= today) {
      slot.remindAt = d;
    }
    isBeforeExpire = true;
  }

  if (text.includes('最后一天') || text.includes('到期当天') || text.includes('过期当天')) {
    if (validUntil) {
      const d = new Date(validUntil);
      d.setHours(0, 0, 0, 0);
      slot.remindAt = d;
      isBeforeExpire = true;
      expireDays = 0;
    }
  }

  if (!slot.remindAt) {
    const date = parseDate(text);
    if (date) {
      slot.remindAt = date;
    }
  }

  return { slot, isBeforeExpire, expireDays };
}
