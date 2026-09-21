import React from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = ({
  options = [],
  value,
  onChange,
  disabled = false,
  id,
  'aria-label': ariaLabel,
  icon: Icon,
  style = {}
}) => {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: '100%', maxWidth: '320px', ...style }}>
      {Icon && (
        <div style={{
          position: 'absolute',
          left: '12px',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
          color: 'var(--text-muted)'
        }}>
          <Icon size={16} />
        </div>
      )}
      <select
        id={id}
        aria-label={ariaLabel}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.value)}
        style={{
          width: '100%',
          appearance: 'none',
          WebkitAppearance: 'none',
          background: 'var(--inner-box-bg)',
          color: 'var(--text-main)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '0.6rem 2.2rem 0.6rem ' + (Icon ? '2.4rem' : '0.9rem'),
          fontSize: '0.88rem',
          fontWeight: 500,
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
        }}
      >
        {options.map((opt) => {
          const optVal = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={optVal} value={optVal} style={{ background: 'var(--card-bg)', color: 'var(--text-main)' }}>
              {optLabel}
            </option>
          );
        })}
      </select>
      <div style={{
        position: 'absolute',
        right: '10px',
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'none',
        color: 'var(--text-muted)'
      }}>
        <ChevronDown size={16} />
      </div>
    </div>
  );
};
