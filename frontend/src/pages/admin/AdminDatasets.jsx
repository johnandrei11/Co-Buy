import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Database,
  Search,
  Building2,
  Trash2,
  Eye,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  Calendar,
  X,
  AlertTriangle
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function AdminDatasets() {
  const [datasets, setDatasets] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [businessFilter, setBusinessFilter] = useState('all');

  // Modal
  const [inspectDataset, setInspectDataset] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const fetchDatasets = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE}/admin/datasets`, {
        params: {
          search: searchTerm || undefined,
          business_id: businessFilter !== 'all' ? businessFilter : undefined,
          limit: 100
        }
      });
      setDatasets(res.data.datasets || []);
    } catch (err) {
      console.error('Failed to load datasets:', err);
      setError(err.response?.data?.error || 'Failed to load datasets.');
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
    fetchDatasets();
  }, [searchTerm, businessFilter]);

  const loadDatasetDetails = async (id) => {
    setInspectLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/datasets/${id}`);
      setInspectDataset(res.data);
    } catch (err) {
      alert('Failed to load dataset details: ' + (err.response?.data?.error || err.message));
    } finally {
      setInspectLoading(false);
    }
  };

  const handleDeleteDataset = async (d) => {
    if (!window.confirm(`Are you sure you want to permanently delete dataset "${d.name}" (ID #${d.id})? This will delete all transaction records associated with this file.`)) {
      return;
    }
    try {
      await axios.delete(`${API_BASE}/admin/datasets/${d.id}`);
      setSuccessMsg(`Dataset "${d.name}" has been deleted.`);
      setTimeout(() => setSuccessMsg(''), 3000);
      if (inspectDataset?.id === d.id) setInspectDataset(null);
      fetchDatasets();
    } catch (err) {
      alert('Failed to delete dataset: ' + (err.response?.data?.error || err.message));
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
            Platform Datasets Repository
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
            Multi-business transaction files, detected schemas, cleaning metrics, and storage tracking.
          </p>
        </div>
      </div>

      {successMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          color: '#15803d',
          marginBottom: '1.25rem',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          {successMsg}
        </div>
      )}

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

      {/* Filter controls */}
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
              placeholder="Search filename or uploader..."
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
        </div>
      </div>

      {/* Datasets Table */}
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
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>File Details</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Business</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Transactions</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Unique Items</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Uploaded By</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={20} className="spinning-icon" style={{ display: 'inline-block', marginRight: '8px' }} />
                    Loading datasets...
                  </td>
                </tr>
              ) : datasets.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                    No datasets found matching your criteria.
                  </td>
                </tr>
              ) : (
                datasets.map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--admin-card-border)' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileSpreadsheet size={16} color="#2563eb" />
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>{d.name}</div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--admin-text-muted)' }}>ID #{d.id} • {d.market_type || 'Default'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {d.business_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Building2 size={13} color="var(--admin-text-muted)" />
                          <span style={{ fontWeight: 600, color: 'var(--admin-text-secondary)' }}>{d.business_name}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>Platform Dataset</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>
                      {Number(d.transaction_count || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--admin-text-secondary)' }}>
                      {d.unique_items || 0}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
                      {d.uploader_email || 'admin@ruleminer.ai'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
                      {d.upload_date}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => setInspectDataset(d)}
                          title="Inspect Metadata"
                          style={{
                            padding: '4px 10px',
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
                        <button
                          onClick={() => handleDeleteDataset(d)}
                          title="Delete Dataset"
                          style={{
                            padding: '4px 8px',
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            borderRadius: '6px',
                            color: '#b91c1c',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dataset Details Modal */}
      {inspectDataset && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--admin-card)', borderRadius: '12px', width: '100%', maxWidth: '640px',
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileSpreadsheet size={18} color="#2563eb" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
                    {inspectDataset.name}
                  </h3>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                  Dataset ID: #{inspectDataset.id} • Business: {inspectDataset.business_name || 'Global'}
                </div>
              </div>

              <button
                onClick={() => setInspectDataset(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--admin-input)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--admin-card-border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>Transactions</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>{inspectDataset.transaction_count}</div>
                </div>
                <div style={{ background: 'var(--admin-input)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--admin-card-border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>Unique Items</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>{inspectDataset.unique_items}</div>
                </div>
                <div style={{ background: 'var(--admin-input)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--admin-card-border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>Duplicates Removed</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>{inspectDataset.duplicates_count || 0}</div>
                </div>
                <div style={{ background: 'var(--admin-input)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--admin-card-border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>Missing Dropped</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>{inspectDataset.missing_count || 0}</div>
                </div>
              </div>

              <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-card-border)', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--admin-text-primary)', margin: '0 0 0.75rem' }}>
                  Preprocessing Metadata
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)' }}>Market Type:</span> <strong style={{ color: 'var(--admin-text-primary)' }}>{inspectDataset.market_type || 'Default'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)' }}>Average Basket Value:</span> <strong style={{ color: 'var(--admin-text-primary)' }}>{inspectDataset.basket_avg ? `$${Number(inspectDataset.basket_avg).toFixed(2)}` : 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)' }}>Date Range Span:</span> <strong style={{ color: 'var(--admin-text-primary)' }}>{inspectDataset.date_range_days ? `${inspectDataset.date_range_days} days` : 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--admin-text-muted)' }}>File Hash:</span> <code style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>{inspectDataset.file_hash ? inspectDataset.file_hash.substring(0, 16) + '...' : 'N/A'}</code>
                  </div>
                </div>
              </div>

              {/* Analyses conducted on this dataset */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.75rem' }}>
                  Mining Executions on this Dataset ({inspectDataset.analyses?.length || 0})
                </h4>
                {(inspectDataset.analyses || []).length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    No mining analyses executed yet on this dataset.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {inspectDataset.analyses.map((a, i) => (
                      <div key={i} style={{
                        padding: '0.6rem 0.8rem',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem'
                      }}>
                        <div>
                          <strong style={{ color: '#2563eb' }}>{a.algorithm}</strong> • {a.rules_count} rules • {a.execution_time}s
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.74rem' }}>
                          {a.created_at}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
