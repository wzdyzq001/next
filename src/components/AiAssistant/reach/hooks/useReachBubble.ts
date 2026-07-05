import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReachBubbleType } from '../types';

export interface UseReachBubbleOptions {
  initialType?: ReachBubbleType;
  autoCollapse?: boolean;
  autoCollapseSeconds?: number;
  scrollCollapse?: boolean;
  scrollHide?: boolean;
  scrollExpand?: boolean;
  scrollDebounceMs?: number;
  scrollTarget?: HTMLElement | null;
}

export interface UseReachBubbleResult {
  bubbleType: ReachBubbleType;
  isCollapsed: boolean;
  isScrolling: boolean;
  isHidden: boolean;
  collapse: () => void;
  expand: () => void;
  toggle: () => void;
  resetAutoCollapse: () => void;
}

export function useReachBubble(options: UseReachBubbleOptions = {}): UseReachBubbleResult {
  const {
    initialType = 'long',
    autoCollapse = true,
    autoCollapseSeconds = 5,
    scrollCollapse = true,
    scrollHide = false,
    scrollExpand = true,
    scrollDebounceMs = 150,
    scrollTarget = null,
  } = options;

  const [bubbleType, setBubbleType] = useState<ReachBubbleType>(initialType);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const autoCollapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleTypeRef = useRef<ReachBubbleType>(initialType);
  const collapsedByScrollRef = useRef(false);
  const hiddenByScrollRef = useRef(false);

  useEffect(() => {
    bubbleTypeRef.current = bubbleType;
  }, [bubbleType]);

  const clearAutoCollapseTimer = useCallback(() => {
    if (autoCollapseTimerRef.current) {
      clearTimeout(autoCollapseTimerRef.current);
      autoCollapseTimerRef.current = null;
    }
  }, []);

  const startAutoCollapseTimer = useCallback(() => {
    if (!autoCollapse) return;
    clearAutoCollapseTimer();
    autoCollapseTimerRef.current = setTimeout(() => {
      setBubbleType('short');
    }, autoCollapseSeconds * 1000);
  }, [autoCollapse, autoCollapseSeconds, clearAutoCollapseTimer]);

  const collapse = useCallback(() => {
    clearAutoCollapseTimer();
    setBubbleType('short');
  }, [clearAutoCollapseTimer]);

  const expand = useCallback(() => {
    collapsedByScrollRef.current = false;
    setBubbleType('long');
    startAutoCollapseTimer();
  }, [startAutoCollapseTimer]);

  const toggle = useCallback(() => {
    setBubbleType((prev) => {
      if (prev === 'long') {
        clearAutoCollapseTimer();
        return 'short';
      }
      collapsedByScrollRef.current = false;
      startAutoCollapseTimer();
      return 'long';
    });
  }, [clearAutoCollapseTimer, startAutoCollapseTimer]);

  const resetAutoCollapse = useCallback(() => {
    if (bubbleTypeRef.current === 'long') {
      startAutoCollapseTimer();
    } else {
      collapsedByScrollRef.current = false;
      expand();
    }
  }, [expand, startAutoCollapseTimer]);

  useEffect(() => {
    if (!autoCollapse) return;
    if (initialType === 'long') {
      startAutoCollapseTimer();
    }
    return () => {
      clearAutoCollapseTimer();
    };
  }, [autoCollapse, initialType, startAutoCollapseTimer, clearAutoCollapseTimer]);

  useEffect(() => {
    if (!scrollTarget) return;
    if (!scrollCollapse && !scrollHide && !scrollExpand) return;

    const handleScroll = () => {
      setIsScrolling(true);

      if (scrollHide && !hiddenByScrollRef.current) {
        setIsHidden(true);
        hiddenByScrollRef.current = true;
        clearAutoCollapseTimer();
      } else if (!scrollHide && scrollCollapse && !collapsedByScrollRef.current && bubbleTypeRef.current === 'long') {
        clearAutoCollapseTimer();
        setBubbleType('short');
        collapsedByScrollRef.current = true;
      }

      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
      scrollTimerRef.current = setTimeout(() => {
        setIsScrolling(false);
        if (scrollHide && hiddenByScrollRef.current) {
          hiddenByScrollRef.current = false;
          setIsHidden(false);
          if (scrollExpand && bubbleTypeRef.current === 'short') {
            setBubbleType('long');
            collapsedByScrollRef.current = false;
          }
          if (autoCollapse && bubbleTypeRef.current === 'long') {
            startAutoCollapseTimer();
          }
        } else if (scrollExpand && collapsedByScrollRef.current) {
          collapsedByScrollRef.current = false;
          setBubbleType('long');
          startAutoCollapseTimer();
        }
      }, scrollDebounceMs);
    };

    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollTarget.removeEventListener('scroll', handleScroll);
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
    };
  }, [
    scrollTarget,
    scrollCollapse,
    scrollHide,
    scrollExpand,
    scrollDebounceMs,
    autoCollapse,
    clearAutoCollapseTimer,
    startAutoCollapseTimer,
  ]);

  return {
    bubbleType,
    isCollapsed: bubbleType === 'short',
    isScrolling,
    isHidden,
    collapse,
    expand,
    toggle,
    resetAutoCollapse,
  };
}

export default useReachBubble;
