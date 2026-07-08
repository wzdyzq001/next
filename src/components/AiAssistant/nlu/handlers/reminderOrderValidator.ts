import { toStandardCategory } from '../../../../types';
import { isFreeReservationOrder, parseReservationTimestamp } from '../reservationReminderUtils';

export interface ReminderValidationResult {
  canSet: boolean;
  reason?: 'status' | 'category' | 'has_booking';
  hint?: string;
  bookingDate?: string;
  reservationTimestamp?: number;
}

const UNUSED_STATUS_KEYWORDS = [
  '待使用', '待预约', '待核销', '未使用',
  'unused', 'pending_use', 'pending_booking',
];

const PENDING_BOOKING_KEYWORDS = [
  '待预约', 'pending_booking', 'unredeemed', '待使用',
];

const BOOKING_CONFIRMING_KEYWORDS = [
  '预约确认中', '商家确认中', 'booking_confirming', 'confirming',
];

const BOOKING_CONFIRMED_KEYWORDS = [
  '预约成功', '已预约', 'booking_confirmed', 'confirmed', '已出行', 'checked_in',
];

function isOrderUnused(orderCard: any): boolean {
  const mainStatus = orderCard.mainStatus || '';
  const statusText = orderCard.statusText || '';
  const orderStatus = orderCard.orderStatus || orderCard.status || '';

  const allStatusFields = [mainStatus, statusText, orderStatus];
  return allStatusFields.some((field) =>
    UNUSED_STATUS_KEYWORDS.some((keyword) =>
      String(field).toLowerCase() === keyword.toLowerCase()
    )
  );
}

function getStandardCategory(orderCard: any): string {
  const category =
    orderCard.category ||
    orderCard.orderCategory ||
    orderCard.industry ||
    orderCard.businessType ||
    orderCard.type ||
    '';
  return toStandardCategory(category);
}

function isVacationSubCategory(orderCard: any): boolean {
  const category = orderCard.category || orderCard.orderCategory || '';
  const subCategory = orderCard.subCategory || '';
  const categoryLabel = orderCard.categoryLabel || '';

  if (category === 'vacation' || subCategory === 'vacation') return true;
  if (categoryLabel === '度假') return true;
  return false;
}

function getScenicProductType(orderCard: any): string {
  return (
    orderCard.scenicProductType ||
    orderCard.productType ||
    orderCard.subCategory ||
    orderCard.category ||
    ''
  );
}

function getHotelProductType(orderCard: any): string {
  return (
    orderCard.hotelProductType ||
    orderCard.productType ||
    orderCard.subCategory ||
    orderCard.category ||
    ''
  );
}

function getTravelProductType(orderCard: any): string {
  return (
    orderCard.travelProductType ||
    orderCard.productType ||
    orderCard.subCategory ||
    orderCard.category ||
    ''
  );
}

function getBookingStatus(orderCard: any): string {
  return (
    orderCard.bookingStatus ||
    orderCard.subStatus ||
    orderCard.reservationStatus ||
    orderCard.appointmentStatus ||
    ''
  );
}

function matchesKeywords(status: string, keywords: string[]): boolean {
  const statusLower = String(status).toLowerCase();
  return keywords.some((keyword) => statusLower === keyword.toLowerCase());
}

function getEffectiveBookingStatus(orderCard: any): string {
  const bookingStatus = getBookingStatus(orderCard);
  if (bookingStatus) return bookingStatus;
  return orderCard.statusText || '';
}

function isPresalePendingBooking(orderCard: any, category: string): boolean {
  let productType = '';
  if (category === 'scenic') {
    productType = getScenicProductType(orderCard);
  } else if (category === 'hotel') {
    productType = getHotelProductType(orderCard);
  } else if (category === 'travel') {
    productType = getTravelProductType(orderCard);
  }

  if (productType !== 'presale_voucher') return false;

  const bookingStatus = getEffectiveBookingStatus(orderCard);
  return matchesKeywords(bookingStatus, PENDING_BOOKING_KEYWORDS);
}

function isPresaleBooked(orderCard: any, category: string): boolean {
  let productType = '';
  if (category === 'scenic') {
    productType = getScenicProductType(orderCard);
  } else if (category === 'hotel') {
    productType = getHotelProductType(orderCard);
  } else if (category === 'travel') {
    productType = getTravelProductType(orderCard);
  }

  if (productType !== 'presale_voucher') return false;

  const bookingStatus = getEffectiveBookingStatus(orderCard);
  return (
    matchesKeywords(bookingStatus, BOOKING_CONFIRMING_KEYWORDS) ||
    matchesKeywords(bookingStatus, BOOKING_CONFIRMED_KEYWORDS)
  );
}

function getBookingDate(orderCard: any): string {
  return (
    orderCard.bookingDate ||
    orderCard.travelDate ||
    orderCard.checkInDate ||
    orderCard.useDate ||
    orderCard.arrivalDate ||
    ''
  );
}

