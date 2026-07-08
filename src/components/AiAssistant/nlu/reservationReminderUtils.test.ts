import { describe, it, expect } from 'vitest';
import {
  parseReservationTimestamp,
  calculateHoursDiff,
  getReminderBeforeReservation,
  isMoreThan12Hours,
  isFreeReservationOrder,
} from './reservationReminderUtils';

describe('parseReservationTimestamp', () => {
  const baseNow = new Date('2026-07-07T10:00:00').getTime();

  it('今天 + 18:00 → 正确解析', () => {
    const result = parseReservationTimestamp('今天', '18:00', baseNow);
    expect(result).not.toBeNull();
    const date = new Date(result!);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(7);
    expect(date.getHours()).toBe(18);
    expect(date.getMinutes()).toBe(0);
  });

  it('明天 + 10:30 → 正确解析', () => {
    const result = parseReservationTimestamp('明天', '10:30', baseNow);
    expect(result).not.toBeNull();
    const date = new Date(result!);
    expect(date.getDate()).toBe(8);
    expect(date.getHours()).toBe(10);
    expect(date.getMinutes()).toBe(30);
  });

  it('后天 + 09:00 → 正确解析', () => {
    const result = parseReservationTimestamp('后天', '09:00', baseNow);
    expect(result).not.toBeNull();
    const date = new Date(result!);
    expect(date.getDate()).toBe(9);
    expect(date.getHours()).toBe(9);
    expect(date.getMinutes()).toBe(0);
  });

  it('大后天 + 20:00 → 正确解析', () => {
    const result = parseReservationTimestamp('大后天', '20:00', baseNow);
    expect(result).not.toBeNull();
    const date = new Date(result!);
    expect(date.getDate()).toBe(10);
    expect(date.getHours()).toBe(20);
    expect(date.getMinutes()).toBe(0);
  });

  it('周X 格式 → 正确解析', () => {
    const result = parseReservationTimestamp('周五', '19:00', baseNow);
    expect(result).not.toBeNull();
    const date = new Date(result!);
    expect(date.getDay()).toBe(5);
    expect(date.getHours()).toBe(19);
    expect(date.getMinutes()).toBe(0);
  });

  it('下周X 格式 → 正确解析', () => {
    const result = parseReservationTimestamp('下周一', '14:00', baseNow);
    expect(result).not.toBeNull();
    const date = new Date(result!);
    expect(date.getDay()).toBe(1);
    expect(date.getHours()).toBe(14);
    expect(date.getMinutes()).toBe(0);
    expect(date.getDate()).toBeGreaterThan(7);
  });

  it('本周X 格式 → 正确解析', () => {
    const result = parseReservationTimestamp('本周三', '15:00', baseNow);
    expect(result).not.toBeNull();
    const date = new Date(result!);
    expect(date.getDay()).toBe(3);
    expect(date.getHours()).toBe(15);
    expect(date.getMinutes()).toBe(0);
  });

  it('X月X日 格式 → 正确解析', () => {
    const result = parseReservationTimestamp('7月15日', '12:00', baseNow);
    expect(result).not.toBeNull();
    const date = new Date(result!);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(15);
    expect(date.getHours()).toBe(12);
    expect(date.getMinutes()).toBe(0);
  });

  it('无效日期字符串 → 返回 null', () => {
    const result = parseReservationTimestamp('不存在的日期', '18:00', baseNow);
    expect(result).toBeNull();
  });

  it('无效时间格式 → 返回 null', () => {
    const result = parseReservationTimestamp('今天', '六点半', baseNow);
    expect(result).toBeNull();
  });

  it('时间超出范围 → 返回 null', () => {
    const result = parseReservationTimestamp('今天', '25:00', baseNow);
    expect(result).toBeNull();
  });
});

describe('calculateHoursDiff', () => {
  it('两个时间戳相差 2 小时 → 返回 2', () => {
    const t1 = new Date('2026-07-07T10:00:00').getTime();
    const t2 = new Date('2026-07-07T12:00:00').getTime();
    expect(calculateHoursDiff(t1, t2)).toBe(2);
  });

  it('两个时间戳相差 30 分钟 → 返回 0.5', () => {
    const t1 = new Date('2026-07-07T10:00:00').getTime();
    const t2 = new Date('2026-07-07T10:30:00').getTime();
    expect(calculateHoursDiff(t1, t2)).toBe(0.5);
  });

  it('顺序不影响结果（绝对值）', () => {
    const t1 = new Date('2026-07-07T10:00:00').getTime();
    const t2 = new Date('2026-07-07T12:00:00').getTime();
    expect(calculateHoursDiff(t1, t2)).toBe(calculateHoursDiff(t2, t1));
  });

  it('相差 1.5 小时 → 返回 1.5', () => {
    const t1 = new Date('2026-07-07T10:00:00').getTime();
    const t2 = new Date('2026-07-07T11:30:00').getTime();
    expect(calculateHoursDiff(t1, t2)).toBe(1.5);
  });
});

