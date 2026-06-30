import React from 'react';
import type { OrderCardData } from './orderCardTypes';
import './orderCard.css';

interface CompactOrderCardProps {
  order: OrderCardData;
  onClick?: () => void;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}

export const CompactOrderCard: React.FC<CompactOrderCardProps> = ({
  order,
  onClick,
  primaryActionLabel,
  onPrimaryAction,
}) => {
  const primaryAction = order.actions.find(a => a.type === 'primary');
  const actionLabel = primaryActionLabel || (primaryAction
    ? primaryAction.label.replace(/^[⏰🎫]\s?/, '')
    : '');

  return (
    <div className="oc-compact-card" onClick={onClick}>
      <div className="oc-compact-thumb">{order.thumbnail}</div>
      <div className="oc-compact-info">
        <div className="oc-compact-name">{order.productName}</div>
        <div className="oc-compact-bottom">
          <span className="oc-compact-price">
            <span className="oc-price-symbol">¥</span>
            <span className="oc-price-num">{order.price.toFixed(2)}</span>
          </span>
          <span className={`oc-compact-status status-${order.statusColor}`}>
            {order.statusText}
          </span>
        </div>
      </div>
      {actionLabel && onPrimaryAction && (
        <button
          className="oc-compact-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            onPrimaryAction();
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
