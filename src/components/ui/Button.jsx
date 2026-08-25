import React from 'react';
import { Link } from 'react-router-dom';

const Button = ({
  children,
  variant = 'primary', // primary, secondary, outline, text, danger
  size = 'md',        // sm, md, lg
  fullWidth = false,
  loading = false,
  disabled = false,
  to,
  href,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const widthClass = fullWidth ? 'btn-full' : '';
  const extraClasses = className ? ` ${className}` : '';
  
  const computedClassName = `${baseClass} ${variantClass} ${sizeClass} ${widthClass}${extraClasses}`;

  const buttonContent = (
    <>
      {loading && (
        <svg
          style={{
            animation: 'spin 1s linear infinite',
            width: '16px',
            height: '16px',
            marginRight: '8px',
          }}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            style={{ opacity: 0.25 }}
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            style={{ opacity: 0.75 }}
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );

  if (to && !disabled) {
    return (
      <Link to={to} className={computedClassName} {...props}>
        {buttonContent}
      </Link>
    );
  }

  if (href && !disabled) {
    return (
      <a href={href} className={computedClassName} {...props}>
        {buttonContent}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={computedClassName}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {buttonContent}
    </button>
  );
};

export default Button;
