import React from 'react';

export const SettingCard = ({
  icon: Icon,
  title,
  description,
  action,
  children,
  style = {}
}) => {
  return (
    <div className="settings-card" style={style}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {Icon && (
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-color)',
              flexShrink: 0
            }}>
              <Icon size={20} />
            </div>
          )}
          <div>
            <h2 style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              margin: 0
            }}>
              {title}
            </h2>
            {description && (
              <p style={{
                fontSize: '0.84rem',
                color: 'var(--text-muted)',
                margin: '0.25rem 0 0 0',
                lineHeight: '1.4'
              }}>
                {description}
              </p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
        {children}
      </div>
    </div>
  );
};
