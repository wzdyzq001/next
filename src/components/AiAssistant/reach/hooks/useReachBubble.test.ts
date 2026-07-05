import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReachBubble } from './useReachBubble';

describe('useReachBubble', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('初始状态', () => {
    it('默认初始为 long 类型', () => {
      const { result } = renderHook(() => useReachBubble());
      expect(result.current.bubbleType).toBe('long');
      expect(result.current.isCollapsed).toBe(false);
    });

    it('支持自定义初始类型', () => {
      const { result } = renderHook(() =>
        useReachBubble({ initialType: 'short' }),
      );
      expect(result.current.bubbleType).toBe('short');
      expect(result.current.isCollapsed).toBe(true);
    });
  });

  describe('自动收起', () => {
    it('默认启用自动收起，5秒后变为 short', () => {
      const { result } = renderHook(() =>
        useReachBubble({ autoCollapse: true, autoCollapseSeconds: 5 }),
      );

      expect(result.current.bubbleType).toBe('long');

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.bubbleType).toBe('short');
      expect(result.current.isCollapsed).toBe(true);
    });

    it('autoCollapse 为 false 时不自动收起', () => {
      const { result } = renderHook(() =>
        useReachBubble({ autoCollapse: false }),
      );

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.bubbleType).toBe('long');
    });

    it('支持自定义自动收起时间', () => {
      const { result } = renderHook(() =>
        useReachBubble({ autoCollapse: true, autoCollapseSeconds: 3 }),
      );

      act(() => {
        vi.advanceTimersByTime(2999);
      });
      expect(result.current.bubbleType).toBe('long');

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.bubbleType).toBe('short');
    });

    it('初始为 short 时不启动自动收起定时器', () => {
      const { result } = renderHook(() =>
        useReachBubble({ initialType: 'short', autoCollapse: true }),
      );

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.bubbleType).toBe('short');
    });
  });

  describe('手动控制', () => {
    it('collapse 手动收起气泡', () => {
      const { result } = renderHook(() =>
        useReachBubble({ autoCollapse: false }),
      );

      act(() => {
        result.current.collapse();
      });

      expect(result.current.bubbleType).toBe('short');
      expect(result.current.isCollapsed).toBe(true);
    });

    it('expand 手动展开气泡并重启自动收起', () => {
      const { result } = renderHook(() =>
        useReachBubble({ autoCollapse: true, autoCollapseSeconds: 5 }),
      );

      act(() => {
        result.current.collapse();
      });
      expect(result.current.bubbleType).toBe('short');

      act(() => {
        result.current.expand();
      });
      expect(result.current.bubbleType).toBe('long');

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current.bubbleType).toBe('short');
    });

    it('toggle 在 long 和 short 之间切换', () => {
      const { result } = renderHook(() =>
        useReachBubble({ autoCollapse: false }),
      );

      expect(result.current.bubbleType).toBe('long');

      act(() => {
        result.current.toggle();
      });
      expect(result.current.bubbleType).toBe('short');

      act(() => {
        result.current.toggle();
      });
      expect(result.current.bubbleType).toBe('long');
    });

    it('resetAutoCollapse 在 long 时重置定时器', () => {
      const { result } = renderHook(() =>
        useReachBubble({ autoCollapse: true, autoCollapseSeconds: 5 }),
      );

      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(result.current.bubbleType).toBe('long');

      act(() => {
        result.current.resetAutoCollapse();
      });

      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(result.current.bubbleType).toBe('long');

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.bubbleType).toBe('short');
    });

    it('resetAutoCollapse 在 short 时先展开再重置', () => {
      const { result } = renderHook(() =>
        useReachBubble({
          initialType: 'short',
          autoCollapse: true,
          autoCollapseSeconds: 5,
        }),
      );

      act(() => {
        result.current.resetAutoCollapse();
      });
      expect(result.current.bubbleType).toBe('long');

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current.bubbleType).toBe('short');
    });
  });

  describe('滚动交互', () => {
    let scrollContainer: HTMLDivElement;

    beforeEach(() => {
      scrollContainer = document.createElement('div');
      scrollContainer.style.height = '100px';
      scrollContainer.style.overflow = 'auto';
      scrollContainer.innerHTML = '<div style="height: 1000px;">content</div>';
      document.body.appendChild(scrollContainer);
    });

    afterEach(() => {
      document.body.removeChild(scrollContainer);
    });

    it('滚动时触发收起，停止后重新展开', () => {
      const { result } = renderHook(() =>
        useReachBubble({
          autoCollapse: false,
          scrollCollapse: true,
          scrollExpand: true,
          scrollDebounceMs: 200,
          scrollTarget: scrollContainer,
        }),
      );

      expect(result.current.bubbleType).toBe('long');
      expect(result.current.isScrolling).toBe(false);

      act(() => {
        scrollContainer.scrollTop = 50;
        scrollContainer.dispatchEvent(new Event('scroll'));
      });

      expect(result.current.bubbleType).toBe('short');
      expect(result.current.isScrolling).toBe(true);

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.isScrolling).toBe(false);
      expect(result.current.bubbleType).toBe('long');
    });

    it('自动收起后滚动，停止时不自动展开', () => {
      const { result } = renderHook(() =>
        useReachBubble({
          autoCollapse: true,
          autoCollapseSeconds: 3,
          scrollCollapse: true,
          scrollExpand: true,
          scrollDebounceMs: 200,
          scrollTarget: scrollContainer,
        }),
      );

      expect(result.current.bubbleType).toBe('long');

      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(result.current.bubbleType).toBe('short');

      act(() => {
        scrollContainer.scrollTop = 50;
        scrollContainer.dispatchEvent(new Event('scroll'));
      });
      expect(result.current.bubbleType).toBe('short');
      expect(result.current.isScrolling).toBe(true);

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current.isScrolling).toBe(false);
      expect(result.current.bubbleType).toBe('short');
    });

    it('手动展开后滚动，停止时会重新展开', () => {
      const { result } = renderHook(() =>
        useReachBubble({
          autoCollapse: false,
          scrollCollapse: true,
          scrollExpand: true,
          scrollDebounceMs: 200,
          scrollTarget: scrollContainer,
        }),
      );

      act(() => {
        result.current.collapse();
      });
      expect(result.current.bubbleType).toBe('short');

      act(() => {
        result.current.expand();
      });
      expect(result.current.bubbleType).toBe('long');

      act(() => {
        scrollContainer.scrollTop = 50;
        scrollContainer.dispatchEvent(new Event('scroll'));
      });
      expect(result.current.bubbleType).toBe('short');

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current.bubbleType).toBe('long');
    });

    it('scrollCollapse 为 false 时滚动不收起', () => {
      const { result } = renderHook(() =>
        useReachBubble({
          autoCollapse: false,
          scrollCollapse: false,
          scrollExpand: false,
          scrollTarget: scrollContainer,
        }),
      );

      act(() => {
        scrollContainer.scrollTop = 50;
        scrollContainer.dispatchEvent(new Event('scroll'));
      });

      expect(result.current.bubbleType).toBe('long');
    });

    it('没有 scrollTarget 时不监听滚动', () => {
      const { result } = renderHook(() =>
        useReachBubble({
          autoCollapse: false,
          scrollCollapse: true,
          scrollExpand: true,
        }),
      );

      act(() => {
        scrollContainer.scrollTop = 50;
        scrollContainer.dispatchEvent(new Event('scroll'));
      });

      expect(result.current.bubbleType).toBe('long');
      expect(result.current.isScrolling).toBe(false);
    });
  });
});