describe('getReminderBeforeReservation', () => {
  it('正常情况：预约时间 18:00 → 提醒时间 17:00', () => {
    const reservationTime = new Date('2026-07-07T18:00:00').getTime();
    const reminderTime = getReminderBeforeReservation(reservationTime);
    const date = new Date(reminderTime);
    expect(date.getHours()).toBe(17);
    expect(date.getMinutes()).toBe(0);
    expect(reminderTime).toBe(reservationTime - 60 * 60 * 1000);
  });

  it('跨天情况：预约时间 00:30 → 提醒时间前一天 23:30', () => {
    const reservationTime = new Date('2026-07-08T00:30:00').getTime();
    const reminderTime = getReminderBeforeReservation(reservationTime);
    const date = new Date(reminderTime);
    expect(date.getDate()).toBe(7);
    expect(date.getHours()).toBe(23);
    expect(date.getMinutes()).toBe(30);
  });

  it('预约时间 01:00 → 提醒时间前一天 00:00', () => {
    const reservationTime = new Date('2026-07-08T01:00:00').getTime();
    const reminderTime = getReminderBeforeReservation(reservationTime);
    const date = new Date(reminderTime);
    expect(date.getDate()).toBe(8);
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
  });
});

describe('isMoreThan12Hours', () => {
  it('提醒时间早于预约时间刚好 12 小时 → 返回 false', () => {
    const reservationTime = new Date('2026-07-07T18:00:00').getTime();
    const reminderTime = reservationTime - 12 * 60 * 60 * 1000;
    expect(isMoreThan12Hours(reminderTime, reservationTime)).toBe(false);
  });

  it('提醒时间早于预约时间 12 小时 1 分钟 → 返回 true', () => {
    const reservationTime = new Date('2026-07-07T18:00:00').getTime();
    const reminderTime = reservationTime - (12 * 60 * 60 * 1000 + 60 * 1000);
    expect(isMoreThan12Hours(reminderTime, reservationTime)).toBe(true);
  });

  it('提醒时间早于预约时间少于 12 小时 → 返回 false', () => {
    const reservationTime = new Date('2026-07-07T18:00:00').getTime();
    const reminderTime = reservationTime - 10 * 60 * 60 * 1000;
    expect(isMoreThan12Hours(reminderTime, reservationTime)).toBe(false);
  });

  it('提醒时间晚于预约时间 → 返回 false', () => {
    const reservationTime = new Date('2026-07-07T18:00:00').getTime();
    const reminderTime = reservationTime + 60 * 60 * 1000;
    expect(isMoreThan12Hours(reminderTime, reservationTime)).toBe(false);
  });

  it('提醒时间等于预约时间 → 返回 false', () => {
    const time = new Date('2026-07-07T18:00:00').getTime();
    expect(isMoreThan12Hours(time, time)).toBe(false);
  });
});

describe('isFreeReservationOrder', () => {
  it('餐饮类（非 self_order/delivery）→ true', () => {
    const order = {
      category: 'food',
      statusText: '待使用',
      redeemMethod: 'voucher',
    };
    expect(isFreeReservationOrder(order)).toBe(true);
  });

  it('餐饮类（self_order）→ false', () => {
    const order = {
      category: 'food',
      statusText: '待使用',
      redeemMethod: 'self_order',
    };
    expect(isFreeReservationOrder(order)).toBe(false);
  });

  it('餐饮类（delivery）→ false', () => {
    const order = {
      category: 'food',
      statusText: '待使用',
      redeemMethod: 'delivery',
    };
    expect(isFreeReservationOrder(order)).toBe(false);
  });

  it('综合类（休闲娱乐）→ true', () => {
    const order = {
      category: 'fun',
      statusText: '待使用',
    };
    expect(isFreeReservationOrder(order)).toBe(true);
  });

  it('综合类（丽人/演出）→ true', () => {
    const order = {
      category: 'show',
      statusText: '待使用',
    };
    expect(isFreeReservationOrder(order)).toBe(true);
  });

  it('综合类（general）→ true', () => {
    const order = {
      category: 'general',
      statusText: '待使用',
    };
    expect(isFreeReservationOrder(order)).toBe(true);
  });

  it('预售券（presale_voucher）→ false', () => {
    const order = {
      category: 'scenic',
      productType: 'presale_voucher',
      statusText: '待使用',
    };
    expect(isFreeReservationOrder(order)).toBe(false);
  });

  it('日历票（calendar_ticket）→ false', () => {
    const order = {
      category: 'scenic',
      scenicProductType: 'calendar_ticket',
      statusText: '待使用',
    };
    expect(isFreeReservationOrder(order)).toBe(false);
  });

  it('日历房（calendar_room）→ false', () => {
    const order = {
      category: 'hotel',
      hotelProductType: 'calendar_room',
      statusText: '待使用',
    };
    expect(isFreeReservationOrder(order)).toBe(false);
  });

  it('酒店预售券 → false', () => {
    const order = {
      category: 'hotel',
      hotelProductType: 'presale_voucher',
      statusText: '待使用',
    };
    expect(isFreeReservationOrder(order)).toBe(false);
  });

  it('旅行社预售券 → false', () => {
    const order = {
      category: 'travel',
      travelProductType: 'presale_voucher',
      statusText: '待使用',
    };
    expect(isFreeReservationOrder(order)).toBe(false);
  });
});
