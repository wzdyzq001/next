import React, { useMemo } from 'react';
import type { ReachConfig, ReachMatchContext, ReachBubbleType } from '../types';
import { resolveLongText } from '../reachEngine';
import '../styles/reach.css';

export interface ReachBubbleProps {
  config: ReachConfig;
  ctx: ReachMatchContext;
  bubbleType: ReachBubbleType;
  arrowOffset?: number;
  isHidden?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export const ReachBubble: React.FC<ReachBubbleProps> = ({
  config,
  ctx,
  bubbleType,
  arrowOffset = 24,
  isHidden = false,
  onClick,
}) => {
  const displayText = useMemo(() => {
    if (bubbleType === 'short') {
      return config.shortText;
    }
    return resolveLongText(config, ctx);
  }, [config, ctx, bubbleType]);

  const bubbleClass = `ai-reach-bubble ai-reach-bubble-${bubbleType}${isHidden ? ' ai-reach-bubble-hidden' : ''}`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e as unknown as React.MouseEvent);
    }
  };

  return (
    <div
      className={bubbleClass}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="ai-reach-bubble-content">
        <span className="ai-reach-bubble-icon">{config.icon}</span>
        <span className="ai-reach-bubble-text">{displayText}</span>
      </div>
      <div
        className="ai-reach-bubble-arrow-down"
        style={{ left: `${arrowOffset}px` }}
      />
    </div>
  );
};

export default ReachBubble;
