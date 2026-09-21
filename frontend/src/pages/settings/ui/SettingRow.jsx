import React from 'react';

export const SettingRow = ({
  icon: Icon,
  label,
  description,
  children,
  vertical = false,
  style = {}
}) => {
  return (
    <div
      className="setting-row"
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        alignItems: vertical ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        ...style
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {Icon && <Icon size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
          <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>
            {label}
          </span>
        </div>
        {description && (
          <p style={{
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            margin: '0.2rem 0 0 0',
            lineHeight: '1.4'
          }}>
            {description}
          </p>
        )}
      </div>
      <div style={{ flexShrink: 0, width: vertical ? '100%' : 'auto', marginTop: vertical ? '0.5rem' : 0 }}>
        {children}
      </div>
    </div>
  );
};
