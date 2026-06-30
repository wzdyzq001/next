import React from 'react';
import type { FeatureCardProps } from './types';

export const UrgentRequestCard: React.FC<FeatureCardProps> = ({ data, onConfirm, onCancel }) => {
  const targetLabels: Record<string, string> = {
    rider: '骑手',
    merchant: '商家',
    service: '客服',
  };

  const targetLabel = data.urgent?.target ? targetLabels[data.urgent.target] || data.urgent.target : '';

  return (
    <div className="feature-card urgent-request-card">
      <div className="feature-card-header">
        <div className="feature-card-icon urgent">⚡</div>
        <div className="feature-card-title-group">
          <div className="feature-card-title">加急请求</div>
          <div className="feature-card-subtitle">加急处理您的需求</div>
        </div>
      </div>

      <div className="urgent-content">
        <div className="urgent-reason-box">
          <div className="urgent-reason-label">加急原因</div>
          <div className="urgent-reason-text">{data.urgent?.reason || '请尽快处理'}</div>
        </div>

        <div className="urgent-target-row">
          <div className="urgent-target-label">加急对象</div>
          <div className="urgent-target-badge">{targetLabel}</div>
        </div>

        <div className="urgent-notice">
          <div className="urgent-notice-icon">ℹ️</div>
          <div className="urgent-notice-text">
            加急请求将优先处理，预计10分钟内有响应。请保持电话畅通。
          </div>
        </div>
      </div>

      <div className="feature-card-actions">
        <button className="feature-card-btn secondary" onClick={onCancel}>
          取消
        </button>
        <button className="feature-card-btn urgent" onClick={() => onConfirm?.()}>
          确认加急
        </button>
      </div>
    </div>
  );
};

export default UrgentRequestCard;
