import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Building2,
  Users,
  Database,
  History,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Plus,
  FileDown,
  RefreshCw,
  Eye,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { useAdminTheme } from '../../context/AdminThemeContext';

const API_BASE = 'http://localhost:5000/api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isDark, tokens } = useAdminTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activitySeries, setActivitySeries] = useState([]);
  const [activityDays, setActivityDays] = useState(30);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, actRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/dashboard-stats`),
        axios.get(`${API_BASE}/admin/system-activity?days=${activityDays}`)
      ]);
      setStats(statsRes.data);
      setActivitySeries(actRes.data.series || []);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activityDays]);

  const exportAuditLogs = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/audit-logs/export`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cobuy_platform_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export audit logs.');
    }
  };

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={32} className="spinning-icon" style={{ color: '#3b82f6', marginBottom: '1rem' }} />
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading system admin control center...</p>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Total Businesses',
      value: stats?.total_businesses || 0,
      sub: `${stats?.active_businesses || 0} active • ${stats?.pending_businesses || 0} pending`,
      icon: Building2,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)'
    },
    {
      title: 'Active Businesses',
      value: stats?.active_businesses || 0,
      sub: 'Operating normally',
      icon: CheckCircle2,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)'
    },
    {
      title: 'Pending Approvals',
      value: stats?.pending_businesses || 0,
      sub: stats?.pending_businesses > 0 ? 'Requires your review' : 'No pending queue',
      icon: AlertCircle,
      color: stats?.pending_businesses > 0 ? '#f59e0b' : '#64748b',
      bg: stats?.pending_businesses > 0 ? 'rgba(245, 158, 11, 0.12)' : '#f1f5f9',
      highlight: stats?.pending_businesses > 0,
      onClick: () => navigate('/admin/businesses?status=Pending%20Approval')
    },
    {
      title: 'Platform Users',
      value: stats?.total_users || 0,
      sub: 'Admins & team members',
      icon: Users,
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.1)'
    },
    {
      title: 'Uploaded Datasets',
      value: stats?.total_datasets || 0,
      sub: 'Multi-business repository',
      icon: Database,
      color: '#06b6d4',
      bg: 'rgba(6, 182, 212, 0.1)'
    },
    {
      title: 'Analyses Executed',
      value: stats?.total_analyses || 0,
      sub: 'Apriori & FP-Growth runs',
      icon: History,
      color: '#ec4899',
      bg: 'rgba(236, 72, 153, 0.1)'
    }
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'var(--admin-card)',
        borderRadius: '12px',
        padding: '1.5rem 2rem',
        border: '1px solid var(--admin-card-border)',
        marginBottom: '1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--admin-shadow)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(37, 99, 235, 0.12)',
            border: '1px solid rgba(37, 99, 235, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb',
            flexShrink: 0
          }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
              Admin Dashboard
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
              Monitor all businesses, users, datasets, and platform activities.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => navigate('/admin/businesses?action=new')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 1rem',
              background: '#2563eb',
              color: '#ffffff',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
            }}
          >
            <Plus size={16} />
            <span>Add Business</span>
          </button>
          <button
            onClick={exportAuditLogs}
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
            <span>Export Audit Logs</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#b91c1c',
          marginBottom: '1.5rem',
          fontSize: '0.88rem'
        }}>
          {error}
        </div>
      )}

      {/* 6 Top KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {kpis.map((k, idx) => {
          const Icon = k.icon;
          return (
            <div
              key={idx}
              onClick={k.onClick}
              style={{
                background: 'var(--admin-card)',
                borderRadius: '12px',
                padding: '1.25rem',
                border: k.highlight ? '1px solid #f59e0b' : '1px solid var(--admin-card-border)',
                boxShadow: k.highlight ? '0 4px 12px rgba(245, 158, 11, 0.12)' : 'var(--admin-shadow)',
                cursor: k.onClick ? 'pointer' : 'default',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-muted)' }}>
                  {k.title}
                </span>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  background: k.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={18} color={k.color} />
                </div>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--admin-text-primary)', lineHeight: 1.1 }}>
                {k.value}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: k.highlight ? '#d97706' : 'var(--admin-text-muted)',
                marginTop: '0.5rem',
                fontWeight: k.highlight ? 600 : 400
              }}>
                {k.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* System Activity Chart */}
      <div style={{
        background: 'var(--admin-card)',
        borderRadius: '12px',
        padding: '1.5rem 1.75rem',
        border: '1px solid var(--admin-card-border)',
        marginBottom: '2rem',
        boxShadow: 'var(--admin-shadow)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color="#2563eb" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--admin-text-primary)', margin: 0 }}>
                Platform System Activity Over Time
              </h3>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
              Chronological volume of logins, dataset uploads, rule mining executions, and platform actions
            </p>
          </div>

          {/* Days Filter */}
          <div style={{ display: 'flex', background: 'var(--admin-input)', borderRadius: '8px', padding: '3px', border: '1px solid var(--admin-input-border)' }}>
            {[
              { label: 'Last 7 Days', val: 7 },
              { label: 'Last 30 Days', val: 30 },
              { label: 'Last 90 Days', val: 90 }
            ].map(tab => (
              <button
                key={tab.val}
                onClick={() => setActivityDays(tab.val)}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: activityDays === tab.val ? 'var(--admin-card)' : 'transparent',
                  color: activityDays === tab.val ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)',
                  boxShadow: activityDays === tab.val ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart with labeled axes */}
        <div style={{ width: '100%', height: '320px' }}>
          {activitySeries.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.88rem' }}>
              No system activity recorded in this time range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activitySeries} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={tokens.chartGrid} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke={tokens.textMuted}
                  fontSize={11}
                  tickMargin={10}
                  label={{ value: 'Date (YYYY-MM-DD)', position: 'insideBottom', offset: -15, fill: tokens.textMuted, fontSize: 12 }}
                />
                <YAxis
                  stroke={tokens.textMuted}
                  fontSize={11}
                  allowDecimals={false}
                  label={{ value: 'Number of Activities', angle: -90, position: 'insideLeft', offset: 0, fill: tokens.textMuted, fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    background: tokens.chartTooltipBg,
                    border: `1px solid ${tokens.cardBorder}`,
                    borderRadius: '8px',
                    color: tokens.textPrimary,
                    fontSize: '0.82rem'
                  }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.82rem' }} />
                <Line type="monotone" dataKey="logins" name="User Logins" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="uploads" name="Dataset Uploads" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="analyses" name="Analyses Run" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="user_actions" name="Platform Actions" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Grid: Businesses Overview & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.75rem' }}>
        {/* Businesses Overview Table */}
        <div style={{
          background: 'var(--admin-card)',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid var(--admin-card-border)',
          boxShadow: 'var(--admin-shadow)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--admin-text-primary)', margin: 0 }}>
                Businesses Overview
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                Latest registered tenant enterprises and status
              </p>
            </div>
            <Link
              to="/admin/businesses"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.82rem',
                color: '#2563eb',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-card-border)', color: 'var(--admin-text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>Business Name</th>
                  <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>Users</th>
                  <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>Datasets</th>
                  <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.businesses_overview || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                      No businesses found.
                    </td>
                  </tr>
                ) : (
                  (stats?.businesses_overview || []).map((biz) => {
                    const isPending = biz.status === 'Pending Approval';
                    const isActive = biz.status === 'Active';
                    return (
                      <tr key={biz.id} style={{ borderBottom: '1px solid var(--admin-card-border)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>
                          {biz.name}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--admin-text-secondary)' }}>
                          {biz.type || 'Retail'}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: isPending ? '#fef3c7' : isActive ? '#dcfce7' : '#fee2e2',
                            color: isPending ? '#b45309' : isActive ? '#15803d' : '#b91c1c'
                          }}>
                            {biz.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--admin-text-secondary)' }}>
                          {biz.users_count || 0}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--admin-text-secondary)' }}>
                          {biz.datasets_count || 0}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                          <button
                            onClick={() => navigate(`/admin/businesses?inspect=${biz.id}`)}
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
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent System Activity */}
        <div style={{
          background: 'var(--admin-card)',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid var(--admin-card-border)',
          boxShadow: 'var(--admin-shadow)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--admin-text-primary)', margin: 0 }}>
                Recent System Activity
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                Latest security and operations audit logs
              </p>
            </div>
            <Link
              to="/admin/audit-logs"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.82rem',
                color: '#2563eb',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <span>Audit Log</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-card-border)', color: 'var(--admin-text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>Action</th>
                  <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>User / Store</th>
                  <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>Time</th>
                  <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recent_activity || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                      No recent activity recorded.
                    </td>
                  </tr>
                ) : (
                  (stats?.recent_activity || []).map((act) => (
                    <tr key={act.id} style={{ borderBottom: '1px solid var(--admin-card-border)' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: 'rgba(37, 99, 235, 0.12)',
                          color: '#2563eb'
                        }}>
                          {act.action}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)', fontSize: '0.8rem' }}>
                          {act.user_name || act.user_email}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>
                          {act.business_name || 'System'}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--admin-text-muted)', fontSize: '0.75rem' }}>
                        {act.created_at ? act.created_at.split(' ')[0] : 'Just now'}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: '#dcfce7',
                          color: '#15803d'
                        }}>
                          {act.status || 'Success'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
