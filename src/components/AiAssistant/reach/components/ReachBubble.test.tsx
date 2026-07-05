import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ReachBubble } from './ReachBubble';
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

const createBubbleConfig = (overrides: Partial<ReachConfig> = {}): ReachConfig => ({
  reachId: 'bubble-test',
  pointType: 'detail_bubble',
  displayMode: 'guide_clickable',
  priority: 20,
  icon: '✦',
  shortText: '预约免排队',
  longText: '周末客流大，提前预约免排队～',
  bubbleType: 'long',
  ...overrides,
});

describe('ReachBubble', () => {
  describe('长气泡 (long)', () => {
    it('渲染 icon 和长文案', () => {
      const config = createBubbleConfig();
      const ctx = createMockContext();
      render(<ReachBubble config={config} ctx={ctx} bubbleType="long" />);

      expect(screen.getByText('✦')).toBeInTheDocument();
      expect(screen.getByText('周末客流大，提前预约免排队～')).toBeInTheDocument();
    });

    it('有 long 类型的 class', () => {
      const config = createBubbleConfig();
      const ctx = createMockContext();
      const { container } = render(
        <ReachBubble config={config} ctx={ctx} bubbleType="long" />,
      );

      const bubble = container.querySelector('.ai-reach-bubble');
      expect(bubble).toHaveClass('ai-reach-bubble-long');
    });
  });

  describe('短气泡 (short)', () => {
    it('渲染 icon 和短文案', () => {
      const config = createBubbleConfig();
      const ctx = createMockContext();
      render(<ReachBubble config={config} ctx={ctx} bubbleType="short" />);

      expect(screen.getByText('✦')).toBeInTheDocument();
      expect(screen.getByText('预约免排队')).toBeInTheDocument();
    });

    it('有 short 类型的 class', () => {
      const config = createBubbleConfig();
      const ctx = createMockContext();
      const { container } = render(
        <ReachBubble config={config} ctx={ctx} bubbleType="short" />,
      );

      const bubble = container.querySelector('.ai-reach-bubble');
      expect(bubble).toHaveClass('ai-reach-bubble-short');
    });
  });

  describe('箭头', () => {
    it('默认箭头偏移 24px', () => {
      const config = createBubbleConfig();
      const ctx = createMockContext();
      const { container } = render(
        <ReachBubble config={config} ctx={ctx} bubbleType="long" />,
      );

      const arrow = container.querySelector('.ai-reach-bubble-arrow-down');
      expect(arrow).toHaveStyle({ left: '24px' });
    });

    it('支持自定义箭头偏移', () => {
      const config = createBubbleConfig();
      const ctx = createMockContext();
      const { container } = render(
        <ReachBubble config={config} ctx={ctx} bubbleType="long" arrowOffset={30} />,
      );

      const arrow = container.querySelector('.ai-reach-bubble-arrow-down');
      expect(arrow).toHaveStyle({ left: '30px' });
    });
  });

  describe('点击交互', () => {
    it('点击触发 onClick', () => {
      const config = createBubbleConfig();
      const ctx = createMockContext();
      const handleClick = vi.fn();
      const { container } = render(
        <ReachBubble config={config} ctx={ctx} bubbleType="long" onClick={handleClick} />,
      );

      const bubble = container.querySelector('.ai-reach-bubble');
      fireEvent.click(bubble!);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('点击事件 stopPropagation', () => {
      const config = createBubbleConfig();
      const ctx = createMockContext();
      const handleParentClick = vi.fn();
      const handleBubbleClick = vi.fn();

      const { container } = render(
        <div onClick={handleParentClick}>
          <ReachBubble
            config={config}
            ctx={ctx}
            bubbleType="long"
            onClick={handleBubbleClick}
          />
        </div>,
      );

      const bubble = container.querySelector('.ai-reach-bubble');
      fireEvent.click(bubble!);
      expect(handleBubbleClick).toHaveBeenCalledTimes(1);
      expect(handleParentClick).not.toHaveBeenCalled();
    });

    it('支持 Enter 键触发', () => {
      const config = createBubbleConfig();
      const ctx = createMockContext();
      const handleClick = vi.fn();
      const { container } = render(
        <ReachBubble config={config} ctx={ctx} bubbleType="long" onClick={handleClick} />,
      );

      const bubble = container.querySelector('.ai-reach-bubble');
      fireEvent.keyDown(bubble!, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('支持空格键触发', () => {
      const config = createBubbleConfig();
      const ctx = createMockContext();
      const handleClick = vi.fn();
      const { container } = render(
        <ReachBubble config={config} ctx={ctx} bubbleType="long" onClick={handleClick} />,
      );

      const bubble = container.querySelector('.ai-reach-bubble');
      fireEvent.keyDown(bubble!, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('有 role=button 和 tabIndex=0', () => {
      const config = createBubbleConfig();
      const ctx = createMockContext();
      const { container } = render(
        <ReachBubble config={config} ctx={ctx} bubbleType="long" />,
      );

      const bubble = container.querySelector('.ai-reach-bubble');
      expect(bubble).toHaveAttribute('role', 'button');
      expect(bubble).toHaveAttribute('tabindex', '0');
    });
  });

  describe('动态文案', () => {
    it('函数型 longText 在 long 模式下正确渲染', () => {
      const config = createBubbleConfig({
        longText: (ctx: ReachMatchContext) => `订单: ${ctx.order.orderId}`,
      });
      const ctx = createMockContext({
        order: createMockOrder({ orderId: 'dyn-001' }),
      });
      render(<ReachBubble config={config} ctx={ctx} bubbleType="long" />);

      expect(screen.getByText('订单: dyn-001')).toBeInTheDocument();
    });

    it('short 模式下使用 shortText，不调用 longText 函数', () => {
      const longTextFn = vi.fn(() => 'long text');
      const config = createBubbleConfig({
        shortText: '短文案',
        longText: longTextFn,
      });
      const ctx = createMockContext();
      render(<ReachBubble config={config} ctx={ctx} bubbleType="short" />);

      expect(screen.getByText('短文案')).toBeInTheDocument();
      expect(longTextFn).not.toHaveBeenCalled();
    });
  });
});
