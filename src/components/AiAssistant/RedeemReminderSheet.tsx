import { useEffect, useMemo, useState } from 'react';
import type { RedeemReminder } from '../../types';
import {
  setReminder,
  getValidityEndDate,
  getDaysUntilExpiry,
  formatExpiryDateTime,
  formatExpiryStatusText,
  calcNaturalDayDiff,
} from '../../redeemReminder';

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

interface RedeemReminderSheetProps {
  orderId: string | null;
  productName?: string;
  validDate?: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (reminder: RedeemReminder) => void;
  initialRemindAt?: number;
}

interface QuickOption {
  label: string;
  date: Date;
  daysLater: number;
}

function getQuickOptions(now: Date = new Date()): QuickOption[] {
  const options: QuickOption[] = [];
  const targetDays = [5, 6, 0];
  const weekOffsets: Array<0 | 1> = [0, 1];
  const currentDay = now.getDay();

  function calcDaysUntil(targetDay: number): number {
    if (currentDay === 0) {
      if (targetDay === 0) return 0;
      return targetDay - 7;
    }
    if (targetDay === 0) {
      return 7 - currentDay;
    }
    return targetDay - currentDay;
  }

  function isPastInThisWeek(targetDay: number): boolean {
    if (currentDay === 0) {
      return true;
    }
    if (targetDay === 0) {
      return false;
    }
    return targetDay <= currentDay;
  }

  for (const weekOffset of weekOffsets) {
    for (const targetDay of targetDays) {
      if (weekOffset === 0) {
        if (isPastInThisWeek(targetDay)) {
          continue;
        }
      }

      let dayDiff: number;
      if (weekOffset === 0) {
        dayDiff = calcDaysUntil(targetDay);
      } else {
        const thisWeekDiff = calcDaysUntil(targetDay);
        dayDiff = thisWeekDiff + 7;
      }

      const date = new Date(now);
      date.setDate(now.getDate() + dayDiff);
      date.setHours(10, 0, 0, 0);

      const daysLater = calcNaturalDayDiff(date.getTime(), now.getTime());

      const weekPrefix = weekOffset === 0 ? '本' : '下';
      const label = `${weekPrefix}${WEEKDAY_LABELS[targetDay]}`;

      options.push({ label, date, daysLater });
    }
  }

  return options;
}

