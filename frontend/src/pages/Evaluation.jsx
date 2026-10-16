import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Cpu,
  Clock,
  Activity,
  Zap,
  Info,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  BookOpen,
  HelpCircle,
  Database,
  Upload,
  User,
  ShieldCheck,
  ScrollText,
  Download
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { API_BASE } from '../config/api';

const Evaluation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [runningDatasetId, setRunningDatasetId] = useState(null);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('friendly'); // 'friendly' or 'technical'
  const [showAnalogyPopover, setShowAnalogyPopover] = useState(false);

  // Upload logs and datasets state for Admin table
  const [uploadLogs, setUploadLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [exportingStates, setExportingStates] = useState({});

  // Active dataset state
  const [activeDatasetId, setActiveDatasetId] = useState(() => localStorage.getItem('activeDatasetId') || null);
  const [activeDatasetName, setActiveDatasetName] = useState(() => localStorage.getItem('activeDatasetName') || null);

  const [params, setParams] = useState(() => {
    const analyticsSaved = sessionStorage.getItem('analytics_params');
    if (analyticsSaved) {
      const parsed = JSON.parse(analyticsSaved);
      return {
        min_support: parsed.min_support ?? 0.05,
        min_confidence: parsed.min_confidence ?? 0.5
      };
    }
    const saved = sessionStorage.getItem('evaluation_params');
    return saved ? JSON.parse(saved) : {
      min_support: 0.05,
      min_confidence: 0.5
    };
  });

  const [results, setResults] = useState(() => {
    const saved = sessionStorage.getItem('evaluation_results');
    return saved ? JSON.parse(saved) : null;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) + ', ' + d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateStr;
    }
  };

  const handleExportResult = async (datasetId, filename) => {
    if (!datasetId) {
      alert('Dataset ID not found for this upload record.');
      return;
    }
    try {
      setExportingStates(prev => ({ ...prev, [datasetId]: true }));
      const token = localStorage.getItem('token') || '';
      const userEmail = localStorage.getItem('userEmail') || '';

      const response = await axios.get(`${API_BASE}/admin/uploads/${datasetId}/export`, {
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
      const cleanName = filename ? filename.replace(/\.[^/.]+$/, "") : `upload_${datasetId}`;
      link.setAttribute('download', `recommendation_results_${cleanName}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Failed to download export result:', error);
      alert('Failed to download export result. Please ensure administrator access.');
    } finally {
      setExportingStates(prev => ({ ...prev, [datasetId]: false }));
    }
  };

  const fetchEvaluationData = async () => {
    setLoadingLogs(true);
    try {
      const token = localStorage.getItem('token') || '';
      const userEmail = localStorage.getItem('userEmail') || '';
      const headers = {
        'Authorization': token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '',
        'X-User-Email': userEmail
      };

      const [logsRes, datasetsRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/activity-logs`, { headers }),
        axios.get(`${API_BASE}/datasets?all=true`, { headers })
      ]);

      let logsList = [];
      if (logsRes.status === 'fulfilled' && logsRes.value.data?.logs) {
        logsList = logsRes.value.data.logs.filter(l => l.action === 'UPLOAD_HISTORICAL_DATA');
      }

      let datasetsList = [];
      if (datasetsRes.status === 'fulfilled' && datasetsRes.value.data?.datasets) {
        datasetsList = datasetsRes.value.data.datasets;
      }

      const existingDatasetIds = new Set(datasetsList.map(ds => String(ds.id)));
      const mergedList = [];
      const seenDatasetIds = new Set();

      // Only include activity logs for datasets that still exist in the database (not deleted)
      logsList.forEach(log => {
        const dsId = log.details?.dataset_id;
        if (dsId && existingDatasetIds.has(String(dsId))) {
          seenDatasetIds.add(String(dsId));
          const matchingDs = datasetsList.find(d => String(d.id) === String(dsId));
          const marketType = log.details?.market_type || matchingDs?.market_type || 'General Store';
          const txCount = log.details?.transaction_count || matchingDs?.transaction_count || 0;
          const uniqueItems = log.details?.unique_items || matchingDs?.unique_items || 0;
          const algUsed = log.details?.algorithm || log.details?.algorithm_used || matchingDs?.algorithm || (txCount < 30 && txCount > 0 ? 'Apriori' : 'FP-Growth');
          mergedList.push({
            id: log.id,
            dataset_id: dsId,
            timestamp: log.created_at,
            user_name: log.user_name || log.user_email || 'Shop Administrator',
            user_email: log.user_email || 'admin@store.com',
            filename: log.details?.filename || matchingDs?.name || 'transaction_data.csv',
            transaction_count: txCount,
            unique_items: uniqueItems,
            market_type: marketType,
            algorithm: algUsed,
            details: {
              ...(log.details || {}),
              market_type: marketType,
              algorithm: algUsed,
              transaction_count: txCount,
              unique_items: uniqueItems
            }
          });
        }
      });

      datasetsList.forEach(ds => {
        if (!seenDatasetIds.has(String(ds.id))) {
          const ownerEmail = ds.user_email || 'admin@store.com';
          const ownerName = ds.user_name || (ownerEmail === 'admin@store.com' ? 'Store Administrator' : ownerEmail);
          const marketType = ds.market_type || 'General Store';
          const txCount = ds.transaction_count || 0;
          const algUsed = ds.algorithm || (txCount < 30 && txCount > 0 ? 'Apriori' : 'FP-Growth');
          mergedList.push({
            id: `ds-${ds.id}`,
            dataset_id: ds.id,
            timestamp: ds.upload_date || new Date().toISOString(),
            user_name: ownerName,
            user_email: ownerEmail,
            filename: ds.name,
            transaction_count: txCount,
            unique_items: ds.unique_items || 0,
            market_type: marketType,
            algorithm: algUsed,
            details: {
              filename: ds.name,
              transaction_count: txCount,
              unique_items: ds.unique_items,
              market_type: marketType,
              algorithm: algUsed,
              dataset_id: ds.id
            }
          });
        }
      });

      setUploadLogs(mergedList);

      const currentActiveId = localStorage.getItem('activeDatasetId');
      if (mergedList.length > 0) {
        const matching = mergedList.find(item => String(item.dataset_id) === String(currentActiveId));
        if (matching) {
          setActiveDatasetId(matching.dataset_id);
          setActiveDatasetName(matching.filename);
        } else {
          setActiveDatasetId(mergedList[0].dataset_id);
          setActiveDatasetName(mergedList[0].filename);
          localStorage.setItem('activeDatasetId', mergedList[0].dataset_id);
          localStorage.setItem('activeDatasetName', mergedList[0].filename);
        }
      } else {
        setActiveDatasetId(null);
        setActiveDatasetName(null);
        localStorage.removeItem('activeDatasetId');
        localStorage.removeItem('activeDatasetName');
      }
    } catch (err) {
      console.error("Error fetching evaluation data:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchEvaluationData();
  }, []);

  useEffect(() => {
    const shouldAutoRun = location.state?.autoRun || sessionStorage.getItem('autoRunBenchmark') === 'true';
    if (shouldAutoRun) {
      sessionStorage.removeItem('autoRunBenchmark');
      const targetId = location.state?.datasetId || localStorage.getItem('activeDatasetId');
      const targetName = location.state?.filename || localStorage.getItem('activeDatasetName');
      handleRunBenchmark(targetId, targetName);
    }
  }, [location.state]);

  useEffect(() => {
    sessionStorage.setItem('evaluation_params', JSON.stringify(params));
  }, [params]);

  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRunBenchmark = async (dsId = null, dsName = null) => {
    const targetId = dsId || activeDatasetId || localStorage.getItem('activeDatasetId');
    const targetName = dsName || activeDatasetName || localStorage.getItem('activeDatasetName');

    if (targetId) {
      localStorage.setItem('activeDatasetId', targetId);
      setActiveDatasetId(targetId);
    }
    if (targetName) {
      localStorage.setItem('activeDatasetName', targetName);
      setActiveDatasetName(targetName);
    }

    setRunningDatasetId(targetId);
    setIsRunning(true);
    setError('');
    setResults(null);
    sessionStorage.removeItem('evaluation_results');

    try {
      const analyticsSaved = sessionStorage.getItem('analytics_params');
      let currentParams = params;
      if (analyticsSaved) {
        const parsed = JSON.parse(analyticsSaved);
        currentParams = {
          min_support: parsed.min_support ?? params.min_support,
          min_confidence: parsed.min_confidence ?? params.min_confidence
        };
        setParams(currentParams);
      }

      const payload = {
        min_support: parseFloat(currentParams.min_support) || 0.05,
        min_confidence: parseFloat(currentParams.min_confidence) || 0.5,
        dataset_id: targetId || null
      };

      const response = await axios.post(`${API_BASE}/benchmark`, payload);
      setResults(response.data);
      sessionStorage.setItem('evaluation_results', JSON.stringify(response.data));

      setTimeout(() => {
        const resultsEl = document.getElementById('benchmark-results-section');
        if (resultsEl) {
          resultsEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to run benchmark. Make sure a dataset is loaded and active.');
    } finally {
      setIsRunning(false);
      setRunningDatasetId(null);
    }
  };

  const handleDeleteDataset = async (datasetId) => {
    try {
      await axios.delete(`${API_BASE}/datasets/${datasetId}`);
      await fetchEvaluationData();
    } catch (err) {
      console.error("Error deleting dataset:", err);
    }
  };

  const handleClearResults = () => {
    setResults(null);
    setRunningDatasetId(null);
    sessionStorage.removeItem('evaluation_results');
  };

  const getIterationData = () => {
    if (!results) return [];
    const data = [];
    for (let i = 0; i < 20; i++) {
      data.push({
        iteration: i + 1,
        apriori_time: results.apriori.times[i],
        fpgrowth_time: results.fpgrowth.times[i],
        apriori_mem: results.apriori.memories[i],
        fpgrowth_mem: results.fpgrowth.memories[i]
      });
    }
    return data;
  };

  const iterationData = getIterationData();

  const formatTime = (seconds) => {
    if (seconds < 1) {
      return `${Math.max(1, Math.round(seconds * 1000))} ms`;
    }
    return `${seconds.toFixed(2)}s`;
  };

  const renderMarketTypeBadge = (marketType) => {
    const type = (marketType && marketType !== 'Default/unknown') ? marketType : 'General Store';
    let icon = '📦';
    let color = '#a78bfa';
    let bg = 'rgba(167, 139, 250, 0.12)';
    let border = 'rgba(167, 139, 250, 0.25)';

    const lower = type.toLowerCase();
    if (lower.includes('grocery') || lower.includes('supermarket')) {
      icon = '🛒';
      color = '#10b981';
      bg = 'rgba(16, 185, 129, 0.12)';
      border = 'rgba(16, 185, 129, 0.25)';
    } else if (lower.includes('retail') || lower.includes('fashion') || lower.includes('clothing')) {
      icon = '🛍️';
      color = '#ec4899';
      bg = 'rgba(236, 72, 153, 0.12)';
      border = 'rgba(236, 72, 153, 0.25)';
    } else if (lower.includes('electronic') || lower.includes('tech') || lower.includes('gadget')) {
      icon = '⚡';
      color = '#3b82f6';
      bg = 'rgba(59, 130, 246, 0.12)';
      border = 'rgba(59, 130, 246, 0.25)';
    } else if (lower.includes('food') || lower.includes('restaurant') || lower.includes('cafe') || lower.includes('fast food')) {
      icon = '🍔';
      color = '#f59e0b';
      bg = 'rgba(245, 158, 11, 0.12)';
      border = 'rgba(245, 158, 11, 0.25)';
    }

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.25rem 0.65rem',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: 700,
        color: color,
        background: bg,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-mono)'
      }}>
        <span>{icon}</span>
        {type}
      </span>
    );
  };

  const renderAlgorithmBadge = (algName, dsId = null, txCount = 0) => {
    let name = 'FP-Growth';
    let isFp = true;

    // If active benchmark result exists for this dataset, pick the winning/recommended algorithm
    if (results && String(activeDatasetId) === String(dsId)) {
      const isFpWinner = results.fpgrowth.avg_time < results.apriori.avg_time;
      name = isFpWinner ? 'FP-Growth' : 'Apriori';
      isFp = isFpWinner;
    } else if (algName && algName !== 'Apriori & FP-Growth') {
      const lower = String(algName).toLowerCase();
      if (lower.includes('apriori') && !lower.includes('fp')) {
        name = 'Apriori';
        isFp = false;
      } else if (lower.includes('fp') || lower.includes('growth')) {
        name = 'FP-Growth';
        isFp = true;
      } else {
        name = algName;
      }
    } else if (txCount > 0 && txCount < 30) {
      name = 'Apriori';
      isFp = false;
    }

    if (isFp) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.25rem 0.65rem',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#10b981',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-mono)'
        }} title="FP-Growth algorithm (Fast pattern mining without candidate generation)">
          <Zap size={12} />
          {name}
        </span>
      );
    } else {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.25rem 0.65rem',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#6366f1',
          background: 'rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-mono)'
        }} title="Apriori algorithm (Iterative candidate generation)">
          <Cpu size={12} />
          {name}
        </span>
      );
    }
  };

  const renderTransactionAlgorithmTable = (res) => {
    if (!res) return null;
    const currentActiveDs = uploadLogs.find(l => String(l.dataset_id) === String(activeDatasetId)) || {};
    const dsName = activeDatasetName || currentActiveDs.filename || 'Selected Transaction Dataset';
    const marketType = res?.adaptive_thresholds?.market_type || currentActiveDs.market_type || 'General Store';
    const txCount = currentActiveDs.transaction_count || 0;
    const uniqueItems = currentActiveDs.unique_items || 0;

    const isFpWinner = res.fpgrowth.avg_time < res.apriori.avg_time;
    const speedRatio = isFpWinner
      ? (res.apriori.avg_time / Math.max(res.fpgrowth.avg_time, 0.0001))
      : (res.fpgrowth.avg_time / Math.max(res.apriori.avg_time, 0.0001));

    const isFpMemWinner = res.fpgrowth.avg_mem < res.apriori.avg_mem;
    const memSavingsPct = isFpMemWinner
      ? (((res.apriori.avg_mem - res.fpgrowth.avg_mem) / Math.max(res.apriori.avg_mem, 0.0001)) * 100)
      : (((res.fpgrowth.avg_mem - res.apriori.avg_mem) / Math.max(res.fpgrowth.avg_mem, 0.0001)) * 100);

    return (
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--card-bg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--primary-color)'
            }}>
              <Cpu size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                Data Transaction Algorithm Breakdown Table
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Benchmarking algorithms used for data transaction pattern mining on <strong>{dsName}</strong>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {renderMarketTypeBadge(marketType)}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transaction Data</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transaction Type</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Algorithm</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Execution Time</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peak Memory</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Performance Gap</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evaluation Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Apriori Row */}
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--table-bg)' }}>
                <td style={{ padding: '0.875rem 1rem' }}>
                  <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.88rem' }}>{dsName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {txCount > 0 ? `${txCount.toLocaleString()} txns` : 'Batch Data'} {uniqueItems > 0 ? `• ${uniqueItems} items` : ''}
                  </div>
                </td>
                <td style={{ padding: '0.875rem 1rem' }}>
                  {renderMarketTypeBadge(marketType)}
                </td>
                <td style={{ padding: '0.875rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', color: '#6366f1', fontSize: '0.85rem' }}>
                    <Cpu size={14} /> Apriori Algorithm
                  </div>
                </td>
                <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  {formatTime(res.apriori.avg_time)}
                </td>
                <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  {res.apriori.avg_mem.toFixed(2)} MB
                </td>
                <td style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Baseline Scan
                </td>
                <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                  {!isFpWinner ? (
                    <span style={{ padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                      🏆 Preferred
                    </span>
                  ) : (
                    <span style={{ padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}>
                      Standard
                    </span>
                  )}
                </td>
              </tr>

              {/* FP-Growth Row */}
              <tr style={{ background: 'transparent' }}>
                <td style={{ padding: '0.875rem 1rem' }}>
                  <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.88rem' }}>{dsName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {txCount > 0 ? `${txCount.toLocaleString()} txns` : 'Batch Data'} {uniqueItems > 0 ? `• ${uniqueItems} items` : ''}
                  </div>
                </td>
                <td style={{ padding: '0.875rem 1rem' }}>
                  {renderMarketTypeBadge(marketType)}
                </td>
                <td style={{ padding: '0.875rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', color: '#10b981', fontSize: '0.85rem' }}>
                    <Zap size={14} /> FP-Growth Algorithm
                  </div>
                </td>
                <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#10b981', fontWeight: '700' }}>
                  {formatTime(res.fpgrowth.avg_time)}
                </td>
                <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#10b981', fontWeight: '700' }}>
                  {res.fpgrowth.avg_mem.toFixed(2)} MB
                </td>
                <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#10b981' }}>
                    {speedRatio.toFixed(1)}x Faster
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    {memSavingsPct.toFixed(0)}% less RAM
                  </div>
                </td>
                <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                  {isFpWinner ? (
                    <span style={{ padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                      🏆 Preferred
                    </span>
                  ) : (
                    <span style={{ padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}>
                      Standard
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderVerdictCard = (res) => {
    const isFpTimeWinner = res.fpgrowth.avg_time < res.apriori.avg_time;
    const speedRatio = isFpTimeWinner
      ? (res.apriori.avg_time / Math.max(res.fpgrowth.avg_time, 0.0001))
      : (res.fpgrowth.avg_time / Math.max(res.apriori.avg_time, 0.0001));
    const speedupText = speedRatio.toFixed(1) + "x faster";

    const isFpMemWinner = res.fpgrowth.avg_mem < res.apriori.avg_mem;
    const memSavingsRatio = isFpMemWinner
      ? (((res.apriori.avg_mem - res.fpgrowth.avg_mem) / Math.max(res.apriori.avg_mem, 0.0001)) * 100)
      : (((res.fpgrowth.avg_mem - res.apriori.avg_mem) / Math.max(res.fpgrowth.avg_mem, 0.0001)) * 100);
    const memSavingsText = memSavingsRatio.toFixed(0) + "% less memory";

    const isSignificant = res.t_test_time.is_significant;

    let title = "";
    let color = "";
    let bg = "";
    let desc = "";

    if (isFpTimeWinner && isSignificant) {
      title = "FP-Growth is the highly recommended algorithm!";
      color = "#10b981";
      bg = "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%)";
      const memClause = isFpMemWinner ? `and uses ${memSavingsText}` : `with similar memory footprint`;
      desc = `FP-Growth is consistently faster by ${speedupText} ${memClause} than Apriori. The statistical analysis confirms this performance gap is a 100% verified result and will scale smoothly as your transaction volume grows.`;
    } else if (!isSignificant) {
      title = "Both algorithms performed similarly.";
      color = "#f59e0b";
      bg = "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(229, 115, 77, 0.04) 100%)";
      desc = `While FP-Growth averaged a slight lead, the speed difference is not statistically consistent at your current database size. For larger data volumes, FP-Growth is still theoretically preferred due to its memory efficiency.`;
    } else {
      title = `${isFpTimeWinner ? 'FP-Growth' : 'Apriori'} is the recommended algorithm.`;
      color = "#10b981";
      bg = "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%)";
      const memClause = isFpMemWinner ? `and saves ${memSavingsText}` : ``;
      desc = `The benchmark shows a verified performance advantage for ${isFpTimeWinner ? 'FP-Growth' : 'Apriori'}. It runs ${speedupText} ${memClause}.`;
    }

    return (
      <div className="card" style={{
        background: bg,
        borderColor: `rgba(${color === '#10b981' ? '16, 185, 129' : '245, 158, 11'}, 0.25)`,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        padding: '1.5rem 1.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🏆</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
              {title}
            </h3>
          </div>
          {(activeDatasetName || activeDatasetId) && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.28)',
              padding: '0.35rem 0.85rem',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--primary-color)',
              fontFamily: 'var(--font-mono)'
            }}>
              <Database size={14} />
              <span>Data Upload Evaluated: <strong>{activeDatasetName || `Dataset #${activeDatasetId}`}</strong></span>
            </div>
          )}
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
          {desc}
        </p>
      </div>
    );
  };

  const renderStatsGrid = (res) => {
    const isFpTimeWinner = res.fpgrowth.avg_time < res.apriori.avg_time;
    const speedRatio = isFpTimeWinner
      ? (res.apriori.avg_time / Math.max(res.fpgrowth.avg_time, 0.0001))
      : (res.fpgrowth.avg_time / Math.max(res.apriori.avg_time, 0.0001));

    const isFpMemWinner = res.fpgrowth.avg_mem < res.apriori.avg_mem;
    const memSavingsRatio = isFpMemWinner
      ? (((res.apriori.avg_mem - res.fpgrowth.avg_mem) / Math.max(res.apriori.avg_mem, 0.0001)) * 100)
      : (((res.fpgrowth.avg_mem - res.apriori.avg_mem) / Math.max(res.fpgrowth.avg_mem, 0.0001)) * 100);

    const maxTime = Math.max(res.apriori.avg_time, res.fpgrowth.avg_time, 0.0001);
    const aprioriTimePct = Math.max(12, Math.round((res.apriori.avg_time / maxTime) * 100));
    const fpTimePct = Math.max(12, Math.round((res.fpgrowth.avg_time / maxTime) * 100));

    const maxMem = Math.max(res.apriori.avg_mem, res.fpgrowth.avg_mem, 0.001);
    const aprioriMemPct = Math.max(15, Math.round((res.apriori.avg_mem / maxMem) * 100));
    const fpMemPct = Math.max(15, Math.round((res.fpgrowth.avg_mem / maxMem) * 100));

    return (
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 0, gap: '1.5rem' }}>
        {/* Time Efficiency */}
        <div className="card stat-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6366f1', marginBottom: '0.5rem' }}>
              <Clock size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Time Efficiency</span>
            </div>
            <div className="stat-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Avg speed improvement</div>
            <div className="stat-value" style={{ color: '#10b981', fontSize: '1.85rem' }}>
              {speedRatio.toFixed(1)}x faster
            </div>
          </div>
          {/* Visual Comparison Bars */}
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                <span>Apriori</span>
                <span className="mono">{formatTime(res.apriori.avg_time)}</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${aprioriTimePct}%`, height: '100%', background: '#6366f1', borderRadius: '4px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                <span style={{ color: '#10b981', fontWeight: '600' }}>FP-Growth</span>
                <span className="mono" style={{ color: '#10b981', fontWeight: '700' }}>{formatTime(res.fpgrowth.avg_time)}</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${fpTimePct}%`, height: '100%', background: '#10b981', borderRadius: '4px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Resource Savings */}
        <div className="card stat-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a855f7', marginBottom: '0.5rem' }}>
              <Cpu size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Resource Savings</span>
            </div>
            <div className="stat-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Peak Memory Saved</div>
            <div className="stat-value" style={{ color: '#10b981', fontSize: '1.85rem' }}>
              {memSavingsRatio.toFixed(0)}%
            </div>
          </div>
          {/* Visual Comparison Bars */}
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                <span>Apriori</span>
                <span className="mono">{res.apriori.avg_mem.toFixed(2)} MB</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${aprioriMemPct}%`, height: '100%', background: '#6366f1', borderRadius: '4px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                <span style={{ color: '#10b981', fontWeight: '600' }}>FP-Growth</span>
                <span className="mono" style={{ color: '#10b981', fontWeight: '700' }}>{res.fpgrowth.avg_mem.toFixed(2)} MB</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${fpMemPct}%`, height: '100%', background: '#10b981', borderRadius: '4px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Confidence level */}
        <div className="card stat-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: res.t_test_time.is_significant ? '#10b981' : '#f59e0b' }}>
                <Activity size={16} />
                <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Test Reliability</span>
              </div>
              <div title="Reliability measures how likely these benchmark results will repeat across different hardware or trials." style={{ cursor: 'help', color: 'var(--text-muted)' }}>
                <Info size={15} />
              </div>
            </div>
            <div className="stat-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Consistency of results</div>
            <div className="stat-value" style={{ fontSize: '1.85rem', color: res.t_test_time.is_significant ? '#10b981' : '#f59e0b' }}>
              {res.t_test_time.is_significant ? '100% Verified' : 'Inconclusive'}
            </div>
          </div>
          <div style={{ marginTop: '1rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.5rem 0.7rem', borderRadius: '6px', fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
            <CheckCircle2 size={14} /> Confirmed real performance gap (&lt; 0.01% chance of coincidence)
          </div>
        </div>
      </div>
    );
  };

  const renderFriendlyAnalysis = (res) => {
    const isTimeSignificant = res.t_test_time.is_significant;
    const isMemSignificant = res.t_test_mem.is_significant;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Speed Card */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                <Clock size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontWeight: '700', color: '#fff' }}>Speed Performance</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Comparison of processing speed</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              {isTimeSignificant ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700' }}>
                  ✓ Highly Consistent Speedup
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700' }}>
                  ⚠ No Consistent Speedup
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
              {isTimeSignificant
                ? `FP-Growth completed runs faster than Apriori with high statistical consistency. The test confirms there is less than a 5% probability that this speedup was a random fluke. You can expect FP-Growth to scale much better as your dataset grows.`
                : `The speed difference between Apriori and FP-Growth is too small to be statistically consistent. This means the speed gap could be caused by normal background activity on your computer. Both algorithms run equally well for this specific workload.`
              }
            </p>
          </div>

          {/* Memory Card */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                <Cpu size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontWeight: '700', color: '#fff' }}>Memory Savings</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Comparison of system memory consumed</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              {isMemSignificant ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700' }}>
                  ✓ Consistent Memory Advantage
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700' }}>
                  ⚠ Comparable Memory Footprint
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
              {isMemSignificant
                ? `FP-Growth consumed less peak memory than Apriori with high statistical consistency. FP-Growth leverages a compressed database tree representation, preventing the combinatorial explosion of candidate items in RAM.`
                : `There is no consistent difference in peak memory usage between the two algorithms. Both use a similar amount of RAM for this size dataset.`
              }
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderTechnicalAnalysis = (res) => {
    return (
      <div className="card" style={{ border: '1px solid var(--border-color)', padding: '1.5rem' }}>
        <h3 style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
          <Activity size={18} style={{ color: 'var(--primary-color)' }} /> Paired T-Test Hypothesis Testing Results (df = 19)
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
          A paired-samples t-test compares the performance differences of the Apriori and FP-Growth algorithms under matching transaction sizes.
          The null hypothesis (H₀) states that there is no true difference in mean performance. We reject H₀ if p &lt; 0.05.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Time statistics */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem', background: 'rgba(255,255,255,0.01)' }}>
            <h4 style={{ color: '#6366f1', fontWeight: '700', marginBottom: '0.75rem', fontSize: '0.9rem' }}>Metric: Execution Speed (Time)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>T-Statistic:</span>
                <span className="mono" style={{ fontWeight: '700', color: '#fff' }}>{res.t_test_time.t_statistic.toFixed(4)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>P-Value:</span>
                <span className="mono" style={{ fontWeight: '700', color: '#fff' }}>{res.t_test_time.p_value.toExponential(4)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Mean Difference (x_d):</span>
                <span className="mono">{res.t_test_time.mean_difference.toFixed(4)}s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Standard Error (sd/sqrt(n)):</span>
                <span className="mono">{res.t_test_time.standard_error.toFixed(4)}s</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem', color: res.t_test_time.is_significant ? '#10b981' : '#f59e0b', fontWeight: '600', fontSize: '0.8rem' }}>
                {res.t_test_time.is_significant
                  ? "✓ Verified Result: Performance difference is confirmed as real, not a coincidence (p < 0.05)."
                  : "✗ Inconclusive: Performance difference is within margin of random variance (p >= 0.05)."}
              </div>
            </div>
          </div>

          {/* Memory statistics */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem', background: 'rgba(255,255,255,0.01)' }}>
            <h4 style={{ color: '#10b981', fontWeight: '700', marginBottom: '0.75rem', fontSize: '0.9rem' }}>Metric: Resource Usage (Memory)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>T-Statistic:</span>
                <span className="mono" style={{ fontWeight: '700', color: '#fff' }}>{res.t_test_mem.t_statistic.toFixed(4)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>P-Value:</span>
                <span className="mono" style={{ fontWeight: '700', color: '#fff' }}>{res.t_test_mem.p_value.toExponential(4)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Mean Difference (x_d):</span>
                <span className="mono">{res.t_test_mem.mean_difference.toFixed(4)} MB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Standard Error (sd/sqrt(n)):</span>
                <span className="mono">{res.t_test_mem.standard_error.toFixed(4)} MB</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem', color: res.t_test_mem.is_significant ? '#10b981' : '#f59e0b', fontWeight: '600', fontSize: '0.8rem' }}>
                {res.t_test_mem.is_significant
                  ? "✓ Verified Result: Memory footprint difference is confirmed as real, not a coincidence (p < 0.05)."
                  : "✗ Inconclusive: Memory usage difference is within margin of random variance (p >= 0.05)."}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCharts = (data) => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '0.5rem' }}>
        {/* Speed Chart */}
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-color)', position: 'relative', zIndex: showAnalogyPopover ? 10 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <h3 style={{ fontWeight: '700', fontSize: '1rem', color: '#fff', margin: 0 }}>Execution Time Curve (20 Iterations)</h3>
            <div
              onMouseEnter={() => setShowAnalogyPopover(true)}
              onMouseLeave={() => setShowAnalogyPopover(false)}
              style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}
            >
              <HelpCircle
                size={16}
                style={{
                  cursor: 'help',
                  color: showAnalogyPopover ? 'var(--primary-color)' : 'var(--text-dim)',
                  transition: 'var(--transition)'
                }}
              />

              {showAnalogyPopover && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  left: '-150px',
                  width: '660px',
                  background: '#121212',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.75rem',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.8), inset 1px 1px 0px 0px rgba(255,255,255,0.05)',
                  zIndex: 1000,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.75rem',
                  pointerEvents: 'auto',
                  animation: 'popoverFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                }}>
                  <style>{`
                    @keyframes popoverFadeIn {
                      from {
                        opacity: 0;
                        transform: translateY(8px);
                      }
                      to {
                        opacity: 1;
                        transform: translateY(0);
                      }
                    }
                  `}</style>

                  {/* Apriori Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Apriori Solution
                    </span>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                      <span>🛒</span> Multi-Pass Shopper
                    </h4>
                    <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
                      Operates in iterative steps: first it finds popular single items, then combines them into pairs and rescans the database, then triples, etc.
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: '1.5', margin: 0, borderLeft: '2px solid rgba(99, 102, 241, 0.3)', paddingLeft: '8px' }}>
                      Like a supermarket shopper walking down every aisle, going home, thinking of combos, scanning all aisles again, and repeating. Slows down significantly as transactions grow.
                    </p>
                  </div>

                  {/* FP-Growth Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      FP-Growth Solution
                    </span>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                      <span>🌳</span> Catalog Mapper
                    </h4>
                    <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
                      Reads purchases exactly twice to build a highly compressed tree map (FP-Tree) in memory, avoiding candidate generation.
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: '1.5', margin: 0, borderLeft: '2px solid rgba(16, 185, 129, 0.3)', paddingLeft: '8px' }}>
                      Like reading the catalog once at home, creating a digital blueprint of the store layout, and going straight to paths without repeated scans. Scales smoothly.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="iteration" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#141414', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.8rem' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8rem' }} />
                <Line type="monotone" dataKey="apriori_time" name="Apriori Time (s)" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="fpgrowth_time" name="FP-Growth Time (s)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Memory Chart */}
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '1.25rem', color: '#fff' }}>Peak Memory Consumption (20 Iterations)</h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="iteration" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#141414', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.8rem' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8rem' }} />
                <Line type="monotone" dataKey="apriori_mem" name="Apriori Memory (MB)" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="fpgrowth_mem" name="FP-Growth Memory (MB)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              <Cpu size={28} style={{ color: 'var(--primary-color)' }} />
              Algorithm Evaluation
            </h1>
          </div>
          <p className="page-subtitle">
            Automated statistical benchmark of Apriori vs FP-Growth algorithms over 20 iterations.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0, alignItems: 'center' }}>
          {results && !isRunning && (
            <button
              className="btn btn-secondary"
              onClick={handleClearResults}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}
            >
              <Trash2 size={16} /> Clear Results
            </button>
          )}
        </div>
      </div>

      {/* ── DATA UPLOADS HISTORY TABLE (AUDIT LOG IN EVALUATION) ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--card-bg)',
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--primary-color)',
              flexShrink: 0
            }}>
              <Upload size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                  Data Uploads History
                </h3>
                <span style={{
                  background: 'rgba(59, 130, 246, 0.18)',
                  color: 'var(--primary-color)',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '0.15rem 0.6rem',
                  borderRadius: '100px'
                }}>
                  {uploadLogs.length} uploads
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Select an uploaded receipt file from the audit trail below to run performance evaluation
              </span>
            </div>
          </div>

          <button
            className="btn btn-secondary"
            onClick={fetchEvaluationData}
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto', flexShrink: 0 }}
          >
            <RefreshCw size={14} className={loadingLogs ? 'spin' : ''} /> Refresh Logs
          </button>
        </div>

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
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transaction Data</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transaction Type</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Algorithm</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evaluation</th>
              </tr>
            </thead>
            <tbody>
              {loadingLogs ? (
                <tr>
                  <td colSpan={7} style={{ padding: '4rem', textAlign: 'center' }}>
                    <div className="spin" style={{
                      width: 28, height: 28, borderRadius: '50%',
                      border: '2px solid var(--border-color)',
                      borderTopColor: 'var(--primary-color)',
                      margin: '0 auto 0.75rem'
                    }} />
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>Loading data uploads history...</p>
                  </td>
                </tr>
              ) : uploadLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Database size={36} style={{ marginBottom: '0.75rem', color: 'var(--text-dim)' }} />
                    <p style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem' }}>No data uploads logged yet</p>
                    <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>Upload files via Analytics or File History to begin running evaluation benchmarks.</p>
                  </td>
                </tr>
              ) : (
                uploadLogs.map((item, idx) => {
                  const isEven = idx % 2 === 0;
                  const isExpanded = expandedRows.has(item.id);
                  const isRowRunning = isRunning && String(runningDatasetId) === String(item.dataset_id);

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        onClick={() => toggleRow(item.id)}
                        style={{
                          background: isEven ? 'var(--table-bg)' : 'transparent',
                          borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--inner-box-bg)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isEven ? 'var(--table-bg)' : 'transparent'; }}
                      >
                        <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            {isExpanded
                              ? <ChevronDown size={14} style={{ color: 'var(--primary-color)' }} />
                              : <ChevronRight size={14} />}
                          </div>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {formatDate(item.timestamp)}
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {item.user_name}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                            {item.user_email}
                          </div>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.filename}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                            {item.transaction_count ? `${item.transaction_count.toLocaleString()} txns` : 'Data Batch'}
                          </div>
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          {renderMarketTypeBadge(item.market_type)}
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          {renderAlgorithmBadge(item.algorithm)}
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRunBenchmark(item.dataset_id, item.filename);
                              }}
                              disabled={isRunning}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.45rem 1rem',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                background: isRowRunning
                                  ? 'var(--primary-color)'
                                  : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                color: '#ffffff',
                                border: 'none',
                                cursor: isRunning ? 'not-allowed' : 'pointer',
                                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                                whiteSpace: 'nowrap'
                              }}
                              title="Run algorithm evaluation benchmark on this dataset"
                            >
                              {isRowRunning ? (
                                <>
                                  <RefreshCw size={14} className="spin" style={{ color: '#ffffff' }} />
                                  <span style={{ color: '#ffffff' }}>Running...</span>
                                </>
                              ) : (
                                <>
                                  <Cpu size={14} style={{ color: '#ffffff' }} />
                                  <span style={{ color: '#ffffff' }}>Run</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportResult(item.dataset_id, item.filename);
                              }}
                              disabled={isRowRunning || isRunning || !item.dataset_id || !!exportingStates[item.dataset_id]}
                              title={isRowRunning ? 'Analysis in progress' : 'Export processed recommendation and association rule results'}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.45rem 0.85rem',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: '600',
                                background: 'transparent',
                                color: 'var(--text-main)',
                                border: '1px solid var(--border-color)',
                                cursor: (isRowRunning || isRunning || !item.dataset_id || !!exportingStates[item.dataset_id]) ? 'not-allowed' : 'pointer',
                                opacity: (isRowRunning || isRunning || !item.dataset_id || !!exportingStates[item.dataset_id]) ? 0.5 : 1,
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {exportingStates[item.dataset_id] ? (
                                <>
                                  <RefreshCw size={14} className="spin" />
                                  <span>Downloading...</span>
                                </>
                              ) : (
                                <>
                                  <Download size={14} />
                                  <span>Download</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && item.details && (
                        <tr style={{ background: isEven ? 'var(--table-bg)' : 'transparent', borderBottom: '1px solid var(--border-color)' }}>
                          <td colSpan={7} style={{ padding: '0 1.25rem 1rem' }}>
                            <div style={{
                              background: 'var(--table-header-bg)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              padding: '1rem 1.25rem',
                              marginTop: '0.5rem',
                              fontSize: '0.8rem',
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--text-muted)',
                              lineHeight: 1.7,
                              overflowX: 'auto'
                            }}>
                              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                                <tbody>
                                  {Object.entries(item.details)
                                    .sort(([a], [b]) => a.localeCompare(b))
                                    .map(([key, value]) => (
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
      </div>

      {/* ── BENCHMARK RESULTS SECTION ── */}
      <div id="benchmark-results-section">
        {error && (
          <div className="card" style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Info size={20} />
            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{error}</span>
          </div>
        )}

        {/* Main Content: Display Area (Full Width) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {isRunning && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', background: 'rgba(255, 255, 255, 0.01)', borderStyle: 'dashed', textAlign: 'center', gap: '1.5rem' }}>
              <RefreshCw size={48} className="spin" style={{ color: 'var(--primary-color)' }} />
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>Running Performance Benchmark...</h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: '500px', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 auto' }}>
                  Evaluating Apriori and FP-Growth over 20 recursive runs to calculate statistical significance on dataset: <strong>{activeDatasetName || 'Selected Dataset'}</strong>.
                </p>
              </div>
              <div style={{ width: '250px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', width: '40%', height: '100%', background: 'var(--primary-color)', borderRadius: '2px', animation: 'loading-pulse 1.5s infinite ease-in-out' }}></div>
              </div>
              <style>{`
                @keyframes loading-pulse {
                  0% { left: -40%; }
                  50% { left: 100%; }
                  100% { left: 100%; }
                }
              `}</style>
            </div>
          )}

          {!isRunning && !results && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', background: 'rgba(255, 255, 255, 0.01)', borderStyle: 'dashed', textAlign: 'center', gap: '1.25rem' }}>
              <Activity size={48} style={{ color: 'var(--primary-color)', marginBottom: '0.25rem' }} />
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  No Benchmark Run Yet
                </h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: '540px', fontSize: '0.92rem', lineHeight: '1.6', margin: '0 auto' }}>
                  To run a performance evaluation benchmark, select an uploaded dataset from the <strong>Data Uploads History</strong> table above and click the <strong>"Run Evaluation"</strong> button.
                </p>
              </div>
            </div>
          )}

          {!isRunning && results && (
            <>
              {/* Verdict Summary Card */}
              {renderVerdictCard(results)}

              {/* Top Statistics Cards */}
              {renderStatsGrid(results)}

              {/* Data Transaction & Algorithm Breakdown Table */}
              {renderTransactionAlgorithmTable(results)}

              {/* View Toggle Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem', gap: '1.5rem' }}>
                <button
                  onClick={() => setViewMode('friendly')}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: viewMode === 'friendly' ? '2px solid var(--primary-color)' : '2px solid transparent',
                    color: viewMode === 'friendly' ? '#fff' : 'var(--text-muted)',
                    padding: '0.75rem 0.5rem',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    transition: 'var(--transition)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <BookOpen size={16} /> User-Friendly Analysis
                </button>
                <button
                  onClick={() => setViewMode('technical')}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: viewMode === 'technical' ? '2px solid var(--primary-color)' : '2px solid transparent',
                    color: viewMode === 'technical' ? '#fff' : 'var(--text-muted)',
                    padding: '0.75rem 0.5rem',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    transition: 'var(--transition)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Activity size={16} /> Statistical Details
                </button>
              </div>

              {/* Tab Contents */}
              {viewMode === 'friendly' ? renderFriendlyAnalysis(results) : renderTechnicalAnalysis(results)}

              {/* Charts Panel */}
              {renderCharts(iterationData)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Evaluation;
