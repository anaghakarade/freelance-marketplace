import React from 'react';

const Badge = ({
  children,
  variant = 'default', // default, success, warning, error, info
  className = '',
  ...props
}) => {
  const baseClass = 'badge';
  const variantClass = `badge-${variant}`;
  const computedClassName = `${baseClass} ${variantClass} ${className}`;

  return (
    <span className={computedClassName} {...props}>
      {children}
    </span>
  );
};

export default Badge;
