import type { ReachConfig, ReachMatchContext } from '../types';

const PROGRESS_ICON = '✦';

export const RESERVATION_PROGRESS_BAR_PRIORITY = 10;

function formatCountdown(deadlineAt: number | undefined, now: number): string {
  const remaining = Math.max(0, (deadlineAt ?? now) - now);
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatReservationDate(arrivalTime: string): string {
  if (!arrivalTime) return '';
  const parts = arrivalTime.split(' ');
  if (parts.length >= 2) {
    const datePart = parts[0];
    const timePart = parts[1];
    const dateMatch = datePart.match(/(\d{1,2})月(\d{1,2})日/);
    if (dateMatch) {
      return `${dateMatch[1]}月${dateMatch[2]}日 ${timePart}`;
    }
    const isoMatch = datePart.match(/\d{4}-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return `${parseInt(isoMatch[1], 10)}月${parseInt(isoMatch[2], 10)}日 ${timePart}`;
    }
  }
  return arrivalTime;
}

function isUnusedOrder(ctx: ReachMatchContext): boolean {
  const status = ctx.order.statusText || '';
  const unusedKeywords = ['待使用', '待预约', '待核销'];
  return unusedKeywords.some((kw) => status.includes(kw));
}

function hasProgressReservation(ctx: ReachMatchContext): boolean {
  const r = ctx.reservation;
  if (!r) return false;
  return r.acceptStatus === 'pending' || r.acceptStatus === 'accepted' || r.acceptStatus === 'failed';
}

function parseArrivalTime(arrivalTime: string): number | null {
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
      return null;
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

function isWithinValidTime(ctx: ReachMatchContext): boolean {
  const r = ctx.reservation;
  if (!r) return false;

  if (r.acceptStatus === 'failed') return true;

  if (r.acceptStatus === 'pending') {
    if (r.acceptDeadlineAt && r.acceptDeadlineAt <= ctx.now) return false;
    return true;
  }

  if (r.acceptStatus === 'accepted') {
    const arrivalTimestamp = parseArrivalTime(r.arrivalTime);
    if (arrivalTimestamp && arrivalTimestamp <= ctx.now) return false;
    return true;
  }

  return false;
}

export function reservationProgressMatch(ctx: ReachMatchContext): boolean {
  if (!isUnusedOrder(ctx)) return false;
  if (!hasProgressReservation(ctx)) return false;
  if (!isWithinValidTime(ctx)) return false;
  return true;
}

function getPendingText(ctx: ReachMatchContext): string {
  const r = ctx.reservation!;
  const countdown = formatCountdown(r.acceptDeadlineAt, ctx.now);
  return `待商家接单 ${countdown}`;
}

function getAcceptedText(ctx: ReachMatchContext): string {
  const r = ctx.reservation!;
  const dateStr = formatReservationDate(r.arrivalTime);
  const parts = dateStr.split(' ');
  const date = parts[0] || '';
  const time = parts[1] || '';
  return `预约成功，${date} ${time} ${r.pax}人`;
}

function getFailedText(): string {
  return '预约失败，可重新预约';
}

export function getProgressText(ctx: ReachMatchContext): string {
  const r = ctx.reservation;
  if (!r) return '';

  switch (r.acceptStatus) {
    case 'pending':
      return getPendingText(ctx);
    case 'accepted':
      return getAcceptedText(ctx);
    case 'failed':
      return getFailedText();
    default:
      return '';
  }
}

export const RESERVATION_PROGRESS_CONFIG_TEMPLATE: Omit<ReachConfig, 'reachId'> = {
  pointType: 'order_card_bar',
  displayMode: 'info_display',
  priority: RESERVATION_PROGRESS_BAR_PRIORITY,
  icon: PROGRESS_ICON,
  shortText: '预约进度',
  longText: (ctx: ReachMatchContext) => getProgressText(ctx),
  match: reservationProgressMatch,
};

export function createReservationProgressConfig(orderId: string): ReachConfig {
  return {
    ...RESERVATION_PROGRESS_CONFIG_TEMPLATE,
    reachId: `reservation_progress_bar_${orderId}`,
  };
}
