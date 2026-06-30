import React from 'react';
import type { OrderCardData } from './orderCardTypes';
import { OrderCardBase } from './OrderCardBase';
import { OrderCardExtension } from './OrderCardExtension';
import { OrderCardActions } from './OrderCardActions';
import { OrderCardSuggestions } from './OrderCardSuggestions';
import './orderCard.css';

interface FullOrderCardProps {
  order: OrderCardData;
  onActionClick?: (label: string) => void;
  onSuggestionClick?: (s: string) => void;
}

export const FullOrderCard: React.FC<FullOrderCardProps> = ({ order, onActionClick, onSuggestionClick }) => {
  return (
    <div className="oc-order-card">
      <OrderCardBase order={order} />
      {order.extension?.type !== 'payment_countdown' && (
        <OrderCardExtension order={order} />
      )}
      <OrderCardActions order={order} onActionClick={onActionClick} />
      <OrderCardSuggestions suggestions={order.suggestions} onSuggestionClick={onSuggestionClick} />
    </div>
  );
};
