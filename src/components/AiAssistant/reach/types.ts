import type { GuideMessageConfig } from '../types';
import type { ReservationInfoCardData } from '../ReservationInfoCard';
import type { OrderListItem, MessageAction } from '../../../types';

export type ReachPointType = 'order_card_bar' | 'detail_bubble';

export type ReachDisplayMode = 'guide_clickable' | 'info_display';

export type ReachBubbleType = 'long' | 'short';

export type ReachCollapseStrategy = 'auto_collapse' | 'scroll_collapse' | 'none';

export type ReachOrderStatus = 'unused' | 'redeemed' | 'refunding' | 'refunded' | 'refund_failed';

export interface UsageReminder {
  id: string;
  orderId: string;
  remindAt: number;
  status: 'active' | 'cancelled' | 'triggered';
  productName?: string;
}

export interface ReachMatchContext {
  order: OrderListItem;
  reservation?: ReservationInfoCardData | null;
  reminder?: UsageReminder | null;
  now: number;
}

export type DynamicContentFn = (ctx: ReachMatchContext) => string;

export interface ReachConfig {
  reachId: string;
  pointType: ReachPointType;
  displayMode: ReachDisplayMode;
  priority: number;
  icon: string;
  shortText: string;
  longText: string | DynamicContentFn;
  bubbleType?: ReachBubbleType;
  collapseStrategy?: ReachCollapseStrategy;
  autoCollapseSeconds?: number;
  scrollDebounceMs?: number;
  guideMessage?: GuideMessageConfig;
  actions?: MessageAction[];
  match?: (ctx: ReachMatchContext) => boolean;
  dynamicContent?: DynamicContentFn;
}

export interface FrequencyControlResult {
  allowed: boolean;
  reason?: string;
}

export interface FrequencyControlStrategy {
  check: (reachId: string, userId?: string) => FrequencyControlResult;
  recordExposure: (reachId: string, userId?: string) => void;
}

export interface ReachEngineOptions {
  configs: ReachConfig[];
  frequencyStrategy?: FrequencyControlStrategy;
}

export interface ReachMatchResult {
  matched: ReachConfig | null;
  allMatched: ReachConfig[];
}

export interface ReachPayload {
  reachId: string;
  config: ReachConfig;
  orderId: string;
}
