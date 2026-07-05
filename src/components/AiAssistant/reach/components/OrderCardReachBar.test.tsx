import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { OrderCardReachBar } from './OrderCardReachBar';
import type { ReachConfig, ReachMatchContext } from '../types';
import type { OrderListItem } from '../../../../types';

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

const createGuideConfig = (overrides: Partial<ReachConfig> = {}): ReachConfig => ({
  reachId: 'guide-test',
  pointType: 'order_card_bar',
  displayMode: 'guide_clickable',
  priority: 20,
  icon: '✦',
  shortText: '预约免排队',
  longText: '周末客流大，提前预约免排队～',
  ...overrides,
});

const createInfoConfig = (overrides: Partial<ReachConfig> = {}): ReachConfig => ({
  reachId: 'info-test',
  pointType: 'order_card_bar',
  displayMode: 'info_display',
  priority: 10,
  icon: '✦',
  shortText: '预约进度',
  longText: '待商家接单 03:25',
  ...overrides,
});

describe('OrderCardReachBar', () => {
  describe('引导点击型', () => {
    it('渲染 icon、文案和箭头', () => {
      const config = createGuideConfig();
      const ctx = createMockContext();
      render(<OrderCardReachBar config={config} ctx={ctx} />);

      expect(screen.getByText('✦')).toBeInTheDocument();
      expect(screen.getByText('周末客流大，提前预约免排队～')).toBeInTheDocument();
      expect(screen.getByText('›')).toBeInTheDocument();
    });

    it('有 pointer 样式且可点击', () => {
      const config = createGuideConfig();
      const ctx = createMockContext();
      const handleClick = vi.fn();
      const { container } = render(
        <OrderCardReachBar config={config} ctx={ctx} onClick={handleClick} />,
      );

      const bar = container.querySelector('.oc-reach-bar');
      expect(bar).toHaveClass('oc-reach-bar-guide_clickable');

      fireEvent.click(bar!);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('支持 Enter 键触发点击', () => {
      const config = createGuideConfig();
      const ctx = createMockContext();
      const handleClick = vi.fn();
      const { container } = render(
        <OrderCardReachBar config={config} ctx={ctx} onClick={handleClick} />,
      );

      const bar = container.querySelector('.oc-reach-bar');
      fireEvent.keyDown(bar!, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('支持空格键触发点击', () => {
      const config = createGuideConfig();
      const ctx = createMockContext();
      const handleClick = vi.fn();
      const { container } = render(
        <OrderCardReachBar config={config} ctx={ctx} onClick={handleClick} />,
      );

      const bar = container.querySelector('.oc-reach-bar');
      fireEvent.keyDown(bar!, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('role 为 button 且 tabIndex 为 0', () => {
      const config = createGuideConfig();
      const ctx = createMockContext();
      const { container } = render(<OrderCardReachBar config={config} ctx={ctx} />);

      const bar = container.querySelector('.oc-reach-bar');
      expect(bar).toHaveAttribute('role', 'button');
      expect(bar).toHaveAttribute('tabindex', '0');
    });
  });

  describe('信息展示型', () => {
    it('渲染 icon 和文案，不渲染箭头', () => {
      const config = createInfoConfig();
      const ctx = createMockContext();
      render(<OrderCardReachBar config={config} ctx={ctx} />);

      expect(screen.getByText('✦')).toBeInTheDocument();
      expect(screen.getByText('待商家接单 03:25')).toBeInTheDocument();
      expect(screen.queryByText('›')).not.toBeInTheDocument();
    });

    it('不可点击，onClick 不触发', () => {
      const config = createInfoConfig();
      const ctx = createMockContext();
      const handleClick = vi.fn();
      const { container } = render(
        <OrderCardReachBar config={config} ctx={ctx} onClick={handleClick} />,
      );

      const bar = container.querySelector('.oc-reach-bar');
      expect(bar).toHaveClass('oc-reach-bar-info_display');

      fireEvent.click(bar!);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('没有 role 和 tabIndex', () => {
      const config = createInfoConfig();
      const ctx = createMockContext();
      const { container } = render(<OrderCardReachBar config={config} ctx={ctx} />);

      const bar = container.querySelector('.oc-reach-bar');
      expect(bar).not.toHaveAttribute('role');
      expect(bar).not.toHaveAttribute('tabindex');
    });
  });

  describe('动态文案', () => {
    it('函数型 longText 能正确渲染', () => {
      const config = createInfoConfig({
        longText: (ctx: ReachMatchContext) => `订单: ${ctx.order.orderId}`,
      });
      const ctx = createMockContext({
        order: createMockOrder({ orderId: 'dynamic-123' }),
      });
      render(<OrderCardReachBar config={config} ctx={ctx} />);

      expect(screen.getByText('订单: dynamic-123')).toBeInTheDocument();
    });
  });
});