function getBookingTime(orderCard: any): string {
  return (
    orderCard.bookingTime ||
    orderCard.reservationTime ||
    orderCard.appointmentTime ||
    ''
  );
}

function getReservationTimestamp(orderCard: any): number | undefined {
  const bookingDate = getBookingDate(orderCard);
  if (!bookingDate) return undefined;

  const bookingTime = getBookingTime(orderCard);
  const timeStr = bookingTime || '18:00';

  const timestamp = parseReservationTimestamp(bookingDate, timeStr);
  return timestamp ?? undefined;
}

function isOrderBooked(orderCard: any): boolean {
  const bookingStatus = getEffectiveBookingStatus(orderCard);
  return (
    matchesKeywords(bookingStatus, BOOKING_CONFIRMING_KEYWORDS) ||
    matchesKeywords(bookingStatus, BOOKING_CONFIRMED_KEYWORDS)
  );
}

export function canOrderSetReminder(orderCard: any): ReminderValidationResult {
  if (!isOrderUnused(orderCard)) {
    return {
      canSet: false,
      reason: 'status',
      hint: '仅待使用订单支持设置使用提醒，请选择其他订单',
    };
  }

  if (isFreeReservationOrder(orderCard) && isOrderBooked(orderCard)) {
    const reservationTimestamp = getReservationTimestamp(orderCard);
    return {
      canSet: true,
      reservationTimestamp,
    };
  }

  const stdCategory = getStandardCategory(orderCard);

  if (stdCategory === 'food') {
    return { canSet: true };
  }

  if (stdCategory === 'general') {
    if (isVacationSubCategory(orderCard)) {
      if (isPresalePendingBooking(orderCard, 'travel')) {
        return { canSet: true };
      }
      if (isPresaleBooked(orderCard, 'travel')) {
        const bookingDate = getBookingDate(orderCard);
        return {
          canSet: false,
          reason: 'has_booking',
          hint: `请按预约时间"${bookingDate}"出行`,
          bookingDate,
        };
      }
      return {
        canSet: false,
        reason: 'category',
        hint: '该订单不支持设置使用提醒，请选择其他订单',
      };
    }
    return { canSet: true };
  }

  if (stdCategory === 'scenic') {
    const productType = getScenicProductType(orderCard);

    if (productType === 'group_buy' || productType === 'group_voucher') {
      return { canSet: true };
    }

    if (productType === 'presale_voucher') {
      if (isPresalePendingBooking(orderCard, 'scenic')) {
        return { canSet: true };
      }
      if (isPresaleBooked(orderCard, 'scenic')) {
        const bookingDate = getBookingDate(orderCard);
        return {
          canSet: false,
          reason: 'has_booking',
          hint: `请按预约时间"${bookingDate}"出行`,
          bookingDate,
        };
      }
    }

    if (productType === 'calendar_ticket') {
      const bookingDate = getBookingDate(orderCard);
      return {
        canSet: false,
        reason: 'has_booking',
        hint: `请按预约时间"${bookingDate}"出行`,
        bookingDate,
      };
    }

    return {
      canSet: false,
      reason: 'category',
      hint: '该订单不支持设置使用提醒，请选择其他订单',
    };
  }

  if (stdCategory === 'hotel') {
    const productType = getHotelProductType(orderCard);

    if (productType === 'presale_voucher') {
      if (isPresalePendingBooking(orderCard, 'hotel')) {
        return { canSet: true };
      }
      if (isPresaleBooked(orderCard, 'hotel')) {
        const bookingDate = getBookingDate(orderCard);
        return {
          canSet: false,
          reason: 'has_booking',
          hint: `请按预约时间"${bookingDate}"出行`,
          bookingDate,
        };
      }
    }

    if (productType === 'calendar_room') {
      const bookingDate = getBookingDate(orderCard);
      return {
        canSet: false,
        reason: 'has_booking',
        hint: `请按预约时间"${bookingDate}"出行`,
        bookingDate,
      };
    }

    return {
      canSet: false,
      reason: 'category',
      hint: '该订单不支持设置使用提醒，请选择其他订单',
    };
  }

  if (stdCategory === 'travel') {
    const productType = getTravelProductType(orderCard);

    if (productType === 'presale_voucher') {
      if (isPresalePendingBooking(orderCard, 'travel')) {
        return { canSet: true };
      }
      if (isPresaleBooked(orderCard, 'travel')) {
        const bookingDate = getBookingDate(orderCard);
        return {
          canSet: false,
          reason: 'has_booking',
          hint: `请按预约时间"${bookingDate}"出行`,
          bookingDate,
        };
      }
    }

    return {
      canSet: false,
      reason: 'category',
      hint: '该订单不支持设置使用提醒，请选择其他订单',
    };
  }

  return {
    canSet: false,
    reason: 'category',
    hint: '该订单不支持设置使用提醒，请选择其他订单',
  };
}
