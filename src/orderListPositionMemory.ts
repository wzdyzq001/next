export interface OrderPositionItem {
  orderId: string;
}

export interface OrderListPositionSnapshot {
  filter: string;
  orderId?: string;
  index: number;
  scrollTop: number;
  savedAt: number;
}

export interface OrderListRestoreTarget {
  orderId?: string;
  index: number;
  scrollTop: number;
}

export const ORDER_LIST_POSITION_STORAGE_KEY = 'pickup-code-chat:order-list-position';

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return Math.min(Math.max(0, index), length - 1);
}

export function createOrderListPositionSnapshot({
  filter,
  orders,
  orderId,
  index,
  scrollTop,
  now = Date.now(),
}: {
  filter: string;
  orders: OrderPositionItem[];
  orderId?: string;
  index: number;
  scrollTop: number;
  now?: number;
}): OrderListPositionSnapshot {
  const matchedIndex = orderId ? orders.findIndex((order) => order.orderId === orderId) : -1;
  const safeIndex = clampIndex(matchedIndex >= 0 ? matchedIndex : index, orders.length);

  return {
    filter,
    orderId: orderId ?? orders[safeIndex]?.orderId,
    index: safeIndex,
    scrollTop: Math.max(0, Math.round(scrollTop)),
    savedAt: now,
  };
}

export function resolveOrderListRestoreTarget({
  snapshot,
  orders,
  filter,
  now = Date.now(),
  maxAgeMs = 30 * 60 * 1000,
}: {
  snapshot: OrderListPositionSnapshot | null | undefined;
  orders: OrderPositionItem[];
  filter: string;
  now?: number;
  maxAgeMs?: number;
}): OrderListRestoreTarget | null {
  if (!snapshot || snapshot.filter !== filter) return null;
  if (maxAgeMs > 0 && now - snapshot.savedAt > maxAgeMs) return null;

  const matchedIndex = snapshot.orderId
    ? orders.findIndex((order) => order.orderId === snapshot.orderId)
    : -1;
  const index = matchedIndex >= 0 ? matchedIndex : clampIndex(snapshot.index, orders.length);

  return {
    orderId: matchedIndex >= 0 ? snapshot.orderId : orders[index]?.orderId,
    index,
    scrollTop: Math.max(0, snapshot.scrollTop),
  };
}

export function readOrderListPositionSnapshot(
  storage: Pick<Storage, 'getItem'> | undefined,
  key = ORDER_LIST_POSITION_STORAGE_KEY,
): OrderListPositionSnapshot | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OrderListPositionSnapshot>;
    if (typeof parsed.filter !== 'string' || typeof parsed.index !== 'number' || typeof parsed.scrollTop !== 'number') {
      return null;
    }
    return {
      filter: parsed.filter,
      orderId: typeof parsed.orderId === 'string' ? parsed.orderId : undefined,
      index: parsed.index,
      scrollTop: parsed.scrollTop,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
    };
  } catch {
    return null;
  }
}

export function writeOrderListPositionSnapshot(
  storage: Pick<Storage, 'setItem'> | undefined,
  snapshot: OrderListPositionSnapshot,
  key = ORDER_LIST_POSITION_STORAGE_KEY,
) {
  if (!storage) return;
  storage.setItem(key, JSON.stringify(snapshot));
}
