import React, { useMemo, useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ORDER_LIST } from '../../mock';
import type { OrderListItem } from '../../types';
import { toStandardCategory, getDisplayCategory } from '../../types';
import { buildNoticeTags } from '../../redeemReminder';
import { inferMainStatusFromText, getMainStatusLabel, getMainStatusColor } from './orderStatusMapping';
import {
  inferFoodSubStatusFromText,
  getFoodSubStatusFulfillmentType,
  getFoodSubStatusLabel,
} from './orderStatusMapping/mappingUtils';

interface OrderSelectorOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder: (order: OrderListItem) => void;
  initialTab?: string;
}

const ORDER_TABS = [
  { key: 'all', label: '全部' },
  { key: 'unpaid', label: '待支付' },
  { key: 'unredeemed', label: '待使用' },
  { key: 'unreviewed', label: '待评价' },
  { key: 'refunded', label: '退款' },
];

const OrderSelectorOverlay: React.FC<OrderSelectorOverlayProps> = ({ isOpen, onClose, onSelectOrder, initialTab }) => {
  const [filter, setFilter] = useState(initialTab || 'all');
  const [mounted, setMounted] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen && initialTab) {
      setFilter(initialTab);
    }
  }, [isOpen, initialTab]);

  const filteredOrders = useMemo(() => {
    const list = ORDER_LIST.filter(order => {
      if (order.category === 'show') return false;
      if (order.category === 'transport') return false;
      const stdCategory = toStandardCategory(order.category) as any;
      const mainStatus = inferMainStatusFromText(order.statusText, stdCategory);
      if (filter === 'all') return true;
      if (filter === 'unpaid') return mainStatus === 'pending_pay';
      if (filter === 'unredeemed') {
        return mainStatus === 'unused';
      }
      if (filter === 'unreviewed') return mainStatus === 'redeemed';
      if (filter === 'refunded') return ['refunding', 'refund_success', 'refund_fail'].includes(mainStatus);
      return true;
    });

    if (filter === 'unreviewed') {
      const foodSelf: Array<{ order: OrderListItem; subStatus: string }> = [];
      const foodDelivery: Array<{ order: OrderListItem; subStatus: string }> = [];
      const foodVoucher: Array<{ order: OrderListItem; subStatus: string }> = [];
      const others: OrderListItem[] = [];

      for (const order of list) {
        const stdCat = toStandardCategory(order.category);
        if (stdCat !== 'food') {
          others.push(order);
          continue;
        }
        const subStatus = inferFoodSubStatusFromText(order.statusText, order.fulfillmentModes);
        if (!subStatus) {
          others.push(order);
          continue;
        }
        const fType = getFoodSubStatusFulfillmentType(subStatus as any);
        if (fType === 'self_order') {
          foodSelf.push({ order, subStatus: subStatus as string });
        } else if (fType === 'delivery') {
          foodDelivery.push({ order, subStatus: subStatus as string });
        } else if (fType === 'voucher') {
          foodVoucher.push({ order, subStatus: subStatus as string });
        } else {
          others.push(order);
        }
      }

      const SELF_ORDER = ['self_01_pending_accept', 'self_02_accepted', 'self_03_preparing', 'self_04_waiting_pickup', 'self_05_picked_up'];
      const DELIVERY_ORDER = ['delivery_01_pending_accept', 'delivery_02_accepted', 'delivery_03_preparing', 'delivery_04_waiting_rider', 'delivery_05_delivering', 'delivery_06_delivered'];

      const byNodeOrder = (a: { subStatus: string }, b: { subStatus: string }, orderRef: string[]) =>
        orderRef.indexOf(a.subStatus) - orderRef.indexOf(b.subStatus);

      foodSelf.sort((a, b) => byNodeOrder(a, b, SELF_ORDER));
      foodDelivery.sort((a, b) => byNodeOrder(a, b, DELIVERY_ORDER));

      return [...foodSelf.map(x => x.order), ...foodDelivery.map(x => x.order), ...foodVoucher.map(x => x.order), ...others];
    }

    return list;
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
            filteredOrders.map((order) => {
              const disp = getDisplayCategory(order.category);
              const stdCategory = toStandardCategory(order.category) as any;
              const mainStatus = inferMainStatusFromText(order.statusText, stdCategory);
              const mainStatusLabel = getMainStatusLabel(mainStatus);
              const mainStatusColor = getMainStatusColor(mainStatus);

              const isUnreviewed = filter === 'unreviewed';
              const isFood = stdCategory === 'food';
              const subStatus = isUnreviewed && isFood
                ? inferFoodSubStatusFromText(order.statusText, order.fulfillmentModes)
                : null;
              const fulfillmentType = subStatus
                ? getFoodSubStatusFulfillmentType(subStatus as any)
                : null;
              const subStatusLabel = subStatus ? getFoodSubStatusLabel(subStatus as any) : null;
              const fulfillmentLabel = fulfillmentType === 'self_order'
                ? '到店自提'
                : fulfillmentType === 'delivery'
                  ? '外卖配送'
                  : fulfillmentType === 'voucher'
                    ? '券码核销'
                    : null;

              const showSubStatus = isUnreviewed && isFood && fulfillmentLabel && subStatusLabel;

              return (
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
                    <span className={`uoc-cat-tag uoc-cat-${disp.colorKey}`}>{disp.label}</span>
                    {isUnreviewed && isFood && subStatusLabel ? (
                      <div className="oc-card-status-group">
                        <div className={`oc-card-status-v2 status-${mainStatusColor}`}>{mainStatusLabel}</div>
                      </div>
                    ) : (
                      <div className={`oc-card-status-v2 status-${mainStatusColor}`}>{mainStatusLabel}</div>
                    )}
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
                      {showSubStatus && (
                        <span className="oc-card-sub-status-line">
                          {fulfillmentLabel} · {subStatusLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
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
