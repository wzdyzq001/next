export interface OrderCardData {
  id: string;
  category: 'food' | 'hotel' | 'scenic' | 'general' | 'travel_agency';
  categoryLabel: string;
  productType: 'group_voucher' | 'presale_voucher' | 'calendar_room' | 'calendar_ticket';
  productTypeLabel: string;
  redeemMethod?: 'voucher' | 'self_order' | 'delivery';
  redeemMethodLabel?: string;
  redeemTypes?: ('voucher' | 'order' | 'delivery')[];
  orderStatus: 'pending_pay' | 'unused' | 'pending_accept' | 'preparing' | 'delivering' | 'waiting_pickup' | 'picked_up' | 'to_book' | 'booking_confirming' | 'booked' | 'checked_in' | 'entered' | 'pending_travel' | 'in_travel' | 'refunding' | 'refund_success' | 'refund_fail' | 'cancelled' | 'completed';
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
    type: 'progress' | 'hotel_stay' | 'refund' | 'payment_countdown' | 'travel_info' | 'pickup_code' | 'delivery_completed' | 'scenic_entry' | 'refund_success';
    title: string;
    summary?: string;
    pickupCode?: string;
    pickupTime?: string;
    hasPickupCode?: boolean;
    channel?: string;
    steps?: { label: string; state: 'done' | 'active' | 'pending'; time?: string }[];
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
  };
  actions: { label: string; type: 'primary' | 'secondary' }[];
  paymentCountdown?: string;
  suggestions: string[];
  voucherInfo?: {
    code: string;
    number: string;
    validDate: string;
    notes: string[];
  };
}
