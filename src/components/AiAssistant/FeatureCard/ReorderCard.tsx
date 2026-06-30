import React from 'react';
import type { FeatureCardProps } from './types';

export const ReorderCard: React.FC<FeatureCardProps> = ({ data, onConfirm, onCancel }) => {
  const reorderData = data.reorder;

  if (!reorderData) return null;

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
          <img src={reorderData.thumbnail} alt={reorderData.productName} />
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
        <button className="feature-card-btn primary" onClick={() => onConfirm?.()}>
          立即下单
        </button>
      </div>
    </div>
  );
};

export default ReorderCard;
