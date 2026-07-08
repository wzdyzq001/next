export interface ReservationInfoCardData {
  orderId?: string;
  reservationNo?: string;
  serviceType?: string;
  storeName: string;
  storeAddress: string;
  businessHours: string;
  arrivalTime: string;
  pax: number;
  phone: string;
  acceptStatus: 'pending' | 'accepted' | 'failed' | 'canceled';
  estimatedAcceptTime: string;
  acceptDeadlineAt?: number;
  merchantAcceptAt?: number;
  failReason?: 'timeout' | 'rejected';
}

interface ReservationInfoCardProps {
  data: ReservationInfoCardData;
  now: number;
  onCancel?: () => void;
  onRebook?: () => void;
}

function formatReservationCountdown(deadlineAt: number | undefined, now: number) {
  const remaining = Math.max(0, (deadlineAt ?? now) - now);
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function parseArrivalTimeToTimestamp(arrivalTime: string): number | null {
  if (!arrivalTime) return null;
  const parts = arrivalTime.split(' ');
  if (parts.length < 2) return null;

  const datePart = parts[0];
  const timePart = parts[1];

  let month = 0;
  let day = 0;

  const cnMatch = datePart.match(/(\d{1,2})月(\d{1,2})日/);
  if (cnMatch) {
    month = parseInt(cnMatch[1], 10) - 1;
    day = parseInt(cnMatch[2], 10);
  } else {
    const isoMatch = datePart.match(/\d{4}-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      month = parseInt(isoMatch[1], 10) - 1;
      day = parseInt(isoMatch[2], 10);
    } else {
      const dotMatch = datePart.match(/(\d{1,2})\.(\d{1,2})/);
      if (dotMatch) {
        month = parseInt(dotMatch[1], 10) - 1;
        day = parseInt(dotMatch[2], 10);
      } else {
        return null;
      }
    }
  }

  const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) return null;

  const hour = parseInt(timeMatch[1], 10);
  const min = parseInt(timeMatch[2], 10);

  const now = new Date();
  const date = new Date(now.getFullYear(), month, day, hour, min, 0, 0);

  if (month < now.getMonth()) {
    date.setFullYear(now.getFullYear() + 1);
  }

  return date.getTime();
}

export function ReservationInfoCard({
  data,
  now,
  onCancel,
  onRebook,
}: ReservationInfoCardProps) {
  const isCanceled = data.acceptStatus === 'canceled';
  const isFailed = data.acceptStatus === 'failed';
  const isAccepted = data.acceptStatus === 'accepted';
  const isPending = data.acceptStatus === 'pending';
  const countdownText = formatReservationCountdown(data.acceptDeadlineAt, now);
  const arrivalTimestamp = parseArrivalTimeToTimestamp(data.arrivalTime);
  const isExpired = isAccepted && arrivalTimestamp !== null && arrivalTimestamp <= now;
  const statusText = isExpired
    ? '预约已完成'
    : isAccepted
      ? '预约成功'
      : isFailed
        ? '预约失败'
        : isCanceled
          ? '预约已取消'
          : '预约确认中';
  return (
    <div className={`reservation-info-card ${isCanceled || isFailed ? 'canceled' : ''}`}>
      <div className="reservation-info-head">
        <div>
          <div className="reservation-info-kicker">RESERVATION · 预约信息</div>
          <div className="reservation-info-title">
            {statusText}
            {isPending && <span className="reservation-countdown">{countdownText}</span>}
          </div>
        </div>
        <span className={`reservation-status-badge ${data.acceptStatus}`}>
          {isExpired
            ? '已到店使用'
            : isAccepted
              ? '商家已接单'
              : isFailed
                ? '可重新预约'
                : isCanceled
                  ? '预约已取消'
                  : '等待商家接单'}
        </span>
      </div>

      <div className="reservation-info-store">
        <div className="reservation-store-avatar">{data.storeName.charAt(0)}</div>
        <div className="reservation-store-copy">
          <div className="reservation-store-name">{data.storeName}</div>
          <div className="reservation-store-hours">营业时间 {data.businessHours}</div>
        </div>
      </div>

      <div className="reservation-info-grid">
        <div className="reservation-info-item">
          <strong>{data.arrivalTime}</strong>
        </div>
        <div className="reservation-info-item">
          <strong>{data.pax} 人</strong>
        </div>
        <div className="reservation-info-item">
          <strong>{data.phone}</strong>
        </div>
      </div>

      <div className="reservation-info-note">
        {isFailed
          ? data.failReason === 'rejected'
            ? '商家拒绝了预约，可重新发起预约。'
            : '商家未接单，可重新发起预约。'
          : isCanceled
            ? '预约已取消，可重新预约。'
            : isExpired
              ? '预约时间已过，感谢您的光临。'
              : isAccepted
                ? '商家已接单，到店前可取消预约。'
                : '商家接单后会通过短信及时同步。'}
      </div>
      {(isCanceled || isFailed) && onRebook ? (
        <button className="reservation-info-cancel rebook" onClick={onRebook}>
          重新预约
        </button>
      ) : onCancel && isPending ? (
        <button className="reservation-info-cancel" onClick={onCancel}>
          取消预约
        </button>
      ) : onCancel && isAccepted && !isExpired ? (
        <button className="reservation-info-cancel" onClick={onCancel}>
          取消预约
        </button>
      ) : null}
    </div>
  );
}

export default ReservationInfoCard;
