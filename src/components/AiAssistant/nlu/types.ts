import type { OrderCardData } from '../OrderCard/orderCardTypes';
import type { FeatureCardData } from '../FeatureCard/types';
import type { ReservationInfoCardData } from '../ReservationInfoCard';
import type { RedeemReminder } from '../../../types';
import type { GuidedQuestion } from '../types';

export type IntentType =
  | 'reservation'
  | 'reminder'
  | 'pickup_code'
  | 'delivery'
  | 'greeting'
  | 'cancel'
  | 'unknown';

export type EntityType = 'date' | 'time' | 'people_count' | 'number';

export interface Entity {
  type: EntityType;
  value: string;
  raw: string;
}

export interface DialogState {
  currentIntent: IntentType | null;
  entities: Record<string, string>;
  currentStep: string;
  orderContext?: {
    orderId?: string;
    category?: string;
    status?: string;
    redeemMethod?: string;
  };
  pendingAction?: string;
  data?: Record<string, unknown>;
}

export interface NluResponseMessage {
  role: 'assistant';
  contentType: 'text';
  content: string;
  quickReplies?: GuidedQuestion[];
  orderCard?: OrderCardData;
  featureCard?: FeatureCardData;
  reservationInfo?: ReservationInfoCardData;
  redeemReminder?: RedeemReminder;
  delay?: number;
}

export interface NluResponse {
  messages: NluResponseMessage[];
  newDialogState: DialogState;
  newSessionId?: string;
  transferHuman?: boolean;
}

export interface NluContext {
  sessionId: string;
  dialogState: DialogState;
  currentOrderId?: string;
  orderCard?: OrderCardData;
  conversationTurns: number;
  resolvedQuestions: string[];
  allOrders?: OrderCardData[];
}
