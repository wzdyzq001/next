import type { NluContext, NluResponse } from '../types';
import { createQuickReply } from '../utils';
import { extractDate, extractTime, extractPeopleCount, extractPhone } from '../entityExtractor';
import { MOCK_RESERVATION_PENDING } from '../scenarioData';
import type { GuidedQuestion } from '../../types';

const BUSINESS_START_HOUR = 9;
const BUSINESS_START_MIN = 0;
const BUSINESS_END_HOUR = 22;
const BUSINESS_END_MIN = 30;
const MAX_PEOPLE = 10;
const MIN_PEOPLE = 1;
const MAX_DAYS_AHEAD = 6;
const LAST_PHONE_KEY = 'ai_assistant_last_phone';

type TimeUnavailableReason = 'business_hours' | 'time_passed' | 'fully_booked';

const FULLY_BOOKED_TIMES: Record<string, string[]> = {
  default: ['18:00', '19:00', '19:30'],
};

function isTimePassed(dateStr: string, timeStr: string): boolean {
  const targetDate = parseDateValue(dateStr);
  if (!targetDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDay = new Date(targetDate);
  targetDay.setHours(0, 0, 0, 0);

  if (targetDay.getTime() > today.getTime()) return false;
  if (targetDay.getTime() < today.getTime()) return true;

  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;

  const hour = parseInt(match[1]);
  const min = parseInt(match[2]);
  const now = new Date();
  const targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, min);
  return targetTime <= now;
}

function isTimeFullyBooked(dateStr: string, timeStr: string): boolean {
  const dateKey = dateStr.replace(/[（）()]/g, '');
  const booked = FULLY_BOOKED_TIMES[dateKey] || FULLY_BOOKED_TIMES.default;
  return booked.includes(timeStr);
}

function getTimeUnavailableReason(dateStr: string, timeStr: string): TimeUnavailableReason | null {
  if (!isTimeWithinBusinessHours(timeStr)) return 'business_hours';
  if (isTimePassed(dateStr, timeStr)) return 'time_passed';
  if (isTimeFullyBooked(dateStr, timeStr)) return 'fully_booked';
  return null;
}

function isPureNumber(message: string): boolean {
  return /^\s*\d+\s*$/.test(message);
}

function parseDateValue(dateStr: string): Date | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dateStr === '今天') {
    return new Date(today);
  }
  if (dateStr === '明天') {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (dateStr === '后天') {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return d;
  }
  if (dateStr === '大后天') {
    const d = new Date(today);
    d.setDate(d.getDate() + 3);
    return d;
  }
  if (dateStr === '昨天') {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d;
  }
  if (dateStr === '前天') {
    const d = new Date(today);
    d.setDate(d.getDate() - 2);
    return d;
  }
  if (dateStr === '大前天') {
    const d = new Date(today);
    d.setDate(d.getDate() - 3);
    return d;
  }

  const weekMatch = dateStr.match(/^周(一|二|三|四|五|六|日|天)$/);
  if (weekMatch) {
    const dayMap: Record<string, number> = { '日': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '天': 0 };
    const targetDay = dayMap[weekMatch[1]];
    const currentDay = today.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7;
    const d = new Date(today);
    d.setDate(d.getDate() + diff);
    return d;
  }

  const nextWeekMatch = dateStr.match(/^下周(一|二|三|四|五|六|日|天)$/);
  if (nextWeekMatch) {
    const dayMap: Record<string, number> = { '日': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '天': 0 };
    const targetDay = dayMap[nextWeekMatch[1]];
    const currentDay = today.getDay();
    let diff = targetDay - currentDay + 7;
    const d = new Date(today);
    d.setDate(d.getDate() + diff);
    return d;
  }

  const thisWeekMatch = dateStr.match(/^本周(一|二|三|四|五|六|日|天)$/);
  if (thisWeekMatch) {
    const dayMap: Record<string, number> = { '日': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '天': 0 };
    const targetDay = dayMap[thisWeekMatch[1]];
    const currentDay = today.getDay();
    let diff = targetDay - currentDay;
    if (diff < 0) diff += 7;
    const d = new Date(today);
    d.setDate(d.getDate() + diff);
    return d;
  }

  const monthDayMatch = dateStr.match(/^(\d{1,2})月(\d{1,2})日$/);
  if (monthDayMatch) {
    const month = parseInt(monthDayMatch[1]);
    const day = parseInt(monthDayMatch[2]);
    const d = new Date(today.getFullYear(), month - 1, day);
    return d;
  }

  return null;
}