function formatDateDisplay(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAY_LABELS[date.getDay()];
  return `${month}月${day}日 ${weekday}`;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function RedeemReminderSheet({
  orderId,
  productName,
  validDate,
  open,
  onClose,
  onConfirm,
  initialRemindAt,
}: RedeemReminderSheetProps) {
  const [now, setNow] = useState(Date.now());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHour, setSelectedHour] = useState(10);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedQuickIndex, setSelectedQuickIndex] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastText, setToastText] = useState('');

  const endDate = getValidityEndDate(validDate);
  const hasExpiry = endDate !== null;
  const expiryDays = hasExpiry ? getDaysUntilExpiry(validDate, now) : 30;
  const isExpired = hasExpiry && expiryDays <= 0;
  const maxDays = isExpired ? 0 : expiryDays;
  const expiryDateTimeText = formatExpiryDateTime(validDate);
  const expiryStatusText = formatExpiryStatusText(validDate, now);

  const today = useMemo(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [now]);

  const tomorrow = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }, [today]);

  const maxDate = useMemo(() => {
    if (hasExpiry && endDate) {
      const d = new Date(endDate);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    const d = new Date(today);
    d.setDate(d.getDate() + 30);
    return d;
  }, [hasExpiry, endDate, today]);

  const isTodaySelected = isSameDay(selectedDate, today);
  const isMaxDateSelected = isSameDay(selectedDate, maxDate);

  const currentHour = new Date(now).getHours();
  const currentMinute = new Date(now).getMinutes();

  const minHour = isTodaySelected ? currentHour : 0;
  const minMinute = isTodaySelected && selectedHour === currentHour ? currentMinute : 0;

  const maxHour = isMaxDateSelected ? 18 : 23;
  const maxMinute = isMaxDateSelected && selectedHour === 18 ? 0 : 59;

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

      if (initialRemindAt) {
        const initialDate = new Date(initialRemindAt);
        setSelectedDate(initialDate);
        setSelectedHour(initialDate.getHours());
        setSelectedMinute(initialDate.getMinutes());
        setSelectedQuickIndex(null);
      } else {
        const defaultDate = new Date(today);
        const defaultDays = Math.min(3, Math.max(1, maxDays));
        defaultDate.setDate(defaultDate.getDate() + defaultDays);
        setSelectedDate(defaultDate);
        setSelectedHour(10);
        setSelectedMinute(0);
        setSelectedQuickIndex(null);
      }
    }
  }, [open, initialRemindAt, today, maxDays]);

  useEffect(() => {
    if (!open) return;

    if (selectedDate < today) {
      setSelectedDate(new Date(today));
    } else if (selectedDate > maxDate) {
      setSelectedDate(new Date(maxDate));
    }

    if (selectedHour < minHour) {
      setSelectedHour(minHour);
      if (selectedMinute < minMinute) {
        setSelectedMinute(minMinute);
      }
    }
    if (selectedHour > maxHour) {
      setSelectedHour(maxHour);
      if (selectedMinute > maxMinute) {
        setSelectedMinute(maxMinute);
      }
    }
    if (selectedHour === minHour && selectedMinute < minMinute) {
      setSelectedMinute(minMinute);
    }
    if (selectedHour === maxHour && selectedMinute > maxMinute) {
      setSelectedMinute(maxMinute);
    }

    const matchedIndex = filteredQuickOptions.findIndex((opt) =>
      isSameDay(opt.date, selectedDate)
    );
    setSelectedQuickIndex(matchedIndex >= 0 ? matchedIndex : null);
  }, [selectedDate, selectedHour, selectedMinute, today, maxDate, minHour, maxHour, minMinute, maxMinute, filteredQuickOptions, open]);

  if (!open || !orderId) return null;

  const showToastMessage = (text: string) => {
    setToastText(text);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1800);
  };

  const handleDateDecrease = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    if (newDate < today) {
      showToastMessage('不能选择过去的日期');
      return;
    }
    setSelectedDate(newDate);
    setSelectedQuickIndex(null);
  };

  const handleDateIncrease = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    if (newDate > maxDate) {
      showToastMessage(hasExpiry ? '使用提醒不可晚于有效期' : '已超出可选范围');
      return;
    }
    setSelectedDate(newDate);
    setSelectedQuickIndex(null);
  };

  const handleHourDecrease = () => {
    if (selectedHour <= minHour) {
      if (isTodaySelected) {
        showToastMessage('不能选择过去的时间');
      }
      return;
    }
    setSelectedHour((prev) => prev - 1);
    if (selectedHour - 1 === minHour && selectedMinute < minMinute) {
      setSelectedMinute(minMinute);
    }
  };

  const handleHourIncrease = () => {
    if (selectedHour >= maxHour) {
      if (isMaxDateSelected) {
        showToastMessage('有效期当天提醒时间不能晚于18:00');
      }
      return;
    }
    setSelectedHour((prev) => prev + 1);
  };

  const handleMinuteDecrease = () => {
    if (selectedMinute <= 0) {
      if (selectedHour <= minHour) {
        if (isTodaySelected) {
          showToastMessage('不能选择过去的时间');
        }
        return;
      }
      setSelectedHour((prev) => prev - 1);
      setSelectedMinute(59);
      return;
    }
    if (selectedHour === minHour && selectedMinute - 1 < minMinute) {
      showToastMessage('不能选择过去的时间');
      return;
    }
    setSelectedMinute((prev) => prev - 1);
  };

  const handleMinuteIncrease = () => {
    if (selectedMinute >= 59) {
      if (selectedHour >= maxHour) {
        if (isMaxDateSelected) {
          showToastMessage('有效期当天提醒时间不能晚于18:00');
        }
        return;
      }
      setSelectedHour((prev) => prev + 1);
      setSelectedMinute(0);
      return;
    }
    if (selectedHour === maxHour && selectedMinute + 1 > maxMinute) {
      showToastMessage('有效期当天提醒时间不能晚于18:00');
      return;
    }
    setSelectedMinute((prev) => prev + 1);
  };

  const handleQuickSelect = (index: number) => {
    const opt = filteredQuickOptions[index];
    if (!opt || opt.daysLater > maxDays) return;
    setSelectedQuickIndex(index);
    setSelectedDate(new Date(opt.date));

    const optDate = new Date(opt.date);
    const isOptToday = isSameDay(optDate, today);
    if (isOptToday) {
      const nowDate = new Date(now);
      if (nowDate.getHours() >= 10) {
        setSelectedHour(Math.min(nowDate.getHours() + 1, isMaxDateSelected ? 18 : 23));
        setSelectedMinute(0);
        return;
      }
    }
    setSelectedHour(10);
    setSelectedMinute(0);
  };

  const handleConfirm = () => {
    if (isExpired) return;

    const remindDate = new Date(selectedDate);
    remindDate.setHours(selectedHour, selectedMinute, 0, 0);
    const remindAt = remindDate.getTime();

    if (remindAt < now) {
      showToastMessage('提醒时间不能早于当前时间');
      return;
    }

    const reminder = setReminder(orderId, remindAt);
    onConfirm(reminder);
    onClose();
  };

  const formatTime = (val: number) => String(val).padStart(2, '0');

  return (
    <div
      className={`redeem-reminder-sheet-mask ${open ? 'open' : ''}`}
      onClick={onClose}
      aria-hidden={!open}
    >
      <div
        className={`redeem-reminder-sheet ${open ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="设置使用提醒"
        onClick={(event) => event.stopPropagation()}
      >
        {showToast && (
          <div className="reminder-max-toast">{toastText}</div>
        )}
        <div className="redeem-reminder-sheet-head">
          <div>
            <h3>设置使用提醒</h3>
            <div style={{ fontSize: '12px', color: 'var(--ink-mute)', marginTop: '4px' }}>
              {productName}
            </div>
          </div>
          <button
            className="redeem-reminder-sheet-close"
            onClick={onClose}
            aria-label="关闭提醒设置"
          >
            ✕
          </button>
        </div>

        {hasExpiry && (
          <div className={`reminder-expiry-info ${isExpired ? 'is-expired' : ''}`}>
            <div className="reminder-expiry-row">
              <span className="reminder-expiry-row-label">有效期至</span>
              <span className="reminder-expiry-row-value">{expiryDateTimeText}</span>
              <span className={`reminder-expiry-row-status ${isExpired ? 'text-expired' : 'text-active'}`}>
                {expiryStatusText}
              </span>
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
            <div className="redeem-reminder-sheet-section-title">选择日期</div>
            <div className="reminder-date-row">
              <button
                className="reminder-day-btn"
                onClick={handleDateDecrease}
                disabled={isSameDay(selectedDate, today)}
              >
                −
              </button>
              <div className="reminder-date-display">
                <div className="reminder-date-text">{formatDateDisplay(selectedDate)}</div>
                <div className="reminder-date-sub">
                  {isTodaySelected ? '今天' : isSameDay(selectedDate, tomorrow) ? '明天' : `${calcNaturalDayDiff(selectedDate.getTime(), now)}天后`}
                </div>
              </div>
              <button
                className="reminder-day-btn"
                onClick={handleDateIncrease}
                disabled={isSameDay(selectedDate, maxDate)}
              >
                +
              </button>
            </div>

            {quickCount > 0 && (
              <>
                <div className="redeem-reminder-sheet-section-title">快捷选择</div>
                <div className="redeem-reminder-quick-options">
                  {filteredQuickOptions.map((option, index) => (
                    <button
                      key={index}
                      className={`redeem-reminder-quick-option ${selectedQuickIndex === index ? 'active' : ''}`}
                      onClick={() => handleQuickSelect(index)}
                    >
                      <div className="day">{option.label}</div>
                      <div className="date">{formatDateDisplay(option.date)}</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="redeem-reminder-sheet-section-title">选择时间</div>
            <div className="reminder-time-row">
              <div className="reminder-time-picker">
                <button
                  className="reminder-day-btn reminder-time-btn"
                  onClick={handleHourDecrease}
                  disabled={selectedHour <= minHour}
                >
                  −
                </button>
                <div className="reminder-time-display">
                  <span className="reminder-time-value">{formatTime(selectedHour)}</span>
                </div>
                <button
                  className="reminder-day-btn reminder-time-btn"
                  onClick={handleHourIncrease}
                  disabled={selectedHour >= maxHour}
                >
                  +
                </button>
              </div>
              <div className="reminder-time-separator">:</div>
              <div className="reminder-time-picker">
                <button
                  className="reminder-day-btn reminder-time-btn"
                  onClick={handleMinuteDecrease}
                  disabled={selectedHour <= minHour && selectedMinute <= minMinute}
                >
                  −
                </button>
                <div className="reminder-time-display">
                  <span className="reminder-time-value">{formatTime(selectedMinute)}</span>
                </div>
                <button
                  className="reminder-day-btn reminder-time-btn"
                  onClick={handleMinuteIncrease}
                  disabled={selectedHour >= maxHour && selectedMinute >= maxMinute}
                >
                  +
                </button>
              </div>
            </div>

            {isMaxDateSelected && (
              <div className="reminder-time-note">
                有效期当天提醒时间不能晚于 18:00
              </div>
            )}
          </>
        )}

        <button
          className="redeem-reminder-confirm-btn"
          onClick={handleConfirm}
          disabled={isExpired}
        >
          确定
        </button>
      </div>
    </div>
  );
}

export default RedeemReminderSheet;
