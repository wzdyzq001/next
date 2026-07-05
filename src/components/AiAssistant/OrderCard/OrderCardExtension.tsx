import React, { useState } from 'react';
import type { OrderCardData } from './orderCardTypes';
import './orderCard.css';

interface OrderCardExtensionProps {
  order: OrderCardData;
  defaultExpanded?: boolean;
}

export const OrderCardExtension: React.FC<OrderCardExtensionProps> = ({ order, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState<string | null>(defaultExpanded ? order.id : null);
  const ext = order.extension;

  if (!ext || ext.type === 'payment_countdown') {
    return null;
  }

  const isDeliveryCompleted = ext.type === 'delivery_completed';
  const isPickupCompleted = ext.type === 'pickup_completed';
  const isExpanded = expanded === order.id;

  const renderProgressIcon = () => {
    if (ext.title.includes('配送')) {
      return (
        <svg className="oc-progress-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5.5" cy="17.5" r="2.5"/>
          <circle cx="18.5" cy="17.5" r="2.5"/>
          <path d="M15 17.5h-5V14h-3l3-7h4l1.5 5H18v4.5z"/>
          <path d="M8 10h4"/>
        </svg>
      );
    }
    if (ext.title.includes('取餐')) {
      return (
        <svg className="oc-progress-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 7h12l1 13H5L6 7z"/>
          <path d="M9 7a3 3 0 0 1 6 0"/>
          <path d="M6 11h12"/>
        </svg>
      );
    }
    return (
      <svg className="oc-progress-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="8"/>
        <path d="M12 9v4l2 2"/>
        <path d="M5 3 2 6"/>
        <path d="m22 6-3-3"/>
      </svg>
    );
  };

  const renderSteps = () => {
    if (!ext.steps) return null;
    return (
      <div className="oc-progress-steps">
        {ext.steps.map((step, i) => (
          <div key={i} className={`oc-step ${step.state}`}>
            <div className="oc-step-dot"></div>
            <div className="oc-step-label">{step.label}</div>
            {step.time && <div className="oc-step-time">{step.time}</div>}
            {i < ext.steps!.length - 1 && <div className="oc-step-line"></div>}
          </div>
        ))}
      </div>
    );
  };

  const renderInfoList = () => {
    if (!ext.info) return null;
    return (
      <div className="oc-info-list">
        {ext.info.map((item, i) => (
          <div key={i} className="oc-info-item">
            <span className="oc-info-label">{item.label}</span>
            <span className="oc-info-value">{item.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderHotelStay = () => {
    if (!ext.hotelInfo) return null;
    return (
      <div className="oc-hotel-extension">
        <div className="oc-hotel-stay-row">
          <span className="oc-hotel-stay-label">入住酒店</span>
          <span className="oc-hotel-stay-name">{ext.hotelInfo.hotelName}</span>
          <div className="oc-hotel-stay-actions">
            <button className="oc-hotel-icon-btn" title="导航">
              <svg className="oc-nav-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </button>
            <button className="oc-hotel-icon-btn" title="电话">
              <svg className="oc-hotel-phone-icon" viewBox="0 0 16 16" fill="none">
                <path d="M3.5 2.5L5.5 2L7 5.5L5.5 6.5C6 7.5 7 8.5 8 9.5C9 10.5 10 11 11 11.5L12 10L15 11.5V14C15 14.5 14.5 15 14 15C6 15 1.5 10.5 1.5 3C1.5 2.5 2 2.5 2.5 2.5Z" fill="#4e5969"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="oc-hotel-date-row">
          <span className="oc-hotel-date-label">入住</span>
          <span className="oc-hotel-date-value">{ext.hotelInfo.checkInDate}</span>
          <span className="oc-hotel-nights">{ext.hotelInfo.nights}晚</span>
          <span className="oc-hotel-date-label">离店</span>
          <span className="oc-hotel-date-value">{ext.hotelInfo.checkOutDate}</span>
        </div>
      </div>
    );
  };

  const renderScenicEntry = () => {
    const scenicName = ext.scenicInfo?.scenicName || order.storeName;
    const entryTime = ext.scenicInfo
      ? `${ext.scenicInfo.visitDate} ${ext.scenicInfo.entryTime}`
      : `${ext.info?.find((i) => i.label === '入园日期')?.value || ''} ${ext.info?.find((i) => i.label === '入园时间')?.value || ''}`.trim();

    return (
      <div className="oc-hotel-extension">
        <div className="oc-hotel-stay-row">
          <span className="oc-hotel-stay-label">景区名称</span>
          <span className="oc-hotel-stay-name">{scenicName}</span>
          <div className="oc-hotel-stay-actions">
            <button className="oc-hotel-icon-btn" title="导航">
              <svg className="oc-nav-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </button>
            <button className="oc-hotel-icon-btn" title="电话">
              <svg className="oc-hotel-phone-icon" viewBox="0 0 16 16" fill="none">
                <path d="M3.5 2.5L5.5 2L7 5.5L5.5 6.5C6 7.5 7 8.5 8 9.5C9 10.5 10 11 11 11.5L12 10L15 11.5V14C15 14.5 14.5 15 14 15C6 15 1.5 10.5 1.5 3C1.5 2.5 2 2.5 2.5 2.5Z" fill="#4e5969"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="oc-hotel-date-row">
          <span className="oc-hotel-date-label">入园时间</span>
          <span className="oc-hotel-date-value">{entryTime}</span>
        </div>
      </div>
    );
  };

  const renderRefundStatus = () => {
    const refundAmount = ext.info?.find((i) => i.label === '退款金额')?.value || '';
    const statusText = ext.type === 'refund' ? '商家审核中' : '已原路退回';
    return (
      <div className="oc-refund-status">
        <span className="oc-refund-status-text">{statusText}</span>
        <span className="oc-refund-status-amount">{refundAmount}</span>
      </div>
    );
  };

  const renderRiderInfo = () => {
    if (!ext.riderInfo) return null;
    return (
      <div className="oc-rider-info">
        <div className="oc-rider-left">
          <span className="oc-rider-avatar">🚴</span>
          <span className="oc-rider-name">{ext.riderInfo.name}</span>
        </div>
        {ext.riderInfo.phone && (
          <button
            className="oc-rider-phone-btn"
            title="联系骑手"
            onClick={() => {
              window.location.href = `tel:${ext.riderInfo!.phone}`;
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
              <path d="M3.5 2.5L5.5 2L7 5.5L5.5 6.5C6 7.5 7 8.5 8 9.5C9 10.5 10 11 11 11.5L12 10L15 11.5V14C15 14.5 14.5 15 14 15C6 15 1.5 10.5 1.5 3C1.5 2.5 2 2.5 2.5 2.5Z" fill="#4e5969"/>
            </svg>
          </button>
        )}
      </div>
    );
  };

  const renderPickupCode = () => {
    if (ext.hasPickupCode === false) {
      return (
        <div className="oc-pickup-no-code">
          <span className="oc-pickup-channel">
            {ext.channel === 'douyin' ? '抖音小程序核销' : '到店核销'}
          </span>
        </div>
      );
    }
    if (ext.pickupCode) {
      return (
        <div className="oc-pickup-with-progress">
          <div className="oc-pickup-simple">
            <span className="oc-pickup-code">{ext.pickupCode}</span>
            <span className="oc-pickup-time">{ext.pickupTime}</span>
          </div>
          {ext.steps && ext.steps.length > 0 && (
            <div className="oc-pickup-progress-steps">
              {renderSteps()}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="oc-card-extension">
      {isDeliveryCompleted ? (
        <div
          className="oc-delivery-completed"
          onClick={() => setExpanded(isExpanded ? null : order.id)}
        >
          <div className="oc-delivery-summary">
            <span className="oc-delivery-summary-text">{ext.summary}</span>
            <span className="oc-delivery-arrow">
              {isExpanded ? '∧' : '∨'}
            </span>
          </div>
          {isExpanded && ext.steps && (
            <div className="oc-delivery-detail">
              {renderSteps()}
              {ext.info && (
                <div className="oc-delivery-info">
                  {ext.info.map((item, i) => (
                    <div key={i} className="oc-info-item">
                      <span className="oc-info-label">{item.label}</span>
                      <span className="oc-info-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : isPickupCompleted ? (
        <div
          className={`oc-pickup-completed ${isExpanded ? 'expanded' : 'collapsed'}`}
          onClick={() => setExpanded(isExpanded ? null : order.id)}
        >
          <div className="oc-pickup-summary">
            <div className="oc-pickup-summary-left">
              {ext.pickupCode && (
                <span className="oc-pickup-summary-code">{ext.pickupCode}</span>
              )}
            </div>
            <div className="oc-pickup-summary-right">
              <span className="oc-pickup-summary-text">{ext.summary?.replace(/^取餐码\s+\S+\s*·\s*/, '')}</span>
              <span className="oc-pickup-arrow-icon">
                <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>
          </div>
          {isExpanded && (
            <div className="oc-pickup-detail">
              {ext.steps && renderSteps()}
              {ext.info && (
                <div className="oc-pickup-info">
                  {ext.info.map((item, i) => (
                    <div key={i} className="oc-info-item">
                      <span className="oc-info-label">{item.label}</span>
                      <span className="oc-info-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : ext.type === 'pickup_code' ? (
        renderPickupCode()
      ) : ext.type === 'hotel_stay' ? (
        renderHotelStay()
      ) : ext.type === 'scenic_entry' ? (
        renderScenicEntry()
      ) : ext.type === 'refund' || ext.type === 'refund_success' ? (
        renderRefundStatus()
      ) : ext.type === 'travel_info' ? (
        <>
          {ext.title && <div className="oc-extension-title">{ext.title}</div>}
          {renderInfoList()}
        </>
      ) : ext.type === 'progress' ? (
        <>
          <div className="oc-progress-header">
            <span className="oc-progress-title">
              {renderProgressIcon()}
              {ext.title}
            </span>
            {ext.estimatedTime && (
              <span className={`oc-progress-estimate ${ext.title.includes('取餐') || ext.title.includes('履约') ? 'orange' : 'blue'}`}>
                {ext.estimatedTime}
              </span>
            )}
          </div>
          {renderSteps()}
          {renderRiderInfo()}
          {renderInfoList()}
        </>
      ) : null}
    </div>
  );
};
