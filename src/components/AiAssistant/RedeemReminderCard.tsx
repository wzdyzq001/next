import type { RedeemReminder } from '../../types';

interface RedeemReminderCardProps {
  reminder: RedeemReminder;
  orderId?: string;
  productName: string;
  onCancel?: () => void;
  onModify?: () => void;
  onReset?: () => void;
}

export function RedeemReminderCard({
  reminder,
  productName,
  onCancel,
  onModify,
  onReset,
}: RedeemReminderCardProps) {
  const isCanceled = reminder.status === 'canceled';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const remindDate = new Date(reminder.remindAt);
  remindDate.setHours(0, 0, 0, 0);
  const diffDays = Math.max(0, Math.round((remindDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const date = new Date(reminder.remindAt);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hour}:${minute}`;

  const dayLabel = diffDays === 0 ? '今天' : diffDays === 1 ? '明天' : `${diffDays}天后`;

  return (
    <div className={`redeem-reminder-card ${isCanceled ? 'is-canceled' : ''}`}>
      <div className="redeem-reminder-head">
        <div className="redeem-reminder-icon">{isCanceled ? '⚠️' : '⏰'}</div>
        <div className="redeem-reminder-info">
          <div className="redeem-reminder-title">
            {isCanceled
              ? `已取消使用提醒 · 原定 ${dayLabel}（${month}月${day}日 ${weekday} ${timeStr}）`
              : `已为您设置使用提醒 · ${dayLabel}（${month}月${day}日 ${weekday} ${timeStr}）`}
          </div>
          <div className="redeem-reminder-product">{productName}</div>
        </div>
      </div>
      <div className="redeem-reminder-actions">
        {isCanceled ? (
          <button className="redeem-reminder-btn modify" onClick={onReset}>
            重新设置提醒
          </button>
        ) : (
          <>
            <button className="redeem-reminder-btn modify" onClick={onModify}>
              修改提醒时间
            </button>
            <button className="redeem-reminder-btn cancel" onClick={onCancel}>
              取消提醒
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default RedeemReminderCard;
