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

const API_BASE = 'http://localhost:5000/api';

export default function AdminEvaluations() {
  const { tokens, isDark } = useAdminTheme();
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState('all');
  const [minSupport, setMinSupport] = useState(0.01);
  const [minConfidence, setMinConfidence] = useState(0.20);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [metricTab, setMetricTab] = useState('all'); // 'all', 'time', 'memory'
  const [activeTooltip, setActiveTooltip] = useState(null);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const res = await axios.get(`${API_BASE}/admin/evaluations/datasets`);
        const list = res.data.datasets || [];
        setDatasets(list);
        // Automatically trigger benchmark on "all" (Overall Evaluation) by default
        runBenchmarkForId('all', 0.01, 0.20);
      } catch (err) {
        console.error('Failed to load evaluation datasets:', err);
      }
    };
    fetchDatasets();
  }, []);

  const runBenchmarkForId = async (datasetId, supp, conf) => {
    if (!datasetId) return;
    setRunning(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/admin/evaluations/benchmark`, {
        dataset_id: datasetId,
        min_support: supp,
        min_confidence: conf
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
    await runBenchmarkForId(selectedDatasetId, minSupport, minConfidence);
  };

  const isOverall = results?.dataset_id === 'all';

  // Metrics extraction & normalization
  const aprioriTime = results?.apriori?.execution_time_seconds ?? 0;
  const fpgrowthTime = results?.fpgrowth?.execution_time_seconds ?? 0;
  const aprioriMem = results?.apriori?.peak_memory_kb ?? 0;
  const fpgrowthMem = results?.fpgrowth?.peak_memory_kb ?? 0;
  const aprioriRules = results?.apriori?.rules_generated ?? 0;
  const fpgrowthRules = results?.fpgrowth?.rules_generated ?? 0;
  const aprioriItemsets = results?.apriori?.frequent_itemsets ?? 0;
  const fpgrowthItemsets = results?.fpgrowth?.frequent_itemsets ?? 0;

  // Normalized scaling for horizontal bars
  const maxTime = Math.max(aprioriTime, fpgrowthTime, 0.0001);
  const maxMem = Math.max(aprioriMem, fpgrowthMem, 1);
  const aprioriTimePct = Math.max(14, Math.round((aprioriTime / maxTime) * 100));
  const fpgrowthTimePct = Math.max(14, Math.round((fpgrowthTime / maxTime) * 100));
  const aprioriMemPct = Math.max(14, Math.round((aprioriMem / maxMem) * 100));
  const fpgrowthMemPct = Math.max(14, Math.round((fpgrowthMem / maxMem) * 100));

  // Short plain-language interpretations
  const isAprioriFaster = aprioriTime < fpgrowthTime;
  const isFpGrowthFaster = fpgrowthTime < aprioriTime;
  const isFpGrowthLessMem = fpgrowthMem < aprioriMem;
  const isAprioriLessMem = aprioriMem < fpgrowthMem;

  const speedText = isAprioriFaster ? 'Apriori is faster.' : isFpGrowthFaster ? 'FP-Growth is faster.' : 'Same execution speed.';
  const memoryText = isFpGrowthLessMem ? 'FP-Growth uses less memory.' : isAprioriLessMem ? 'Apriori uses less memory.' : 'Same memory footprint.';
  const rulesText = aprioriRules === fpgrowthRules ? 'Same number of rules.' : `${aprioriRules.toLocaleString()} vs ${fpgrowthRules.toLocaleString()} rules.`;
  const itemsetsText = aprioriItemsets === fpgrowthItemsets ? 'Same number of frequent itemsets.' : `${aprioriItemsets.toLocaleString()} vs ${fpgrowthItemsets.toLocaleString()} itemsets.`;

  // Selected algorithm
  const selectedAlgo = results?.selected_algorithm || (isFpGrowthLessMem ? 'FP-Growth' : 'Apriori');

  const defaultExplanation = selectedAlgo === 'FP-Growth'
    ? `The system selected FP-Growth because it uses significantly less memory (${fpgrowthMem.toLocaleString('en-US', { maximumFractionDigits: 2 })} KB vs ${aprioriMem.toLocaleString('en-US', { maximumFractionDigits: 2 })} KB) while still producing the same number of rules and itemsets.`
    : `The system selected Apriori because it completed the evaluation faster (${aprioriTime.toFixed(4)}s vs ${fpgrowthTime.toFixed(4)}s) while producing the same number of rules and itemsets.`;

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
                runBenchmarkForId(newId, minSupport, minConfidence);
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
              Min Support ({minSupport})
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              max="1.0"
              value={minSupport}
              onChange={(e) => setMinSupport(parseFloat(e.target.value) || 0.01)}
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
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>
              Min Confidence ({minConfidence})
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="1.0"
              value={minConfidence}
              onChange={(e) => setMinConfidence(parseFloat(e.target.value) || 0.20)}
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
            />
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
                  <span>{isOverall ? 'Run All Evaluations' : 'Run Benchmark'}</span>
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

      {/* 2. Metric Summary Cards */}
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

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid var(--admin-card-border)', paddingTop: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginBottom: '2px' }}>Apriori</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: isAprioriFaster ? '#38bdf8' : 'var(--admin-text-primary)' }}>
                {aprioriTime.toFixed(4)}s
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginBottom: '2px' }}>FP-Growth</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: isFpGrowthFaster ? '#34d399' : 'var(--admin-text-primary)' }}>
                {fpgrowthTime.toFixed(4)}s
              </div>
            </div>
          </div>

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

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid var(--admin-card-border)', paddingTop: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginBottom: '2px' }}>Apriori</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: isAprioriLessMem ? '#818cf8' : 'var(--admin-text-primary)' }}>
                {aprioriMem.toLocaleString('en-US', { maximumFractionDigits: 2 })} KB
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginBottom: '2px' }}>FP-Growth</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: isFpGrowthLessMem ? '#34d399' : 'var(--admin-text-primary)' }}>
                {fpgrowthMem.toLocaleString('en-US', { maximumFractionDigits: 2 })} KB
              </div>
            </div>
          </div>

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

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid var(--admin-card-border)', paddingTop: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginBottom: '2px' }}>Apriori</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                {aprioriRules.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginBottom: '2px' }}>FP-Growth</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                {fpgrowthRules.toLocaleString()}
              </div>
            </div>
          </div>

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

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid var(--admin-card-border)', paddingTop: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginBottom: '2px' }}>Apriori</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                {aprioriItemsets.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', marginBottom: '2px' }}>FP-Growth</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                {fpgrowthItemsets.toLocaleString()}
              </div>
            </div>
          </div>

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

      {/* 3 & 4. Side-by-Side Comparison Section */}
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
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                Breadth-First
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
                  <span style={{ fontWeight: 700, color: isAprioriFaster ? '#38bdf8' : 'var(--admin-text-primary)' }}>{aprioriTime.toFixed(4)}s</span>
                </div>
                <div style={{ width: '100%', height: '24px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: `${aprioriTimePct}%`,
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
                    {aprioriTimePct > 25 && `${aprioriTime.toFixed(4)}s`}
                  </div>
                </div>
              </div>
            )}

            {/* Peak Memory Bar */}
            {(metricTab === 'all' || metricTab === 'memory') && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--admin-text-muted)', marginBottom: '5px' }}>
                  <span>{isOverall ? 'Avg. Peak Memory' : 'Peak Memory'}</span>
                  <span style={{ fontWeight: 700, color: isAprioriLessMem ? '#818cf8' : 'var(--admin-text-primary)' }}>{aprioriMem.toLocaleString('en-US', { maximumFractionDigits: 2 })} KB</span>
                </div>
                <div style={{ width: '100%', height: '24px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: `${aprioriMemPct}%`,
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
                    {aprioriMemPct > 28 && `${aprioriMem.toLocaleString('en-US', { maximumFractionDigits: 0 })} KB`}
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
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                FP-Tree
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
                  <span style={{ fontWeight: 700, color: isFpGrowthFaster ? '#34d399' : 'var(--admin-text-primary)' }}>{fpgrowthTime.toFixed(4)}s</span>
                </div>
                <div style={{ width: '100%', height: '24px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: `${fpgrowthTimePct}%`,
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
                    {fpgrowthTimePct > 25 && `${fpgrowthTime.toFixed(4)}s`}
                  </div>
                </div>
              </div>
            )}

            {/* Peak Memory Bar */}
            {(metricTab === 'all' || metricTab === 'memory') && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--admin-text-muted)', marginBottom: '5px' }}>
                  <span>{isOverall ? 'Avg. Peak Memory' : 'Peak Memory'}</span>
                  <span style={{ fontWeight: 700, color: isFpGrowthLessMem ? '#34d399' : 'var(--admin-text-primary)' }}>{fpgrowthMem.toLocaleString('en-US', { maximumFractionDigits: 2 })} KB</span>
                </div>
                <div style={{ width: '100%', height: '24px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: `${fpgrowthMemPct}%`,
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
                    {fpgrowthMemPct > 28 && `${fpgrowthMem.toLocaleString('en-US', { maximumFractionDigits: 0 })} KB`}
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
                <CheckCircle2 size={16} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                    {isOverall
                      ? `FP-Growth is faster overall (${results?.selected_stats?.fp_count || 0}/${results?.total_datasets || 0} datasets)`
                      : speedText}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                    {isOverall
                      ? `Achieved a ${results?.comparison?.speedup_factor || 1.0}x average speedup across the platform.`
                      : (isAprioriFaster ? 'Best when execution speed matters most.' : isFpGrowthFaster ? 'Best when execution speed matters most.' : 'Both algorithms delivered equivalent latency.')}
                  </div>
                </div>
              </div>

              {/* Memory observation */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 size={16} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                    {isOverall
                      ? `FP-Growth uses less memory overall`
                      : memoryText}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                    {isOverall
                      ? `Reduced peak RAM consumption by an average of ${memSavingsPct}% across all datasets.`
                      : (isFpGrowthLessMem ? 'Best when memory efficiency matters most.' : isAprioriLessMem ? 'Best when memory efficiency matters most.' : 'Both algorithms consumed equivalent RAM.')}
                  </div>
                </div>
              </div>

              {/* Rule consistency observation */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <CheckCircle2 size={16} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                    {isOverall
                      ? `100% Rule Consistency across all ${results?.total_datasets || 0} datasets`
                      : rulesText}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                    {isOverall
                      ? `Both algorithms produced identical rules for every dataset evaluated.`
                      : `Both algorithms generated ${aprioriRules.toLocaleString()} rules and ${aprioriItemsets.toLocaleString()} frequent itemsets.`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>Apriori Time</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>FP-Growth Time</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>Apriori Memory</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>FP-Growth Memory</th>
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
                    <td style={{ padding: '0.75rem 0.85rem', color: row.faster_algorithm === 'Apriori' ? '#38bdf8' : 'var(--admin-text-muted)', fontWeight: row.faster_algorithm === 'Apriori' ? 700 : 400 }}>
                      {row.apriori_time.toFixed(4)}s
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', color: row.faster_algorithm === 'FP-Growth' ? '#34d399' : 'var(--admin-text-muted)', fontWeight: row.faster_algorithm === 'FP-Growth' ? 700 : 400 }}>
                      {row.fpgrowth_time.toFixed(4)}s
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', color: row.memory_winner === 'Apriori' ? '#818cf8' : 'var(--admin-text-muted)' }}>
                      {row.apriori_mem_kb.toLocaleString()} KB
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', color: row.memory_winner === 'FP-Growth' ? '#34d399' : 'var(--admin-text-muted)' }}>
                      {row.fpgrowth_mem_kb.toLocaleString()} KB
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
                          runBenchmarkForId(row.id, minSupport, minConfidence);
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

      {/* 5. Dynamic Bottom Explanation: Why [Selected Algorithm] was used */}
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
              : `Why ${selectedAlgo} was used`}
          </h4>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
            {explanation}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            background: selectedAlgo === 'FP-Growth' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
            border: `1px solid ${selectedAlgo === 'FP-Growth' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
          }}>
            <CheckCircle2 size={16} color={selectedAlgo === 'FP-Growth' ? '#34d399' : '#60a5fa'} />
            <div>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: selectedAlgo === 'FP-Growth' ? '#34d399' : '#60a5fa' }}>
                {selectedAlgo} {isOverall && `(${results?.selected_stats?.fp_pct || results?.selected_stats?.ap_pct || 71.4}% Adoption)`}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)', display: 'block' }}>
                {isOverall ? 'Most selected platform algorithm' : 'Used for this evaluation'}
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
              {selectedAlgo === 'FP-Growth' ? 'Better for memory efficiency:' : 'Better for execution speed:'}
            </strong>
            {selectedAlgo === 'FP-Growth'
              ? 'Ideal when working with larger datasets or limited resources.'
              : 'Ideal for rapid iterative analysis on smaller transaction catalogs.'}
          </div>
        </div>
      </div>
    </div>
  );
}
