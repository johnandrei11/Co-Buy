import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  History,
  Search,
  Building2,
  RefreshCw,
  Clock,
  Layers,
  Sparkles,
  Eye,
  X,
  FileText
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function AdminAnalysisHistory() {
  const [analyses, setAnalyses] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [businessFilter, setBusinessFilter] = useState('all');
  const [algorithmFilter, setAlgorithmFilter] = useState('all');

  // Details Modal
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  const fetchAnalyses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE}/admin/analysis-history`, {
        params: {
          search: searchTerm || undefined,
          business_id: businessFilter !== 'all' ? businessFilter : undefined,
          algorithm: algorithmFilter !== 'all' ? algorithmFilter : undefined,
          limit: 100
        }
      });
      setAnalyses(res.data.analyses || []);
    } catch (err) {
      console.error('Failed to load analyses:', err);
      setError(err.response?.data?.error || 'Failed to load analysis records.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinesses = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/businesses?limit=200`);
      setBusinesses(res.data.businesses || []);
    } catch (err) {
      console.error('Failed to load businesses:', err);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    fetchAnalyses();
  }, [searchTerm, businessFilter, algorithmFilter]);

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
            Analysis & Mining Execution Logs
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
            Historical record of all association rule mining executions, algorithm selections, and performance benchmarks.
          </p>
        </div>
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

      {/* Filter Bar */}
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
            minWidth: '240px'
          }}>
            <Search size={15} color="var(--admin-text-muted)" style={{ marginRight: '6px' }} />
            <input
              type="text"
              placeholder="Search algorithm, business, or dataset..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            onChange={(e) => setBusinessFilter(e.target.value)}
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
            value={algorithmFilter}
            onChange={(e) => setAlgorithmFilter(e.target.value)}
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
            <option value="all">All Algorithms</option>
            <option value="apriori">Apriori</option>
            <option value="fpgrowth">FP-Growth</option>
            <option value="auto">Auto-Selected</option>
          </select>
        </div>
      </div>

      {/* Analyses Table */}
      <div style={{
        background: 'var(--admin-card)',
        borderRadius: '12px',
        border: '1px solid var(--admin-card-border)',
        boxShadow: 'var(--admin-shadow)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-card-border)', color: 'var(--admin-text-muted)', textAlign: 'left', background: 'var(--admin-hover)' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Algorithm</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Business</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Dataset</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Rules Found</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Execution Time</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Executed By</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Timestamp</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={20} className="spinning-icon" style={{ display: 'inline-block', marginRight: '8px' }} />
                    Loading execution logs...
                  </td>
                </tr>
              ) : analyses.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                    No mining execution logs found.
                  </td>
                </tr>
              ) : (
                analyses.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--admin-card-border)' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        background: a.algorithm === 'apriori' ? 'rgba(37, 99, 235, 0.12)' : 'rgba(147, 51, 234, 0.12)',
                        color: a.algorithm === 'apriori' ? '#2563eb' : '#9333ea'
                      }}>
                        {a.algorithm?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Building2 size={13} color="var(--admin-text-muted)" />
                        <span style={{ fontWeight: 600, color: 'var(--admin-text-primary)' }}>{a.business_name || 'Global'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--admin-text-secondary)' }}>
                      {a.dataset_name || `Dataset #${a.dataset_id}`}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>
                      {a.rules_count?.toLocaleString() || 0}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--admin-text-secondary)' }}>
                      {Number(a.execution_time).toFixed(4)}s
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--admin-text-muted)', fontSize: '0.78rem' }}>
                      {a.user_email || 'System'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--admin-text-muted)', fontSize: '0.78rem' }}>
                      {a.created_at}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedAnalysis(a)}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedAnalysis && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--admin-card)', borderRadius: '12px', width: '100%', maxWidth: '560px',
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
                  Mining Execution #{selectedAnalysis.id}
                </h3>
                <div style={{ fontSize: '0.76rem', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                  {selectedAnalysis.business_name} • {selectedAnalysis.created_at}
                </div>
              </div>
              <button
                onClick={() => setSelectedAnalysis(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'var(--admin-input)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--admin-card-border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>Algorithm</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb' }}>{selectedAnalysis.algorithm}</div>
                </div>
                <div style={{ background: 'var(--admin-input)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--admin-card-border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>Execution Time</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>{Number(selectedAnalysis.execution_time).toFixed(4)}s</div>
                </div>
                <div style={{ background: 'var(--admin-input)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--admin-card-border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>Association Rules Found</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>{selectedAnalysis.rules_count}</div>
                </div>
                <div style={{ background: 'var(--admin-input)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--admin-card-border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>Frequent Itemsets</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>{selectedAnalysis.frequent_itemsets_count || 0}</div>
                </div>
              </div>

              <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-card-border)', borderRadius: '8px', padding: '1rem', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', marginBottom: '0.5rem' }}>Parameters Configured</div>
                <pre style={{ margin: 0, fontSize: '0.76rem', color: 'var(--admin-text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {selectedAnalysis.parameters}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