function isDateWithinRange(dateStr: string): boolean {
  const targetDate = parseDateValue(dateStr);
  if (!targetDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);
  return targetDate >= today && targetDate <= maxDate;
}

function isTimeWithinBusinessHours(timeStr: string): boolean {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  const hour = parseInt(match[1]);
  const min = parseInt(match[2]);
  const startMin = BUSINESS_START_HOUR * 60 + BUSINESS_START_MIN;
  const endMin = BUSINESS_END_HOUR * 60 + BUSINESS_END_MIN;
  const currentMin = hour * 60 + min;
  return currentMin >= startMin && currentMin <= endMin;
}

function getAvailableDateOptions(): string[] {
  const options: string[] = [];
  const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];
  const today = new Date();
  for (let i = 0; i <= MAX_DAYS_AHEAD; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    let label = '';
    if (i === 0) label = '今天';
    else if (i === 1) label = '明天';
    else label = `周${dayLabels[d.getDay()]}`;
    options.push(`${label}(${month}.${day})`);
  }
  return options;
}

function getAvailableTimeOptions(dateStr: string): string[] {
  const options: string[] = [];
  const isToday = dateStr === '今天' || parseDateValue(dateStr)?.toDateString() === new Date().toDateString();
  const now = new Date();

  let currHour = BUSINESS_START_HOUR;
  let currMin = BUSINESS_START_MIN;
  const endMin = BUSINESS_END_HOUR * 60 + BUSINESS_END_MIN;

  while (currHour * 60 + currMin <= endMin) {
    const timeStr = `${String(currHour).padStart(2, '0')}:${String(currMin).padStart(2, '0')}`;
    const isFuture = !isToday || new Date(now.getFullYear(), now.getMonth(), now.getDate(), currHour, currMin) > now;
    const isBooked = isTimeFullyBooked(dateStr, timeStr);
    if (isFuture && !isBooked) {
      options.push(timeStr);
    }
    currMin += 30;
    if (currMin >= 60) {
      currHour += 1;
      currMin -= 60;
    }
  }
  return options;
}

function buildTimeUnavailableMessage(
  reason: TimeUnavailableReason,
  timeValue: string,
  dateStr: string
): { content: string; quickReplies: GuidedQuestion[] } {
  const allTimeOptions = getAvailableTimeOptions(dateStr);
  const displayOptions = allTimeOptions.slice(0, 4);
  const quickReplies = displayOptions.map((t, i) => createQuickReply(`qr-time-${i + 1}`, t));
  if (allTimeOptions.length > 5) {
    quickReplies.push(createQuickReply('qr-view-all-times', '查看全部', 'open_reservation'));
  }

  let content = '';
  const businessHours = `${String(BUSINESS_START_HOUR).padStart(2, '0')}:${String(BUSINESS_START_MIN).padStart(2, '0')}-${String(BUSINESS_END_HOUR).padStart(2, '0')}:${String(BUSINESS_END_MIN).padStart(2, '0')}`;

  switch (reason) {
    case 'business_hours':
      content = `抱歉，「${timeValue}」不在营业时间内哦~门店营业时间为 ${businessHours}。您可以选择以下时段：`;
      break;
    case 'time_passed':
      content = `抱歉，「${timeValue}」已经过了哦~今天只能预约之后的时段。您可以选择以下时段：`;
      break;
    case 'fully_booked':
      content = `抱歉，「${timeValue}」已经约满啦~您可以选择其他时段：`;
      break;
  }

  return { content, quickReplies };
}

