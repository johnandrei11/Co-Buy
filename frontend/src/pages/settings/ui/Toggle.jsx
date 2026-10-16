import React from 'react';

export const Toggle = ({
  checked = false,
  onChange,
  disabled = false,
  id,
  'aria-label': ariaLabel,
  label
}) => {
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (onChange) onChange(!checked);
    }
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label}
        disabled={disabled}
        onClick={() => {
          if (!disabled && onChange) onChange(!checked);
        }}
        onKeyDown={handleKeyDown}
        style={{
          position: 'relative',
          width: '46px',
          height: '26px',
          borderRadius: '13px',
          background: checked ? 'var(--primary-color)' : 'rgba(148, 163, 184, 0.25)',
          border: 'none',
          padding: '2px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          outline: 'none',
          boxShadow: 'none',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <span
          style={{
            display: 'block',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
            transform: checked ? 'translateX(20px)' : 'translateX(0px)',
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        />
      </button>
      {label && (
        <span
          onClick={() => {
            if (!disabled && onChange) onChange(!checked);
          }}
          style={{
            fontSize: '0.86rem',
            color: disabled ? 'var(--text-dim)' : 'var(--text-main)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            userSelect: 'none'
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
};
