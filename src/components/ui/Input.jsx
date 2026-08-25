import React from 'react';

const Input = ({
  label,
  id,
  error,
  type = 'text',
  className = '',
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const inputClass = `form-control ${error ? 'form-control-error' : ''} ${className}`;

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={inputClass}
        {...props}
      />
      {error && <span className="form-error-msg">{error}</span>}
    </div>
  );
};

export default Input;
