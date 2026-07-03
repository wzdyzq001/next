import type { OrderCardData } from '../AiAssistant/OrderCard/orderCardTypes';
import type { ReservationInfoCardData } from '../AiAssistant/ReservationInfoCard';
import type { RedeemReminder } from '../../types';

export type IntentType = 'reservation' | 'reminder' | 'pickup_code' | 'delivery' | 'unknown';

export type MessageRole = 'user' | 'assistant';

export type MessageContentType = 'text' | 'order_card' | 'reservation_card' | 'reminder_card' | 'quick_replies';

export interface QuickReplyOption {
  id: string;
  label: string;
  value?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  type: MessageContentType;
  content?: string;
  orderCard?: OrderCardData;
  reservationCard?: ReservationInfoCardData;
  reminderCard?: {
    reminder: RedeemReminder;
    productName: string;
  };
  quickReplies?: QuickReplyOption[];
  timestamp: number;
}

export interface ReservationSlot {
  date: Date | null;
  time: string | null;
  pax: number | null;
}

export type ReminderSlot = {
  remindAt: Date | null;
};

export interface DialogState {
  intent: IntentType;
  step: 'idle' | 'collecting' | 'confirming' | 'completed';
  reservationSlot: ReservationSlot;
  reminderSlot: ReminderSlot;
  currentOrderId: string | null;
  hasOrderCard: boolean;
}

export interface SceneConfig {
  id: string;
  module: 'reservation' | 'reminder' | 'pickup_code' | 'delivery';
  title: string;
  description: string;
  initialOrderId?: string;
  initialMessage?: string;
  autoTriggerIntent?: boolean;
}

export const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
