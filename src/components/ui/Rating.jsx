import React from 'react';
import { Star } from 'lucide-react';

const Rating = ({
  value = 5.0,
  count,
  showCount = true,
  singleStar = true,
  size = 16,
  className = '',
}) => {
  const roundedValue = Math.round(value * 10) / 10;

  if (singleStar) {
    return (
      <div className={`rating-stars items-center gap-xs flex ${className}`} style={{ fontSize: `${size * 0.9}px` }}>
        <Star size={size} fill="currentColor" stroke="currentColor" />
        <span style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-main)' }}>
          {roundedValue.toFixed(1)}
        </span>
        {showCount && count !== undefined && (
          <span style={{ color: 'var(--color-text-light)', fontWeight: 'var(--weight-normal)' }}>
            ({count})
          </span>
        )}
      </div>
    );
  }

  // Draw 5 stars
  return (
    <div className={`rating-stars items-center gap-2xs flex ${className}`}>
      {[1, 2, 3, 4, 5].map((index) => {
        const isFilled = index <= value;
        return (
          <Star
            key={index}
            size={size}
            fill={isFilled ? 'currentColor' : 'none'}
            stroke="currentColor"
          />
        );
      })}
      {showCount && count !== undefined && (
        <span style={{ color: 'var(--color-text-light)', marginLeft: 'var(--space-xs)', fontSize: 'var(--text-sm)' }}>
          ({count})
        </span>
      )}
    </div>
  );
};

export default Rating;
