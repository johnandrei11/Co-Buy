import React from 'react';
import { Loader2 } from 'lucide-react';

export const ActionButton = ({
  children,
  onClick,
  variant = 'secondary', // 'primary' | 'secondary' | 'outline' | 'danger'
  size = 'md',          // 'sm' | 'md' | 'lg'
  icon: Icon,
  loading = false,
  disabled = false,
  type = 'button',
  id,
  'aria-label': ariaLabel,
  style = {}
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--primary-color)',
          color: '#ffffff',
          border: '1px solid transparent',
        };
      case 'danger':
        return {
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.25)',
        };
      case 'outline':
        return {
          background: 'transparent',
          color: 'var(--text-main)',
          border: '1px solid var(--border-color)',
        };
      case 'secondary':
      default:
        return {
          background: 'var(--inner-box-bg)',
          color: 'var(--text-main)',
          border: '1px solid var(--border-color)',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { padding: '0.4rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' };
      case 'lg':
        return { padding: '0.75rem 1.5rem', fontSize: '0.95rem', borderRadius: '10px' };
      case 'md':
      default:
        return { padding: '0.55rem 1.1rem', fontSize: '0.86rem', borderRadius: '8px' };
    }
  };

  return (
    <button
      id={id}
      type={type}
      aria-label={ariaLabel}
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style
      }}
    >
      {loading ? (
        <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
      ) : Icon ? (
        <Icon size={16} />
      ) : null}
      <span>{children}</span>
    </button>
  );
};
