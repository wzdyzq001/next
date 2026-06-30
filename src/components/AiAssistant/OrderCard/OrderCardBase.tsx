import React from 'react';
import type { OrderCardData } from './orderCardTypes';
import './orderCard.css';

interface OrderCardBaseProps {
  order: OrderCardData;
}

export const OrderCardBase: React.FC<OrderCardBaseProps> = ({ order }) => {
  const showStoreLine = !order.hideStoreLine &&
    order.storeName &&
    !order.extension?.hotelInfo &&
    !order.extension?.scenicInfo &&
    order.extension?.type !== 'scenic_entry' &&
    order.extension?.type !== 'hotel_stay';

  return (
    <div className="oc-card-base">
      <div className="oc-card-thumb">{order.thumbnail}</div>
      <div className="oc-card-info">
        <div className="oc-card-title-row">
          <div className="oc-card-title-main">
            <div className="oc-card-name">{order.productName}</div>
            <div className="oc-card-tags">
              {order.tags.map((tag, i) => (
                <span key={i} className="oc-tag">
                  {i > 0 && <span className="oc-tag-sep">·</span>}
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="oc-card-right">
            <div className={`oc-card-status status-${order.statusColor}`}>
              {order.statusText}
            </div>
            <div className="oc-card-price">
              <span className="oc-price-symbol">¥</span>
              <span className="oc-price-num">{order.price.toFixed(2)}</span>
            </div>
          </div>
        </div>
        {showStoreLine && (
          <div className="oc-card-store">
            {order.category !== 'travel_agency' && (
              <span className="oc-store-distance">{order.distance}</span>
            )}
            <span className="oc-store-name">{order.storeName}</span>
            <div className="oc-store-actions">
              {order.category !== 'travel_agency' && (
                <button className="oc-store-icon-btn" title="导航">
                  <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                    <path d="M2.5 12L13.5 2.5L8.5 13.5L6.8 10.7L4 11.5L2.5 12Z" fill="#86909c"/>
                  </svg>
                </button>
              )}
              <button className="oc-store-icon-btn" title="电话">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                  <path d="M3.5 2.5L5.5 2L7 5.5L5.5 6.5C6 7.5 7 8.5 8 9.5C9 10.5 10 11 11 11.5L12 10L15 11.5V14C15 14.5 14.5 15 14 15C6 15 1.5 10.5 1.5 3C1.5 2.5 2 2.5 2.5 2.5Z" fill="#86909c"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
