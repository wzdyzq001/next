import type { MessageAction, RedeemReminder, OrderListItem } from '../../types';
import type { OrderCardData } from './OrderCard/orderCardTypes';
import type { FeatureCardData } from './FeatureCard/types';
import type { ReservationInfoCardData } from './ReservationInfoCard';
import type { ReachConfig } from './reach/types';

export type { MessageAction, RedeemReminder, OrderListItem };

export type OrderCategory = 'food' | 'hotel' | 'scenic' | 'general' | 'travel';

export type ProductType = 'voucher' | 'order_takeout' | 'calendar';

export type OrderStatus =
  | 'pending_payment'
  | 'pending_use'
  | 'pending_booking'
  | 'confirmed'
  | 'in_delivery'
  | 'completed'
  | 'refunding'
  | 'refunded'
  | 'refund_card'
  | 'refund_failed'
  | 'canceled';

export interface OrderHotelInfo {
  checkInTime?: string;
  checkOutTime?: string;
  breakfast?: string;
  roomFacilities?: string[];
  hotelPolicy?: string[];
}

export interface OrderScenicInfo {
  visitTime?: string;
  ticketType?: string;
  ticketCount?: number;
  visitorName?: string;
}

export interface OrderTravelInfo {
  departureTime?: string;
  arrivalTime?: string;
  departureStation?: string;
  arrivalStation?: string;
  seatClass?: string;
  passenger?: string;
}

export interface OrderData {
  id: string;
  orderNo: string;
  category: OrderCategory;
  productType: ProductType;
  productName: string;
  productImage: string;
  price: number;
  originalPrice?: number;
  tags: string[];
  storeName: string;
  status: OrderStatus;
  subStatus?: string;
  quantity: number;
  validityPeriod?: string;
  distance?: string;
  storePhone?: string;
  storeAddress?: string;
  checkInDate?: string;
  checkOutDate?: string;
  visitDate?: string;
  roomType?: string;
  visitorCount?: number;
  redeemMethod?: string;
  deliveryStatus?: string;
  deliveryRiderName?: string;
  deliveryDistance?: string;
  deliveryEta?: string;
  pickupCode?: string;
  payExpireAt?: number;
  hotelInfo?: OrderHotelInfo;
  scenicInfo?: OrderScenicInfo;
  travelInfo?: OrderTravelInfo;
  guideContent?: string;
  weatherWarning?: string;
}

export type EntrySource = 'order_list' | 'order_detail' | 'bubble';

export interface CollapseStateItem {
  collapsed: boolean;
  visibleCount: number;
}

export interface CollapseState {
  order_list?: CollapseStateItem;
  [orderId: string]: CollapseStateItem | undefined;
}

export interface LastEntryState {
  source: EntrySource;
  orderId?: string;
}

export type BubbleType = 'persistent_short' | 'temporary_short' | 'long_collapsible';

export interface BubbleConfig {
  id: string;
  type: BubbleType;
  orderId: string;
  text: string;
  expandedText?: string;
  eventType: string;
  autoHideAfter?: number;
  priority: number;
}

export interface GuideMessageConfig {
  text: string;
  actions?: MessageAction[];
  quickReplies?: GuidedQuestion[];
}

export type OverlayMode = 'minimized' | 'fullscreen' | 'closed';

export type DegradeLevel = 'none' | 'L1' | 'L2' | 'L3';

export interface GuidedQuestion {
  id: string;
  question: string;
  score: number;
  priority: 0 | 1 | 2 | 3;
  category?: string;
  status?: string;
  action?: 'open_order_selector' | 'open_reservation';
}

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageContentType = 'text' | 'system_notice';

export type QuickActionType = 'reservation' | 'reminder' | 'pickup_code' | 'delivery';

export interface QuickAction {
  id: string;
  label: string;
  icon?: string;
  type: QuickActionType;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  contentType: MessageContentType;
  content?: string;
  quickReplies?: GuidedQuestion[];
  quickActions?: QuickAction[];
  actions?: MessageAction[];
  redeemReminder?: RedeemReminder;
  reservationInfo?: ReservationInfoCardData;
  orderCard?: OrderCardData;
  orderList?: OrderCardData[];
  featureCard?: FeatureCardData;
  timestamp: number;
  status?: 'sending' | 'sent' | 'error';
}

export interface DialogState {
  currentIntent: string | null;
  entities: Record<string, string>;
  currentStep: string;
  orderContext?: Record<string, unknown>;
  pendingAction?: string;
  data?: Record<string, unknown>;
}

export interface ConversationContext {
  sessionId: string;
  currentOrderId?: string;
  orderContext?: {
    category?: string;
    productType?: string;
    status?: string;
    refundStage?: 'none' | 'persuading' | 'confirming';
  };
  resolvedQuestions: string[];
  conversationTurns: number;
  createdAt: number;
  lastActiveAt: number;
  dialogState?: DialogState;
}

