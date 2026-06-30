export interface ReservationInfoCardData {
  orderId?: string;
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
  const statusText = isAccepted ? '预约成功' : isFailed ? '预约失败' : isCanceled ? '预约已取消' : '预约确认中';
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
          {isAccepted ? '商家已接单' : isFailed ? '可重新预约' : isCanceled ? '预约已取消' : '等待商家接单'}
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
          ? '商家未接单，可重新发起预约。'
          : isCanceled
            ? '预约已取消，可重新预约。'
            : isAccepted
              ? '商家已接单。'
              : '商家接单后会通过短信及时同步。'}
      </div>
      {(isCanceled || isFailed) && onRebook ? (
        <button className="reservation-info-cancel rebook" onClick={onRebook}>
          重新预约
        </button>
      ) : onCancel && !isPending ? (
        <button className="reservation-info-cancel" onClick={onCancel}>
          取消预约
        </button>
      ) : onCancel && isPending ? (
        <button className="reservation-info-cancel" onClick={onCancel}>
          取消预约
        </button>
      ) : null}
    </div>
  );
}

export default ReservationInfoCard;
