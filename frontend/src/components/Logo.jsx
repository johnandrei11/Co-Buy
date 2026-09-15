import React from 'react';

const Logo = ({ size = 'md', showSubtitle = false, className = '' }) => {
  const sizes = {
    sm: {
      fontSize: '1.18rem',
      iconSize: 22,
      badgeFontSize: '0.72rem'
    },
    md: {
      fontSize: '1.45rem',
      iconSize: 26,
      badgeFontSize: '0.92rem'
    },
    lg: {
      fontSize: '1.8rem',
      iconSize: 32,
      badgeFontSize: '1.15rem'
    },
    xl: {
      fontSize: '2.2rem',
      iconSize: 40,
      badgeFontSize: '1.4rem'
    }
  };

  const config = sizes[size] || sizes.md;

  return (
    <div 
      className={`cobuy-logo-wrapper ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        userSelect: 'none',
        width: '100%'
      }}
    >
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          cursor: 'pointer'
        }}
      >
        {/* CoBuy Layered Rhombuses Brand Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <svg
            width={config.iconSize}
            height={config.iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: '#6366f1' }}
          >
            <polygon points="12 2 2 7 12 12 22 7 12 2" fill="rgba(99, 102, 241, 0.18)" stroke="#6366f1" />
            <polyline points="2 12 12 17 22 12" stroke="#6366f1" />
            <polyline points="2 17 12 22 22 17" stroke="#6366f1" />
          </svg>
        </div>

        {/* CoBuy Wordmark */}
        <span
          style={{
            fontWeight: '800',
            fontSize: config.fontSize,
            color: 'var(--text-main)',
            letterSpacing: '-0.03em',
            lineHeight: 1,
            fontFamily: 'Outfit, Inter, system-ui, sans-serif'
          }}
        >
          CoBuy
        </span>
      </div>

      {showSubtitle && (
        <span 
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontWeight: '600',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginTop: '0.45rem',
            textAlign: 'center'
          }}
        >
          Buying Pattern Mining
        </span>
      )}
    </div>
  );
};

export default Logo;
