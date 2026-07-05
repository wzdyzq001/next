import { describe, it, expect, beforeEach } from 'vitest';
import {
  guideReservationMatch,
  getGuideScenarioText,
  isWeekendScenario,
  isHolidayScenario,
} from '../scenarios/guideReservation';
import {
  reservationProgressMatch,
  getProgressText,
} from '../scenarios/reservationProgress';
import type { ReachMatchContext } from '../types';
import type { OrderListItem } from '../../../../types';
import type { ReservationInfoCardData } from '../../ReservationInfoCard';

const createMockOrder = (overrides: Partial<OrderListItem> = {}): OrderListItem => ({
  orderId: 'test-order-001',
  merchant: '测试商家',
  product: '测试商品',
  price: 99,
  statusText: '待使用',
  statusColor: 'orange',
  category: 'fun',
  orderTime: '2026-07-05 10:00:00',
  thumbnail: '🎤',
  totalQuantity: 1,
  ...overrides,
});

const createMockReservation = (
  overrides: Partial<ReservationInfoCardData> = {},
): ReservationInfoCardData => ({
  orderId: 'test-order-001',
  reservationNo: 'R20260705001',
  serviceType: 'dinner',
  storeName: '测试门店',
  storeAddress: '测试地址',
  businessHours: '10:00-22:00',
  arrivalTime: '7月10日 18:30',
  pax: 3,
  phone: '13800138000',
  acceptStatus: 'pending',
  estimatedAcceptTime: '约5分钟',
  acceptDeadlineAt: Date.now() + 5 * 60 * 1000,
  ...overrides,
});

const createCtx = (overrides: Partial<ReachMatchContext> = {}): ReachMatchContext => ({
  order: createMockOrder(),
  reservation: null,
  now: Date.now(),
  ...overrides,
});

describe('引导预约场景', () => {
  describe('guideReservationMatch', () => {
    it('待使用订单且无预约时匹配成功', () => {
      const ctx = createCtx();
      expect(guideReservationMatch(ctx)).toBe(true);
    });

    it('待预约订单且无预约时匹配成功', () => {
      const ctx = createCtx({
        order: createMockOrder({ statusText: '待预约' }),
      });
      expect(guideReservationMatch(ctx)).toBe(true);
    });

    it('待核销订单且无预约时匹配成功', () => {
      const ctx = createCtx({
        order: createMockOrder({ statusText: '待核销' }),
      });
      expect(guideReservationMatch(ctx)).toBe(true);
    });

    it('已使用订单不匹配', () => {
      const ctx = createCtx({
        order: createMockOrder({ statusText: '已使用' }),
      });
      expect(guideReservationMatch(ctx)).toBe(false);
    });

    it('退款中订单不匹配', () => {
      const ctx = createCtx({
        order: createMockOrder({ statusText: '退款中' }),
      });
      expect(guideReservationMatch(ctx)).toBe(false);
    });

    it('有进行中预约（pending）时不匹配', () => {
      const ctx = createCtx({
        reservation: createMockReservation({ acceptStatus: 'pending' }),
      });
      expect(guideReservationMatch(ctx)).toBe(false);
    });

    it('有已成功预约（accepted）时不匹配', () => {
      const ctx = createCtx({
        reservation: createMockReservation({ acceptStatus: 'accepted' }),
      });
      expect(guideReservationMatch(ctx)).toBe(false);
    });

    it('有失败预约（failed）时不匹配', () => {
      const ctx = createCtx({
        reservation: createMockReservation({ acceptStatus: 'failed' }),
      });
      expect(guideReservationMatch(ctx)).toBe(false);
    });

    it('已取消预约（canceled）时匹配成功', () => {
      const ctx = createCtx({
        reservation: createMockReservation({ acceptStatus: 'canceled' as any }),
      });
      expect(guideReservationMatch(ctx)).toBe(true);
    });

    it('非综合行业（food）不匹配', () => {
      const ctx = createCtx({
        order: createMockOrder({ category: 'food' as any }),
      });
      expect(guideReservationMatch(ctx)).toBe(false);
    });

    it('非综合行业（hotel）不匹配', () => {
      const ctx = createCtx({
        order: createMockOrder({ category: 'hotel' as any }),
      });
      expect(guideReservationMatch(ctx)).toBe(false);
    });

    it('综合行业子分类（show）匹配', () => {
      const ctx = createCtx({
        order: createMockOrder({ category: 'show' as any }),
      });
      expect(guideReservationMatch(ctx)).toBe(true);
    });

    it('综合行业子分类（vacation）匹配', () => {
      const ctx = createCtx({
        order: createMockOrder({ category: 'vacation' as any }),
      });
      expect(guideReservationMatch(ctx)).toBe(true);
    });
  });

  describe('isWeekendScenario', () => {
    it('周四 0 点后是周末', () => {
      const thursdayNight = new Date('2026-07-02T00:00:00').getTime();
      expect(isWeekendScenario(thursdayNight)).toBe(true);
    });

    it('周五是周末', () => {
      const friday = new Date('2026-07-03T12:00:00').getTime();
      expect(isWeekendScenario(friday)).toBe(true);
    });

    it('周六是周末', () => {
      const saturday = new Date('2026-07-04T12:00:00').getTime();
      expect(isWeekendScenario(saturday)).toBe(true);
    });

    it('周日 17 点前是周末', () => {
      const sundayMorning = new Date('2026-07-05T10:00:00').getTime();
      expect(isWeekendScenario(sundayMorning)).toBe(true);
    });

    it('周日 17 点后不是周末', () => {
      const sundayEvening = new Date('2026-07-05T18:00:00').getTime();
      expect(isWeekendScenario(sundayEvening)).toBe(false);
    });

    it('周三不是周末', () => {
      const wednesday = new Date('2026-07-01T12:00:00').getTime();
      expect(isWeekendScenario(wednesday)).toBe(false);
    });
  });

  describe('getGuideScenarioText', () => {
    it('节假日返回对应文案', () => {
      const nationalDay = new Date('2026-10-01T12:00:00').getTime();
      const result = getGuideScenarioText(nationalDay);
      expect(result.long).toContain('国庆节');
      expect(result.aiPrompt).toContain('节假日');
      expect(result.aiPrompt).toContain('提前预约免排队');
      expect(result.aiPrompt).toContain('是否需要预约');
    });

    it('周末返回对应文案', () => {
      const saturday = new Date('2026-07-04T12:00:00').getTime();
      const result = getGuideScenarioText(saturday);
      expect(result.long).toContain('周末');
      expect(result.aiPrompt).toContain('周末');
      expect(result.aiPrompt).toContain('提前预约免排队');
      expect(result.aiPrompt).toContain('是否需要预约');
    });

    it('工作日返回高峰期文案', () => {
      const wednesday = new Date('2026-07-01T12:00:00').getTime();
      const result = getGuideScenarioText(wednesday);
      expect(result.long).toContain('高峰期');
      expect(result.aiPrompt).toContain('高峰期');
      expect(result.aiPrompt).toContain('提前预约免排队');
      expect(result.aiPrompt).toContain('是否需要预约');
    });

    it('short 文案统一为 预约免排队', () => {
      const result = getGuideScenarioText(Date.now());
      expect(result.short).toBe('预约免排队');
    });
  });
});

