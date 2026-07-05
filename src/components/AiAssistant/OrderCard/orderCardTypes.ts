export type MainOrderStatus =
  | 'pending_pay'
  | 'unused'
  | 'cancelled'
  | 'redeemed'
  | 'refunding'
  | 'refund_success'
  | 'refund_fail';

export type FoodSubStatus =
  | 'self_01_pending_accept'
  | 'self_02_accepted'
  | 'self_03_preparing'
  | 'self_04_waiting_pickup'
  | 'self_05_picked_up'
  | 'delivery_01_pending_accept'
  | 'delivery_02_accepted'
  | 'delivery_03_preparing'
  | 'delivery_04_waiting_rider'
  | 'delivery_05_delivering'
  | 'delivery_06_delivered'
  | 'voucher_redeemed';

export type FulfillmentType = 'self_order' | 'delivery' | 'voucher';

export type LegacyOrderStatus =
  | 'pending_pay'
  | 'unused'
  | 'pending_accept'
  | 'preparing'
  | 'delivering'
  | 'waiting_pickup'
  | 'picked_up'
  | 'to_book'
  | 'booking_confirming'
  | 'booked'
  | 'checked_in'
  | 'entered'
  | 'pending_travel'
  | 'in_travel'
  | 'refunding'
  | 'refund_success'
  | 'refund_fail'
  | 'cancelled'
  | 'completed';

export interface OrderCardData {
  id: string;
  category: 'food' | 'hotel' | 'scenic' | 'general' | 'travel_agency';
  categoryLabel: string;
  productType: 'group_voucher' | 'presale_voucher' | 'calendar_room' | 'calendar_ticket';
  productTypeLabel: string;
  redeemMethod?: 'voucher' | 'self_order' | 'delivery';
  redeemMethodLabel?: string;
  redeemTypes?: ('voucher' | 'order' | 'delivery')[];
  fulfillmentType?: FulfillmentType;
  mainStatus?: MainOrderStatus;
  mainStatusLabel?: string;
  subStatus?: FoodSubStatus | string;
  subStatusLabel?: string;
  orderStatus: LegacyOrderStatus;
  orderStatusLabel: string;
  productName: string;
  price: number;
  thumbnail: string;
  tags: string[];
  storeName: string;
  distance: string;
  statusText: string;
  statusColor: string;
  hideStoreLine?: boolean;
  urgeReason?: string;
  extension?: {
    type: 'progress' | 'hotel_stay' | 'refund' | 'payment_countdown' | 'travel_info' | 'pickup_code' | 'pickup_completed' | 'delivery_completed' | 'scenic_entry' | 'refund_success';
    title: string;
    summary?: string;
    pickupCode?: string;
    pickupTime?: string;
    hasPickupCode?: boolean;
    channel?: string;
    steps?: { label: string; state: 'done' | 'active' | 'pending' | 'error'; time?: string }[];
    info?: { label: string; value: string }[];
    estimatedTime?: string;
    hotelInfo?: {
      hotelName: string;
      checkInDate: string;
      checkOutDate: string;
      nights: number;
      statusTags?: { text: string; type?: 'warn' | 'success' | 'default' }[];
    };
    scenicInfo?: {
      scenicName: string;
      visitDate: string;
      entryTime: string;
      statusTags?: { text: string; type?: 'warn' | 'success' | 'default' }[];
    };
    riderInfo?: {
      name: string;
      phone?: string;
    };
    deliveredTime?: string;
    riderName?: string;
  };
  actions: { label: string; type: 'primary' | 'secondary' }[];
  paymentCountdown?: string;
  suggestions: string[];
  validDate?: string;
  voucherInfo?: {
    code: string;
    number: string;
    validDate: string;
    notes: string[];
  };
}
