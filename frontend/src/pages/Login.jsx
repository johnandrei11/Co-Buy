import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, ShieldAlert, CheckCircle, Store, Users, Clock, ArrowLeft,
  ArrowRight, Check, Sparkles, Coffee, Cookie
} from 'lucide-react';
import axios from 'axios';
import Logo from '../components/Logo';
import { FloatingCube } from '../components/landing/LandingBackgrounds';
import { API_BASE } from '../config/api';
import './auth.css';

// ── Pending Activation Overlay ────────────────────────────────────────────────
export const PendingActivation = ({ onBackToLogin }) => (
  <div className="lp-scope auth-root auth-root--center">
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="auth-card auth-card--narrow"
    >
      <div style={{
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: 'rgba(245, 158, 11, 0.12)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.25rem'
      }}>
        <Clock size={28} style={{ color: '#f59e0b' }} />
      </div>

      <h2 className="auth-card__title">Awaiting Invitation</h2>

      <p className="auth-card__sub" style={{ marginBottom: '1.25rem' }}>
        Your account has been created and is <strong style={{ color: '#d97706' }}>pending activation</strong>.
        Ask your Shop Administrator to invite you — you'll receive a bell notification when they do.
      </p>

      <div style={{
        background: 'var(--lp-indigo-50)',
        border: '1px solid var(--lp-indigo-100)',
        borderRadius: '12px',
        padding: '0.9rem 1rem',
        marginBottom: '1rem',
        fontSize: '0.84rem',
        color: 'var(--lp-indigo-600)',
        lineHeight: 1.5,
        textAlign: 'left'
      }}>
        <strong>Two ways to accept:</strong>
        <div style={{ marginTop: '0.45rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span>🔔 Log in and click the bell icon at the top right</span>
          <span>📧 Open the invite link from your email</span>
        </div>
      </div>

      <div style={{
        background: '#fffbeb',
        border: '1px solid #fef3c7',
        borderRadius: '12px',
        padding: '0.85rem 1rem',
        marginBottom: '1.75rem',
        fontSize: '0.82rem',
        color: '#b45309',
        lineHeight: 1.5,
        textAlign: 'left'
      }}>
        💡 The invite link expires after <strong>48 hours</strong>. Ask your admin to re-send if it expires.
      </div>

      <button
        onClick={onBackToLogin}
        className="lp-btn lp-btn--primary lp-btn--block"
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

  useEffect(() => {
    if (token) handleAccept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="lp-scope auth-root auth-root--center">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="auth-card auth-card--narrow"
      >
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <Logo size="md" showSubtitle={false} />
        </div>

        {status === 'loading' && (
          <div>
            <div className="auth-spinner" style={{ width: 28, height: 28, margin: '0 auto 1rem', borderColor: 'var(--lp-indigo)', borderTopColor: 'transparent' }} />
            <p style={{ color: 'var(--lp-muted)', fontSize: '0.92rem' }}>Validating your invitation…</p>
          </div>
        )}

        {status === 'needs_login' && storeInfo && (
          <div>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--lp-indigo-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Store size={24} style={{ color: 'var(--lp-indigo)' }} />
            </div>
            <h3 className="auth-card__title" style={{ fontSize: '1.25rem' }}>
              You're invited to join
            </h3>
            <p style={{ color: 'var(--lp-indigo)', fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>
              {storeInfo.store_name}
            </p>
            <p style={{ color: 'var(--lp-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Please sign in with <strong style={{ color: 'var(--lp-ink)' }}>{storeInfo.invited_email}</strong> to complete activation.
            </p>
            <button onClick={onGoToLogin} className="lp-btn lp-btn--primary lp-btn--block">
              Sign In to Accept
            </button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <ShieldAlert size={24} style={{ color: '#ef4444' }} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', color: '#ef4444' }}>Invitation Error</h3>
            <p style={{ color: 'var(--lp-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>{message}</p>
            <button onClick={onGoToLogin} className="lp-btn lp-btn--secondary lp-btn--block">
              Back to Sign In
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ── Main Login Component ──────────────────────────────────────────────────────
const Login = ({ onLogin, defaultRegister = false }) => {
  const location = useLocation();
  const [isRegister, setIsRegister] = useState(() => {
    return defaultRegister || location.pathname === '/register';
  });

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

  // Sync tab with pathname if navigated between /login and /register
  useEffect(() => {
    if (location.pathname === '/register') {
      setIsRegister(true);
    } else if (location.pathname === '/login') {
      setIsRegister(defaultRegister);
    }
  }, [location.pathname, defaultRegister]);

  const isCurrentEmailLocked = Boolean(
    !isRegister &&
    lockedEmail &&
    email.trim().toLowerCase() === lockedEmail.toLowerCase() &&
    lockoutRemainingSeconds > 0
  );

  // Real-time lockout countdown timer
  useEffect(() => {
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
    const raw = (email || '').trim().toLowerCase();
    if (!raw) {
      setError('Please enter your email or username.');
      return false;
    }
    if (isRegister) {
      if (!raw.includes('@')) {
        setError('Please enter a valid email address.');
        return false;
      }
    } else {
      if (!raw.includes('@') && raw !== 'admin' && raw !== 'janesmith') {
        setError('Please enter a valid email address.');
        return false;
      }
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
        const loginEmail = email.trim().toLowerCase() === 'admin'
          ? 'admin@ruleminer.ai'
          : email.trim().toLowerCase() === 'janesmith'
            ? 'janesmith@gmail.com'
            : email.trim();
        const response = await axios.post(`${API_BASE}/login`, { email: loginEmail, password });
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
      } else if (!err.response) {
        if (API_BASE.includes('localhost') && window.location.protocol === 'https:') {
          setError('Backend URL not configured on Netlify. Please set VITE_API_BASE to your Render backend URL in Netlify settings.');
        } else {
          setError(`Cannot connect to backend (${API_BASE}). If hosted on Render free tier, it may be waking up from sleep (~50s). Please wait a moment and retry.`);
        }
      } else {
        setError(errData?.error || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (pendingApproval) {
    return (
      <div className="lp-scope auth-root auth-root--center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45 }}
          className="auth-card auth-card--narrow"
        >
          <div style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <Clock size={28} style={{ color: '#f59e0b' }} />
          </div>

          <h2 className="auth-card__title">Registration Pending Approval</h2>

          <p className="auth-card__sub" style={{ marginBottom: '1.25rem' }}>
            {pendingApproval.message}
          </p>

          <div style={{
            background: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: '12px',
            padding: '0.9rem 1rem',
            marginBottom: '1.75rem',
            fontSize: '0.84rem',
            color: '#b45309',
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
            className="lp-btn lp-btn--primary lp-btn--block"
          >
            Back to Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="lp-scope auth-root">
      {/* ── Left Branded Showcase Panel ─────────────────────────────────── */}
      <aside className="auth-aside" aria-label="About CoBuy">
        <div className="auth-aside__bg" aria-hidden="true">
          <div className="auth-aside__glow auth-aside__glow--indigo" />
          <div className="auth-aside__glow auth-aside__glow--cyan" />
          <svg className="auth-aside__graph" viewBox="0 0 500 700" fill="none">
            <defs>
              <pattern id="aside-dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" fill="#a5b4fc" fillOpacity="0.35" />
              </pattern>
            </defs>
            <rect x="20" y="40" width="120" height="90" fill="url(#aside-dots)" />
            <g opacity="0.45">
              <line x1="60" y1="200" x2="160" y2="150" stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="3 3" />
              <line x1="160" y1="150" x2="280" y2="210" stroke="#06b6d4" strokeWidth="1.3" />
              <line x1="160" y1="150" x2="130" y2="310" stroke="#cbd5e1" strokeWidth="1" />
              <line x1="280" y1="210" x2="390" y2="170" stroke="#10b981" strokeWidth="1.2" strokeDasharray="4 3" />
              <line x1="130" y1="310" x2="240" y2="380" stroke="#06b6d4" strokeWidth="1.2" />

              <circle cx="60" cy="200" r="4" fill="#7c5cff" />
              <circle cx="160" cy="150" r="5" fill="#06b6d4" />
              <circle cx="280" cy="210" r="4.5" fill="#7c5cff" />
              <circle cx="130" cy="310" r="4" fill="#10b981" />
              <circle cx="390" cy="170" r="5" fill="#06b6d4" />
              <circle cx="240" cy="380" r="4.5" fill="#7c5cff" />
            </g>
          </svg>
          <FloatingCube
            size={36}
            topColor="#ede9fe"
            leftColor="#c4b5fd"
            rightColor="#a78bfa"
            glowColor="rgba(124, 58, 237, 0.2)"
            className="lp-float-3d auth-pos-aside-cube"
          />
        </div>

        <Link to="/" className="auth-aside__brand" title="Back to CoBuy landing page">
          <Logo size="lg" showSubtitle={true} />
        </Link>

        <div className="auth-aside__body">
          <span className="auth-aside__kicker">
            <Sparkles size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />
            Association Rule Mining
          </span>
          <h2>Turn transaction records into product relationships.</h2>
          <p>
            Discover which items your customers frequently purchase together to make smarter
            decisions about bundling, discounts, and store layouts.
          </p>

          <ul className="auth-aside__list">
            <li>
              <span><Check size={13} /></span>
              Apriori and FP-Growth rule mining algorithms
            </li>
            <li>
              <span><Check size={13} /></span>
              Measure relationships with Support, Confidence & Lift
            </li>
            <li>
              <span><Check size={13} /></span>
              Designed specifically for small retail businesses
            </li>
          </ul>

          <div className="auth-rule" aria-hidden="true">
            <div className="auth-rule__head">
              <strong>
                <Coffee size={18} color="#a5a0ff" />
                Coffee → Cookies
                <Cookie size={18} color="#f59e0b" />
              </strong>
              <span className="lp-sample-tag">Sample Rule</span>
            </div>
            <div className="auth-rule__metrics">
              <div>
                <small>Support</small>
                <b>18%</b>
              </div>
              <div>
                <small>Confidence</small>
                <b>45%</b>
              </div>
              <div>
                <small>Lift</small>
                <b>×1.80</b>
              </div>
            </div>
          </div>
        </div>

        <Link to="/" className="auth-aside__back">
          <ArrowLeft size={16} /> Back to homepage
        </Link>
      </aside>

      {/* ── Right Form Panel ────────────────────────────────────────────── */}
      <main className="auth-main">
        <div className="auth-main__bg" aria-hidden="true">
          <div className="auth-glow auth-glow--lavender" />
          <div className="auth-glow auth-glow--cyan" />
          <div className="auth-glow auth-glow--mint" />
          <div className="auth-studio-bloom" />

          <svg className="auth-waves" viewBox="0 0 800 600" preserveAspectRatio="none" fill="none">
            <defs>
              <linearGradient id="auth-ribbon-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ede9fe" stopOpacity="0.55" />
                <stop offset="50%" stopColor="#cffafe" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#d1fae5" stopOpacity="0.45" />
              </linearGradient>
              <pattern id="auth-dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="2.5" cy="2.5" r="1.3" fill="#cbd5e1" fillOpacity="0.4" />
              </pattern>
            </defs>
            <rect x="6%" y="50" width="130" height="90" fill="url(#auth-dots)" />
            <rect x="76%" y="80" width="140" height="110" fill="url(#auth-dots)" />
            
            <path
              d="M -20 440 C 180 390 320 510 520 460 C 680 420 740 500 820 470 L 820 600 L -20 600 Z"
              fill="url(#auth-ribbon-1)"
            />
            <path
              d="M -20 440 C 180 390 320 510 520 460 C 680 420 740 500 820 470"
              stroke="rgba(255, 255, 255, 0.85)"
              strokeWidth="1.6"
              fill="none"
            />

            <path
              d="M 620 130 C 680 90 730 150 780 120"
              stroke="rgba(6, 182, 212, 0.35)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              fill="none"
            />
            <circle cx="620" cy="130" r="4" fill="#06b6d4" />
            <circle cx="780" cy="120" r="4.5" fill="#7c5cff" />
          </svg>

          <FloatingCube
            size={40}
            topColor="#f5f3ff"
            leftColor="#ddd6fe"
            rightColor="#c4b5fd"
            glowColor="rgba(167, 139, 250, 0.28)"
            className="lp-float-3d auth-pos-cube-1"
          />
          <FloatingCube
            size={30}
            topColor="#ecfdf5"
            leftColor="#a7f3d0"
            rightColor="#6ee7b7"
            glowColor="rgba(16, 185, 129, 0.22)"
            className="lp-float-3d auth-pos-cube-2"
          />
        </div>

        <div className="auth-main__top">
          <Link to="/" className="auth-back">
            <ArrowLeft size={15} /> Home
          </Link>
          <Logo size="sm" showSubtitle={false} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="auth-card"
        >
          <div className="auth-card__brand">
            <Logo size="md" showSubtitle={true} />
          </div>

          <h1 className="auth-card__title">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="auth-card__sub">
            {isRegister
              ? 'Start exploring buying patterns in your store.'
              : 'Sign in to access your transaction analytics workspace.'}
          </p>

          {/* Tab Selector */}
          <div className="auth-tabs" role="tablist" aria-label="Sign in or register">
            <button
              type="button"
              role="tab"
              id="tab-signin"
              aria-selected={!isRegister}
              className={`auth-tab ${!isRegister ? 'is-active' : ''}`}
              onClick={() => { setIsRegister(false); setError(''); setSuccess(''); }}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              id="tab-register"
              aria-selected={isRegister}
              className={`auth-tab ${isRegister ? 'is-active' : ''}`}
              onClick={() => { setIsRegister(true); setError(''); setSuccess(''); }}
            >
              Register
            </button>
            <motion.div
              className="auth-tabs__pill"
              layout
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              style={{
                left: isRegister ? '50%' : '4px',
                right: isRegister ? '4px' : '50%',
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
                  display: 'flex', flexDirection: 'column', gap: '0.45rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  padding: '0.85rem 1rem', borderRadius: '12px',
                  marginBottom: '1.25rem', color: '#dc2626',
                  fontSize: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700 }}>
                  <Clock size={16} style={{ flexShrink: 0 }} />
                  <span>Account Temporarily Locked</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#b91c1c', lineHeight: 1.4 }}>
                  Too many failed attempts for <strong>{lockedEmail}</strong>. This account is locked for 10 minutes.
                </div>
                <div style={{
                  marginTop: '0.2rem',
                  padding: '0.4rem 0.6rem',
                  background: 'rgba(239, 68, 68, 0.08)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--lp-font-mono)',
                  fontSize: '0.82rem'
                }}>
                  <span>Time remaining:</span>
                  <strong style={{ color: '#dc2626', fontSize: '0.95rem' }}>
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
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  padding: '0.75rem 1rem', borderRadius: '12px',
                  marginBottom: '1.25rem', color: '#dc2626',
                  fontSize: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
                {attemptsRemaining !== null && attemptsRemaining > 0 && (
                  <div style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#b45309',
                    marginTop: '0.2rem',
                    paddingLeft: '1.5rem'
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
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  padding: '0.75rem 1rem', borderRadius: '12px',
                  marginBottom: '1.25rem', color: '#059669',
                  fontSize: '0.85rem'
                }}
              >
                <CheckCircle size={16} style={{ flexShrink: 0 }} />
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <input type="text" name="prevent_autofill_email" style={{ display: 'none' }} tabIndex={-1} readOnly />
            <input type="password" name="prevent_autofill_password" style={{ display: 'none' }} tabIndex={-1} readOnly />

            <div
              className="login-scroll-container"
              style={{
                maxHeight: isRegister ? '360px' : '220px',
                overflowY: 'auto',
                paddingRight: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.15rem',
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
                <label className="label">{isRegister ? 'Email Address' : 'Email Address or Username'}</label>
                <input
                  type={isRegister ? "email" : "text"}
                  placeholder={isRegister ? "you@example.com" : "email or username (e.g. admin)"}
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
                    style={{ paddingRight: '48px' }}
                  />
                  <button
                    type="button"
                    className="auth-pw-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
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
                    <label className="label" style={{ marginBottom: '0.5rem', display: 'block' }}>I am a…</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div
                        className={`account-type-card ${accountType === 'admin' ? 'selected' : ''}`}
                        onClick={() => setAccountType('admin')}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: '8px', flexShrink: 0,
                          background: accountType === 'admin' ? 'var(--lp-indigo-50)' : '#f1f2f8',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid ' + (accountType === 'admin' ? 'var(--lp-indigo-100)' : 'transparent'),
                          transition: 'all 0.2s ease'
                        }}>
                          <Store size={16} style={{ color: accountType === 'admin' ? 'var(--lp-indigo)' : 'var(--lp-faint)' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--lp-ink)', marginBottom: '0.1rem' }}>Shop Owner</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--lp-muted)', lineHeight: 1.35 }}>Owns a store, can invite staff members</div>
                        </div>
                      </div>
                      <div
                        className={`account-type-card ${accountType === 'member' ? 'selected' : ''}`}
                        onClick={() => setAccountType('member')}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: '8px', flexShrink: 0,
                          background: accountType === 'member' ? 'var(--lp-emerald-50)' : '#f1f2f8',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid ' + (accountType === 'member' ? '#a7f3d0' : 'transparent'),
                          transition: 'all 0.2s ease'
                        }}>
                          <Users size={16} style={{ color: accountType === 'member' ? 'var(--lp-emerald)' : 'var(--lp-faint)' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--lp-ink)', marginBottom: '0.1rem' }}>Staff Member</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--lp-muted)', lineHeight: 1.35 }}>Joins via an invitation link from a shop owner</div>
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
                      background: 'var(--lp-emerald-50)', border: '1px solid #a7f3d0',
                      borderRadius: '10px', padding: '0.75rem 0.95rem', fontSize: '0.82rem',
                      color: 'var(--lp-emerald-600)', lineHeight: 1.45
                    }}>
                      💬 After registering, your shop owner will send you an invitation link to activate your account.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isCurrentEmailLocked}
              className="lp-btn lp-btn--primary lp-btn--block lp-btn--lg"
              style={{ marginTop: '0.5rem', opacity: isCurrentEmailLocked ? 0.7 : 1 }}
            >
              {isLoading ? (
                <div className="auth-spinner" />
              ) : isCurrentEmailLocked ? (
                'Account Locked'
              ) : (
                isRegister ? (
                  <>Create Account <ArrowRight size={17} className="lp-btn__arrow" /></>
                ) : (
                  <>Sign In <ArrowRight size={17} className="lp-btn__arrow" /></>
                )
              )}
            </button>
          </form>

          <div className="auth-card__switch">
            {isRegister ? (
              <span>
                Already have an account?{' '}
                <button type="button" onClick={() => { setIsRegister(false); setError(''); setSuccess(''); }}>
                  Sign in
                </button>
              </span>
            ) : (
              <span>
                Don't have an account yet?{' '}
                <button type="button" onClick={() => { setIsRegister(true); setError(''); setSuccess(''); }}>
                  Create one
                </button>
              </span>
            )}
          </div>
        </motion.div>

        <p className="auth-main__foot">
          © {new Date().getFullYear()} CoBuy · Buying Pattern Mining System
        </p>
      </main>
    </div>
  );
};

export default Login;