function getDateDisplay(dateStr: string): string {
  const d = parseDateValue(dateStr);
  if (!d) return dateStr;
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 11) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(7);
}

function isPositiveAnswer(message: string): boolean {
  const positiveKeywords = ['是', '确认', '好的', '对', '没问题', '可以', '嗯', '行', 'ok', 'OK', '好'];
  return positiveKeywords.some((keyword) => message.includes(keyword));
}

function isNegativeAnswer(message: string): boolean {
  const negativeKeywords = ['不', '否', '算了', '不用', '不要', '取消', '换'];
  return negativeKeywords.some((keyword) => message.includes(keyword));
}

function getLastPhone(): string | null {
  try {
    return localStorage.getItem(LAST_PHONE_KEY);
  } catch {
    return null;
  }
}

function saveLastPhone(phone: string): void {
  try {
    localStorage.setItem(LAST_PHONE_KEY, phone);
  } catch {
  }
}

function isOrderUnused(orderCard: any): boolean {
  const mainStatus = orderCard.mainStatus || '';
  const orderStatus = orderCard.orderStatus || orderCard.status || '';
  const statusText = orderCard.statusText || '';
  
  if (mainStatus === 'unused') return true;
  if (orderStatus === 'unused') return true;
  if (statusText === '待使用') return true;
  return false;
}

function getOrderCategory(orderCard: any): string {
  return orderCard.category || orderCard.orderCategory || orderCard.industry || orderCard.businessType || orderCard.type || '';
}

function isFoodCategory(orderCard: any): boolean {
  const cat = getOrderCategory(orderCard);
  const label = orderCard.categoryLabel || '';
  return cat === 'food' || label === '餐饮' || label === '美食';
}

function isGeneralCategory(orderCard: any): boolean {
  const cat = getOrderCategory(orderCard);
  const label = orderCard.categoryLabel || '';
  return cat === 'general' || label === '综合' || label === '休闲娱乐' || label === '丽人';
}

function hasSelfOrderOrDelivery(orderCard: any): boolean {
  const redeemMethod = orderCard.redeemMethod || orderCard.fulfillmentType || '';
  const redeemTypes = orderCard.redeemTypes || [];
  if (redeemMethod === 'self_order' || redeemMethod === 'delivery') return true;
  if (redeemTypes.includes('self_order') || redeemTypes.includes('order') || redeemTypes.includes('delivery')) return true;
  return false;
}

function canOrderBeReserved(orderCard: any): { canReserve: boolean; reason?: string } {
  if (!isOrderUnused(orderCard)) {
    return { canReserve: false, reason: 'status' };
  }
  
  if (isGeneralCategory(orderCard)) {
    return { canReserve: true };
  }
  
  if (isFoodCategory(orderCard)) {
    if (hasSelfOrderOrDelivery(orderCard)) {
      return { canReserve: false, reason: 'category' };
    }
    return { canReserve: true };
  }
  
  return { canReserve: false, reason: 'category' };
}

export function handleReservationIntent(
  message: string,
  context: NluContext
): NluResponse {
  const { dialogState, orderCard } = context;
  const reservationStep = dialogState.reservationStep || 'idle';

  if (reservationStep === 'collecting_info') {
    return handleReservationCollectInfo(message, context);
  }

  if (reservationStep === 'collecting_phone') {
    return handleReservationCollectPhone(message, context);
  }

  if (reservationStep === 'confirming') {
    return handleReservationConfirm(message, context);
  }

  if (reservationStep === 'completed') {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '您的预约已提交，如需修改或取消请随时告诉我~',
        },
      ],
      newDialogState: dialogState,
    };
  }

  if (reservationStep === 'selecting_order') {
    if (orderCard) {
      return validateAndStartCollection(orderCard, context);
    }
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '请选择要预约的订单',
          quickReplies: [createQuickReply('qr-select-order', '选择订单', 'open_order_selector')],
        },
      ],
      newDialogState: dialogState,
    };
  }

  if (reservationStep === 'validating_order' && orderCard) {
    return validateAndStartCollection(orderCard, context);
  }

  if (orderCard) {
    if (reservationStep === 'idle' || !dialogState.currentIntent) {
      return handleReservationWithContext(orderCard, context);
    }
  }

  return handleReservationWithoutContext(context);
}

