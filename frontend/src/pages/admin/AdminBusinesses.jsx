import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Building2,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit2,
  Trash2,
  Users,
  Database,
  History,
  Activity,
  AlertTriangle,
  X,
  RefreshCw,
  Phone,
  MapPin,
  Mail,
  Calendar
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function AdminBusinesses() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [businesses, setBusinesses] = useState([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, pending: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [activeTab, setActiveTab] = useState(() => {
    const s = searchParams.get('status');
    if (s === 'Pending Approval') return 'pending';
    if (s === 'Inactive' || s === 'Rejected' || s === 'Inactive,Rejected') return 'inactive';
    return 'all';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(() => searchParams.get('action') === 'new');
  const [inspectBusinessId, setInspectBusinessId] = useState(() => searchParams.get('inspect') || null);
  const [inspectData, setInspectData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectActiveTab, setInspectActiveTab] = useState('overview');

  const [rejectModalData, setRejectModalData] = useState(null); // { id, name, reason: '' }
  const [editModalData, setEditModalData] = useState(null); // business object

  // New Business Form State
  const [newBiz, setNewBiz] = useState({
    name: '',
    owner_email: '',
    owner_name: '',
    business_type: 'Retail',
    address: '',
    contact_phone: '',
    status: 'Active',
    initial_password: 'Password123!'
  });

  const fetchBusinesses = async () => {
    setLoading(true);
    setError('');
    try {
      let statusParam = 'all';
      if (activeTab === 'pending') statusParam = 'Pending Approval';
      else if (activeTab === 'inactive') statusParam = 'Inactive,Rejected';

      const res = await axios.get(`${API_BASE}/admin/businesses`, {
        params: {
          search: searchTerm || undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          status: statusParam !== 'all' ? statusParam : undefined,
          limit: 100
        }
      });
      setBusinesses(res.data.businesses || []);
      setCounts(res.data.counts || { total: 0, active: 0, pending: 0, inactive: 0 });
    } catch (err) {
      console.error('Failed to load businesses:', err);
      setError(err.response?.data?.error || 'Failed to load businesses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [activeTab, searchTerm, typeFilter]);

  // Load Inspection Data if requested
  useEffect(() => {
    if (inspectBusinessId) {
      loadBusinessDetails(inspectBusinessId);
    } else {
      setInspectData(null);
    }
  }, [inspectBusinessId]);

  const loadBusinessDetails = async (id) => {
    setInspectLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/businesses/${id}`);
      setInspectData(res.data);
    } catch (err) {
      alert('Failed to load business details: ' + (err.response?.data?.error || err.message));
    } finally {
      setInspectLoading(false);
    }
  };

  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    if (!newBiz.name.trim() || !newBiz.owner_email.trim()) {
      alert('Business name and owner email are required.');
      return;
    }
    try {
      await axios.post(`${API_BASE}/admin/businesses`, newBiz);
      setShowAddModal(false);
      setNewBiz({
        name: '',
        owner_email: '',
        owner_name: '',
        business_type: 'Retail',
        address: '',
        contact_phone: '',
        status: 'Active',
        initial_password: 'Password123!'
      });
      setSuccessMsg('Business created successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchBusinesses();
    } catch (err) {
      alert('Failed to create business: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleApprove = async (bizId, name) => {
    if (!window.confirm(`Are you sure you want to approve business registration for "${name}"?`)) return;
    try {
      await axios.post(`${API_BASE}/admin/businesses/${bizId}/approve`);
      setSuccessMsg(`"${name}" has been approved!`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchBusinesses();
      if (inspectBusinessId === bizId) loadBusinessDetails(bizId);
    } catch (err) {
      alert('Failed to approve business: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalData) return;
    try {
      await axios.post(`${API_BASE}/admin/businesses/${rejectModalData.id}/reject`, {
        reason: rejectModalData.reason
      });
      setSuccessMsg(`Registration for "${rejectModalData.name}" has been rejected.`);
      setTimeout(() => setSuccessMsg(''), 3000);
      setRejectModalData(null);
      fetchBusinesses();
      if (inspectBusinessId === rejectModalData.id) loadBusinessDetails(rejectModalData.id);
    } catch (err) {
      alert('Failed to reject business: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleToggleStatus = async (biz) => {
    const nextStatus = biz.status === 'Active' ? 'Inactive' : 'Active';
    if (!window.confirm(`Set status of "${biz.name}" to ${nextStatus}?`)) return;
    try {
      await axios.patch(`${API_BASE}/admin/businesses/${biz.id}/status`, { status: nextStatus });
      fetchBusinesses();
    } catch (err) {
      alert('Failed to update status: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editModalData) return;
    try {
      await axios.put(`${API_BASE}/admin/businesses/${editModalData.id}`, editModalData);
      setEditModalData(null);
      setSuccessMsg('Business details updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchBusinesses();
      if (inspectBusinessId === editModalData.id) loadBusinessDetails(editModalData.id);
    } catch (err) {
      alert('Failed to update business: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
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
            Registered Businesses
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
            Manage merchant enterprise tenants, evaluate incoming registrations, and inspect multi-business usage.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.55rem 1.1rem',
            background: '#2563eb',
            color: '#ffffff',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
          }}
        >
          <Plus size={16} />
          <span>Add Business</span>
        </button>
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

      {/* Tabs and Filters */}
      <div style={{
        background: 'var(--admin-card)',
        borderRadius: '12px',
        padding: '1.25rem',
        border: '1px solid var(--admin-card-border)',
        marginBottom: '1.5rem',
        boxShadow: 'var(--admin-shadow)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid var(--admin-card-border)',
          paddingBottom: '1rem',
          marginBottom: '1rem'
        }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
                background: activeTab === 'all' ? '#2563eb' : 'var(--admin-input)',
                color: activeTab === 'all' ? '#ffffff' : 'var(--admin-text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>All Businesses</span>
              <span style={{
                background: activeTab === 'all' ? '#1d4ed8' : 'var(--admin-card-border)',
                color: activeTab === 'all' ? '#ffffff' : 'var(--admin-text-secondary)',
                padding: '1px 6px',
                borderRadius: '9999px',
                fontSize: '0.7rem'
              }}>
                {counts.total}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('pending')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
                background: activeTab === 'pending' ? '#b45309' : 'rgba(245, 158, 11, 0.15)',
                color: activeTab === 'pending' ? '#ffffff' : '#b45309',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Pending Requests</span>
              <span style={{
                background: activeTab === 'pending' ? 'rgba(255,255,255,0.25)' : 'rgba(245, 158, 11, 0.3)',
                color: activeTab === 'pending' ? '#ffffff' : '#b45309',
                padding: '1px 6px',
                borderRadius: '9999px',
                fontSize: '0.7rem'
              }}>
                {counts.pending}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('inactive')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
                background: activeTab === 'inactive' ? '#64748b' : 'var(--admin-input)',
                color: activeTab === 'inactive' ? '#ffffff' : 'var(--admin-text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Inactive / Rejected</span>
              <span style={{
                background: activeTab === 'inactive' ? '#475569' : 'var(--admin-card-border)',
                color: activeTab === 'inactive' ? '#f8fafc' : 'var(--admin-text-secondary)',
                padding: '1px 6px',
                borderRadius: '9999px',
                fontSize: '0.7rem'
              }}>
                {counts.inactive}
              </span>
            </button>
          </div>

          {/* Search & Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--admin-input)',
              border: '1px solid var(--admin-input-border)',
              borderRadius: '8px',
              padding: '0.35rem 0.75rem',
              width: '260px'
            }}>
              <Search size={15} color="var(--admin-text-muted)" style={{ marginRight: '6px' }} />
              <input
                type="text"
                placeholder="Search business or owner..."
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
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
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
              <option value="all">All Business Types</option>
              <option value="Retail">Retail</option>
              <option value="Coffee Shop">Coffee Shop</option>
              <option value="Pet Food & Care">Pet Food & Care</option>
              <option value="Convenience Store">Convenience Store</option>
              <option value="Grocery & Produce">Grocery & Produce</option>
              <option value="Food & Restaurant">Food & Restaurant</option>
            </select>
          </div>
        </div>

        {/* Businesses Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-card-border)', color: 'var(--admin-text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600 }}>Business Name</th>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600 }}>Owner Account</th>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600 }}>Users</th>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600 }}>Datasets</th>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600 }}>Analyses</th>
                <th style={{ padding: '0.75rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={20} className="spinning-icon" style={{ display: 'inline-block', marginRight: '8px' }} />
                    Loading businesses...
                  </td>
                </tr>
              ) : businesses.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                    No businesses matching current filters.
                  </td>
                </tr>
              ) : (
                businesses.map((b) => {
                  const isPending = b.status === 'Pending Approval';
                  const isActive = b.status === 'Active';
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--admin-card-border)' }}>
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: '0.88rem' }}>
                          {b.name}
                        </div>
                        {b.address && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <MapPin size={12} color="var(--admin-text-muted)" />
                            <span>{b.address}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', color: 'var(--admin-text-secondary)', fontWeight: 500 }}>
                        {b.business_type || 'Retail'}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <div style={{ color: 'var(--admin-text-primary)', fontWeight: 600 }}>
                          {b.owner_name || 'Admin'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--admin-text-muted)' }}>
                          {b.owner_email}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <span style={{
                          padding: '3px 9px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: isPending ? '#fef3c7' : isActive ? '#dcfce7' : '#fee2e2',
                          color: isPending ? '#b45309' : isActive ? '#15803d' : '#b91c1c'
                        }}>
                          {b.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', color: 'var(--admin-text-secondary)' }}>
                        {b.users_count || 0}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', color: 'var(--admin-text-secondary)' }}>
                        {b.datasets_count || 0}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', color: 'var(--admin-text-secondary)' }}>
                        {b.analyses_count || 0}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(b.id, b.name)}
                                title="Approve Business"
                                style={{
                                  padding: '4px 10px',
                                  background: '#16a34a',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectModalData({ id: b.id, name: b.name, reason: '' })}
                                title="Reject Business"
                                style={{
                                  padding: '4px 8px',
                                  background: '#ef4444',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Reject
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setInspectBusinessId(b.id)}
                            title="Inspect Details"
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

                          <button
                            onClick={() => setEditModalData(b)}
                            title="Edit Info"
                            style={{
                              padding: '4px 8px',
                              background: 'var(--admin-input)',
                              border: '1px solid var(--admin-input-border)',
                              borderRadius: '6px',
                              color: 'var(--admin-text-muted)',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit2 size={13} />
                          </button>

                          {!isPending && (
                            <button
                              onClick={() => handleToggleStatus(b)}
                              title={isActive ? 'Deactivate' : 'Activate'}
                              style={{
                                padding: '4px 8px',
                                background: 'var(--admin-input)',
                                border: '1px solid var(--admin-input-border)',
                                borderRadius: '6px',
                                color: isActive ? '#ef4444' : '#16a34a',
                                cursor: 'pointer',
                                fontSize: '0.72rem',
                                fontWeight: 600
                              }}
                            >
                              {isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Business Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--admin-card)', borderRadius: '12px', width: '100%', maxWidth: '520px',
            padding: '1.75rem', boxShadow: 'var(--admin-shadow)', border: '1px solid var(--admin-card-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--admin-text-primary)', margin: 0 }}>
                Add New Business
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateBusiness} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '3px' }}>
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Coffee Roasters"
                  value={newBiz.name}
                  onChange={(e) => setNewBiz({ ...newBiz, name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--admin-input-border)', background: 'var(--admin-input)', color: 'var(--admin-text-primary)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    Business Type
                  </label>
                  <select
                    value={newBiz.business_type}
                    onChange={(e) => setNewBiz({ ...newBiz, business_type: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="Retail">Retail</option>
                    <option value="Coffee Shop">Coffee Shop</option>
                    <option value="Pet Food & Care">Pet Food & Care</option>
                    <option value="Convenience Store">Convenience Store</option>
                    <option value="Grocery & Produce">Grocery & Produce</option>
                    <option value="Food & Restaurant">Food & Restaurant</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    Initial Status
                  </label>
                  <select
                    value={newBiz.status}
                    onChange={(e) => setNewBiz({ ...newBiz, status: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="Active">Active (Approved)</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  Owner / Administrator Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@apexcoffee.com"
                  value={newBiz.owner_email}
                  onChange={(e) => setNewBiz({ ...newBiz, owner_email: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    Owner Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Jane Smith"
                    value={newBiz.owner_name}
                    onChange={(e) => setNewBiz({ ...newBiz, owner_name: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    Initial Password
                  </label>
                  <input
                    type="text"
                    value={newBiz.initial_password}
                    onChange={(e) => setNewBiz({ ...newBiz, initial_password: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    Address
                  </label>
                  <input
                    type="text"
                    placeholder="45 Commercial Blvd"
                    value={newBiz.address}
                    onChange={(e) => setNewBiz({ ...newBiz, address: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+1 555-0199"
                    value={newBiz.contact_phone}
                    onChange={(e) => setNewBiz({ ...newBiz, contact_phone: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--admin-input)',
                    border: '1px solid var(--admin-input-border)',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    color: 'var(--admin-text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: '#2563eb',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  Create Business
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Business Modal */}
      {editModalData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--admin-card)', borderRadius: '12px', width: '100%', maxWidth: '480px',
            padding: '1.75rem', boxShadow: 'var(--admin-shadow)', border: '1px solid var(--admin-card-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--admin-text-primary)', margin: 0 }}>
                Edit Business: {editModalData.name}
              </h3>
              <button onClick={() => setEditModalData(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '3px' }}>
                  Business Name
                </label>
                <input
                  type="text"
                  value={editModalData.name}
                  onChange={(e) => setEditModalData({ ...editModalData, name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--admin-input-border)', background: 'var(--admin-input)', color: 'var(--admin-text-primary)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  Business Type
                </label>
                <select
                  value={editModalData.business_type || 'Retail'}
                  onChange={(e) => setEditModalData({ ...editModalData, business_type: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="Retail">Retail</option>
                  <option value="Coffee Shop">Coffee Shop</option>
                  <option value="Pet Food & Care">Pet Food & Care</option>
                  <option value="Convenience Store">Convenience Store</option>
                  <option value="Grocery & Produce">Grocery & Produce</option>
                  <option value="Food & Restaurant">Food & Restaurant</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  Status
                </label>
                <select
                  value={editModalData.status || 'Active'}
                  onChange={(e) => setEditModalData({ ...editModalData, status: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="Active">Active</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  Address
                </label>
                <input
                  type="text"
                  value={editModalData.address || ''}
                  onChange={(e) => setEditModalData({ ...editModalData, address: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={editModalData.contact_phone || ''}
                  onChange={(e) => setEditModalData({ ...editModalData, contact_phone: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setEditModalData(null)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--admin-input)',
                    border: '1px solid var(--admin-input-border)',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    color: 'var(--admin-text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: '#2563eb',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)',
          zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '440px',
            padding: '1.75rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#991b1b', margin: '0 0 0.5rem' }}>
              Reject Business Application
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 1rem' }}>
              Provide a clear reason for rejecting the registration request for <strong>{rejectModalData.name}</strong>.
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Missing valid business registration or tax identification documents..."
              value={rejectModalData.reason}
              onChange={(e) => setRejectModalData({ ...rejectModalData, reason: e.target.value })}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                outline: 'none'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setRejectModalData(null)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--admin-input)',
                  border: '1px solid var(--admin-input-border)',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  color: 'var(--admin-text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive 5-Tab Business Details Modal */}
      {inspectBusinessId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--admin-card)', borderRadius: '14px', width: '100%', maxWidth: '840px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', border: '1px solid var(--admin-card-border)', overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid var(--admin-card-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--admin-hover)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={20} color="#2563eb" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
                    {inspectData?.business?.name || 'Business Details'}
                  </h3>
                  {inspectData?.business?.status && (
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: inspectData.business.status === 'Active' ? '#dcfce7' : inspectData.business.status === 'Pending Approval' ? '#fef3c7' : '#fee2e2',
                      color: inspectData.business.status === 'Active' ? '#15803d' : inspectData.business.status === 'Pending Approval' ? '#b45309' : '#b91c1c'
                    }}>
                      {inspectData.business.status}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', marginTop: '3px' }}>
                  Store ID: #{inspectData?.business?.id} • Type: {inspectData?.business?.business_type || 'Retail'}
                </div>
              </div>

              <button
                onClick={() => setInspectBusinessId(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', padding: '4px' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* 5 Tabs Nav */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--admin-card-border)',
              padding: '0 1.5rem',
              background: 'var(--admin-card)',
              gap: '1rem'
            }}>
              {[
                { id: 'overview', label: 'Overview', icon: Building2 },
                { id: 'users', label: `Users (${inspectData?.users?.length || 0})`, icon: Users },
                { id: 'datasets', label: `Datasets (${inspectData?.datasets?.length || 0})`, icon: Database },
                { id: 'analyses', label: `Analyses (${inspectData?.analyses?.length || 0})`, icon: History },
                { id: 'activity', label: `Activity (${inspectData?.activity?.length || 0})`, icon: Activity }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = inspectActiveTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setInspectActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0.75rem 0.5rem',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#2563eb' : '#64748b',
                      borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent'
                    }}
                  >
                    <Icon size={15} color={isActive ? '#2563eb' : '#64748b'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, padding: '1.5rem 1.75rem', overflowY: 'auto' }}>
              {inspectLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw size={24} className="spinning-icon" style={{ display: 'inline-block', marginBottom: '0.5rem' }} />
                  <div>Loading business information...</div>
                </div>
              ) : !inspectData ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  No data found.
                </div>
              ) : (
                <>
                  {/* Tab 1: Overview */}
                  {inspectActiveTab === 'overview' && (
                    <div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '1rem',
                        marginBottom: '1.5rem'
                      }}>
                        <div style={{ background: 'var(--admin-input)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--admin-card-border)' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Total Users</div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>{inspectData.users?.length || 0}</div>
                        </div>
                        <div style={{ background: 'var(--admin-input)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--admin-card-border)' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Datasets Uploaded</div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>{inspectData.datasets?.length || 0}</div>
                        </div>
                        <div style={{ background: 'var(--admin-input)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--admin-card-border)' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Analyses Run</div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>{inspectData.analyses?.length || 0}</div>
                        </div>
                        <div style={{ background: 'var(--admin-input)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--admin-card-border)' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Audit Events</div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>{inspectData.activity?.length || 0}</div>
                        </div>
                      </div>

                      <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-card-border)', borderRadius: '8px', padding: '1.25rem' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--admin-text-primary)', margin: '0 0 1rem' }}>
                          Enterprise Information
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.84rem' }}>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Owner Account</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{inspectData.business.owner_name || 'Admin'}</span> ({inspectData.business.owner_email})
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Business Type</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{inspectData.business.business_type || 'Retail'}</span>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Physical Address</span>
                            <span style={{ color: '#334155' }}>{inspectData.business.address || 'Not specified'}</span>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Contact Phone</span>
                            <span style={{ color: '#334155' }}>{inspectData.business.contact_phone || 'Not specified'}</span>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Created At</span>
                            <span style={{ color: '#334155' }}>{inspectData.business.created_at}</span>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Approval Info</span>
                            <span style={{ color: '#334155' }}>
                              {inspectData.business.approved_by ? `Approved by ${inspectData.business.approved_by}` : inspectData.business.rejection_reason ? `Rejected: ${inspectData.business.rejection_reason}` : 'Pending review'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Users */}
                  {inspectActiveTab === 'users' && (
                    <div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                            <th style={{ padding: '0.5rem' }}>Name</th>
                            <th style={{ padding: '0.5rem' }}>Email</th>
                            <th style={{ padding: '0.5rem' }}>Role</th>
                            <th style={{ padding: '0.5rem' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(inspectData.users || []).map((u, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600, color: '#0f172a' }}>{u.name}</td>
                              <td style={{ padding: '0.65rem 0.5rem', color: '#475569' }}>{u.email}</td>
                              <td style={{ padding: '0.65rem 0.5rem' }}>
                                <span style={{ padding: '2px 6px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                                  {u.role}
                                </span>
                              </td>
                              <td style={{ padding: '0.65rem 0.5rem' }}>
                                <span style={{ color: u.status === 'active' ? '#15803d' : '#b45309', fontWeight: 600 }}>
                                  {u.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Tab 3: Datasets */}
                  {inspectActiveTab === 'datasets' && (
                    <div>
                      {(inspectData.datasets || []).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                          No datasets uploaded for this business yet.
                        </div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                              <th style={{ padding: '0.5rem' }}>Filename</th>
                              <th style={{ padding: '0.5rem' }}>Transactions</th>
                              <th style={{ padding: '0.5rem' }}>Unique Items</th>
                              <th style={{ padding: '0.5rem' }}>Upload Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inspectData.datasets.map((d, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600, color: '#0f172a' }}>{d.name}</td>
                                <td style={{ padding: '0.65rem 0.5rem', color: '#334155' }}>{d.transaction_count}</td>
                                <td style={{ padding: '0.65rem 0.5rem', color: '#334155' }}>{d.unique_items}</td>
                                <td style={{ padding: '0.65rem 0.5rem', color: '#64748b' }}>{d.upload_date}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Tab 4: Analyses */}
                  {inspectActiveTab === 'analyses' && (
                    <div>
                      {(inspectData.analyses || []).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                          No association mining analyses recorded for this business.
                        </div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                              <th style={{ padding: '0.5rem' }}>Algorithm</th>
                              <th style={{ padding: '0.5rem' }}>Dataset</th>
                              <th style={{ padding: '0.5rem' }}>Rules Found</th>
                              <th style={{ padding: '0.5rem' }}>Execution Time</th>
                              <th style={{ padding: '0.5rem' }}>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inspectData.analyses.map((a, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, color: '#2563eb' }}>{a.algorithm}</td>
                                <td style={{ padding: '0.65rem 0.5rem', color: '#334155' }}>{a.dataset_name || `Dataset #${a.dataset_id}`}</td>
                                <td style={{ padding: '0.65rem 0.5rem', color: '#334155' }}>{a.rules_count}</td>
                                <td style={{ padding: '0.65rem 0.5rem', color: '#64748b' }}>{a.execution_time}s</td>
                                <td style={{ padding: '0.65rem 0.5rem', color: '#64748b' }}>{a.created_at}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Tab 5: Activity */}
                  {inspectActiveTab === 'activity' && (
                    <div>
                      {(inspectData.activity || []).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                          No audit activity logs for this store.
                        </div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                              <th style={{ padding: '0.5rem' }}>Action</th>
                              <th style={{ padding: '0.5rem' }}>User</th>
                              <th style={{ padding: '0.5rem' }}>Timestamp</th>
                              <th style={{ padding: '0.5rem' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inspectData.activity.map((act, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600, color: '#0f172a' }}>{act.action}</td>
                                <td style={{ padding: '0.65rem 0.5rem', color: '#475569' }}>{act.user_email}</td>
                                <td style={{ padding: '0.65rem 0.5rem', color: '#64748b' }}>{act.created_at}</td>
                                <td style={{ padding: '0.65rem 0.5rem', color: '#15803d', fontWeight: 600 }}>{act.status || 'Success'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
