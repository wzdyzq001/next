import React, { useState } from 'react';
import type { OrderData, OrderStatus, OrderCategory } from './types';
import { toStandardCategory, getDisplayCategory } from './types';
import { buildNoticeTags } from './redeemReminder';
import { ORDER_LIST } from './mock';

export type StatusColor = 'red' | 'green' | 'gray' | 'blue' | 'orange';

export interface UnifiedOrderCardProps {
  order: OrderData;
  statusLabel?: string;
  statusColor?: StatusColor;
  extension?: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
}

function formatPrice(price: number): string {
  return `¥${(price / 100).toFixed(2)}`;
}

function getValidityText(validDate?: string): string {
  if (!validDate) return '';
  const parts = validDate.split(/\s*(?:至|到|~|—|–)\s*/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : validDate;
}

function getStatusColor(status: OrderStatus): StatusColor {
  switch (status) {
    case 'pending_payment':
      return 'orange';
    case 'unredeemed':
      return 'red';
    case 'redeemed':
      return 'green';
    case 'canceled':
    case 'refunded':
      return 'gray';
    case 'refunding':
      return 'blue';
    case 'refund_failed':
      return 'orange';
    default:
      return 'gray';
  }
}

function getStatusLabel(order: OrderData): string {
  const status = order.status;
  const stdCategory = toStandardCategory(order.category);
  
  if (stdCategory === 'hotel') {
    switch (status) {
      case 'pending_payment': return '待支付';
      case 'unredeemed': return '待预约';
      case 'redeemed': return '交易完成';
      case 'canceled': return '订单取消';
      case 'refunding': return '退款申请中';
      case 'refunded': return '退款成功';
      case 'refund_failed': return '退款失败';
    }
  }
  
  switch (status) {
    case 'pending_payment': return '待支付';
    case 'unredeemed': return '待使用';
    case 'redeemed': return '交易完成';
    case 'canceled': return '订单取消';
    case 'refunding': return '退款申请中';
    case 'refunded': return '退款成功';
    case 'refund_failed': return '退款失败';
  }
}

function isImageSource(src: string | undefined): boolean {
  if (!src) return false;
  return src.startsWith('http') || src.startsWith('data:');
}

export function UnifiedOrderCard({
  order,
  statusLabel: customStatusLabel,
  statusColor: customStatusColor,
  extension,
  actions,
  onClick,
}: UnifiedOrderCardProps) {
  const listItem = ORDER_LIST.find(item => item.orderId === order.orderId);
  const thumb = listItem?.thumbnail ?? '🎫';
  const productName = order.itemSummary;
  const price = listItem?.price ?? 0;
  const status = order.status;
  const statusColor = customStatusColor ?? getStatusColor(status);
  const statusLabel = customStatusLabel ?? getStatusLabel(order);
  const noticeTags = buildNoticeTags(order);
  const merchant = order.store ?? order.storeInfo?.name ?? '';
  const storeInfo = order.storeInfo;
  const applicableStoreCount = order.productRules?.applicableStoreCount ?? 1;
  const category = order.category ?? 'food';
  const stdCategory = toStandardCategory(category);
  const displayCat = getDisplayCategory(category);
  const categoryLabel = displayCat.label;
  const categoryColorClass = `uoc-cat-${displayCat.colorKey}`;
  const validityText = getValidityText(order.productRules?.validDate);
  const showValidity = !!validityText && (status === 'unredeemed' || status === 'redeemed');

  const hasImage = isImageSource(thumb.startsWith('http') ? thumb : undefined);

  const foodSubOrder = order.foodSubOrder;
  const isFulfillmentInProgress = foodSubOrder &&
    foodSubOrder.status !== 'picked' &&
    foodSubOrder.status !== 'delivered';

  const isFoodFulfillment = !!foodSubOrder;
  const showStoreEtc = !isFoodFulfillment && applicableStoreCount > 1;
  const hotelInfo = order.hotelInfo;
  const scenicInfo = order.scenicInfo;
  const isHotelWithStayInfo = !!hotelInfo && (
    hotelInfo.hotelSubStatus === 'booking_confirming' ||
    hotelInfo.hotelSubStatus === 'booking_confirmed' ||
    hotelInfo.hotelSubStatus === 'checked_in' ||
    (hotelInfo.productType === 'calendar_room' && hotelInfo.hotelSubStatus === 'pending_payment')
  );
  const isScenicWithVisitInfo = !!scenicInfo && (
    scenicInfo.senicSubStatus === 'booking_confirming' ||
    scenicInfo.senicSubStatus === 'booking_confirmed' ||
    scenicInfo.senicSubStatus === 'visited' ||
    scenicInfo.productType === 'calendar_ticket'
  );
  const showStoreRow = !isHotelWithStayInfo && !isScenicWithVisitInfo;

  const storeIcons = (() => {
    if (stdCategory === 'food') {
      if (foodSubOrder?.type === 'self_order') {
        return 'both';
      }
      if (foodSubOrder?.type === 'delivery') {
        return 'phone';
      }
    }
    return 'none';
  })();

  return (
    <div
      className="unified-order-card unified-order-card-v2"
      onClick={onClick}
    >
      <div className="uoc-scan-line" aria-hidden="true" />

      <div className="uoc-base">
        <div className="uoc-thumb-wrap">
          {hasImage ? (
            <div
              className="uoc-thumb uoc-thumb-img"
              style={{ backgroundImage: `url(${thumb})` }}
            />
          ) : (
            <div className="uoc-thumb uoc-thumb-emoji">{thumb}</div>
          )}
          {!isFulfillmentInProgress && (
            <span className={`uoc-status-badge uoc-status-${statusColor}`}>
              {statusLabel}
            </span>
          )}
        </div>

        <div className="uoc-info">
          <div className="uoc-row uoc-row-1">
            <span className="uoc-product-name">
              <span className={`uoc-cat-tag ${categoryColorClass}`}>{categoryLabel}</span>
              {productName}
            </span>
            <span className="uoc-price">{formatPrice(price)}</span>
          </div>

          {noticeTags.length > 0 && (
            <div className="uoc-row uoc-row-2">
              <div className="uoc-tags">
                {noticeTags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="uoc-tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {showStoreRow && (
            <div className="uoc-row uoc-row-3">
              {storeInfo?.distance && (
                <span className="uoc-distance">{storeInfo.distance}</span>
              )}
              <span className="uoc-store-name">{merchant}</span>
              {showStoreEtc && (
                <span className="uoc-store-etc">等</span>
              )}
              {storeIcons !== 'none' && (
                <div className="uoc-store-icons">
                  {storeIcons === 'both' && (
                    <button className="uoc-store-icon-btn" title="导航">
                      <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    </button>
                  )}
                  {(storeIcons === 'both' || storeIcons === 'phone') && (
                    <button className="uoc-store-icon-btn" title="电话">
                      📞
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {showValidity && showStoreRow && (
            <div className="uoc-row uoc-validity">
              <span className="uoc-validity-text">有效期至 {validityText}</span>
            </div>
          )}
        </div>
      </div>

      {extension && (
        <div className="uoc-extension">
          {extension}
        </div>
      )}

      {actions && (
        <div className="uoc-actions">
          {actions}
        </div>
      )}
    </div>
  );
}

export interface CardDemoItem {
  title: string;
  order: OrderData;
  extension?: React.ReactNode;
  actions?: React.ReactNode;
}

export interface FulfillmentNode {
  label: string;
  time: string;
  status: 'done' | 'current' | 'pending';
  description?: string;
}

export function FoodUnredeemedActions({
  supportedMethods,
  showUsageReminder = false,
  showReservation = false,
}: {
  supportedMethods: Array<'self_order' | 'voucher' | 'delivery'>;
  showUsageReminder?: boolean;
  showReservation?: boolean;
}) {
  const hasVoucher = supportedMethods.includes('voucher');
  const hasSelfOrder = supportedMethods.includes('self_order');
  const hasDelivery = supportedMethods.includes('delivery');

  const buttons: JSX.Element[] = [];

  if (hasVoucher) {
    buttons.push(
      <button key="voucher" className="food-action-btn food-action-voucher">
        查看券码
      </button>
    );
  }
  if (hasSelfOrder) {
    buttons.push(
      <button key="self_order" className="food-action-btn food-action-red">
        立即点单
      </button>
    );
  }
  if (hasDelivery) {
    buttons.push(
      <button key="delivery" className="food-action-btn food-action-red">
        立即配送
      </button>
    );
  }

  const guideButtons: JSX.Element[] = [];
  if (showUsageReminder) {
    guideButtons.push(
      <button key="reminder" className="chip action-chip guide-chip">
        <span className="guide-chip-star">✦</span>
        <span className="guide-chip-text">订单使用提醒</span>
        <span className="guide-chip-arrow">›</span>
      </button>
    );
  }
  const canShowReservation = showReservation && !hasSelfOrder && !hasDelivery;
  if (canShowReservation) {
    guideButtons.push(
      <button key="reservation" className="chip action-chip guide-chip">
        <span className="guide-chip-star">✦</span>
        <span className="guide-chip-text">提前预约免排队</span>
        <span className="guide-chip-arrow">›</span>
      </button>
    );
  }

  return (
    <div className="food-unredeemed-actions-wrap">
      <div className="food-action-row">{buttons}</div>
      {guideButtons.length > 0 && (
        <div className="food-guide-row">{guideButtons}</div>
      )}
    </div>
  );
}

export function PickupCodeDisplay({ pickupCode }: { pickupCode?: string }) {
  if (pickupCode) {
    return (
      <div className="pickup-code-display">
        <span className="pickup-code-label">取餐码</span>
        <span className="pickup-code-value">{pickupCode}</span>
      </div>
    );
  }
  return (
    <button className="chip action-chip action-chip-primary">查看取餐码</button>
  );
}

export function RefundingInfo({
  statusText = '商家审核中',
  amount,
}: {
  statusText?: string;
  amount: string;
}) {
  return (
    <div className="uoc-refunding-info">
      <div className="refunding-left">
        <span className="refunding-status">{statusText}</span>
      </div>
      <span className="refunding-amount">{amount}</span>
    </div>
  );
}

export function RefundSuccessInfo({ amount }: { amount: string }) {
  return (
    <div className="uoc-refund-success-info">
      <span className="refund-success-status">已原路退回</span>
      <span className="refund-success-amount">{amount}</span>
    </div>
  );
}

export function HotelStayInfo({
  hotelName,
  showIcons = true,
  label = '入住酒店',
}: {
  hotelName: string;
  showIcons?: boolean;
  label?: string;
}) {
  return (
    <div className="hotel-stay-info">
      <span className="hotel-stay-label">{label}</span>
      <span className="hotel-stay-name">{hotelName}</span>
      {showIcons && (
        <div className="hotel-stay-actions">
          <button className="hotel-icon-btn" title="导航">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
          <button className="hotel-icon-btn" title="电话">
            📞
          </button>
        </div>
      )}
    </div>
  );
}

export function FulfillmentTimeline({
  nodes,
  type = 'in_store',
}: {
  nodes: FulfillmentNode[];
  type?: 'in_store' | 'delivery';
}) {
  const currentNode = nodes.find(n => n.status === 'current');

  return (
    <div className={`fulfillment-timeline fulfillment-${type}`}>
      <div className="fulfillment-timeline-header">
        <span className="fulfillment-timeline-title">
          {type === 'delivery' ? '配送进度' : '取餐进度'}
        </span>
        {currentNode && (
          <span className="fulfillment-timeline-estimate">
            预计 {currentNode.description}
          </span>
        )}
      </div>
      <div className="fulfillment-timeline-track">
        <div className="fulfillment-track-bg" />
        <div
          className="fulfillment-track-fill"
          style={{
            width: `${Math.max(0, (nodes.filter(n => n.status === 'done').length - 1)) / (nodes.length - 1) * 100}%`
          }}
        />
        <div className="fulfillment-track-nodes">
          {nodes.map((node, idx) => (
            <div
              key={idx}
              className={`fulfillment-track-node fulfillment-node-${node.status}`}
            >
              <div className="fulfillment-node-dot">
                {node.status === 'done' && <span className="dot-check">✓</span>}
                {node.status === 'current' && <span className="dot-pulse" />}
              </div>
              <div className="fulfillment-node-label">{node.label}</div>
              {node.time && (
                <div className="fulfillment-node-time">{node.time}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CollapsibleTimeline({
  nodes,
  type = 'in_store',
  collapsedTitle,
}: {
  nodes: FulfillmentNode[];
  type?: 'in_store' | 'delivery';
  collapsedTitle: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="collapsible-timeline">
      <div
        className="collapsed-timeline-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="collapsed-timeline-text">{collapsedTitle}</span>
        <span className={`collapsed-timeline-arrow ${expanded ? 'up' : 'down'}`}>
          ▾
        </span>
      </div>
      {expanded && (
        <FulfillmentTimeline nodes={nodes} type={type} />
      )}
    </div>
  );
}

function DeliveryRiderInfo({ riderName, riderPhone, eta }: { riderName: string; riderPhone: string; eta: string }) {
  return (
    <div className="delivery-rider-info">
      <div className="rider-avatar">🛵</div>
      <div className="rider-details">
        <div className="rider-name">{riderName}</div>
        <div className="rider-eta">预计 {eta} 送达</div>
      </div>
      <button className="rider-call-btn" title={`联系骑手 ${riderPhone}`}>📞</button>
    </div>
  );
}

function createDemoOrder(
  id: string,
  category: OrderCategory,
  status: OrderStatus,
  itemSummary: string,
  price: number,
  store: string,
  thumbnail: string,
  extra: Partial<OrderData> = {}
): OrderData {
  const baseOrder: OrderData = {
    orderId: id,
    channel: 'miniprogram_other',
    status,
    redeemMethod: 'none',
    supportedRedeemMethods: ['voucher'],
    category,
    store,
    storeAddress: '门店地址以订单详情页为准',
    itemSummary,
    orderDetailUrl: '#/orders/' + id,
    productRules: {
      validDate: '2026-06-17 至 2026-07-30',
      notice: [],
      packageDetails: [],
      refundRule: '随时退 · 过期自动退',
      applicableStoreCount: 1,
    },
    storeInfo: {
      name: store,
      address: '门店地址以订单详情页为准',
      distance: '1.2km',
      phone: '400-000-8888',
      businessHours: '10:00 - 22:00',
      status: 'open',
    },
    ...extra,
  };

  if (!ORDER_LIST.find(o => o.orderId === id)) {
    const scenicSubStatus = extra.scenicInfo?.senicSubStatus;
    const hotelSubStatus = extra.hotelInfo?.hotelSubStatus;
    let mappedStatusText: string;
    if (category === 'scenic' && extra.scenicInfo?.productType) {
      const isCalOrPresale = extra.scenicInfo.productType === 'calendar_ticket' || extra.scenicInfo.productType === 'presale_voucher';
      if (status === 'pending_payment') mappedStatusText = '待支付';
      else if (status === 'redeemed') mappedStatusText = '交易完成';
      else if (status === 'canceled') mappedStatusText = '订单取消';
      else if (status === 'refunding') mappedStatusText = '退款申请中';
      else if (status === 'refunded') mappedStatusText = '退款成功';
      else if (status === 'refund_failed') mappedStatusText = '退款失败';
      else if (isCalOrPresale && scenicSubStatus === 'booking_confirming') mappedStatusText = extra.scenicInfo.productType === 'calendar_ticket' ? '预订确认中' : '预约确认中';
      else if (isCalOrPresale && scenicSubStatus === 'booking_confirmed') mappedStatusText = extra.scenicInfo.productType === 'calendar_ticket' ? '预订成功' : '预约成功';
      else if (isCalOrPresale && scenicSubStatus === 'visited') mappedStatusText = '已使用';
      else if (isCalOrPresale && scenicSubStatus === 'unredeemed') mappedStatusText = '待预约';
      else mappedStatusText = '待使用';
    } else if (category === 'hotel' && extra.hotelInfo?.productType) {
      const isCal = extra.hotelInfo.productType === 'calendar_room';
      if (status === 'pending_payment') mappedStatusText = '待支付';
      else if (status === 'redeemed') mappedStatusText = '交易完成';
      else if (status === 'canceled') mappedStatusText = '订单取消';
      else if (status === 'refunding') mappedStatusText = '退款申请中';
      else if (status === 'refunded') mappedStatusText = '退款成功';
      else if (status === 'refund_failed') mappedStatusText = '退款失败';
      else if (isCal && hotelSubStatus === 'booking_confirming') mappedStatusText = '预订确认中';
      else if (isCal && hotelSubStatus === 'booking_confirmed') mappedStatusText = '预订成功';
      else if (isCal && hotelSubStatus === 'checked_in') mappedStatusText = '已入住';
      else if (isCal && hotelSubStatus === 'unredeemed') mappedStatusText = '待预约';
      else mappedStatusText = '待使用';
    } else {
      mappedStatusText = status === 'unredeemed' ? '待使用' :
        status === 'pending_payment' ? '待支付' :
        status === 'redeemed' ? '交易完成' :
        status === 'canceled' ? '订单取消' :
        status === 'refunding' ? '退款申请中' :
        status === 'refunded' ? '退款成功' : '退款失败';
    }

    ORDER_LIST.unshift({
      orderId: id,
      merchant: store,
      product: itemSummary,
      price,
      statusText: mappedStatusText,
      statusColor: 'orange',
      category,
      scenicProductType: extra.scenicInfo?.productType,
      hotelProductType: extra.hotelInfo?.productType,
      orderTime: '2026-06-20 10:00:00',
      thumbnail,
      totalQuantity: extra.scenicInfo?.ticketCount ?? extra.hotelInfo?.roomCount ?? 1,
    });
  }

  return baseOrder;
}

export function buildFoodDemoOrders(): CardDemoItem[] {
  const inStoreNodes: Record<string, FulfillmentNode[]> = {
    merchant_pending: [
      { label: '下单成功', time: '10:02', status: 'done' },
      { label: '商家确认中', time: '', status: 'current', description: '1分钟内确认' },
      { label: '制作中', time: '', status: 'pending' },
      { label: '待取餐', time: '', status: 'pending' },
      { label: '已完成', time: '', status: 'pending' },
    ],
    merchant_making: [
      { label: '下单成功', time: '10:02', status: 'done' },
      { label: '商家已确认', time: '10:03', status: 'done' },
      { label: '制作中', time: '10:05', status: 'current', description: '8分钟后可取' },
      { label: '待取餐', time: '', status: 'pending' },
      { label: '已完成', time: '', status: 'pending' },
    ],
    ready_for_pickup: [
      { label: '下单成功', time: '10:02', status: 'done' },
      { label: '商家已确认', time: '10:03', status: 'done' },
      { label: '制作完成', time: '10:13', status: 'done' },
      { label: '待取餐', time: '10:13', status: 'current', description: '请尽快取餐' },
      { label: '已完成', time: '', status: 'pending' },
    ],
    picked: [
      { label: '下单成功', time: '10:02', status: 'done' },
      { label: '商家已确认', time: '10:03', status: 'done' },
      { label: '制作完成', time: '10:13', status: 'done' },
      { label: '已取餐', time: '10:18', status: 'done' },
      { label: '交易完成', time: '10:18', status: 'done' },
    ],
  };

  const deliveryNodes: Record<string, FulfillmentNode[]> = {
    merchant_pending: [
      { label: '下单成功', time: '11:20', status: 'done' },
      { label: '商家接单中', time: '', status: 'current', description: '2分钟内接单' },
      { label: '骑手取餐', time: '', status: 'pending' },
      { label: '配送中', time: '', status: 'pending' },
      { label: '已送达', time: '', status: 'pending' },
    ],
    merchant_making: [
      { label: '下单成功', time: '11:20', status: 'done' },
      { label: '商家已接单', time: '11:21', status: 'done' },
      { label: '商家制作中', time: '11:22', status: 'current', description: '12分钟后出餐' },
      { label: '配送中', time: '', status: 'pending' },
      { label: '已送达', time: '', status: 'pending' },
    ],
    delivering: [
      { label: '下单成功', time: '11:20', status: 'done' },
      { label: '商家已接单', time: '11:21', status: 'done' },
      { label: '骑手已取餐', time: '11:35', status: 'done' },
      { label: '配送中', time: '11:36', status: 'current', description: '约15分钟送达' },
      { label: '已送达', time: '', status: 'pending' },
    ],
    delivered: [
      { label: '下单成功', time: '11:20', status: 'done' },
      { label: '商家已接单', time: '11:21', status: 'done' },
      { label: '骑手已取餐', time: '11:35', status: 'done' },
      { label: '已送达', time: '11:52', status: 'done' },
      { label: '交易完成', time: '11:52', status: 'done' },
    ],
  };

  return [
    // ---------- 点单核销 ----------
    {
      title: '点单核销 · 待确认',
      order: createDemoOrder('DEMO_FOOD_INSTORE_01', 'food', 'unredeemed',
        '燕麦拿铁 (热) + 抹茶可颂', 3800, '瑞幸咖啡(海岸城店)', '☕',
        {
          storeInfo: { name: '瑞幸咖啡(海岸城店)', address: '深圳市南山区文心五路', distance: '850m', businessHours: '08:00 - 22:00', status: 'open' },
          redeemMethod: 'self_order',
          foodSubOrder: {
            type: 'self_order',
            status: 'merchant_pending',
            estimatedReadyTime: '1分钟内',
          },
        }
      ),
      extension: (
        <FulfillmentTimeline nodes={inStoreNodes.merchant_pending} type="in_store" />
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">查看取餐信息</button>
      ),
    },
    {
      title: '点单核销 · 制作中（有取餐码）',
      order: createDemoOrder('DEMO_FOOD_INSTORE_02', 'food', 'unredeemed',
        '招牌水果茶 (大杯) + 葡萄慕斯', 4200, '喜茶(万象天地店)', '🧋',
        {
          storeInfo: { name: '喜茶(万象天地店)', address: '深圳市南山区深南大道', distance: '1.2km', businessHours: '10:00 - 22:30', status: 'open' },
          redeemMethod: 'self_order',
          foodSubOrder: {
            type: 'self_order',
            status: 'merchant_making',
            estimatedReadyTime: '8分钟',
            pickupCode: 'A086',
          },
        }
      ),
      extension: (
        <FulfillmentTimeline nodes={inStoreNodes.merchant_making} type="in_store" />
      ),
      actions: (
        <PickupCodeDisplay pickupCode="A086" />
      ),
    },
    {
      title: '点单核销 · 制作中（无取餐码）',
      order: createDemoOrder('DEMO_FOOD_INSTORE_02B', 'food', 'unredeemed',
        '杨枝甘露 + 提拉米苏', 4600, '奈雪的茶(海岸城店)', '🍰',
        {
          storeInfo: { name: '奈雪的茶(海岸城店)', address: '深圳市南山区文心五路', distance: '900m', businessHours: '10:00 - 22:00', status: 'open' },
          redeemMethod: 'self_order',
          foodSubOrder: {
            type: 'self_order',
            status: 'merchant_making',
            estimatedReadyTime: '10分钟',
          },
        }
      ),
      extension: (
        <FulfillmentTimeline nodes={inStoreNodes.merchant_making} type="in_store" />
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">帮我加急</button>
      ),
    },
    {
      title: '点单核销 · 制作中（无进度信息）',
      order: createDemoOrder('DEMO_FOOD_INSTORE_02C', 'food', 'unredeemed',
        '芒果班戟 + 冻柠茶', 3800, '太兴餐厅(万象城店)', '🍵',
        {
          storeInfo: { name: '太兴餐厅(万象城店)', address: '深圳市罗湖区宝安南路', distance: '4.2km', businessHours: '10:00 - 22:00', status: 'open' },
          redeemMethod: 'self_order',
          foodSubOrder: {
            type: 'self_order',
            status: 'merchant_making',
          },
        }
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">查看取餐信息</button>
      ),
    },
    {
      title: '点单核销 · 待取餐（有取餐码）',
      order: createDemoOrder('DEMO_FOOD_INSTORE_03', 'food', 'unredeemed',
        '板烧鸡腿堡套餐 + 中可乐', 3600, '麦当劳(科技园店)', '🍔',
        {
          storeInfo: { name: '麦当劳(科技园店)', address: '深圳市南山区高新南一道', distance: '500m', businessHours: '06:00 - 24:00', status: 'open' },
          redeemMethod: 'self_order',
          foodSubOrder: {
            type: 'self_order',
            status: 'ready_for_pickup',
            estimatedReadyTime: '已出餐',
            pickupCode: 'M128',
          },
        }
      ),
      extension: (
        <FulfillmentTimeline nodes={inStoreNodes.ready_for_pickup} type="in_store" />
      ),
      actions: (
        <PickupCodeDisplay pickupCode="M128" />
      ),
    },
    {
      title: '点单核销 · 待取餐（无取餐码）',
      order: createDemoOrder('DEMO_FOOD_INSTORE_03B', 'food', 'unredeemed',
        '香辣鸡腿堡套餐 + 薯条', 3400, '肯德基(益田店)', '🍗',
        {
          storeInfo: { name: '肯德基(益田店)', address: '深圳市南山区益田假日广场', distance: '3.1km', businessHours: '06:00 - 24:00', status: 'open' },
          redeemMethod: 'self_order',
          foodSubOrder: {
            type: 'self_order',
            status: 'ready_for_pickup',
            estimatedReadyTime: '已出餐',
          },
        }
      ),
      extension: (
        <FulfillmentTimeline nodes={inStoreNodes.ready_for_pickup} type="in_store" />
      ),
      actions: (
        <PickupCodeDisplay pickupCode={undefined} />
      ),
    },
    {
      title: '点单核销 · 待取餐（无进度信息）',
      order: createDemoOrder('DEMO_FOOD_INSTORE_03C', 'food', 'unredeemed',
        '咖喱牛腩饭套餐', 4200, '大家乐(华强北店)', '🍛',
        {
          storeInfo: { name: '大家乐(华强北店)', address: '深圳市福田区华强北路', distance: '5.6km', businessHours: '07:00 - 22:00', status: 'open' },
          redeemMethod: 'self_order',
          foodSubOrder: {
            type: 'self_order',
            status: 'ready_for_pickup',
          },
        }
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">查看取餐信息</button>
      ),
    },
    {
      title: '点单核销 · 待取餐（有取餐码，无进度）',
      order: createDemoOrder('DEMO_FOOD_INSTORE_03D', 'food', 'unredeemed',
        '经典港式奶茶 + 菠萝油', 2800, '太兴烧腊(益田店)', '🥤',
        {
          storeInfo: { name: '太兴烧腊(益田店)', address: '深圳市南山区益田假日广场', distance: '3.1km', businessHours: '08:00 - 22:00', status: 'open' },
          redeemMethod: 'self_order',
          foodSubOrder: {
            type: 'self_order',
            status: 'ready_for_pickup',
            pickupCode: 'A086',
          },
        }
      ),
      actions: (
        <PickupCodeDisplay pickupCode="A086" />
      ),
    },
    {
      title: '点单核销 · 已完成',
      order: createDemoOrder('DEMO_FOOD_INSTORE_04', 'food', 'redeemed',
        '香辣鸡腿堡套餐', 3200, '肯德基(益田店)', '🍗',
        {
          storeInfo: { name: '肯德基(益田店)', address: '深圳市南山区益田假日广场', distance: '3.1km', businessHours: '06:00 - 24:00', status: 'open' },
          redeemMethod: 'self_order',
          foodSubOrder: {
            type: 'self_order',
            status: 'picked',
            estimatedReadyTime: '',
          },
        }
      ),
      extension: (
        <CollapsibleTimeline nodes={inStoreNodes.picked} type="in_store" collapsedTitle="已取餐" />
      ),
      actions: (
        <button className="chip action-chip">再来一单</button>
      ),
    },
    // ---------- 配送核销 ----------
    {
      title: '配送核销 · 待接单',
      order: createDemoOrder('DEMO_FOOD_DELIVERY_01', 'food', 'unredeemed',
        '招牌酸菜鱼 + 米饭2份', 8800, '太二酸菜鱼(海岸城店)', '🐟',
        {
          storeInfo: { name: '太二酸菜鱼(海岸城店)', address: '深圳市南山区文心三路', distance: '1.5km', businessHours: '11:00 - 21:30', status: 'open' },
          redeemMethod: 'delivery',
          foodSubOrder: {
            type: 'delivery',
            status: 'merchant_pending',
            estimatedReadyTime: '2分钟',
          },
        }
      ),
      extension: (
        <FulfillmentTimeline nodes={deliveryNodes.merchant_pending} type="delivery" />
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">帮我加急</button>
      ),
    },
    {
      title: '配送核销 · 制作中',
      order: createDemoOrder('DEMO_FOOD_DELIVERY_02', 'food', 'unredeemed',
        '红烧牛肉饭 + 紫菜蛋花汤', 3800, '真功夫(南山店)', '🍱',
        {
          storeInfo: { name: '真功夫(南山店)', address: '深圳市南山区南山大道', distance: '2.0km', businessHours: '07:00 - 22:00', status: 'open' },
          redeemMethod: 'delivery',
          foodSubOrder: {
            type: 'delivery',
            status: 'merchant_making',
            estimatedReadyTime: '12分钟出餐',
          },
        }
      ),
      extension: (
        <FulfillmentTimeline nodes={deliveryNodes.merchant_making} type="delivery" />
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">帮我加急</button>
      ),
    },
    {
      title: '配送核销 · 配送中',
      order: createDemoOrder('DEMO_FOOD_DELIVERY_03', 'food', 'unredeemed',
        '麻辣香锅双人套餐', 6800, '川味麻辣香锅(科技园店)', '🌶️',
        {
          storeInfo: { name: '川味麻辣香锅(科技园店)', address: '深圳市南山区科苑路', distance: '2.8km', businessHours: '10:30 - 22:00', status: 'open' },
          redeemMethod: 'delivery',
          foodSubOrder: {
            type: 'delivery',
            status: 'delivering',
            estimatedReadyTime: '约15分钟',
          },
        }
      ),
      extension: (
        <>
          <FulfillmentTimeline nodes={deliveryNodes.delivering} type="delivery" />
          <DeliveryRiderInfo riderName="张师傅" riderPhone="138****8888" eta="15分钟" />
        </>
      ),
      actions: (
        <button className="chip action-chip">联系骑手</button>
      ),
    },
    {
      title: '配送核销 · 配送中（无进度信息）',
      order: createDemoOrder('DEMO_FOOD_DELIVERY_03B', 'food', 'unredeemed',
        '酸菜鱼双人套餐', 8800, '太二酸菜鱼(海岸城店)', '🐟',
        {
          storeInfo: { name: '太二酸菜鱼(海岸城店)', address: '深圳市南山区文心四路', distance: '3.2km', businessHours: '11:00 - 21:30', status: 'open' },
          redeemMethod: 'delivery',
          foodSubOrder: {
            type: 'delivery',
            status: 'delivering',
          },
        }
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">查看配送信息</button>
      ),
    },
    {
      title: '配送核销 · 已送达',
      order: createDemoOrder('DEMO_FOOD_DELIVERY_04', 'food', 'redeemed',
        '潮汕牛肉火锅套餐', 15800, '八合里牛肉火锅(后海店)', '🥘',
        {
          storeInfo: { name: '八合里牛肉火锅(后海店)', address: '深圳市南山区后海大道', distance: '3.5km', businessHours: '11:00 - 22:30', status: 'open' },
          redeemMethod: 'delivery',
          foodSubOrder: {
            type: 'delivery',
            status: 'delivered',
            estimatedReadyTime: '',
          },
        }
      ),
      extension: (
        <CollapsibleTimeline nodes={deliveryNodes.delivered} type="delivery" collapsedTitle="已为你送达" />
      ),
      actions: (
        <button className="chip action-chip">再来一单</button>
      ),
    },
    // ---------- 通用状态 ----------
    {
      title: '通用状态 · 待支付',
      order: createDemoOrder('DEMO_FOOD_PAY', 'food', 'pending_payment',
        '招牌烧腊双拼饭 · 例汤', 2800, '太兴烧腊(益田店)', '🍚',
        { storeInfo: { name: '太兴烧腊(益田店)', address: '深圳市南山区益田假日广场', distance: '3.1km', businessHours: '11:00 - 21:30', status: 'open' } }
      ),
      extension: (
        <div className="uoc-payment-countdown-inline">
          <div className="payment-countdown-left">
            <span className="payment-countdown-icon">⏰</span>
            <span className="payment-countdown-time">29:45</span>
          </div>
          <button className="payment-countdown-btn">立即支付</button>
        </div>
      ),
    },
    {
      title: '通用状态 · 待使用（券码核销，多门店）',
      order: createDemoOrder('DEMO_FOOD_UNREDEEMED_VOUCHER', 'food', 'unredeemed',
        '双人下午茶套餐', 6800, '星巴克(深圳门店通用)', '☕',
        {
          storeInfo: { name: '星巴克(万象城店)', address: '深圳市罗湖区宝安南路', distance: '5.2km', businessHours: '07:00 - 22:00', status: 'open' },
          redeemMethod: 'voucher',
          supportedRedeemMethods: ['voucher'],
          productRules: {
            applicableStoreCount: 12,
          },
        }
      ),
      actions: (
        <FoodUnredeemedActions supportedMethods={['voucher']} showUsageReminder={true} />
      ),
    },
    {
      title: '通用状态 · 待使用（点单+配送）',
      order: createDemoOrder('DEMO_FOOD_UNREDEEMED_SD', 'food', 'unredeemed',
        '招牌水果茶 (大杯)', 2200, '喜茶(万象天地店)', '🧋',
        {
          storeInfo: { name: '喜茶(万象天地店)', address: '深圳市南山区深南大道', distance: '1.2km', businessHours: '10:00 - 22:30', status: 'open' },
          redeemMethod: 'self_order',
          supportedRedeemMethods: ['self_order', 'delivery'],
        }
      ),
      actions: (
        <FoodUnredeemedActions supportedMethods={['self_order', 'delivery']} showUsageReminder={true} />
      ),
    },
    {
      title: '通用状态 · 待使用（点单+配送+券码）',
      order: createDemoOrder('DEMO_FOOD_UNREDEEMED_ALL', 'food', 'unredeemed',
        '4人聚餐套餐', 29900, '外婆家(南山店)', '🥢',
        {
          storeInfo: { name: '外婆家(南山店)', address: '深圳市南山区南山大道', distance: '1.8km', businessHours: '10:30 - 21:00', status: 'open' },
          redeemMethod: 'voucher',
          supportedRedeemMethods: ['voucher', 'self_order', 'delivery'],
        }
      ),
      actions: (
        <FoodUnredeemedActions supportedMethods={['voucher', 'self_order', 'delivery']} showUsageReminder={true} showReservation={true} />
      ),
    },
    {
      title: '通用状态 · 待使用（点单+券码）',
      order: createDemoOrder('DEMO_FOOD_UNREDEEMED_VS', 'food', 'unredeemed',
        '招牌牛肉面 + 小菜', 3500, '李先生牛肉面(科技园店)', '🍜',
        {
          storeInfo: { name: '李先生牛肉面(科技园店)', address: '深圳市南山区高新南一道', distance: '600m', businessHours: '07:00 - 22:00', status: 'open' },
          redeemMethod: 'voucher',
          supportedRedeemMethods: ['voucher', 'self_order'],
        }
      ),
      actions: (
        <FoodUnredeemedActions supportedMethods={['voucher', 'self_order']} showUsageReminder={true} />
      ),
    },
    {
      title: '通用状态 · 待使用（仅点单）',
      order: createDemoOrder('DEMO_FOOD_UNREDEEMED_SO', 'food', 'unredeemed',
        '板烧鸡腿堡套餐', 3600, '麦当劳(科技园店)', '🍔',
        {
          storeInfo: { name: '麦当劳(科技园店)', address: '深圳市南山区高新南一道', distance: '500m', businessHours: '06:00 - 24:00', status: 'open' },
          redeemMethod: 'self_order',
          supportedRedeemMethods: ['self_order'],
        }
      ),
      actions: (
        <FoodUnredeemedActions supportedMethods={['self_order']} showUsageReminder={true} />
      ),
    },
    {
      title: '通用状态 · 待使用（配送+券码）',
      order: createDemoOrder('DEMO_FOOD_UNREDEEMED_VD', 'food', 'unredeemed',
        '招牌酸菜鱼 + 米饭2份', 8800, '太二酸菜鱼(海岸城店)', '🐟',
        {
          storeInfo: { name: '太二酸菜鱼(海岸城店)', address: '深圳市南山区文心三路', distance: '1.5km', businessHours: '11:00 - 21:30', status: 'open' },
          redeemMethod: 'voucher',
          supportedRedeemMethods: ['voucher', 'delivery'],
        }
      ),
      actions: (
        <FoodUnredeemedActions supportedMethods={['voucher', 'delivery']} showUsageReminder={true} />
      ),
    },
    {
      title: '通用状态 · 交易完成',
      order: createDemoOrder('DEMO_FOOD_REDEEMED', 'food', 'redeemed',
        '招牌牛肉面 + 小菜', 3500, '李先生牛肉面(科技园店)', '🍜',
        { storeInfo: { name: '李先生牛肉面(科技园店)', address: '深圳市南山区高新南一道', distance: '600m', businessHours: '07:00 - 22:00', status: 'open' } }
      ),
      actions: (
        <button className="chip action-chip">去评价</button>
      ),
    },
    {
      title: '通用状态 · 订单取消',
      order: createDemoOrder('DEMO_FOOD_CANCELED', 'food', 'canceled',
        '鳗鱼饭套餐', 5800, '鳗满·活烤鳗鱼(海岸城店)', '🍱',
        { storeInfo: { name: '鳗满·活烤鳗鱼(海岸城店)', address: '深圳市南山区文心四路', distance: '1.1km', businessHours: '11:00 - 22:00', status: 'open' } }
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">再来一单</button>
      ),
    },
    {
      title: '通用状态 · 退款申请中',
      order: createDemoOrder('DEMO_FOOD_REFUNDING', 'food', 'refunding',
        '4人聚餐套餐', 29900, '外婆家(南山店)', '🥢',
        { storeInfo: { name: '外婆家(南山店)', address: '深圳市南山区南山大道', distance: '1.8km', businessHours: '10:30 - 21:00', status: 'open' } }
      ),
      extension: (
        <RefundingInfo amount="¥299.00" />
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">帮我加急</button>
      ),
    },
    {
      title: '通用状态 · 退款成功',
      order: createDemoOrder('DEMO_FOOD_REFUNDED', 'food', 'refunded',
        '烤鸭双人餐', 16800, '全聚德(福田店)', '🦆',
        { storeInfo: { name: '全聚德(福田店)', address: '深圳市福田区福华三路', distance: '4.3km', businessHours: '11:00 - 21:00', status: 'open' } }
      ),
      extension: (
        <RefundSuccessInfo amount="¥168.00" />
      ),
      actions: (
        <button className="chip action-chip">查看退款详情</button>
      ),
    },
    {
      title: '通用状态 · 退款失败',
      order: createDemoOrder('DEMO_FOOD_REFUND_FAILED', 'food', 'refund_failed',
        '海鲜大咖套餐', 38800, '徐记海鲜(宝安店)', '🦐',
        { storeInfo: { name: '徐记海鲜(宝安店)', address: '深圳市宝安区新湖路', distance: '8.5km', businessHours: '11:00 - 22:00', status: 'open' } }
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">联系客服</button>
      ),
    },
  ];
}

export function buildHotelDemoOrders(): CardDemoItem[] {
  return [
    // ---------- 酒店预售券 ----------
    {
      title: '预售券 · 待支付',
      order: createDemoOrder('DEMO_HOTEL_PRESALE_01', 'hotel', 'pending_payment',
        '豪华海景房2晚通兑券 · 含双早', 128800, '三亚亚特兰蒂斯酒店', '🏨',
        {
          storeInfo: { name: '三亚亚特兰蒂斯酒店', address: '海南省三亚市海棠区', distance: '1.2km', businessHours: '24小时', status: 'open' },
          hotelInfo: {
            productType: 'presale_voucher',
            hotelSubStatus: 'pending_payment',
            checkInTime: '14:00',
            checkOutTime: '12:00',
            breakfast: '含双早',
            roomFacilities: ['海景阳台', '大床', '免费WiFi'],
          },
          productRules: {
            validDate: '2026-06-01 至 2026-12-31',
            notice: ['周末通用不加价'],
            packageDetails: ['豪华海景房2晚', '双人早餐', '水世界门票2张'],
            refundRule: '随时退 · 过期自动退',
            applicableStoreCount: 1,
          },
        }
      ),
      extension: (
        <div className="uoc-payment-countdown-inline">
          <div className="payment-countdown-left">
            <span className="payment-countdown-icon">⏰</span>
            <span className="payment-countdown-time">23:59:59</span>
          </div>
          <button className="payment-countdown-btn">立即支付</button>
        </div>
      ),
    },
    {
      title: '预售券 · 待预约',
      order: createDemoOrder('DEMO_HOTEL_PRESALE_02', 'hotel', 'unredeemed',
        '豪华海景房2晚通兑券 · 含双早', 128800, '三亚亚特兰蒂斯酒店', '🏨',
        {
          storeInfo: { name: '三亚亚特兰蒂斯酒店', address: '海南省三亚市海棠区', distance: '1.2km', businessHours: '24小时', status: 'open' },
          hotelInfo: {
            productType: 'presale_voucher',
            hotelSubStatus: 'unredeemed',
            breakfast: '含双早',
            roomFacilities: ['海景阳台', '大床', '免费WiFi'],
          },
          productRules: {
            validDate: '2026-06-01 至 2026-12-31',
            notice: ['周末通用不加价'],
            packageDetails: ['豪华海景房2晚', '双人早餐', '水世界门票2张'],
            refundRule: '随时退 · 过期自动退',
            applicableStoreCount: 1,
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <div className="hotel-extension-row">
            <span className="hotel-extension-tag">含双早</span>
            <span className="hotel-extension-tag">周末通用</span>
            <span className="hotel-extension-tag">随时退</span>
          </div>
        </div>
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">立即预约</button>
      ),
    },
    {
      title: '预售券 · 预约确认中',
      order: createDemoOrder('DEMO_HOTEL_PRESALE_03', 'hotel', 'unredeemed',
        '豪华海景房2晚通兑券 · 含双早', 128800, '三亚亚特兰蒂斯酒店', '🏨',
        {
          storeInfo: { name: '三亚亚特兰蒂斯酒店', address: '海南省三亚市海棠区', distance: '1.2km', businessHours: '24小时', status: 'open' },
          hotelInfo: {
            productType: 'presale_voucher',
            hotelSubStatus: 'booking_confirming',
            checkInTime: '2026-08-15 14:00',
            checkOutTime: '2026-08-17 12:00',
            breakfast: '含双早',
            roomFacilities: ['海景阳台', '大床', '免费WiFi'],
          },
          productRules: {
            validDate: '2026-06-01 至 2026-12-31',
            notice: ['周末通用不加价'],
            packageDetails: ['豪华海景房2晚', '双人早餐', '水世界门票2张'],
            refundRule: '随时退 · 过期自动退',
            applicableStoreCount: 1,
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <HotelStayInfo hotelName="三亚亚特兰蒂斯酒店" />
          <div className="hotel-extension-row">
            <span className="hotel-extension-label">入住</span>
            <span className="hotel-extension-value hotel-date">8月15日 周六</span>
            <span className="hotel-extension-nights">2晚</span>
            <span className="hotel-extension-label">离店</span>
            <span className="hotel-extension-value hotel-date">8月17日 周一</span>
          </div>
          <div className="hotel-extension-row">
            <span className="hotel-extension-tag hotel-tag-warn">预约确认中</span>
            <span className="hotel-extension-tag">预计30分钟内确认</span>
          </div>
        </div>
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">帮我加急</button>
      ),
    },
    {
      title: '预售券 · 预约成功',
      order: createDemoOrder('DEMO_HOTEL_PRESALE_04', 'hotel', 'unredeemed',
        '豪华海景房2晚通兑券 · 含双早', 128800, '三亚亚特兰蒂斯酒店', '🏨',
        {
          storeInfo: { name: '三亚亚特兰蒂斯酒店', address: '海南省三亚市海棠区', distance: '1.2km', businessHours: '24小时', status: 'open' },
          hotelInfo: {
            productType: 'presale_voucher',
            hotelSubStatus: 'booking_confirmed',
            checkInTime: '2026-08-15 14:00',
            checkOutTime: '2026-08-17 12:00',
            breakfast: '含双早',
            roomFacilities: ['海景阳台', '大床', '免费WiFi'],
          },
          productRules: {
            validDate: '2026-06-01 至 2026-12-31',
            notice: ['周末通用不加价'],
            packageDetails: ['豪华海景房2晚', '双人早餐', '水世界门票2张'],
            refundRule: '预约成功后不可退改',
            applicableStoreCount: 1,
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <HotelStayInfo hotelName="三亚亚特兰蒂斯酒店" />
          <div className="hotel-extension-row">
            <span className="hotel-extension-label">入住</span>
            <span className="hotel-extension-value hotel-date">8月15日 周六</span>
            <span className="hotel-extension-nights">2晚</span>
            <span className="hotel-extension-label">离店</span>
            <span className="hotel-extension-value hotel-date">8月17日 周一</span>
          </div>
          <div className="hotel-extension-row">
            <span className="hotel-extension-tag">预约单号 YYY20260815001</span>
            <span className="hotel-extension-tag">已确认</span>
          </div>
        </div>
      ),
    },
    {
      title: '预售券 · 已入住',
      order: createDemoOrder('DEMO_HOTEL_PRESALE_05', 'hotel', 'unredeemed',
        '豪华海景房2晚通兑券 · 含双早', 128800, '三亚亚特兰蒂斯酒店', '🏨',
        {
          storeInfo: { name: '三亚亚特兰蒂斯酒店', address: '海南省三亚市海棠区', distance: '1.2km', businessHours: '24小时', status: 'open' },
          hotelInfo: {
            productType: 'presale_voucher',
            hotelSubStatus: 'checked_in',
            checkInTime: '2026-08-15 14:00',
            checkOutTime: '2026-08-17 12:00',
            breakfast: '含双早',
            roomFacilities: ['海景阳台', '大床', '免费WiFi'],
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <HotelStayInfo hotelName="三亚亚特兰蒂斯酒店" />
          <div className="hotel-extension-row">
            <span className="hotel-extension-label">入住</span>
            <span className="hotel-extension-value hotel-date">8月15日 周六</span>
            <span className="hotel-extension-nights">2晚</span>
            <span className="hotel-extension-label">离店</span>
            <span className="hotel-extension-value hotel-date">8月17日 周一</span>
          </div>
          <div className="hotel-extension-row">
            <span className="hotel-extension-tag hotel-tag-success">已入住</span>
            <span className="hotel-extension-tag">房间号 1808</span>
          </div>
        </div>
      ),
    },
    {
      title: '预售券 · 交易完成',
      order: createDemoOrder('DEMO_HOTEL_PRESALE_06', 'hotel', 'redeemed',
        '豪华海景房2晚通兑券 · 含双早', 128800, '三亚亚特兰蒂斯酒店', '🏨',
        {
          storeInfo: { name: '三亚亚特兰蒂斯酒店', address: '海南省三亚市海棠区', distance: '1.2km', businessHours: '24小时', status: 'open' },
          hotelInfo: {
            productType: 'presale_voucher',
            hotelSubStatus: 'redeemed',
            checkInTime: '2026-08-15',
            checkOutTime: '2026-08-17',
            breakfast: '含双早',
          },
        }
      ),
      actions: (
        <button className="chip action-chip">去评价</button>
      ),
    },
    {
      title: '预售券 · 订单取消',
      order: createDemoOrder('DEMO_HOTEL_PRESALE_06_CANCELED', 'hotel', 'canceled',
        '豪华海景房2晚通兑券 · 含双早', 128800, '三亚亚特兰蒂斯酒店', '🏨',
        {
          storeInfo: { name: '三亚亚特兰蒂斯酒店', address: '海南省三亚市海棠区', distance: '1.2km', businessHours: '24小时', status: 'open' },
          hotelInfo: {
            productType: 'presale_voucher',
            hotelSubStatus: 'canceled',
          },
        }
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">再来一单</button>
      ),
    },
    {
      title: '预售券 · 退款申请中',
      order: createDemoOrder('DEMO_HOTEL_PRESALE_07', 'hotel', 'refunding',
        '豪华海景房2晚通兑券 · 含双早', 128800, '三亚亚特兰蒂斯酒店', '🏨',
        {
          storeInfo: { name: '三亚亚特兰蒂斯酒店', address: '海南省三亚市海棠区', distance: '1.2km', businessHours: '24小时', status: 'open' },
          hotelInfo: {
            productType: 'presale_voucher',
            hotelSubStatus: 'refunding',
          },
        }
      ),
      extension: (
        <RefundingInfo amount="¥1,288.00" />
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">帮我加急</button>
      ),
    },
    {
      title: '预售券 · 退款成功',
      order: createDemoOrder('DEMO_HOTEL_PRESALE_08', 'hotel', 'refunded',
        '豪华海景房2晚通兑券 · 含双早', 128800, '三亚亚特兰蒂斯酒店', '🏨',
        {
          storeInfo: { name: '三亚亚特兰蒂斯酒店', address: '海南省三亚市海棠区', distance: '1.2km', businessHours: '24小时', status: 'open' },
          hotelInfo: {
            productType: 'presale_voucher',
            hotelSubStatus: 'refunded',
          },
        }
      ),
      extension: (
        <RefundSuccessInfo amount="¥1,288.00" />
      ),
      actions: (
        <button className="chip action-chip">查看退款详情</button>
      ),
    },
    {
      title: '预售券 · 退款失败',
      order: createDemoOrder('DEMO_HOTEL_PRESALE_09', 'hotel', 'refund_failed',
        '豪华海景房2晚通兑券 · 含双早', 128800, '三亚亚特兰蒂斯酒店', '🏨',
        {
          storeInfo: { name: '三亚亚特兰蒂斯酒店', address: '海南省三亚市海棠区', distance: '1.2km', businessHours: '24小时', status: 'open' },
          hotelInfo: {
            productType: 'presale_voucher',
            hotelSubStatus: 'refund_failed',
          },
        }
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">联系客服</button>
      ),
    },
    // ---------- 酒店日历房 ----------
    {
      title: '日历房 · 待支付',
      order: createDemoOrder('DEMO_HOTEL_CAL_01', 'hotel', 'pending_payment',
        '高级大床房 1晚 · 含单早', 68800, '深圳湾万丽酒店', '🛏️',
        {
          storeInfo: { name: '深圳湾万丽酒店', address: '深圳市南山区科技园南路', distance: '2.5km', businessHours: '24小时', status: 'open' },
          hotelInfo: {
            productType: 'calendar_room',
            hotelSubStatus: 'pending_payment',
            checkInTime: '2026-07-05 14:00',
            checkOutTime: '2026-07-06 12:00',
            breakfast: '含单早',
            roomFacilities: ['城景', '大床', '免费WiFi', '迷你吧'],
          },
          productRules: {
            validDate: '2026-07-05 至 2026-07-06',
            notice: ['确认后不可取消'],
            packageDetails: ['高级大床房1晚', '单人早餐'],
            refundRule: '不可退改',
            applicableStoreCount: 1,
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <HotelStayInfo hotelName="深圳湾万丽酒店" />
          <div className="hotel-extension-row">
            <span className="hotel-extension-label">入住</span>
            <span className="hotel-extension-value hotel-date">7月5日 周六</span>
            <span className="hotel-extension-nights">1晚</span>
            <span className="hotel-extension-label">离店</span>
            <span className="hotel-extension-value hotel-date">7月6日 周日</span>
          </div>
          <div className="uoc-payment-countdown-inline">
            <div className="payment-countdown-left">
              <span className="payment-countdown-icon">⏰</span>
              <span className="payment-countdown-time">14:32</span>
            </div>
            <button className="payment-countdown-btn">立即支付</button>
          </div>
        </div>
      ),
    },
    {
      title: '日历房 · 预订确认中',
      order: createDemoOrder('DEMO_HOTEL_CAL_02', 'hotel', 'unredeemed',
        '高级大床房 1晚 · 含单早', 68800, '深圳湾万丽酒店', '🛏️',
        {
          storeInfo: { name: '深圳湾万丽酒店', address: '深圳市南山区科技园南路', distance: '2.5km', businessHours: '24小时', status: 'open' },
          hotelInfo: {
            productType: 'calendar_room',
            hotelSubStatus: 'booking_confirming',
            checkInTime: '2026-07-05 14:00',
            checkOutTime: '2026-07-06 12:00',
            breakfast: '含单早',
            roomFacilities: ['城景', '大床', '免费WiFi', '迷你吧'],
          },
          productRules: {
            validDate: '2026-07-05 至 2026-07-06',
            notice: ['确认后不可取消'],
            packageDetails: ['高级大床房1晚', '单人早餐'],
            refundRule: '不可退改',
            applicableStoreCount: 1,
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <HotelStayInfo hotelName="深圳湾万丽酒店" />
          <div className="hotel-extension-row">
            <span className="hotel-extension-label">入住</span>
            <span className="hotel-extension-value hotel-date">7月5日 周六</span>
            <span className="hotel-extension-nights">1晚</span>
            <span className="hotel-extension-label">离店</span>
            <span className="hotel-extension-value hotel-date">7月6日 周日</span>
          </div>
          <div className="hotel-extension-row">
            <span className="hotel-extension-tag hotel-tag-warn">预订确认中</span>
            <span className="hotel-extension-tag">预计15分钟内确认</span>
          </div>
        </div>
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">帮我加急</button>
      ),
    },
    {
      title: '日历房 · 预订成功',
      order: createDemoOrder('DEMO_HOTEL_CAL_03', 'hotel', 'unredeemed',
        '高级大床房 1晚 · 含单早', 68800, '深圳湾万丽酒店', '🛏️',
        {
          storeInfo: { name: '深圳湾万丽酒店', address: '深圳市南山区科技园南路', distance: '2.5km', businessHours: '24小时', status: 'open' },
          hotelInfo: {
            productType: 'calendar_room',
            hotelSubStatus: 'booking_confirmed',
            checkInTime: '2026-07-05 14:00',
            checkOutTime: '2026-07-06 12:00',
            breakfast: '含单早',
            roomFacilities: ['城景', '大床', '免费WiFi', '迷你吧'],
          },
          productRules: {
            validDate: '2026-07-05 至 2026-07-06',
            notice: ['确认后不可取消'],
            packageDetails: ['高级大床房1晚', '单人早餐'],
            refundRule: '不可退改',
            applicableStoreCount: 1,
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <HotelStayInfo hotelName="深圳湾万丽酒店" />
          <div className="hotel-extension-row">
            <span className="hotel-extension-label">入住</span>
            <span className="hotel-extension-value hotel-date">7月5日 周六</span>
            <span className="hotel-extension-nights">1晚</span>
            <span className="hotel-extension-label">离店</span>
            <span className="hotel-extension-value hotel-date">7月6日 周日</span>
          </div>
          <div className="hotel-extension-row">
            <span className="hotel-extension-tag">订单号 HTL20260705001</span>
            <span className="hotel-extension-tag">已确认</span>
          </div>
        </div>
      ),
    },
    {
      title: '日历房 · 已入住',
      order: createDemoOrder('DEMO_HOTEL_CAL_04', 'hotel', 'unredeemed',
        '高级大床房 1晚 · 含单早', 68800, '深圳湾万丽酒店', '🛏️',
        {
          storeInfo: { name: '深圳湾万丽酒店', address: '深圳市南山区科技园南路', distance: '2.5km', businessHours: '24小时', status: 'open' },
          hotelInfo: {
            productType: 'calendar_room',
            hotelSubStatus: 'checked_in',
            checkInTime: '2026-07-05 14:00',
            checkOutTime: '2026-07-06 12:00',
            breakfast: '含单早',
            roomFacilities: ['城景', '大床', '免费WiFi', '迷你吧'],
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <HotelStayInfo hotelName="深圳湾万丽酒店" />
          <div className="hotel-extension-row">
            <span className="hotel-extension-label">入住</span>
            <span className="hotel-extension-value hotel-date">7月5日 周六</span>
            <span className="hotel-extension-nights">1晚</span>
            <span className="hotel-extension-label">离店</span>
            <span className="hotel-extension-value hotel-date">7月6日 周日</span>
          </div>
          <div className="hotel-extension-row">
            <span className="hotel-extension-tag hotel-tag-success">已入住</span>
            <span className="hotel-extension-tag">房间号 1205</span>
          </div>
        </div>
      ),
    },
    {
      title: '日历房 · 交易完成',
      order: createDemoOrder('DEMO_HOTEL_CAL_05', 'hotel', 'redeemed',
        '高级大床房 1晚 · 含单早', 68800, '深圳湾万丽酒店', '🛏️',
        {
          storeInfo: { name: '深圳湾万丽酒店', address: '深圳市南山区科技园南路', distance: '2.5km', businessHours: '24小时', status: 'open' },
          hotelInfo: {
            productType: 'calendar_room',
            hotelSubStatus: 'redeemed',
            checkInTime: '2026-07-05',
            checkOutTime: '2026-07-06',
            breakfast: '含单早',
          },
        }
      ),
      actions: (
        <button className="chip action-chip">去评价</button>
      ),
    },
    {
      title: '日历房 · 订单取消',
      order: createDemoOrder('DEMO_HOTEL_CAL_06', 'hotel', 'canceled',
        '高级大床房 1晚 · 含单早', 68800, '深圳湾万丽酒店', '🛏️',
        {
          storeInfo: { name: '深圳湾万丽酒店', address: '深圳市南山区科技园南路', distance: '2.5km', businessHours: '24小时', status: 'open' },
          hotelInfo: {
            productType: 'calendar_room',
            hotelSubStatus: 'canceled',
          },
        }
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">再来一单</button>
      ),
    },
    {
      title: '日历房 · 退款申请中',
      order: createDemoOrder('DEMO_HOTEL_CAL_07', 'hotel', 'refunding',
        '行政套房2晚 · 含双早+行政酒廊', 358800, '上海外滩W酒店', '🏩',
        {
          storeInfo: { name: '上海外滩W酒店', address: '上海市虹口区旅顺路', distance: '3.5km', businessHours: '24小时', status: 'open' },
          hotelInfo: {
            productType: 'calendar_room',
            hotelSubStatus: 'refunding',
            checkInTime: '2026-08-10 15:00',
            checkOutTime: '2026-08-12 12:00',
            breakfast: '含双早',
          },
        }
      ),
      extension: (
        <RefundingInfo amount="¥3,588.00" />
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">帮我加急</button>
      ),
    },
    {
      title: '日历房 · 退款成功',
      order: createDemoOrder('DEMO_HOTEL_CAL_08', 'hotel', 'refunded',
        '家庭亲子房2晚套餐', 199900, '珠海长隆企鹅酒店', '🐧',
        {
          storeInfo: { name: '珠海长隆企鹅酒店', address: '珠海市香洲区横琴镇', distance: '2.8km', businessHours: '24小时', status: 'open' },
          hotelInfo: {
            productType: 'calendar_room',
            hotelSubStatus: 'refunded',
          },
        }
      ),
      extension: (
        <RefundSuccessInfo amount="¥1,999.00" />
      ),
      actions: (
        <button className="chip action-chip">查看退款详情</button>
      ),
    },
    {
      title: '日历房 · 退款失败',
      order: createDemoOrder('DEMO_HOTEL_CAL_09', 'hotel', 'refund_failed',
        '行政套房2晚 · 含双早+行政酒廊', 358800, '上海外滩W酒店', '🏩',
        {
          storeInfo: { name: '上海外滩W酒店', address: '上海市虹口区旅顺路', distance: '3.5km', businessHours: '24小时', status: 'open' },
          hotelInfo: {
            productType: 'calendar_room',
            hotelSubStatus: 'refund_failed',
          },
        }
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">联系客服</button>
      ),
    },
  ];
}

export function buildScenicDemoOrders(): CardDemoItem[] {
  return [
    // ---------- 景区团购 ----------
    {
      title: '景区团购 · 待使用',
      order: createDemoOrder('DEMO_SCENIC_GROUP_01', 'scenic', 'unredeemed',
        '深圳欢乐谷成人日场票', 28000, '深圳欢乐谷', '🎢',
        {
          storeInfo: { name: '深圳欢乐谷', address: '深圳市南山区华侨城', distance: '3.5km', businessHours: '09:00 - 22:00', status: 'open' },
          redeemMethod: 'voucher',
          supportedRedeemMethods: ['voucher'],
          productRules: {
            validDate: '2026-06-01 至 2026-12-31',
            notice: ['提前1天预约'],
            packageDetails: ['成人日场票1张'],
            refundRule: '未使用随时退',
            applicableStoreCount: 1,
          },
          scenicInfo: {
            productType: 'group_buy',
          },
        }
      ),
      actions: (
        <div className="food-unredeemed-actions-wrap">
          <div className="food-action-row">
            <button className="food-action-btn food-action-voucher">查看券码</button>
          </div>
          <div className="food-guide-row">
            <button className="chip action-chip guide-chip">
              <span className="guide-chip-star">✦</span>
              <span className="guide-chip-text">订单使用提醒</span>
              <span className="guide-chip-arrow">›</span>
            </button>
            <button className="chip action-chip guide-chip">
              <span className="guide-chip-star">✦</span>
              <span className="guide-chip-text">一站式游玩攻略</span>
              <span className="guide-chip-arrow">›</span>
            </button>
          </div>
        </div>
      ),
    },
    {
      title: '景区团购 · 交易完成',
      order: createDemoOrder('DEMO_SCENIC_GROUP_02', 'scenic', 'redeemed',
        '世界之窗夜场票', 12000, '深圳世界之窗', '🌍',
        {
          storeInfo: { name: '深圳世界之窗', address: '深圳市南山区深南大道', distance: '2.8km', businessHours: '09:00 - 23:00', status: 'open' },
          redeemMethod: 'voucher',
          supportedRedeemMethods: ['voucher'],
          scenicInfo: {
            productType: 'group_buy',
          },
        }
      ),
      actions: (
        <button className="chip action-chip">去评价</button>
      ),
    },
    {
      title: '景区团购 · 待支付',
      order: createDemoOrder('DEMO_SCENIC_GROUP_03', 'scenic', 'pending_payment',
        '深圳欢乐谷成人日场票', 28000, '深圳欢乐谷', '🎢',
        {
          storeInfo: { name: '深圳欢乐谷', address: '深圳市南山区华侨城', distance: '3.5km', businessHours: '09:00 - 22:00', status: 'open' },
          redeemMethod: 'voucher',
          supportedRedeemMethods: ['voucher'],
          productRules: {
            validDate: '2026-06-01 至 2026-12-31',
            notice: ['提前1天预约'],
            packageDetails: ['成人日场票1张'],
            refundRule: '未使用随时退',
            applicableStoreCount: 1,
          },
          scenicInfo: {
            productType: 'group_buy',
          },
        }
      ),
      extension: (
        <div className="uoc-payment-countdown-inline">
          <div className="payment-countdown-left">
            <span className="payment-countdown-icon">⏰</span>
            <span className="payment-countdown-time">15:20</span>
          </div>
          <button className="payment-countdown-btn">立即支付</button>
        </div>
      ),
    },
    {
      title: '景区团购 · 订单取消',
      order: createDemoOrder('DEMO_SCENIC_GROUP_04', 'scenic', 'canceled',
        '深圳欢乐谷成人日场票', 28000, '深圳欢乐谷', '🎢',
        {
          storeInfo: { name: '深圳欢乐谷', address: '深圳市南山区华侨城', distance: '3.5km', businessHours: '09:00 - 22:00', status: 'open' },
          redeemMethod: 'voucher',
          supportedRedeemMethods: ['voucher'],
          scenicInfo: {
            productType: 'group_buy',
          },
        }
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">再来一单</button>
      ),
    },
    {
      title: '景区团购 · 退款申请中',
      order: createDemoOrder('DEMO_SCENIC_GROUP_05', 'scenic', 'refunding',
        '深圳欢乐谷成人日场票', 28000, '深圳欢乐谷', '🎢',
        {
          storeInfo: { name: '深圳欢乐谷', address: '深圳市南山区华侨城', distance: '3.5km', businessHours: '09:00 - 22:00', status: 'open' },
          redeemMethod: 'voucher',
          supportedRedeemMethods: ['voucher'],
          scenicInfo: {
            productType: 'group_buy',
          },
        }
      ),
      extension: (
        <RefundingInfo amount="¥280.00" />
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">帮我加急</button>
      ),
    },
    {
      title: '景区团购 · 退款成功',
      order: createDemoOrder('DEMO_SCENIC_GROUP_06', 'scenic', 'refunded',
        '深圳欢乐谷成人日场票', 28000, '深圳欢乐谷', '🎢',
        {
          storeInfo: { name: '深圳欢乐谷', address: '深圳市南山区华侨城', distance: '3.5km', businessHours: '09:00 - 22:00', status: 'open' },
          redeemMethod: 'voucher',
          supportedRedeemMethods: ['voucher'],
          scenicInfo: {
            productType: 'group_buy',
          },
        }
      ),
      extension: (
        <RefundSuccessInfo amount="¥280.00" />
      ),
      actions: (
        <button className="chip action-chip">查看退款详情</button>
      ),
    },
    {
      title: '景区团购 · 退款失败',
      order: createDemoOrder('DEMO_SCENIC_GROUP_07', 'scenic', 'refund_failed',
        '深圳欢乐谷成人日场票', 28000, '深圳欢乐谷', '🎢',
        {
          storeInfo: { name: '深圳欢乐谷', address: '深圳市南山区华侨城', distance: '3.5km', businessHours: '09:00 - 22:00', status: 'open' },
          redeemMethod: 'voucher',
          supportedRedeemMethods: ['voucher'],
          scenicInfo: {
            productType: 'group_buy',
          },
        }
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">联系客服</button>
      ),
    },
    // ---------- 景区预售券 ----------
    {
      title: '预售券 · 待支付',
      order: createDemoOrder('DEMO_SCENIC_PRESALE_01', 'scenic', 'pending_payment',
        '故宫博物院3日通票预售', 18000, '故宫博物院', '🏯',
        {
          storeInfo: { name: '故宫博物院', address: '北京市东城区景山前街', distance: '5.6km', businessHours: '08:30 - 17:00', status: 'open' },
          scenicInfo: {
            productType: 'presale_voucher',
            senicSubStatus: 'pending_payment',
            visitDate: '预约后确定',
            ticketType: '成人通票',
            ticketCount: 2,
          },
          productRules: {
            validDate: '2026-07-01 至 2026-10-31',
            notice: ['周末通用不加价'],
            packageDetails: ['3日通票2张'],
            refundRule: '随时退 · 过期自动退',
            applicableStoreCount: 1,
          },
        }
      ),
      extension: (
        <div className="uoc-payment-countdown-inline">
          <div className="payment-countdown-left">
            <span className="payment-countdown-icon">⏰</span>
            <span className="payment-countdown-time">02:15:30</span>
          </div>
          <button className="payment-countdown-btn">立即支付</button>
        </div>
      ),
    },
    {
      title: '预售券 · 待预约',
      order: createDemoOrder('DEMO_SCENIC_PRESALE_02', 'scenic', 'unredeemed',
        '故宫博物院3日通票预售', 18000, '故宫博物院', '🏯',
        {
          storeInfo: { name: '故宫博物院', address: '北京市东城区景山前街', distance: '5.6km', businessHours: '08:30 - 17:00', status: 'open' },
          scenicInfo: {
            productType: 'presale_voucher',
            senicSubStatus: 'unredeemed',
            ticketType: '成人通票',
            ticketCount: 2,
          },
          productRules: {
            validDate: '2026-07-01 至 2026-10-31',
            notice: ['周末通用不加价'],
            packageDetails: ['3日通票2张'],
            refundRule: '随时退 · 过期自动退',
            applicableStoreCount: 1,
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <div className="hotel-extension-row">
            <span className="hotel-extension-tag">成人票</span>
            <span className="hotel-extension-tag">2张</span>
            <span className="hotel-extension-tag">随时退</span>
          </div>
        </div>
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">立即预约</button>
      ),
    },
    {
      title: '预售券 · 预约确认中',
      order: createDemoOrder('DEMO_SCENIC_PRESALE_03', 'scenic', 'unredeemed',
        '故宫博物院3日通票预售', 18000, '故宫博物院', '🏯',
        {
          storeInfo: { name: '故宫博物院', address: '北京市东城区景山前街', distance: '5.6km', businessHours: '08:30 - 17:00', status: 'open' },
          scenicInfo: {
            productType: 'presale_voucher',
            senicSubStatus: 'booking_confirming',
            visitDate: '2026-08-15',
            visitTime: '08:30',
            ticketType: '成人通票',
            ticketCount: 2,
          },
          productRules: {
            validDate: '2026-07-01 至 2026-10-31',
            notice: ['周末通用不加价'],
            packageDetails: ['3日通票2张'],
            refundRule: '随时退 · 过期自动退',
            applicableStoreCount: 1,
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <HotelStayInfo hotelName="故宫博物院" label="景区名称" />
          <div className="hotel-extension-row">
            <span className="hotel-extension-label">入园时间</span>
            <span className="hotel-extension-value hotel-date">8月15日 周六 08:30</span>
          </div>
          <div className="hotel-extension-row">
            <span className="hotel-extension-tag hotel-tag-warn">预约确认中</span>
            <span className="hotel-extension-tag">预计30分钟内确认</span>
          </div>
        </div>
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">帮我加急</button>
      ),
    },
    {
      title: '预售券 · 预约成功',
      order: createDemoOrder('DEMO_SCENIC_PRESALE_04', 'scenic', 'unredeemed',
        '故宫博物院3日通票预售', 18000, '故宫博物院', '🏯',
        {
          storeInfo: { name: '故宫博物院', address: '北京市东城区景山前街', distance: '5.6km', businessHours: '08:30 - 17:00', status: 'open' },
          scenicInfo: {
            productType: 'presale_voucher',
            senicSubStatus: 'booking_confirmed',
            visitDate: '2026-08-15',
            visitTime: '08:30',
            ticketType: '成人通票',
            ticketCount: 2,
          },
          productRules: {
            validDate: '2026-07-01 至 2026-10-31',
            notice: ['周末通用不加价'],
            packageDetails: ['3日通票2张'],
            refundRule: '预约成功后不可退改',
            applicableStoreCount: 1,
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <HotelStayInfo hotelName="故宫博物院" label="景区名称" />
          <div className="hotel-extension-row">
            <span className="hotel-extension-label">入园时间</span>
            <span className="hotel-extension-value hotel-date">8月15日 周六 08:30</span>
          </div>
          <div className="hotel-extension-row">
            <span className="hotel-extension-tag">预约单号 GG20260815001</span>
            <span className="hotel-extension-tag">已确认</span>
          </div>
        </div>
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">一站式游玩攻略</button>
      ),
    },
    {
      title: '预售券 · 已入园',
      order: createDemoOrder('DEMO_SCENIC_PRESALE_05', 'scenic', 'unredeemed',
        '故宫博物院3日通票预售', 18000, '故宫博物院', '🏯',
        {
          storeInfo: { name: '故宫博物院', address: '北京市东城区景山前街', distance: '5.6km', businessHours: '08:30 - 17:00', status: 'open' },
          scenicInfo: {
            productType: 'presale_voucher',
            senicSubStatus: 'visited',
            visitDate: '2026-08-15',
            visitTime: '08:30',
            ticketType: '成人通票',
            ticketCount: 2,
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <HotelStayInfo hotelName="故宫博物院" label="景区名称" />
          <div className="hotel-extension-row">
            <span className="hotel-extension-label">入园时间</span>
            <span className="hotel-extension-value hotel-date">8月15日 周六 08:30</span>
          </div>
          <div className="hotel-extension-row">
            <span className="hotel-extension-tag hotel-tag-success">已入园</span>
            <span className="hotel-extension-tag">第1天</span>
          </div>
        </div>
      ),
    },
    {
      title: '预售券 · 交易完成',
      order: createDemoOrder('DEMO_SCENIC_PRESALE_06', 'scenic', 'redeemed',
        '故宫博物院3日通票预售', 18000, '故宫博物院', '🏯',
        {
          storeInfo: { name: '故宫博物院', address: '北京市东城区景山前街', distance: '5.6km', businessHours: '08:30 - 17:00', status: 'open' },
          scenicInfo: {
            productType: 'presale_voucher',
            senicSubStatus: 'redeemed',
            visitDate: '2026-08-15',
          },
        }
      ),
      actions: (
        <button className="chip action-chip">去评价</button>
      ),
    },
    {
      title: '预售券 · 订单取消',
      order: createDemoOrder('DEMO_SCENIC_PRESALE_06_CANCELED', 'scenic', 'canceled',
        '故宫博物院3日通票预售', 18000, '故宫博物院', '🏯',
        {
          storeInfo: { name: '故宫博物院', address: '北京市东城区景山前街', distance: '5.6km', businessHours: '08:30 - 17:00', status: 'open' },
          scenicInfo: {
            productType: 'presale_voucher',
            senicSubStatus: 'canceled',
          },
        }
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">再来一单</button>
      ),
    },
    {
      title: '预售券 · 退款申请中',
      order: createDemoOrder('DEMO_SCENIC_PRESALE_07', 'scenic', 'refunding',
        '故宫博物院3日通票预售', 18000, '故宫博物院', '🏯',
        {
          storeInfo: { name: '故宫博物院', address: '北京市东城区景山前街', distance: '5.6km', businessHours: '08:30 - 17:00', status: 'open' },
          scenicInfo: {
            productType: 'presale_voucher',
            senicSubStatus: 'refunding',
          },
        }
      ),
      extension: (
        <RefundingInfo amount="¥180.00" />
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">帮我加急</button>
      ),
    },
    {
      title: '预售券 · 退款成功',
      order: createDemoOrder('DEMO_SCENIC_PRESALE_08', 'scenic', 'refunded',
        '故宫博物院3日通票预售', 18000, '故宫博物院', '🏯',
        {
          storeInfo: { name: '故宫博物院', address: '北京市东城区景山前街', distance: '5.6km', businessHours: '08:30 - 17:00', status: 'open' },
          scenicInfo: {
            productType: 'presale_voucher',
            senicSubStatus: 'refunded',
          },
        }
      ),
      extension: (
        <RefundSuccessInfo amount="¥180.00" />
      ),
      actions: (
        <button className="chip action-chip">查看退款详情</button>
      ),
    },
    {
      title: '预售券 · 退款失败',
      order: createDemoOrder('DEMO_SCENIC_PRESALE_09', 'scenic', 'refund_failed',
        '故宫博物院3日通票预售', 18000, '故宫博物院', '🏯',
        {
          storeInfo: { name: '故宫博物院', address: '北京市东城区景山前街', distance: '5.6km', businessHours: '08:30 - 17:00', status: 'open' },
          scenicInfo: {
            productType: 'presale_voucher',
            senicSubStatus: 'refund_failed',
          },
        }
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">联系客服</button>
      ),
    },
    // ---------- 景区日历票 ----------
    {
      title: '日历票 · 待支付',
      order: createDemoOrder('DEMO_SCENIC_CAL_01', 'scenic', 'pending_payment',
        '迪士尼乐园1日票', 59900, '上海迪士尼乐园', '🎡',
        {
          storeInfo: { name: '上海迪士尼乐园', address: '上海市浦东新区川沙镇', distance: '', businessHours: '08:00 - 22:00', status: 'open' },
          scenicInfo: {
            productType: 'calendar_ticket',
            senicSubStatus: 'pending_payment',
            visitDate: '2026-07-10',
            visitTime: '08:00',
            ticketType: '成人1日票',
            ticketCount: 2,
          },
          productRules: {
            validDate: '2026-07-10 当日有效',
            notice: ['指定日期入园'],
            packageDetails: ['成人1日票2张'],
            refundRule: '不可退改',
            applicableStoreCount: 1,
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <HotelStayInfo hotelName="上海迪士尼乐园" label="景区名称" />
          <div className="hotel-extension-row">
            <span className="hotel-extension-label">入园时间</span>
            <span className="hotel-extension-value hotel-date">7月10日 周五 08:00</span>
          </div>
          <div className="uoc-payment-countdown-inline">
            <div className="payment-countdown-left">
              <span className="payment-countdown-icon">⏰</span>
              <span className="payment-countdown-time">09:45</span>
            </div>
            <button className="payment-countdown-btn">立即支付</button>
          </div>
        </div>
      ),
    },
    {
      title: '日历票 · 预订确认中',
      order: createDemoOrder('DEMO_SCENIC_CAL_02', 'scenic', 'unredeemed',
        '迪士尼乐园1日票', 59900, '上海迪士尼乐园', '🎡',
        {
          storeInfo: { name: '上海迪士尼乐园', address: '上海市浦东新区川沙镇', distance: '', businessHours: '08:00 - 22:00', status: 'open' },
          scenicInfo: {
            productType: 'calendar_ticket',
            senicSubStatus: 'booking_confirming',
            visitDate: '2026-07-10',
            visitTime: '08:00',
            ticketType: '成人1日票',
            ticketCount: 2,
          },
          productRules: {
            validDate: '2026-07-10 当日有效',
            notice: ['指定日期入园'],
            packageDetails: ['成人1日票2张'],
            refundRule: '不可退改',
            applicableStoreCount: 1,
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <HotelStayInfo hotelName="上海迪士尼乐园" label="景区名称" />
          <div className="hotel-extension-row">
            <span className="hotel-extension-label">入园时间</span>
            <span className="hotel-extension-value hotel-date">7月10日 周五 08:00</span>
          </div>
          <div className="hotel-extension-row">
            <span className="hotel-extension-tag hotel-tag-warn">预订确认中</span>
            <span className="hotel-extension-tag">预计15分钟内确认</span>
          </div>
        </div>
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">帮我加急</button>
      ),
    },
    {
      title: '日历票 · 预订成功',
      order: createDemoOrder('DEMO_SCENIC_CAL_03', 'scenic', 'unredeemed',
        '迪士尼乐园1日票', 59900, '上海迪士尼乐园', '🎡',
        {
          storeInfo: { name: '上海迪士尼乐园', address: '上海市浦东新区川沙镇', distance: '', businessHours: '08:00 - 22:00', status: 'open' },
          scenicInfo: {
            productType: 'calendar_ticket',
            senicSubStatus: 'booking_confirmed',
            visitDate: '2026-07-10',
            visitTime: '08:00',
            ticketType: '成人1日票',
            ticketCount: 2,
          },
          productRules: {
            validDate: '2026-07-10 当日有效',
            notice: ['指定日期入园'],
            packageDetails: ['成人1日票2张'],
            refundRule: '不可退改',
            applicableStoreCount: 1,
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <HotelStayInfo hotelName="上海迪士尼乐园" label="景区名称" />
          <div className="hotel-extension-row">
            <span className="hotel-extension-label">入园时间</span>
            <span className="hotel-extension-value hotel-date">7月10日 周五 08:00</span>
          </div>
          <div className="hotel-extension-row">
            <span className="hotel-extension-tag">订单号 GL20260710001</span>
            <span className="hotel-extension-tag">已确认</span>
          </div>
        </div>
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">一站式游玩攻略</button>
      ),
    },
    {
      title: '日历票 · 已入园',
      order: createDemoOrder('DEMO_SCENIC_CAL_04', 'scenic', 'unredeemed',
        '迪士尼乐园1日票', 59900, '上海迪士尼乐园', '🎡',
        {
          storeInfo: { name: '上海迪士尼乐园', address: '上海市浦东新区川沙镇', distance: '', businessHours: '08:00 - 22:00', status: 'open' },
          scenicInfo: {
            productType: 'calendar_ticket',
            senicSubStatus: 'visited',
            visitDate: '2026-07-10',
            visitTime: '08:00',
            ticketType: '成人1日票',
            ticketCount: 2,
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <HotelStayInfo hotelName="上海迪士尼乐园" label="景区名称" />
          <div className="hotel-extension-row">
            <span className="hotel-extension-label">入园时间</span>
            <span className="hotel-extension-value hotel-date">7月10日 周五 08:00</span>
          </div>
          <div className="hotel-extension-row">
            <span className="hotel-extension-tag hotel-tag-success">已入园</span>
            <span className="hotel-extension-tag">游玩中</span>
          </div>
        </div>
      ),
    },
    {
      title: '日历票 · 交易完成',
      order: createDemoOrder('DEMO_SCENIC_CAL_05', 'scenic', 'redeemed',
        '迪士尼乐园1日票', 59900, '上海迪士尼乐园', '🎡',
        {
          storeInfo: { name: '上海迪士尼乐园', address: '上海市浦东新区川沙镇', distance: '', businessHours: '08:00 - 22:00', status: 'open' },
          scenicInfo: {
            productType: 'calendar_ticket',
            senicSubStatus: 'redeemed',
            visitDate: '2026-07-10',
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <HotelStayInfo hotelName="上海迪士尼乐园" label="景区名称" />
        </div>
      ),
      actions: (
        <button className="chip action-chip">去评价</button>
      ),
    },
    {
      title: '日历票 · 订单取消',
      order: createDemoOrder('DEMO_SCENIC_CAL_06', 'scenic', 'canceled',
        '迪士尼乐园1日票', 59900, '上海迪士尼乐园', '🎡',
        {
          storeInfo: { name: '上海迪士尼乐园', address: '上海市浦东新区川沙镇', distance: '', businessHours: '08:00 - 22:00', status: 'open' },
          scenicInfo: {
            productType: 'calendar_ticket',
            senicSubStatus: 'canceled',
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <HotelStayInfo hotelName="上海迪士尼乐园" label="景区名称" />
        </div>
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">再来一单</button>
      ),
    },
    {
      title: '日历票 · 退款申请中',
      order: createDemoOrder('DEMO_SCENIC_CAL_07', 'scenic', 'refunding',
        '迪士尼乐园1日票', 59900, '上海迪士尼乐园', '🎡',
        {
          storeInfo: { name: '上海迪士尼乐园', address: '上海市浦东新区川沙镇', distance: '', businessHours: '08:00 - 22:00', status: 'open' },
          scenicInfo: {
            productType: 'calendar_ticket',
            senicSubStatus: 'refunding',
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <HotelStayInfo hotelName="上海迪士尼乐园" label="景区名称" />
          <RefundingInfo amount="¥599.00" />
        </div>
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">帮我加急</button>
      ),
    },
    {
      title: '日历票 · 退款成功',
      order: createDemoOrder('DEMO_SCENIC_CAL_08', 'scenic', 'refunded',
        '迪士尼乐园1日票', 59900, '上海迪士尼乐园', '🎡',
        {
          storeInfo: { name: '上海迪士尼乐园', address: '上海市浦东新区川沙镇', distance: '', businessHours: '08:00 - 22:00', status: 'open' },
          scenicInfo: {
            productType: 'calendar_ticket',
            senicSubStatus: 'refunded',
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <HotelStayInfo hotelName="上海迪士尼乐园" label="景区名称" />
          <RefundSuccessInfo amount="¥599.00" />
        </div>
      ),
      actions: (
        <button className="chip action-chip">查看退款详情</button>
      ),
    },
    {
      title: '日历票 · 退款失败',
      order: createDemoOrder('DEMO_SCENIC_CAL_09', 'scenic', 'refund_failed',
        '迪士尼乐园1日票', 59900, '上海迪士尼乐园', '🎡',
        {
          storeInfo: { name: '上海迪士尼乐园', address: '上海市浦东新区川沙镇', distance: '', businessHours: '08:00 - 22:00', status: 'open' },
          scenicInfo: {
            productType: 'calendar_ticket',
            senicSubStatus: 'refund_failed',
          },
        }
      ),
      extension: (
        <div className="hotel-card-extension">
          <HotelStayInfo hotelName="上海迪士尼乐园" label="景区名称" />
        </div>
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">联系客服</button>
      ),
    },
  ];
}

export function buildGeneralDemoOrders(): CardDemoItem[] {
  return [
    {
      title: '综合 · 待支付',
      order: createDemoOrder('DEMO_GENERAL_01', 'general', 'pending_payment',
        '某品牌生活服务套餐', 19900, '品牌生活服务(万象城店)', '🎁',
        {
          storeInfo: { name: '品牌生活服务(万象城店)', address: '深圳市罗湖区宝安南路1881号', distance: '4.2km', businessHours: '09:00 - 21:00', status: 'open' },
          redeemMethod: 'none',
          supportedRedeemMethods: [],
          productRules: {
            validDate: '购买后30天内有效',
            notice: ['全国通用'],
            packageDetails: ['生活服务套餐1份'],
            refundRule: '随时退 · 过期自动退',
            applicableStoreCount: 1,
          },
        }
      ),
      extension: (
        <div className="uoc-payment-countdown-inline">
          <div className="payment-countdown-left">
            <span className="payment-countdown-icon">⏰</span>
            <span className="payment-countdown-time">29:45</span>
          </div>
          <button className="payment-countdown-btn">立即支付</button>
        </div>
      ),
    },
    {
      title: '综合 · 待使用',
      order: createDemoOrder('DEMO_GENERAL_02', 'general', 'unredeemed',
        '某品牌生活服务套餐', 19900, '品牌生活服务(万象城店)', '🎁',
        {
          storeInfo: { name: '品牌生活服务(万象城店)', address: '深圳市罗湖区宝安南路1881号', distance: '4.2km', businessHours: '09:00 - 21:00', status: 'open' },
          redeemMethod: 'none',
          supportedRedeemMethods: [],
          productRules: {
            validDate: '购买后30天内有效',
            notice: ['全国通用'],
            packageDetails: ['生活服务套餐1份'],
            refundRule: '随时退 · 过期自动退',
            applicableStoreCount: 1,
          },
        }
      ),
      actions: (
        <FoodUnredeemedActions supportedMethods={['voucher']} showUsageReminder={true} showReservation={true} />
      ),
    },
    {
      title: '综合 · 交易完成',
      order: createDemoOrder('DEMO_GENERAL_03', 'general', 'redeemed',
        '某品牌生活服务套餐', 19900, '品牌生活服务(万象城店)', '🎁',
        {
          storeInfo: { name: '品牌生活服务(万象城店)', address: '深圳市罗湖区宝安南路1881号', distance: '4.2km', businessHours: '09:00 - 21:00', status: 'open' },
          redeemMethod: 'none',
          supportedRedeemMethods: [],
        }
      ),
      actions: (
        <button className="chip action-chip">去评价</button>
      ),
    },
    {
      title: '综合 · 订单取消',
      order: createDemoOrder('DEMO_GENERAL_04', 'general', 'canceled',
        '某品牌生活服务套餐', 19900, '品牌生活服务(万象城店)', '🎁',
        {
          storeInfo: { name: '品牌生活服务(万象城店)', address: '深圳市罗湖区宝安南路1881号', distance: '4.2km', businessHours: '09:00 - 21:00', status: 'open' },
          redeemMethod: 'none',
          supportedRedeemMethods: [],
        }
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">再来一单</button>
      ),
    },
    {
      title: '综合 · 退款申请中',
      order: createDemoOrder('DEMO_GENERAL_05', 'general', 'refunding',
        '某品牌生活服务套餐', 19900, '品牌生活服务(万象城店)', '🎁',
        {
          storeInfo: { name: '品牌生活服务(万象城店)', address: '深圳市罗湖区宝安南路1881号', distance: '4.2km', businessHours: '09:00 - 21:00', status: 'open' },
          redeemMethod: 'none',
          supportedRedeemMethods: [],
        }
      ),
      extension: (
        <RefundingInfo amount="¥199.00" />
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">帮我加急</button>
      ),
    },
    {
      title: '综合 · 退款成功',
      order: createDemoOrder('DEMO_GENERAL_06', 'general', 'refunded',
        '某品牌生活服务套餐', 19900, '品牌生活服务(万象城店)', '🎁',
        {
          storeInfo: { name: '品牌生活服务(万象城店)', address: '深圳市罗湖区宝安南路1881号', distance: '4.2km', businessHours: '09:00 - 21:00', status: 'open' },
          redeemMethod: 'none',
          supportedRedeemMethods: [],
        }
      ),
      extension: (
        <RefundSuccessInfo amount="¥199.00" />
      ),
      actions: (
        <button className="chip action-chip">查看退款详情</button>
      ),
    },
    {
      title: '综合 · 退款失败',
      order: createDemoOrder('DEMO_GENERAL_07', 'general', 'refund_failed',
        '某品牌生活服务套餐', 19900, '品牌生活服务(万象城店)', '🎁',
        {
          storeInfo: { name: '品牌生活服务(万象城店)', address: '深圳市罗湖区宝安南路1881号', distance: '4.2km', businessHours: '09:00 - 21:00', status: 'open' },
          redeemMethod: 'none',
          supportedRedeemMethods: [],
        }
      ),
      actions: (
        <button className="chip action-chip action-chip-primary">联系客服</button>
      ),
    },
  ];
}

export function OrderCardDemoPage({ onBack }: { onBack?: () => void }) {
  const foodOrders = buildFoodDemoOrders();
  const hotelOrders = buildHotelDemoOrders();
  const scenicOrders = buildScenicDemoOrders();
  const generalOrders = buildGeneralDemoOrders();

  const industries = [
    { key: 'food', label: '🍜 餐饮', items: foodOrders },
    { key: 'hotel', label: '🏨 酒店', items: hotelOrders },
    { key: 'scenic', label: '🏞️ 景区', items: scenicOrders },
    { key: 'general', label: '🎁 综合', items: generalOrders },
  ];

  const foodRedeemFilters = [
    { key: 'all', label: '全部', match: (_t: string) => true },
    { key: 'in_store', label: '点单核销', match: (t: string) => t.startsWith('点单核销') },
    { key: 'delivery', label: '配送核销', match: (t: string) => t.startsWith('配送核销') },
    { key: 'common', label: '通用状态', match: (t: string) => t.startsWith('通用状态') },
  ];

  const hotelProductFilters = [
    { key: 'all', label: '全部', match: (_t: string) => true },
    { key: 'presale_voucher', label: '酒店预售券', match: (t: string) => t.startsWith('预售券') },
    { key: 'calendar_room', label: '日历房', match: (t: string) => t.startsWith('日历房') },
  ];

  const scenicProductFilters = [
    { key: 'all', label: '全部', match: (_t: string) => true },
    { key: 'group_buy', label: '团购商品', match: (t: string) => t.startsWith('景区团购') },
    { key: 'presale_voucher', label: '预售券', match: (t: string) => t.startsWith('预售券') },
    { key: 'calendar_ticket', label: '日历票', match: (t: string) => t.startsWith('日历票') },
  ];

  const [activeIndustry, setActiveIndustry] = useState<string>('food');
  const [activeStatusIndex, setActiveStatusIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('all');
  const [foodRedeemFilter, setFoodRedeemFilter] = useState<string>('all');
  const [hotelProductFilter, setHotelProductFilter] = useState<string>('all');
  const [scenicProductFilter, setScenicProductFilter] = useState<string>('all');

  const getFilteredItems = (industryKey: string): CardDemoItem[] => {
    const items = industries.find(i => i.key === industryKey)?.items ?? [];
    if (industryKey === 'food') {
      const filter = foodRedeemFilters.find(f => f.key === foodRedeemFilter);
      if (filter) {
        return items.filter(item => filter.match(item.title));
      }
    }
    if (industryKey === 'hotel') {
      const filter = hotelProductFilters.find(f => f.key === hotelProductFilter);
      if (filter) {
        return items.filter(item => filter.match(item.title));
      }
    }
    if (industryKey === 'scenic') {
      const filter = scenicProductFilters.find(f => f.key === scenicProductFilter);
      if (filter) {
        return items.filter(item => filter.match(item.title));
      }
    }
    return items;
  };

  const currentIndustryItems = getFilteredItems(activeIndustry);
  const currentItem = currentIndustryItems[activeStatusIndex] ?? currentIndustryItems[0];

  return (
    <div className="order-card-demo-page">
      <div className="demo-page-header">
        {onBack && (
          <button className="demo-back-btn" onClick={onBack}>
            ← 返回
          </button>
        )}
        <h2 className="demo-page-title">统一订单卡片 · 样式预览</h2>
        <p className="demo-page-subtitle">基础层100%统一 · 扩展层行业差异化 · 操作层状态差异化</p>
      </div>

      <div className="demo-page-content">
        {/* 控制面板 */}
        <div className="demo-control-panel">
          <div className="demo-control-group">
            <span className="demo-control-label">视图模式</span>
            <div className="demo-control-btns">
              <button
                className={`demo-control-btn ${viewMode === 'all' ? 'active' : ''}`}
                onClick={() => setViewMode('all')}
              >
                全部展示
              </button>
              <button
                className={`demo-control-btn ${viewMode === 'single' ? 'active' : ''}`}
                onClick={() => setViewMode('single')}
              >
                单卡预览
              </button>
            </div>
          </div>

          {viewMode === 'single' && (
            <>
              <div className="demo-control-group">
                <span className="demo-control-label">行业</span>
                <div className="demo-control-btns">
                  {industries.map((ind) => (
                    <button
                      key={ind.key}
                      className={`demo-control-btn ${activeIndustry === ind.key ? 'active' : ''}`}
                      onClick={() => {
                        setActiveIndustry(ind.key);
                        setFoodRedeemFilter('all');
                        setHotelProductFilter('all');
                        setActiveStatusIndex(0);
                      }}
                    >
                      {ind.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeIndustry === 'food' && (
                <div className="demo-control-group">
                  <span className="demo-control-label">核销方式</span>
                  <div className="demo-control-btns">
                    {foodRedeemFilters.map((f) => (
                      <button
                        key={f.key}
                        className={`demo-control-btn ${foodRedeemFilter === f.key ? 'active' : ''}`}
                        onClick={() => {
                          setFoodRedeemFilter(f.key);
                          setActiveStatusIndex(0);
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeIndustry === 'hotel' && (
                <div className="demo-control-group">
                  <span className="demo-control-label">商品类型</span>
                  <div className="demo-control-btns">
                    {hotelProductFilters.map((f) => (
                      <button
                        key={f.key}
                        className={`demo-control-btn ${hotelProductFilter === f.key ? 'active' : ''}`}
                        onClick={() => {
                          setHotelProductFilter(f.key);
                          setActiveStatusIndex(0);
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeIndustry === 'scenic' && (
                <div className="demo-control-group">
                  <span className="demo-control-label">商品类型</span>
                  <div className="demo-control-btns">
                    {scenicProductFilters.map((f) => (
                      <button
                        key={f.key}
                        className={`demo-control-btn ${scenicProductFilter === f.key ? 'active' : ''}`}
                        onClick={() => {
                          setScenicProductFilter(f.key);
                          setActiveStatusIndex(0);
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="demo-control-group">
                <span className="demo-control-label">订单状态</span>
                <div className="demo-control-btns demo-status-btns">
                  {currentIndustryItems.map((item, idx) => (
                    <button
                      key={idx}
                      className={`demo-control-btn demo-status-btn ${activeStatusIndex === idx ? 'active' : ''}`}
                      onClick={() => setActiveStatusIndex(idx)}
                    >
                      {item.title.split(' · ')[item.title.split(' · ').length - 1]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 展示区域 */}
        {viewMode === 'single' && currentItem ? (
          <div className="demo-single-card-container">
            <div className="demo-single-card-label">
              当前预览：{currentItem.title}
            </div>
            <div className="demo-single-card-wrapper">
              <UnifiedOrderCard
                order={currentItem.order}
                extension={currentItem.extension}
                actions={currentItem.actions}
              />
            </div>
            <div className="demo-single-card-info">
              <div className="demo-info-row">
                <span className="demo-info-label">品类</span>
                <span className="demo-info-value">{currentItem.order.category ?? 'food'}</span>
              </div>
              <div className="demo-info-row">
                <span className="demo-info-label">状态</span>
                <span className="demo-info-value">{currentItem.order.status}</span>
              </div>
              <div className="demo-info-row">
                <span className="demo-info-label">基础层复用</span>
                <span className="demo-info-value demo-info-highlight">100%</span>
              </div>
              <div className="demo-info-row">
                <span className="demo-info-label">扩展层</span>
                <span className="demo-info-value">{currentItem.extension ? '有' : '无'}</span>
              </div>
              <div className="demo-info-row">
                <span className="demo-info-label">操作层</span>
                <span className="demo-info-value">{currentItem.actions ? '有' : '无'}</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="order-card-demo-section">
              <div className="order-card-demo-section-title">🍜 餐饮行业 ({foodOrders.length}种状态)</div>
              
              <div className="order-card-demo-subsection">
                <div className="order-card-demo-subtitle">🏪 点单核销（到店取餐）</div>
                <div className="order-card-demo-grid">
                  {foodOrders.filter(i => i.title.startsWith('点单核销')).map((item, i) => (
                    <div key={i} className="order-card-demo-item">
                      <div className="order-card-demo-label">{item.title}</div>
                      <UnifiedOrderCard
                        order={item.order}
                        extension={item.extension}
                        actions={item.actions}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="order-card-demo-subsection">
                <div className="order-card-demo-subtitle">🛵 配送核销（外卖配送）</div>
                <div className="order-card-demo-grid">
                  {foodOrders.filter(i => i.title.startsWith('配送核销')).map((item, i) => (
                    <div key={i} className="order-card-demo-item">
                      <div className="order-card-demo-label">{item.title}</div>
                      <UnifiedOrderCard
                        order={item.order}
                        extension={item.extension}
                        actions={item.actions}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="order-card-demo-subsection">
                <div className="order-card-demo-subtitle">📋 通用状态</div>
                <div className="order-card-demo-grid">
                  {foodOrders.filter(i => !i.title.startsWith('点单核销') && !i.title.startsWith('配送核销')).map((item, i) => (
                    <div key={i} className="order-card-demo-item">
                      <div className="order-card-demo-label">{item.title}</div>
                      <UnifiedOrderCard
                        order={item.order}
                        extension={item.extension}
                        actions={item.actions}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="order-card-demo-section">
              <div className="order-card-demo-section-title">🏨 酒店行业 ({hotelOrders.length}种状态)</div>

              <div className="order-card-demo-subsection">
                <div className="order-card-demo-subtitle">🎫 酒店预售券</div>
                <div className="order-card-demo-grid">
                  {hotelOrders.filter(i => i.title.startsWith('预售券')).map((item, i) => (
                    <div key={i} className="order-card-demo-item">
                      <div className="order-card-demo-label">{item.title}</div>
                      <UnifiedOrderCard
                        order={item.order}
                        extension={item.extension}
                        actions={item.actions}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="order-card-demo-subsection">
                <div className="order-card-demo-subtitle">📅 日历房（即时预订）</div>
                <div className="order-card-demo-grid">
                  {hotelOrders.filter(i => i.title.startsWith('日历房')).map((item, i) => (
                    <div key={i} className="order-card-demo-item">
                      <div className="order-card-demo-label">{item.title}</div>
                      <UnifiedOrderCard
                        order={item.order}
                        extension={item.extension}
                        actions={item.actions}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* 架构说明 */}
        <div className="demo-architecture-section">
          <div className="demo-architecture-title">📐 三层架构设计</div>
          <div className="demo-architecture-grid">
            <div className="demo-arch-card">
              <div className="demo-arch-layer">基础层</div>
              <div className="demo-arch-name">Base Layer</div>
              <div className="demo-arch-desc">头图 + 商品名/价格 + 标签 + 门店信息</div>
              <div className="demo-arch-rate">复用率 100%</div>
            </div>
            <div className="demo-arch-card demo-arch-card-mid">
              <div className="demo-arch-layer">扩展层</div>
              <div className="demo-arch-name">Extension Slot</div>
              <div className="demo-arch-desc">行业差异化信息（进度条/入离店/座位等）</div>
              <div className="demo-arch-rate">按需定制</div>
            </div>
            <div className="demo-arch-card">
              <div className="demo-arch-layer">操作层</div>
              <div className="demo-arch-name">Action Slot</div>
              <div className="demo-arch-desc">状态差异化按钮（预约/支付/再来一单等）</div>
              <div className="demo-arch-rate">样式统一 内容定制</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
