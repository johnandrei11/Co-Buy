import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import {
  BarChart3,
  FileText,
  Package,
  LayoutGrid,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Calendar,
  ChevronDown,
  Download,
  RefreshCw,
  Star,
  Info,
  Lightbulb,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  X,
  Database,
  Filter,
  SlidersHorizontal,
  RotateCcw,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList
} from 'recharts';

const API_BASE = 'http://localhost:5000/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    active: false,
    dataset_id: null,
    dataset_name: null,
    total_transactions: 0,
    total_units_sold: 0,
    unique_items_count: 0,
    top_items: [],
    date_range_str: '',
    upload_date: '',
    health: null
  });
  const [trends, setTrends] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Modals state
  const [showDatasetModal, setShowDatasetModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);

  const activeDatasetId = stats.dataset_id || localStorage.getItem('activeDatasetId');
  const activeDatasetName = stats.dataset_name || localStorage.getItem('activeDatasetName');

  // ── Date Formatting Helpers (Dynamic & Adaptive) ──────────────────────────
  // Handles Excel serials, 8-digit numbers, YYYY/MM/DD, DD/MM/YYYY, MM/DD/YYYY, etc.
  const parseRawDateParts = (raw) => {
    if (!raw) return null;
    let str = String(raw).trim();
    if (!str || str.toLowerCase() === 'nan' || str.toLowerCase() === 'null') return null;

    // Excel serial number (20000 - 65000)
    const num = Number(str);
    if (!isNaN(num) && num >= 20000 && num <= 65000) {
      const dateObj = new Date(Math.round((num - 25569) * 86400 * 1000));
      return {
        year: dateObj.getUTCFullYear(),
        month: dateObj.getUTCMonth() + 1,
        day: dateObj.getUTCDate()
      };
    }

    // 8-digit integer YYYYMMDD
    if (/^\d{8}$/.test(str)) {
      return {
        year: parseInt(str.substring(0, 4), 10),
        month: parseInt(str.substring(4, 6), 10),
        day: parseInt(str.substring(6, 8), 10)
      };
    }

    // Strip time portion if present
    const cleanStr = str.split(/[ T]/)[0].trim();
    const parts = cleanStr.split(/[-/.]/);

    if (parts.length === 3) {
      // YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
      if (parts[0].length === 4 && !isNaN(parts[0])) {
        return {
          year: parseInt(parts[0], 10),
          month: parseInt(parts[1], 10),
          day: parseInt(parts[2], 10)
        };
      }
      // DD/MM/YYYY or MM/DD/YYYY
      if (parts[2].length === 4 && !isNaN(parts[2])) {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (p0 > 12 && p1 <= 12) {
          // Definitely DD/MM/YYYY
          return { year, month: p1, day: p0 };
        }
        // Default MM/DD/YYYY
        return { year, month: p0, day: p1 };
      }
    }

    // Fallback: Javascript Date parsing
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return {
        year: parsed.getFullYear(),
        month: parsed.getMonth() + 1,
        day: parsed.getDate()
      };
    }

    return null;
  };

  // Transforms any format: 2026/03/05, 05/03/2026, 2026-03-05 into 'MMM DD' (e.g. 'Mar 05' or 'May 03')
  const formatDateTick = (dateStr) => {
    const parsed = parseRawDateParts(dateStr);
    if (!parsed) return dateStr || '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mName = months[parsed.month - 1] || parsed.month;
    return `${mName} ${String(parsed.day).padStart(2, '0')}`;
  };

  // Transforms any date into 'MMM DD, YYYY' or 'Month DD, YYYY' (e.g. 'Mar 05, 2026' or 'May 05, 2026')
  const formatFullDate = (dateStr, fullMonth = false) => {
    const parsed = parseRawDateParts(dateStr);
    if (!parsed) return dateStr || '';
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const mList = fullMonth ? monthsLong : monthsShort;
    const mName = mList[parsed.month - 1] || parsed.month;
    return `${mName} ${String(parsed.day).padStart(2, '0')}, ${parsed.year}`;
  };

  // ── Fetch Dashboard Data ──────────────────────────────────────────────────
  const fetchDashboardData = async (targetId = null) => {
    setLoading(true);
    try {
      const idToFetch = targetId || localStorage.getItem('activeDatasetId');

      if (!idToFetch) {
        setStats({
          active: false,
          dataset_id: null,
          dataset_name: null,
          total_transactions: 0,
          total_units_sold: 0,
          unique_items_count: 0,
          top_items: [],
          date_range_str: '',
          upload_date: '',
          health: null
        });
        setTrends([]);
        setRules([]);
        setLoading(false);
        return;
      }

      // 1. Fetch Stats & Health
      const statsRes = await axios.get(`${API_BASE}/stats?dataset_id=${idToFetch}`);
      if (!statsRes.data.active) {
        localStorage.removeItem('activeDatasetId');
        localStorage.removeItem('activeDatasetName');
        setStats({
          active: false,
          dataset_id: null,
          dataset_name: null,
          total_transactions: 0,
          total_units_sold: 0,
          unique_items_count: 0,
          top_items: [],
          date_range_str: '',
          upload_date: '',
          health: null
        });
        setTrends([]);
        setRules([]);
        setLoading(false);
        return;
      }

      setStats(statsRes.data);
      if (statsRes.data.dataset_name) {
        localStorage.setItem('activeDatasetName', statsRes.data.dataset_name);
      }

      // 2. Fetch Trends (strictly real dataset dates)
      try {
        const trendsRes = await axios.get(`${API_BASE}/trends?dataset_id=${idToFetch}`);
        setTrends(trendsRes.data.trends || []);
      } catch (e) {
        console.error('Failed to fetch trends:', e);
        setTrends([]);
      }

      // 3. Fetch Discovered Patterns Count (Adaptive Mining)
      try {
        const mineRes = await axios.post(`${API_BASE}/mine`, {
          dataset_id: idToFetch,
          algorithm: 'auto'
        });
        setRules(mineRes.data.rules || []);
      } catch (e) {
        console.error('Failed to fetch rules count:', e);
        setRules([]);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setStats(prev => ({ ...prev, active: false }));
      setTrends([]);
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ── Open Change Dataset Modal ──────────────────────────────────────────────
  const handleOpenDatasetModal = async () => {
    setShowDatasetModal(true);
    setLoadingDatasets(true);
    try {
      const res = await axios.get(`${API_BASE}/datasets`);
      setAvailableDatasets(res.data.datasets || []);
    } catch (err) {
      console.error('Failed to load datasets:', err);
      setAvailableDatasets([]);
    } finally {
      setLoadingDatasets(false);
    }
  };

  // ── Switch Active Dataset ──────────────────────────────────────────────────
  const handleSelectDataset = async (dataset) => {
    setStats({
      active: false,
      dataset_id: dataset.id,
      dataset_name: dataset.name,
      total_transactions: 0,
      total_units_sold: 0,
      unique_items_count: 0,
      top_items: [],
      date_range_str: '',
      upload_date: '',
      health: null
    });
    setTrends([]);
    setRules([]);
    setShowDatasetModal(false);

    localStorage.setItem('activeDatasetId', dataset.id);
    localStorage.setItem('activeDatasetName', dataset.name);

    try {
      await axios.post(`${API_BASE}/history/${dataset.id}/activate`);
    } catch (e) {
      // background activation
    }

    await fetchDashboardData(dataset.id);
  };

  // ── Interactive Date Filter & Granularity State ────────────────────────────
  const [showDateFilterDropdown, setShowDateFilterDropdown] = useState(false);
  const [dateFilterPreset, setDateFilterPreset] = useState('all'); // 'all', '7d', '14d', '30d', '90d', 'month', 'custom'
  const [selectedMonth, setSelectedMonth] = useState(''); // e.g. '2024-05'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [chartGranularity, setChartGranularity] = useState('daily'); // 'daily', 'weekly', 'monthly'
  const dateFilterRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateFilterRef.current && !dateFilterRef.current.contains(e.target)) {
        setShowDateFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When trends change, initialize custom dates with dataset bounds
  useEffect(() => {
    if (trends && trends.length > 0) {
      const dates = trends.map(t => t.date).filter(Boolean).sort();
      if (dates.length > 0) {
        setCustomStartDate(dates[0]);
        setCustomEndDate(dates[dates.length - 1]);
      }
    }
  }, [trends]);

  // Min and Max dates present in trends
  const datasetDateBounds = useMemo(() => {
    if (!trends || trends.length === 0) return { minDate: '', maxDate: '' };
    const dates = trends.map(t => t.date).filter(Boolean).sort();
    return {
      minDate: dates[0] || '',
      maxDate: dates[dates.length - 1] || ''
    };
  }, [trends]);

  // Extract all distinct months from dataset trends
  const availableMonths = useMemo(() => {
    if (!trends || trends.length === 0) return [];
    const monthsMap = new Map();
    trends.forEach(t => {
      if (t.date && t.date.length >= 7) {
        const ym = t.date.substring(0, 7);
        const count = monthsMap.get(ym) || 0;
        monthsMap.set(ym, count + (t.count || 0));
      }
    });
    const monthsNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Array.from(monthsMap.entries()).map(([ym, totalCount]) => {
      const parts = ym.split('-');
      const mIdx = parseInt(parts[1], 10) - 1;
      const label = `${monthsNames[mIdx] || parts[1]} ${parts[0]}`;
      return { key: ym, label, count: totalCount };
    });
  }, [trends]);

  // Filtered raw trends according to active filter
  const filteredTrends = useMemo(() => {
    if (!trends || trends.length === 0) return [];

    if (dateFilterPreset === '7d') {
      return trends.slice(-7);
    }
    if (dateFilterPreset === '14d') {
      return trends.slice(-14);
    }
    if (dateFilterPreset === '30d') {
      return trends.slice(-30);
    }
    if (dateFilterPreset === '90d') {
      return trends.slice(-90);
    }
    if (dateFilterPreset === 'month' && selectedMonth) {
      return trends.filter(t => t.date && t.date.startsWith(selectedMonth));
    }
    if (dateFilterPreset === 'custom' && customStartDate && customEndDate) {
      return trends.filter(t => t.date && t.date >= customStartDate && t.date <= customEndDate);
    }
    return trends; // 'all'
  }, [trends, dateFilterPreset, selectedMonth, customStartDate, customEndDate]);

  // Dynamic Chart Data Derived Strictly from Dataset Trends (with Granularity Aggregation)
  const chartData = useMemo(() => {
    if (!filteredTrends || filteredTrends.length === 0) return [];

    if (chartGranularity === 'monthly') {
      const map = new Map();
      filteredTrends.forEach(t => {
        const ym = t.date ? t.date.substring(0, 7) : 'Unknown';
        const cur = map.get(ym) || { date: ym, count: 0, daysCount: 0 };
        cur.count += (t.count || 0);
        cur.daysCount += 1;
        map.set(ym, cur);
      });
      const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthsLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return Array.from(map.entries()).map(([ym, val]) => {
        const parts = ym.split('-');
        const mIdx = parseInt(parts[1], 10) - 1;
        const disp = `${monthsShort[mIdx] || parts[1]} '${parts[0] ? parts[0].slice(-2) : ''}`;
        const full = `${monthsLong[mIdx] || parts[1]} ${parts[0]}`;
        return {
          date: ym,
          displayDate: disp,
          fullDate: full,
          count: val.count,
          subtext: `${val.daysCount} recorded day${val.daysCount > 1 ? 's' : ''}`
        };
      });
    }

    if (chartGranularity === 'weekly') {
      const weeks = [];
      const chunkSize = 7;
      for (let i = 0; i < filteredTrends.length; i += chunkSize) {
        const slice = filteredTrends.slice(i, i + chunkSize);
        const sumCount = slice.reduce((acc, curr) => acc + (curr.count || 0), 0);
        const dStart = slice[0].date;
        const dEnd = slice[slice.length - 1].date;
        weeks.push({
          date: dStart,
          displayDate: `${formatDateTick(dStart)} - ${formatDateTick(dEnd)}`,
          fullDate: `${formatFullDate(dStart)} – ${formatFullDate(dEnd)}`,
          count: sumCount,
          subtext: `${slice.length} days (${sumCount.toLocaleString()} txs)`
        });
      }
      return weeks;
    }

    // Default: Daily
    return filteredTrends.map(t => {
      const dateStr = t.date || '';
      const displayDate = t.display_date || formatDateTick(dateStr);
      const fullDate = t.full_date || formatFullDate(dateStr);
      return {
        ...t,
        displayDate,
        fullDate,
        count: t.count || 0
      };
    });
  }, [filteredTrends, chartGranularity]);

  // Dynamic XAxis interval to avoid tick label collision
  const xAxisInterval = useMemo(() => {
    const len = chartData.length;
    if (len <= 7) return 0;
    if (len <= 12) return 1;
    return Math.ceil(len / 7);
  }, [chartData.length]);

  // Chart Header Date Range Label (Reflects current date filter or dataset range)
  const chartDateRange = useMemo(() => {
    if (dateFilterPreset === '7d') {
      const span = filteredTrends.length > 0 ? ` (${formatDateTick(filteredTrends[0].date)} – ${formatFullDate(filteredTrends[filteredTrends.length - 1].date)})` : '';
      return `Last 7 Days${span}`;
    }
    if (dateFilterPreset === '14d') {
      const span = filteredTrends.length > 0 ? ` (${formatDateTick(filteredTrends[0].date)} – ${formatFullDate(filteredTrends[filteredTrends.length - 1].date)})` : '';
      return `Last 14 Days${span}`;
    }
    if (dateFilterPreset === '30d') {
      const span = filteredTrends.length > 0 ? ` (${formatDateTick(filteredTrends[0].date)} – ${formatFullDate(filteredTrends[filteredTrends.length - 1].date)})` : '';
      return `Last 30 Days${span}`;
    }
    if (dateFilterPreset === '90d') {
      const span = filteredTrends.length > 0 ? ` (${formatDateTick(filteredTrends[0].date)} – ${formatFullDate(filteredTrends[filteredTrends.length - 1].date)})` : '';
      return `Last 90 Days${span}`;
    }
    if (dateFilterPreset === 'month' && selectedMonth) {
      const found = availableMonths.find(m => m.key === selectedMonth);
      return found ? found.label : selectedMonth;
    }
    if (dateFilterPreset === 'custom' && customStartDate && customEndDate) {
      return `${formatDateTick(customStartDate)} – ${formatFullDate(customEndDate)}`;
    }
    // Full dataset range ('all')
    if (filteredTrends.length > 1) {
      return `${formatDateTick(filteredTrends[0].date)} – ${formatFullDate(filteredTrends[filteredTrends.length - 1].date)}`;
    }
    if (filteredTrends.length === 1) {
      return formatFullDate(filteredTrends[0].date);
    }
    if (stats.date_range_str && stats.date_range_str !== 'No dates recorded') {
      return stats.date_range_str;
    }
    if (stats.upload_date) {
      return formatFullDate(stats.upload_date);
    }
    return 'All Time';
  }, [dateFilterPreset, filteredTrends, selectedMonth, availableMonths, customStartDate, customEndDate, stats.date_range_str, stats.upload_date]);

  // Total transactions in current filtered range
  const filteredTotalTransactions = useMemo(() => {
    return filteredTrends.reduce((sum, t) => sum + (t.count || 0), 0);
  }, [filteredTrends]);

  // Active Dataset Formatted Date (Strictly from Dataset Data)
  const formattedActiveDate = useMemo(() => {
    if (stats.date_range_str && stats.date_range_str !== 'No dates recorded') {
      return stats.date_range_str;
    }
    if (trends && trends.length > 0) {
      return trends.length > 1
        ? `${formatDateTick(trends[0].date)} – ${formatFullDate(trends[trends.length - 1].date)}`
        : formatFullDate(trends[0].date);
    }
    if (stats.upload_date) {
      return formatFullDate(stats.upload_date);
    }
    return 'Recorded Period';
  }, [stats.date_range_str, trends, stats.upload_date]);

  // Dynamic Transaction Growth Trend (between latest periods if available)
  const transactionTrend = useMemo(() => {
    if (trends && trends.length >= 2) {
      const latest = trends[trends.length - 1].count;
      const prev = trends[trends.length - 2].count;
      const diff = latest - prev;
      const pct = Math.round((diff / (prev || 1)) * 100);
      return {
        hasTrend: true,
        isPositive: pct >= 0,
        text: `${pct >= 0 ? '+' : ''}${pct}% vs. prev date`
      };
    }
    return {
      hasTrend: false,
      text: 'Active records'
    };
  }, [trends]);

  // Custom Chart Tooltip (Floating Royal Purple Bubble)
  const CustomChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="cobuy-chart-tooltip">
          <div className="cobuy-tooltip-date">{data.fullDate || data.displayDate}</div>
          <div className="cobuy-tooltip-count">
            <span className="cobuy-tooltip-dot" />
            {data.count.toLocaleString()} transactions
          </div>
        </div>
      );
    }
    return null;
  };

  // ── Key Insights Computations (Strictly Dynamic) ───────────────────────────
  const topProduct = useMemo(() => {
    return (stats.top_items && stats.top_items.length > 0) ? stats.top_items[0] : null;
  }, [stats.top_items]);

  const salesConcentration = useMemo(() => {
    if (!stats.top_items || stats.top_items.length < 3) return null;
    const top3Vol = stats.top_items.slice(0, 3).reduce((sum, item) => sum + (item.value || 0), 0);
    const totalVol = stats.total_units_sold || stats.total_transactions || 1;
    const share = Math.round((top3Vol / totalVol) * 100);
    return {
      share,
      isConcentrated: share >= 40
    };
  }, [stats.top_items, stats.total_units_sold, stats.total_transactions]);

  // ── PDF Export Presentation ───────────────────────────────────────────────
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 14;

      // Header Banner
      pdf.setFillColor(79, 70, 229);
      pdf.rect(0, 0, pageWidth, 24, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text('CoBuy — Market Insights Overview', margin, 15);

      let y = 34;

      // Active Dataset Summary
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(30, 41, 59);
      pdf.text('Active Dataset:', margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(71, 85, 105);
      pdf.text(
        `${activeDatasetName || 'Dataset'} (${stats.total_transactions.toLocaleString()} transactions • ${stats.unique_items_count} products • ${formattedActiveDate})`,
        margin + 32,
        y
      );

      y += 10;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;

      // KPI Metrics Box
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(30, 41, 59);
      pdf.text('Key Performance Indicators', margin, y);
      y += 8;

      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`• Total Transactions: ${stats.total_transactions.toLocaleString()}`, margin + 4, y);
      y += 6;
      pdf.text(`• Units Sold: ${(stats.total_units_sold || stats.total_transactions).toLocaleString()} items`, margin + 4, y);
      y += 6;
      pdf.text(`• Products Sold: ${stats.unique_items_count.toLocaleString()} active products`, margin + 4, y);
      y += 6;
      pdf.text(`• Discovered Buying Patterns: ${rules.length} patterns discovered`, margin + 4, y);
      y += 12;

      // Key Insights Section
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(30, 41, 59);
      pdf.text('Key Insights', margin, y);
      y += 8;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      if (topProduct) {
        pdf.text(`1. Best-Selling Product: ${topProduct.name} recorded ${topProduct.value.toLocaleString()} units sold.`, margin + 4, y);
        y += 6;
      }
      pdf.text(`2. Sales Concentration: Sales volume spans across ${stats.unique_items_count} catalogued products.`, margin + 4, y);
      y += 6;
      pdf.text(`3. Purchasing Patterns: ${rules.length > 0 ? `${rules.length} association rules discovered for product placement.` : 'Limited purchasing patterns detected under current thresholds.'}`, margin + 4, y);
      y += 12;

      // Dataset Health Section
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(30, 41, 59);
      pdf.text('Dataset Health & Validation', margin, y);
      y += 8;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(16, 185, 129);
      pdf.text(`[✓] Status: ${stats.health?.status_label || 'Ready'} — ${stats.health?.message || 'Data is complete and ready.'}`, margin + 4, y);
      y += 6;
      pdf.setTextColor(71, 85, 105);
      pdf.text(`[✓] Valid Transactions: ${stats.total_transactions.toLocaleString()}`, margin + 4, y);
      y += 5;
      pdf.text(`[✓] Unique Products: ${stats.unique_items_count}`, margin + 4, y);
      y += 5;
      pdf.text(`[✓] Date Coverage: ${formattedActiveDate}`, margin + 4, y);
      y += 5;
      pdf.text(`[✓] Missing Product Names: ${stats.health?.missing_names_count || 0}`, margin + 4, y);

      // Footer
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, 280, pageWidth - margin, 280);
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text('CoBuy Market Insights • Confidential Business Report', margin, 286);
      pdf.text(new Date().toLocaleDateString(), pageWidth - margin, 286, { align: 'right' });

      pdf.save(`CoBuy_Market_Insights_${activeDatasetName ? activeDatasetName.replace(/\.[^/.]+$/, "") : 'Report'}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="cobuy-dash-container fade-in">
      {/* ── 1. Header Row (Market Insights + Export Report ⌵) ── */}
      <div className="cobuy-dash-header">
        <div className="cobuy-dash-header-left">
          <div className="cobuy-dash-header-icon">
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 className="cobuy-dash-title">Market Insights</h1>
            <p className="cobuy-dash-subtitle">Overview of your sales performance and buying behavior.</p>
          </div>
        </div>

        {stats.active && (
          <button
            type="button"
            className="cobuy-export-btn"
            onClick={handleExportPDF}
            disabled={isExporting}
            title="Download PDF Market Insights report"
          >
            {isExporting ? <RefreshCw size={14} className="spin" /> : <Download size={15} />}
            <span>{isExporting ? 'Generating...' : 'Export Report'}</span>
            <ChevronDown size={14} style={{ color: '#94a3b8' }} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <RefreshCw size={36} className="spin" style={{ color: 'var(--primary-color)', margin: '0 auto 1rem' }} />
          <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: '600' }}>
            Loading active dataset overview & sales insights...
          </div>
        </div>
      ) : !stats.active ? (
        /* Empty State (No Dataset Selected) */
        <div className="card" style={{ padding: '4.5rem 2rem', textAlign: 'center', background: 'var(--card-bg)' }}>
          <Database size={48} style={{ color: 'var(--text-dim)', margin: '0 auto 1.25rem' }} />
          <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            No Active Dataset Found
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.88rem', lineHeight: '1.6' }}>
            There is currently no active dataset loaded for your account. Please select a historical file from History or upload sales data in Analytics to view your business overview.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenDatasetModal}
              style={{ padding: '0.65rem 1.4rem' }}
            >
              Select From History
            </button>
            <a
              href="/analytics"
              className="btn"
              style={{ background: 'var(--inner-box-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.65rem 1.4rem', textDecoration: 'none' }}
            >
              Upload New File
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* ── 2. Active Dataset Context Card ── */}
          <div className="cobuy-active-dataset-card">
            <div className="cobuy-active-dataset-info">
              <div className="cobuy-active-dataset-icon">
                <FileText size={22} />
              </div>
              <div>
                <div className="cobuy-dataset-sub-label">Current Dataset</div>
                <div className="cobuy-active-dataset-name-row">
                  <span className="cobuy-active-dataset-name">
                    {activeDatasetName || stats.dataset_name || `Dataset #${stats.dataset_id}`}
                  </span>
                  <span className="cobuy-active-pill">
                    <span className="cobuy-active-dot" /> Active
                  </span>
                </div>
                <div className="cobuy-active-dataset-meta">
                  {stats.total_transactions.toLocaleString()} transactions • {stats.unique_items_count} products • {formattedActiveDate}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="cobuy-change-dataset-btn"
              onClick={handleOpenDatasetModal}
              title="Switch to another dataset from your history"
            >
              <RefreshCw size={13} />
              <span>Change Dataset</span>
            </button>
          </div>

          {/* ── 3. Four KPI Cards (Strictly Dynamic Values) ── */}
          <div className="cobuy-kpi-grid">
            {/* KPI 1: Total Transactions */}
            <div className="cobuy-kpi-card">
              <div className="cobuy-kpi-header">
                <div className="cobuy-kpi-icon-box" style={{ background: '#eff2fe', color: '#6366f1' }}>
                  <FileText size={18} />
                </div>
                <span className="cobuy-kpi-label">Total Transactions</span>
              </div>
              <div className="cobuy-kpi-value">
                {stats.total_transactions.toLocaleString()}
              </div>
              <div className="cobuy-kpi-footer">
                {transactionTrend.hasTrend ? (
                  <span className={`cobuy-kpi-trend ${transactionTrend.isPositive ? 'positive' : 'negative'}`}>
                    {transactionTrend.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {transactionTrend.text}
                  </span>
                ) : (
                  <span className="cobuy-kpi-compare">Active records</span>
                )}
              </div>
            </div>

            {/* KPI 2: Units Sold */}
            <div className="cobuy-kpi-card">
              <div className="cobuy-kpi-header">
                <div className="cobuy-kpi-icon-box" style={{ background: '#ecfdf5', color: '#10b981' }}>
                  <Package size={18} />
                </div>
                <span className="cobuy-kpi-label">Units Sold</span>
              </div>
              <div className="cobuy-kpi-value">
                {(stats.total_units_sold || stats.total_transactions).toLocaleString()}
              </div>
              <div className="cobuy-kpi-footer">
                <span className="cobuy-kpi-compare">
                  Avg: {(stats.total_units_sold / (stats.total_transactions || 1)).toFixed(1)} units/receipt
                </span>
              </div>
            </div>

            {/* KPI 3: Products Sold */}
            <div className="cobuy-kpi-card">
              <div className="cobuy-kpi-header">
                <div className="cobuy-kpi-icon-box" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                  <LayoutGrid size={18} />
                </div>
                <span className="cobuy-kpi-label">Products Sold</span>
              </div>
              <div className="cobuy-kpi-value">
                {stats.unique_items_count.toLocaleString()}
              </div>
              <div className="cobuy-kpi-footer">
                <span className="cobuy-kpi-compare">Active products</span>
              </div>
            </div>

            {/* KPI 4: Buying Patterns */}
            <div className="cobuy-kpi-card">
              <div className="cobuy-kpi-header">
                <div className="cobuy-kpi-icon-box" style={{ background: '#f3e8ff', color: '#a855f7' }}>
                  <Search size={18} />
                </div>
                <span className="cobuy-kpi-label">Buying Patterns</span>
              </div>
              <div className="cobuy-kpi-value">
                {rules.length}
              </div>
              <div className="cobuy-kpi-footer">
                <span className="cobuy-kpi-compare">
                  {rules.length === 0 ? 'No strong patterns found' : `${rules.length} patterns discovered`}
                </span>
              </div>
            </div>
          </div>

          {/* ── 4. Middle Section: Transaction Activity & Key Insights ── */}
          <div className="cobuy-dash-middle">
            {/* Left Column: Composed Bar + Line Activity Chart */}
            <div className="cobuy-chart-card">
              <div className="cobuy-chart-header">
                <div>
                  <h3 className="cobuy-chart-title">
                    <TrendingUp size={18} style={{ color: '#6366f1' }} />
                    Transaction Activity
                  </h3>
                  {dateFilterPreset !== 'all' && (
                    <div style={{ fontSize: '0.74rem', color: '#6366f1', fontWeight: '600', marginTop: '0.2rem' }}>
                      Filtered: {filteredTotalTransactions.toLocaleString()} txs across {filteredTrends.length} day{filteredTrends.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                <div className="cobuy-date-filter-wrapper" ref={dateFilterRef}>
                  <button
                    type="button"
                    className={`cobuy-chart-date-pill ${dateFilterPreset !== 'all' ? 'active-filter' : ''}`}
                    onClick={() => setShowDateFilterDropdown(!showDateFilterDropdown)}
                    title="Click to filter date range"
                    id="cobuy-date-filter-btn"
                  >
                    <Calendar size={13} style={{ color: '#6366f1' }} />
                    <span>{chartDateRange}</span>
                    <ChevronDown
                      size={13}
                      style={{
                        color: '#94a3b8',
                        transform: showDateFilterDropdown ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease'
                      }}
                    />
                  </button>

                  {/* Dropdown Popover */}
                  {showDateFilterDropdown && (
                    <div className="cobuy-date-dropdown">
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>
                          <SlidersHorizontal size={14} style={{ color: '#6366f1' }} />
                          <span>Date Range Filter</span>
                        </div>
                        {dateFilterPreset !== 'all' && (
                          <button
                            type="button"
                            onClick={() => {
                              setDateFilterPreset('all');
                              setSelectedMonth('');
                              setChartGranularity('daily');
                              setShowDateFilterDropdown(false);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#6366f1',
                              fontSize: '0.74rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: 0
                            }}
                          >
                            <RotateCcw size={11} /> Reset
                          </button>
                        )}
                      </div>

                      {/* Quick Presets */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>
                          Quick Presets
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {[
                            { id: 'all', label: 'All Time' },
                            { id: '7d', label: 'Last 7 Days' },
                            { id: '14d', label: 'Last 14 Days' },
                            { id: '30d', label: 'Last 30 Days' },
                            { id: '90d', label: 'Last 90 Days' }
                          ].map(preset => {
                            const isSel = dateFilterPreset === preset.id;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => {
                                  setDateFilterPreset(preset.id);
                                  setSelectedMonth('');
                                  setShowDateFilterDropdown(false);
                                }}
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: isSel ? '700' : '500',
                                  background: isSel ? 'rgba(99, 102, 241, 0.12)' : 'var(--inner-box-bg)',
                                  color: isSel ? '#4f46e5' : 'var(--text-main)',
                                  border: isSel ? '1px solid #6366f1' : '1px solid var(--border-color)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Filter By Month (if multiple months exist) */}
                      {availableMonths.length > 1 && (
                        <div style={{ marginBottom: '1rem' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>
                            Filter By Month ({availableMonths.length} Months)
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '0.35rem',
                            maxHeight: '130px',
                            overflowY: 'auto',
                            paddingRight: '2px'
                          }}>
                            {availableMonths.map(m => {
                              const isSel = dateFilterPreset === 'month' && selectedMonth === m.key;
                              return (
                                <button
                                  key={m.key}
                                  type="button"
                                  onClick={() => {
                                    setDateFilterPreset('month');
                                    setSelectedMonth(m.key);
                                    setShowDateFilterDropdown(false);
                                  }}
                                  style={{
                                    padding: '0.35rem 0.4rem',
                                    borderRadius: '6px',
                                    fontSize: '0.72rem',
                                    fontWeight: isSel ? '700' : '500',
                                    background: isSel ? 'rgba(99, 102, 241, 0.12)' : 'var(--inner-box-bg)',
                                    color: isSel ? '#4f46e5' : 'var(--text-main)',
                                    border: isSel ? '1px solid #6366f1' : '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                  title={`${m.label} (${m.count.toLocaleString()} txs)`}
                                >
                                  {m.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Custom Range */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>
                          Custom Date Range
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>From</label>
                            <input
                              type="date"
                              value={customStartDate}
                              min={datasetDateBounds.minDate}
                              max={customEndDate || datasetDateBounds.maxDate}
                              onChange={(e) => setCustomStartDate(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '0.35rem 0.45rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--inner-box-bg)',
                                color: 'var(--text-main)',
                                fontSize: '0.74rem'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>To</label>
                            <input
                              type="date"
                              value={customEndDate}
                              min={customStartDate || datasetDateBounds.minDate}
                              max={datasetDateBounds.maxDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '0.35rem 0.45rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--inner-box-bg)',
                                color: 'var(--text-main)',
                                fontSize: '0.74rem'
                              }}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (customStartDate && customEndDate) {
                              setDateFilterPreset('custom');
                              setSelectedMonth('');
                              setShowDateFilterDropdown(false);
                            }
                          }}
                          className="btn btn-primary"
                          style={{
                            width: '100%',
                            padding: '0.38rem',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}
                        >
                          Apply Custom Range
                        </button>
                      </div>

                      {/* Granularity View */}
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                          Granularity:
                        </div>
                        <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--inner-box-bg)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          {['daily', 'weekly', 'monthly'].map(g => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setChartGranularity(g)}
                              style={{
                                padding: '0.25rem 0.55rem',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: chartGranularity === g ? '700' : '500',
                                background: chartGranularity === g ? '#6366f1' : 'transparent',
                                color: chartGranularity === g ? '#ffffff' : 'var(--text-muted)',
                                border: 'none',
                                cursor: 'pointer',
                                textTransform: 'capitalize'
                              }}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Close / Done Button */}
                      <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setShowDateFilterDropdown(false)}
                          style={{
                            padding: '0.35rem 0.85rem',
                            background: '#6366f1',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ width: '100%', height: 290 }}>
                {chartData.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No chronological transaction dates found in this dataset.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 25, right: 25, left: 65, bottom: 25 }}>
                      <defs>
                        <linearGradient id="cobuyBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818cf8" stopOpacity={0.7} />
                          <stop offset="100%" stopColor="#c7d2fe" stopOpacity={0.35} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.8} />
                      <XAxis
                        dataKey="displayDate"
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                        interval={xAxisInterval}
                        label={{
                          value: chartGranularity === 'monthly' ? 'Month' : chartGranularity === 'weekly' ? 'Week' : 'Transaction Date',
                          position: 'insideBottom',
                          offset: -16,
                          style: { fill: '#0f172a', fontSize: 12, fontWeight: 700 }
                        }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickFormatter={(v) => v.toLocaleString()}
                        label={{
                          value: 'Number of Transactions',
                          angle: -90,
                          position: 'insideLeft',
                          offset: -12,
                          dy: 70,
                          style: { fill: '#0f172a', fontSize: 12, fontWeight: 700, textAnchor: 'middle' }
                        }}
                      />
                      <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} />
                      <Bar
                        dataKey="count"
                        fill="url(#cobuyBarGrad)"
                        radius={[4, 4, 0, 0]}
                        barSize={chartData.length === 1 ? 48 : chartData.length <= 7 ? 36 : chartData.length <= 14 ? 22 : chartData.length <= 25 ? 14 : chartData.length <= 40 ? 8 : undefined}
                      >
                        {chartData.length <= 25 && (
                          <LabelList
                            dataKey="count"
                            position="top"
                            formatter={(val) => val.toLocaleString()}
                            style={{ fill: '#334155', fontSize: '11px', fontWeight: 600 }}
                            dy={-4}
                          />
                        )}
                      </Bar>
                      {chartData.length > 1 && (
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#6366f1"
                          strokeWidth={2.5}
                          dot={chartData.length <= 31 ? { r: 3, fill: '#ffffff', stroke: '#6366f1', strokeWidth: 1.5 } : false}
                          activeDot={{ r: 6, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Right Column: Key Insights */}
            <div className="cobuy-insights-card">
              <div className="cobuy-insights-header">
                <Lightbulb size={18} style={{ color: '#6366f1' }} />
                <h3 className="cobuy-insights-title">Key Insights</h3>
              </div>

              <div className="cobuy-insights-list">
                {/* Insight 1: Highest Selling Product */}
                <div className="cobuy-insight-item">
                  <div className="cobuy-insight-icon-circle" style={{ background: '#ecfdf5', color: '#10b981' }}>
                    <Star size={16} />
                  </div>
                  <div className="cobuy-insight-content">
                    <div className="cobuy-insight-text">
                      {topProduct ? `${topProduct.name} is your best-selling product.` : 'Catalogue volume tracking active.'}
                    </div>
                    <div className="cobuy-insight-subtext">
                      {topProduct
                        ? `${topProduct.name} recorded ${topProduct.value.toLocaleString()} sales, making up approximately ${topProduct.quantity_share || Math.round((topProduct.value / (stats.total_units_sold || 1)) * 100)}% of total units sold.`
                        : 'No single product lead established in transaction records.'}
                    </div>
                  </div>
                </div>

                {/* Insight 2: Sales Concentration */}
                <div className="cobuy-insight-item">
                  <div className="cobuy-insight-icon-circle" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                    <TrendingUp size={16} />
                  </div>
                  <div className="cobuy-insight-content">
                    <div className="cobuy-insight-text">
                      Sales are concentrated around your top products.
                    </div>
                    <div className="cobuy-insight-subtext">
                      {salesConcentration
                        ? `Your five highest-selling products account for a significant portion of total unit sales.`
                        : `Customer volume spans ${stats.unique_items_count} distinct items.`}
                    </div>
                  </div>
                </div>

                {/* Insight 3: Purchasing Patterns Status */}
                <div className="cobuy-insight-item">
                  <div className="cobuy-insight-icon-circle" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                    <Info size={16} />
                  </div>
                  <div className="cobuy-insight-content">
                    <div className="cobuy-insight-text">
                      {rules.length > 0
                        ? 'Strong purchasing patterns detected.'
                        : 'Limited purchasing patterns detected.'}
                    </div>
                    <div className="cobuy-insight-subtext">
                      {rules.length > 0
                        ? `${rules.length} association rules discovered for product placement & bundles.`
                        : 'The current dataset does not contain enough repeated product combinations to identify strong cross-selling patterns.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 5. Bottom Section: Dataset Health ── */}
          <div className="cobuy-health-card">
            <div className="cobuy-health-header">
              <div className="cobuy-health-header-left">
                <ShieldCheck size={20} style={{ color: '#6366f1' }} />
                <div>
                  <h3 className="cobuy-health-title">Dataset Health</h3>
                  <p className="cobuy-health-subtitle">
                    Your data is complete and ready for analysis.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="cobuy-health-view-btn"
                onClick={() => setShowHealthModal(true)}
              >
                <span>View details</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="cobuy-health-body">
              {/* 5 Readiness Indicators */}
              <div className="cobuy-health-indicators">
                <div className="cobuy-health-indicator-card">
                  <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                  <div className="cobuy-health-ind-text">
                    <span className="cobuy-health-ind-num">{stats.total_transactions.toLocaleString()}</span>
                    <span className="cobuy-health-ind-label">Transactions</span>
                  </div>
                </div>

                <div className="cobuy-health-indicator-card">
                  <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                  <div className="cobuy-health-ind-text">
                    <span className="cobuy-health-ind-num">{stats.unique_items_count}</span>
                    <span className="cobuy-health-ind-label">Products</span>
                  </div>
                </div>

                <div className="cobuy-health-indicator-card">
                  <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                  <div className="cobuy-health-ind-text">
                    <span className="cobuy-health-ind-num">
                      {stats.health?.distinct_dates_count || (trends.length > 1 ? trends.length : 1)}
                    </span>
                    <span className="cobuy-health-ind-label">
                      Transaction date{(stats.health?.distinct_dates_count || (trends.length > 1 ? trends.length : 1)) === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                <div className="cobuy-health-indicator-card">
                  <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                  <div className="cobuy-health-ind-text">
                    <span className="cobuy-health-ind-num">{stats.health?.missing_names_count || 0}</span>
                    <span className="cobuy-health-ind-label">Missing product names</span>
                  </div>
                </div>

                <div className="cobuy-health-indicator-card">
                  <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                  <div className="cobuy-health-ind-text">
                    <span className="cobuy-health-ind-num">{stats.health?.duplicates_removed || 0}</span>
                    <span className="cobuy-health-ind-label">Invalid records</span>
                  </div>
                </div>
              </div>

              {/* Status Box */}
              <div className={`cobuy-health-status-box ${stats.health?.status === 'needs_attention' ? 'warning' : ''}`}>
                <CheckCircle2 size={28} style={{ color: '#10b981', flexShrink: 0 }} />
                <div>
                  <div className="cobuy-health-status-text-bold">
                    {stats.health?.status === 'needs_attention' ? 'Needs Attention' : 'Dataset looks good!'}
                  </div>
                  <div className="cobuy-health-status-text-muted">
                    {stats.health?.message || 'Your data is complete and ready for analysis.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Modal: Change Dataset ── */}
      {showDatasetModal && (
        <div className="cobuy-modal-overlay" onClick={() => setShowDatasetModal(false)}>
          <div className="cobuy-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="cobuy-modal-header">
              <h3 className="cobuy-modal-title">Select Active Dataset</h3>
              <button
                type="button"
                className="cobuy-modal-close-btn"
                onClick={() => setShowDatasetModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="cobuy-modal-body">
              {loadingDatasets ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <RefreshCw size={24} className="spin" style={{ color: 'var(--primary-color)', margin: '0 auto 0.5rem' }} />
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading your datasets...</p>
                </div>
              ) : availableDatasets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  No historical datasets found in your account.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {availableDatasets.map((ds) => {
                    const isActive = String(ds.id) === String(activeDatasetId);
                    return (
                      <div
                        key={ds.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.85rem 1rem',
                          borderRadius: '10px',
                          border: isActive ? '1.5px solid #6366f1' : '1px solid var(--border-color)',
                          background: isActive ? 'rgba(99, 102, 241, 0.05)' : 'var(--inner-box-bg)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <FileText size={20} style={{ color: isActive ? '#6366f1' : 'var(--text-muted)' }} />
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                              {ds.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              {(ds.transaction_count || 0).toLocaleString()} transactions • {ds.unique_items || 0} products
                            </div>
                          </div>
                        </div>

                        <div>
                          {isActive ? (
                            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle2 size={14} /> Active
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSelectDataset(ds)}
                              className="btn btn-primary"
                              style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem' }}
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Dataset Health Details ── */}
      {showHealthModal && (
        <div className="cobuy-modal-overlay" onClick={() => setShowHealthModal(false)}>
          <div className="cobuy-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="cobuy-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={20} style={{ color: '#10b981' }} />
                <h3 className="cobuy-modal-title">Dataset Validation & Quality</h3>
              </div>
              <button
                type="button"
                className="cobuy-modal-close-btn"
                onClick={() => setShowHealthModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="cobuy-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Overall Assessment Banner */}
                <div style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  background: stats.health?.status === 'needs_attention' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  border: stats.health?.status === 'needs_attention' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem'
                }}>
                  {stats.health?.status === 'needs_attention' ? (
                    <AlertTriangle size={18} style={{ color: '#d97706', marginTop: '2px' }} />
                  ) : (
                    <CheckCircle2 size={18} style={{ color: '#10b981', marginTop: '2px' }} />
                  )}
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.88rem', color: stats.health?.status === 'needs_attention' ? '#d97706' : '#10b981' }}>
                      Status: {stats.health?.status_label || 'Ready'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {stats.health?.message || 'Your dataset satisfies all validation requirements.'}
                    </div>
                  </div>
                </div>

                {/* Detected Schema Columns */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Detected Columns
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                    {(stats.health?.columns_detected || ['Transaction ID', 'Item Name']).map((col, i) => (
                      <span
                        key={i}
                        style={{
                          padding: '0.3rem 0.65rem',
                          borderRadius: '6px',
                          background: 'var(--inner-box-bg)',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.78rem',
                          fontWeight: '600',
                          color: 'var(--text-main)'
                        }}
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Validation Metrics Table */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Valid Transactions:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{stats.total_transactions.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Unique Products Mapped:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{stats.unique_items_count}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Transaction Date Coverage:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{stats.health?.distinct_dates_count || trends.length || 1} day(s) ({formattedActiveDate})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Missing Product Names:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{stats.health?.missing_names_count || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Duplicate Records Cleaned:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{stats.health?.duplicates_removed || 0}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
