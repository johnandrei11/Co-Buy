import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ScrollText,
  Upload,
  Trash2,
  Settings2,
  ChevronDown,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  Calendar,
  User,
  Clock,
  AlertCircle,
  Database,
  Activity,
  Send,
  UserCheck,
  UserX,
  Cpu
} from 'lucide-react';
import { API_BASE } from '../config/api';

// ── Action Badge Config ───────────────────────────────────────────────────────
const ACTION_CONFIG = {
  UPLOAD_HISTORICAL_DATA: {
    label: 'Data Upload',
    icon: <Upload size={12} />,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.25)'
  },
  PURGE_HISTORICAL_DATA: {
    label: 'Data Purge',
    icon: <Trash2 size={12} />,
    color: '#f43f5e',
    bg: 'rgba(244,63,94,0.12)',
    border: 'rgba(244,63,94,0.25)'
  },
  PARAMETER_MUTATION: {
    label: 'Config Change',
    icon: <Settings2 size={12} />,
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.12)',
    border: 'rgba(167,139,250,0.25)'
  },
  invitation_sent: {
    label: 'Invite Sent',
    icon: <Send size={12} />,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.25)'
  },
  generate_invitation: {
    label: 'Invite Sent',
    icon: <Send size={12} />,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.25)'
  },
  invitation_accepted: {
    label: 'Invite Accepted',
    icon: <UserCheck size={12} />,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.25)'
  },
  invitation_declined: {
    label: 'Invite Declined',
    icon: <UserX size={12} />,
    color: '#f43f5e',
    bg: 'rgba(244,63,94,0.12)',
    border: 'rgba(244,63,94,0.25)'
  }
};


function ActionBadge({ action }) {
  const cfg = ACTION_CONFIG[action] || {
    label: action,
    icon: <Activity size={12} />,
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.1)',
    border: 'rgba(148,163,184,0.2)'
  };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.25rem 0.625rem',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: 600,
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      whiteSpace: 'nowrap',
      fontFamily: 'var(--font-mono)'
    }}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── Detail JSON Viewer ────────────────────────────────────────────────────────
