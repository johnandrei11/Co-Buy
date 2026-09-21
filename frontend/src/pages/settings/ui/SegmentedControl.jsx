import React from 'react';

export const SegmentedControl = ({
  options = [],
  value,
  onChange,
  disabled = false,
  ariaLabel = 'Segmented options'
}) => {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        background: 'var(--inner-box-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '3px',
        gap: '4px',
        maxWidth: '100%'
      }}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => {
              if (!disabled && onChange) onChange(opt.value);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '7px',
              border: 'none',
              background: isSelected ? 'var(--card-bg)' : 'transparent',
              color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
              boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
              fontWeight: isSelected ? 600 : 500,
              fontSize: '0.84rem',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              whiteSpace: 'nowrap'
            }}
          >
            {Icon && (
              <Icon
                size={15}
                style={{
                  color: isSelected ? 'var(--primary-color)' : 'currentColor',
                  transition: 'color 0.18s ease'
                }}
              />
            )}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