function handleReservationWithoutContext(context: NluContext): NluResponse {
  const { dialogState } = context;

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '请选择要预约的订单',
        quickReplies: [createQuickReply('qr-select-order', '选择订单', 'open_order_selector')],
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'reservation',
      currentStep: 'selecting_order',
      reservationStep: 'selecting_order',
      entities: {},
    },
  };
}

function validateAndStartCollection(
  orderCard: any,
  context: NluContext
): NluResponse {
  const { dialogState, reservationsByOrder } = context;

  const { canReserve, reason } = canOrderBeReserved(orderCard);

  if (!canReserve) {
    const content = reason === 'status'
      ? '仅待使用订单支持预约，请选择其他订单'
      : '该订单不支持预约，可选择正餐、休闲娱乐、丽人等订单预约';
    
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content,
          quickReplies: [createQuickReply('qr-reselect-order', '重新选择', 'open_order_selector')],
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'reservation',
        currentStep: 'selecting_order',
        reservationStep: 'selecting_order',
      },
    };
  }

  const storeName = orderCard.storeName || '';
  const orderId = orderCard.id || '';

  if (reservationsByOrder && orderId) {
    const existingReservation = reservationsByOrder[orderId];
    if (existingReservation && (existingReservation.acceptStatus === 'pending' || existingReservation.acceptStatus === 'accepted')) {
      const statusText = existingReservation.acceptStatus === 'pending' ? '商家确认中' : '已预约成功';
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content: `<span class="ai-reservation-hint">您的预约「${statusText}」，可自行修改或取消预约</span>`,
            reservationInfo: existingReservation,
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'reservation',
          currentStep: 'idle',
          reservationStep: 'idle',
        },
      };
    }
  }

  const newEntities = {
    ...dialogState.entities,
    storeName,
    orderId,
  };

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: `请告诉我你要预约哪天、几点、几个人，我会帮你预约最近的门店<strong>「${storeName}」</strong>`,
        quickReplies: [
          createQuickReply('qr-change-store', '更换门店', 'open_reservation'),
          createQuickReply('qr-self-reserve', '自己预约', 'open_reservation'),
        ],
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'reservation',
      currentStep: 'collecting_info',
      reservationStep: 'collecting_info',
      entities: newEntities,
      data: {
        ...dialogState.data,
        orderId,
        storeName,
        orderStatus: isOrderUnused(orderCard) ? 'unused' : '',
        category: getOrderCategory(orderCard),
      },
    },
  };
}

function handleReservationWithContext(
  orderCard: any,
  context: NluContext
): NluResponse {
  const { dialogState } = context;

  if ((dialogState.reservationStep || 'idle') === 'idle' || !dialogState.currentIntent) {
    return validateAndStartCollection(orderCard, context);
  }

  return handleReservationIntent('', context);
}

