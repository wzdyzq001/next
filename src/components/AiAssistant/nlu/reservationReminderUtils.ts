import { toStandardCategory } from '../../../types';

function parseDateValue(dateStr: string, now: number = Date.now()): Date | null {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (dateStr === '今天') {
    return new Date(today);
  }
  if (dateStr === '明天') {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (dateStr === '后天') {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return d;
  }
  if (dateStr === '大后天') {
    const d = new Date(today);
    d.setDate(d.getDate() + 3);
    return d;
  }
  if (dateStr === '昨天') {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d;
  }
  if (dateStr === '前天') {
    const d = new Date(today);
    d.setDate(d.getDate() - 2);
    return d;
  }
  if (dateStr === '大前天') {
    const d = new Date(today);
    d.setDate(d.getDate() - 3);
    return d;
  }

  const daysAfterMatch = dateStr.match(/^(\d+)天后$/);
  if (daysAfterMatch) {
    const d = new Date(today);
    d.setDate(d.getDate() + parseInt(daysAfterMatch[1]));
    return d;
  }

  const daysBeforeMatch = dateStr.match(/^(\d+)天前$/);
  if (daysBeforeMatch) {
    const d = new Date(today);
    d.setDate(d.getDate() - parseInt(daysBeforeMatch[1]));
    return d;
  }

  const weekMatch = dateStr.match(/^周(一|二|三|四|五|六|日|天)$/);
  if (weekMatch) {
    const dayMap: Record<string, number> = { '日': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '天': 0 };
    const targetDay = dayMap[weekMatch[1]];
    const currentDay = today.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7;
    const d = new Date(today);
    d.setDate(d.getDate() + diff);
    return d;
  }

  const nextWeekMatch = dateStr.match(/^下周(一|二|三|四|五|六|日|天)$/);
  if (nextWeekMatch) {
    const dayMap: Record<string, number> = { '日': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '天': 0 };
    const targetDay = dayMap[nextWeekMatch[1]];
    const currentDay = today.getDay();
    let diff = targetDay - currentDay + 7;
    const d = new Date(today);
    d.setDate(d.getDate() + diff);
    return d;
  }

  const thisWeekMatch = dateStr.match(/^本周(一|二|三|四|五|六|日|天)$/);
  if (thisWeekMatch) {
    const dayMap: Record<string, number> = { '日': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '天': 0 };
    const targetDay = dayMap[thisWeekMatch[1]];
    const currentDay = today.getDay();
    let diff = targetDay - currentDay;
    if (diff < 0) diff += 7;
    const d = new Date(today);
    d.setDate(d.getDate() + diff);
    return d;
  }

  const monthDayMatch = dateStr.match(/^(\d{1,2})月(\d{1,2})日$/);
  if (monthDayMatch) {
    const month = parseInt(monthDayMatch[1]);
    const day = parseInt(monthDayMatch[2]);
    const d = new Date(today.getFullYear(), month - 1, day);
    return d;
  }

  return null;
}

export function parseReservationTimestamp(dateStr: string, timeStr: string, now?: number): number | null {
  const refNow = now ?? Date.now();
  const date = parseDateValue(dateStr, refNow);
  if (!date) return null;

  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) return null;

  const hour = parseInt(timeMatch[1]);
  const min = parseInt(timeMatch[2]);

  if (hour < 0 || hour > 23 || min < 0 || min > 59) return null;

  date.setHours(hour, min, 0, 0);
  return date.getTime();
}

export function calculateHoursDiff(timestamp1: number, timestamp2: number): number {
  return Math.abs(timestamp1 - timestamp2) / (1000 * 60 * 60);
}

export function getReminderBeforeReservation(reservationTimestamp: number): number {
  return reservationTimestamp - 60 * 60 * 1000;
}

export function isMoreThan12Hours(reminderTimestamp: number, reservationTimestamp: number): boolean {
  if (reminderTimestamp >= reservationTimestamp) return false;
  const diffHours = (reservationTimestamp - reminderTimestamp) / (1000 * 60 * 60);
  return diffHours > 12;
}

export function validateReminderTimeAgainstReservation(
  reminderTimestamp: number,
  reservationTimestamp: number
): { valid: boolean; error?: string; warning?: string } {
  if (reminderTimestamp <= Date.now()) {
    return { valid: false, error: '提醒时间已过期，请设置一个未来的时间哦～' };
  }

  if (reminderTimestamp >= reservationTimestamp) {
    return { valid: false, error: '提醒时间不能晚于预约时间哦，请调整时间' };
  }

  if (isMoreThan12Hours(reminderTimestamp, reservationTimestamp)) {
    return { valid: true, warning: '提醒时间距离预约比较久，中间可能会忘记哦，建议设置得近一点～' };
  }

  return { valid: true };
}

function getOrderCategory(orderCard: any): string {
  return orderCard.category || orderCard.orderCategory || orderCard.industry || orderCard.businessType || orderCard.type || '';
}

function isFoodCategory(orderCard: any): boolean {
  const cat = getOrderCategory(orderCard);
  const stdCat = toStandardCategory(cat);
  return stdCat === 'food';
}

function isGeneralCategory(orderCard: any): boolean {
  const cat = getOrderCategory(orderCard);
  const stdCat = toStandardCategory(cat);
  return stdCat === 'general';
}

function hasSelfOrderOrDelivery(orderCard: any): boolean {
  const redeemMethod = orderCard.redeemMethod || orderCard.fulfillmentType || '';
  const redeemTypes = orderCard.redeemTypes || [];
  if (redeemMethod === 'self_order' || redeemMethod === 'delivery') return true;
  if (redeemTypes.includes('self_order') || redeemTypes.includes('order') || redeemTypes.includes('delivery')) return true;
  return false;
}

function getScenicProductType(orderCard: any): string {
  return (
    orderCard.scenicProductType ||
    orderCard.productType ||
    orderCard.subCategory ||
    ''
  );
}

function getHotelProductType(orderCard: any): string {
  return (
    orderCard.hotelProductType ||
    orderCard.productType ||
    orderCard.subCategory ||
    ''
  );
}

export function isFreeReservationOrder(orderCard: any): boolean {
  const stdCategory = toStandardCategory(getOrderCategory(orderCard));

  const scenicProductType = getScenicProductType(orderCard);
  const hotelProductType = getHotelProductType(orderCard);
  const travelProductType = orderCard.travelProductType || '';

  if (scenicProductType === 'presale_voucher' || scenicProductType === 'calendar_ticket') {
    return false;
  }
  if (hotelProductType === 'presale_voucher' || hotelProductType === 'calendar_room') {
    return false;
  }
  if (travelProductType === 'presale_voucher') {
    return false;
  }
  if (orderCard.productType === 'presale_voucher') {
    return false;
  }

  if (isFoodCategory(orderCard)) {
    if (hasSelfOrderOrDelivery(orderCard)) {
      return false;
    }
    return true;
  }

  if (isGeneralCategory(orderCard)) {
    return true;
  }

  return false;
}
