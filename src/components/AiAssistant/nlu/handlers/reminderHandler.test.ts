import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleReminderIntent, buildQuickDateOptions, validateDateTime } from './reminderHandler';
import type { NluContext, NluDialogState } from '../types';

function createInitialDialogState(): NluDialogState {
  return {
    currentIntent: null,
    currentStep: 'idle',
    entities: {},
    data: {},
  };
}

function createMockContext(overrides: Partial<NluContext> = {}): NluContext {
  return {
    sessionId: 'test-session',
    dialogState: createInitialDialogState(),
    conversationTurns: 0,
    resolvedQuestions: [],
    ...overrides,
  };
}

function createMockOrder(overrides: Record<string, any> = {}): any {
  return {
    id: 'test-order-001',
    category: 'food',
    categoryLabel: '餐饮',
    productName: '海底捞火锅 2-3人餐 团购券',
    statusText: '待使用',
    orderStatus: 'unused',
    validDate: '有效期至 2026-08-31',
    storeName: '海底捞火锅(陆家嘴店)',
    redeemMethod: 'voucher',
    redeemTypes: ['voucher'],
    ...overrides,
  };
}

describe('reminderHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const mockNow = new Date('2026-07-05T10:00:00');
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('入口流程', () => {
    it('无前置订单 → 展示选择订单按钮', () => {
      const context = createMockContext();
      const result = handleReminderIntent('设置提醒', context);

      expect(result.messages.length).toBe(1);
      expect(result.messages[0].content).toBe('请选择要提醒使用的订单');
      expect(result.messages[0].quickReplies?.length).toBe(1);
      expect(result.messages[0].quickReplies?.[0].action).toBe('open_order_selector');
      expect(result.newDialogState.reminderStep).toBe('selecting_order');
      expect(result.newDialogState.currentStep).toBe('selecting_order');
    });

    it('有前置订单且通过校验 → 进入收集日期时间', () => {
      const orderCard = createMockOrder();
      const context = createMockContext({ orderCard });
      const result = handleReminderIntent('设置提醒', context);

      expect(result.messages.length).toBe(1);
      expect(result.messages[0].content).toBe('请告诉我提醒日期、时间');
      expect(result.newDialogState.reminderStep).toBe('collecting_datetime');
      expect(result.newDialogState.data?.orderId).toBe('test-order-001');
      expect(result.newDialogState.data?.productName).toBe('海底捞火锅 2-3人餐 团购券');
    });

    it('selecting_order 步骤有订单 → 进入校验', () => {
      const orderCard = createMockOrder();
      const context = createMockContext({
        orderCard,
        dialogState: {
          ...createInitialDialogState(),
          currentIntent: 'reminder',
          currentStep: 'selecting_order',
          reminderStep: 'selecting_order',
        },
      });
      const result = handleReminderIntent('', context);

      expect(result.newDialogState.reminderStep).toBe('collecting_datetime');
    });
  });

  describe('订单校验', () => {
    it('非待使用状态 → 正确提示', () => {
      const orderCard = createMockOrder({
        statusText: '已使用',
        orderStatus: 'completed',
      });
      const context = createMockContext({ orderCard });
      const result = handleReminderIntent('设置提醒', context);

      expect(result.messages[0].content).toBe('仅待使用订单支持设置使用提醒，请选择其他订单');
      expect(result.newDialogState.reminderStep).toBe('selecting_order');
    });

    it('行业不支持 → 正确提示', () => {
      const orderCard = createMockOrder({
        category: 'transport',
        categoryLabel: '大交通',
      });
      const context = createMockContext({ orderCard });
      const result = handleReminderIntent('设置提醒', context);

      expect(result.messages[0].content).toBe('该订单不支持设置使用提醒，请选择其他订单');
      expect(result.newDialogState.reminderStep).toBe('selecting_order');
    });

    it('已预约类订单（has_booking）→ 正确提示', () => {
      const orderCard = createMockOrder({
        category: 'scenic',
        productType: 'calendar_ticket',
        bookingDate: '2026-08-01',
        statusText: '待使用',
      });
      const context = createMockContext({ orderCard });
      const result = handleReminderIntent('设置提醒', context);

      expect(result.messages[0].content).toContain('2026-08-01');
      expect(result.newDialogState.reminderStep).toBe('selecting_order');
    });
  });

  describe('快捷日期选项生成', () => {
    it('正常情况返回4个选项', () => {
      const options = buildQuickDateOptions('有效期至 2026-08-31', Date.now());
      expect(options.length).toBe(4);
      expect(options).toContain('明天');
      expect(options).toContain('后天');
      expect(options).toContain('过期前1天');
      expect(options).toContain('过期前3天');
    });

    it('去重：明天和过期前N天重合时只保留一个', () => {
      const now = new Date('2026-08-30T10:00:00').getTime();
      const options = buildQuickDateOptions('有效期至 2026-08-31', now);
      const uniqueDays = new Set(options);
      expect(uniqueDays.size).toBe(options.length);
    });

    it('过滤超期选项', () => {
      const now = new Date('2026-09-01T10:00:00').getTime();
      const options = buildQuickDateOptions('有效期至 2026-08-31', now);
      expect(options.length).toBe(0);
    });

    it('最多返回4个选项', () => {
      const options = buildQuickDateOptions('有效期至 2026-12-31', Date.now());
      expect(options.length).toBeLessThanOrEqual(4);
    });
  });

  describe('日期时间收集', () => {
    it('只输入日期 → 提示补时间', () => {
      const orderCard = createMockOrder();
      const context = createMockContext({
        orderCard,
        dialogState: {
          ...createInitialDialogState(),
          currentIntent: 'reminder',
          currentStep: 'collecting_datetime',
          reminderStep: 'collecting_datetime',
          data: {
            orderId: 'test-order-001',
            productName: '测试商品',
            validDate: '有效期至 2026-08-31',
          },
        },
      });
      const result = handleReminderIntent('明天', context);

      expect(result.messages[0].content).toContain('请问提醒时间是几点呢');
      expect(result.newDialogState.reminderStep).toBe('collecting_datetime');
      expect(result.newDialogState.data?.date).toBe('明天');
    });

    it('只输入时间 → 提示补日期', () => {
      const orderCard = createMockOrder();
      const context = createMockContext({
        orderCard,
        dialogState: {
          ...createInitialDialogState(),
          currentIntent: 'reminder',
          currentStep: 'collecting_datetime',
          reminderStep: 'collecting_datetime',
          data: {
            orderId: 'test-order-001',
            productName: '测试商品',
            validDate: '有效期至 2026-08-31',
          },
        },
      });
      const result = handleReminderIntent('18:00', context);

      expect(result.messages[0].content).toContain('请问提醒日期是哪天呢');
      expect(result.newDialogState.reminderStep).toBe('collecting_datetime');
      expect(result.newDialogState.data?.time).toBe('18:00');
    });
  });

  describe('日期时间范围校验', () => {
    it('日期已过 → 正确提示', () => {
      const result = validateDateTime('昨天', '18:00', '有效期至 2026-08-31', Date.now());
      expect(result.valid).toBe(false);
      expect(result.error).toBe('提醒日期不能是过去的时间，请调整日期');
    });

    it('今天时间已过 → 正确提示', () => {
      const now = new Date('2026-07-05T20:00:00').getTime();
      const result = validateDateTime('今天', '18:00', '有效期至 2026-08-31', now);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('提醒时间已过，请调整时间');
    });

    it('超有效期 → 正确提示', () => {
      const result = validateDateTime('9月1日', '18:00', '有效期至 2026-08-31', Date.now());
      expect(result.valid).toBe(false);
      expect(result.error).toBe('提醒日期不能晚于订单有效期，请调整日期');
    });

    it('有效期当天18点后 → 正确提示', () => {
      const result = validateDateTime('8月31日', '19:00', '有效期至 2026-08-31', Date.now());
      expect(result.valid).toBe(false);
      expect(result.error).toBe('提醒时间不能晚于有效期当天18:00');
    });

    it('正常日期时间 → 通过校验', () => {
      const result = validateDateTime('明天', '18:00', '有效期至 2026-08-31', Date.now());
      expect(result.valid).toBe(true);
      expect(result.dateTimestamp).toBeDefined();
      expect(result.remindAt).toBeDefined();
    });
  });

  describe('二次确认', () => {
    it('确认文案日期时间加粗', () => {
      const orderCard = createMockOrder();
      let context = createMockContext({
        orderCard,
        dialogState: {
          ...createInitialDialogState(),
          currentIntent: 'reminder',
          currentStep: 'collecting_datetime',
          reminderStep: 'collecting_datetime',
          data: {
            orderId: 'test-order-001',
            productName: '测试商品',
            validDate: '有效期至 2026-08-31',
          },
        },
      });
      const result = handleReminderIntent('明天 18:00', context);

      expect(result.newDialogState.reminderStep).toBe('confirming');
      expect(result.messages[0].content).toContain('<strong>');
      expect(result.messages[0].content).toContain('</strong>');
      expect(result.messages[0].content).toMatch(/确认设置 <strong>.*<\/strong> <strong>.*<\/strong> 的使用提醒吗/);
    });

    it('确认环节输入新时间 → 更新不回退', () => {
      const orderCard = createMockOrder();
      const context = createMockContext({
        orderCard,
        dialogState: {
          ...createInitialDialogState(),
          currentIntent: 'reminder',
          currentStep: 'confirming',
          reminderStep: 'confirming',
          data: {
            orderId: 'test-order-001',
            productName: '测试商品',
            validDate: '有效期至 2026-08-31',
            date: '明天',
            time: '18:00',
            dateTimestamp: new Date('2026-07-06').getTime(),
            remindAt: new Date('2026-07-06T18:00:00').getTime(),
          },
        },
      });
      const result = handleReminderIntent('后天 19:00', context);

      expect(result.newDialogState.reminderStep).toBe('confirming');
      expect(result.newDialogState.data?.date).toBe('后天');
      expect(result.newDialogState.data?.time).toBe('19:00');
    });

    it('确认环节模糊输入 → 提示确认或输入', () => {
      const orderCard = createMockOrder();
      const context = createMockContext({
        orderCard,
        dialogState: {
          ...createInitialDialogState(),
          currentIntent: 'reminder',
          currentStep: 'confirming',
          reminderStep: 'confirming',
          data: {
            orderId: 'test-order-001',
            productName: '测试商品',
            validDate: '有效期至 2026-08-31',
            date: '明天',
            time: '18:00',
            dateTimestamp: new Date('2026-07-06').getTime(),
            remindAt: new Date('2026-07-06T18:00:00').getTime(),
          },
        },
      });
      const result = handleReminderIntent('嗯...那个', context);

      expect(result.newDialogState.reminderStep).toBe('confirming');
      expect(result.messages[0].content).toContain('请确认是否设置该提醒');
      expect(result.messages[0].quickReplies?.length).toBe(2);
    });

    it('确认环节肯定回答 → 进入completed', () => {
      const orderCard = createMockOrder();
      const context = createMockContext({
        orderCard,
        dialogState: {
          ...createInitialDialogState(),
          currentIntent: 'reminder',
          currentStep: 'confirming',
          reminderStep: 'confirming',
          data: {
            orderId: 'test-order-001',
            productName: '测试商品',
            validDate: '有效期至 2026-08-31',
            date: '明天',
            time: '18:00',
            dateTimestamp: new Date('2026-07-06').getTime(),
            remindAt: new Date('2026-07-06T18:00:00').getTime(),
          },
        },
      });
      const result = handleReminderIntent('确认设置', context);

      expect(result.newDialogState.reminderStep).toBe('completed');
      expect(result.messages[0].content).toContain('使用提醒已设置');
      expect(result.messages[0].redeemReminder).toBeDefined();
    });

    it('确认环节否定回答 → 取消流程', () => {
      const orderCard = createMockOrder();
      const context = createMockContext({
        orderCard,
        dialogState: {
          ...createInitialDialogState(),
          currentIntent: 'reminder',
          currentStep: 'confirming',
          reminderStep: 'confirming',
          data: {
            orderId: 'test-order-001',
            productName: '测试商品',
            validDate: '有效期至 2026-08-31',
            date: '明天',
            time: '18:00',
            dateTimestamp: new Date('2026-07-06').getTime(),
            remindAt: new Date('2026-07-06T18:00:00').getTime(),
          },
        },
      });
      const result = handleReminderIntent('取消', context);

      expect(result.newDialogState.reminderStep).toBe('idle');
      expect(result.newDialogState.currentIntent).toBeNull();
      expect(result.messages[0].content).toContain('已取消');
    });
  });

  describe('设置成功', () => {
    it('设置成功发送卡片', () => {
      const orderCard = createMockOrder();
      const context = createMockContext({
        orderCard,
        dialogState: {
          ...createInitialDialogState(),
          currentIntent: 'reminder',
          currentStep: 'confirming',
          reminderStep: 'confirming',
          data: {
            orderId: 'test-order-001',
            productName: '测试商品',
            validDate: '有效期至 2026-08-31',
            date: '明天',
            time: '18:00',
            dateTimestamp: new Date('2026-07-06').getTime(),
            remindAt: new Date('2026-07-06T18:00:00').getTime(),
          },
        },
      });
      const result = handleReminderIntent('好的', context);

      expect(result.messages[0].redeemReminder).toBeDefined();
      expect(result.messages[0].redeemReminder?.status).toBe('active');
      expect(result.messages[0].redeemReminder?.orderId).toBe('test-order-001');
    });
  });

  describe('已有提醒检测', () => {
    it('已有提醒检测 → 提示是否修改', () => {
      const orderCard = createMockOrder();
      const existingReminder = {
        id: 'rem-001',
        orderId: 'test-order-001',
        remindAt: new Date('2026-07-10T18:00:00').getTime(),
        createdAt: Date.now() - 3600 * 1000,
        status: 'active' as const,
      };
      const context = createMockContext({
        orderCard,
        dialogState: {
          ...createInitialDialogState(),
          currentIntent: 'reminder',
          currentStep: 'checking_existing',
          reminderStep: 'checking_existing',
          data: {
            orderId: 'test-order-001',
            productName: '测试商品',
            validDate: '有效期至 2026-08-31',
            existingReminder,
          },
        },
      });
      const result = handleReminderIntent('', context);

      expect(result.messages[0].content).toContain('已设置了');
      expect(result.messages[0].content).toContain('是否修改');
      expect(result.messages[0].quickReplies?.length).toBe(2);
    });

    it('已有提醒选择修改 → 进入修改', () => {
      const orderCard = createMockOrder();
      const existingReminder = {
        id: 'rem-001',
        orderId: 'test-order-001',
        remindAt: new Date('2026-07-10T18:00:00').getTime(),
        createdAt: Date.now() - 3600 * 1000,
        status: 'active' as const,
      };
      const context = createMockContext({
        orderCard,
        dialogState: {
          ...createInitialDialogState(),
          currentIntent: 'reminder',
          currentStep: 'checking_existing',
          reminderStep: 'checking_existing',
          data: {
            orderId: 'test-order-001',
            productName: '测试商品',
            validDate: '有效期至 2026-08-31',
            existingReminder,
          },
        },
      });
      const result = handleReminderIntent('修改提醒', context);

      expect(result.newDialogState.reminderStep).toBe('collecting_datetime');
      expect(result.newDialogState.data?.isModifying).toBe(true);
    });

    it('已有提醒选择保持不变 → 结束', () => {
      const orderCard = createMockOrder();
      const existingReminder = {
        id: 'rem-001',
        orderId: 'test-order-001',
        remindAt: new Date('2026-07-10T18:00:00').getTime(),
        createdAt: Date.now() - 3600 * 1000,
        status: 'active' as const,
      };
      const context = createMockContext({
        orderCard,
        dialogState: {
          ...createInitialDialogState(),
          currentIntent: 'reminder',
          currentStep: 'checking_existing',
          reminderStep: 'checking_existing',
          data: {
            orderId: 'test-order-001',
            productName: '测试商品',
            validDate: '有效期至 2026-08-31',
            existingReminder,
          },
        },
      });
      const result = handleReminderIntent('保持不变', context);

      expect(result.newDialogState.reminderStep).toBe('idle');
      expect(result.newDialogState.currentIntent).toBeNull();
      expect(result.messages[0].content).toContain('保持不变');
    });
  });

  describe('同会话快速修改', () => {
    it('同会话快速修改 → 直接进入修改', () => {
      const orderCard = createMockOrder();
      const context = createMockContext({
        orderCard,
        dialogState: {
          ...createInitialDialogState(),
          currentIntent: 'reminder',
          currentStep: 'completed',
          reminderStep: 'completed',
          data: {
            orderId: 'test-order-001',
            productName: '测试商品',
            validDate: '有效期至 2026-08-31',
            date: '明天',
            time: '18:00',
          },
        },
      });
      const result = handleReminderIntent('改一下时间', context);

      expect(result.newDialogState.reminderStep).toBe('collecting_datetime');
      expect(result.newDialogState.data?.isModifying).toBe(true);
    });
  });
});
