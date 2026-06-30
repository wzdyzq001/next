import React, { useState, useMemo } from 'react';
import type { FeatureCardProps } from './types';

export const ReservationFeatureCard: React.FC<FeatureCardProps> = ({ data, onConfirm, onCancel }) => {
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [pax, setPax] = useState(1);
  const [phone, setPhone] = useState('');

  const dates = useMemo(() => {
    const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];
    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date();
      d.setDate(d.getDate() + index);
      const month = d.getMonth() + 1;
      const date = d.getDate();
      const day = index === 0 ? '今天' : index === 1 ? '明天' : `周${dayLabels[d.getDay()]}`;
      return { day, date: `${month}.${date}` };
    });
  }, []);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 9; hour < 22; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
      slots.push(`${String(hour).padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  const handleConfirm = () => {
    if (!selectedTime) return;
    onConfirm?.({
      storeName: data.reservation?.storeName,
      date: dates[selectedDateIdx].date,
      time: selectedTime,
      pax,
      phone,
    });
  };

  return (
    <div className="feature-card reservation-feature-card">
      <div className="feature-card-header">
        <div className="feature-card-icon">📅</div>
        <div className="feature-card-title-group">
          <div className="feature-card-title">预约服务</div>
          <div className="feature-card-subtitle">{data.reservation?.storeName}</div>
        </div>
      </div>

      <div className="feature-card-section">
        <div className="feature-card-section-label">选择日期</div>
        <div className="feature-card-date-tabs">
          {dates.map((d, i) => (
            <button
              key={i}
              className={`feature-card-date-tab ${selectedDateIdx === i ? 'active' : ''}`}
              onClick={() => {
                setSelectedDateIdx(i);
                setSelectedTime(null);
              }}
            >
              <span className="date-tab-day">{d.day}</span>
              <span className="date-tab-date">{d.date}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="feature-card-section">
        <div className="feature-card-section-label">选择时段</div>
        <div className="feature-card-time-grid">
          {timeSlots.map((time, idx) => {
            const isBusy = selectedDateIdx === 0 && (idx === 3 || idx === 7);
            return (
              <button
                key={time}
                className={`feature-card-time-slot ${selectedTime === time ? 'active' : ''} ${isBusy ? 'busy' : ''}`}
                onClick={() => !isBusy && setSelectedTime(time)}
                disabled={isBusy}
              >
                {time}
                <span className="time-slot-status">{isBusy ? '繁忙' : '可约'}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="feature-card-section">
        <div className="feature-card-row">
          <div className="feature-card-row-label">到店人数</div>
          <div className="feature-card-stepper small">
            <button
              className="stepper-btn"
              onClick={() => setPax(p => Math.max(1, p - 1))}
            >
              −
            </button>
            <div className="stepper-value">{pax} 人</div>
            <button
              className="stepper-btn"
              onClick={() => setPax(p => p + 1)}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="feature-card-section">
        <div className="feature-card-row">
          <div className="feature-card-row-label">联系电话</div>
          <input
            type="tel"
            className="feature-card-input"
            placeholder="请输入手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="feature-card-actions">
        <button className="feature-card-btn secondary" onClick={onCancel}>
          取消
        </button>
        <button
          className="feature-card-btn primary"
          onClick={handleConfirm}
          disabled={!selectedTime}
        >
          确认预约
        </button>
      </div>
    </div>
  );
};

export default ReservationFeatureCard;
