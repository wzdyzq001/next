import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ReachEngine,
  sortByPriority,
  matchReachConfigs,
  getTopMatch,
  defaultFrequencyStrategy,
  resolveLongText,
} from './reachEngine';
import type { ReachConfig, ReachMatchContext } from './types';
import type { OrderListItem } from '../../../types';

const createMockOrder = (overrides: Partial<OrderListItem> = {}): OrderListItem => ({
  orderId: 'test-order-001',
  merchant: '测试商家',
  product: '测试商品',
  price: 99,
  statusText: '待使用',
  statusColor: 'orange',
  category: 'food',
  orderTime: '2026-07-05 10:00:00',
  thumbnail: '🍔',
  totalQuantity: 1,
  ...overrides,
});

const createMockContext = (
  overrides: Partial<ReachMatchContext> = {},
): ReachMatchContext => ({
  order: createMockOrder(),
  reservation: null,
  now: Date.now(),
  ...overrides,
});

const createConfig = (overrides: Partial<ReachConfig> = {}): ReachConfig => ({
  reachId: 'test-reach-001',
  pointType: 'order_card_bar',
  displayMode: 'guide_clickable',
  priority: 10,
  icon: '✦',
  shortText: '短文案',
  longText: '这是一段长文案',
  ...overrides,
});

