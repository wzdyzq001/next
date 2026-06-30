import React, { useState } from 'react';
import type { FeatureCardProps } from './types';

const refundReasons = [
  '不想买了',
  '商品质量问题',
  '商家服务差',
  '未按约定时间送达',
  '商品与描述不符',
  '其他原因',
];

export const RefundApplyCard: React.FC<FeatureCardProps> = ({ data, onConfirm, onCancel }) => {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [remark, setRemark] = useState('');

  const toggleReason = (reason: string) => {
    setSelectedReasons(prev =>
      prev.includes(reason)
        ? prev.filter(r => r !== reason)
        : [...prev, reason]
    );
  };

  const handleConfirm = () => {
    onConfirm?.({
      amount: data.refund?.amount,
      reasons: selectedReasons,
      remark,
    });
  };

  return (
    <div className="feature-card refund-apply-card">
      <div className="refund-warm-tip">
        <div className="warm-tip-icon">💝</div>
        <div className="warm-tip-content">
          <div className="warm-tip-title">温馨提示</div>
          <div className="warm-tip-text">
            您的退款申请将在1-3个工作日内处理，退款将原路返回。如有疑问可联系客服。
          </div>
        </div>
      </div>

      <div className="feature-card-header">
        <div className="feature-card-icon">💰</div>
        <div className="feature-card-title-group">
          <div className="feature-card-title">退款申请</div>
          <div className="refund-amount">
            退款金额：<span className="amount-value">¥{data.refund?.amount?.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="feature-card-section">
        <div className="feature-card-section-label">退款原因（可多选）</div>
        <div className="refund-reason-grid">
          {refundReasons.map((reason, idx) => (
            <button
              key={idx}
              className={`refund-reason-tag ${selectedReasons.includes(reason) ? 'active' : ''}`}
              onClick={() => toggleReason(reason)}
            >
              {reason}
            </button>
          ))}
        </div>
      </div>

      <div className="feature-card-section">
        <div className="feature-card-section-label">退款说明（选填）</div>
        <textarea
          className="refund-remark-textarea"
          placeholder="请详细描述您的退款原因，以便我们更好地为您服务..."
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          maxLength={200}
        />
        <div className="remark-char-count">{remark.length}/200</div>
      </div>

      <div className="feature-card-actions">
        <button className="feature-card-btn secondary" onClick={onCancel}>
          取消
        </button>
        <button
          className="feature-card-btn primary"
          onClick={handleConfirm}
          disabled={selectedReasons.length === 0}
        >
          申请退款
        </button>
      </div>
    </div>
  );
};

export default RefundApplyCard;