function handleReservationCollectInfo(
  message: string,
  context: NluContext
): NluResponse {
  const { dialogState } = context;
  const entities = { ...dialogState.entities };

  const hasDate = !!entities.date;
  const hasTime = !!entities.time;
  const hasPeople = !!entities.peopleCount;

  const missingItems: string[] = [];
  if (!hasDate) missingItems.push('日期');
  if (!hasTime) missingItems.push('时间');
  if (!hasPeople) missingItems.push('人数');

  const dateEntity = extractDate(message);
  const timeEntity = extractTime(message);
  const peopleEntity = extractPeopleCount(message);

  if (dateEntity && dateEntity.value) {
    entities.date = dateEntity.value;
  }
  if (timeEntity && timeEntity.value) {
    entities.time = timeEntity.value;
  }
  if (peopleEntity && peopleEntity.value) {
    entities.peopleCount = peopleEntity.value;
  }

  if (!peopleEntity && missingItems.includes('人数') && isPureNumber(message)) {
    const num = parseInt(message.trim(), 10);
    if (!isNaN(num)) {
      entities.peopleCount = num.toString();
    }
  }

  if (dateEntity && dateEntity.value && !isDateWithinRange(dateEntity.value)) {
    const dateOptions = getAvailableDateOptions();
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: `抱歉，暂不支持预约「${dateEntity.value}」。目前可预约未来 7 天内的时段，可选日期：\n${dateOptions.join('、')}`,
          quickReplies: [
            createQuickReply('qr-date-1', dateOptions[0].replace(/\(.*\)/, '')),
            createQuickReply('qr-date-2', dateOptions[1].replace(/\(.*\)/, '')),
            createQuickReply('qr-date-3', dateOptions[2].replace(/\(.*\)/, '')),
          ],
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'reservation',
        currentStep: 'collecting_info',
        reservationStep: 'collecting_info',
        entities,
      },
    };
  }

  if (timeEntity && timeEntity.value) {
    const refDate = entities.date || '明天';
    const unavailableReason = getTimeUnavailableReason(refDate, timeEntity.value);
    if (unavailableReason) {
      const { content, quickReplies } = buildTimeUnavailableMessage(unavailableReason, timeEntity.value, refDate);
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content,
            quickReplies,
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'reservation',
          currentStep: 'collecting_info',
          reservationStep: 'collecting_info',
          entities,
        },
      };
    }
  }

  const peopleCount = entities.peopleCount ? parseInt(entities.peopleCount, 10) : null;
  if (peopleCount !== null && (peopleCount < MIN_PEOPLE || peopleCount > MAX_PEOPLE)) {
    const cleanEntities = { ...entities };
    delete cleanEntities.peopleCount;
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: `抱歉，当前可预约人数为 ${MIN_PEOPLE}-${MAX_PEOPLE} 人，请重新输入人数~`,
          quickReplies: [
            createQuickReply('qr-pax-1', '2人'),
            createQuickReply('qr-pax-2', '4人'),
            createQuickReply('qr-pax-3', '6人'),
          ],
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'reservation',
        currentStep: 'collecting_info',
        reservationStep: 'collecting_info',
        entities: cleanEntities,
      },
    };
  }

  const newHasDate = !!entities.date;
  const newHasTime = !!entities.time;
  const newHasPeople = !!entities.peopleCount;

  const newMissingItems: string[] = [];
  if (!newHasDate) newMissingItems.push('日期');
  if (!newHasTime) newMissingItems.push('时间');
  if (!newHasPeople) newMissingItems.push('人数');

  if (newMissingItems.length > 0) {
    const collectedParts: string[] = [];
    if (newHasDate) collectedParts.push(`「${entities.date}」`);
    if (newHasTime) collectedParts.push(`「${entities.time}」`);
    if (newHasPeople) collectedParts.push(`「${entities.peopleCount}人」`);

    let reply = '';
    if (collectedParts.length > 0) {
      reply = `好的，已收到${collectedParts.join('、')}。`;
    }

    if (newMissingItems.length === 3) {
      reply += '请告诉我你要预约的日期、时间和人数哦~';
    } else if (newMissingItems.length === 2) {
      reply += `请问${newMissingItems[0]}和${newMissingItems[1]}呢？`;
    } else if (newMissingItems.length === 1) {
      const item = newMissingItems[0];
      const examples: Record<string, string> = {
        '日期': '如：明天、周六、7.10',
        '时间': '如：18:00、六点半、晚上7点',
        '人数': '如：4人、两位、6个人',
      };
      reply += `请问${item}是多少呢？${examples[item] || ''}`;
    }

    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: reply,
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'reservation',
        currentStep: 'collecting_info',
        reservationStep: 'collecting_info',
        entities,
      },
    };
  }

  return startCollectingPhone(entities, dialogState);
}

