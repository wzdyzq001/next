import { describe, it, expect } from 'vitest';
import { hasOrderCardInMessages } from './messageUtils';
import type { ChatMessage } from './types';

const createMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'msg-1',
  role: 'assistant',
  contentType: 'text',
  content: 'test',
  timestamp: Date.now(),
  ...overrides,
});

describe('messageUtils', () => {
  describe('hasOrderCardInMessages', () => {
    it('空消息列表返回 false', () => {
      expect(hasOrderCardInMessages([])).toBe(false);
    });

    it('纯文本消息返回 false', () => {
      const messages = [createMessage({ contentType: 'text', content: '你好' })];
      expect(hasOrderCardInMessages(messages)).toBe(false);
    });

    it('包含 orderCard 的消息返回 true', () => {
      const messages = [
        createMessage(),
        createMessage({
          orderCard: {
            orderId: 'order-1',
            productName: '测试商品',
            status: 'pending',
          } as any,
        }),
      ];
      expect(hasOrderCardInMessages(messages)).toBe(true);
    });

    it('包含非空 orderList 的消息返回 true', () => {
      const messages = [
        createMessage(),
        createMessage({
          orderList: [
            { orderId: 'order-1', productName: '测试商品', status: 'pending' } as any,
          ],
        }),
      ];
      expect(hasOrderCardInMessages(messages)).toBe(true);
    });

    it('orderList 为空数组时返回 false', () => {
      const messages = [
        createMessage({
          orderList: [],
        }),
      ];
      expect(hasOrderCardInMessages(messages)).toBe(false);
    });

    it('orderList 为 undefined 时返回 false', () => {
      const messages = [createMessage({ orderList: undefined })];
      expect(hasOrderCardInMessages(messages)).toBe(false);
    });

    it('多条消息中有一条有订单卡片返回 true', () => {
      const messages = [
        createMessage({ content: '第一条消息' }),
        createMessage({ content: '第二条消息' }),
        createMessage({
          orderCard: { orderId: 'order-1', productName: '测试', status: 'pending' } as any,
        }),
        createMessage({ content: '第四条消息' }),
      ];
      expect(hasOrderCardInMessages(messages)).toBe(true);
    });

    it('多条消息都没有订单卡片返回 false', () => {
      const messages = [
        createMessage({ content: '第一条' }),
        createMessage({ content: '第二条' }),
        createMessage({ content: '第三条' }),
      ];
      expect(hasOrderCardInMessages(messages)).toBe(false);
    });
  });
});
