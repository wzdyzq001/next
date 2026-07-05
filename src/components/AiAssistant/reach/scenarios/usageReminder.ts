import type { ReachConfig, ReachMatchContext } from '../types';
import type { MessageAction } from '../../../../types';

const USAGE_REMINDER_ICON = '✦';

export const USAGE_REMINDER_BAR_PRIORITY = 5;
export const USAGE_REMINDER_BUBBLE_PRIORITY = 5;

export const buildUsageReminderActions = (orderId: string): MessageAction[] => {
  return [
    {
      label: '查看提醒',
      kind: 'view_redeem_reminder',
      orderId: orderId,
      variant: 'guide_primary',
    } as any,
  ];
};

function isUnusedOrder(ctx: ReachMatchContext): boolean {
  const status = ctx.order.statusText || '';
  const unusedKeywords = ['待使用', '待预约', '待核销'];
  return unusedKeywords.some((kw) => status.includes(kw));
}

function hasActiveUsageReminder(ctx: ReachMatchContext): boolean {
  const r = ctx.reminder;
  if (!r) return false;
  return r.status === 'active';
}

function isReminderTimeInFuture(ctx: ReachMatchContext): boolean {
  const r = ctx.reminder;
  if (!r) return false;
  return r.remindAt > ctx.now;
}

export function usageReminderMatch(ctx: ReachMatchContext): boolean {
  if (!isUnusedOrder(ctx)) return false;
  if (!hasActiveUsageReminder(ctx)) return false;
  if (!isReminderTimeInFuture(ctx)) return false;
  return true;
}

function calcDayDiff(targetTime: number, now: number): number {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetTime);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getUsageReminderText(ctx: ReachMatchContext): string {
  const r = ctx.reminder;
  if (!r) return '';

  const dayDiff = calcDayDiff(r.remindAt, ctx.now);
  const date = new Date(r.remindAt);
  const hour = date.getHours();
  const minute = date.getMinutes();

  if (dayDiff > 1) {
    return `${dayDiff}天后提醒`;
  }

  const timeStr = minute === 0 ? `${hour}点` : `${hour}点${minute}分`;
  if (dayDiff <= 0) {
    return `今天${timeStr}提醒`;
  }
  return `明天${timeStr}提醒`;
}

export const USAGE_REMINDER_BAR_CONFIG_TEMPLATE: Omit<ReachConfig, 'reachId'> = {
  pointType: 'order_card_bar',
  displayMode: 'guide_clickable',
  priority: USAGE_REMINDER_BAR_PRIORITY,
  icon: USAGE_REMINDER_ICON,
  shortText: '使用提醒',
  longText: (ctx: ReachMatchContext) => getUsageReminderText(ctx),
  match: usageReminderMatch,
};

export const USAGE_REMINDER_BUBBLE_CONFIG_TEMPLATE: Omit<ReachConfig, 'reachId'> = {
  pointType: 'detail_bubble',
  displayMode: 'guide_clickable',
  priority: USAGE_REMINDER_BUBBLE_PRIORITY,
  icon: USAGE_REMINDER_ICON,
  shortText: '使用提醒',
  longText: (ctx: ReachMatchContext) => getUsageReminderText(ctx),
  bubbleType: 'long',
  collapseStrategy: 'none',
  scrollDebounceMs: 200,
  match: usageReminderMatch,
};

export function createUsageReminderBarConfig(orderId: string): ReachConfig {
  return {
    ...USAGE_REMINDER_BAR_CONFIG_TEMPLATE,
    reachId: `usage_reminder_bar_${orderId}`,
  };
}

export function createUsageReminderBubbleConfig(orderId: string): ReachConfig {
  return {
    ...USAGE_REMINDER_BUBBLE_CONFIG_TEMPLATE,
    reachId: `usage_reminder_bubble_${orderId}`,
  };
}