describe('reachEngine', () => {
  describe('sortByPriority', () => {
    it('按 priority 升序排列（数值越小优先级越高）', () => {
      const configs: ReachConfig[] = [
        createConfig({ reachId: 'c', priority: 30 }),
        createConfig({ reachId: 'a', priority: 10 }),
        createConfig({ reachId: 'b', priority: 20 }),
      ];
      const sorted = sortByPriority(configs);
      expect(sorted.map((c) => c.reachId)).toEqual(['a', 'b', 'c']);
    });

    it('priority 相同时保持原顺序', () => {
      const configs: ReachConfig[] = [
        createConfig({ reachId: 'first', priority: 10 }),
        createConfig({ reachId: 'second', priority: 10 }),
      ];
      const sorted = sortByPriority(configs);
      expect(sorted.map((c) => c.reachId)).toEqual(['first', 'second']);
    });

    it('空数组返回空数组', () => {
      expect(sortByPriority([])).toEqual([]);
    });

    it('不修改原数组', () => {
      const configs: ReachConfig[] = [
        createConfig({ reachId: 'b', priority: 20 }),
        createConfig({ reachId: 'a', priority: 10 }),
      ];
      const originalOrder = configs.map((c) => c.reachId);
      sortByPriority(configs);
      expect(configs.map((c) => c.reachId)).toEqual(originalOrder);
    });
  });

  describe('matchReachConfigs', () => {
    it('按 pointType 过滤配置', () => {
      const configs: ReachConfig[] = [
        createConfig({ reachId: 'bar', pointType: 'order_card_bar' }),
        createConfig({ reachId: 'bubble', pointType: 'detail_bubble' }),
      ];
      const ctx = createMockContext();
      const matched = matchReachConfigs(configs, 'order_card_bar', ctx);
      expect(matched.length).toBe(1);
      expect(matched[0].reachId).toBe('bar');
    });

    it('调用 match 函数进行匹配', () => {
      const matchFn = (ctx: ReachMatchContext) => ctx.order.orderId === 'matched-order';
      const configs: ReachConfig[] = [
        createConfig({ reachId: 'yes', match: matchFn }),
        createConfig({ reachId: 'no', match: () => false }),
      ];
      const ctx = createMockContext({
        order: createMockOrder({ orderId: 'matched-order' }),
      });
      const matched = matchReachConfigs(configs, 'order_card_bar', ctx);
      expect(matched.map((c) => c.reachId)).toEqual(['yes']);
    });

    it('没有 match 函数的配置默认通过匹配', () => {
      const configs: ReachConfig[] = [createConfig({ reachId: 'no-match-fn' })];
      const ctx = createMockContext();
      const matched = matchReachConfigs(configs, 'order_card_bar', ctx);
      expect(matched.length).toBe(1);
    });

    it('匹配结果按优先级排序', () => {
      const configs: ReachConfig[] = [
        createConfig({ reachId: 'low', priority: 30 }),
        createConfig({ reachId: 'high', priority: 10 }),
        createConfig({ reachId: 'mid', priority: 20 }),
      ];
      const ctx = createMockContext();
      const matched = matchReachConfigs(configs, 'order_card_bar', ctx);
      expect(matched.map((c) => c.reachId)).toEqual(['high', 'mid', 'low']);
    });

    it('无匹配时返回空数组', () => {
      const configs: ReachConfig[] = [createConfig({ match: () => false })];
      const ctx = createMockContext();
      const matched = matchReachConfigs(configs, 'order_card_bar', ctx);
      expect(matched).toEqual([]);
    });
  });

  describe('getTopMatch', () => {
    it('返回数组第一个元素', () => {
      const configs: ReachConfig[] = [
        createConfig({ reachId: 'top', priority: 1 }),
        createConfig({ reachId: 'next', priority: 2 }),
      ];
      expect(getTopMatch(configs)?.reachId).toBe('top');
    });

    it('空数组返回 null', () => {
      expect(getTopMatch([])).toBeNull();
    });
  });

  describe('ReachEngine', () => {
    let engine: ReachEngine;

    beforeEach(() => {
      engine = new ReachEngine({ configs: [] });
    });

    it('初始化时注册配置', () => {
      const configs = [createConfig({ reachId: 'init-1' })];
      const e = new ReachEngine({ configs });
      expect(e.getAllConfigs().length).toBe(1);
    });

    it('registerConfigs 追加配置', () => {
      engine.registerConfigs([createConfig({ reachId: 'reg-1' })]);
      expect(engine.getAllConfigs().length).toBe(1);
      engine.registerConfigs([createConfig({ reachId: 'reg-2' })]);
      expect(engine.getAllConfigs().length).toBe(2);
    });

    it('clearConfigs 清空配置', () => {
      engine.registerConfigs([createConfig({ reachId: 'clear-test' })]);
      engine.clearConfigs();
      expect(engine.getAllConfigs()).toEqual([]);
    });

    it('getAllConfigs 返回副本，外部修改不影响内部', () => {
      engine.registerConfigs([createConfig({ reachId: 'copy-test' })]);
      const configs = engine.getAllConfigs();
      configs.push(createConfig({ reachId: 'pushed' }));
      expect(engine.getAllConfigs().length).toBe(1);
    });

    it('match 返回最高优先级的匹配项', () => {
      engine.registerConfigs([
        createConfig({ reachId: 'low', priority: 30 }),
        createConfig({ reachId: 'high', priority: 10 }),
      ]);
      const ctx = createMockContext();
      const result = engine.match('order_card_bar', ctx);
      expect(result.matched?.reachId).toBe('high');
      expect(result.allMatched.length).toBe(2);
    });

    it('无匹配时 matched 为 null', () => {
      engine.registerConfigs([createConfig({ match: () => false })]);
      const ctx = createMockContext();
      const result = engine.match('order_card_bar', ctx);
      expect(result.matched).toBeNull();
      expect(result.allMatched).toEqual([]);
    });

    it('getConfigById 通过 reachId 查找配置', () => {
      const config = createConfig({ reachId: 'find-me' });
      engine.registerConfigs([config]);
      expect(engine.getConfigById('find-me')?.reachId).toBe('find-me');
      expect(engine.getConfigById('not-exist')).toBeUndefined();
    });

    it('frequencyControlCheck 默认返回 allowed:true', () => {
      const result = engine.frequencyControlCheck('any-id');
      expect(result.allowed).toBe(true);
    });
  });

  describe('defaultFrequencyStrategy', () => {
    const TEST_KEY = 'ai_assistant_reach_exposure';

    beforeEach(() => {
      localStorage.removeItem(TEST_KEY);
    });

    afterEach(() => {
      localStorage.removeItem(TEST_KEY);
    });

    it('check 默认允许所有曝光', () => {
      const result = defaultFrequencyStrategy.check('test-reach');
      expect(result.allowed).toBe(true);
    });

    it('recordExposure 能正确计数', () => {
      defaultFrequencyStrategy.recordExposure('reach-a');
      defaultFrequencyStrategy.recordExposure('reach-a');
      defaultFrequencyStrategy.recordExposure('reach-b');

      const raw = localStorage.getItem(TEST_KEY);
      expect(raw).toBeTruthy();
      const map = JSON.parse(raw!);
      expect(map['reach-a']).toBe(2);
      expect(map['reach-b']).toBe(1);
    });
  });

  describe('resolveLongText', () => {
    it('字符串长文本直接返回', () => {
      const config = createConfig({ longText: '静态长文本' });
      const ctx = createMockContext();
      expect(resolveLongText(config, ctx)).toBe('静态长文本');
    });

    it('函数长文本调用函数并返回结果', () => {
      const config = createConfig({
        longText: (ctx: ReachMatchContext) => `订单: ${ctx.order.orderId}`,
      });
      const ctx = createMockContext({
        order: createMockOrder({ orderId: 'dynamic-order' }),
      });
      expect(resolveLongText(config, ctx)).toBe('订单: dynamic-order');
    });
  });
});
