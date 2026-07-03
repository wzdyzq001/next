import React, { useEffect, useRef } from 'react';
import type { ChatMessage, QuickReplyOption } from '../types';
import { FullOrderCard } from '../../AiAssistant/OrderCard/FullOrderCard';
import ReservationInfoCard from '../../AiAssistant/ReservationInfoCard';
import RedeemReminderCard from '../../AiAssistant/RedeemReminderCard';
import '../nluDemo.css';

interface MessageBubbleProps {
  message: ChatMessage;
  onQuickReply?: (option: QuickReplyOption) => void;
  onOrderAction?: (label: string) => void;
  onSuggestion?: (s: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onQuickReply,
  onOrderAction,
  onSuggestion,
}) => {
  const isUser = message.role === 'user';

  const renderContent = () => {
    if (message.type === 'text' && message.content) {
      return (
        <div className="nlu-demo-msg-bubble">
          <span className="nlu-demo-msg-text" style={{ color: isUser ? '#fff' : '#6b7280' }}>
            {message.content}
          </span>
        </div>
      );
    }

    if (message.type === 'order_card' && message.orderCard) {
      return (
        <div className="nlu-demo-order-card-wrap">
          <FullOrderCard
            order={message.orderCard}
            onActionClick={onOrderAction}
            onSuggestionClick={onSuggestion}
          />
        </div>
      );
    }

    if (message.type === 'reservation_card' && message.reservationCard) {
      return (
        <div className="nlu-demo-reservation-card-wrap">
          <ReservationInfoCard
            data={message.reservationCard}
            now={Date.now()}
            onCancel={() => onOrderAction?.('取消预约')}
            onRebook={() => onOrderAction?.('重新预约')}
          />
        </div>
      );
    }

    if (message.type === 'reminder_card' && message.reminderCard) {
      return (
        <div className="nlu-demo-reminder-card-wrap">
          <RedeemReminderCard
            reminder={message.reminderCard.reminder}
            productName={message.reminderCard.productName}
            onCancel={() => onOrderAction?.('取消提醒')}
            onModify={() => onOrderAction?.('修改提醒时间')}
            onReset={() => onOrderAction?.('重新设置提醒')}
          />
        </div>
      );
    }

    if (message.type === 'quick_replies' && message.content) {
      return (
        <div className="nlu-demo-msg-bubble">
          <span className="nlu-demo-msg-text" style={{ color: isUser ? '#fff' : '#6b7280' }}>
            {message.content}
          </span>
          {message.quickReplies && message.quickReplies.length > 0 && (
            <div className="nlu-demo-quick-replies" style={{ marginTop: '8px' }}>
              {message.quickReplies.map((opt) => (
                <button
                  key={opt.id}
                  className="nlu-demo-quick-btn"
                  onClick={() => onQuickReply?.(opt)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`nlu-demo-msg ${isUser ? 'user' : 'assistant'}`}>
      <div className={`nlu-demo-avatar ${isUser ? 'user' : 'assistant'}`}>
        {isUser ? '👤' : '🤖'}
      </div>
      <div className="nlu-demo-msg-content">
        {renderContent()}
      </div>
    </div>
  );
};

interface ChatWindowProps {
  messages: ChatMessage[];
  isTyping: boolean;
  onQuickReply?: (option: QuickReplyOption) => void;
  onOrderAction?: (label: string) => void;
  onSuggestion?: (s: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isTyping,
  onQuickReply,
  onOrderAction,
  onSuggestion,
}) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="nlu-demo-chat">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          onQuickReply={onQuickReply}
          onOrderAction={onOrderAction}
          onSuggestion={onSuggestion}
        />
      ))}
      {isTyping && (
        <div className="nlu-demo-msg assistant">
          <div className="nlu-demo-avatar assistant">🤖</div>
          <div className="nlu-demo-msg-bubble">
            <div className="nlu-demo-typing">
              <div className="nlu-demo-typing-dot"></div>
              <div className="nlu-demo-typing-dot"></div>
              <div className="nlu-demo-typing-dot"></div>
            </div>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
};