function startCollectingPhone(
  entities: Record<string, string>,
  dialogState: NluContext['dialogState']
): NluResponse {
  const storeName = entities.storeName || (dialogState.data?.storeName as string) || '';

  let phone = entities.phone || '';
  let phoneFromLocal = false;

  if (!phone) {
    const lastPhone = getLastPhone();
    if (lastPhone) {
      phone = lastPhone;
      phoneFromLocal = true;
    }
  }

  if (phone) {
    const masked = maskPhone(phone);
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: `好的，您要预约<strong>${storeName}</strong>「<strong>${entities.date}</strong>」「<strong>${entities.time}</strong>」「<strong>${entities.peopleCount}人</strong>」；是否留您的 ${masked} 手机号进行预约？可回答是，如需变更手机号可直接输入`,
          quickReplies: [
            {
              id: 'confirm-phone-reservation',
              question: '确认',
              score: 1,
              priority: 1,
            },
          ],
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: 'reservation',
        currentStep: 'collecting_phone',
        reservationStep: 'collecting_phone',
        entities: {
          ...entities,
          phone,
        },
        data: {
          ...dialogState.data,
          lastPhone: phoneFromLocal ? phone : dialogState.data?.lastPhone,
          phoneConfirmed: false,
        },
      },
    };
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: `好的，您要预约<strong>${storeName}</strong>「<strong>${entities.date}</strong>」「<strong>${entities.time}</strong>」「<strong>${entities.peopleCount}人</strong>」；请输入您的 11 位手机号，方便商家联系您`,
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'reservation',
      currentStep: 'collecting_phone',
      reservationStep: 'collecting_phone',
      entities,
    },
  };
}

function handleReservationCollectPhone(
  message: string,
  context: NluContext
): NluResponse {
  const { dialogState } = context;
  const entities = { ...dialogState.entities };
  const lastPhone = getLastPhone();

  if (lastPhone && isPositiveAnswer(message)) {
    saveLastPhone(lastPhone);
    entities.phone = lastPhone;
    return submitReservation(entities, context);
  }

  const dateEntity = extractDate(message);
  const timeEntity = extractTime(message);
  const peopleEntity = extractPeopleCount(message);
  const phoneEntity = extractPhone(message);

  if (dateEntity && dateEntity.value) {
    if (!isDateWithinRange(dateEntity.value)) {
      const dateOptions = getAvailableDateOptions();
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content: `抱歉，暂不支持预约「${dateEntity.value}」。目前可预约未来 7 天内的时段，可选日期：\n${dateOptions.join('、')}`,
            quickReplies: [
              createQuickReply('qr-date-1', dateOptions[0].replace(/\(.*\)/, '')),
              createQuickReply('qr-date-2', dateOptions[1].replace(/\(.*\)/, '')),
              createQuickReply('qr-date-3', dateOptions[2].replace(/\(.*\)/, '')),
            ],
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'reservation',
          currentStep: 'collecting_phone',
          reservationStep: 'collecting_phone',
          entities,
        },
      };
    }
    entities.date = dateEntity.value;
  }

  if (timeEntity && timeEntity.value) {
    const refDate = entities.date || '明天';
    const unavailableReason = getTimeUnavailableReason(refDate, timeEntity.value);
    if (unavailableReason) {
      const { content, quickReplies } = buildTimeUnavailableMessage(unavailableReason, timeEntity.value, refDate);
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content,
            quickReplies,
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'reservation',
          currentStep: 'collecting_phone',
          reservationStep: 'collecting_phone',
          entities,
        },
      };
    }
    entities.time = timeEntity.value;
  }

  if (peopleEntity && peopleEntity.value) {
    const peopleCount = parseInt(peopleEntity.value, 10);
    if (peopleCount < MIN_PEOPLE || peopleCount > MAX_PEOPLE) {
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content: `抱歉，当前可预约人数为 ${MIN_PEOPLE}-${MAX_PEOPLE} 人，请重新输入人数~`,
            quickReplies: [
              createQuickReply('qr-pax-1', '2人'),
              createQuickReply('qr-pax-2', '4人'),
              createQuickReply('qr-pax-3', '6人'),
            ],
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'reservation',
          currentStep: 'collecting_phone',
          reservationStep: 'collecting_phone',
          entities,
        },
      };
    }
    entities.peopleCount = peopleEntity.value;
  }

  let hasPhoneChange = false;

  if (phoneEntity && phoneEntity.value && phoneEntity.value !== entities.phone) {
    entities.phone = phoneEntity.value;
    saveLastPhone(phoneEntity.value);
    hasPhoneChange = true;
  }

  if (!phoneEntity && isPureNumber(message) && message.trim().length === 11) {
    const phoneEntityFromPureNumber = extractPhone(message);
    if (phoneEntityFromPureNumber && phoneEntityFromPureNumber.value && phoneEntityFromPureNumber.value !== entities.phone) {
      entities.phone = phoneEntityFromPureNumber.value;
      saveLastPhone(phoneEntityFromPureNumber.value);
      hasPhoneChange = true;
    }
  }

  if (dateEntity || timeEntity || peopleEntity || hasPhoneChange) {
    return startCollectingPhone(entities, dialogState);
  }

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '请输入正确的 11 位手机号',
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'reservation',
      currentStep: 'collecting_phone',
      reservationStep: 'collecting_phone',
      entities,
    },
  };
}

