export * from './types';

export {
  ReachEngine,
  sortByPriority,
  matchReachConfigs,
  getTopMatch,
  defaultFrequencyStrategy,
  initGlobalReachEngine,
  getGlobalReachEngine,
  resolveLongText,
} from './reachEngine';

export {
  guideReservationMatch,
  getGuideScenarioText,
  isWeekendScenario,
  isHolidayScenario,
  createGuideReservationConfigs,
  GUIDE_RESERVATION_CONFIG_TEMPLATES,
  GUIDE_RESERVATION_BAR_PRIORITY,
  GUIDE_RESERVATION_BUBBLE_PRIORITY,
} from './scenarios/guideReservation';

export {
  reservationProgressMatch,
  getProgressText,
  createReservationProgressConfig,
  RESERVATION_PROGRESS_CONFIG_TEMPLATE,
  RESERVATION_PROGRESS_BAR_PRIORITY,
} from './scenarios/reservationProgress';

export {
  buildReachConfigsForOrder,
  getAllReachConfigTemplates,
  buildGuideReservationActions,
  enrichGuideReservationTemplate,
  enrichProgressTemplate,
} from './scenarios/index';

export {
  OrderCardReachBar,
} from './components/OrderCardReachBar';
export type { OrderCardReachBarProps } from './components/OrderCardReachBar';

export {
  ReachBubble,
} from './components/ReachBubble';
export type { ReachBubbleProps } from './components/ReachBubble';

export {
  useReachBubble,
} from './hooks/useReachBubble';
export type { UseReachBubbleOptions, UseReachBubbleResult } from './hooks/useReachBubble';