function DetailPanel({ details, onEvaluate }) {
  if (!details || typeof details !== 'object') return null;
  return (
    <div style={{
      background: 'var(--table-header-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '1rem',
      marginTop: '0.5rem',
      fontSize: '0.8rem',
      fontFamily: 'var(--font-mono)',
      color: 'var(--text-muted)',
      lineHeight: 1.7,
      overflowX: 'auto'
    }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {Object.entries(details).map(([key, value]) => (
            <tr key={key}>
              <td style={{ paddingRight: '1.5rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', verticalAlign: 'top', paddingBottom: '0.15rem' }}>
                {key}
              </td>
              <td style={{ color: 'var(--text-main)', wordBreak: 'break-all' }}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ filtered }) {
  return (
    <tr>
      <td colSpan={5}>
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          color: 'var(--text-dim)'
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <ScrollText size={22} style={{ color: 'var(--text-dim)' }} />
          </div>
          <p style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            {filtered ? 'No matching logs found' : 'No activity recorded yet'}
          </p>
          <p style={{ fontSize: '0.83rem' }}>
            {filtered
              ? 'Try adjusting your filters or date range.'
              : 'Activity will appear here once your team uploads data or makes changes.'}
          </p>
        </div>
      </td>
    </tr>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const ActivityLog = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Filters
  const [filterUser, setFilterUser] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const handleEvaluateDataset = (datasetId, filename) => {
    if (datasetId) {
      localStorage.setItem('activeDatasetId', String(datasetId));
    }
    if (filename) {
      localStorage.setItem('activeDatasetName', filename);
    }
    sessionStorage.setItem('autoRunBenchmark', 'true');
    navigate('/evaluation', { state: { autoRun: true, datasetId, filename } });
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filterUser) params.user_email = filterUser;
      if (filterStart) params.start_date = filterStart;
      if (filterEnd) params.end_date = filterEnd + ' 23:59:59';
      const res = await axios.get(`${API_BASE}/activity-logs`, { params });
      setLogs(res.data.logs || []);
      setUsers(res.data.users || []);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Access denied. Only Store Administrators can view the audit log.');
      } else {
        setError('Failed to load activity logs. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [filterUser, filterStart, filterEnd]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr + ' UTC');
      return d.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return dateStr; }
  };

  const filteredLogs = filterAction
    ? logs.filter(l => l.action === filterAction)
    : logs;

  const stats = {
    total: logs.length,
    uploads: logs.filter(l => l.action === 'UPLOAD_HISTORICAL_DATA').length,
    purges: logs.filter(l => l.action === 'PURGE_HISTORICAL_DATA').length,
    configs: logs.filter(l => l.action === 'PARAMETER_MUTATION').length
  };

  return (
    <div className="fade-in">
      {/* Header */}
      {!embedded ? (
        <div className="page-header">
          <div>
            <h1 className="page-title">
              <ScrollText size={28} style={{ color: 'var(--primary-color)' }} />
              Activity Audit Log
            </h1>
            <p className="page-subtitle">
              Full audit trail of data operations and configuration changes across your store.
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={fetchLogs}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontWeight: '700', fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.55rem', margin: 0 }}>
              <ScrollText size={22} style={{ color: 'var(--primary-color)' }} />
              Store Activity Audit Log
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
              Exclusive admin audit trail of data uploads, purges, invitations, and configuration changes.
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={fetchLogs}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh Log
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {[
          { label: 'Total Events', value: stats.total, icon: <Activity size={18} />, color: '#94a3b8' },
          { label: 'Data Uploads', value: stats.uploads, icon: <Upload size={18} />, color: '#3b82f6' },
          { label: 'Data Purges', value: stats.purges, icon: <Trash2 size={18} />, color: '#f43f5e' },
          { label: 'Config Changes', value: stats.configs, icon: <Settings2 size={18} />, color: '#a78bfa' }
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
              background: s.color + '18',
              border: '1px solid ' + s.color + '30',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: s.color
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', lineHeight: 1 }}>
                {loading ? '—' : s.value}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
          <Filter size={15} />
          Filters
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.875rem',
          alignItems: 'end'
        }}>
          {/* User filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={13} /> User
            </label>
            <div style={{ position: 'relative' }}>
              <select
                className="select"
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                style={{ appearance: 'none', paddingRight: '32px', height: '46px' }}
              >
                <option value="">All users</option>
                {users.map(u => (
                  <option key={u.user_email} value={u.user_email}>
                    {u.name || u.user_email}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Action type filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Database size={13} /> Action
            </label>
            <div style={{ position: 'relative' }}>
              <select
                className="select"
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                style={{ appearance: 'none', paddingRight: '32px', height: '46px' }}
              >
                <option value="">All actions</option>
                <option value="UPLOAD_HISTORICAL_DATA">Data Uploads</option>
                <option value="PURGE_HISTORICAL_DATA">Data Purges</option>
                <option value="PARAMETER_MUTATION">Config Changes</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Date range */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={13} /> From
            </label>
            <input
              type="date"
              className="input"
              value={filterStart}
              onChange={(e) => setFilterStart(e.target.value)}
              style={{ height: '46px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={13} /> To
            </label>
            <input
              type="date"
              className="input"
              value={filterEnd}
              onChange={(e) => setFilterEnd(e.target.value)}
              style={{ height: '46px' }}
            />
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => { setFilterUser(''); setFilterStart(''); setFilterEnd(''); setFilterAction(''); }}
            style={{
              height: '46px',
              alignSelf: 'end',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box'
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.5rem',
          color: '#ef4444', fontSize: '0.88rem'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* Log Table */}
      {!error && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '48px' }}>#</th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={13} /> Timestamp</div>
                  </th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><User size={13} /> User</div>
                  </th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Summary</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '4rem', textAlign: 'center' }}>
                      <div className="spin" style={{
                        width: 28, height: 28, borderRadius: '50%',
                        border: '2px solid var(--border-color)',
                        borderTopColor: 'var(--primary-color)',
                        margin: '0 auto 0.75rem'
                      }} />
                      <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>Loading activity logs…</p>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <EmptyState filtered={!!(filterUser || filterStart || filterEnd || filterAction)} />
                ) : (
                  filteredLogs.map((log, idx) => {
                    const isEven = idx % 2 === 0;
                    const isExpanded = expandedRows.has(log.id);
                    const hasDetails = log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0;

                    let summary = '';
                    if (log.action === 'UPLOAD_HISTORICAL_DATA' && log.details) {
                      summary = `${log.details.filename || 'file'} · ${log.details.transaction_count ?? '?'} txns · ${log.details.market_type || ''}`;
                    } else if (log.action === 'PURGE_HISTORICAL_DATA' && log.details) {
                      summary = `Deleted: ${log.details.filename || `Dataset #${log.details.dataset_id}`}`;
                    } else if (log.action === 'PARAMETER_MUTATION' && log.details) {
                      summary = `Changed mining parameters`;
                    }

                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          onClick={() => hasDetails && toggleRow(log.id)}
                          style={{
                            background: isEven ? 'var(--table-bg)' : 'transparent',
                            borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)',
                            cursor: hasDetails ? 'pointer' : 'default',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={e => { if (hasDetails) e.currentTarget.style.background = 'var(--inner-box-bg)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isEven ? 'var(--table-bg)' : 'transparent'; }}
                        >
                          <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                            {hasDetails ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                {isExpanded
                                  ? <ChevronDown size={14} style={{ color: 'var(--primary-color)' }} />
                                  : <ChevronRight size={14} />}
                              </div>
                            ) : idx + 1}
                          </td>
                          <td style={{ padding: '0.875rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {formatDate(log.created_at)}
                          </td>
                          <td style={{ padding: '0.875rem 1rem' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                              {log.user_name || log.user_email}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                              {log.user_email}
                            </div>
                          </td>
                          <td style={{ padding: '0.875rem 1rem' }}>
                            <ActionBadge action={log.action} />
                          </td>
                          <td style={{ padding: '0.875rem 1rem', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                            <div style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {summary || '—'}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && hasDetails && (
                          <tr style={{ background: isEven ? 'var(--table-bg)' : 'transparent', borderBottom: '1px solid var(--border-color)' }}>
                            <td colSpan={5} style={{ padding: '0 1.25rem 1rem' }}>
                              <DetailPanel details={log.details} onEvaluate={handleEvaluateDataset} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {!loading && filteredLogs.length > 0 && (
            <div style={{
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid var(--border-color)',
              fontSize: '0.8rem',
              color: 'var(--text-dim)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Showing {filteredLogs.length} of {logs.length} events</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>Click any row to expand details</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