export interface AiAssistantState {
  overlayMode: OverlayMode;
  entrySource: EntrySource;
  currentOrderId?: string;
  currentOrder?: OrderData;
  sessionId: string;
  context: ConversationContext;
  messages: ChatMessage[];
  degradeLevel: DegradeLevel;
  currentBubble?: BubbleConfig;
  isLoading: boolean;
  hasUnread: boolean;
  isHistoryCollapsed: boolean;
  collapsedCount: number;
  visibleCount: number;
  bubbleEventContext?: {
    eventType: string;
    orderId: string;
  };
  reminderSheetOpen: boolean;
  reminderSheetOrderId: string | null;
  reminderSheetProductName?: string;
  reminderSheetValidDate?: string;
  reminderSheetInitialRemindAt?: number;
  reservationPanelOpen: boolean;
  reservationStoreName: string;
  reservationBusinessHours?: string;
  voucherSheetOpen: boolean;
  voucherSheetStoreName?: string;
  voucherSheetProductName?: string;
  voucherSheetVoucherCode?: string;
  reachPayload?: {
    reachId: string;
    config: ReachConfig;
    orderId: string;
  } | null;
}

export interface AiAssistantContextValue extends AiAssistantState {
  openAssistant: (orderId?: string, source?: EntrySource, guideMessage?: GuideMessageConfig) => void;
  closeAssistant: () => void;
  toggleFullscreen: () => void;
  toggleHistoryCollapsed: () => void;
  sendMessage: (message: string) => Promise<void>;
  triggerBubble: (bubble: BubbleConfig) => void;
  clickBubble: () => void;
  hideBubble: () => void;
  markAsRead: () => void;
  switchOrder: (orderId: string) => void;
  executeAction: (action: MessageAction) => void;
  clickGuidedQuestion: (question: GuidedQuestion) => void;
  submitFeatureCard: (cardType: string, data: Record<string, unknown>) => Promise<void>;
  cancelFeatureCard: () => void;
  checkServiceHealth: () => Promise<void>;
  setDegradeLevel: (level: DegradeLevel) => void;
  resetSession: () => void;
  transferHuman: 'idle' | 'transferring' | 'chatting';
  setTransferHuman: (state: 'idle' | 'transferring' | 'chatting') => void;
  wsState: WSConnectionState;
  showToast: (text: string) => void;
  toastText: string | null;
  dismissNotification: () => void;
  openReminderSheet: (orderId: string, productName?: string, validDate?: string, initialRemindAt?: number) => void;
  closeReminderSheet: () => void;
  confirmReminder: (reminder: RedeemReminder) => void;
  cancelReminder: (orderId: string) => void;
  modifyReminder: (orderId: string, productName?: string, validDate?: string) => void;
  resetReminder: (orderId: string, productName?: string, validDate?: string) => void;
  openReservationPanel: (storeName: string, businessHours?: string, mode?: 'new' | 'rebook', initialData?: ReservationInfoCardData, messageId?: string) => void;
  closeReservationPanel: () => void;
  confirmReservation: (data: ReservationInfoCardData, messageId?: string) => void;
  cancelReservation: (messageId: string, reservation: ReservationInfoCardData) => void;
  rebookReservation: (messageId: string, reservation: ReservationInfoCardData) => void;
  reservationEditMode: 'new' | 'rebook';
  editingReservation: ReservationInfoCardData | null;
  reservationsByOrder: Record<string, ReservationInfoCardData>;
  cancelOrderReservation: (orderId: string) => void;
  rebookOrderReservation: (orderId: string) => void;
  openVoucherSheet: (storeName: string, productName: string, voucherCode: string) => void;
  closeVoucherSheet: () => void;
  onOpenReservation?: (orderId: string, category: string, productType?: string) => void;
  sendOrderCard: (order: OrderListItem | OrderData) => void;
  sendRedeemReminderWithOrder: (order: OrderListItem | OrderData) => void;
  placeOrder: (orderId: string) => Promise<void>;
  startDelivery: (orderId: string) => Promise<void>;
  checkExistingReservation: (orderId?: string) => ReservationInfoCardData | null;
  showExistingReservationAlert: (reservation: ReservationInfoCardData) => void;
  clearChatHistory: () => void;
  setReachPayload: (payload: { reachId: string; config: ReachConfig; orderId: string } | null) => void;
  clearReachPayload: () => void;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unavailable';
  degradeLevel?: DegradeLevel;
}

export type WSConnectionState = 'connecting' | 'connected' | 'disconnected' | 'polling';

export interface StateChangePayload {
  orderId: string;
  status: string;
  subStatus?: string;
  statusText?: string;
  timestamp?: number;
}

export interface BubblePushPayload {
  orderId: string;
  bubbleType: 'persistent_short' | 'temporary_short' | 'long_collapsible';
  text: string;
  expandedText?: string;
  eventType: string;
  priority?: number;
}

export interface MerchantNotice {
  id: string;
  merchantName: string;
  noticeType: string;
  title: string;
  content: string;
  orderIds?: string[];
  actionButton?: string;
  timestamp?: number;
}

export interface WeatherWarning {
  id: string;
  level: 'blue' | 'yellow' | 'orange' | 'red';
  weatherType: string;
  advice: string;
  affectedAreas?: string[];
  timestamp?: number;
}

export interface OrderLatestState {
  orderId: string;
  status: string;
  subStatus?: string;
  statusText?: string;
}
