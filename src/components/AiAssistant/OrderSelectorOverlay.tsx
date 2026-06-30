import React, { useMemo, useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ORDER_LIST } from '../../mock';
import type { OrderListItem } from '../../types';
import { toStandardCategory, getDisplayCategory } from '../../types';
import { buildNoticeTags } from '../../redeemReminder';

interface OrderSelectorOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder: (order: OrderListItem) => void;
}

const ORDER_TABS = [
  { key: 'all', label: '全部' },
  { key: 'unpaid', label: '待支付' },
  { key: 'unredeemed', label: '待使用' },
  { key: 'unreviewed', label: '待评价' },
  { key: 'refunded', label: '退款' },
];

const OrderSelectorOverlay: React.FC<OrderSelectorOverlayProps> = ({ isOpen, onClose, onSelectOrder }) => {
  const [filter, setFilter] = useState('all');
  const [mounted, setMounted] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const filteredOrders = useMemo(() => {
    return ORDER_LIST.filter(order => {
      if (order.category === 'show') return false;
      const text = order.statusText;
      if (filter === 'all') return true;
      if (filter === 'unpaid') return text === '待支付';
      if (filter === 'unredeemed') {
        return ['待使用', '待预约', '预约确认中', '预约成功', '预订确认中', '预订成功'].includes(text);
      }
      if (filter === 'unreviewed') return text === '交易完成';
      if (filter === 'refunded') return ['退款成功', '退款申请中', '退款失败'].includes(text);
      return true;
    });
  }, [filter]);

  const handleOrderClick = (order: OrderListItem) => {
    onSelectOrder(order);
    onClose();
  };

  if (!mounted) return null;

  const overlay = (
    <div
      className={`ai-order-selector-mask ${isOpen ? 'open' : ''}`}
      onClick={onClose}
    >
      <div
        className="ai-order-selector-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ai-order-selector-header">
          <div className="ai-order-selector-title">选择订单</div>
          <button className="ai-order-selector-close" onClick={onClose} aria-label="关闭">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="ai-order-selector-tabs">
          {ORDER_TABS.map(tab => (
            <button
              key={tab.key}
              className={`ai-order-selector-tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => {
                setFilter(tab.key);
                if (listRef.current) {
                  listRef.current.scrollTop = 0;
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="ai-order-selector-list" ref={listRef}>
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <div
                key={order.orderId}
                className="oc-card-v2"
                onClick={() => handleOrderClick(order)}
              >
                <div className="oc-card-head-v2">
                  <div className="oc-card-merchant-v2">
                    {order.merchant}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                  </div>
                  {(() => {
                    const disp = getDisplayCategory(order.category);
                    return <span className={`uoc-cat-tag uoc-cat-${disp.colorKey}`}>{disp.label}</span>;
                  })()}
                  <div className={`oc-card-status-v2 status-${order.statusColor}`}>{order.statusText}</div>
                </div>
                <div className="oc-card-body-v2">
                  <div className="oc-card-thumb-v2">{order.thumbnail}</div>
                  <div className="oc-card-info-v2">
                    <div className="oc-card-info-top">
                      <div className="oc-card-title-v2">
                        <span className="oc-product-name">{order.product}</span>
                        {(() => {
                          const stdCat = toStandardCategory(order.category);
                          const typeLabel = stdCat === 'scenic' && order.scenicProductType
                            ? (order.scenicProductType === 'group_buy' ? '团购票' : order.scenicProductType === 'calendar_ticket' ? '日历票' : '预售券')
                            : stdCat === 'hotel' && order.hotelProductType
                              ? (order.hotelProductType === 'calendar_room' ? '日历房' : '预售券')
                              : stdCat === 'travel' && order.travelProductType
                                ? '预售券'
                                : '';
                          if (!typeLabel) return null;
                          return <span className="oc-product-type-tag">{typeLabel}</span>;
                        })()}
                      </div>
                      <div className="oc-card-price-v2">¥{(order.price / 100).toFixed(2)}</div>
                    </div>
                    <div className="oc-card-tags-row">
                      <div className="oc-card-tags-v2">
                        {(() => {
                          const defaultProductRules = {
                            validDate: '2026-06-25 至 2026-07-25',
                            notice: ['周一至周日可用', '过期自动退', '免预约'],
                            refundRule: '过期自动退',
                          };
                          const effectiveRules = order.productRules ?? defaultProductRules;
                          const tags = buildNoticeTags({ productRules: effectiveRules, category: order.category });
                          return tags.slice(0, 3).map((tag) => (
                            <span key={tag}>{tag}</span>
                          ));
                        })()}
                      </div>
                      <div className="oc-card-count-v2">共1件</div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="ai-order-selector-empty">暂无相关订单</div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(overlay, document.body);
};

export default OrderSelectorOverlay;
