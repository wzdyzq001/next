import React from 'react';
import type { OrderCardData } from './orderCardTypes';
import './orderCard.css';

interface OrderCardActionsProps {
  order: OrderCardData;
  onActionClick?: (actionLabel: string) => void;
}

export const OrderCardActions: React.FC<OrderCardActionsProps> = ({ order, onActionClick }) => {
  const hasPaymentCountdown = !!order.paymentCountdown || order.extension?.type === 'payment_countdown';
  const hasActions = order.actions.length > 0;

  if (!hasActions && !hasPaymentCountdown) {
    return null;
  }

  const getPaymentCountdownValue = () => {
    if (order.paymentCountdown) {
      return order.paymentCountdown;
    }
    if (order.extension?.type === 'payment_countdown') {
      return order.extension.info?.[0]?.value || '';
    }
    return '';
  };

  const renderButtonIcon = (label: string) => {
    if (label.startsWith('⏰')) {
      return (
        <svg className="oc-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="13" r="8"/>
          <path d="M12 9v4l2 2"/>
          <path d="M5 3 2 6"/>
          <path d="m22 6-3-3"/>
          <path d="M6.38 18.7 4 21"/>
          <path d="M20 21l-2.38-2.3"/>
        </svg>
      );
    }
    if (label.startsWith('🎫')) {
      return (
        <svg className="oc-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
          <path d="M13 5v2"/>
          <path d="M13 17v2"/>
          <path d="M13 11v2"/>
        </svg>
      );
    }
    return null;
  };

  const getButtonText = (label: string) => {
    if (label.startsWith('⏰') || label.startsWith('🎫')) {
      return label.slice(2);
    }
    return label;
  };

  const secondaryActions = order.actions.filter(a => a.type === 'secondary');
  const primaryActions = order.actions.filter(a => a.type === 'primary');
  const totalButtons = secondaryActions.length + primaryActions.length;
  const maxButtons = 3;
  const visibleSecondaryCount = totalButtons > maxButtons
    ? Math.max(0, maxButtons - primaryActions.length)
    : secondaryActions.length;
  const visibleSecondaryActions = secondaryActions.slice(secondaryActions.length - visibleSecondaryCount);

  return (
    <div className={`oc-card-actions ${hasPaymentCountdown ? 'with-countdown' : ''}`}>
      {hasPaymentCountdown && (
        <div className="oc-payment-countdown">
          <span className="oc-countdown-label">剩余</span>
          <span className="oc-countdown-value">{getPaymentCountdownValue()}</span>
        </div>
      )}
      <div className="oc-action-btns">
        {visibleSecondaryActions.map((action, i) => (
          <button
            key={`sec-${i}`}
            className={`oc-action-btn ${action.type}`}
            onClick={(e) => {
              e.stopPropagation();
              onActionClick?.(action.label);
            }}
          >
            {renderButtonIcon(action.label)}
            {getButtonText(action.label)}
          </button>
        ))}
        {order.urgeReason && (
          <span className="oc-urge-reason">{order.urgeReason}</span>
        )}
        {primaryActions.map((action, i) => (
          <button
            key={`pri-${i}`}
            className={`oc-action-btn ${action.type}`}
            onClick={(e) => {
              e.stopPropagation();
              onActionClick?.(action.label);
            }}
          >
            {renderButtonIcon(action.label)}
            {getButtonText(action.label)}
          </button>
        ))}
      </div>
    </div>
  );
};
