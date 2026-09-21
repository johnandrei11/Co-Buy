import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Users,
  Search,
  Plus,
  Edit2,
  KeyRound,
  Shield,
  Building2,
  CheckCircle,
  XCircle,
  X,
  RefreshCw,
  Mail,
  UserCheck
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function AdminUsers() {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [businessFilter, setBusinessFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(() => searchParams.get('action') === 'new');
  const [editUser, setEditUser] = useState(null);
  const [resetPasswordEmail, setResetPasswordEmail] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Add User Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: 'Password123!',
    role: 'business_admin',
    store_id: 'none',
    status: 'active'
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE}/admin/users`, {
        params: {
          search: searchTerm || undefined,
          business_id: businessFilter !== 'all' ? businessFilter : undefined,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          limit: 100
        }
      });
      setUsers(res.data.users || []);
      setTotalUsers(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err.response?.data?.error || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessesList = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/businesses?limit=200`);
      setBusinesses(res.data.businesses || []);
    } catch (err) {
      console.error('Failed to load businesses dropdown:', err);
    }
  };

  useEffect(() => {
    fetchBusinessesList();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, businessFilter, roleFilter, statusFilter]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) {
      alert('Name, email, and password are required.');
      return;
    }
    try {
      await axios.post(`${API_BASE}/admin/users`, {
        ...newUser,
        store_id: newUser.store_id !== 'none' ? Number(newUser.store_id) : null
      });
      setShowAddModal(false);
      setNewUser({
        name: '',
        email: '',
        password: 'Password123!',
        role: 'business_admin',
        store_id: 'none',
        status: 'active'
      });
      setSuccessMsg('User account created successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchUsers();
    } catch (err) {
      alert('Failed to create user: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      await axios.put(`${API_BASE}/admin/users/${encodeURIComponent(editUser.email)}`, {
        name: editUser.name,
        role: editUser.role,
        store_id: editUser.store_id !== 'none' ? Number(editUser.store_id) : null,
        status: editUser.status
      });
      setEditUser(null);
      setSuccessMsg('User updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchUsers();
    } catch (err) {
      alert('Failed to update user: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleToggleStatus = async (u) => {
    const nextStatus = u.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`Set status of ${u.email} to ${nextStatus}?`)) return;
    try {
      await axios.patch(`${API_BASE}/admin/users/${encodeURIComponent(u.email)}/status`, {
        status: nextStatus
      });
      fetchUsers();
    } catch (err) {
      alert('Failed to toggle status: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    try {
      await axios.post(`${API_BASE}/admin/users/${encodeURIComponent(resetPasswordEmail)}/reset-password`, {
        new_password: newPassword
      });
      setResetPasswordEmail(null);
      setNewPassword('');
      setSuccessMsg('Password reset successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('Failed to reset password: ' + (err.response?.data?.error || err.message));
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
            System User Accounts
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
            Cross-tenant directory of system administrators, merchant store owners, and staff members.
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
          <span>Add User</span>
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

      {/* Filters Bar */}
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
          flexWrap: 'wrap',
          gap: '0.85rem'
        }}>
          {/* Search */}
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
              placeholder="Search user by name or email..."
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

          {/* Business Filter */}
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

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
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
            <option value="all">All Roles</option>
            <option value="system_admin">System Admin</option>
            <option value="business_admin">Business Admin</option>
            <option value="staff">Staff / Team Member</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
            <option value="active">Active</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
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
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>User</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Assigned Business</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                    <RefreshCw size={20} className="spinning-icon" style={{ display: 'inline-block', marginRight: '8px' }} />
                    Loading users directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSysAdmin = u.role === 'system_admin';
                  const isBizAdmin = u.role === 'business_admin' || u.role === 'shop_admin';
                  const isActive = u.status === 'active';
                  const isPending = u.status === 'pending_approval' || u.status === 'pending';

                  return (
                    <tr key={u.email} style={{ borderBottom: '1px solid var(--admin-card-border)' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>{u.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: isSysAdmin ? '#fee2e2' : isBizAdmin ? '#eff6ff' : 'var(--admin-input)',
                          color: isSysAdmin ? '#991b1b' : isBizAdmin ? '#1d4ed8' : 'var(--admin-text-secondary)',
                          border: '1px solid var(--admin-input-border)'
                        }}>
                          {isSysAdmin ? 'System Admin' : isBizAdmin ? 'Business Admin' : 'Staff / Member'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--admin-text-secondary)' }}>
                        {u.store_name ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Building2 size={14} color="var(--admin-text-muted)" />
                            <span>{u.store_name}</span>
                          </div>
                        ) : isSysAdmin ? (
                          <span style={{ color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>Global Access</span>
                        ) : (
                          <span style={{ color: '#d97706' }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          background: isActive ? '#dcfce7' : isPending ? '#fef3c7' : '#fee2e2',
                          color: isActive ? '#15803d' : isPending ? '#b45309' : '#b91c1c'
                        }}>
                          {isActive ? 'Active' : isPending ? 'Pending' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => setEditUser({ ...u, store_id: u.store_id || 'none' })}
                            title="Edit User"
                            style={{
                              padding: '4px 8px',
                              background: 'var(--admin-input)',
                              border: '1px solid var(--admin-input-border)',
                              borderRadius: '6px',
                              color: 'var(--admin-text-secondary)',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            onClick={() => setResetPasswordEmail(u.email)}
                            title="Reset Password"
                            style={{
                              padding: '4px 8px',
                              background: 'var(--admin-input)',
                              border: '1px solid var(--admin-input-border)',
                              borderRadius: '6px',
                              color: 'var(--admin-text-secondary)',
                              cursor: 'pointer'
                            }}
                          >
                            <KeyRound size={13} />
                          </button>

                          {!isSysAdmin && (
                            <button
                              onClick={() => handleToggleStatus(u)}
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
                              {isActive ? 'Disable' : 'Enable'}
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

      {/* Add User Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--admin-card)', borderRadius: '12px', width: '100%', maxWidth: '460px',
            padding: '1.75rem', boxShadow: 'var(--admin-shadow)', border: '1px solid var(--admin-card-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--admin-text-primary)', margin: 0 }}>
                Add New User Account
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '3px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--admin-input-border)', background: 'var(--admin-input)', color: 'var(--admin-text-primary)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="alex@business.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  Temporary Password *
                </label>
                <input
                  type="text"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="business_admin">Business Admin</option>
                    <option value="staff">Staff / Member</option>
                    <option value="system_admin">System Admin</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    Status
                  </label>
                  <select
                    value={newUser.status}
                    onChange={(e) => setNewUser({ ...newUser, status: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="active">Active</option>
                    <option value="pending_approval">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {newUser.role !== 'system_admin' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    Assign to Business
                  </label>
                  <select
                    value={newUser.store_id}
                    onChange={(e) => setNewUser({ ...newUser, store_id: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="none">No Business Assigned</option>
                    {businesses.map(b => {
                      const isDuplicate = businesses.filter(item => item.name?.toLowerCase() === b.name?.toLowerCase()).length > 1;
                      const label = isDuplicate && b.owner_email ? `${b.name} (${b.owner_email})` : b.name;
                      return (
                        <option key={b.id} value={b.id}>{label}</option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '0.5rem 1rem', background: 'var(--admin-input)', border: '1px solid var(--admin-input-border)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--admin-text-secondary)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.5rem 1.25rem', background: '#2563eb', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', cursor: 'pointer' }}
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--admin-card)', borderRadius: '12px', width: '100%', maxWidth: '460px',
            padding: '1.75rem', boxShadow: 'var(--admin-shadow)', border: '1px solid var(--admin-card-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--admin-text-primary)', margin: 0 }}>
                Edit User: {editUser.email}
              </h3>
              <button onClick={() => setEditUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '3px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--admin-input-border)', background: 'var(--admin-input)', color: 'var(--admin-text-primary)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    Role
                  </label>
                  <select
                    value={editUser.role}
                    onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="business_admin">Business Admin</option>
                    <option value="staff">Staff / Member</option>
                    <option value="system_admin">System Admin</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    Status
                  </label>
                  <select
                    value={editUser.status}
                    onChange={(e) => setEditUser({ ...editUser, status: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="active">Active</option>
                    <option value="pending_approval">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {editUser.role !== 'system_admin' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    Assigned Business
                  </label>
                  <select
                    value={editUser.store_id || 'none'}
                    onChange={(e) => setEditUser({ ...editUser, store_id: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="none">No Business Assigned</option>
                    {businesses.map(b => {
                      const isDuplicate = businesses.filter(item => item.name?.toLowerCase() === b.name?.toLowerCase()).length > 1;
                      const label = isDuplicate && b.owner_email ? `${b.name} (${b.owner_email})` : b.name;
                      return (
                        <option key={b.id} value={b.id}>{label}</option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  style={{ padding: '0.5rem 1rem', background: 'var(--admin-input)', border: '1px solid var(--admin-input-border)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--admin-text-secondary)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.5rem 1.25rem', background: '#2563eb', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', cursor: 'pointer' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetPasswordEmail && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)',
          zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--admin-card)', borderRadius: '12px', width: '100%', maxWidth: '420px',
            padding: '1.75rem', boxShadow: 'var(--admin-shadow)', border: '1px solid var(--admin-card-border)'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--admin-text-primary)', margin: '0 0 0.5rem' }}>
              Reset User Password
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', margin: '0 0 1rem' }}>
              Enter a new temporary password for <strong>{resetPasswordEmail}</strong>.
            </p>

            <form onSubmit={handleResetPassword}>
              <input
                type="text"
                required
                placeholder="Enter new password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid var(--admin-input-border)', background: 'var(--admin-input)', color: 'var(--admin-text-primary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => { setResetPasswordEmail(null); setNewPassword(''); }}
                  style={{ padding: '0.5rem 1rem', background: 'var(--admin-input)', border: '1px solid var(--admin-input-border)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--admin-text-secondary)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.5rem 1.25rem', background: '#2563eb', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', cursor: 'pointer' }}
                >
                  Set Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
