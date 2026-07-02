import { useEffect, useMemo, useState } from 'react';
import type { ReservationInfoCardData } from './ReservationInfoCard';
import ConfirmDialog from './ConfirmDialog';

interface ReservationPanelProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: ReservationInfoCardData) => void;
  storeName: string;
  businessHours?: string;
  initialReservation?: ReservationInfoCardData;
}

export function ReservationPanel({
  open,
  onClose,
  onConfirm,
  storeName,
  businessHours,
  initialReservation,
}: ReservationPanelProps) {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [pax, setPax] = useState(1);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [showStoreList, setShowStoreList] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingReservationData, setPendingReservationData] = useState<ReservationInfoCardData | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, [open]);

  const mockStores = useMemo(() => {
    const baseName = storeName.replace(/\(.*?\)/, '');
    const primaryHours = businessHours || '09:00-22:30';
    return [
      { name: storeName, distance: '2.5km', address: '南山区海德二道288号', businessHours: primaryHours },
      { name: `${baseName}(福田店)`, distance: '4.8km', address: '福田区车公庙路12号', businessHours: '10:00-23:00' },
      { name: `${baseName}(罗湖店)`, distance: '8.1km', address: '罗湖区深南东路5002号', businessHours: '11:00-21:30' },
      { name: `${baseName}(宝安店)`, distance: '12.4km', address: '宝安区新湖路壹方城L3层', businessHours: '09:30-22:00' },
    ];
  }, [storeName, businessHours]);

  const [currentStore, setCurrentStore] = useState(mockStores[0]);

  useEffect(() => {
    const initialStore = initialReservation
      ? {
          name: initialReservation.storeName,
          distance: '2.5km',
          address: initialReservation.storeAddress,
          businessHours: initialReservation.businessHours,
        }
      : mockStores[0];
    const datePart = initialReservation?.arrivalTime.split(' ')[0];
    const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];
    const dateOptions = Array.from({ length: 7 }, (_, index) => {
      const d = new Date();
      d.setDate(d.getDate() + index);
      const month = d.getMonth() + 1;
      const date = d.getDate();
      const day = index === 0 ? '今天' : index === 1 ? '明天' : `周${dayLabels[d.getDay()]}`;
      return { day, date: `${month}.${date}` };
    });
    const matchedDateIdx = datePart ? dateOptions.findIndex((d) => d.date === datePart) : -1;
    setCurrentStore(initialStore);
    setSelectedDateIdx(matchedDateIdx >= 0 ? matchedDateIdx : 0);
    setSelectedTime(initialReservation?.arrivalTime.split(' ').pop() || null);
    setPax(initialReservation?.pax || 1);
    setShowStoreList(false);
  }, [mockStores, initialReservation, open]);

  const generateTimeSlots = () => {
    const slots = [];
    let startHour = 9, startMin = 0;
    let endHour = 22, endMin = 30;

    if (currentStore.businessHours) {
      const match = currentStore.businessHours.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
      if (match) {
        startHour = parseInt(match[1]);
        startMin = parseInt(match[2]);
        endHour = parseInt(match[3]);
        endMin = parseInt(match[4]);
      }
    }

    if (endHour < startHour || (endHour === startHour && endMin <= startMin)) {
      endHour += 24;
    }

    let lastHour = endHour;
    let lastMin = endMin - 30;
    if (lastMin < 0) {
      lastHour -= 1;
      lastMin += 60;
    }

    let currHour = startHour;
    let currMin = startMin;

    while (currHour < lastHour || (currHour === lastHour && currMin <= lastMin)) {
      slots.push(`${String(currHour % 24).padStart(2, '0')}:${String(currMin).padStart(2, '0')}`);
      currMin += 30;
      if (currMin >= 60) {
        currHour += 1;
        currMin -= 60;
      }
    }
    return slots;
  };

  const isTimeSlotPast = (time: string) => {
    const nowDate = new Date(now);
    const [hours, minutes] = time.split(':').map(Number);
    const slotTime = new Date(now);
    slotTime.setHours(hours, minutes, 0, 0);
    return slotTime <= nowDate;
  };

  const dates = useMemo(() => {
    const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];
    const rawDates = Array.from({ length: 7 }, (_, index) => {
      const d = new Date();
      d.setDate(d.getDate() + index);
      const month = d.getMonth() + 1;
      const date = d.getDate();
      const day = index === 0 ? '今天' : index === 1 ? '明天' : `周${dayLabels[d.getDay()]}`;
      return { day, date: `${month}.${date}` };
    });

    const slots = generateTimeSlots();
    const availableSlots = slots.filter((t) => !isTimeSlotPast(t));
    if (availableSlots.length === 0) {
      return rawDates.slice(1);
    }
    return rawDates;
  }, [currentStore.name, now]);

  const timeSlots = useMemo(() => {
    const allSlots = generateTimeSlots();
    if (dates[selectedDateIdx]?.day === '今天') {
      return allSlots
        .filter((time) => !isTimeSlotPast(time))
        .map((time) => ({
          time,
          isPast: false,
        }));
    }
    return allSlots.map((time) => ({
      time,
      isPast: false,
    }));
  }, [dates, selectedDateIdx, currentStore.name, now]);

  useEffect(() => {
    if (dates[selectedDateIdx]?.day !== '今天') return;
    if (selectedTime && isTimeSlotPast(selectedTime)) {
      setSelectedTime(null);
    }
  }, [dates, selectedDateIdx, selectedTime]);

  useEffect(() => {
    if (selectedDateIdx >= dates.length && dates.length > 0) {
      setSelectedDateIdx(0);
      setSelectedTime(null);
    }
  }, [dates, selectedDateIdx]);

  if (!open) return null;

  return (
    <div className={`reservation-drawer-overlay ${open ? 'open' : ''}`} onClick={onClose}>
      <div className="reservation-success-pill">
        <span className="success-badge">★</span>
        <span>近期98%用户成功预约本店</span>
      </div>
      <div className={`reservation-drawer ${open ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="reservation-drawer-header">
          <div className="title-group">
            <h3>帮我约</h3>
            <span className="subtitle">提前约7日热门时间·可随时取消</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="reservation-drawer-body">
          <div className="reservation-main-card">
            <div className="reserve-section store-section">
              <div className="reserve-label">选择门店</div>
              <div className="store-selector">
                <div className="store-info">
                  <div className="store-img-placeholder">{currentStore.name.charAt(0)}</div>
                  <div className="store-text">
                    <div className="name">{currentStore.name}</div>
                    <div className="desc">距你{currentStore.distance} ｜ {currentStore.address}</div>
                  </div>
                </div>
                <button className="switch-btn" onClick={() => setShowStoreList(true)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M7 7h10M17 7l-3-3M17 7l-3 3M17 17H7M7 17l3 3M7 17l3-3" />
                  </svg>
                  切换
                </button>
              </div>
            </div>

            <div className="reserve-section date-section">
              <div className="reserve-label">选择时间</div>
              <div className="date-tabs">
                {dates.map((d, i) => (
                  <div
                    key={i}
                    className={`date-tab ${selectedDateIdx === i ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedDateIdx(i);
                      setSelectedTime(null);
                    }}
                  >
                    <span className="day">{d.day}</span>
                    <span className="date">{d.date}</span>
                  </div>
                ))}
              </div>
              <div className="time-grid">
                {timeSlots.map((slot, idx) => {
                  const isBusy = idx % 4 === 0;
                  const isDisabled = isBusy;
                  return (
                    <button
                      key={slot.time}
                      className={`time-slot ${selectedTime === slot.time ? 'active' : ''} ${isBusy ? 'busy' : ''}`}
                      onClick={() => !isDisabled && setSelectedTime(slot.time)}
                      disabled={isDisabled}
                    >
                      <span className="time">{slot.time}</span>
                      <span className="status">{isBusy ? '繁忙' : '可约'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="reserve-row">
            <div className="reserve-label inline">到店人数</div>
            <div className="stepper">
              <button onClick={() => setPax(p => Math.max(1, p - 1))}>−</button>
              <span>{pax}</span>
              <button onClick={() => setPax(p => p + 1)}>+</button>
            </div>
          </div>

          <div className="reserve-row">
            <div className="reserve-label inline">联系电话</div>
            <div className="phone-number">158****8127</div>
          </div>

          <div className="reserve-tips">
            预约需商家确认，预约结果视门店繁忙程度决定，最终以订单页面展示或短信通知为准；若预约成功，仍可在到店前随时取消预约；若预约失败，可重新发起其他时段预约
          </div>
        </div>

        <div className="reservation-drawer-footer">
          <button
            className="submit-btn"
            disabled={!selectedTime}
            onClick={() => {
              if (!selectedTime) return;
              const data = {
                storeName: currentStore.name,
                storeAddress: currentStore.address,
                businessHours: currentStore.businessHours,
                arrivalTime: `${dates[selectedDateIdx].date} ${selectedTime}`,
                pax,
                phone: '158****8127',
                acceptStatus: 'pending' as const,
                estimatedAcceptTime: '等待商家接单',
                acceptDeadlineAt: Date.now() + 5 * 60 * 1000,
                orderId: initialReservation?.orderId,
              };
              setPendingReservationData(data);
              setShowConfirmDialog(true);
            }}
          >
            确定
          </button>
        </div>

        {showStoreList && (
          <div className="store-list-sheet-overlay" onClick={() => setShowStoreList(false)}>
            <div className="store-list-modal" onClick={e => e.stopPropagation()}>
              <div className="store-list-header">
                <button className="back-btn" onClick={() => setShowStoreList(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h4>选择门店</h4>
                <div style={{ width: 20 }}></div>
              </div>
              <div className="store-list-content">
                {mockStores.map((store, i) => (
                  <div
                    key={i}
                    className={`store-list-item ${currentStore.name === store.name ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentStore(store);
                      setShowStoreList(false);
                      setSelectedDateIdx(0);
                      setSelectedTime(null);
                    }}
                  >
                    <div className="name">{store.name}</div>
                    <div className="desc">距你{store.distance} · {store.businessHours} · {store.address}</div>
                    {currentStore.name === store.name && (
                      <div className="check-mark">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff4da0" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showConfirmDialog}
        title="确认预约"
        message={`您确定要预约 ${dates[selectedDateIdx].date} ${pendingReservationData?.arrivalTime.split(' ')[1]} ${pax}人吗？`}
        confirmText="确认预约"
        cancelText="取消"
        confirmButtonType="primary"
        onConfirm={() => {
          if (pendingReservationData) {
            onConfirm(pendingReservationData);
          }
          setShowConfirmDialog(false);
          setPendingReservationData(null);
        }}
        onCancel={() => {
          setShowConfirmDialog(false);
          setPendingReservationData(null);
        }}
      />
    </div>
  );
}

export default ReservationPanel;
