import type { ReachConfig, ReachMatchContext } from '../types';
import { GUIDE_RESERVATION_CONFIG_TEMPLATES, getGuideScenarioText } from './guideReservation';
import { RESERVATION_PROGRESS_CONFIG_TEMPLATE, getProgressText } from './reservationProgress';
import {
  USAGE_REMINDER_BAR_CONFIG_TEMPLATE,
  USAGE_REMINDER_BUBBLE_CONFIG_TEMPLATE,
  getUsageReminderText,
  buildUsageReminderActions,
} from './usageReminder';
import type { MessageAction } from '../../../../types';

export const buildGuideReservationActions = (orderId: string): MessageAction[] => {
  return [
    {
      label: '立刻预约',
      kind: 'open_reservation',
      orderId: orderId,
      variant: 'guide_primary',
    } as any,
  ];
};

export const enrichGuideReservationTemplate = (
  template: Omit<ReachConfig, 'reachId'>,
  orderId: string,
): Omit<ReachConfig, 'reachId'> => {
  const actions = buildGuideReservationActions(orderId);
  return {
    ...template,
    longText: (ctx: ReachMatchContext) => getGuideScenarioText(ctx.now).long,
    guideMessage: {
      text: (ctx: ReachMatchContext) => getGuideScenarioText(ctx.now).aiPrompt,
      actions,
    } as any,
    actions,
  };
};

export const enrichProgressTemplate = (
  template: Omit<ReachConfig, 'reachId'>,
): Omit<ReachConfig, 'reachId'> => {
  return {
    ...template,
    longText: (ctx: ReachMatchContext) => getProgressText(ctx),
  };
};

export const enrichUsageReminderTemplate = (
  template: Omit<ReachConfig, 'reachId'>,
  orderId?: string,
): Omit<ReachConfig, 'reachId'> => {
  const actions = orderId ? buildUsageReminderActions(orderId) : [];
  return {
    ...template,
    ...(orderId ? {
      guideMessage: {
        text: (ctx: ReachMatchContext) => `您设置了${getUsageReminderText(ctx)}，是否查看详情？`,
        actions,
      } as any,
      actions,
    } : {}),
  };
};

export const buildReachConfigsForOrder = (orderId: string): ReachConfig[] => {
  const configs: ReachConfig[] = [];

  const enrichedUsageReminderBar = enrichUsageReminderTemplate(USAGE_REMINDER_BAR_CONFIG_TEMPLATE, orderId);
  configs.push({
    ...enrichedUsageReminderBar,
    reachId: `usage_reminder_bar_${orderId}`,
  });

  const enrichedUsageReminderBubble = enrichUsageReminderTemplate(USAGE_REMINDER_BUBBLE_CONFIG_TEMPLATE, orderId);
  configs.push({
    ...enrichedUsageReminderBubble,
    reachId: `usage_reminder_bubble_${orderId}`,
  });

  const enrichedProgress = enrichProgressTemplate(RESERVATION_PROGRESS_CONFIG_TEMPLATE);
  configs.push({
    ...enrichedProgress,
    reachId: `reservation_progress_bar_${orderId}`,
  });

  const guideTemplates = GUIDE_RESERVATION_CONFIG_TEMPLATES.map((tpl) =>
    enrichGuideReservationTemplate(tpl, orderId),
  );
  guideTemplates.forEach((tpl, idx) => {
    const pointType = tpl.pointType === 'order_card_bar' ? 'bar' : 'bubble';
    configs.push({
      ...tpl,
      reachId: `guide_reservation_${pointType}_${orderId}`,
    });
  });

  return configs;
};

export const getAllReachConfigTemplates = (): Omit<ReachConfig, 'reachId'>[] => {
  const result: Omit<ReachConfig, 'reachId'>[] = [];

  result.push(enrichUsageReminderTemplate(USAGE_REMINDER_BAR_CONFIG_TEMPLATE));
  result.push(enrichUsageReminderTemplate(USAGE_REMINDER_BUBBLE_CONFIG_TEMPLATE));

  result.push(enrichProgressTemplate(RESERVATION_PROGRESS_CONFIG_TEMPLATE));

  GUIDE_RESERVATION_CONFIG_TEMPLATES.forEach((tpl) => {
    result.push({
      ...tpl,
      longText: (ctx: ReachMatchContext) => getGuideScenarioText(ctx.now).long,
    });
  });

  return result;
};
