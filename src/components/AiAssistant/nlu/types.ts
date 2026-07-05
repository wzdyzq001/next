import type { OrderCardData } from '../OrderCard/orderCardTypes';
import type { FeatureCardData } from '../FeatureCard/types';
import type { ReservationInfoCardData } from '../ReservationInfoCard';
import type { RedeemReminder, MessageAction } from '../../../types';
import type { GuidedQuestion, DialogState as BaseDialogState } from '../types';

export type IntentType =
  | 'reservation'
  | 'reminder'
  | 'pickup_code'
  | 'delivery'
  | 'greeting'
  | 'cancel'
  | 'unknown';

export type EntityType = 'date' | 'time' | 'people_count' | 'number' | 'phone';

export type ReservationStep =
  | 'idle'
  | 'selecting_order'
  | 'validating_order'
  | 'collecting_info'
  | 'collecting_phone'
  | 'confirming'
  | 'completed';

export type ReminderStep =
  | 'idle'
  | 'selecting_order'
  | 'validating_order'
  | 'checking_existing'
  | 'collecting_datetime'
  | 'confirming'
  | 'completed';

export interface ReservationEntities {
  date?: string;
  time?: string;
  peopleCount?: string;
  phone?: string;
  storeName?: string;
  orderId?: string;
}

export interface Entity {
  type: EntityType;
  value: string;
  raw: string;
}

export interface NluDialogState extends BaseDialogState {
  currentIntent: IntentType | null;
  reservationStep?: ReservationStep;
  reminderStep?: ReminderStep;
}

export interface NluResponseMessage {
  role: 'assistant';
  contentType: 'text';
  content: string;
  quickReplies?: GuidedQuestion[];
  actions?: MessageAction[];
  orderCard?: OrderCardData;
  orderList?: OrderCardData[];
  featureCard?: FeatureCardData;
  reservationInfo?: ReservationInfoCardData;
  redeemReminder?: RedeemReminder;
  delay?: number;
}

export interface NluResponse {
  messages: NluResponseMessage[];
  newDialogState: NluDialogState;
  newSessionId?: string;
  transferHuman?: boolean;
}

export interface NluContext {
  sessionId: string;
  dialogState: NluDialogState;
  currentOrderId?: string;
  orderCard?: OrderCardData;
  conversationTurns: number;
  resolvedQuestions: string[];
  allOrders?: OrderCardData[];
  reservationsByOrder?: Record<string, ReservationInfoCardData>;
}
