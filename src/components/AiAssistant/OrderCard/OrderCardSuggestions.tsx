import React, { useRef, useCallback, useState } from 'react';
import './orderCard.css';

interface OrderCardSuggestionsProps {
  suggestions: string[];
  onSuggestionClick?: (s: string) => void;
}

export const OrderCardSuggestions: React.FC<OrderCardSuggestionsProps> = ({ suggestions, onSuggestionClick }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!listRef.current) return;
    isMouseDownRef.current = true;
    isDraggingRef.current = false;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX;
    startScrollLeftRef.current = listRef.current.scrollLeft;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isMouseDownRef.current || !listRef.current) return;
    const walk = e.pageX - startXRef.current;
    if (Math.abs(walk) > 3) {
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        setIsDragging(true);
      }
      hasDraggedRef.current = true;
      listRef.current.scrollLeft = startScrollLeftRef.current - walk;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isMouseDownRef.current = false;
    setIsDragging(false);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 0);
  }, []);

  const handleMouseLeave = useCallback(() => {
    isMouseDownRef.current = false;
    setIsDragging(false);
    isDraggingRef.current = false;
  }, []);

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const displaySuggestions = suggestions.slice(0, 5);

  return (
    <div className="oc-card-suggestions">
      <div className="oc-suggestions-row">
        <span className="oc-suggestions-label">猜你想问</span>
        <div
          ref={listRef}
          className={`oc-suggestions-list ${isDragging ? 'dragging' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {displaySuggestions.map((s, i) => (
            <button
              key={i}
              className="oc-suggestion-btn"
              onClick={(e) => {
                const dragged = hasDraggedRef.current;
                hasDraggedRef.current = false;
                if (dragged) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                e.stopPropagation();
                onSuggestionClick?.(s);
              }}
            >
              {s.replace(/\？|\?/g, '')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
