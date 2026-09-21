import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Bell,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function NotificationBell({ user, onLogin }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API_BASE}/notifications`);
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (e) { /* silent */ }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAccept = async (notif) => {
    setLoadingId(notif.id);
    try {
      const res = await axios.post(`${API_BASE}/v1/invitations/${notif.reference_id}/accept`);
      if (res.data.user && res.data.token && onLogin) {
        onLogin(res.data.token, res.data.user);
      }
      fetchNotifications();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to accept invitation.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDecline = async (notif) => {
    setLoadingId(`d-${notif.id}`);
    try {
      await axios.post(`${API_BASE}/v1/invitations/${notif.reference_id}/decline`);
      fetchNotifications();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to decline invitation.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleMarkRead = async (notifId) => {
    try {
      await axios.post(`${API_BASE}/notifications/${notifId}/read`);
      fetchNotifications();
    } catch (e) { /* silent */ }
  };

  const typeLabel = (type) => {
    if (type === 'invitation_received') return 'Store Invitation';
    if (type === 'invitation_accepted') return 'Invite Accepted';
    if (type === 'invitation_declined') return 'Invite Declined';
    return type;
  };

  const typeColor = (type) => {
    if (type === 'invitation_received') return '#3b82f6';
    if (type === 'invitation_accepted') return '#10b981';
    if (type === 'invitation_declined') return '#f43f5e';
    return '#94a3b8';
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = Math.floor((Date.now() - new Date(ts + 'Z').getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        id="notification-bell-btn"
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications(); }}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--text-muted)',
          padding: '8px', borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
        title="Notifications"
      >
        <Bell size={19} style={{ color: unreadCount > 0 ? 'var(--primary-color)' : 'var(--text-dim)' }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 16, height: 16,
            background: '#ef4444',
            borderRadius: '50%',
            fontSize: '0.65rem', fontWeight: 700,
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-color)',
            lineHeight: 1
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 340, maxHeight: 480,
          background: 'var(--card-bg)', border: '1px solid var(--border-color)',
          borderRadius: '12px', boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          zIndex: 2000, overflow: 'hidden',
          display: 'flex', flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-color)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--inner-box-bg)'
          }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={async () => { await axios.post(`${API_BASE}/notifications/read-all`); fetchNotifications(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600 }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                <Bell size={28} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                <div>No notifications</div>
              </div>
            ) : notifications.map((notif) => (
              <div
                key={notif.id}
                style={{
                  padding: '0.875rem 1rem',
                  borderBottom: '1px solid var(--border-color)',
                  background: notif.read ? 'transparent' : 'rgba(59,130,246,0.04)',
                  transition: 'background 0.2s'
                }}
              >
                {/* Badge + time */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700,
                    color: typeColor(notif.type),
                    background: `${typeColor(notif.type)}18`,
                    border: `1px solid ${typeColor(notif.type)}30`,
                    padding: '0.15rem 0.5rem', borderRadius: '20px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {typeLabel(notif.type)}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={10} />
                    {timeAgo(notif.created_at)}
                  </span>
                </div>

                {/* Body */}
                {notif.type === 'invitation_received' && (
                  <>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.6rem', lineHeight: 1.45 }}>
                      You've been invited to join
                      <strong style={{ color: 'var(--text-main)' }}> {notif.store_name || 'a store'}</strong>
                      {notif.invited_by && <> by <strong style={{ color: 'var(--text-main)' }}>{notif.invited_by}</strong></>}.
                    </p>
                    {notif.inv_status === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          id={`accept-invite-${notif.reference_id}`}
                          onClick={() => handleAccept(notif)}
                          disabled={loadingId === notif.id}
                          style={{
                            flex: 1, padding: '0.4rem 0', borderRadius: '6px',
                            background: '#10b981', color: '#fff',
                            border: 'none', cursor: 'pointer',
                            fontSize: '0.78rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                            opacity: loadingId === notif.id ? 0.6 : 1
                          }}
                        >
                          {loadingId === notif.id
                            ? <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #fff', borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }} />
                            : <><CheckCircle2 size={13} /> Accept</>}
                        </button>
                        <button
                          id={`decline-invite-${notif.reference_id}`}
                          onClick={() => handleDecline(notif)}
                          disabled={loadingId === `d-${notif.id}`}
                          style={{
                            flex: 1, padding: '0.4rem 0', borderRadius: '6px',
                            background: 'rgba(244,63,94,0.12)', color: '#f43f5e',
                            border: '1px solid rgba(244,63,94,0.25)', cursor: 'pointer',
                            fontSize: '0.78rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                            opacity: loadingId === `d-${notif.id}` ? 0.6 : 1
                          }}
                        >
                          <XCircle size={13} /> Decline
                        </button>
                      </div>
                    )}
                    {notif.inv_status === 'accepted' && (
                      <p style={{ fontSize: '0.78rem', color: '#10b981', margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CheckCircle2 size={12} /> Accepted
                      </p>
                    )}
                    {notif.inv_status === 'declined' && (
                      <p style={{ fontSize: '0.78rem', color: '#f43f5e', margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <XCircle size={12} /> Declined
                      </p>
                    )}
                  </>
                )}

                {notif.type === 'invitation_accepted' && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                    A team member accepted your invitation to <strong style={{ color: 'var(--text-main)' }}>{notif.store_name || 'your store'}</strong>.
                  </p>
                )}

                {notif.type === 'invitation_declined' && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                    A team member declined your invitation to <strong style={{ color: 'var(--text-main)' }}>{notif.store_name || 'your store'}</strong>.
                  </p>
                )}

                {!notif.read && notif.type !== 'invitation_received' && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.4rem', padding: 0 }}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
