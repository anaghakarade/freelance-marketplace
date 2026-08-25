import React, { useState } from 'react';

const Avatar = ({
  src,
  name = '',
  size = 40,
  className = '',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  const avatarStyle = {
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${size * 0.4}px`,
    ...props.style,
  };

  return (
    <div
      className={`avatar ${className}`}
      style={avatarStyle}
      {...props}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={name}
          onError={() => setHasError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export default Avatar;
