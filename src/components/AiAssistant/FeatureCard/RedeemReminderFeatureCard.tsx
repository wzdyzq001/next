import React, { useState, useMemo } from 'react';
import type { FeatureCardProps } from './types';

const getQuickOptions = (now: Date) => {
  const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];
  const options: { label: string; daysLater: number; date: Date }[] = [];
  
  const addOption = (daysLater: number, label: string) => {
    const date = new Date(now);
    date.setDate(date.getDate() + daysLater);
    options.push({ label, daysLater, date });
  };

  addOption(1, '明天');
  addOption(2, '后天');
  
  const today = now.getDay();
  const daysUntilFriday = (5 - today + 7) % 7;
  const daysUntilSaturday = (6 - today + 7) % 7;
  const daysUntilSunday = (0 - today + 7) % 7;
  
  if (daysUntilFriday > 2) addOption(daysUntilFriday, '本周五');
  if (daysUntilSaturday > 2) addOption(daysUntilSaturday, '本周六');
  if (daysUntilSunday > 2) addOption(daysUntilSunday, '本周日');
  
  addOption(daysUntilFriday + 7, '下周五');
  addOption(daysUntilSaturday + 7, '下周六');
  addOption(daysUntilSunday + 7, '下周日');

  return options.slice(0, 8);
};

export const RedeemReminderFeatureCard: React.FC<FeatureCardProps> = ({ data, onConfirm, onCancel }) => {
  const [customDays, setCustomDays] = useState(3);
  const [selectedQuickIndex, setSelectedQuickIndex] = useState<number | null>(null);

  const quickOptions = useMemo(() => getQuickOptions(new Date()), []);

  const handleQuickSelect = (index: number) => {
    setSelectedQuickIndex(index);
    setCustomDays(quickOptions[index].daysLater);
  };

  const handleConfirm = () => {
    let remindAt: number;
    if (selectedQuickIndex !== null && quickOptions[selectedQuickIndex]) {
      remindAt = quickOptions[selectedQuickIndex].date.getTime();
    } else {
      const date = new Date();
      date.setDate(date.getDate() + customDays);
      date.setHours(10, 0, 0, 0);
      remindAt = date.getTime();
    }
    onConfirm?.({ remindAt, days: customDays });
  };

  return (
    <div className="feature-card redeem-reminder-feature-card">
      <div className="feature-card-header">
        <div className="feature-card-icon">⏰</div>
        <div className="feature-card-title-group">
          <div className="feature-card-title">设置使用提醒</div>
          <div className="feature-card-subtitle">{data.redeemReminder?.productName}</div>
        </div>
      </div>

      <div className="feature-card-section">
        <div className="feature-card-section-label">快捷选择</div>
        <div className="feature-card-quick-grid">
          {quickOptions.map((option, index) => (
            <button
              key={index}
              className={`feature-card-quick-option ${selectedQuickIndex === index ? 'active' : ''}`}
              onClick={() => handleQuickSelect(index)}
            >
              <div className="quick-option-label">{option.label}</div>
              <div className="quick-option-desc">{option.daysLater}天后</div>
            </button>
          ))}
        </div>
      </div>

      <div className="feature-card-section">
        <div className="feature-card-section-label">自定义提前天数</div>
        <div className="feature-card-stepper">
          <button
            className="stepper-btn"
            onClick={() => {
              setCustomDays(prev => Math.max(0, prev - 1));
              setSelectedQuickIndex(null);
            }}
          >
            −
          </button>
          <div className="stepper-value">{customDays} 天</div>
          <button
            className="stepper-btn"
            onClick={() => {
              setCustomDays(prev => prev + 1);
              setSelectedQuickIndex(null);
            }}
          >
            +
          </button>
        </div>
      </div>

      <div className="feature-card-actions">
        <button className="feature-card-btn secondary" onClick={onCancel}>
          取消
        </button>
        <button className="feature-card-btn primary" onClick={handleConfirm}>
          确认提醒
        </button>
      </div>
    </div>
  );
};

export default RedeemReminderFeatureCard;
