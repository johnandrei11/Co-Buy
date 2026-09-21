import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ScrollText,
  Search,
  Building2,
  FileDown,
  RefreshCw,
  Eye,
  X,
  Filter,
  ShieldAlert,
  Clock,
  Calendar
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [businessFilter, setBusinessFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const limit = 50;

  // Inspect Modal
  const [inspectEvent, setInspectEvent] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE}/admin/audit-logs`, {
        params: {
          search: searchTerm || undefined,
          business: businessFilter !== 'all' ? businessFilter : undefined,
          action: actionFilter !== 'all' ? actionFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          limit,
          offset: page * limit
        }
      });
      setLogs(res.data.logs || []);
      setTotalLogs(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err.response?.data?.error || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinesses = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/businesses?limit=200`);
      setBusinesses(res.data.businesses || []);
    } catch (err) {
      console.error('Failed to load businesses list:', err);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [searchTerm, businessFilter, actionFilter, statusFilter, startDate, endDate, page]);

  const handleExportCSV = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/audit-logs/export`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cobuy_platform_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export audit logs: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
            Security & System Audit Trail
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
            Comprehensive tamper-evident chronological event log of logins, business approvals, data modifications, and configuration updates.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.55rem 1rem',
            background: 'var(--admin-input)',
            color: 'var(--admin-text-secondary)',
            borderRadius: '8px',
            border: '1px solid var(--admin-input-border)',
            fontWeight: 600,
            fontSize: '0.84rem',
            cursor: 'pointer'
          }}
        >
          <FileDown size={16} />
          <span>Export CSV Report</span>
        </button>
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#b91c1c',
          marginBottom: '1.25rem',
          fontSize: '0.85rem'
        }}>
          {error}
        </div>
      )}

      {/* Filter Toolbar */}
      <div style={{
        background: 'var(--admin-card)',
        borderRadius: '12px',
        padding: '1.25rem',
        border: '1px solid var(--admin-card-border)',
        marginBottom: '1.5rem',
        boxShadow: 'var(--admin-shadow)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--admin-input)',
            border: '1px solid var(--admin-input-border)',
            borderRadius: '8px',
            padding: '0.35rem 0.75rem',
            flex: '1',
            minWidth: '220px'
          }}>
            <Search size={15} color="var(--admin-text-muted)" style={{ marginRight: '6px' }} />
            <input
              type="text"
              placeholder="Search action, details, or user..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.82rem',
                color: 'var(--admin-text-primary)',
                width: '100%'
              }}
            />
          </div>

          <select
            value={businessFilter}
            onChange={(e) => { setBusinessFilter(e.target.value); setPage(0); }}
            style={{
              padding: '0.4rem 0.75rem',
              background: 'var(--admin-input)',
              border: '1px solid var(--admin-input-border)',
              borderRadius: '8px',
              fontSize: '0.82rem',
              color: 'var(--admin-text-primary)',
              outline: 'none'
            }}
          >
            <option value="all">All Businesses</option>
            {businesses.map(b => {
              const isDuplicate = businesses.filter(item => item.name?.toLowerCase() === b.name?.toLowerCase()).length > 1;
              const label = isDuplicate && b.owner_email ? `${b.name} (${b.owner_email})` : b.name;
              return (
                <option key={b.id} value={b.id}>{label}</option>
              );
            })}
          </select>

          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
            style={{
              padding: '0.4rem 0.75rem',
              background: 'var(--admin-input)',
              border: '1px solid var(--admin-input-border)',
              borderRadius: '8px',
              fontSize: '0.82rem',
              color: 'var(--admin-text-primary)',
              outline: 'none'
            }}
          >
            <option value="all">All Actions</option>
            <option value="LOGIN">User Logins</option>
            <option value="CREATE_BUSINESS">Create Business</option>
            <option value="APPROVE_BUSINESS">Approve Business</option>
            <option value="REJECT_BUSINESS">Reject Business</option>
            <option value="CREATE_USER">Create User</option>
            <option value="UPDATE_USER">Update User</option>
            <option value="UPLOAD">Dataset Uploads</option>
            <option value="DELETE_DATASET">Delete Dataset</option>
            <option value="ANALYSIS">Analyses Run</option>
            <option value="UPDATE_SETTINGS">Settings Changes</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            style={{
              padding: '0.4rem 0.75rem',
              background: 'var(--admin-input)',
              border: '1px solid var(--admin-input-border)',
              borderRadius: '8px',
              fontSize: '0.82rem',
              color: 'var(--admin-text-primary)',
              outline: 'none'
            }}
          >
            <option value="all">All Statuses</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
              style={{
                padding: '0.35rem 0.5rem',
                background: 'var(--admin-input)',
                border: '1px solid var(--admin-input-border)',
                borderRadius: '6px',
                fontSize: '0.78rem',
                color: 'var(--admin-text-primary)'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
              style={{
                padding: '0.35rem 0.5rem',
                background: 'var(--admin-input)',
                border: '1px solid var(--admin-input-border)',
                borderRadius: '6px',
                fontSize: '0.78rem',
                color: 'var(--admin-text-primary)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div style={{
        background: 'var(--admin-card)',
        borderRadius: '12px',
        border: '1px solid var(--admin-card-border)',
        boxShadow: 'var(--admin-shadow)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-card-border)', color: 'var(--admin-text-muted)', textAlign: 'left', background: 'var(--admin-hover)' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Timestamp</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Action Event</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Business</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>User</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                    <RefreshCw size={20} className="spinning-icon" style={{ display: 'inline-block', marginRight: '8px' }} />
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                    No audit records match the current filters.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--admin-card-border)' }}>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--admin-text-muted)', fontSize: '0.78rem' }}>
                      {l.created_at}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: 'rgba(37, 99, 235, 0.12)',
                        color: '#2563eb'
                      }}>
                        {l.action}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {l.business_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Building2 size={13} color="var(--admin-text-muted)" />
                          <span style={{ fontWeight: 600, color: 'var(--admin-text-primary)' }}>{l.business_name}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>Platform Global</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)' }}>{l.user_name || l.user_email}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--admin-text-muted)' }}>{l.user_email}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        padding: '2px 7px',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: l.status === 'Success' ? '#dcfce7' : '#fee2e2',
                        color: l.status === 'Success' ? '#15803d' : '#b91c1c'
                      }}>
                        {l.status || 'Success'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => setInspectEvent(l)}
                        style={{
                          padding: '4px 8px',
                          background: 'var(--admin-input)',
                          border: '1px solid var(--admin-input-border)',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--admin-text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{
          padding: '0.85rem 1.25rem',
          borderTop: '1px solid var(--admin-card-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--admin-hover)',
          fontSize: '0.8rem',
          color: 'var(--admin-text-muted)'
        }}>
          <div>
            Showing {logs.length > 0 ? page * limit + 1 : 0} to {Math.min((page + 1) * limit, totalLogs)} of {totalLogs} events
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--admin-input-border)',
                background: 'var(--admin-input)',
                color: page === 0 ? 'var(--admin-text-muted)' : 'var(--admin-text-primary)',
                cursor: page === 0 ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              Previous
            </button>
            <button
              disabled={(page + 1) * limit >= totalLogs}
              onClick={() => setPage(p => p + 1)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--admin-input-border)',
                background: 'var(--admin-input)',
                color: (page + 1) * limit >= totalLogs ? 'var(--admin-text-muted)' : 'var(--admin-text-primary)',
                cursor: (page + 1) * limit >= totalLogs ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Inspect Event Modal */}
      {inspectEvent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--admin-card)', borderRadius: '12px', width: '100%', maxWidth: '520px',
            boxShadow: 'var(--admin-shadow)', border: '1px solid var(--admin-card-border)', overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--admin-card-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--admin-hover)'
            }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
                  Audit Event #{inspectEvent.id}
                </h3>
                <div style={{ fontSize: '0.76rem', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                  {inspectEvent.action} • {inspectEvent.created_at}
                </div>
              </div>
              <button
                onClick={() => setInspectEvent(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', fontSize: '0.84rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: '0.75rem' }}>Actor</span>
                <span style={{ fontWeight: 600, color: 'var(--admin-text-primary)' }}>{inspectEvent.user_name || inspectEvent.user_email}</span> ({inspectEvent.user_email})
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: '0.75rem' }}>Business Enterprise</span>
                <span style={{ color: 'var(--admin-text-secondary)' }}>{inspectEvent.business_name || 'System Level Action'}</span>
              </div>

              <div>
                <span style={{ color: 'var(--admin-text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Event Payload / Details</span>
                <pre style={{
                  background: 'var(--admin-input)',
                  border: '1px solid var(--admin-card-border)',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  fontSize: '0.76rem',
                  color: 'var(--admin-text-secondary)',
                  overflowX: 'auto',
                  fontFamily: 'monospace',
                  margin: 0
                }}>
                  {inspectEvent.details ? JSON.stringify(inspectEvent.details_parsed || inspectEvent.details, null, 2) : 'No payload metadata'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
