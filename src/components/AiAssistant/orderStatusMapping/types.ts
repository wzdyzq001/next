export type MainOrderStatus =
  | 'pending_pay'
  | 'unused'
  | 'cancelled'
  | 'redeemed'
  | 'refunding'
  | 'refund_success'
  | 'refund_fail';

export type FoodFulfillmentType = 'self_order' | 'delivery' | 'voucher';

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

export type MainStatusColor = 'orange' | 'green' | 'gray' | 'blue';

export interface FoodStatusMappingItem {
  subStatus: FoodSubStatus;
  subStatusLabel: string;
  mainStatus: MainOrderStatus;
  mainStatusLabel: string;
  fulfillmentType: FoodFulfillmentType;
  mainStatusColor: MainStatusColor;
}

export type OrderCategory = 'food' | 'hotel' | 'scenic' | 'general' | 'travel_agency';
