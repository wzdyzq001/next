import type { RedeemReminder, OrderData, StandardCategory } from './types';
import { toStandardCategory } from './types';

const STORAGE_KEY = 'ai_fulfillment_redeem_reminders';

type ReminderChangeListener = (reminders: Record<string, RedeemReminder>) => void;

const listeners = new Set<ReminderChangeListener>();

function subscribeReminders(listener: ReminderChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  const reminders = getReminders();
  listeners.forEach((l) => l(reminders));
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function calcNaturalDayDiff(targetTime: number, now: number = Date.now()): number {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetTime);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function parseValidDate(validDate?: string): { start: Date | null; end: Date | null } {
  if (!validDate) return { start: null, end: null };
  const parts = validDate.split(/至|~/).map(s => s.trim());
  if (parts.length < 2) return { start: null, end: null };
  const start = new Date(parts[0] + 'T00:00:00');
  const end = new Date(parts[1] + 'T23:59:59');
  return {
    start: isNaN(start.getTime()) ? null : start,
    end: isNaN(end.getTime()) ? null : end,
  };
}

function getValidityEndDate(validDate?: string): Date | null {
  return parseValidDate(validDate).end;
}

function getDaysUntilExpiry(validDate?: string, now: number = Date.now()): number {
  const end = getValidityEndDate(validDate);
  if (!end) return 0;
  const diff = calcNaturalDayDiff(end.getTime(), now);
  if (diff <= 0) return 0;
  return diff;
}

function formatExpiryDate(validDate?: string): string {
  const end = getValidityEndDate(validDate);
  if (!end) return '';
  const month = end.getMonth() + 1;
  const day = end.getDate();
  const weekday = WEEKDAY_LABELS[end.getDay()];
  return `${month}月${day}日 ${weekday}`;
}

function formatExpiryDateTime(validDate?: string): string {
  const end = getValidityEndDate(validDate);
  if (!end) return '';
  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, '0');
  const d = String(end.getDate()).padStart(2, '0');
  const hh = String(end.getHours()).padStart(2, '0');
  const mm = String(end.getMinutes()).padStart(2, '0');
  const ss = String(end.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function formatExpiryStatusText(validDate?: string, now: number = Date.now()): string {
  const end = getValidityEndDate(validDate);
  if (!end) return '';
  const diffDays = calcNaturalDayDiff(end.getTime(), now);
  if (diffDays < 0) return '已过期';
  if (diffDays === 0) return '今天过期';
  if (diffDays === 1) return '1天后过期';
  return `${diffDays}天后过期`;
}

function formatReminderBubbleText(daysLater: number): string {
  if (daysLater <= 0) return '今天使用';
  if (daysLater === 1) return '明天使用';
  if (daysLater === 2) return '后天使用';
  return `${daysLater}天后使用`;
}

function getWeekdayDate(targetDay: number, weekOffset: 0 | 1, now: Date = new Date()): Date {
  const result = new Date(now);
  const currentDay = now.getDay();
  let daysDiff = targetDay - currentDay;

  if (weekOffset === 0) {
    if (daysDiff < 0 || (daysDiff === 0 && now.getHours() >= 10)) {
      daysDiff += 7;
    }
  } else {
    if (daysDiff <= 0) {
      daysDiff += 7;
    }
    daysDiff += 7;
  }

  result.setDate(now.getDate() + daysDiff);
  result.setHours(10, 0, 0, 0);
  return result;
}

/**
 * 生成快捷提醒日期选项。
 * - 本周：周五、周六、周日。若目标日期为当日或已过去，则隐藏对应选项。
 * - 下周：周五、周六、周日。始终显示。
 *
 * 判断"是否已过去"以自然日为基准（不考虑具体时刻）。
 * 注意：周日用 0 表示，是一周的第一天，但在业务语义上是本周最后一天。
 *
 * @param now - 当前时间
 * @returns 排序后的快捷选项数组
 */
function getQuickOptions(now: Date = new Date()): Array<{ label: string; date: Date; daysLater: number }> {
  const options: Array<{ label: string; date: Date; daysLater: number }> = [];
  // 周五(5)、周六(6)、周日(0) —— 按时间顺序排列
  const targetDays = [5, 6, 0];
  const weekOffsets: Array<0 | 1> = [0, 1];
  const currentDay = now.getDay();

  /**
   * 计算本周第 targetDay 天距离今天的天数。
   * 返回正数表示未来，0 表示今天，负数表示过去。
   */
  function calcDaysUntil(targetDay: number): number {
    if (currentDay === 0) {
      // 今天是周日：
      // - 周日(0) → 今天 (0)
      // - 周一(1)~周六(6) → 上周的日子，已过去 (targetDay - 7)
      //   例如周五(5) → 5 - 7 = -2 天前
      if (targetDay === 0) return 0;
      return targetDay - 7;
    }

    // 今天不是周日
    if (targetDay === 0) {
      // 目标是周日 → 周日在本周之后
      return 7 - currentDay;
    }
    // 目标是周一~周六
    return targetDay - currentDay;
  }

  /**
   * 判断本周的 targetDay 是否已经过去（包括今天）。
   */
  function isPastInThisWeek(targetDay: number): boolean {
    if (currentDay === 0) {
      // 今天是周日：
      // 本周只有周日(0)是今天，周五(5)周六(6)都是上周的 → 都已过去
      return true;
    }
    // 今天不是周日：
    if (targetDay === 0) {
      // 周日 → 还没到
      return false;
    }
    // 周一到周六：目标日 <= 今天 → 已过去
    return targetDay <= currentDay;
  }

  for (const weekOffset of weekOffsets) {
    for (const targetDay of targetDays) {
      if (weekOffset === 0) {
        // 本周：如果已过去（包括今天），跳过
        if (isPastInThisWeek(targetDay)) {
          continue;
        }
      }

      // 计算目标日期
      let dayDiff: number;
      if (weekOffset === 0) {
        dayDiff = calcDaysUntil(targetDay);
      } else {
        // 下周：本周基础上加 7 天
        const thisWeekDiff = calcDaysUntil(targetDay);
        dayDiff = thisWeekDiff + 7;
      }

      const date = new Date(now);
      date.setDate(now.getDate() + dayDiff);
      date.setHours(10, 0, 0, 0);

      const daysLater = calcNaturalDayDiff(date.getTime(), now.getTime());

      const weekPrefix = weekOffset === 0 ? '本' : '下';
      const label = `${weekPrefix}${WEEKDAY_LABELS[targetDay]}`;

      options.push({ label, date, daysLater });
    }
  }

  return options;
}

function formatReminderText(remindAt: number, now: number): string {
  const diffDays = calcNaturalDayDiff(remindAt, now);

  if (diffDays <= 0) {
    return '今天';
  }
  if (diffDays === 1) {
    return '明天';
  }
  if (diffDays === 2) {
    return '后天';
  }
  if (diffDays <= 6) {
    return `${diffDays}天后`;
  }

  const date = new Date(remindAt);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffWeeks === 1) {
    return `下${WEEKDAY_LABELS[date.getDay()]}`;
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

function getReminders(): Record<string, RedeemReminder> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, RedeemReminder>;
  } catch {
    return {};
  }
}

function saveReminders(reminders: Record<string, RedeemReminder>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  } catch {
  }
}

