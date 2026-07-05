import type { OrderCardData } from './orderCardTypes';

export const deepCloneOrder = (order: OrderCardData): OrderCardData => {
  return JSON.parse(JSON.stringify(order));
};

export const validateOrderConsistency = (
  original: OrderCardData,
  cloned: OrderCardData
): { valid: boolean; mismatchedFields: string[] } => {
  const mismatchedFields: string[] = [];

  const compareFields = (obj1: any, obj2: any, prefix = ''): void => {
    const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

    for (const key of allKeys) {
      const path = prefix ? `${prefix}.${key}` : key;
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];

      if (typeof val1 === 'object' && val1 !== null && typeof val2 === 'object' && val2 !== null) {
        if (Array.isArray(val1) && Array.isArray(val2)) {
          if (val1.length !== val2.length) {
            mismatchedFields.push(path);
            continue;
          }
          for (let i = 0; i < val1.length; i++) {
            compareFields(val1[i], val2[i], `${path}[${i}]`);
          }
        } else {
          compareFields(val1, val2, path);
        }
      } else if (val1 !== val2) {
        if (key === 'id') continue;
        mismatchedFields.push(path);
      }
    }
  };

  compareFields(original, cloned);

  return {
    valid: mismatchedFields.length === 0,
    mismatchedFields,
  };
};

export const generateReorderId = (originalId: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${originalId}-reorder-${timestamp}-${random}`;
};

export const createReorderFromOriginal = (originalOrder: OrderCardData): OrderCardData => {
  const cloned = deepCloneOrder(originalOrder);
  const newId = generateReorderId(originalOrder.id);

  cloned.id = newId;
  cloned.orderStatus = 'pending_pay';
  cloned.orderStatusLabel = '待支付';
  cloned.statusText = '待支付';
  cloned.statusColor = '#ef4444';

  const validation = validateOrderConsistency(originalOrder, { ...cloned, id: originalOrder.id });

  if (!validation.valid) {
    console.warn('[Reorder] 订单数据一致性校验发现差异:', validation.mismatchedFields);
  } else {
    console.log('[Reorder] 订单数据一致性校验通过');
  }

  return cloned;
};
