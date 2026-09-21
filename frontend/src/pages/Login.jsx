import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ShieldAlert, CheckCircle, ChevronDown, Store, Users, Clock, Copy, Check } from 'lucide-react';
import axios from 'axios';
import Logo from '../components/Logo';

const API_BASE = 'http://localhost:5000/api';

// ── Pending Activation Overlay ────────────────────────────────────────────────
export const PendingActivation = ({ onBackToLogin }) => (
  <div style={{
    minHeight: '100vh',
    width: '100vw',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050505',
    backgroundImage: 'radial-gradient(ellipse at 50% -20%, rgba(245, 245, 245, 0.015) 0%, transparent 60%)'
  }}>
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="card"
      style={{
        width: '100%',
        maxWidth: '440px',
        padding: '2.5rem',
        margin: '1.5rem',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0,0,0,0.7), inset 1px 1px 0px 0px rgba(245,245,245,0.05)'
      }}
    >
      <div style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: 'rgba(245, 158, 11, 0.12)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem'
      }}>
        <Clock size={28} style={{ color: '#f59e0b' }} />
      </div>

      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '1.4rem',
        fontWeight: 700,
        color: 'var(--text-main)',
        marginBottom: '0.75rem'
      }}>
        Awaiting Invitation
      </h2>

      <p style={{
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
        lineHeight: 1.6,
        marginBottom: '1.5rem'
      }}>
        Your account has been created and is <strong style={{ color: '#f59e0b' }}>pending activation</strong>.
        Ask your Shop Administrator to invite you — you'll receive a <strong style={{ color: 'var(--text-main)' }}>🔔 bell notification</strong> when they do.
      </p>

      <div style={{
        background: 'rgba(59,130,246,0.06)',
        border: '1px solid rgba(59,130,246,0.15)',
        borderRadius: '8px',
        padding: '0.875rem 1rem',
        marginBottom: '1rem',
        fontSize: '0.83rem',
        color: '#3b82f6',
        lineHeight: 1.5,
        textAlign: 'left'
      }}>
        <strong>Two ways to accept:</strong>
        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span>🔔 Log in and click the bell icon at the top right</span>
          <span>📧 Open the invite link from your email</span>
        </div>
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.06)',
        border: '1px solid rgba(245, 158, 11, 0.15)',
        borderRadius: '8px',
        padding: '0.875rem 1rem',
        marginBottom: '2rem',
        fontSize: '0.83rem',
        color: '#f59e0b',
        lineHeight: 1.5
      }}>
        💡 The invite link expires after <strong>48 hours</strong>. Ask your admin to re-send if it expires.
      </div>

      <button
        onClick={onBackToLogin}
        className="btn btn-primary"
        style={{ width: '100%', height: '44px' }}
      >
        Sign In to Check Notifications
      </button>
    </motion.div>
  </div>
);

