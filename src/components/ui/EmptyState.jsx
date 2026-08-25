import React from 'react';
import { SearchX, RotateCcw } from 'lucide-react';
import Button from './Button';

const EmptyState = ({
  title = "No services found",
  description = "We couldn't find any services matching your selected filters or search query.",
  onReset
}) => {
  return (
    <div style={{
      padding: 'var(--space-3xl) var(--space-lg)',
      textAlign: 'center',
      background: 'rgba(15, 23, 42, 0.35)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 'var(--radius-xl)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--space-md)',
      margin: 'var(--space-lg) 0',
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-accent)',
      }}>
        <SearchX size={28} />
      </div>

      <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text-main)', margin: 0 }}>
        {title}
      </h3>

      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', maxWidth: '440px', margin: 0, lineHeight: 1.6 }}>
        {description}
      </p>

      {onReset && (
        <Button variant="outline" size="md" onClick={onReset} style={{ marginTop: 'var(--space-xs)' }}>
          <RotateCcw size={14} style={{ marginRight: '6px' }} />
          Clear All Filters
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