describe('预约进度场景', () => {
  describe('reservationProgressMatch', () => {
    it('待使用订单 + pending 预约时匹配成功', () => {
      const ctx = createCtx({
        reservation: createMockReservation({ acceptStatus: 'pending' }),
      });
      expect(reservationProgressMatch(ctx)).toBe(true);
    });

    it('待使用订单 + accepted 预约时匹配成功', () => {
      const ctx = createCtx({
        reservation: createMockReservation({ acceptStatus: 'accepted' }),
      });
      expect(reservationProgressMatch(ctx)).toBe(true);
    });

    it('待使用订单 + failed 预约时匹配成功', () => {
      const ctx = createCtx({
        reservation: createMockReservation({ acceptStatus: 'failed' }),
      });
      expect(reservationProgressMatch(ctx)).toBe(true);
    });

    it('待使用订单 + 无预约时不匹配', () => {
      const ctx = createCtx();
      expect(reservationProgressMatch(ctx)).toBe(false);
    });

    it('已使用订单不匹配', () => {
      const ctx = createCtx({
        order: createMockOrder({ statusText: '已使用' }),
        reservation: createMockReservation({ acceptStatus: 'pending' }),
      });
      expect(reservationProgressMatch(ctx)).toBe(false);
    });

    it('pending 状态且已超时时不匹配', () => {
      const ctx = createCtx({
        reservation: createMockReservation({
          acceptStatus: 'pending',
          acceptDeadlineAt: Date.now() - 1000,
        }),
      });
      expect(reservationProgressMatch(ctx)).toBe(false);
    });

    it('pending 状态且未超时时匹配', () => {
      const ctx = createCtx({
        reservation: createMockReservation({
          acceptStatus: 'pending',
          acceptDeadlineAt: Date.now() + 60000,
        }),
      });
      expect(reservationProgressMatch(ctx)).toBe(true);
    });
  });

  describe('getProgressText', () => {
    it('pending 状态显示倒计时', () => {
      const now = Date.now();
      const deadline = now + 3 * 60 * 1000 + 25 * 1000;
      const ctx = createCtx({
        now,
        reservation: createMockReservation({
          acceptStatus: 'pending',
          acceptDeadlineAt: deadline,
        }),
      });
      const text = getProgressText(ctx);
      expect(text).toContain('待商家接单');
      expect(text).toContain('03:25');
    });

    it('accepted 状态显示预约成功信息', () => {
      const ctx = createCtx({
        reservation: createMockReservation({
          acceptStatus: 'accepted',
          arrivalTime: '7月10日 18:30',
          pax: 3,
        }),
      });
      const text = getProgressText(ctx);
      expect(text).toContain('预约成功');
      expect(text).toContain('7月10日');
      expect(text).toContain('18:30');
      expect(text).toContain('3人');
    });

    it('failed 状态显示预约失败', () => {
      const ctx = createCtx({
        reservation: createMockReservation({ acceptStatus: 'failed' }),
      });
      const text = getProgressText(ctx);
      expect(text).toContain('预约失败');
      expect(text).toContain('重新预约');
    });

    it('无预约时返回空字符串', () => {
      const ctx = createCtx();
      const text = getProgressText(ctx);
      expect(text).toBe('');
    });
  });
});