function submitReservation(
  entities: Record<string, string>,
  context: NluContext
): NluResponse {
  const { dialogState } = context;
  const storeName = entities.storeName || (dialogState.data?.storeName as string) || '';
  const orderId = entities.orderId || (dialogState.data?.orderId as string) || '';
  const phone = entities.phone || '';
  const orderCard = context.orderCard;

  const reservationInfo = {
    ...MOCK_RESERVATION_PENDING,
    orderId,
    storeName,
    storeAddress: (orderCard as any)?.storeAddress || (dialogState.data as any)?.storeAddress || '',
    businessHours: (orderCard as any)?.businessHours || (dialogState.data as any)?.businessHours || '10:00-22:00',
    arrivalTime: `${getDateDisplay(entities.date || '')} ${entities.time}`,
    pax: parseInt(entities.peopleCount || '2') || 2,
    phone: maskPhone(phone),
    acceptStatus: 'pending' as const,
    acceptDeadlineAt: Date.now() + 5 * 60 * 1000,
    estimatedAcceptTime: '30秒内',
    reservationNo: 'YY' + Date.now(),
  };

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: '正在为您提交预约申请，请稍候...',
        delay: 1000,
      },
      {
        role: 'assistant',
        contentType: 'text',
        content: '商家确认后会第一时间通知您。',
        reservationInfo,
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'reservation',
      currentStep: 'completed',
      reservationStep: 'completed',
      entities,
    },
  };
}

function startConfirm(
  entities: Record<string, string>,
  dialogState: NluContext['dialogState']
): NluResponse {
  const storeName = entities.storeName || (dialogState.data?.storeName as string) || '';
  const maskedPhone = entities.phone ? maskPhone(entities.phone) : '';

  const confirmContent =
    `帮您核对一下预约信息：\n` +
    `日期：<strong>${entities.date}</strong>\n` +
    `时间：<strong>${entities.time}</strong>\n` +
    `人数：<strong>${entities.peopleCount}人</strong>\n` +
    `门店：<strong>${storeName}</strong>\n` +
    `手机号：<strong>${maskedPhone}</strong>\n\n` +
    `请问是否确认预约？`;

  return {
    messages: [
      {
        role: 'assistant',
        contentType: 'text',
        content: confirmContent,
        quickReplies: [
          createQuickReply('qr-cancel', '取消'),
          createQuickReply('qr-confirm', '确认预约'),
        ],
      },
    ],
    newDialogState: {
      ...dialogState,
      currentIntent: 'reservation',
      currentStep: 'confirming',
      reservationStep: 'confirming',
      entities,
    },
  };
}

