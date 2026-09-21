import React from 'react';
import { 
  Sliders, 
  User, 
  Shield, 
  Bell, 
  Palette, 
  ChevronRight,
  Settings as SettingsIcon
} from 'lucide-react';

export const SETTINGS_SECTIONS = [
  { id: 'general', label: 'General', icon: Sliders },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security & Privacy', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette }
];

export const SettingsLayout = ({
  activeSection = 'general',
  onSectionChange,
  children
}) => {
  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      {/* Settings Navigation Header */}
      <div className="page-header" style={{ marginBottom: '1.75rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.6rem', fontWeight: 800 }}>
            <SettingsIcon size={26} style={{ color: 'var(--primary-color)' }} />
            System Settings
          </h1>
          <p className="page-subtitle" style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Manage your workspace and application preferences.
          </p>
        </div>
      </div>

      {/* Responsive Grid: Left Sidebar + Right Content */}
      <div
        className="settings-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          gap: '2rem',
          alignItems: 'start'
        }}
      >
        {/* Left Navigation Card */}
        <aside
          className="card"
          style={{
            padding: '0.85rem',
            borderRadius: '14px',
            position: 'sticky',
            top: '84px',
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)'
          }}
        >
          <div style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--text-dim)',
            padding: '0.5rem 0.75rem 0.65rem',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '0.5rem'
          }}>
            Preferences
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {SETTINGS_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  id={`settings-nav-${sec.id}`}
                  type="button"
                  onClick={() => onSectionChange && onSectionChange(sec.id)}
                  className={`settings-nav-btn ${isActive ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '8px',
                    border: isActive
                      ? '1px solid rgba(59, 130, 246, 0.3)'
                      : '1px solid transparent',
                    background: isActive
                      ? 'rgba(59, 130, 246, 0.12)'
                      : 'transparent',
                    color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Icon size={18} style={{ color: isActive ? 'var(--primary-color)' : 'var(--text-muted)' }} />
                    <span>{sec.label}</span>
                  </div>
                  {isActive && <ChevronRight size={16} style={{ color: 'var(--primary-color)' }} />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Pane */}
        <main style={{ minWidth: 0 }}>
          {children}
        </main>
      </div>

      {/* Media query styling for responsive stack */}
      <style>{`
        @media (max-width: 860px) {
          .settings-grid {
            grid-template-columns: 1fr !important;
            gap: 1.25rem !important;
          }
        }
      `}</style>
    </div>
  );
};
