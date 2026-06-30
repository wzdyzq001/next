import React from 'react';
import type { FeatureCardData, FeatureCardProps } from './types';
import RedeemReminderFeatureCard from './RedeemReminderFeatureCard';
import ReservationFeatureCard from './ReservationFeatureCard';
import UrgentRequestCard from './UrgentRequestCard';
import ReorderCard from './ReorderCard';
import RefundApplyCard from './RefundApplyCard';
import GuideCard from './GuideCard';
import VoucherCodeCard from './VoucherCodeCard';

interface FeatureCardRendererProps extends FeatureCardProps {
  data: FeatureCardData;
}

export const FeatureCardRenderer: React.FC<FeatureCardRendererProps> = ({ data, onConfirm, onCancel }) => {
  switch (data.type) {
    case 'redeem_reminder':
      return <RedeemReminderFeatureCard data={data} onConfirm={onConfirm} onCancel={onCancel} />;
    case 'reservation_form':
      return <ReservationFeatureCard data={data} onConfirm={onConfirm} onCancel={onCancel} />;
    case 'urgent_request':
      return <UrgentRequestCard data={data} onConfirm={onConfirm} onCancel={onCancel} />;
    case 'reorder':
      return <ReorderCard data={data} onConfirm={onConfirm} onCancel={onCancel} />;
    case 'refund_apply':
      return <RefundApplyCard data={data} onConfirm={onConfirm} onCancel={onCancel} />;
    case 'guide':
      return <GuideCard data={data} onConfirm={onConfirm} onCancel={onCancel} />;
    case 'voucher_code':
      return <VoucherCodeCard data={data} onConfirm={onConfirm} onCancel={onCancel} />;
    default:
      return null;
  }
};

export default FeatureCardRenderer;
