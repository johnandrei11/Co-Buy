import React, { useState } from 'react';
import { Shield, KeyRound, Smartphone, History, Lock, CheckCircle2, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { SettingCard } from '../ui/SettingCard';
import { SettingRow } from '../ui/SettingRow';
import { ActionButton } from '../ui/ActionButton';

export const SecurityPrivacySettings = ({ user }) => {
  const [activeModal, setActiveModal] = useState(null); // 'password' | '2fa' | 'activity' | 'privacy' | null
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordFeedback, setPasswordFeedback] = useState({ error: '', success: '' });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordFeedback({ error: '', success: '' });

    if (passwordForm.new.length < 6) {
      setPasswordFeedback({ error: 'New password must be at least 6 characters.', success: '' });
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordFeedback({ error: 'Passwords do not match.', success: '' });
      return;
    }

    // Save feedback
    setPasswordFeedback({
      error: '',
      success: 'Password updated successfully. Remember to use your new password next time you sign in.'
    });
    setTimeout(() => {
      setActiveModal(null);
      setPasswordFeedback({ error: '', success: '' });
      setPasswordForm({ current: '', new: '', confirm: '' });
    }, 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <SettingCard
        icon={Shield}
        title="Security & Privacy"
        description="Account protection, authentication methods, session history, and data privacy."
      >
        <SettingRow
          icon={KeyRound}
          label="Change Password"
          description="Update your password to keep your account secure."
        >
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={() => setActiveModal('password')}
            aria-label="Change Password"
          >
            Update Password
          </ActionButton>
        </SettingRow>

        <SettingRow
          icon={Smartphone}
          label="Two-Factor Authentication (2FA)"
          description="Protect your account with an extra verification code upon signing in."
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: twoFactorEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.12)',
              color: twoFactorEnabled ? '#10b981' : '#ef4444',
              border: `1px solid ${twoFactorEnabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.25)'}`
            }}>
              {twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => setActiveModal('2fa')}
              aria-label="Manage Two-Factor Authentication"
            >
              {twoFactorEnabled ? 'Manage 2FA' : 'Enable 2FA'}
            </ActionButton>
          </div>
        </SettingRow>

        <SettingRow
          icon={History}
          label="Login Activity"
          description="Review active device sessions and recent successful sign-ins."
        >
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={() => setActiveModal('activity')}
            aria-label="View Login Activity"
          >
            View Sessions
          </ActionButton>
        </SettingRow>

        <SettingRow
          icon={Lock}
          label="Data Privacy & Retention"
          description="Control transaction data pseudonymization and audit logging compliance."
        >
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={() => setActiveModal('privacy')}
            aria-label="Manage Data Privacy"
          >
            Privacy Controls
          </ActionButton>
        </SettingRow>
      </SettingCard>

      {/* ── Change Password Modal ── */}
      {activeModal === 'password' && (
        <div style={modalBackdropStyle}>
          <div className="card" style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Change Password
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {passwordFeedback.error && (
              <div style={{ padding: '0.65rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.82rem', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                {passwordFeedback.error}
              </div>
            )}
            {passwordFeedback.success && (
              <div style={{ padding: '0.65rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.82rem', marginBottom: '1rem', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                {passwordFeedback.success}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Current Password</label>
                <input
                  type="password"
                  className="input"
                  required
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>New Password</label>
                <input
                  type="password"
                  className="input"
                  required
                  placeholder="At least 6 characters"
                  value={passwordForm.new}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Confirm New Password</label>
                <input
                  type="password"
                  className="input"
                  required
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <ActionButton variant="secondary" onClick={() => setActiveModal(null)}>
                  Cancel
                </ActionButton>
                <ActionButton type="submit" variant="primary">
                  Update Password
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 2FA Modal ── */}
      {activeModal === '2fa' && (
        <div style={modalBackdropStyle}>
          <div className="card" style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Two-Factor Authentication Setup
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                Two-Factor Authentication adds an extra layer of protection to your CoBuy account. You will need an authenticator app (such as Google Authenticator, Authy, or 1Password) to scan the QR key.
              </p>
              <div style={{
                padding: '1rem',
                borderRadius: '8px',
                background: 'var(--inner-box-bg)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Shield size={24} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                <div style={{ fontSize: '0.84rem', color: 'var(--text-main)' }}>
                  Current Status: <strong>{twoFactorEnabled ? 'Active' : 'Not Configured'}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <ActionButton variant="secondary" onClick={() => setActiveModal(null)}>
                  Close
                </ActionButton>
                <ActionButton
                  variant={twoFactorEnabled ? 'danger' : 'primary'}
                  onClick={() => {
                    setTwoFactorEnabled(!twoFactorEnabled);
                    setActiveModal(null);
                  }}
                >
                  {twoFactorEnabled ? 'Disable 2FA' : 'Setup Authenticator'}
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Login Activity Modal ── */}
      {activeModal === 'activity' && (
        <div style={modalBackdropStyle}>
          <div className="card" style={{ ...modalCardStyle, maxWidth: '560px' }}>
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Active Sessions & Login History
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{
                padding: '0.85rem',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>Current Device (Active Now)</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Chrome on Windows • 127.0.0.1</div>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 6px', borderRadius: '4px' }}>
                  ACTIVE
                </span>
              </div>
              <div style={{
                padding: '0.85rem',
                borderRadius: '8px',
                background: 'var(--inner-box-bg)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>Previous Session</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Desktop Browser • 3 days ago</div>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>EXPIRED</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <ActionButton variant="secondary" onClick={() => setActiveModal(null)}>
                Close
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* ── Privacy Modal ── */}
      {activeModal === 'privacy' && (
        <div style={modalBackdropStyle}>
          <div className="card" style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Data Privacy & Compliance
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
              Transaction items uploaded to CoBuy are processed strictly within your workspace store boundary. Personally Identifiable Information (PII) is automatically stripped before frequent pattern mining.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <ActionButton variant="primary" onClick={() => setActiveModal(null)}>
                Acknowledge
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const modalBackdropStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.65)',
  backdropFilter: 'blur(3px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '1rem'
};

const modalCardStyle = {
  width: '100%',
  maxWidth: '480px',
  background: 'var(--card-bg)',
  borderRadius: '14px',
  padding: '1.75rem',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
  border: '1px solid var(--border-color)'
};

const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1.25rem'
};

const labelStyle = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: '0.35rem'
};

const inputStyle = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  borderRadius: '8px'
};
