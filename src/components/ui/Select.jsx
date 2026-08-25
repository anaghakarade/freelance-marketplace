import React from 'react';

const Select = ({
  label,
  id,
  options = [], // [{ value, label }] or string array
  error,
  className = '',
  placeholder,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const selectClass = `form-control ${error ? 'form-control-error' : ''} ${className}`;

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={selectClass}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt, i) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const lbl = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={i} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
      {error && <span className="form-error-msg">{error}</span>}
    </div>
  );
};

export default Select;
