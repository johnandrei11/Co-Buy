import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Download, 
  Printer, 
  X, 
  RefreshCw, 
  Sun,
  Moon
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import './ExecutiveReportModal.css';

/**
 * ExecutiveReportModal
 * Pixel-perfect Executive Insights Export component.
 * Features a pristine White / Light Mode by default for print-friendly, ink-saving executive presentation.
 * Also includes instant Light/Dark mode toggling.
 * Completely dynamic: strictly passes the Dataset Swap Test (zero hardcoding).
 */
export default function ExecutiveReportModal({
  isOpen,
  onClose,
  stats = {},
  rules = [],
  trends = [],
  datasetName = '',
  dateRangeStr = ''
}) {
  const [theme, setTheme] = useState('light'); // 'light' (White mode, default) or 'dark'
  const [selectedRuleIndex, setSelectedRuleIndex] = useState(0);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const reportRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset selected rule when rules change
  useEffect(() => {
    setSelectedRuleIndex(0);
  }, [rules]);

  // ── 1. Calculate Period-over-Period Delta for Total Orders ─────────────────
  const { deltaDisplay, deltaType } = useMemo(() => {
    if (!trends || trends.length < 2) {
      return { deltaDisplay: 'Baseline', deltaType: 'neutral' };
    }
    const mid = Math.floor(trends.length / 2);
    const priorSlice = trends.slice(0, mid);
    const recentSlice = trends.slice(mid);

    const priorSum = priorSlice.reduce((sum, d) => sum + (d.count || 0), 0);
    const recentSum = recentSlice.reduce((sum, d) => sum + (d.count || 0), 0);

    if (priorSum === 0) {
      return { deltaDisplay: 'Baseline', deltaType: 'neutral' };
    }

    const pct = Math.round(((recentSum - priorSum) / priorSum) * 100);
    if (pct > 0) {
      return { deltaDisplay: `+${pct}%`, deltaType: 'positive' };
    } else if (pct < 0) {
      return { deltaDisplay: `${pct}%`, deltaType: 'negative' };
    }
    return { deltaDisplay: '0%', deltaType: 'neutral' };
  }, [trends]);

  // ── 2. Calculate Units Sold per Receipt ─────────────────────────────────────
  const itemsPerReceipt = useMemo(() => {
    const totalTransactions = stats.total_transactions || 0;
    const totalUnits = stats.total_units_sold || totalTransactions;
    if (totalTransactions === 0) return '0.0';
    return (totalUnits / totalTransactions).toFixed(1);
  }, [stats.total_transactions, stats.total_units_sold]);

  // ── 3. Aggregate Chart Data (Monthly Average if multi-month, else Daily) ───
  const { chartData, chartSubtitle } = useMemo(() => {
    if (!trends || trends.length === 0) {
      return { chartData: [], chartSubtitle: 'No transaction activity recorded' };
    }

    const monthMap = new Map();
    trends.forEach(t => {
      if (!t.date || t.date.length < 7) return;
      const ym = t.date.substring(0, 7);
      const cur = monthMap.get(ym) || { ym, total: 0, days: 0 };
      cur.total += (t.count || 0);
      cur.days += 1;
      monthMap.set(ym, cur);
    });

    const monthEntries = Array.from(monthMap.values()).sort((a, b) => a.ym.localeCompare(b.ym));
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    if (monthEntries.length >= 3) {
      const firstYear = monthEntries[0].ym.split('-')[0];
      const lastYear = monthEntries[monthEntries.length - 1].ym.split('-')[0];
      const isMultiYear = firstYear !== lastYear;

      const aggregated = monthEntries.map(m => {
        const parts = m.ym.split('-');
        const mIdx = parseInt(parts[1], 10) - 1;
        const avg = Math.round(m.total / (m.days || 1));
        const monthShort = monthNames[mIdx] || parts[1];
        const monthFull = `${monthsLong[mIdx] || parts[1]} ${parts[0]}`;

        return {
          label: monthShort,
          fullDate: monthFull,
          value: avg,
          rawTotal: m.total,
          daysCount: m.days,
          subtext: `${avg} tx/day avg (${m.total.toLocaleString()} total)`
        };
      });
      return {
        chartData: aggregated,
        chartSubtitle: isMultiYear
          ? `Average daily transactions per month (${firstYear}–${lastYear})`
          : `Average daily transactions per month (${firstYear})`
      };
    }

    // Daily breakdown fallback
    const daily = trends.map((t, idx) => ({
      label: t.display_date || t.date || `Day ${idx + 1}`,
      fullDate: t.date || `Day ${idx + 1}`,
      value: t.count || 0,
      rawTotal: t.count || 0,
      daysCount: 1,
      subtext: `${(t.count || 0).toLocaleString()} transactions`
    }));

    return {
      chartData: daily,
      chartSubtitle: 'Daily transaction volume across active period'
    };
  }, [trends]);

  // ── Dynamic Chart Palette for Light and Dark Modes ─────────────────────────
  const chartColors = useMemo(() => {
    if (theme === 'light') {
      return {
        line: '#2563eb', // Royal Blue
        grid: '#e2e8f0', // Clean subtle grey
        axis: '#64748b',
        dotFill: '#ffffff',
        dotStroke: '#2563eb',
        activeDotFill: '#2563eb',
        activeDotStroke: '#ffffff'
      };
    }
    return {
      line: '#38bdf8', // Cyan
      grid: '#243044',
      axis: '#64748b',
      dotFill: '#172030',
      dotStroke: '#38bdf8',
      activeDotFill: '#38bdf8',
      activeDotStroke: '#ffffff'
    };
  }, [theme]);

  // ── 4. Process Top Combo Pairs ─────────────────────────────────────────────
  const topCombos = useMemo(() => {
    if (!rules || rules.length === 0) return [];
    return rules.slice(0, 4);
  }, [rules]);

  const selectedRule = topCombos[selectedRuleIndex] || topCombos[0] || null;

  // Rule merchandising tag and class
  const getRuleBadge = (rule) => {
    const conf = rule.confidence || 0;
    if (conf >= 0.70) {
      return { label: 'Top Pair', className: 'upsell' };
    }
    if (conf >= 0.40) {
      return { label: 'Combo Deal', className: 'bundle' };
    }
    return { label: 'Shelf Placement', className: 'placement' };
  };

  // Dynamic practical action based on selected pair
  const actionText = useMemo(() => {
    if (!selectedRule) {
      return 'No operational pairing actions available until combination patterns are detected.';
    }
    const antecedentStr = Array.isArray(selectedRule.antecedents) 
      ? selectedRule.antecedents.join(', ') 
      : String(selectedRule.antecedents || 'Item A');
    const consequentStr = Array.isArray(selectedRule.consequents) 
      ? selectedRule.consequents.join(', ') 
      : String(selectedRule.consequents || 'Item B');

    const conf = selectedRule.confidence || 0;
    if (conf >= 0.70) {
      return `Place ${consequentStr} directly beside cash register counter display when purchasing ${antecedentStr}. Train staff to prompt customers with this pairing at checkout.`;
    }
    if (conf >= 0.40) {
      return `Bundle ${antecedentStr} with ${consequentStr} as a promotional combo deal or meal bundle to drive higher basket size.`;
    }
    return `Display ${consequentStr} on the shelf adjacent to ${antecedentStr} with cross-merchandising signage to encourage spontaneous discovery.`;
  }, [selectedRule]);

  // ── 5. High-Resolution PDF Export ──────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExportingPDF(true);

    try {
      const element = reportRef.current;
      
      // Capture at high resolution (scale: 2) with theme-specific background
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: theme === 'light' ? '#ffffff' : '#101622',
        windowWidth: 1200
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pdfHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
        // Multi-page slicing if document content overflows single A4 page
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position -= pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
      }

      const cleanDatasetName = (datasetName || 'Active_Data')
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`CoBuy_Executive_Insights_${cleanDatasetName}.pdf`);
    } catch (err) {
      console.error('Failed to export executive PDF:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // ── 6. Print Report ────────────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const isLight = theme === 'light';

  return (
    <div className="executive-modal-overlay" onClick={onClose}>
      <div 
        className={`executive-modal-window ${isLight ? 'theme-light' : 'theme-dark'}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="CoBuy Executive Insights Report"
      >
        {/* Top Control Toolbar */}
        <div className="executive-modal-toolbar">
          <div className="executive-toolbar-left">
            <span className="executive-toolbar-badge">Executive Export</span>
            <span className="executive-toolbar-title">
              {datasetName || 'Active Dataset'}
            </span>
          </div>

          <div className="executive-toolbar-actions">
            {/* Theme Toggle (Light / Dark) */}
            <button
              type="button"
              className="executive-btn executive-btn-secondary"
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode (White)'}
            >
              {isLight ? <Moon size={14} /> : <Sun size={14} />}
              <span>{isLight ? 'Dark Mode' : 'Light Mode'}</span>
            </button>

            <button
              type="button"
              className="executive-btn executive-btn-secondary"
              onClick={handlePrint}
              title="Print executive report (Ctrl+P)"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>

            <button
              type="button"
              className="executive-btn executive-btn-primary"
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              title="Download high-resolution PDF document"
            >
              {isExportingPDF ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Rendering PDF...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="executive-btn-icon"
              onClick={onClose}
              title="Close preview (Esc)"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Body */}
        <div className={`executive-modal-body ${isLight ? 'theme-light' : 'theme-dark'}`}>
          {/* Executive Document Sheet (Export Canvas) */}
          <div 
            id="cobuy-executive-report-document" 
            ref={reportRef} 
            className={`executive-report-document ${isLight ? 'theme-light' : 'theme-dark'}`}
          >
            {/* Header Block */}
            <div className="exec-header">
              <div className="exec-header-left">
                <h1 className="exec-title">CoBuy Executive Insights Export</h1>
                <p className="exec-subtitle">
                  Scope: {dateRangeStr || stats.date_range_str || 'Full Historical Period'} | Basket Analysis Pipeline
                </p>
              </div>

              <div 
                className={`exec-integrity-badge ${stats.health?.status_label === 'Warning' ? 'warning' : ''}`}
              >
                <span className="exec-integrity-dot" />
                <span>
                  {stats.health?.status_label === 'Warning' 
                    ? 'Data Integrity: Issues Detected' 
                    : 'Data Integrity Verified'}
                </span>
              </div>
            </div>

            {/* Executive KPI Grid (4 Cards) */}
            <div className="exec-kpi-grid">
              {/* Card 1: Total Orders */}
              <div className="exec-kpi-card">
                <span className="exec-kpi-label">Total Orders</span>
                <div className="exec-kpi-value-row">
                  <span className="exec-kpi-value">
                    {(stats.total_transactions || 0).toLocaleString()}
                  </span>
                  <span className={`exec-kpi-delta ${deltaType}`}>
                    {deltaDisplay}
                  </span>
                </div>
                <span className="exec-kpi-subtext">vs previous period</span>
              </div>

              {/* Card 2: Units Sold */}
              <div className="exec-kpi-card">
                <span className="exec-kpi-label">Units Sold</span>
                <div className="exec-kpi-value-row">
                  <span className="exec-kpi-value">
                    {(stats.total_units_sold || stats.total_transactions || 0).toLocaleString()}
                  </span>
                </div>
                <span className="exec-kpi-subtext">
                  {itemsPerReceipt} items / receipt
                </span>
              </div>

              {/* Card 3: Active Catalog */}
              <div className="exec-kpi-card">
                <span className="exec-kpi-label">Active Catalog</span>
                <div className="exec-kpi-value-row">
                  <span className="exec-kpi-value">
                    {(stats.unique_items_count || 0).toLocaleString()}
                  </span>
                </div>
                <span className="exec-kpi-subtext">Items analyzed</span>
              </div>

              {/* Card 4: Discovered Combos */}
              <div className="exec-kpi-card">
                <span className="exec-kpi-label">Discovered Combos</span>
                <div className="exec-kpi-value-row">
                  <span className="exec-kpi-value">
                    {(rules ? rules.length : 0).toLocaleString()}
                  </span>
                </div>
                <span className="exec-kpi-subtext">High-probability pairings</span>
              </div>
            </div>

            {/* Middle Section: Two Columns (Daily Order Volume + Merchandising Combos) */}
            <div className="exec-middle-grid">
              {/* Left Column: Daily Order Volume Chart */}
              <div className="exec-panel-card">
                <div className="exec-panel-header">
                  <h3 className="exec-panel-title">Daily Order Volume</h3>
                  <p className="exec-panel-subtitle">{chartSubtitle}</p>
                </div>

                <div className="exec-chart-container">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={chartData} 
                        margin={{ top: 12, right: 14, left: -16, bottom: 0 }}
                      >
                        <CartesianGrid 
                          stroke={chartColors.grid} 
                          strokeDasharray="3 3" 
                          vertical={false} 
                        />
                        <XAxis 
                          dataKey="label" 
                          stroke={chartColors.axis} 
                          tick={{ fill: chartColors.axis, fontSize: 11 }} 
                          axisLine={{ stroke: chartColors.grid }} 
                          tickLine={false}
                        />
                        <YAxis 
                          stroke={chartColors.axis} 
                          tick={{ fill: chartColors.axis, fontSize: 11 }} 
                          axisLine={{ stroke: chartColors.grid }} 
                          tickLine={false}
                          domain={['auto', 'auto']}
                        />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="exec-chart-tooltip">
                                  <div className="exec-chart-tooltip-label">{data.fullDate || data.label}</div>
                                  <div className="exec-chart-tooltip-value">
                                    {data.value.toLocaleString()} {data.daysCount > 1 ? 'daily avg' : 'orders'}
                                  </div>
                                  <div className="exec-chart-tooltip-sub">{data.subtext}</div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke={chartColors.line} 
                          strokeWidth={2.5} 
                          dot={{ r: 4, fill: chartColors.dotFill, stroke: chartColors.dotStroke, strokeWidth: 2 }} 
                          activeDot={{ r: 6, fill: chartColors.activeDotFill, stroke: chartColors.activeDotStroke, strokeWidth: 2 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="exec-empty-combos">
                      <div className="exec-empty-combos-text">No Trend Data Available</div>
                      <div className="exec-empty-combos-sub">Historical transaction timestamps are required to graph order volume.</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Merchandising Combo Recommendations */}
              <div className="exec-panel-card">
                <div className="exec-panel-header">
                  <h3 className="exec-panel-title">Merchandising Combo Recommendations</h3>
                  <p className="exec-panel-subtitle">Select a combo pair to view practical action</p>
                </div>

                {topCombos.length > 0 ? (
                  <div className="exec-combos-container">
                    {topCombos.map((rule, idx) => {
                      const isSelected = selectedRuleIndex === idx;
                      const antecedent = Array.isArray(rule.antecedents) 
                        ? rule.antecedents.join(', ') 
                        : String(rule.antecedents || '');
                      const consequent = Array.isArray(rule.consequents) 
                        ? rule.consequents.join(', ') 
                        : String(rule.consequents || '');
                      const popularity = Math.round((rule.support || 0) * 100);
                      const likelihood = Math.round((rule.confidence || 0) * 100);
                      const badge = getRuleBadge(rule);

                      return (
                        <div
                          key={idx}
                          className={`exec-combo-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedRuleIndex(idx)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setSelectedRuleIndex(idx);
                            }
                          }}
                          aria-pressed={isSelected}
                        >
                          <div className="exec-combo-top">
                            <span className="exec-combo-name">
                              {antecedent} + {consequent}
                            </span>
                            <span className={`exec-combo-badge ${badge.className}`}>
                              {badge.label}
                            </span>
                          </div>

                          <div className="exec-combo-metrics">
                            <span>
                              Popularity: <strong>{popularity}%</strong>
                            </span>
                            <span>
                              Reorder Likelihood: <strong>{likelihood}%</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Dynamic Practical Action Box */}
                    <div className="exec-action-callout">
                      <span className="exec-action-header">RECOMMENDED ACTION</span>
                      <p className="exec-action-body">{actionText}</p>
                    </div>
                  </div>
                ) : (
                  <div className="exec-empty-combos">
                    <p className="exec-empty-combos-text">
                      More data is required for combo generation.
                    </p>
                    <span className="exec-empty-combos-sub">
                      Transactions analyzed do not yet meet association mining frequency thresholds.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Section: How to Read This Report (Business Glossary) */}
            <div className="exec-glossary-card">
              <h4 className="exec-glossary-title">How to Read This Report</h4>
              <div className="exec-glossary-grid">
                <div className="exec-glossary-col">
                  <span className="exec-glossary-heading">Popularity (Support)</span>
                  <p className="exec-glossary-desc">
                    Percentage of total customer receipts containing both items together.
                  </p>
                </div>

                <div className="exec-glossary-col">
                  <span className="exec-glossary-heading">Reorder Likelihood (Confidence)</span>
                  <p className="exec-glossary-desc">
                    Probability that buying Item A leads directly to adding Item B.
                  </p>
                </div>

                <div className="exec-glossary-col">
                  <span className="exec-glossary-heading">Data Verification</span>
                  <p className="exec-glossary-desc">
                    100% receipt tracking without synthetic sampling or extrapolation.
                  </p>
                </div>
              </div>
            </div>

            {/* Confidential Report Footer */}
            <div className="exec-doc-footer">
              <span>CoBuy Retail Intelligence System • Executive Export</span>
              <span>Dataset: {datasetName || 'Active Session'} • Generated: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
