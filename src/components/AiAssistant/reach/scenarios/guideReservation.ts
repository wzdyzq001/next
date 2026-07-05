import type { ReachConfig, ReachMatchContext } from '../types';
import { toStandardCategory } from '../../../../types';

const GUIDE_ICON = '✦';

export const GUIDE_RESERVATION_BAR_PRIORITY = 20;
export const GUIDE_RESERVATION_BUBBLE_PRIORITY = 20;

export function isWeekendScenario(now: number): boolean {
  const d = new Date(now);
  const day = d.getDay();
  const hour = d.getHours();

  if (day === 4 && hour >= 0) return true;
  if (day === 5 || day === 6) return true;
  if (day === 0 && hour < 17) return true;

  return false;
}

export function isHolidayScenario(now: number): boolean {
  const d = new Date(now);
  const month = d.getMonth();
  const date = d.getDate();
  const hour = d.getHours();

  const nationalDayStart = new Date(d.getFullYear(), 9, 1).getTime();
  const nationalDayEnd = new Date(d.getFullYear(), 9, 7, 17, 0, 0).getTime();
  if (now >= nationalDayStart && now <= nationalDayEnd) return true;

  const laborDayStart = new Date(d.getFullYear(), 4, 1).getTime();
  const laborDayEnd = new Date(d.getFullYear(), 4, 5, 17, 0, 0).getTime();
  if (now >= laborDayStart && now <= laborDayEnd) return true;

  const springFestivalStart = new Date(d.getFullYear(), 0, 28).getTime();
  const springFestivalEnd = new Date(d.getFullYear(), 1, 4, 17, 0, 0).getTime();
  if (now >= springFestivalStart && now <= springFestivalEnd) return true;

  return false;
}

export function getGuideScenarioText(now: number): { short: string; long: string; aiPrompt: string } {
  if (isHolidayScenario(now)) {
    return {
      short: '预约免排队',
      long: '国庆节客流大，提前预约免排队～',
      aiPrompt: '节假日客流大需排队，提前预约免排队～是否需要预约？',
    };
  }
  if (isWeekendScenario(now)) {
    return {
      short: '预约免排队',
      long: '周末客流大，提前预约免排队～',
      aiPrompt: '周末客流大需排队，提前预约免排队～是否需要预约？',
    };
  }
  return {
    short: '预约免排队',
    long: '高峰期客流大，提前预约免排队～',
    aiPrompt: '高峰期客流大需排队，提前预约免排队～是否需要预约？',
  };
}

function hasActiveReservation(ctx: ReachMatchContext): boolean {
  const r = ctx.reservation;
  if (!r) return false;
  return r.acceptStatus === 'pending' || r.acceptStatus === 'accepted' || r.acceptStatus === 'failed';
}

function isUnusedOrder(ctx: ReachMatchContext): boolean {
  const status = ctx.order.statusText || '';
  const unusedKeywords = ['待使用', '待预约', '待核销'];
  return unusedKeywords.some((kw) => status.includes(kw));
}

function isGeneralCategory(ctx: ReachMatchContext): boolean {
  const category = ctx.order.category || '';
  const stdCat = toStandardCategory(category as any);
  return stdCat === 'general';
}

export function guideReservationMatch(ctx: ReachMatchContext): boolean {
  if (!isUnusedOrder(ctx)) return false;
  if (hasActiveReservation(ctx)) return false;
  if (!isGeneralCategory(ctx)) return false;
  return true;
}

function buildGuideActions(orderId: string) {
  return [
    {
      label: '立刻预约',
      kind: 'open_reservation',
      orderId: orderId,
      variant: 'guide_primary',
    } as any,
  ];
}

export function createGuideReservationConfigs(orderId: string, now: number): ReachConfig[] {
  const scenario = getGuideScenarioText(now);

  return [
    {
      reachId: `guide_reservation_bar_${orderId}`,
      pointType: 'order_card_bar',
      displayMode: 'guide_clickable',
      priority: GUIDE_RESERVATION_BAR_PRIORITY,
      icon: GUIDE_ICON,
      shortText: scenario.short,
      longText: scenario.long,
      match: guideReservationMatch,
      guideMessage: {
        text: scenario.aiPrompt,
        actions: buildGuideActions(orderId),
      },
      actions: buildGuideActions(orderId),
    },
    {
      reachId: `guide_reservation_bubble_${orderId}`,
      pointType: 'detail_bubble',
      displayMode: 'guide_clickable',
      priority: GUIDE_RESERVATION_BUBBLE_PRIORITY,
      icon: GUIDE_ICON,
      shortText: scenario.short,
      longText: scenario.long,
      bubbleType: 'long',
      collapseStrategy: 'auto_collapse',
      autoCollapseSeconds: 5,
      scrollDebounceMs: 200,
      match: guideReservationMatch,
      guideMessage: {
        text: scenario.aiPrompt,
        actions: buildGuideActions(orderId),
      },
      actions: buildGuideActions(orderId),
    },
  ];
}

export const GUIDE_RESERVATION_CONFIG_TEMPLATES: Omit<ReachConfig, 'reachId'>[] = [
  {
    pointType: 'order_card_bar',
    displayMode: 'guide_clickable',
    priority: GUIDE_RESERVATION_BAR_PRIORITY,
    icon: GUIDE_ICON,
    shortText: '预约免排队',
    longText: (ctx: ReachMatchContext) => getGuideScenarioText(ctx.now).long,
    match: guideReservationMatch,
  },
  {
    pointType: 'detail_bubble',
    displayMode: 'guide_clickable',
    priority: GUIDE_RESERVATION_BUBBLE_PRIORITY,
    icon: GUIDE_ICON,
    shortText: '预约免排队',
    longText: (ctx: ReachMatchContext) => getGuideScenarioText(ctx.now).long,
    bubbleType: 'long',
    collapseStrategy: 'auto_collapse',
    autoCollapseSeconds: 5,
    scrollDebounceMs: 200,
    match: guideReservationMatch,
  },
];
