// ===========================================================================
// useWebSocket - WebSocket 连接管理 Hook
// 连接ws://localhost:3001/ws，3s初始+指数退避重连最多5次
// 断连时启动15s轮询GET /api/orders/:id/latest-state
// ===========================================================================

import { useEffect, useRef, useCallback } from 'react';
import { aiAssistantWs, getOrderLatestState } from './api';
import type {
  StateChangePayload,
  BubblePushPayload,
  MerchantNotice,
  WeatherWarning,
  WSConnectionState,
} from './types';
import { POLLING_INTERVAL } from './constants';

export interface UseWebSocketOptions {
  orderId?: string;
  sessionId?: string;
  onStateChange?: (payload: StateChangePayload) => void;
  onBubblePush?: (payload: BubblePushPayload) => void;
  onMerchantNotice?: (payload: MerchantNotice) => void;
  onWeatherWarning?: (payload: WeatherWarning & { orderId?: string }) => void;
  onConnectionStateChange?: (state: WSConnectionState) => void;
  enabled?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    orderId,
    sessionId,
    onStateChange,
    onBubblePush,
    onMerchantNotice,
    onWeatherWarning,
    onConnectionStateChange,
    enabled = true,
  } = options;

  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubscribersRef = useRef<Array<() => void>>([]);
  const connectionStateRef = useRef<WSConnectionState>('disconnected');

  const setConnectionState = useCallback((state: WSConnectionState) => {
    connectionStateRef.current = state;
    onConnectionStateChange?.(state);
  }, [onConnectionStateChange]);

  const startPolling = useCallback(() => {
    if (!orderId) return;
    if (pollingTimerRef.current) return;

    console.log('[AI助手] WebSocket断连，启动15s轮询latest-state');
    setConnectionState('polling');

    pollingTimerRef.current = setInterval(async () => {
      if (!orderId) return;
      try {
        const state = await getOrderLatestState(orderId);
        if (state) {
          console.log('[AI助手] 轮询获取最新状态:', state);
          onStateChange?.({
            orderId,
            status: state.status,
            subStatus: state.subStatus,
          });
        }
      } catch {
        // ignore polling errors
      }
    }, POLLING_INTERVAL);
  }, [orderId, onStateChange, setConnectionState]);

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopPolling();
      return;
    }

    // 注册事件监听
    const unsubStateChange = aiAssistantWs.on('state_change', (payload) => {
      const p = payload as unknown as StateChangePayload;
      if (!orderId || p.orderId === orderId) {
        onStateChange?.(p);
      }
    });

    const unsubBubble = aiAssistantWs.on('bubble_push', (payload) => {
      const p = payload as unknown as BubblePushPayload;
      if (!orderId || p.orderId === orderId) {
        onBubblePush?.(p);
      }
    });

    const unsubMerchant = aiAssistantWs.on('merchant_notice', (payload) => {
      const p = payload as unknown as MerchantNotice;
      onMerchantNotice?.(p);
    });

    const unsubWeather = aiAssistantWs.on('weather_warning', (payload) => {
      const p = payload as unknown as WeatherWarning & { orderId?: string };
      if (!orderId || p.orderId === orderId) {
        onWeatherWarning?.(p);
      }
    });

    const unsubConnected = aiAssistantWs.on('connected', () => {
      console.log('[AI助手] WS connected, stopping polling');
      stopPolling();
      setConnectionState('connected');
    });

    const unsubDisconnected = aiAssistantWs.on('disconnected', () => {
      console.log('[AI助手] WS disconnected, starting polling fallback');
      setConnectionState('disconnected');
      startPolling();
    });

    unsubscribersRef.current = [
      unsubStateChange,
      unsubBubble,
      unsubMerchant,
      unsubWeather,
      unsubConnected,
      unsubDisconnected,
    ];

    // 连接WebSocket
    setConnectionState('connecting');
    aiAssistantWs.connect(sessionId);

    return () => {
      // 清理所有监听
      unsubscribersRef.current.forEach((unsub) => unsub());
      unsubscribersRef.current = [];
      stopPolling();
    };
  }, [enabled, orderId, sessionId, onStateChange, onBubblePush, onMerchantNotice, onWeatherWarning, setConnectionState, startPolling, stopPolling]);

  return {
    connectionState: connectionStateRef.current,
    disconnect: () => aiAssistantWs.disconnect(),
    reconnect: () => aiAssistantWs.connect(sessionId),
  };
}
