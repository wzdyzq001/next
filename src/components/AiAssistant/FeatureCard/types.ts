import type { OrderCardData } from '../OrderCard/orderCardTypes';

export type FeatureCardType = 
  | 'redeem_reminder'
  | 'reservation_form'
  | 'urgent_request'
  | 'reorder'
  | 'refund_apply'
  | 'guide'
  | 'voucher_code';

export interface FeatureCardData {
  type: FeatureCardType;
  title?: string;
  redeemReminder?: { productName: string; validDate?: string };
  reservation?: { storeName: string; businessHours?: string };
  urgent?: { reason: string; target: string };
  reorder?: {
    productName: string;
    storeName: string;
    price: number;
    thumbnail: string;
    orderData?: OrderCardData;
  };
  refund?: { amount: number; reason?: string };
  guide?: { category: 'hotel' | 'scenic' | 'travel'; title: string; content: string[] };
  voucher?: { code: string; number: string; validDate: string; notes: string[] };
}

export interface FeatureCardProps {
  data: FeatureCardData;
  onConfirm?: (data?: Record<string, unknown>) => void;
  onCancel?: () => void;
}