function handleReservationConfirm(
  message: string,
  context: NluContext
): NluResponse {
  const { dialogState } = context;
  const entities = { ...dialogState.entities };

  const isYes = isPositiveAnswer(message) || message === 'qr-confirm';
  const isNo = isNegativeAnswer(message) || message === 'qr-cancel';

  if (isNo) {
    return {
      messages: [
        {
          role: 'assistant',
          contentType: 'text',
          content: '好的，预约已取消，需要时随时告诉我~',
        },
      ],
      newDialogState: {
        ...dialogState,
        currentIntent: null,
        currentStep: 'idle',
        reservationStep: 'idle',
      },
    };
  }

  if (isYes) {
    return submitReservation(entities, context);
  }

  const dateEntity = extractDate(message);
  const timeEntity = extractTime(message);
  const peopleEntity = extractPeopleCount(message);
  const phoneEntity = extractPhone(message);

  if (dateEntity && dateEntity.value) {
    if (!isDateWithinRange(dateEntity.value)) {
      const dateOptions = getAvailableDateOptions();
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content: `抱歉，暂不支持预约「${dateEntity.value}」。目前可预约未来 7 天内的时段，可选日期：\n${dateOptions.join('、')}`,
            quickReplies: [
              createQuickReply('qr-date-1', dateOptions[0].replace(/\(.*\)/, '')),
              createQuickReply('qr-date-2', dateOptions[1].replace(/\(.*\)/, '')),
              createQuickReply('qr-date-3', dateOptions[2].replace(/\(.*\)/, '')),
            ],
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'reservation',
          currentStep: 'confirming',
          reservationStep: 'confirming',
          entities,
        },
      };
    }
    entities.date = dateEntity.value;
  }

  if (timeEntity && timeEntity.value) {
    const refDate = entities.date || '明天';
    const unavailableReason = getTimeUnavailableReason(refDate, timeEntity.value);
    if (unavailableReason) {
      const { content, quickReplies } = buildTimeUnavailableMessage(unavailableReason, timeEntity.value, refDate);
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content,
            quickReplies,
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'reservation',
          currentStep: 'confirming',
          reservationStep: 'confirming',
          entities,
        },
      };
    }
    entities.time = timeEntity.value;
  }

  if (peopleEntity && peopleEntity.value) {
    const peopleCount = parseInt(peopleEntity.value, 10);
    if (peopleCount < MIN_PEOPLE || peopleCount > MAX_PEOPLE) {
      return {
        messages: [
          {
            role: 'assistant',
            contentType: 'text',
            content: `抱歉，当前可预约人数为 ${MIN_PEOPLE}-${MAX_PEOPLE} 人，请重新输入人数~`,
            quickReplies: [
              createQuickReply('qr-pax-1', '2人'),
              createQuickReply('qr-pax-2', '4人'),
              createQuickReply('qr-pax-3', '6人'),
            ],
          },
        ],
        newDialogState: {
          ...dialogState,
          currentIntent: 'reservation',
          currentStep: 'confirming',
          reservationStep: 'confirming',
          entities,
        },
      };
    }
    entities.peopleCount = peopleEntity.value;
  }

  let hasPhoneChange = false;

  if (phoneEntity && phoneEntity.value && phoneEntity.value !== entities.phone) {
    entities.phone = phoneEntity.value;
    saveLastPhone(phoneEntity.value);
    hasPhoneChange = true;
  }

  if (!phoneEntity && isPureNumber(message) && message.trim().length === 11) {
    const phoneEntityFromPureNumber = extractPhone(message);
    if (phoneEntityFromPureNumber && phoneEntityFromPureNumber.value && phoneEntityFromPureNumber.value !== entities.phone) {
      entities.phone = phoneEntityFromPureNumber.value;
      saveLastPhone(phoneEntityFromPureNumber.value);
      hasPhoneChange = true;
    }
  }

  if (dateEntity || timeEntity || peopleEntity || hasPhoneChange) {
    return startConfirm(entities, dialogState);
  }

  return startConfirm(entities, dialogState);
}
