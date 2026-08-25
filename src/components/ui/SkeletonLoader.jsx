import React from 'react';

const SkeletonLoader = ({ type = 'card', count = 1, className = '', style = {} }) => {
  const baseStyle = {
    background: 'linear-gradient(90deg, var(--border-subtle) 25%, var(--border) 50%, var(--border-subtle) 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-shimmer 1.8s infinite ease-in-out',
    borderRadius: '8px',
  };

  const renderSkeletonItem = (index) => {
    if (type === 'card') {
      return (
        <div
          key={index}
          style={{
            background: 'var(--surface-glass)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            ...style,
          }}
        >
          <div style={{ ...baseStyle, width: '100%', height: '140px', borderRadius: '12px' }} />
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ ...baseStyle, width: '28px', height: '28px', borderRadius: '50%' }} />
            <div style={{ ...baseStyle, width: '50%', height: '14px' }} />
          </div>
          <div style={{ ...baseStyle, width: '85%', height: '16px' }} />
          <div style={{ ...baseStyle, width: '40%', height: '14px', marginTop: 'auto' }} />
        </div>
      );
    }

    if (type === 'text') {
      return (
        <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '8px', ...style }}>
          <div style={{ ...baseStyle, width: '100%', height: '14px' }} />
          <div style={{ ...baseStyle, width: '75%', height: '14px' }} />
        </div>
      );
    }

    return <div key={index} style={{ ...baseStyle, width: '100%', height: '40px', ...style }} />;
  };

  return (
    <>
      <style>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div className={`skeleton-grid ${className}`} style={{ display: 'contents' }}>
        {Array.from({ length: count }).map((_, idx) => renderSkeletonItem(idx))}
      </div>
    </>
  );
};

export default SkeletonLoader;
