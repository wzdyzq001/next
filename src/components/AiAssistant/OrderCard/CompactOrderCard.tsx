import React, { useState } from 'react';
import type { OrderCardData } from './orderCardTypes';
import './orderCard.css';

interface CompactOrderCardProps {
  order: OrderCardData;
  onClick?: () => void;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}

const isImageUrl = (str: string): boolean => {
  return /^https?:\/\//i.test(str);
};

export const CompactOrderCard: React.FC<CompactOrderCardProps> = ({
  order,
  onClick,
  primaryActionLabel,
  onPrimaryAction,
}) => {
  const [imgError, setImgError] = useState(false);

  const primaryAction = order.actions.find(a => a.type === 'primary');
  const actionLabel = primaryActionLabel || (primaryAction
    ? primaryAction.label.replace(/^[⏰🎫]\s?/, '')
    : '');

  const renderThumbnail = () => {
    if (!order.thumbnail) return null;

    if (isImageUrl(order.thumbnail) && !imgError) {
      return (
        <img
          src={order.thumbnail}
          alt=""
          className="oc-compact-thumb-img"
          onError={() => setImgError(true)}
        />
      );
    }

    return <span className="oc-compact-thumb-emoji">{order.thumbnail}</span>;
  };

  return (
    <div className="oc-compact-card" onClick={onClick}>
      <div className="oc-compact-thumb">
        {renderThumbnail()}
      </div>
      <div className="oc-compact-info">
        <div className="oc-compact-name">{order.productName}</div>
        <div className="oc-compact-bottom">
          <span className="oc-compact-price">
            <span className="oc-price-symbol">¥</span>
            <span className="oc-price-num">{order.price.toFixed(2)}</span>
          </span>
          <span
            className={`oc-compact-status status-${order.statusColor}`}
          >
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
