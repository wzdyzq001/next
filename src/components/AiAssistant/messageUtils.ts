import type { ChatMessage } from './types';

export function hasOrderCardInMessages(messages: ChatMessage[]): boolean {
  return messages.some(
    (msg) => msg.orderCard || (msg.orderList && msg.orderList.length > 0)
  );
}
