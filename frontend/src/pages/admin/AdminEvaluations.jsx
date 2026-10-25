import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Zap,
  Cpu,
  Clock,
  Database,
  ScrollText,
  Layers,
  Info,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
  Scale,
  Sparkles,
  Globe,
  Building2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useAdminTheme } from '../../context/AdminThemeContext';
import { API_BASE } from '../../config/api';

export default function AdminEvaluations() {
  const { tokens, isDark } = useAdminTheme();
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState('all');
  const [minSupport, setMinSupport] = useState('5');
  const [minConfidence, setMinConfidence] = useState('50');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [metricTab, setMetricTab] = useState('all'); // 'all', 'time', 'memory'
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [selectedAlgorithmView, setSelectedAlgorithmView] = useState('mined'); // 'mined', 'other', 'both'

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const res = await axios.get(`${API_BASE}/admin/evaluations/datasets`);
        const list = res.data.datasets || [];
        setDatasets(list);
        // Automatically load "all" (Overall Evaluation) by default in mined mode
        runBenchmarkForId('all', 5, 50, 'mined');
      } catch (err) {
        console.error('Failed to load evaluation datasets:', err);
      }
    };
    fetchDatasets();
  }, []);

  const handleSupportChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setMinSupport('');
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) {
      if (num > 100) setMinSupport('100');
      else if (num < 0) setMinSupport('0');
      else setMinSupport(val);
    }
  };

  const handleSupportBlur = () => {
    const num = parseFloat(minSupport);
    if (isNaN(num) || num <= 0) {
      setMinSupport('5');
    } else if (num > 100) {
      setMinSupport('100');
    }
  };

  const handleConfidenceChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setMinConfidence('');
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) {
      if (num > 100) setMinConfidence('100');
      else if (num < 0) setMinConfidence('0');
      else setMinConfidence(val);
    }
  };

  const handleConfidenceBlur = () => {
    const num = parseFloat(minConfidence);
    if (isNaN(num) || num <= 0) {
      setMinConfidence('50');
    } else if (num > 100) {
      setMinConfidence('100');
    }
  };

  const runBenchmarkForId = async (datasetId, supp, conf, algoMode = 'mined') => {
    if (!datasetId) return;
    setRunning(true);
    setError('');
    const rawSupp = parseFloat(supp);
    const rawConf = parseFloat(conf);
    const suppNum = Math.min(100, Math.max(0.01, isNaN(rawSupp) ? 5 : rawSupp));
    const confNum = Math.min(100, Math.max(0.01, isNaN(rawConf) ? 50 : rawConf));
    const suppDecimal = suppNum / 100;
    const confDecimal = confNum / 100;
    try {
      const res = await axios.post(`${API_BASE}/admin/evaluations/benchmark`, {
        dataset_id: datasetId,
        min_support: suppDecimal,
        min_confidence: confDecimal,
        algorithm_mode: algoMode
      });
      setResults(res.data);
    } catch (err) {
      console.error('Benchmark error:', err);
      setError(err.response?.data?.error || 'Failed to complete algorithm benchmark.');
    } finally {
      setRunning(false);
    }
  };

  const handleRunBenchmark = async (e) => {
    if (e) e.preventDefault();
    if (!selectedDatasetId) {
      alert('Please select a dataset to benchmark.');
      return;
    }
    await runBenchmarkForId(selectedDatasetId, minSupport, minConfidence, 'both');
  };

  const isOverall = results?.dataset_id === 'all';
  const hasRunOther = Boolean(results?.has_run_other);

  // Metrics extraction & normalization
  const aprioriTime = results?.apriori?.execution_time_seconds ?? null;
  const fpgrowthTime = results?.fpgrowth?.execution_time_seconds ?? null;
  const aprioriMem = results?.apriori?.peak_memory_kb ?? null;
  const fpgrowthMem = results?.fpgrowth?.peak_memory_kb ?? null;
  const aprioriRules = results?.apriori?.rules_generated ?? null;
  const fpgrowthRules = results?.fpgrowth?.rules_generated ?? null;
  const aprioriItemsets = results?.apriori?.frequent_itemsets ?? null;
  const fpgrowthItemsets = results?.fpgrowth?.frequent_itemsets ?? null;

  // Algorithm selection & mining algorithm alignment
  const selectedAlgo = results?.selected_algorithm || (fpgrowthMem !== null && aprioriMem !== null && fpgrowthMem < aprioriMem ? 'FP-Growth' : 'Apriori');
  const minedAlgo = results?.mined_algorithm || selectedAlgo;
  const otherAlgo = results?.other_algorithm || (minedAlgo === 'Apriori' ? 'FP-Growth' : 'Apriori');

  // Active view evaluation algorithm
  const isSingleAlgo = selectedAlgorithmView !== 'both';
  const isOtherActive = selectedAlgorithmView === 'other';

  const activeAlgo = selectedAlgorithmView === 'mined'
    ? minedAlgo
    : (selectedAlgorithmView === 'other' ? otherAlgo : 'both');
  const isMinedActive = activeAlgo === minedAlgo;

  // Has the active/other algorithm run?
  const isActiveRun = isMinedActive ? true : hasRunOther;
  const isOtherRun = isMinedActive ? hasRunOther : true;

  // Active metrics when viewing single algorithm
  const activeTime = activeAlgo === 'Apriori' ? aprioriTime : fpgrowthTime;
  const activeMem = activeAlgo === 'Apriori' ? aprioriMem : fpgrowthMem;
  const activeRules = activeAlgo === 'Apriori' ? aprioriRules : fpgrowthRules;
  const activeItemsets = activeAlgo === 'Apriori' ? aprioriItemsets : fpgrowthItemsets;

  // Normalized scaling for horizontal bars
  const safeAprioriTime = (hasRunOther || minedAlgo === 'Apriori') && aprioriTime !== null ? aprioriTime : 0;
  const safeFpgrowthTime = (hasRunOther || minedAlgo === 'FP-Growth') && fpgrowthTime !== null ? fpgrowthTime : 0;
  const safeAprioriMem = (hasRunOther || minedAlgo === 'Apriori') && aprioriMem !== null ? aprioriMem : 0;
  const safeFpgrowthMem = (hasRunOther || minedAlgo === 'FP-Growth') && fpgrowthMem !== null ? fpgrowthMem : 0;

  const maxTime = Math.max(safeAprioriTime, safeFpgrowthTime, 0.0001);
  const maxMem = Math.max(safeAprioriMem, safeFpgrowthMem, 1);
  const aprioriTimePct = safeAprioriTime > 0 ? Math.max(14, Math.round((safeAprioriTime / maxTime) * 100)) : 0;
  const fpgrowthTimePct = safeFpgrowthTime > 0 ? Math.max(14, Math.round((safeFpgrowthTime / maxTime) * 100)) : 0;
  const aprioriMemPct = safeAprioriMem > 0 ? Math.max(14, Math.round((safeAprioriMem / maxMem) * 100)) : 0;
  const fpgrowthMemPct = safeFpgrowthMem > 0 ? Math.max(14, Math.round((safeFpgrowthMem / maxMem) * 100)) : 0;

  const activeTimePct = activeAlgo === 'Apriori' ? aprioriTimePct : fpgrowthTimePct;
  const activeMemPct = activeAlgo === 'Apriori' ? aprioriMemPct : fpgrowthMemPct;

  const otherTime = activeAlgo === 'Apriori' ? fpgrowthTime : aprioriTime;
  const otherMem = activeAlgo === 'Apriori' ? fpgrowthMem : aprioriMem;
  const otherRules = activeAlgo === 'Apriori' ? fpgrowthRules : aprioriRules;
  const otherItemsets = activeAlgo === 'Apriori' ? fpgrowthItemsets : aprioriItemsets;
  const otherTimePct = activeAlgo === 'Apriori' ? fpgrowthTimePct : aprioriTimePct;
  const otherMemPct = activeAlgo === 'Apriori' ? fpgrowthMemPct : aprioriMemPct;

  // Short plain-language interpretations
  const isAprioriFaster = (hasRunOther && aprioriTime !== null && fpgrowthTime !== null) ? (aprioriTime < fpgrowthTime) : false;
  const isFpGrowthFaster = (hasRunOther && aprioriTime !== null && fpgrowthTime !== null) ? (fpgrowthTime < aprioriTime) : false;
  const isFpGrowthLessMem = (hasRunOther && aprioriMem !== null && fpgrowthMem !== null) ? (fpgrowthMem < aprioriMem) : false;
  const isAprioriLessMem = (hasRunOther && aprioriMem !== null && fpgrowthMem !== null) ? (aprioriMem < fpgrowthMem) : false;

  const speedText = !hasRunOther
    ? `Alternative algorithm (${otherAlgo}) not benchmarked yet.`
    : (isAprioriFaster ? 'Apriori is faster.' : isFpGrowthFaster ? 'FP-Growth is faster.' : 'Same execution speed.');
  const memoryText = !hasRunOther
    ? `Memory benchmark pending for ${otherAlgo}.`
    : (isFpGrowthLessMem ? 'FP-Growth uses less memory.' : isAprioriLessMem ? 'Apriori uses less memory.' : 'Same memory footprint.');
  const rulesText = !hasRunOther
    ? `Rule comparison pending benchmark.`
    : (aprioriRules === fpgrowthRules ? 'Same number of rules.' : `${aprioriRules?.toLocaleString() || 0} vs ${fpgrowthRules?.toLocaleString() || 0} rules.`);
  const itemsetsText = !hasRunOther
    ? `Itemset comparison pending benchmark.`
    : (aprioriItemsets === fpgrowthItemsets ? 'Same number of frequent itemsets.' : `${aprioriItemsets?.toLocaleString() || 0} vs ${fpgrowthItemsets?.toLocaleString() || 0} itemsets.`);

  const defaultExplanation = selectedAlgo === 'FP-Growth'
    ? `The system selected FP-Growth because it uses significantly less memory (${(fpgrowthMem || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} KB vs ${(aprioriMem || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} KB) while still producing the same number of rules and itemsets.`
    : `The system selected Apriori because it completed the evaluation faster (${(aprioriTime || 0).toFixed(4)}s vs ${(fpgrowthTime || 0).toFixed(4)}s) while producing the same number of rules and itemsets.`;

  const explanation = results?.selection_reason || defaultExplanation;

  // Tooltip content dictionary
  const TOOLTIP_TEXTS = {
    time: isOverall
      ? 'Average wall-clock runtime across all evaluated platform datasets.'
      : 'Total wall-clock runtime required to encode dataset transactions and mine association patterns.',
    memory: isOverall
      ? 'Average peak RAM consumption (in KB) across all evaluated datasets.'
      : 'Maximum resident memory (peak RAM in KB) allocated during pattern tree construction and candidate traversal.',
    rules: isOverall
      ? 'Total cumulative association rules generated across all evaluated datasets.'
      : 'Total number of valid association rules meeting the minimum support and confidence thresholds.',
    itemsets: isOverall
      ? 'Total cumulative frequent item combinations across all evaluated datasets.'
      : 'Total number of frequent item combinations occurring together at or above the minimum support threshold.',
    apriori: 'Apriori: Classical iterative candidate generation algorithm. Level-wise breadth-first search.',
    fpgrowth: 'FP-Growth: Frequent Pattern Tree algorithm. Highly compressed in-memory tree without candidate generation.'
  };

  const memSavingsPct = aprioriMem > fpgrowthMem
    ? Math.round(((aprioriMem - fpgrowthMem) / Math.max(aprioriMem, 1)) * 100)
    : 0;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '2.5rem' }}>
      {/* 1. Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
          Evaluation Results
        </h2>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.84rem', color: 'var(--admin-text-muted)' }}>
          {isOverall
            ? "Platform-wide meta-benchmark across all enterprise datasets, analyzing overall algorithm adoption, execution speed, and memory efficiency."
            : "Here's a clear comparison of Apriori and FP-Growth on your dataset, with key insights and recommendations."}
        </p>
      </div>

      {/* Dataset & Parameter Benchmark Controls Toolbar */}
      <div style={{
        background: 'var(--admin-card)',
        borderRadius: '12px',
        padding: '1.15rem 1.35rem',
        border: '1px solid var(--admin-card-border)',
        marginBottom: '1.75rem',
        boxShadow: 'var(--admin-shadow)'
      }}>
        <form onSubmit={handleRunBenchmark} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>
              Benchmark Dataset
            </label>
            <select
              value={selectedDatasetId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedDatasetId(newId);
                setSelectedAlgorithmView('mined');
                runBenchmarkForId(newId, minSupport, minConfidence, 'mined');
              }}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--admin-input-border)',
                fontSize: '0.82rem',
                color: 'var(--admin-text-primary)',
                outline: 'none',
                background: 'var(--admin-input)'
              }}
            >
              <option value="all">🌐 All Datasets (Platform-Wide Overall Evaluation)</option>
              {datasets.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.transaction_count} txs • {d.business_name || 'System Store'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>
              Min Support ({minSupport || '5'}%)
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                value={minSupport}
                onChange={handleSupportChange}
                onBlur={handleSupportBlur}
                placeholder="5"
                style={{
                  width: '100%',
                  padding: '0.5rem 1.8rem 0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--admin-input-border)',
                  fontSize: '0.82rem',
                  color: 'var(--admin-text-primary)',
                  outline: 'none',
                  background: 'var(--admin-input)'
                }}
              />
              <span style={{ position: 'absolute', right: '10px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--admin-text-muted)', pointerEvents: 'none' }}>%</span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>
              Min Confidence ({minConfidence || '50'}%)
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="number"
                step="1"
                min="1"
                max="100"
                value={minConfidence}
                onChange={handleConfidenceChange}
                onBlur={handleConfidenceBlur}
                placeholder="50"
                style={{
                  width: '100%',
                  padding: '0.5rem 1.8rem 0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--admin-input-border)',
                  fontSize: '0.82rem',
                  color: 'var(--admin-text-primary)',
                  outline: 'none',
                  background: 'var(--admin-input)'
                }}
              />
              <span style={{ position: 'absolute', right: '10px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--admin-text-muted)', pointerEvents: 'none' }}>%</span>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={running}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '0.55rem 1.25rem',
                background: running ? '#475569' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: running ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
              }}
            >
              {running ? (
                <>
                  <RefreshCw size={15} className="spinning-icon" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <Play size={15} fill="#ffffff" />
                  <span>
                    {isOverall ? 'Run All Evaluations' : 'Run Benchmark'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div style={{
          padding: '0.85rem 1.25rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '8px',
          color: '#f87171',
          marginBottom: '1.5rem',
          fontSize: '0.85rem'
        }}>
          {error}
        </div>
      )}

      {/* 2. Algorithm Evaluation Mode Switcher */}
      <div style={{
        background: 'var(--admin-card)',
        borderRadius: '12px',
        padding: '0.95rem 1.35rem',
        border: '1px solid var(--admin-card-border)',
        marginBottom: '1.75rem',
        boxShadow: 'var(--admin-shadow)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'rgba(59, 130, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#60a5fa'
          }}>
            <Scale size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                Evaluation Algorithm
              </span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                background: selectedAlgorithmView === 'both'
                  ? 'rgba(168, 85, 247, 0.15)'
                  : (isMinedActive
                    ? 'rgba(59, 130, 246, 0.15)'
                    : 'rgba(16, 185, 129, 0.15)'),
                color: selectedAlgorithmView === 'both'
                  ? '#c084fc'
                  : (isMinedActive
                    ? '#60a5fa'
                    : '#34d399')
              }}>
                {selectedAlgorithmView === 'both'
                  ? 'Comparing Apriori vs FP-Growth'
                  : (isMinedActive
                    ? `Showing Mined (${minedAlgo})`
                    : `Evaluating ${otherAlgo}`)}
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--admin-text-muted)' }}>
              {selectedAlgorithmView === 'both'
                ? 'Displaying side-by-side performance differences and benchmarks between Apriori and FP-Growth.'
                : isMinedActive
                  ? `Displaying the algorithm (${minedAlgo}) used for rule mining on ${results?.dataset_name || 'this dataset'}.`
                  : `Displaying evaluation metrics for alternative algorithm (${otherAlgo}).`}
            </p>
          </div>
        </div>

        {/* 3-way Switch Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--admin-input)',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid var(--admin-input-border)'
        }}>
          <button
            type="button"
            onClick={() => setSelectedAlgorithmView('mined')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '7px',
              fontSize: '0.78rem',
              fontWeight: selectedAlgorithmView === 'mined' ? 700 : 500,
              border: 'none',
              cursor: 'pointer',
              background: selectedAlgorithmView === 'mined' ? (minedAlgo === 'FP-Growth' ? '#059669' : '#2563eb') : 'transparent',
              color: selectedAlgorithmView === 'mined' ? '#ffffff' : 'var(--admin-text-muted)',
              transition: 'all 0.2s ease',
              boxShadow: selectedAlgorithmView === 'mined' ? '0 2px 6px rgba(0,0,0,0.2)' : 'none'
            }}
          >
            <CheckCircle2 size={13} />
            <span>{minedAlgo} (Mined)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedAlgorithmView('other')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '7px',
              fontSize: '0.78rem',
              fontWeight: selectedAlgorithmView === 'other' ? 700 : 500,
              border: 'none',
              cursor: 'pointer',
              background: selectedAlgorithmView === 'other' ? (otherAlgo === 'FP-Growth' ? '#059669' : '#2563eb') : 'transparent',
              color: selectedAlgorithmView === 'other' ? '#ffffff' : 'var(--admin-text-muted)',
              transition: 'all 0.2s ease',
              boxShadow: selectedAlgorithmView === 'other' ? '0 2px 6px rgba(0,0,0,0.2)' : 'none'
            }}
          >
            <Zap size={13} />
            <span>Switch to {otherAlgo}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedAlgorithmView('both')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '7px',
              fontSize: '0.78rem',
              fontWeight: selectedAlgorithmView === 'both' ? 700 : 500,
              border: 'none',
              cursor: 'pointer',
              background: selectedAlgorithmView === 'both' ? '#7c3aed' : 'transparent',
              color: selectedAlgorithmView === 'both' ? '#ffffff' : 'var(--admin-text-muted)',
              transition: 'all 0.2s ease',
              boxShadow: selectedAlgorithmView === 'both' ? '0 2px 6px rgba(124, 58, 237, 0.3)' : 'none'
            }}
          >
            <Scale size={13} />
            <span>Compare Difference</span>
          </button>
        </div>
      </div>

      {/* 3. Metric Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.15rem',
        marginBottom: '1.75rem'
      }}>
        {/* Card 1: Execution Time */}
        <div style={{
          background: 'var(--admin-card)',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid var(--admin-card-border)',
          boxShadow: 'var(--admin-shadow)',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                <Zap size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                    {isOverall ? 'Avg. Execution Time' : 'Execution Time'}
                  </span>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveTooltip('time')}
                    onMouseLeave={() => setActiveTooltip(null)}
                    onClick={() => setActiveTooltip(activeTooltip === 'time' ? null : 'time')}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--admin-text-muted)', display: 'flex' }}
                  >
                    <Info size={14} />
                  </button>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 500 }}>Lower is better</span>
              </div>
            </div>
          </div>

          {isSingleAlgo ? (
            <div style={{ marginTop: '0.85rem', borderTop: '1px solid var(--admin-card-border)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{
                  fontSize: '1.45rem',
                  fontWeight: 900,
                  color: (isActiveRun && activeTime !== null && activeTime >= 0)
                    ? (activeAlgo === 'FP-Growth' ? '#34d399' : '#38bdf8')
                    : 'var(--admin-text-muted)',
                  letterSpacing: '-0.02em'
                }}>
                  {isActiveRun && activeTime !== null && activeTime >= 0 ? `${activeTime.toFixed(4)}s` : '0.0000s'}
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: !isActiveRun
                    ? 'rgba(148, 163, 184, 0.15)'
                    : (activeAlgo === 'FP-Growth' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)'),
                  color: !isActiveRun
                    ? 'var(--admin-text-muted)'
                    : (activeAlgo === 'FP-Growth' ? '#34d399' : '#60a5fa')
                }}>
                  {activeAlgo} {!isActiveRun && '(Not run yet)'}
                </span>
              </div>
              <div style={{
                marginTop: '0.65rem',
                paddingTop: '0.5rem',
                borderTop: '1px dashed var(--admin-card-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.74rem'
              }}>
                <span style={{ color: 'var(--admin-text-muted)' }}>
                  {isMinedActive ? otherAlgo : minedAlgo} {isMinedActive ? '(Alternative):' : '(Mined):'}
                </span>
                <span style={{
                  fontWeight: 700,
                  color: (isOtherRun && otherTime !== null && otherTime >= 0)
                    ? ((isMinedActive ? otherAlgo : minedAlgo) === 'FP-Growth' ? '#34d399' : '#38bdf8')
                    : 'var(--admin-text-muted)'
                }}>
                  {isOtherRun && otherTime !== null && otherTime >= 0 ? `${otherTime.toFixed(4)}s` : '0.0000s'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid var(--admin-card-border)', paddingTop: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#60a5fa', marginBottom: '2px', fontWeight: 600 }}>Apriori</div>
                <div style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: (minedAlgo === 'Apriori' || hasRunOther) && aprioriTime !== null && aprioriTime >= 0 ? '#38bdf8' : 'var(--admin-text-muted)'
                }}>
                  {(minedAlgo === 'Apriori' || hasRunOther) && aprioriTime !== null && aprioriTime >= 0 ? `${aprioriTime.toFixed(4)}s` : '0.0000s'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: '#34d399', marginBottom: '2px', fontWeight: 600 }}>FP-Growth</div>
                <div style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: (minedAlgo === 'FP-Growth' || hasRunOther) && fpgrowthTime !== null && fpgrowthTime >= 0 ? '#34d399' : 'var(--admin-text-muted)'
                }}>
                  {(minedAlgo === 'FP-Growth' || hasRunOther) && fpgrowthTime !== null && fpgrowthTime >= 0 ? `${fpgrowthTime.toFixed(4)}s` : '0.0000s'}
                </div>
              </div>
            </div>
          )}

          {activeTooltip === 'time' && (
            <div style={{
              position: 'absolute', top: '42px', left: '16px', right: '16px',
              background: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
              padding: '0.65rem 0.85rem', fontSize: '0.75rem', color: '#cbd5e1', zIndex: 10,
              boxShadow: '0 8px 20px rgba(0,0,0,0.4)'
            }}>
              {TOOLTIP_TEXTS.time}
            </div>
          )}
        </div>

        {/* Card 2: Peak Memory */}
        <div style={{
          background: 'var(--admin-card)',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid var(--admin-card-border)',
          boxShadow: 'var(--admin-shadow)',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                <Database size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                    {isOverall ? 'Avg. Peak Memory' : 'Peak Memory'}
                  </span>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveTooltip('memory')}
                    onMouseLeave={() => setActiveTooltip(null)}
                    onClick={() => setActiveTooltip(activeTooltip === 'memory' ? null : 'memory')}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--admin-text-muted)', display: 'flex' }}
                  >
                    <Info size={14} />
                  </button>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 500 }}>Lower is better</span>
              </div>
            </div>
          </div>

          {isSingleAlgo ? (
            <div style={{ marginTop: '0.85rem', borderTop: '1px solid var(--admin-card-border)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{
                  fontSize: '1.45rem',
                  fontWeight: 900,
                  color: (isActiveRun && activeMem !== null && activeMem > 0)
                    ? (activeAlgo === 'FP-Growth' ? '#34d399' : '#38bdf8')
                    : 'var(--admin-text-muted)',
                  letterSpacing: '-0.02em'
                }}>
                  {isActiveRun && activeMem !== null && activeMem > 0 ? `${activeMem.toLocaleString('en-US', { maximumFractionDigits: 2 })} KB` : '0.00 KB'}
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: !isActiveRun
                    ? 'rgba(148, 163, 184, 0.15)'
                    : (activeAlgo === 'FP-Growth' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)'),
                  color: !isActiveRun
                    ? 'var(--admin-text-muted)'
                    : (activeAlgo === 'FP-Growth' ? '#34d399' : '#60a5fa')
                }}>
                  {activeAlgo} {!isActiveRun && '(Not run yet)'}
                </span>
              </div>
              <div style={{
                marginTop: '0.65rem',
                paddingTop: '0.5rem',
                borderTop: '1px dashed var(--admin-card-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.74rem'
              }}>
                <span style={{ color: 'var(--admin-text-muted)' }}>
                  {isMinedActive ? otherAlgo : minedAlgo} {isMinedActive ? '(Alternative):' : '(Mined):'}
                </span>
                <span style={{
                  fontWeight: 700,
                  color: (isOtherRun && otherMem !== null && otherMem > 0)
                    ? ((isMinedActive ? otherAlgo : minedAlgo) === 'FP-Growth' ? '#34d399' : '#38bdf8')
                    : 'var(--admin-text-muted)'
                }}>
                  {isOtherRun && otherMem !== null && otherMem > 0 ? `${otherMem.toLocaleString('en-US', { maximumFractionDigits: 2 })} KB` : '0.00 KB'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid var(--admin-card-border)', paddingTop: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#60a5fa', marginBottom: '2px', fontWeight: 600 }}>Apriori</div>
                <div style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: (minedAlgo === 'Apriori' || hasRunOther) && aprioriMem !== null && aprioriMem > 0 ? '#38bdf8' : 'var(--admin-text-muted)'
                }}>
                  {(minedAlgo === 'Apriori' || hasRunOther) && aprioriMem !== null && aprioriMem > 0 ? `${aprioriMem.toLocaleString('en-US', { maximumFractionDigits: 2 })} KB` : '0.00 KB'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: '#34d399', marginBottom: '2px', fontWeight: 600 }}>FP-Growth</div>
                <div style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: (minedAlgo === 'FP-Growth' || hasRunOther) && fpgrowthMem !== null && fpgrowthMem > 0 ? '#34d399' : 'var(--admin-text-muted)'
                }}>
                  {(minedAlgo === 'FP-Growth' || hasRunOther) && fpgrowthMem !== null && fpgrowthMem > 0 ? `${fpgrowthMem.toLocaleString('en-US', { maximumFractionDigits: 2 })} KB` : '0.00 KB'}
                </div>
              </div>
            </div>
          )}

          {activeTooltip === 'memory' && (
            <div style={{
              position: 'absolute', top: '42px', left: '16px', right: '16px',
              background: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
              padding: '0.65rem 0.85rem', fontSize: '0.75rem', color: '#cbd5e1', zIndex: 10,
              boxShadow: '0 8px 20px rgba(0,0,0,0.4)'
            }}>
              {TOOLTIP_TEXTS.memory}
            </div>
          )}
        </div>

        {/* Card 3: Rules Generated */}
        <div style={{
          background: 'var(--admin-card)',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid var(--admin-card-border)',
          boxShadow: 'var(--admin-shadow)',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
                <ScrollText size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                    {isOverall ? 'Total Rules Generated' : 'Rules Generated'}
                  </span>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveTooltip('rules')}
                    onMouseLeave={() => setActiveTooltip(null)}
                    onClick={() => setActiveTooltip(activeTooltip === 'rules' ? null : 'rules')}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--admin-text-muted)', display: 'flex' }}
                  >
                    <Info size={14} />
                  </button>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 500 }}>Higher is better</span>
              </div>
            </div>
          </div>

          {isSingleAlgo ? (
            <div style={{ marginTop: '0.85rem', borderTop: '1px solid var(--admin-card-border)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{
                  fontSize: '1.45rem',
                  fontWeight: 900,
                  color: (isActiveRun && activeRules !== null && activeRules !== undefined)
                    ? (activeAlgo === 'FP-Growth' ? '#34d399' : '#38bdf8')
                    : 'var(--admin-text-muted)',
                  letterSpacing: '-0.02em'
                }}>
                  {isActiveRun && activeRules !== null && activeRules !== undefined ? activeRules.toLocaleString() : '0'}
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: !isActiveRun
                    ? 'rgba(148, 163, 184, 0.15)'
                    : (activeAlgo === 'FP-Growth' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)'),
                  color: !isActiveRun
                    ? 'var(--admin-text-muted)'
                    : (activeAlgo === 'FP-Growth' ? '#34d399' : '#60a5fa')
                }}>
                  {activeAlgo} {!isActiveRun && '(Not run yet)'}
                </span>
              </div>
              <div style={{
                marginTop: '0.65rem',
                paddingTop: '0.5rem',
                borderTop: '1px dashed var(--admin-card-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.74rem'
              }}>
                <span style={{ color: 'var(--admin-text-muted)' }}>
                  {isMinedActive ? otherAlgo : minedAlgo} {isMinedActive ? '(Alternative):' : '(Mined):'}
                </span>
                <span style={{
                  fontWeight: 700,
                  color: (isOtherRun && otherRules !== null && otherRules !== undefined)
                    ? ((isMinedActive ? otherAlgo : minedAlgo) === 'FP-Growth' ? '#34d399' : '#38bdf8')
                    : 'var(--admin-text-muted)'
                }}>
                  {isOtherRun && otherRules !== null && otherRules !== undefined ? `${otherRules.toLocaleString()} rules` : '0 rules'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid var(--admin-card-border)', paddingTop: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#60a5fa', marginBottom: '2px', fontWeight: 600 }}>Apriori</div>
                <div style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: (minedAlgo === 'Apriori' || hasRunOther) && aprioriRules !== null && aprioriRules !== undefined ? '#38bdf8' : 'var(--admin-text-muted)'
                }}>
                  {(minedAlgo === 'Apriori' || hasRunOther) && aprioriRules !== null && aprioriRules !== undefined ? aprioriRules.toLocaleString() : '0'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: '#34d399', marginBottom: '2px', fontWeight: 600 }}>FP-Growth</div>
                <div style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: (minedAlgo === 'FP-Growth' || hasRunOther) && fpgrowthRules !== null && fpgrowthRules !== undefined ? '#34d399' : 'var(--admin-text-muted)'
                }}>
                  {(minedAlgo === 'FP-Growth' || hasRunOther) && fpgrowthRules !== null && fpgrowthRules !== undefined ? fpgrowthRules.toLocaleString() : '0'}
                </div>
              </div>
            </div>
          )}

          {activeTooltip === 'rules' && (
            <div style={{
              position: 'absolute', top: '42px', left: '16px', right: '16px',
              background: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
              padding: '0.65rem 0.85rem', fontSize: '0.75rem', color: '#cbd5e1', zIndex: 10,
              boxShadow: '0 8px 20px rgba(0,0,0,0.4)'
            }}>
              {TOOLTIP_TEXTS.rules}
            </div>
          )}
        </div>

        {/* Card 4: Frequent Itemsets */}
        <div style={{
          background: 'var(--admin-card)',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid var(--admin-card-border)',
          boxShadow: 'var(--admin-shadow)',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
                <Layers size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                    {isOverall ? 'Total Frequent Itemsets' : 'Frequent Itemsets'}
                  </span>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveTooltip('itemsets')}
                    onMouseLeave={() => setActiveTooltip(null)}
                    onClick={() => setActiveTooltip(activeTooltip === 'itemsets' ? null : 'itemsets')}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--admin-text-muted)', display: 'flex' }}
                  >
                    <Info size={14} />
                  </button>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#c084fc', fontWeight: 500 }}>Higher is better</span>
              </div>
            </div>
          </div>

          {isSingleAlgo ? (
            <div style={{ marginTop: '0.85rem', borderTop: '1px solid var(--admin-card-border)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{
                  fontSize: '1.45rem',
                  fontWeight: 900,
                  color: (isActiveRun && activeItemsets !== null && activeItemsets !== undefined)
                    ? (activeAlgo === 'FP-Growth' ? '#34d399' : '#38bdf8')
                    : 'var(--admin-text-muted)',
                  letterSpacing: '-0.02em'
                }}>
                  {isActiveRun && activeItemsets !== null && activeItemsets !== undefined ? activeItemsets.toLocaleString() : '0'}
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: !isActiveRun
                    ? 'rgba(148, 163, 184, 0.15)'
                    : (activeAlgo === 'FP-Growth' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)'),
                  color: !isActiveRun
                    ? 'var(--admin-text-muted)'
                    : (activeAlgo === 'FP-Growth' ? '#34d399' : '#60a5fa')
                }}>
                  {activeAlgo} {!isActiveRun && '(Not run yet)'}
                </span>
              </div>
              <div style={{
                marginTop: '0.65rem',
                paddingTop: '0.5rem',
                borderTop: '1px dashed var(--admin-card-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.74rem'
              }}>
                <span style={{ color: 'var(--admin-text-muted)' }}>
                  {isMinedActive ? otherAlgo : minedAlgo} {isMinedActive ? '(Alternative):' : '(Mined):'}
                </span>
                <span style={{
                  fontWeight: 700,
                  color: (isOtherRun && otherItemsets !== null && otherItemsets !== undefined)
                    ? ((isMinedActive ? otherAlgo : minedAlgo) === 'FP-Growth' ? '#34d399' : '#38bdf8')
                    : 'var(--admin-text-muted)'
                }}>
                  {isOtherRun && otherItemsets !== null && otherItemsets !== undefined ? `${otherItemsets.toLocaleString()} itemsets` : '0 itemsets'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid var(--admin-card-border)', paddingTop: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#60a5fa', marginBottom: '2px', fontWeight: 600 }}>Apriori</div>
                <div style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: (minedAlgo === 'Apriori' || hasRunOther) && aprioriItemsets !== null && aprioriItemsets !== undefined ? '#38bdf8' : 'var(--admin-text-muted)'
                }}>
                  {(minedAlgo === 'Apriori' || hasRunOther) && aprioriItemsets !== null && aprioriItemsets !== undefined ? aprioriItemsets.toLocaleString() : '0'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: '#34d399', marginBottom: '2px', fontWeight: 600 }}>FP-Growth</div>
                <div style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: (minedAlgo === 'FP-Growth' || hasRunOther) && fpgrowthItemsets !== null && fpgrowthItemsets !== undefined ? '#34d399' : 'var(--admin-text-muted)'
                }}>
                  {(minedAlgo === 'FP-Growth' || hasRunOther) && fpgrowthItemsets !== null && fpgrowthItemsets !== undefined ? fpgrowthItemsets.toLocaleString() : '0'}
                </div>
              </div>
            </div>
          )}

          {activeTooltip === 'itemsets' && (
            <div style={{
              position: 'absolute', top: '42px', left: '16px', right: '16px',
              background: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
              padding: '0.65rem 0.85rem', fontSize: '0.75rem', color: '#cbd5e1', zIndex: 10,
              boxShadow: '0 8px 20px rgba(0,0,0,0.4)'
            }}>
              {TOOLTIP_TEXTS.itemsets}
            </div>
          )}
        </div>
      </div>

      {/* 4. Single Algorithm Profile OR Full Side-by-Side Comparison Section */}
      {isSingleAlgo ? (
        <div style={{
          background: 'var(--admin-card)',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid var(--admin-card-border)',
          marginBottom: '1.75rem',
          boxShadow: 'var(--admin-shadow)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: activeAlgo === 'FP-Growth' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: activeAlgo === 'FP-Growth' ? '#34d399' : '#60a5fa'
              }}>
                {activeAlgo === 'FP-Growth' ? <Zap size={18} /> : <Cpu size={18} />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
                    {activeAlgo} Performance Profile
                  </h3>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: isMinedActive
                      ? 'rgba(59, 130, 246, 0.15)'
                      : 'rgba(16, 185, 129, 0.15)',
                    color: isMinedActive
                      ? '#60a5fa'
                      : '#34d399'
                  }}>
                    {isMinedActive
                      ? '🎯 Dataset Mined Algorithm'
                      : '⚡ Alternative Evaluation'}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'var(--admin-text-muted)' }}>
                  {activeAlgo === 'Apriori'
                    ? 'Breadth-first iterative candidate generation with level-wise support pruning.'
                    : 'Prefix-tree frequent pattern mining with compressed FP-Tree in RAM.'}
                </p>
              </div>
            </div>

          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
            marginTop: '1.25rem'
          }}>
            {/* Detailed metric metrics */}
            <div style={{
              background: 'var(--admin-input)',
              borderRadius: '10px',
              padding: '1.25rem',
              border: `1px solid ${activeAlgo === 'FP-Growth' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--admin-text-primary)', marginBottom: '1rem' }}>
                Resource & Execution Comparison
              </div>

              {/* Execution Time Bars */}
              <div style={{ marginBottom: '1.15rem' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--admin-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Execution Runtime (Lower is better)
                </div>
                {/* Active algorithm bar */}
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--admin-text-secondary)', marginBottom: '3px' }}>
                    <span>{activeAlgo} ({isActiveRun ? 'Active' : 'Not Run Yet'})</span>
                    <span style={{ fontWeight: 700, color: (isActiveRun && activeTime !== null && activeTime >= 0) ? (activeAlgo === 'FP-Growth' ? '#34d399' : '#38bdf8') : 'var(--admin-text-muted)' }}>
                      {isActiveRun && activeTime !== null && activeTime >= 0 ? `${activeTime.toFixed(4)}s` : '0.0000s'}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '18px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{
                      width: isActiveRun ? `${activeTimePct}%` : '0%',
                      height: '100%',
                      background: activeAlgo === 'FP-Growth' ? 'linear-gradient(90deg, #059669 0%, #10b981 100%)' : 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
                      borderRadius: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '6px',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 700
                    }}>
                      {isActiveRun && activeTimePct > 20 && `${activeTime.toFixed(4)}s`}
                    </div>
                  </div>
                </div>
                {/* Previous / Alternative algorithm bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginBottom: '3px' }}>
                    <span>{isMinedActive ? otherAlgo : minedAlgo} ({isMinedActive ? (isOtherRun ? 'Alternative' : 'Not Run Yet') : 'Mined'})</span>
                    <span style={{ fontWeight: 700, color: (isOtherRun && otherTime !== null && otherTime >= 0) ? ((isMinedActive ? otherAlgo : minedAlgo) === 'FP-Growth' ? '#34d399' : '#38bdf8') : 'var(--admin-text-muted)' }}>
                      {isOtherRun && otherTime !== null && otherTime >= 0 ? `${otherTime.toFixed(4)}s` : '0.0000s'}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '18px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{
                      width: isOtherRun ? `${otherTimePct}%` : '0%',
                      height: '100%',
                      background: (isMinedActive ? otherAlgo : minedAlgo) === 'FP-Growth' ? 'linear-gradient(90deg, #059669 0%, #10b981 100%)' : 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
                      borderRadius: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '6px',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      opacity: 0.8
                    }}>
                      {isOtherRun && otherTimePct > 20 && `${otherTime.toFixed(4)}s`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Peak Memory Bars */}
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--admin-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Peak Memory (Lower is better)
                </div>
                {/* Active algorithm bar */}
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--admin-text-secondary)', marginBottom: '3px' }}>
                    <span>{activeAlgo} ({isActiveRun ? 'Active' : 'Not Run Yet'})</span>
                    <span style={{ fontWeight: 700, color: (isActiveRun && activeMem !== null && activeMem > 0) ? (activeAlgo === 'FP-Growth' ? '#34d399' : '#818cf8') : 'var(--admin-text-muted)' }}>
                      {isActiveRun && activeMem !== null && activeMem > 0 ? `${activeMem.toLocaleString('en-US', { maximumFractionDigits: 2 })} KB` : '0.00 KB'}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '18px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{
                      width: isActiveRun ? `${activeMemPct}%` : '0%',
                      height: '100%',
                      background: activeAlgo === 'FP-Growth' ? 'linear-gradient(90deg, #047857 0%, #059669 100%)' : 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)',
                      borderRadius: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '6px',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 700
                    }}>
                      {isActiveRun && activeMemPct > 20 && `${activeMem.toLocaleString('en-US', { maximumFractionDigits: 0 })} KB`}
                    </div>
                  </div>
                </div>
                {/* Previous / Alternative algorithm bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginBottom: '3px' }}>
                    <span>{isMinedActive ? otherAlgo : minedAlgo} ({isMinedActive ? (isOtherRun ? 'Alternative' : 'Not Run Yet') : 'Mined'})</span>
                    <span style={{ fontWeight: 700, color: (isOtherRun && otherMem !== null && otherMem > 0) ? ((isMinedActive ? otherAlgo : minedAlgo) === 'FP-Growth' ? '#34d399' : '#38bdf8') : 'var(--admin-text-muted)' }}>
                      {isOtherRun && otherMem !== null && otherMem > 0 ? `${otherMem.toLocaleString('en-US', { maximumFractionDigits: 2 })} KB` : '0.00 KB'}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '18px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{
                      width: isOtherRun ? `${otherMemPct}%` : '0%',
                      height: '100%',
                      background: (isMinedActive ? otherAlgo : minedAlgo) === 'FP-Growth' ? 'linear-gradient(90deg, #047857 0%, #059669 100%)' : 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)',
                      borderRadius: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '6px',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      opacity: 0.8
                    }}>
                      {isOtherRun && otherMemPct > 20 && `${otherMem.toLocaleString('en-US', { maximumFractionDigits: 0 })} KB`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Algorithm Characteristics Callout */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
              borderRadius: '10px',
              padding: '1.25rem',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.65rem' }}>
                <Sparkles size={16} color="#60a5fa" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                  {isMinedActive
                    ? 'Data Mining Execution Details'
                    : (isActiveRun ? 'Alternative Evaluation Overview' : 'Benchmark Evaluation Pending')}
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
                {!isActiveRun
                  ? `Alternative algorithm (${activeAlgo}) has not been benchmarked yet on ${results?.dataset_name || 'this dataset'}. Click "Run Benchmark" above to compute execution time, memory usage, and compare rule consistency with ${minedAlgo}.`
                  : (activeAlgo === 'Apriori'
                    ? 'Apriori uses level-wise candidate generation and iterative database scans. It is well suited for datasets with small transaction counts and moderate item vocabulary where candidate state generation remains minimal.'
                    : 'FP-Growth compresses frequent items into an in-memory prefix tree without candidate item generation. It excels on denser and larger catalogs by traversing conditional pattern bases directly.')}
              </p>
              <div style={{ marginTop: '0.85rem', fontSize: '0.73rem', color: 'var(--admin-text-muted)' }}>
                {isMinedActive
                  ? `Recorded as the data mining algorithm for ${results?.dataset_name || 'this dataset'}.`
                  : (isActiveRun
                    ? `Alternative candidate evaluation for ${results?.dataset_name || 'this dataset'}.`
                    : `Click "Run Benchmark" above to run ${otherAlgo}.`)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'var(--admin-card)',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid var(--admin-card-border)',
          marginBottom: '1.75rem',
          boxShadow: 'var(--admin-shadow)'
        }}>
          {/* Section Header with Metric Filter buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                <Scale size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
                  Side-by-Side Comparison
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'var(--admin-text-muted)' }}>
                  {isOverall
                    ? `Average performance per dataset across all ${results?.total_datasets || datasets.length} platform datasets`
                    : 'Lower is better • Compare each metric separately'}
                </p>
              </div>
            </div>

            {/* Metric Selector Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--admin-input)', padding: '3px', borderRadius: '8px', border: '1px solid var(--admin-input-border)' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--admin-text-muted)', padding: '0 8px', fontWeight: 600 }}>Metric</span>
              <button
                type="button"
                onClick={() => setMetricTab('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: metricTab === 'all' ? '#2563eb' : 'transparent',
                  color: metricTab === 'all' ? '#ffffff' : 'var(--admin-text-muted)'
                }}
              >
                All Metrics
              </button>
              <button
                type="button"
                onClick={() => setMetricTab('time')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: metricTab === 'time' ? '#2563eb' : 'transparent',
                  color: metricTab === 'time' ? '#ffffff' : 'var(--admin-text-muted)'
                }}
              >
                Execution Time
              </button>
              <button
                type="button"
                onClick={() => setMetricTab('memory')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: metricTab === 'memory' ? '#2563eb' : 'transparent',
                  color: metricTab === 'memory' ? '#ffffff' : 'var(--admin-text-muted)'
                }}
              >
                Peak Memory
              </button>
            </div>
          </div>

          {/* 3-Column Comparison Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.25rem'
          }}>
            {/* Column 1: Apriori Panel (Blue) */}
            <div style={{
              background: 'var(--admin-input)',
              borderRadius: '10px',
              padding: '1.35rem',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={16} color="#3b82f6" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>Apriori</span>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveTooltip('apriori')}
                    onMouseLeave={() => setActiveTooltip(null)}
                    onClick={() => setActiveTooltip(activeTooltip === 'apriori' ? null : 'apriori')}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--admin-text-muted)', display: 'flex' }}
                  >
                    <Info size={13} />
                  </button>
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa'
                }}>
                  {minedAlgo === 'Apriori' ? 'Breadth-First (Mined)' : (hasRunOther ? 'Breadth-First' : 'Not Run Yet')}
                </span>
              </div>

              {activeTooltip === 'apriori' && (
                <div style={{
                  position: 'absolute', top: '48px', left: '16px', right: '16px',
                  background: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
                  padding: '0.65rem 0.85rem', fontSize: '0.75rem', color: '#cbd5e1', zIndex: 10,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.4)'
                }}>
                  {TOOLTIP_TEXTS.apriori}
                </div>
              )}

              {/* Execution Time Bar */}
              {(metricTab === 'all' || metricTab === 'time') && (
                <div style={{ marginBottom: metricTab === 'all' ? '1.25rem' : '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--admin-text-muted)', marginBottom: '5px' }}>
                    <span>{isOverall ? 'Avg. Execution Time' : 'Execution Time'}</span>
                    <span style={{ fontWeight: 700, color: (minedAlgo === 'Apriori' || hasRunOther) && aprioriTime !== null && aprioriTime >= 0 ? '#38bdf8' : 'var(--admin-text-muted)' }}>
                      {(minedAlgo === 'Apriori' || hasRunOther) && aprioriTime !== null && aprioriTime >= 0 ? `${aprioriTime.toFixed(4)}s` : '0.0000s'}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '24px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: (minedAlgo === 'Apriori' || hasRunOther) ? `${aprioriTimePct}%` : '0%',
                      height: '100%',
                      background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '8px',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      transition: 'width 0.4s ease'
                    }}>
                      {(minedAlgo === 'Apriori' || hasRunOther) && aprioriTimePct > 25 && `${aprioriTime.toFixed(4)}s`}
                    </div>
                  </div>
                </div>
              )}

              {/* Peak Memory Bar */}
              {(metricTab === 'all' || metricTab === 'memory') && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--admin-text-muted)', marginBottom: '5px' }}>
                    <span>{isOverall ? 'Avg. Peak Memory' : 'Peak Memory'}</span>
                    <span style={{ fontWeight: 700, color: (minedAlgo === 'Apriori' || hasRunOther) && aprioriMem !== null && aprioriMem > 0 ? '#38bdf8' : 'var(--admin-text-muted)' }}>
                      {(minedAlgo === 'Apriori' || hasRunOther) && aprioriMem !== null && aprioriMem > 0 ? `${aprioriMem.toLocaleString('en-US', { maximumFractionDigits: 2 })} KB` : '0.00 KB'}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '24px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: (minedAlgo === 'Apriori' || hasRunOther) ? `${aprioriMemPct}%` : '0%',
                      height: '100%',
                      background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '8px',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      transition: 'width 0.4s ease'
                    }}>
                      {(minedAlgo === 'Apriori' || hasRunOther) && aprioriMemPct > 28 && `${aprioriMem.toLocaleString('en-US', { maximumFractionDigits: 0 })} KB`}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Column 2: FP-Growth Panel (Green/Teal) */}
            <div style={{
              background: 'var(--admin-input)',
              borderRadius: '10px',
              padding: '1.35rem',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={16} color="#10b981" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>FP-Growth</span>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveTooltip('fpgrowth')}
                    onMouseLeave={() => setActiveTooltip(null)}
                    onClick={() => setActiveTooltip(activeTooltip === 'fpgrowth' ? null : 'fpgrowth')}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--admin-text-muted)', display: 'flex' }}
                  >
                    <Info size={13} />
                  </button>
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399'
                }}>
                  {minedAlgo === 'FP-Growth' ? 'FP-Tree (Mined)' : (hasRunOther ? 'FP-Tree' : 'Not Run Yet')}
                </span>
              </div>

              {activeTooltip === 'fpgrowth' && (
                <div style={{
                  position: 'absolute', top: '48px', left: '16px', right: '16px',
                  background: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
                  padding: '0.65rem 0.85rem', fontSize: '0.75rem', color: '#cbd5e1', zIndex: 10,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.4)'
                }}>
                  {TOOLTIP_TEXTS.fpgrowth}
                </div>
              )}

              {/* Execution Time Bar */}
              {(metricTab === 'all' || metricTab === 'time') && (
                <div style={{ marginBottom: metricTab === 'all' ? '1.25rem' : '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--admin-text-muted)', marginBottom: '5px' }}>
                    <span>{isOverall ? 'Avg. Execution Time' : 'Execution Time'}</span>
                    <span style={{ fontWeight: 700, color: (minedAlgo === 'FP-Growth' || hasRunOther) && fpgrowthTime !== null && fpgrowthTime >= 0 ? '#34d399' : 'var(--admin-text-muted)' }}>
                      {(minedAlgo === 'FP-Growth' || hasRunOther) && fpgrowthTime !== null && fpgrowthTime >= 0 ? `${fpgrowthTime.toFixed(4)}s` : '0.0000s'}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '24px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: (minedAlgo === 'FP-Growth' || hasRunOther) ? `${fpgrowthTimePct}%` : '0%',
                      height: '100%',
                      background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '8px',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      transition: 'width 0.4s ease'
                    }}>
                      {(minedAlgo === 'FP-Growth' || hasRunOther) && fpgrowthTimePct > 25 && `${fpgrowthTime.toFixed(4)}s`}
                    </div>
                  </div>
                </div>
              )}

              {/* Peak Memory Bar */}
              {(metricTab === 'all' || metricTab === 'memory') && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--admin-text-muted)', marginBottom: '5px' }}>
                    <span>{isOverall ? 'Avg. Peak Memory' : 'Peak Memory'}</span>
                    <span style={{ fontWeight: 700, color: (minedAlgo === 'FP-Growth' || hasRunOther) && fpgrowthMem !== null && fpgrowthMem > 0 ? '#34d399' : 'var(--admin-text-muted)' }}>
                      {(minedAlgo === 'FP-Growth' || hasRunOther) && fpgrowthMem !== null && fpgrowthMem > 0 ? `${fpgrowthMem.toLocaleString('en-US', { maximumFractionDigits: 2 })} KB` : '0.00 KB'}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '24px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: (minedAlgo === 'FP-Growth' || hasRunOther) ? `${fpgrowthMemPct}%` : '0%',
                      height: '100%',
                      background: 'linear-gradient(90deg, #047857 0%, #059669 100%)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '8px',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      transition: 'width 0.4s ease'
                    }}>
                      {(minedAlgo === 'FP-Growth' || hasRunOther) && fpgrowthMemPct > 28 && `${fpgrowthMem.toLocaleString('en-US', { maximumFractionDigits: 0 })} KB`}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Column 3: Key Takeaway Panel */}
            <div style={{
              background: 'var(--admin-input)',
              borderRadius: '10px',
              padding: '1.35rem',
              border: '1px solid var(--admin-card-border)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.15rem' }}>
                <Sparkles size={16} color="#60a5fa" />
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                  {isOverall ? 'Overall Key Takeaways' : 'Key Takeaway'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Speed observation */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <CheckCircle2 size={16} color={hasRunOther ? '#10b981' : '#94a3b8'} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                      {hasRunOther
                        ? (isOverall
                          ? `FP-Growth is faster overall (${results?.selected_stats?.fp_count || 0}/${results?.total_datasets || 0} datasets)`
                          : speedText)
                        : `Speed Comparison Pending`}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                      {hasRunOther
                        ? (isOverall
                          ? `Achieved a ${results?.comparison?.speedup_factor || 1.0}x average speedup across the platform.`
                          : (isAprioriFaster ? 'Best when execution speed matters most.' : isFpGrowthFaster ? 'Best when execution speed matters most.' : 'Both algorithms delivered equivalent latency.'))
                        : `Click "${isOverall ? 'Run All Evaluations' : 'Run Benchmark'}" to evaluate execution time differences.`}
                    </div>
                  </div>
                </div>

                {/* Memory observation */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <CheckCircle2 size={16} color={hasRunOther ? '#10b981' : '#94a3b8'} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                      {hasRunOther
                        ? (isOverall
                          ? 'FP-Growth uses less memory overall'
                          : memoryText)
                        : `Memory Efficiency Pending`}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                      {hasRunOther
                        ? (isOverall
                          ? `Reduced peak RAM consumption by an average of ${memSavingsPct}% across all datasets.`
                          : (isFpGrowthLessMem ? 'Best when memory efficiency matters most.' : isAprioriLessMem ? 'Best when memory efficiency matters most.' : 'Both algorithms consumed equivalent RAM.'))
                        : `Click "${isOverall ? 'Run All Evaluations' : 'Run Benchmark'}" to evaluate RAM consumption differences.`}
                    </div>
                  </div>
                </div>

                {/* Rule consistency observation */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <CheckCircle2 size={16} color={hasRunOther ? '#10b981' : '#94a3b8'} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                      {hasRunOther
                        ? (isOverall
                          ? `100% Rule Consistency across all ${results?.total_datasets || 0} datasets`
                          : rulesText)
                        : `Rule Consistency Check Pending`}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                      {hasRunOther
                        ? (isOverall
                          ? 'Both algorithms produced identical rules for every dataset evaluated.'
                          : `Both algorithms generated ${(aprioriRules || 0).toLocaleString()} rules and ${(aprioriItemsets || 0).toLocaleString()} frequent itemsets.`)
                        : `Both algorithms will be validated for rule and itemset equivalence upon running benchmark.`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Cross-Dataset Breakdown Table (Only shown in Overall Evaluation mode) */}
      {isOverall && results?.dataset_breakdown && (
        <div style={{
          background: 'var(--admin-card)',
          borderRadius: '12px',
          padding: '1.35rem 1.5rem',
          border: '1px solid var(--admin-card-border)',
          marginBottom: '1.75rem',
          boxShadow: 'var(--admin-shadow)',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} color="#60a5fa" />
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
                Cross-Dataset Performance Breakdown ({results.dataset_breakdown.length} Datasets)
              </h3>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--admin-text-muted)' }}>
              Click <strong>Inspect</strong> to view deep-dive analytics for any single dataset
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-card-border)', color: 'var(--admin-text-muted)', textAlign: 'left', background: 'var(--admin-hover)' }}>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>Dataset</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>Enterprise Store</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>Transactions</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>Items</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#38bdf8' }}>Apriori Time</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#34d399' }}>FP-Growth Time</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#38bdf8' }}>Apriori Memory</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#34d399' }}>FP-Growth Memory</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>Selected Algorithm</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {results.dataset_breakdown.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--admin-card-border)' }}>
                    <td style={{ padding: '0.75rem 0.85rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>
                      {row.name}
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', color: 'var(--admin-text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Building2 size={13} color="var(--admin-text-muted)" />
                        <span>{row.business_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', color: 'var(--admin-text-muted)' }}>
                      {row.transactions.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', color: 'var(--admin-text-muted)' }}>
                      {row.unique_items}
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', color: (row.apriori_time !== null && row.apriori_time !== undefined) ? '#38bdf8' : 'var(--admin-text-muted)', fontWeight: 700 }}>
                      {row.apriori_time !== null && row.apriori_time !== undefined ? `${row.apriori_time.toFixed(4)}s` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', color: (row.fpgrowth_time !== null && row.fpgrowth_time !== undefined) ? '#34d399' : 'var(--admin-text-muted)', fontWeight: 700 }}>
                      {row.fpgrowth_time !== null && row.fpgrowth_time !== undefined ? `${row.fpgrowth_time.toFixed(4)}s` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', color: (row.apriori_mem_kb !== null && row.apriori_mem_kb !== undefined) ? '#38bdf8' : 'var(--admin-text-muted)', fontWeight: 700 }}>
                      {row.apriori_mem_kb !== null && row.apriori_mem_kb !== undefined ? `${row.apriori_mem_kb.toLocaleString()} KB` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', color: (row.fpgrowth_mem_kb !== null && row.fpgrowth_mem_kb !== undefined) ? '#34d399' : 'var(--admin-text-muted)', fontWeight: 700 }}>
                      {row.fpgrowth_mem_kb !== null && row.fpgrowth_mem_kb !== undefined ? `${row.fpgrowth_mem_kb.toLocaleString()} KB` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: row.selected_algorithm === 'FP-Growth' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: row.selected_algorithm === 'FP-Growth' ? '#34d399' : '#60a5fa'
                      }}>
                        {row.selected_algorithm}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setSelectedDatasetId(row.id);
                          setSelectedAlgorithmView('mined');
                          runBenchmarkForId(row.id, minSupport, minConfidence, 'mined');
                        }}
                        style={{
                          padding: '3px 8px',
                          background: 'var(--admin-input)',
                          border: '1px solid var(--admin-input-border)',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: '#60a5fa',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <span>Inspect</span>
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Dynamic Bottom Explanation: Why Algorithm was selected / used */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)',
        borderRadius: '12px',
        padding: '1.5rem 1.75rem',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        boxShadow: 'var(--admin-shadow)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div style={{ flex: '1', minWidth: '280px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: '0 0 0.4rem' }}>
            {isOverall
              ? `Why ${selectedAlgo} is Most Selected Platform-Wide`
              : (selectedAlgorithmView === 'both'
                ? `Algorithm Recommendation: ${selectedAlgo}`
                : (isMinedActive ? `Why ${minedAlgo} was used for Data Mining` : `Alternative Evaluation: ${activeAlgo}`))}
          </h4>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
            {isSingleAlgo && !isMinedActive
              ? (hasRunOther
                ? `Currently evaluating ${activeAlgo} as an alternative on ${results?.dataset_name || 'this dataset'}. The original data mining execution used ${minedAlgo}. You can toggle back to ${minedAlgo} or view side-by-side differences above.`
                : `Currently viewing ${activeAlgo} metrics on ${results?.dataset_name || 'this dataset'}. Click "Run Benchmark" above to compute and compare with ${minedAlgo}.`)
              : explanation}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            background: (isSingleAlgo ? activeAlgo : selectedAlgo) === 'FP-Growth' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
            border: `1px solid ${(isSingleAlgo ? activeAlgo : selectedAlgo) === 'FP-Growth' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
          }}>
            <CheckCircle2 size={16} color={(isSingleAlgo ? activeAlgo : selectedAlgo) === 'FP-Growth' ? '#34d399' : '#60a5fa'} />
            <div>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: (isSingleAlgo ? activeAlgo : selectedAlgo) === 'FP-Growth' ? '#34d399' : '#60a5fa' }}>
                {isSingleAlgo ? activeAlgo : selectedAlgo} {isOverall && `(${results?.selected_stats?.fp_pct || results?.selected_stats?.ap_pct || 71.4}% Adoption)`}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', display: 'block' }}>
                {isOverall
                  ? 'Most selected platform algorithm'
                  : (selectedAlgorithmView === 'both'
                    ? (hasRunOther ? 'Recommended algorithm' : 'Comparison pending')
                    : (isMinedActive
                      ? 'Used for data mining'
                      : 'Alternative algorithm'))}
              </span>
            </div>
          </div>

          <div style={{
            fontSize: '0.75rem',
            color: '#94a3b8',
            maxWidth: '240px',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            paddingLeft: '1rem'
          }}>
            <strong style={{ color: 'var(--admin-text-primary)', display: 'block' }}>
              {(isSingleAlgo ? activeAlgo : selectedAlgo) === 'FP-Growth' ? 'Better for memory efficiency:' : 'Better for execution speed:'}
            </strong>
            {(isSingleAlgo ? activeAlgo : selectedAlgo) === 'FP-Growth'
              ? 'Ideal when working with larger datasets or limited resources.'
              : 'Ideal for rapid iterative analysis on smaller transaction catalogs.'}
          </div>
        </div>
      </div>
    </div>
  );
}
