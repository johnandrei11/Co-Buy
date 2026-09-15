import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FileText, 
  Trash2, 
  History as HistoryIcon,
  Database,
  Download,
  Loader2
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const Dataset = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportingStates, setExportingStates] = useState({});
  const navigate = useNavigate();

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/datasets`);
      const fetched = response.data.datasets || [];
      setDatasets(fetched);
      if (fetched.length === 0) {
        localStorage.removeItem('activeDatasetId');
        localStorage.removeItem('activeDatasetName');
      } else {
        const activeId = localStorage.getItem('activeDatasetId');
        if (activeId && !fetched.some(ds => String(ds.id) === String(activeId))) {
          localStorage.removeItem('activeDatasetId');
          localStorage.removeItem('activeDatasetName');
        }
      }
    } catch (err) {
      console.error("Error fetching datasets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleDeleteDataset = async (datasetId) => {
    try {
      await axios.delete(`${API_BASE}/datasets/${datasetId}`);
      const updated = datasets.filter(ds => ds.id !== datasetId);
      setDatasets(updated);
      const activeId = localStorage.getItem('activeDatasetId');
      if (String(activeId) === String(datasetId) || updated.length === 0) {
        localStorage.removeItem('activeDatasetId');
        localStorage.removeItem('activeDatasetName');
      }
    } catch (err) {
      console.error("Error deleting dataset:", err);
    }
  };

  const handleSelectFile = async (ds) => {
    localStorage.setItem('activeDatasetId', ds.id);
    localStorage.setItem('activeDatasetName', ds.name);
    try {
      await axios.post(`${API_BASE}/history/${ds.id}/activate`);
      navigate(`/analytics?dataset_id=${ds.id}`);
    } catch (err) {
      console.error("Error activating dataset:", err);
      navigate(`/analytics?dataset_id=${ds.id}`);
    }
  };

  const handleExportResult = async (uploadId, filename) => {
    try {
      setExportingStates(prev => ({ ...prev, [uploadId]: true }));
      const token = localStorage.getItem('token') || '';
      const userEmail = localStorage.getItem('userEmail') || '';
      
      const response = await axios.get(`${API_BASE}/admin/uploads/${uploadId}/export`, {
        responseType: 'blob',
        headers: {
          'Authorization': token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '',
          'X-User-Email': userEmail
        }
      });

      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const cleanName = filename ? filename.replace(/\.[^/.]+$/, "") : `upload_${uploadId}`;
      link.setAttribute('download', `recommendation_results_${cleanName}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Failed to download export result:', error);
      alert('Failed to download export result. Please ensure administrator access.');
    } finally {
      setExportingStates(prev => ({ ...prev, [uploadId]: false }));
    }
  };

  const totalTransactions = datasets.reduce((sum, ds) => sum + (ds.transaction_count || 0), 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <HistoryIcon size={28} style={{ color: 'var(--primary-color)' }} />
            File History
          </h1>
          <p className="page-subtitle">
            Private history of all files uploaded under your account. Click any file to look back.
          </p>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '2rem' }}>
        <div className="card stat-card">
          <div className="stat-label">Your Uploaded Files</div>
          <div className="stat-value" style={{ fontSize: '1.8rem' }}>{datasets.length}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Total Historical Purchases</div>
          <div className="stat-value" style={{ fontSize: '1.8rem' }}>{totalTransactions.toLocaleString()}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: '700', fontSize: '1.25rem' }}>Uploaded File History</h3>
          <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={fetchDatasets}>
            <HistoryIcon size={16} /> Refresh History
          </button>
        </div>

        <div className="history-scroll-box">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading your private file history...</div>
          ) : datasets.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Database size={36} style={{ marginBottom: '1rem', color: 'var(--text-dim)' }} />
              <div style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                No uploaded files in your history yet
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                Files you upload under your account will appear here exclusively for you.
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--table-header-bg)', zIndex: 10, borderBottom: '1px solid var(--border-color)' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '1rem 1.5rem', width: '45%' }}>File Name</th>
                  <th style={{ textAlign: 'left', padding: '1rem 1.5rem', width: '25%' }}>Date Uploaded</th>
                  <th style={{ textAlign: 'center', padding: '1rem 1.5rem', width: '20%' }}>Actions</th>
                  <th style={{ textAlign: 'center', padding: '1rem 1.5rem', width: '10%' }}>Delete</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((ds) => {
                  const isProcessing = ds.status === 'processing' || ds.status === 'running';
                  const isExporting = !!exportingStates[ds.id];
                  return (
                    <tr key={ds.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ textAlign: 'left', padding: '0.9rem 1.5rem' }}>
                        <div 
                          onClick={() => handleSelectFile(ds)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.75rem',
                            cursor: 'pointer',
                            padding: '0.35rem 0.5rem',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            width: 'fit-content'
                          }}
                          className="history-file-link"
                          title="Click to look back on this file"
                        >
                          <FileText size={18} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                          <span style={{ fontWeight: '700', color: 'var(--text-main)', textDecoration: 'underline', textUnderlineOffset: '4px' }}>
                            {ds.name}
                          </span>
                        </div>
                      </td>
                      <td className="mono" style={{ textAlign: 'left', padding: '0.9rem 1.5rem', fontSize: '0.85rem' }}>
                        {ds.upload_date}
                      </td>
                      <td style={{ textAlign: 'center', padding: '0.9rem 1.5rem' }}>
                        <button
                          onClick={() => handleExportResult(ds.id, ds.name)}
                          disabled={isProcessing || isExporting}
                          title={isProcessing ? 'Analysis in progress' : 'Export recommendation results as CSV'}
                          className="btn btn-secondary"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.45rem 0.6rem',
                            borderRadius: '6px',
                            cursor: (isProcessing || isExporting) ? 'not-allowed' : 'pointer',
                            opacity: (isProcessing || isExporting) ? 0.6 : 1,
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {isExporting ? (
                            <Loader2 size={18} className="spin" />
                          ) : (
                            <Download size={18} />
                          )}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center', padding: '0.9rem 1.5rem' }}>
                        <button
                          onClick={() => handleDeleteDataset(ds.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '0.4rem',
                            borderRadius: '6px',
                            transition: 'color 0.2s'
                          }}
                          title="Delete from History"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dataset;

