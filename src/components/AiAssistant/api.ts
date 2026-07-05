import type { OrderData, GuidedQuestion, OrderLatestState } from './types';
import { API_TIMEOUT, WS_URL, API_BASE_URL } from './constants';

type EventName = 'state_change' | 'bubble_push' | 'merchant_notice' | 'weather_warning' | 'connected' | 'disconnected';

class AiAssistantWs {
  private ws: WebSocket | null = null;
  private listeners: Map<EventName, Array<(payload: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private sessionId?: string;

  on(event: EventName, callback: (payload: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    return () => {
      const list = this.listeners.get(event);
      if (list) {
        const idx = list.indexOf(callback);
        if (idx >= 0) list.splice(idx, 1);
      }
    };
  }

  private emit(event: EventName, payload?: any) {
    const list = this.listeners.get(event);
    if (list) list.forEach((fn) => fn(payload));
  }

  connect(sessionId?: string) {
    this.sessionId = sessionId;
    try {
      const url = sessionId ? `${WS_URL}?sessionId=${sessionId}` : WS_URL;
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.emit('connected');
      };
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type && this.listeners.has(data.type as EventName)) {
            this.emit(data.type as EventName, data.payload);
          }
        } catch {
        }
      };
      this.ws.onclose = () => {
        this.emit('disconnected');
        this.tryReconnect();
      };
      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      this.emit('disconnected');
      this.tryReconnect();
    }
  }

  private tryReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts += 1;
    const delay = 3000 * Math.pow(2, this.reconnectAttempts - 1);
    setTimeout(() => this.connect(this.sessionId), delay);
  }

  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts;
    this.ws?.close();
    this.ws = null;
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

export const aiAssistantWs = new AiAssistantWs();

async function request<T>(
  path: string,
  options: RequestInit = {},
  timeout: number = API_TIMEOUT
): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as T;
  } catch {
    return null;
  }
}

export interface ChatApiRequest {
  sessionId?: string;
  message: string;
  orderId?: string;
  conversationTurns?: number;
  resolvedQuestions?: string[];
}

export interface ChatApiResponse {
  reply: string;
  guideQuestions?: GuidedQuestion[];
  transferHuman?: boolean;
  transferContext?: Record<string, unknown>;
  newSessionId?: string;
  nextGuideQuestions?: GuidedQuestion[];
}

export async function chat(req: ChatApiRequest): Promise<ChatApiResponse | null> {
  return request<ChatApiResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function getOrders(): Promise<OrderData[] | null> {
  return request<OrderData[]>('/orders');
}

export async function getOrder(orderId: string): Promise<OrderData | null> {
  return request<OrderData>(`/orders/${orderId}`);
}

export async function getOrderLatestState(orderId: string): Promise<OrderLatestState | null> {
  return request<OrderLatestState>(`/orders/${orderId}/latest-state`);
}