function setReminder(orderId: string, remindAt: number, extra?: { productName?: string; validDate?: string }): RedeemReminder {
  const reminders = getReminders();
  const existing = reminders[orderId];
  const now = Date.now();

  const reminder: RedeemReminder = {
    id: existing?.id ?? `rem_${now}_${Math.random().toString(36).slice(2, 8)}`,
    orderId,
    remindAt,
    createdAt: existing?.createdAt ?? now,
    status: 'active',
    ...(extra?.productName ? { productName: extra.productName } : {}),
    ...(extra?.validDate ? { validDate: extra.validDate } : {}),
  };

  reminders[orderId] = reminder;
  saveReminders(reminders);
  notifyListeners();
  return reminder;
}

function cancelReminder(orderId: string): void {
  const reminders = getReminders();
  if (reminders[orderId]) {
    reminders[orderId].status = 'canceled';
    saveReminders(reminders);
    notifyListeners();
  }
}

function getReminderByOrder(orderId: string): RedeemReminder | undefined {
  const reminders = getReminders();
  return reminders[orderId];
}

function buildNoticeTags(order: Pick<OrderData, 'productRules' | 'category'>): string[] {
  const refundRule = order.productRules?.refundRule ?? '';
  const notices = order.productRules?.notice ?? [];
  const stdCategory = toStandardCategory(order.category);

  const usageTimeTags: string[] = [];
  const refundTags: string[] = [];

  const isFoodOrLeisure = stdCategory === 'food' || stdCategory === 'general';

  if (isFoodOrLeisure) {
    for (const notice of notices) {
      if (/周一(?:至|到)周日/.test(notice)) {
        usageTimeTags.push('全周可用');
        break;
      }
      const rangeMatch = notice.match(/周([一二三四五六日])(?:至|到)周([一二三四五六日])/);
      if (rangeMatch) {
        usageTimeTags.push(`周${rangeMatch[1]}至周${rangeMatch[2]}可用`);
        break;
      }
      if (/周末.*通用|周末可用/.test(notice)) {
        usageTimeTags.push('周六至周日可用');
        break;
      }
      if (/工作日可用|仅限工作日|限工作日/.test(notice)) {
        usageTimeTags.push('周一至周五可用');
        break;
      }
    }
  }

  if (/不支持退|不可退/.test(refundRule)) {
    refundTags.push('不可退');
  } else if (isFoodOrLeisure) {
    refundTags.push('随时退', '过期退');
  } else {
    if (/随时退/.test(refundRule)) refundTags.push('随时退');
    if (/过期退|过期自动退/.test(refundRule)) refundTags.push('过期退');
  }

  return [...usageTimeTags, ...refundTags].slice(0, 4);
}

