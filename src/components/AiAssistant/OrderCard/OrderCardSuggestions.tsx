import React from 'react';
import './orderCard.css';

interface OrderCardSuggestionsProps {
  suggestions: string[];
  onSuggestionClick?: (s: string) => void;
}

export const OrderCardSuggestions: React.FC<OrderCardSuggestionsProps> = ({ suggestions, onSuggestionClick }) => {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const displaySuggestions = suggestions.slice(0, 3);

  return (
    <div className="oc-card-suggestions">
      <div className="oc-suggestions-list">
        {displaySuggestions.map((s, i) => (
          <button
            key={i}
            className="oc-suggestion-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSuggestionClick?.(s);
            }}
          >
            {s.replace(/\？|\?/g, '')}
          </button>
        ))}
      </div>
    </div>
  );
};
