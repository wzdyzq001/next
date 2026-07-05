import React from 'react';
import type { FeatureCardProps } from './types';
import { FullOrderCard } from '../OrderCard';
import { createReorderFromOriginal, deepCloneOrder, validateOrderConsistency } from '../OrderCard/orderCardUtils';
import './reorderCard.css';

export const ReorderCard: React.FC<FeatureCardProps> = ({ data, onConfirm, onCancel }) => {
  const reorderData = data.reorder;

  if (!reorderData) return null;

  const originalOrder = reorderData.orderData;

  const handleConfirm = () => {
    if (!originalOrder) {
      onConfirm?.();
      return;
    }

    const newOrder = createReorderFromOriginal(originalOrder);

    const validation = validateOrderConsistency(
      { ...originalOrder, id: newOrder.id },
      newOrder
    );

    if (!validation.valid) {
      console.error('[Reorder] 数据一致性校验失败:', validation.mismatchedFields);
    }

    onConfirm?.({ newOrder, originalOrder });
  };

  if (originalOrder) {
    const displayOrder = deepCloneOrder(originalOrder);
    displayOrder.orderStatus = 'pending_pay';
    displayOrder.orderStatusLabel = '待支付';
    displayOrder.statusText = '待支付';
    displayOrder.statusColor = '#ef4444';
    displayOrder.actions = [];
    displayOrder.suggestions = [];
    if (displayOrder.extension) {
      displayOrder.extension = undefined;
    }

    return (
      <div className="reorder-feature-card">
        <div className="reorder-card-header">
          <div className="reorder-card-icon">🛒</div>
          <div className="reorder-card-title">再来一单</div>
        </div>
        <div className="reorder-order-preview">
          <FullOrderCard order={displayOrder} />
        </div>
        <div className="reorder-tips">
          <span className="reorder-tips-icon">💡</span>
          <span className="reorder-tips-text">将为您重新下单同款商品，价格以实际下单为准</span>
        </div>
        <div className="reorder-actions">
          <button className="reorder-btn reorder-btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button className="reorder-btn reorder-btn-primary" onClick={handleConfirm}>
            立即下单
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="feature-card reorder-card">
      <div className="feature-card-header">
        <div className="feature-card-icon">🛒</div>
        <div className="feature-card-title-group">
          <div className="feature-card-title">再来一单</div>
          <div className="feature-card-subtitle">{reorderData.storeName}</div>
        </div>
      </div>

      <div className="reorder-product">
        <div className="reorder-product-thumbnail">
          {reorderData.thumbnail}
        </div>
        <div className="reorder-product-info">
          <div className="reorder-product-name">{reorderData.productName}</div>
          <div className="reorder-product-price">
            <span className="price-symbol">¥</span>
            <span className="price-value">{reorderData.price.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="reorder-divider" />

      <div className="reorder-tips">
        <span className="reorder-tips-icon">💡</span>
        <span className="reorder-tips-text">将为您重新下单同款商品，价格以实际下单为准</span>
      </div>

      <div className="feature-card-actions">
        <button className="feature-card-btn secondary" onClick={onCancel}>
          取消
        </button>
        <button className="feature-card-btn primary" onClick={handleConfirm}>
          立即下单
        </button>
      </div>
    </div>
  );
};

export default ReorderCard;
