import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Database,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Sliders,
  Download,
  Play,
  Loader2
} from 'lucide-react';

const RecommendationsView = ({
  results,
  rules = [],
  groupedSets = [],
  activeSubTab = 'recommendations',
  onSubTabChange,
  recommendationSearchTerm = '',
  onSearchChange,
  marketType = 'Default/unknown',
  getSuggestedAction,
  stats,
  onExportCSV,
  onShowCalculations,
  onOpenParamsModal,
  miningStatus
}) => {
  const [expandedRules, setExpandedRules] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [recPage, setRecPage] = useState(1);
  const [recPageSize, setRecPageSize] = useState(5);

  useEffect(() => {
    setRecPage(1);
  }, [recommendationSearchTerm, activeSubTab]);

  const toggleRuleExpand = (idx) => {
    setExpandedRules(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const toggleGroupCollapse = (size) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [size]: prev[size] === false ? true : false
    }));
  };

// Helper to highlight matching search text anywhere in product names
const renderHighlightedPrefix = (text, query) => {
  if (!text || !query || !query.trim()) return text;
  const q = query.trim();
  const lowerText = text.toLowerCase();
  const lowerQ = q.toLowerCase();
  if (!lowerText.includes(lowerQ)) return text;

  const parts = [];
  let lastIndex = 0;
  let idx = lowerText.indexOf(lowerQ, lastIndex);
  while (idx !== -1) {
    if (idx > lastIndex) {
      parts.push(text.substring(lastIndex, idx));
    }
    parts.push(
      <mark key={idx} className="cobuy-search-highlight">
        {text.substring(idx, idx + q.length)}
      </mark>
    );
    lastIndex = idx + q.length;
    idx = lowerText.indexOf(lowerQ, lastIndex);
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return <>{parts}</>;
};

  // Filter recommendations based on search term anywhere in product names
  const filteredRules = rules.filter(suggestion => {
    if (!recommendationSearchTerm.trim()) return true;
    const term = recommendationSearchTerm.trim().toLowerCase();
    const antecedentsMatch = suggestion.antecedents.some(item => item.toLowerCase().includes(term));
    const consequentsMatch = suggestion.consequents.some(item => item.toLowerCase().includes(term));
    const tieMatch = (suggestion.tieItems || []).some(item => item.toLowerCase().includes(term));
    return antecedentsMatch || consequentsMatch || tieMatch;
  });

  // Filter itemset groups based on search term anywhere in product names
  const filteredGroupedSets = groupedSets.map(group => {
    if (!recommendationSearchTerm.trim()) return group;
    const term = recommendationSearchTerm.trim().toLowerCase();
    const matchingItems = group.items.filter(item =>
      (item.items || []).some(it => it.toLowerCase().includes(term))
    );
    return { ...group, items: matchingItems };
  }).filter(group => group.items.length > 0);

  const totalFilteredItemsetsCount = filteredGroupedSets.reduce((sum, group) => sum + group.items.length, 0);

  // Pagination calculations for Recommendations
  const totalRecs = filteredRules.length;
  const totalRecPages = Math.max(1, Math.ceil(totalRecs / recPageSize));
  const safeRecPage = Math.min(recPage, totalRecPages);
  const startRecIdx = (safeRecPage - 1) * recPageSize;
  const endRecIdx = Math.min(startRecIdx + recPageSize, totalRecs);
  const paginatedRules = filteredRules.slice(startRecIdx, endRecIdx);

  const renderPagination = (position = 'bottom') => {
    if (!results || totalRecs <= 0) return null;
    const isTop = position === 'top';
    return (
      <div className={`cobuy-pagination-container ${isTop ? 'cobuy-pagination-top' : 'cobuy-pagination-bottom'}`}>
        <div className="cobuy-pagination-info">
          <span>
            Showing <strong>{startRecIdx + 1}</strong>–<strong>{endRecIdx}</strong> of <strong>{totalRecs}</strong> recommendations
          </span>
          <div className="cobuy-page-size-wrapper">
            <span>Per page:</span>
            <select
              className="cobuy-page-size-select"
              value={recPageSize}
              onChange={(e) => {
                setRecPageSize(Number(e.target.value));
                setRecPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={8}>8</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>

        <div className="cobuy-pagination-controls">
          <button
            type="button"
            className="cobuy-page-btn"
            onClick={() => setRecPage(1)}
            disabled={safeRecPage === 1}
            title="First page"
          >
            <ChevronsLeft size={15} />
          </button>
          <button
            type="button"
            className="cobuy-page-btn"
            onClick={() => setRecPage(p => Math.max(1, p - 1))}
            disabled={safeRecPage === 1}
            title="Previous page"
          >
            <ChevronLeft size={15} />
          </button>

          {/* Page Number Buttons */}
          {(() => {
            const pages = [];
            const maxVisiblePages = 5;
            let startP = Math.max(1, safeRecPage - Math.floor(maxVisiblePages / 2));
            let endP = Math.min(totalRecPages, startP + maxVisiblePages - 1);
            if (endP - startP + 1 < maxVisiblePages) {
              startP = Math.max(1, endP - maxVisiblePages + 1);
            }
            for (let p = startP; p <= endP; p++) {
              pages.push(
                <button
                  key={p}
                  type="button"
                  className={`cobuy-page-btn ${safeRecPage === p ? 'active' : ''}`}
                  onClick={() => setRecPage(p)}
                >
                  {p}
                </button>
              );
            }
            return pages;
          })()}

          <button
            type="button"
            className="cobuy-page-btn"
            onClick={() => setRecPage(p => Math.min(totalRecPages, p + 1))}
            disabled={safeRecPage === totalRecPages}
            title="Next page"
          >
            <ChevronRight size={15} />
          </button>
          <button
            type="button"
            className="cobuy-page-btn"
            onClick={() => setRecPage(totalRecPages)}
            disabled={safeRecPage === totalRecPages}
            title="Last page"
          >
            <ChevronsRight size={15} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="cobuy-full-card">
      {/* ── Top Tabs & Search Row ──────────────────────────────────── */}
      <div className="cobuy-tabs-row">
        <div className="cobuy-tabs-left">
          <button
            type="button"
            className={`cobuy-tab-btn ${activeSubTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => onSubTabChange('recommendations')}
          >
            Recommendations ({results ? filteredRules.length : 0})
          </button>
          <button
            type="button"
            className={`cobuy-tab-btn ${activeSubTab === 'itemsets' ? 'active' : ''}`}
            onClick={() => onSubTabChange('itemsets')}
          >
            Common Item Combos ({results ? totalFilteredItemsetsCount : 0})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Quick Header Pagination Indicator */}
          {results && totalRecPages > 1 && activeSubTab === 'recommendations' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              background: 'var(--inner-box-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.25rem 0.5rem',
              fontSize: '0.78rem'
            }}>
              <button
                type="button"
                onClick={() => setRecPage(p => Math.max(1, p - 1))}
                disabled={safeRecPage === 1}
                style={{
                  background: 'none',
                  border: 'none',
                  color: safeRecPage === 1 ? 'var(--text-dim)' : 'var(--text-main)',
                  cursor: safeRecPage === 1 ? 'not-allowed' : 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontWeight: '600', color: 'var(--text-muted)', minWidth: '40px', textAlign: 'center' }}>
                {safeRecPage} / {totalRecPages}
              </span>
              <button
                type="button"
                onClick={() => setRecPage(p => Math.min(totalRecPages, p + 1))}
                disabled={safeRecPage === totalRecPages}
                style={{
                  background: 'none',
                  border: 'none',
                  color: safeRecPage === totalRecPages ? 'var(--text-dim)' : 'var(--text-main)',
                  cursor: safeRecPage === totalRecPages ? 'not-allowed' : 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {onShowCalculations && (
            <button
              type="button"
              onClick={onShowCalculations}
              style={{
                background: 'var(--inner-box-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.45rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title="Learn how recommendations and scores are calculated"
            >
              <Lightbulb size={13} style={{ color: '#f59e0b' }} /> How It's Calculated
            </button>
          )}

          {onExportCSV && results && (
            <button
              type="button"
              onClick={onExportCSV}
              style={{
                background: 'var(--inner-box-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.45rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title="Download full analysis CSV"
            >
              <Download size={13} style={{ color: 'var(--primary-color)' }} /> Export CSV
            </button>
          )}

          {/* Structured Fixed Search Input */}
          <div className="cobuy-search-wrapper">
            <Search size={14} className="cobuy-search-icon" />
            <input
              type="text"
              className="cobuy-search-input"
              placeholder="Search product recommenda..."
              value={recommendationSearchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              disabled={!results}
            />
            {recommendationSearchTerm && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex'
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab 1: Recommendations Table ───────────────────────────── */}
      {activeSubTab === 'recommendations' && (
        <>
          {miningStatus === 'mining' ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
              <Loader2 size={32} className="spin" style={{ margin: '0 auto 1rem', color: 'var(--primary-color)' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                Analyzing Shopping Patterns...
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto', lineHeight: '1.55' }}>
                Mining association rules and discovering high-affinity product recommendations.
              </p>
            </div>
          ) : !results ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '16px',
                background: 'var(--sidebar-active-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                color: 'var(--primary-color)'
              }}>
                <Database size={28} />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                No Recommendations Available
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto', lineHeight: '1.55' }}>
                Upload a dataset and run analysis to view actionable buying recommendations.
              </p>
            </div>
          ) : filteredRules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.88rem', margin: 0 }}>
                No recommendations match your search query or pass current threshold filters.
              </p>
            </div>
          ) : (
            <div style={{ width: '100%' }}>
              {/* Top Page Navigator: immediately visible at top without scrolling */}
              {renderPagination('top')}

              <div style={{ overflowX: 'auto', width: '100%', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
                <table className="cobuy-rec-table">
                  <thead>
                    <tr>
                      <th style={{ width: '16%' }}>If They Buy...</th>
                      <th style={{ width: '16%' }}>Also Buy...</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>How Common<br /><span style={{ fontWeight: '400', fontSize: '0.7rem', color: 'var(--text-dim)' }}>(% of orders)</span></th>
                      <th style={{ width: '10%', textAlign: 'center' }}>How Likely<br /><span style={{ fontWeight: '400', fontSize: '0.7rem', color: 'var(--text-dim)' }}>(Chance to buy)</span></th>
                      <th style={{ width: '24%' }}>Explanation & Details</th>
                      <th style={{ width: '24%' }}>Suggested Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRules.map((suggestion, indexOnPage) => {
                      const globalIdx = startRecIdx + indexOnPage;
                      const confidencePct = (suggestion.confidence * 100).toFixed(1);
                      const supportPct = (suggestion.support * 100).toFixed(1);
                      const isHighConfidence = suggestion.confidence >= 0.8;
                      const isMediumConfidence = suggestion.confidence >= 0.5 && suggestion.confidence < 0.8;
                      const isFlexible = suggestion.tieMode === 'flexible';

                      const anchor = suggestion.antecedents.join(', ');
                      const recommendedItem = isFlexible ? suggestion.tieItems.join(' or ') : suggestion.consequents.join(', ');
                      const actionCategory = isHighConfidence ? 'bundle' : isMediumConfidence ? 'cross_promo' : 'placement';
                      const suggestedText = getSuggestedAction
                        ? getSuggestedAction(actionCategory, marketType, anchor, suggestion)
                        : (isHighConfidence
                            ? `Offer a discount when ${anchor} and ${recommendedItem} are ordered together.`
                            : `Feature ${recommendedItem} alongside ${anchor}.`);

                      // Highlight first row slightly on page 1
                      const isFirstRow = globalIdx === 0;

                      return (
                        <React.Fragment key={globalIdx}>
                          <tr style={{ background: isFirstRow ? 'var(--inner-box-bg)' : 'transparent' }}>
                          {/* 1. If They Buy... */}
                          <td>
                            <div className="cobuy-rec-product-pill">
                              {suggestion.antecedents.map((item, idx) => (
                                <React.Fragment key={idx}>
                                  {idx > 0 && ', '}
                                  {renderHighlightedPrefix(item, recommendationSearchTerm)}
                                </React.Fragment>
                              ))}
                            </div>
                          </td>

                          {/* 2. Also Buy... */}
                          <td>
                            <div className="cobuy-rec-product-pill cobuy-rec-product-pill--consequent">
                              {isFlexible
                                ? suggestion.tieItems.map((item, idx) => (
                                    <React.Fragment key={idx}>
                                      {idx > 0 && ' or '}
                                      {renderHighlightedPrefix(item, recommendationSearchTerm)}
                                    </React.Fragment>
                                  ))
                                : suggestion.consequents.map((item, idx) => (
                                    <React.Fragment key={idx}>
                                      {idx > 0 && ', '}
                                      {renderHighlightedPrefix(item, recommendationSearchTerm)}
                                    </React.Fragment>
                                  ))
                              }
                            </div>
                            {isFlexible && (
                              <div style={{ fontSize: '0.68rem', color: '#d97706', marginTop: '0.2rem', fontWeight: '600' }}>
                                (Flexible Choice)
                              </div>
                            )}
                          </td>

                          {/* 3. How Common (Support) */}
                          <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                            {supportPct}%
                          </td>

                          {/* 4. How Likely (Confidence) */}
                          <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                            {confidencePct}%
                          </td>

                          {/* 5. Explanation & Details */}
                          <td>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                              {suggestion.ant_tx_count != null && suggestion.rule_tx_count != null ? (
                                <>
                                  Out of <strong>{suggestion.ant_tx_count.toLocaleString()}</strong> customers who bought {anchor}, <strong>{suggestion.rule_tx_count.toLocaleString()}</strong> ({confidencePct}%) also purchased {isFlexible ? suggestion.tieItems.join(' or ') : suggestion.consequents.join(', ')}.
                                </>
                              ) : (
                                <>
                                  Out of customers who bought {anchor}, <strong>{confidencePct}%</strong> also added {isFlexible ? suggestion.tieItems.join(' or ') : suggestion.consequents.join(', ')} to their order.
                                </>
                              )}
                            </div>

                            {/* Collapsible toggle for more details */}
                            <button
                              type="button"
                              onClick={() => toggleRuleExpand(globalIdx)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#4f46e5',
                                cursor: 'pointer',
                                fontSize: '0.72rem',
                                fontWeight: '600',
                                padding: 0,
                                marginTop: '0.35rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                            >
                              {expandedRules[globalIdx] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              {expandedRules[globalIdx] ? 'Less Details' : 'More Details'}
                            </button>
                          </td>

                          {/* 6. Suggested Action Callout Pill */}
                          <td>
                            <div className="cobuy-action-callout">
                              {suggestedText}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Drawer for Lift & Deep Metrics */}
                        {expandedRules[globalIdx] && (
                          <tr style={{ background: 'var(--inner-box-bg)' }}>
                            <td colSpan={6} style={{ padding: '0.85rem 1.25rem' }}>
                              <div style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '0.85rem 1rem',
                                fontSize: '0.78rem',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.4rem'
                              }}>
                                <div>
                                  <strong style={{ color: 'var(--text-main)' }}>Pairing Strength:</strong>{' '}
                                  <span style={{ fontWeight: '700', color: 'var(--primary-color)' }}>{suggestion.lift?.toFixed(2)}x</span>
                                  <span style={{ color: 'var(--text-dim)', marginLeft: '0.5rem' }}>
                                    (Shoppers are {suggestion.lift?.toFixed(2)}x more likely to buy these together compared to buying normally)
                                  </span>
                                </div>
                                {suggestion.consequent_baseline_rate != null && (
                                  <div>
                                    <strong style={{ color: 'var(--text-main)' }}>Usual Purchase Rate:</strong>{' '}
                                    <span>
                                      Normally, only {(suggestion.consequent_baseline_rate * 100).toFixed(1)}% of all orders include {recommendedItem} — but this jumps to <strong style={{ color: 'var(--text-main)' }}>{confidencePct}%</strong> when {anchor} is in their cart.
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>

              {/* ── Bottom Page Navigator ── */}
              {renderPagination('bottom')}
            </div>
          )}
        </>
      )}

      {/* ── Tab 2: Common Item Combos ──────────────────────────────── */}
      {activeSubTab === 'itemsets' && (
        <div>
          {miningStatus === 'mining' ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
              <Loader2 size={32} className="spin" style={{ margin: '0 auto 1rem', color: 'var(--primary-color)' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                Discovering Item Combinations...
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto', lineHeight: '1.55' }}>
                Finding frequent product sets and cross-basket combinations.
              </p>
            </div>
          ) : !results ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '16px',
                background: 'var(--sidebar-active-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                color: 'var(--primary-color)'
              }}>
                <Database size={28} />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                No Item Combos Discovered Yet
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto', lineHeight: '1.55' }}>
                Upload a dataset and run analysis to discover common 1-item, 2-item, and N-item product pairings.
              </p>
            </div>
          ) : filteredGroupedSets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.88rem', margin: 0 }}>
                No common item combinations match your search query.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredGroupedSets.map(group => {
                const isCollapsed = collapsedGroups[group.size] !== false;
                return (
                  <div
                    key={group.size}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Header bar */}
                    <div
                      onClick={() => toggleGroupCollapse(group.size)}
                      style={{
                        background: 'var(--inner-box-bg)',
                        padding: '0.75rem 1.1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        userSelect: 'none',
                        borderBottom: !isCollapsed ? '1px solid var(--border-color)' : 'none'
                      }}
                    >
                      <span style={{ fontWeight: '700', color: 'var(--primary-color)', fontSize: '0.88rem' }}>
                        {group.label} ({group.items.length})
                      </span>
                      <span style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }}>
                        {isCollapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
                      </span>
                    </div>

                    {/* Table of items */}
                    {!isCollapsed && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ textAlign: 'left', padding: '0.75rem 1.1rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                              Common Item Combo
                            </th>
                            <th style={{ textAlign: 'right', padding: '0.75rem 1.1rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                              Co-Purchase Count
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map((set, idx) => {
                            const count = Math.round(set.support * (stats?.total_transactions || 0));
                            return (
                              <tr
                                key={idx}
                                style={{
                                  borderBottom: idx < group.items.length - 1 ? '1px solid var(--border-color)' : 'none',
                                  background: idx % 2 === 0 ? 'transparent' : 'var(--inner-box-bg)'
                                }}
                              >
                                <td style={{ padding: '0.75rem 1.1rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    {set.items.map(item => (
                                      <span
                                        key={item}
                                        style={{
                                          fontWeight: '600',
                                          color: 'var(--text-main)',
                                          background: 'var(--badge-bg)',
                                          padding: '0.2rem 0.5rem',
                                          borderRadius: '6px',
                                          fontSize: '0.78rem'
                                        }}
                                      >
                                        {renderHighlightedPrefix(item, recommendationSearchTerm)}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td style={{ padding: '0.75rem 1.1rem', textAlign: 'right', fontWeight: '700', color: 'var(--primary-color)' }}>
                                  {count.toLocaleString()} times
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecommendationsView;