interface NoticeTagsConsistencyReport {
  consistent: boolean;
  sourceA: string[];
  sourceB: string[];
  diff: string[];
}

function validateNoticeTagsConsistency(
  orderA: Pick<OrderData, 'productRules' | 'category'>,
  orderB: Pick<OrderData, 'productRules' | 'category'>,
  context?: string
): NoticeTagsConsistencyReport {
  const tagsA = buildNoticeTags(orderA);
  const tagsB = buildNoticeTags(orderB);
  const consistent = tagsA.length === tagsB.length && tagsA.every((t, i) => t === tagsB[i]);

  if (!consistent) {
    const diff = tagsA.filter(t => !tagsB.includes(t)).concat(tagsB.filter(t => !tagsA.includes(t)));
    console.warn(
      `[NoticeTagsConsistency] ${context ?? 'Unknown context'}: 标签数据不一致`,
      JSON.stringify({ sourceA: tagsA, sourceB: tagsB, diff }, null, 2)
    );
    return { consistent: false, sourceA: tagsA, sourceB: tagsB, diff };
  }

  return { consistent: true, sourceA: tagsA, sourceB: tagsB, diff: [] };
}

export {
  STORAGE_KEY,
  getReminders,
  setReminder,
  cancelReminder,
  getReminderByOrder,
  formatReminderText,
  getWeekdayDate,
  getQuickOptions,
  parseValidDate,
  getValidityEndDate,
  getDaysUntilExpiry,
  formatExpiryDate,
  formatExpiryDateTime,
  formatExpiryStatusText,
  formatReminderBubbleText,
  subscribeReminders,
  buildNoticeTags,
  validateNoticeTagsConsistency,
  classifyIndustry,
  isFoodDrinkOrFastFood,
  isHotelPreorder,
  calcNaturalDayDiff,
};

type IndustryCategory = 'food_formal' | 'food_drink_fast' | 'fun' | 'hotel' | 'scenic' | 'travel_agency' | 'transport' | 'other';

function classifyIndustry(order: Pick<OrderData, 'category' | 'subCategory' | 'hotelInfo' | 'travelInfo' | 'vacationInfo' | 'showInfo'>): IndustryCategory {
  const { category, subCategory } = order;
  const std = toStandardCategory(category) as StandardCategory;

  if (std === 'food') {
    if (subCategory === 'drink' || subCategory === 'fast_food') {
      return 'food_drink_fast';
    }
    return 'food_formal';
  }

  if (std === 'hotel') {
    return 'hotel';
  }

  if (std === 'scenic') {
    return 'scenic';
  }

  if (std === 'travel') {
    return 'travel_agency';
  }

  if (std === 'transport') {
    return 'transport';
  }

  if (category === 'fun' || category === 'show') {
    return 'fun';
  }

  return 'other';
}

function isFoodDrinkOrFastFood(order: Pick<OrderData, 'category' | 'subCategory'>): boolean {
  return toStandardCategory(order.category) === 'food' &&
    (order.subCategory === 'drink' || order.subCategory === 'fast_food');
}

function isHotelPreorder(order: Pick<OrderData, 'category' | 'hotelInfo'>): boolean {
  return toStandardCategory(order.category) === 'hotel' && Boolean(order.hotelInfo);
}
