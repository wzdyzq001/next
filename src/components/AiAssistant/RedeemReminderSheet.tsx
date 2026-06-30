import { useEffect, useMemo, useState } from 'react';
import type { RedeemReminder } from '../../types';
import {
  getQuickOptions,
  setReminder,
  getValidityEndDate,
  getDaysUntilExpiry,
  formatExpiryDateTime,
  formatExpiryStatusText,
} from '../../redeemReminder';

interface RedeemReminderSheetProps {
  orderId: string | null;
  productName?: string;
  validDate?: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (reminder: RedeemReminder) => void;
}

export function RedeemReminderSheet({
  orderId,
  productName,
  validDate,
  open,
  onClose,
  onConfirm,
}: RedeemReminderSheetProps) {
  const [customDays, setCustomDays] = useState(3);
  const [selectedQuickIndex, setSelectedQuickIndex] = useState<number | null>(null);
  const [showMaxToast, setShowMaxToast] = useState(false);
  const [now, setNow] = useState(Date.now());

  const endDate = getValidityEndDate(validDate);
  const hasExpiry = endDate !== null;
  const expiryDays = hasExpiry ? getDaysUntilExpiry(validDate, now) : 30;
  const isExpired = hasExpiry && expiryDays <= 0;
  const maxDays = isExpired ? 0 : expiryDays;
  const expiryDateTimeText = formatExpiryDateTime(validDate);
  const expiryStatusText = formatExpiryStatusText(validDate, now);

  const DEFAULT_DAYS = 3;
  const defaultDays = Math.min(DEFAULT_DAYS, Math.max(0, maxDays));

  const filteredQuickOptions = useMemo(() => {
    const allOptions = getQuickOptions(new Date(now));
    if (isExpired) return [];
    if (!hasExpiry) return allOptions;
    return allOptions.filter((opt) => opt.daysLater <= maxDays);
  }, [now, maxDays, isExpired, hasExpiry]);

  const quickCount = filteredQuickOptions.length;

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (open) {
      setNow(Date.now());
      setCustomDays(defaultDays);
      setSelectedQuickIndex(null);
    }
  }, [open, defaultDays]);

  useEffect(() => {
    if (!open) return;
    setCustomDays((prev) => Math.min(prev, Math.max(0, maxDays)));
    setSelectedQuickIndex((prev) => {
      if (prev === null) return null;
      const opt = filteredQuickOptions[prev];
      return opt && opt.daysLater <= maxDays ? prev : null;
    });
  }, [maxDays, filteredQuickOptions, open]);

  if (!open || !orderId) return null;

  const handleDecrease = () => {
    setCustomDays((prev) => Math.max(0, prev - 1));
    setSelectedQuickIndex(null);
  };

  const handleIncrease = () => {
    if (customDays >= maxDays) {
      setShowMaxToast(true);
      setTimeout(() => setShowMaxToast(false), 1800);
      return;
    }
    setCustomDays((prev) => Math.min(maxDays, prev + 1));
    setSelectedQuickIndex(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      setCustomDays(0);
      setSelectedQuickIndex(null);
      return;
    }
    const val = parseInt(raw, 10);
    const clamped = Math.max(0, Math.min(maxDays, isNaN(val) ? 0 : val));
    setCustomDays(clamped);
    setSelectedQuickIndex(null);
  };

  const handleInputBlur = () => {
    setCustomDays((prev) => Math.max(0, Math.min(maxDays, prev)));
  };

  const handleQuickSelect = (index: number) => {
    const opt = filteredQuickOptions[index];
    if (!opt || opt.daysLater > maxDays) return;
    setSelectedQuickIndex(index);
    setCustomDays(opt.daysLater);
  };

  const handleConfirm = () => {
    if (isExpired) return;
    let remindAt: number;
    if (selectedQuickIndex !== null && filteredQuickOptions[selectedQuickIndex]) {
      remindAt = filteredQuickOptions[selectedQuickIndex].date.getTime();
    } else {
      const date = new Date();
      date.setDate(date.getDate() + customDays);
      date.setHours(10, 0, 0, 0);
      remindAt = date.getTime();
    }
    const reminder = setReminder(orderId, remindAt);
    onConfirm(reminder);
    onClose();
  };

  return (
    <div
      className={`reminder-sheet-overlay ${open ? 'open' : ''}`}
      onClick={onClose}
      aria-hidden={!open}
    >
      <div
        className={`reminder-sheet ${open ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="设置使用提醒"
        onClick={(event) => event.stopPropagation()}
      >
        {showMaxToast && (
          <div className="reminder-max-toast">使用提醒不可晚于有效期</div>
        )}
        <div className="reminder-sheet-grabber" />
        <div className="reminder-sheet-header">
          <div>
            <div className="reminder-sheet-title">设置使用提醒</div>
            <div className="reminder-sheet-product">{productName}</div>
          </div>
          <button
            className="reminder-sheet-close"
            onClick={onClose}
            aria-label="关闭提醒设置"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="reminder-sheet-body">
          {hasExpiry && (
            <div className={`reminder-expiry-info ${isExpired ? 'is-expired' : ''}`}>
              <div className="reminder-expiry-row">
                <div className="reminder-expiry-row-label">有效期至</div>
                <div className="reminder-expiry-row-value">{expiryDateTimeText}</div>
              </div>
              <div className="reminder-expiry-row">
                <div className="reminder-expiry-row-label">剩余时间</div>
                <div className={`reminder-expiry-row-value ${isExpired ? 'text-expired' : 'text-active'}`}>
                  {expiryStatusText}
                </div>
              </div>
            </div>
          )}

          {isExpired ? (
            <div className="reminder-expired-card">
              <div className="reminder-expired-icon">⌛</div>
              <div className="reminder-expired-title">订单已过期</div>
              <div className="reminder-expired-desc">
                无法设置使用提醒
              </div>
            </div>
          ) : (
            <>
              <div className="reminder-section">
                <div className="reminder-section-label">
                  提前提醒天数
                  {hasExpiry && (
                    <span className="reminder-section-hint">（最多 {maxDays} 天）</span>
                  )}
                </div>
                <div className="reminder-custom-row">
                  <button
                    className="reminder-day-btn"
                    onClick={handleDecrease}
                    disabled={customDays <= 0}
                  >
                    −
                  </button>
                  <div className="reminder-days-input">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="reminder-days-input-field"
                      value={customDays}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                    />
                    <span>天后提醒</span>
                  </div>
                  <button
                    className="reminder-day-btn"
                    onClick={handleIncrease}
                    disabled={customDays >= maxDays}
                  >
                    +
                  </button>
                </div>
              </div>

              {quickCount > 0 && (
                <div className="reminder-section">
                  <div className="reminder-section-label">快捷选择</div>
                  <div className={`reminder-quick-grid count-${quickCount}`}>
                    {filteredQuickOptions.map((option, index) => (
                      <button
                        key={index}
                        className={`reminder-quick-item ${selectedQuickIndex === index ? 'selected' : ''}`}
                        onClick={() => handleQuickSelect(index)}
                      >
                        <div className="quick-item-label">{option.label}</div>
                        <div className="quick-item-desc">{option.daysLater}天后</div>
                        {selectedQuickIndex === index && (
                          <div className="quick-item-check">✓</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="reminder-sheet-footer">
          <button className="reminder-cancel-btn" onClick={onClose}>
            取消
          </button>
          <button
            className="reminder-confirm-btn"
            onClick={handleConfirm}
            disabled={isExpired}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

export default RedeemReminderSheet;
