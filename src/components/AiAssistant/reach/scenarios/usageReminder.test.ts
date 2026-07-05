import { describe, it, expect } from 'vitest';
import {
  usageReminderMatch,
  getUsageReminderText,
  USAGE_REMINDER_BAR_PRIORITY,
  USAGE_REMINDER_BUBBLE_PRIORITY,
  USAGE_REMINDER_BAR_CONFIG_TEMPLATE,
  USAGE_REMINDER_BUBBLE_CONFIG_TEMPLATE,
  createUsageReminderBarConfig,
  createUsageReminderBubbleConfig,
} from './usageReminder';
import type { ReachMatchContext, UsageReminder } from '../types';
import type { OrderListItem } from '../../../../types';

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

const createMockReminder = (overrides: Partial<UsageReminder> = {}): UsageReminder => ({
  id: 'reminder-001',
  orderId: 'test-order-001',
  remindAt: Date.now() + 60 * 60 * 1000,
  status: 'active',
  productName: '测试商品',
  ...overrides,
});

const createCtx = (overrides: Partial<ReachMatchContext> = {}): ReachMatchContext => ({
  order: createMockOrder(),
  reservation: null,
  reminder: null,
  now: Date.now(),
  ...overrides,
});

describe('使用提醒场景', () => {
  describe('usageReminderMatch', () => {
    it('待使用 + active提醒 + 时间未到 → 匹配成功', () => {
      const ctx = createCtx({
        reminder: createMockReminder(),
      });
      expect(usageReminderMatch(ctx)).toBe(true);
    });

    it('非待使用 → 不匹配', () => {
      const ctx = createCtx({
        order: createMockOrder({ statusText: '已使用' }),
        reminder: createMockReminder(),
      });
      expect(usageReminderMatch(ctx)).toBe(false);
    });

    it('无提醒 → 不匹配', () => {
      const ctx = createCtx();
      expect(usageReminderMatch(ctx)).toBe(false);
    });

    it('提醒状态为 cancelled → 不匹配', () => {
      const ctx = createCtx({
        reminder: createMockReminder({ status: 'cancelled' }),
      });
      expect(usageReminderMatch(ctx)).toBe(false);
    });

    it('提醒时间已过 → 不匹配', () => {
      const ctx = createCtx({
        reminder: createMockReminder({ remindAt: Date.now() - 1000 }),
      });
      expect(usageReminderMatch(ctx)).toBe(false);
    });

    it('提醒时间正好等于 now → 不匹配（严格大于）', () => {
      const now = Date.now();
      const ctx = createCtx({
        now,
        reminder: createMockReminder({ remindAt: now }),
      });
      expect(usageReminderMatch(ctx)).toBe(false);
    });

    it('待预约状态 + active提醒 → 匹配成功', () => {
      const ctx = createCtx({
        order: createMockOrder({ statusText: '待预约' }),
        reminder: createMockReminder(),
      });
      expect(usageReminderMatch(ctx)).toBe(true);
    });

    it('待核销状态 + active提醒 → 匹配成功', () => {
      const ctx = createCtx({
        order: createMockOrder({ statusText: '待核销' }),
        reminder: createMockReminder(),
      });
      expect(usageReminderMatch(ctx)).toBe(true);
    });

    it('提醒状态为 triggered → 不匹配', () => {
      const ctx = createCtx({
        reminder: createMockReminder({ status: 'triggered' }),
      });
      expect(usageReminderMatch(ctx)).toBe(false);
    });
  });

  describe('getUsageReminderText', () => {
    it('文案格式正确（X月X日 X点提醒使用）', () => {
      const remindAt = new Date(2026, 6, 5, 14, 30, 0).getTime();
      const ctx = createCtx({
        reminder: createMockReminder({ remindAt }),
      });
      const text = getUsageReminderText(ctx);
      expect(text).toBe('7月5日 14:30提醒使用');
    });

    it('跨月份日期正确显示', () => {
      const remindAt = new Date(2026, 11, 31, 23, 59, 0).getTime();
      const ctx = createCtx({
        reminder: createMockReminder({ remindAt }),
      });
      const text = getUsageReminderText(ctx);
      expect(text).toBe('12月31日 23:59提醒使用');
    });

    it('分钟个位数补零正确（如 14:05）', () => {
      const remindAt = new Date(2026, 6, 5, 14, 5, 0).getTime();
      const ctx = createCtx({
        reminder: createMockReminder({ remindAt }),
      });
      const text = getUsageReminderText(ctx);
      expect(text).toBe('7月5日 14:05提醒使用');
    });

    it('小时个位数补零正确（如 09:30）', () => {
      const remindAt = new Date(2026, 6, 5, 9, 30, 0).getTime();
      const ctx = createCtx({
        reminder: createMockReminder({ remindAt }),
      });
      const text = getUsageReminderText(ctx);
      expect(text).toBe('7月5日 09:30提醒使用');
    });

    it('1月1日正确显示', () => {
      const remindAt = new Date(2026, 0, 1, 0, 0, 0).getTime();
      const ctx = createCtx({
        reminder: createMockReminder({ remindAt }),
      });
      const text = getUsageReminderText(ctx);
      expect(text).toBe('1月1日 00:00提醒使用');
    });

    it('无提醒时返回空字符串', () => {
      const ctx = createCtx();
      const text = getUsageReminderText(ctx);
      expect(text).toBe('');
    });
  });

  describe('优先级', () => {
    it('触达条优先级为 5', () => {
      expect(USAGE_REMINDER_BAR_PRIORITY).toBe(5);
    });

    it('气泡优先级为 5', () => {
      expect(USAGE_REMINDER_BUBBLE_PRIORITY).toBe(5);
    });

    it('优先级低于预约进度（10）', () => {
      expect(USAGE_REMINDER_BAR_PRIORITY).toBeLessThan(10);
    });

    it('优先级低于预约引导（20）', () => {
      expect(USAGE_REMINDER_BAR_PRIORITY).toBeLessThan(20);
    });
  });

  describe('触达条配置', () => {
    it('pointType 为 order_card_bar', () => {
      expect(USAGE_REMINDER_BAR_CONFIG_TEMPLATE.pointType).toBe('order_card_bar');
    });

    it('displayMode 为 guide_clickable', () => {
      expect(USAGE_REMINDER_BAR_CONFIG_TEMPLATE.displayMode).toBe('guide_clickable');
    });

    it('icon 为四菱星 ✦', () => {
      expect(USAGE_REMINDER_BAR_CONFIG_TEMPLATE.icon).toBe('✦');
    });

    it('shortText 为 使用提醒', () => {
      expect(USAGE_REMINDER_BAR_CONFIG_TEMPLATE.shortText).toBe('使用提醒');
    });

    it('createUsageReminderBarConfig 生成正确的 reachId', () => {
      const config = createUsageReminderBarConfig('order-123');
      expect(config.reachId).toBe('usage_reminder_bar_order-123');
    });
  });

  describe('气泡配置', () => {
    it('pointType 为 detail_bubble', () => {
      expect(USAGE_REMINDER_BUBBLE_CONFIG_TEMPLATE.pointType).toBe('detail_bubble');
    });

    it('displayMode 为 guide_clickable', () => {
      expect(USAGE_REMINDER_BUBBLE_CONFIG_TEMPLATE.displayMode).toBe('guide_clickable');
    });

    it('icon 为四菱星 ✦', () => {
      expect(USAGE_REMINDER_BUBBLE_CONFIG_TEMPLATE.icon).toBe('✦');
    });

    it('shortText 为 使用提醒', () => {
      expect(USAGE_REMINDER_BUBBLE_CONFIG_TEMPLATE.shortText).toBe('使用提醒');
    });

    it('autoCollapseSeconds 为 5 秒', () => {
      expect(USAGE_REMINDER_BUBBLE_CONFIG_TEMPLATE.autoCollapseSeconds).toBe(5);
    });

    it('bubbleType 为 long', () => {
      expect(USAGE_REMINDER_BUBBLE_CONFIG_TEMPLATE.bubbleType).toBe('long');
    });

    it('collapseStrategy 为 auto_collapse', () => {
      expect(USAGE_REMINDER_BUBBLE_CONFIG_TEMPLATE.collapseStrategy).toBe('auto_collapse');
    });

    it('scrollDebounceMs 为 200', () => {
      expect(USAGE_REMINDER_BUBBLE_CONFIG_TEMPLATE.scrollDebounceMs).toBe(200);
    });

    it('createUsageReminderBubbleConfig 生成正确的 reachId', () => {
      const config = createUsageReminderBubbleConfig('order-123');
      expect(config.reachId).toBe('usage_reminder_bubble_order-123');
    });
  });
});
