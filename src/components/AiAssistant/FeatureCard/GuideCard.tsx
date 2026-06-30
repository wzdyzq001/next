import React from 'react';
import type { FeatureCardProps } from './types';

const categoryConfig = {
  hotel: { icon: '🏨', label: '酒店入住指引' },
  scenic: { icon: '🏞️', label: '景区游玩攻略' },
  travel: { icon: '✈️', label: '出行指引' },
};

export const GuideCard: React.FC<FeatureCardProps> = ({ data }) => {
  const guideData = data.guide;
  if (!guideData) return null;

  const config = categoryConfig[guideData.category] || categoryConfig.scenic;

  return (
    <div className="feature-card guide-card">
      <div className="feature-card-header">
        <div className="feature-card-icon guide">{config.icon}</div>
        <div className="feature-card-title-group">
          <div className="feature-card-title">{guideData.title || config.label}</div>
          <div className="feature-card-subtitle">{config.label}</div>
        </div>
      </div>

      <div className="guide-content-list">
        {guideData.content.map((item, index) => (
          <div key={index} className="guide-content-item">
            <div className="guide-item-number">{index + 1}</div>
            <div className="guide-item-text">{item}</div>
          </div>
        ))}
      </div>

      <div className="guide-footer">
        <div className="guide-footer-icon">💡</div>
        <div className="guide-footer-text">
          如有疑问，随时联系客服获取更多帮助
        </div>
      </div>
    </div>
  );
};

export default GuideCard;
