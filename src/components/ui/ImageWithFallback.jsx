import React, { useState } from 'react';
import { Sparkles, Layers } from 'lucide-react';

const ImageWithFallback = ({
  src,
  alt = '',
  className = '',
  style = {},
  fallbackText = '',
  icon: CustomIcon = null,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`image-fallback-container ${className}`}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: 'linear-gradient(135deg, var(--color-bg-subtle, #0f172a) 0%, var(--color-bg-muted, #1e293b) 100%)',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
          color: 'var(--color-text-muted, #94a3b8)',
          padding: '12px',
          boxSizing: 'border-box',
          ...style,
        }}
        {...props}
      >
        {CustomIcon ? (
          <CustomIcon size={24} style={{ color: 'var(--color-accent, #10b981)', opacity: 0.8 }} />
        ) : (
          <Sparkles size={24} style={{ color: 'var(--color-accent, #10b981)', opacity: 0.8 }} />
        )}
        {fallbackText && (
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textAlign: 'center', textTransform: 'uppercase' }}>
            {fallbackText}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setHasError(true)}
      {...props}
    />
  );
};

export default ImageWithFallback;
