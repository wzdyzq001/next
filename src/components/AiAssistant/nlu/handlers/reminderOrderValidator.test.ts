import { describe, it, expect } from 'vitest';
import { canOrderSetReminder } from './reminderOrderValidator';

describe('canOrderSetReminder', () => {
  describe('餐饮类', () => {
    it('餐饮类待使用订单 → 通过', () => {
      const order = {
        category: 'food',
        statusText: '待使用',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('餐饮类（美食别名）待使用 → 通过', () => {
      const order = {
        category: '美食',
        mainStatus: 'unused',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(true);
    });

    it('餐饮正餐已预约 → 通过（自由预约）', () => {
      const order = {
        category: 'food',
        statusText: '待使用',
        bookingStatus: '已预约',
        bookingDate: '2026-07-15',
        bookingTime: '19:30',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(true);
      expect(result.reservationTimestamp).toBeDefined();
    });

    it('餐饮正餐已预约（预约成功） → 通过（自由预约）', () => {
      const order = {
        category: 'food',
        statusText: '待使用',
        bookingStatus: '预约成功',
        bookingDate: '2026-08-01',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(true);
      expect(result.reservationTimestamp).toBeDefined();
    });

    it('餐饮自助点餐（self_order）已预约 → 不通过自由预约逻辑', () => {
      const order = {
        category: 'food',
        statusText: '待使用',
        bookingStatus: '已预约',
        redeemMethod: 'self_order',
        bookingDate: '2026-07-20',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(true);
      expect(result.reservationTimestamp).toBeUndefined();
    });
  });

  describe('综合类', () => {
    it('综合类（休闲娱乐）待使用 → 通过', () => {
      const order = {
        category: 'fun',
        statusText: '待使用',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(true);
    });

    it('综合类（演出）待使用 → 通过', () => {
      const order = {
        category: 'show',
        statusText: '待使用',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(true);
    });

    it('综合类（其他综合）待使用 → 通过', () => {
      const order = {
        category: 'general',
        statusText: '待使用',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(true);
    });

    it('综合休闲娱乐已预约 → 通过（自由预约）', () => {
      const order = {
        category: 'fun',
        statusText: '待使用',
        bookingStatus: '已预约',
        bookingDate: '2026-07-20',
        bookingTime: '14:00',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(true);
      expect(result.reservationTimestamp).toBeDefined();
    });

    it('综合丽人已预约 → 通过（自由预约）', () => {
      const order = {
        category: 'beauty',
        statusText: '待使用',
        bookingStatus: '预约成功',
        bookingDate: '2026-08-05',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(true);
      expect(result.reservationTimestamp).toBeDefined();
    });

    it('综合演出已预约 → 通过（自由预约）', () => {
      const order = {
        category: 'show',
        statusText: '待使用',
        bookingStatus: '已预约',
        bookingDate: '2026-09-10',
        bookingTime: '19:00',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(true);
      expect(result.reservationTimestamp).toBeDefined();
    });
  });

  describe('综合类 - 度假子类（按旅行社规则处理）', () => {
    it('度假子类待预约 → 通过', () => {
      const order = {
        category: 'vacation',
        subCategory: 'vacation',
        productType: 'presale_voucher',
        statusText: '待使用',
        bookingStatus: '待预约',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(true);
    });

    it('度假子类预约中 → 拦截（has_booking）', () => {
      const order = {
        category: 'vacation',
        productType: 'presale_voucher',
        statusText: '待使用',
        bookingStatus: '预约确认中',
        bookingDate: '2026-08-15',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(false);
      expect(result.reason).toBe('has_booking');
      expect(result.bookingDate).toBe('2026-08-15');
      expect(result.hint).toContain('2026-08-15');
    });

    it('度假子类预约成功 → 拦截（has_booking）', () => {
      const order = {
        category: 'general',
        subCategory: 'vacation',
        productType: 'presale_voucher',
        statusText: '待使用',
        bookingStatus: '预约成功',
        travelDate: '2026-09-01',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(false);
      expect(result.reason).toBe('has_booking');
      expect(result.bookingDate).toBe('2026-09-01');
    });
  });

  describe('景区类', () => {
    it('景区团购（group_buy）待使用 → 通过', () => {
      const order = {
        category: 'scenic',
        scenicProductType: 'group_buy',
        statusText: '待使用',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(true);
    });

    it('景区团购券（group_voucher）待使用 → 通过', () => {
      const order = {
        category: 'scenic',
        productType: 'group_voucher',
        statusText: '待使用',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(true);
    });

    it('景区预售券待预约 → 通过', () => {
      const order = {
        category: 'scenic',
        productType: 'presale_voucher',
        statusText: '待使用',
        bookingStatus: '待预约',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(true);
    });

    it('景区预售券预约中 → 拦截（has_booking）', () => {
      const order = {
        category: 'scenic',
        productType: 'presale_voucher',
        statusText: '待使用',
        bookingStatus: '商家确认中',
        useDate: '2026-07-20',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(false);
      expect(result.reason).toBe('has_booking');
      expect(result.bookingDate).toBe('2026-07-20');
    });

    it('景区预售券预约成功 → 拦截（has_booking）', () => {
      const order = {
        category: 'scenic',
        productType: 'presale_voucher',
        statusText: '待使用',
        bookingStatus: '已预约',
        bookingDate: '2026-07-25',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(false);
      expect(result.reason).toBe('has_booking');
      expect(result.bookingDate).toBe('2026-07-25');
    });

    it('景区日历票 → 拦截（has_booking）', () => {
      const order = {
        category: 'scenic',
        productType: 'calendar_ticket',
        statusText: '待使用',
        bookingDate: '2026-08-01',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(false);
      expect(result.reason).toBe('has_booking');
      expect(result.bookingDate).toBe('2026-08-01');
    });
  });

  describe('酒店类', () => {
    it('酒店预售券待预约 → 通过', () => {
      const order = {
        category: 'hotel',
        hotelProductType: 'presale_voucher',
        statusText: '待使用',
        bookingStatus: '待预约',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(true);
    });

    it('酒店预售券预约中 → 拦截（has_booking）', () => {
      const order = {
        category: 'hotel',
        productType: 'presale_voucher',
        statusText: '待使用',
        bookingStatus: 'booking_confirming',
        checkInDate: '2026-08-10',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(false);
      expect(result.reason).toBe('has_booking');
      expect(result.bookingDate).toBe('2026-08-10');
    });

    it('酒店预售券预约成功 → 拦截（has_booking）', () => {
      const order = {
        category: 'hotel',
        productType: 'presale_voucher',
        statusText: '待使用',
        bookingStatus: 'booking_confirmed',
        bookingDate: '2026-08-15',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(false);
      expect(result.reason).toBe('has_booking');
      expect(result.bookingDate).toBe('2026-08-15');
    });

    it('酒店日历房 → 拦截（has_booking）', () => {
      const order = {
        category: 'hotel',
        productType: 'calendar_room',
        statusText: '待使用',
        checkInDate: '2026-09-01',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(false);
      expect(result.reason).toBe('has_booking');
      expect(result.bookingDate).toBe('2026-09-01');
    });
  });

  describe('旅行社类', () => {
    it('旅行社预售券待预约 → 通过', () => {
      const order = {
        category: 'travel',
        travelProductType: 'presale_voucher',
        statusText: '待使用',
        bookingStatus: 'unredeemed',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(true);
    });

    it('旅行社预售券预约中 → 拦截（has_booking）', () => {
      const order = {
        category: 'travel',
        productType: 'presale_voucher',
        statusText: '待使用',
        bookingStatus: 'confirming',
        travelDate: '2026-10-01',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(false);
      expect(result.reason).toBe('has_booking');
      expect(result.bookingDate).toBe('2026-10-01');
    });

    it('旅行社预售券预约成功 → 拦截（has_booking）', () => {
      const order = {
        category: 'travel',
        productType: 'presale_voucher',
        statusText: '待使用',
        bookingStatus: 'confirmed',
        bookingDate: '2026-10-07',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(false);
      expect(result.reason).toBe('has_booking');
      expect(result.bookingDate).toBe('2026-10-07');
    });
  });

  describe('大交通类', () => {
    it('大交通类 → 拦截（category）', () => {
      const order = {
        category: 'transport',
        statusText: '待使用',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(false);
      expect(result.reason).toBe('category');
      expect(result.hint).toBe('该订单不支持设置使用提醒，请选择其他订单');
    });
  });

  describe('订单状态校验', () => {
    it('已使用订单 → 拦截（status）', () => {
      const order = {
        category: 'food',
        statusText: '已使用',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(false);
      expect(result.reason).toBe('status');
      expect(result.hint).toBe('仅待使用订单支持设置使用提醒，请选择其他订单');
    });

    it('已退款订单 → 拦截（status）', () => {
      const order = {
        category: 'food',
        statusText: '已退款',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(false);
      expect(result.reason).toBe('status');
    });

    it('待支付订单 → 拦截（status）', () => {
      const order = {
        category: 'food',
        mainStatus: 'pending_payment',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(false);
      expect(result.reason).toBe('status');
    });

    it('pending_use 状态 → 通过', () => {
      const order = {
        category: 'food',
        orderStatus: 'pending_use',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(true);
    });

    it('待核销 状态 → 通过', () => {
      const order = {
        category: 'food',
        statusText: '待核销',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(true);
    });
  });

  describe('has_booking 时的文案', () => {
    it('has_booking 时返回 bookingDate 和正确 hint', () => {
      const order = {
        category: 'scenic',
        productType: 'calendar_ticket',
        statusText: '待使用',
        bookingDate: '2026-08-01',
      };
      const result = canOrderSetReminder(order);
      expect(result.canSet).toBe(false);
      expect(result.reason).toBe('has_booking');
      expect(result.bookingDate).toBe('2026-08-01');
      expect(result.hint).toBe('请按预约时间"2026-08-01"出行');
    });
  });
});