// ── Join Page (invite token acceptance) ───────────────────────────────────────
export const JoinPage = ({ token, onLogin, onGoToLogin }) => {
  const [status, setStatus] = useState('idle'); // idle | loading | success | error | needs_login
  const [message, setMessage] = useState('');
  const [storeInfo, setStoreInfo] = useState(null);

  const handleAccept = async () => {
    setStatus('loading');
    try {
      // We still use the legacy /accept alias here because pre-login
      // it returns requires_login state (with store name info).
      // The new /consume strictly requires a logged in user.
      const res = await axios.post(`${API_BASE}/invitations/accept`, { token: token });
      if (res.data.requires_login) {
        setStoreInfo(res.data);
        setStatus('needs_login');
      } else {
        onLogin(res.data.token, res.data.user);
        setStatus('success');
      }
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to accept invitation.');
      setStatus('error');
    }
  };

  React.useEffect(() => {
    if (token) handleAccept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      minHeight: '100vh', width: '100vw', display: 'flex',
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: '#050505'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card"
        style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', margin: '1.5rem', textAlign: 'center' }}
      >
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <Logo size="md" showSubtitle={false} />
        </div>

        {status === 'loading' && (
          <div>
            <div className="spin" style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '3px solid var(--border-color)',
              borderTopColor: 'var(--primary-color)',
              margin: '0 auto 1rem'
            }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Validating your invitation…</p>
          </div>
        )}

        {status === 'needs_login' && storeInfo && (
          <div>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Store size={24} style={{ color: 'var(--primary-color)' }} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              You're invited to join
            </h3>
            <p style={{ color: 'var(--primary-color)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.75rem' }}>
              {storeInfo.store_name}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Please sign in with <strong style={{ color: 'var(--text-main)' }}>{storeInfo.invited_email}</strong> to complete activation.
            </p>
            <button onClick={onGoToLogin} className="btn btn-primary" style={{ width: '100%', height: '44px' }}>
              Sign In to Accept
            </button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <ShieldAlert size={24} style={{ color: '#ef4444' }} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', marginBottom: '0.5rem', color: '#ef4444' }}>Invitation Error</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>{message}</p>
            <button onClick={onGoToLogin} className="btn btn-primary" style={{ width: '100%', height: '44px' }}>
              Back to Sign In
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ── Main Login Component ──────────────────────────────────────────────────────
const Login = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('admin'); // 'admin' | 'member'
  const [storeName, setStoreName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Security & Lockout state (scoped per email)
  const [lockedEmail, setLockedEmail] = useState('');
  const [lockoutRemainingSeconds, setLockoutRemainingSeconds] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);

  const [pendingApproval, setPendingApproval] = useState(null);

  const isCurrentEmailLocked = Boolean(
    !isRegister &&
    lockedEmail &&
    email.trim().toLowerCase() === lockedEmail.toLowerCase() &&
    lockoutRemainingSeconds > 0
  );

  // Real-time lockout countdown timer
  React.useEffect(() => {
    let timer;
    if (lockedEmail && lockoutRemainingSeconds > 0) {
      timer = setInterval(() => {
        setLockoutRemainingSeconds((prev) => {
          if (prev <= 1) {
            setLockedEmail('');
            setError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockedEmail, lockoutRemainingSeconds]);

  const formatLockoutTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const validateForm = () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    if (isRegister && !name.trim()) {
      setError('Please enter your full name.');
      return false;
    }
    if (isRegister && accountType === 'admin' && !storeName.trim()) {
      setError('Please enter your store name.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      if (isRegister) {
        const payload = { email, password, name, account_type: accountType };
        if (accountType === 'admin') payload.store_name = storeName;
        const response = await axios.post(`${API_BASE}/register`, payload);

        if (response.data.pending) {
          setPendingApproval({
            message: response.data.message || 'Your registration is awaiting approval by the System Administrator.',
            isBusiness: accountType === 'admin',
            storeName: storeName
          });
          return;
        }

        setSuccess('Account created successfully! Logging you in…');
        setTimeout(() => {
          onLogin(response.data.token, response.data.user);
        }, 1200);
      } else {
        const response = await axios.post(`${API_BASE}/login`, { email, password });
        if (response.data.user?.business_status === 'Pending Approval' && response.data.user?.role !== 'system_admin') {
          setPendingApproval({
            message: 'Your business registration is currently under review by the System Administrator. Once approved, you will have full access to your business analytics workspace.',
            isBusiness: true,
            storeName: response.data.user?.store_name || 'Your Store'
          });
          return;
        }
        setLockedEmail('');
        setLockoutRemainingSeconds(0);
        setAttemptsRemaining(null);
        onLogin(response.data.token, response.data.user);
      }
    } catch (err) {
      console.error('Auth error:', err);
      const errData = err.response?.data;
      if (errData?.is_locked) {
        setLockedEmail(email.trim().toLowerCase());
        setLockoutRemainingSeconds(errData.remaining_seconds || 600);
        setError(errData.error || `Account ${email} is temporarily locked.`);
        setAttemptsRemaining(null);
      } else if (errData?.attempts_remaining !== undefined) {
        setAttemptsRemaining(errData.attempts_remaining);
        setError(errData.error || 'Incorrect password.');
      } else {
        setError(errData?.error || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (pendingApproval) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#050505',
        backgroundImage: 'radial-gradient(ellipse at 50% -20%, rgba(245, 245, 245, 0.015) 0%, transparent 60%)'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card"
          style={{
            width: '100%',
            maxWidth: '460px',
            padding: '2.5rem',
            margin: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.7), inset 1px 1px 0px 0px rgba(245,245,245,0.05)'
          }}
        >
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <Clock size={30} style={{ color: '#f59e0b' }} />
          </div>

          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.35rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '0.75rem'
          }}>
            Registration Pending Approval
          </h2>

          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            lineHeight: 1.6,
            marginBottom: '1.5rem'
          }}>
            {pendingApproval.message}
          </p>

          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.75rem',
            fontSize: '0.82rem',
            color: '#f59e0b',
            textAlign: 'left',
            lineHeight: 1.5
          }}>
            <strong>Enterprise Onboarding Queue:</strong>
            <div style={{ marginTop: '0.35rem' }}>
              Your application has been routed to <strong>Businesses → Pending Requests</strong> for security review by a Platform System Administrator.
            </div>
          </div>

          <button
            onClick={() => setPendingApproval(null)}
            className="btn btn-primary"
            style={{ width: '100%', height: '44px' }}
          >
            Back to Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-color)',
      backgroundImage: 'var(--bg-gradient)'
    }}>
      {/* Autofill and Scrollbar CSS Overrides Tag */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #1e293b inset !important;
          -webkit-text-fill-color: var(--text-main) !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        [data-theme="light"] input:-webkit-autofill,
        [data-theme="light"] input:-webkit-autofill:hover,
        [data-theme="light"] input:-webkit-autofill:focus,
        [data-theme="light"] input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #f1f5f9 inset !important;
          -webkit-text-fill-color: #0f172a !important;
        }
        [data-theme="dark"] input:-webkit-autofill,
        [data-theme="dark"] input:-webkit-autofill:hover,
        [data-theme="dark"] input:-webkit-autofill:focus,
        [data-theme="dark"] input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #1e293b inset !important;
          -webkit-text-fill-color: #f8fafc !important;
        }
        .login-scroll-container::-webkit-scrollbar { width: 5px; }
        .login-scroll-container::-webkit-scrollbar-track { background: transparent; }
        .login-scroll-container::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 10px; }
        .login-scroll-container::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.35); }
        .account-type-card { cursor: pointer; border-radius: 10px; padding: 0.875rem 1rem; border: 1px solid var(--border-color); background: var(--inner-box-bg); transition: all 0.2s ease; display: flex; align-items: flex-start; gap: 0.75rem; }
        .account-type-card:hover { border-color: rgba(59,130,246,0.4); background: rgba(59,130,246,0.06); }
        .account-type-card.selected { border-color: rgba(59,130,246,0.6); background: rgba(59,130,246,0.1); }
        
        .login-card .input, .login-card .select {
          background: var(--inner-box-bg);
          border: 1px solid var(--border-color);
          color: var(--text-main) !important;
        }
        .login-card .input::placeholder {
          color: var(--text-dim) !important;
          opacity: 0.7;
        }
        .login-card .input:focus, .login-card .select:focus {
          background: var(--card-bg) !important;
          border-color: var(--primary-color) !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }
        [data-theme="light"] .login-card .input,
        [data-theme="light"] .login-card .select {
          background: #f8fafc !important;
          border-color: #cbd5e1 !important;
          color: #0f172a !important;
        }
        [data-theme="light"] .login-card .input:focus,
        [data-theme="light"] .login-card .select:focus {
          background: #ffffff !important;
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }
        [data-theme="dark"] .login-card .input,
        [data-theme="dark"] .login-card .select {
          background: rgba(15, 23, 42, 0.6) !important;
          border-color: rgba(255, 255, 255, 0.12) !important;
          color: #f8fafc !important;
        }
        [data-theme="dark"] .login-card .input:focus,
        [data-theme="dark"] .login-card .select:focus {
          background: rgba(15, 23, 42, 0.9) !important;
          border-color: rgba(59, 130, 246, 0.7) !important;
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="card login-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2.5rem',
          zIndex: 10,
          margin: '1.5rem',
          boxShadow: 'var(--card-shadow, 0 20px 40px rgba(0, 0, 0, 0.3))'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.25rem', display: 'flex', justifyContent: 'center' }}>
          <Logo size="lg" showSubtitle={true} />
        </div>

        {/* Tab Selector */}
        <div style={{
          display: 'flex',
          background: 'var(--inner-box-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '4px',
          marginBottom: '2rem',
          position: 'relative',
          cursor: 'pointer'
        }}>
          <div
            onClick={() => { setIsRegister(false); setError(''); setSuccess(''); }}
            style={{
              flex: 1, padding: '0.625rem 0', textAlign: 'center',
              fontSize: '0.9rem', fontWeight: '600', zIndex: 2,
              color: !isRegister ? 'var(--text-main)' : 'var(--text-dim)',
              transition: 'color 0.25s ease'
            }}
          >
            Sign In
          </div>
          <div
            onClick={() => { setIsRegister(true); setError(''); setSuccess(''); }}
            style={{
              flex: 1, padding: '0.625rem 0', textAlign: 'center',
              fontSize: '0.9rem', fontWeight: '600', zIndex: 2,
              color: isRegister ? 'var(--text-main)' : 'var(--text-dim)',
              transition: 'color 0.25s ease'
            }}
          >
            Register
          </div>
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            style={{
              position: 'absolute', top: '4px',
              left: isRegister ? '50%' : '4px',
              right: isRegister ? '4px' : '50%',
              bottom: '4px',
              backgroundColor: 'var(--badge-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px', zIndex: 1
            }}
          />
        </div>

        {/* Alerts */}
        <AnimatePresence mode="wait">
          {isCurrentEmailLocked ? (
            <motion.div
              key="lockout-alert"
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              style={{
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.875rem 1rem', borderRadius: '8px',
                marginBottom: '1.25rem', color: '#ef4444',
                fontSize: '0.85rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 600 }}>
                <Clock size={18} style={{ flexShrink: 0 }} />
                <span>Account Temporarily Locked</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#f87171', lineHeight: 1.4 }}>
                Too many failed attempts for <strong>{lockedEmail}</strong>. This account is locked for 10 minutes. You can sign in with another account below.
              </div>
              <div style={{
                marginTop: '0.25rem',
                padding: '0.4rem 0.6rem',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.82rem'
              }}>
                <span>Time remaining:</span>
                <strong style={{ color: '#fca5a5', fontSize: '0.95rem' }}>
                  {formatLockoutTime(lockoutRemainingSeconds)}
                </strong>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error-alert"
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              style={{
                display: 'flex', flexDirection: 'column', gap: '0.35rem',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                padding: '0.75rem 1rem', borderRadius: '8px',
                marginBottom: '1.25rem', color: '#ef4444',
                fontSize: '0.85rem', overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
              {attemptsRemaining !== null && attemptsRemaining > 0 && (
                <div style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#f59e0b',
                  marginTop: '0.2rem',
                  paddingLeft: '1.75rem'
                }}>
                  ⚠️ {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining before lockout
                </div>
              )}
            </motion.div>
          ) : null}
          {success && (
            <motion.div
              key="success-alert"
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                padding: '0.75rem 1rem', borderRadius: '8px',
                marginBottom: '1.25rem', color: '#10b981',
                fontSize: '0.85rem', overflow: 'hidden'
              }}
            >
              <CheckCircle size={16} style={{ flexShrink: 0 }} />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Dummy inputs to prevent browser autofill */}
          <input type="text" name="prevent_autofill_email" style={{ display: 'none' }} tabIndex={-1} readOnly />
          <input type="password" name="prevent_autofill_password" style={{ display: 'none' }} tabIndex={-1} readOnly />

          <div
            className="login-scroll-container"
            style={{
              maxHeight: isRegister ? '380px' : '200px',
              overflowY: 'auto',
              paddingRight: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              transition: 'max-height 0.3s ease'
            }}
          >
            <AnimatePresence mode="popLayout">
              {isRegister && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="form-group"
                  style={{ marginBottom: 0 }}
                >
                  <label className="label">Full Name</label>
                  <input
                    type="text"
                    placeholder="Jane Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="off"
                    className="input"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error && !lockedEmail) setError('');
                }}
                required
                disabled={isLoading}
                autoComplete="off"
                className="input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="input"
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', color: 'var(--text-dim)',
                    cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Account Type Picker (Register only) */}
            <AnimatePresence mode="popLayout">
              {isRegister && (
                <motion.div
                  key="account-type-picker"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  style={{ marginBottom: 0 }}
                >
                  <label className="label" style={{ marginBottom: '0.625rem', display: 'block' }}>I am a…</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div
                      className={`account-type-card ${accountType === 'admin' ? 'selected' : ''}`}
                      onClick={() => setAccountType('admin')}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: '8px', flexShrink: 0,
                        background: accountType === 'admin' ? 'rgba(59,130,246,0.15)' : 'var(--inner-box-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid ' + (accountType === 'admin' ? 'rgba(59,130,246,0.3)' : 'var(--border-color)'),
                        transition: 'all 0.2s ease'
                      }}>
                        <Store size={16} style={{ color: accountType === 'admin' ? 'var(--primary-color)' : 'var(--text-dim)' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.15rem' }}>Shop Administrator</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>Owns a store, can invite team members</div>
                      </div>
                    </div>
                    <div
                      className={`account-type-card ${accountType === 'member' ? 'selected' : ''}`}
                      onClick={() => setAccountType('member')}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: '8px', flexShrink: 0,
                        background: accountType === 'member' ? 'rgba(16,185,129,0.12)' : 'var(--inner-box-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid ' + (accountType === 'member' ? 'rgba(16,185,129,0.3)' : 'var(--border-color)'),
                        transition: 'all 0.2s ease'
                      }}>
                        <Users size={16} style={{ color: accountType === 'member' ? '#10b981' : 'var(--text-dim)' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.15rem' }}>Team Member</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>Joins via an invitation link from an admin</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Store Name (admin only) */}
            <AnimatePresence mode="popLayout">
              {isRegister && accountType === 'admin' && (
                <motion.div
                  key="store-name-field"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="form-group"
                  style={{ marginBottom: 0 }}
                >
                  <label className="label">Store Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Brew & Co. Coffee Shop"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="input"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Team member hint */}
            <AnimatePresence mode="popLayout">
              {isRegister && accountType === 'member' && (
                <motion.div
                  key="member-hint"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  <div style={{
                    background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
                    borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.82rem',
                    color: '#10b981', lineHeight: 1.5
                  }}>
                    💬 After registering, your admin will send you an invitation link to activate your account.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || isCurrentEmailLocked}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.75rem', height: '46px', opacity: isCurrentEmailLocked ? 0.7 : 1 }}
          >
            {isLoading ? (
              <div className="spin" style={{
                width: '18px', height: '18px', borderRadius: '50%',
                border: '2px solid var(--bg-color)', borderTopColor: 'transparent'
              }} />
            ) : isCurrentEmailLocked ? (
              'Account Locked'
            ) : (
              isRegister ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
