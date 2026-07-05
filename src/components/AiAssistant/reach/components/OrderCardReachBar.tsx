import React, { useMemo } from 'react';
import type { ReachConfig, ReachMatchContext } from '../types';
import { resolveLongText } from '../reachEngine';
import '../styles/reach.css';

export interface OrderCardReachBarProps {
  config: ReachConfig;
  ctx: ReachMatchContext;
  onClick?: (e: React.MouseEvent) => void;
}

export const OrderCardReachBar: React.FC<OrderCardReachBarProps> = ({
  config,
  ctx,
  onClick,
}) => {
  const displayText = useMemo(() => {
    return resolveLongText(config, ctx);
  }, [config, ctx]);

  const isClickable = config.displayMode === 'guide_clickable';

  const handleClick = (e: React.MouseEvent) => {
    if (!isClickable) return;
    onClick?.(e);
  };

  const barClass = `oc-reach-bar oc-reach-bar-${config.displayMode}`;

  return (
    <div
      className={barClass}
      onClick={handleClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (!isClickable) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent);
        }
      }}
    >
      <span className="oc-reach-bar-icon">{config.icon}</span>
      <span className="oc-reach-bar-text">{displayText}</span>
      {isClickable && <span className="oc-reach-bar-arrow">›</span>}
      {!isClickable && <span className="oc-reach-bar-space" />}
    </div>
  );
};

export default OrderCardReachBar;
