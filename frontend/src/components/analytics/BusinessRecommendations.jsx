import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import {
  Sprout,
  TrendingUp,
  Zap,
  Target,
  AlertTriangle,
  Calendar,
  Search,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ChevronDown,
  Database
} from 'lucide-react';
import RecommendationCard from './RecommendationCard';
import RecommendationDetailsDrawer from './RecommendationDetailsDrawer';
import { API_BASE } from '../../config/api';

const CATEGORIES = [
  {
    key: 'GROW',
    title: 'Grow',
    subtitle: 'Bundle Opportunities',
    icon: Sprout
  },
  {
    key: 'SELL_MORE',
    title: 'Sell More',
    subtitle: 'Cross-Selling',
    icon: TrendingUp
  },
  {
    key: 'WATCH',
    title: 'Watch',
    subtitle: 'Emerging Combos',
    icon: Zap
  },
  {
    key: 'OPTIMIZE',
    title: 'Optimize',
    subtitle: 'Product Placement',
    icon: Target
  },
  {
    key: 'REVIEW',
    title: 'Review',
    subtitle: 'Product Attention',
    icon: AlertTriangle
  }
];

const DATE_RANGES = [
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 60 days', value: '60d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'All time', value: 'all' }
];

const SORT_OPTIONS = [
  { label: 'Volume', value: 'volume' },
  { label: 'Lift', value: 'lift' },
  { label: 'Confidence', value: 'confidence' }
];

const BusinessRecommendations = ({
  datasetId
}) => {
  const toolbarRef = useRef(null);
  const dateDropdownRef = useRef(null);
  const sortDropdownRef = useRef(null);
  const pageSizeDropdownRef = useRef(null);

  const [activeCategory, setActiveCategory] = useState('GROW');
  const [dateRange, setDateRange] = useState('30d');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('volume');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(2); // Default 2 matching expected visual

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [dataPayload, setDataPayload] = useState(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);

  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [pageSizeDropdownOpen, setPageSizeDropdownOpen] = useState(false);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target)) {
        setDateDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
        setSortDropdownOpen(false);
      }
      if (pageSizeDropdownRef.current && !pageSizeDropdownRef.current.contains(e.target)) {
        setPageSizeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  // Export complete recommendations & patterns to PDF report
  const handleExportResult = async () => {
    if (!datasetId) return;
    setExporting(true);
    try {
      const res = await axios.get(`${API_BASE}/v2/recommendations`, {
        params: {
          dataset_id: datasetId,
          category: 'ALL',
          date_range: dateRange,
          search: searchQuery || '',
          sort_by: sortBy,
          page: 1,
          page_size: 1000
        }
      });

      const payload = res.data || {};
      const recList = payload.recommendations || [];
      const counts = payload.category_counts || {};
      const period = payload.analysis_period || { start: 'N/A', end: 'N/A' };
      const totalTx = payload.total_transactions || 0;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - (margin * 2);

      const CATEGORY_THEMES = {
        GROW: { bg: [236, 253, 245], text: [4, 120, 87], border: [167, 243, 208], label: 'Grow • Bundle Opportunities' },
        SELL_MORE: { bg: [238, 242, 255], text: [67, 56, 202], border: [199, 210, 254], label: 'Sell More • Cross-Selling' },
        WATCH: { bg: [254, 243, 199], text: [180, 83, 9], border: [253, 230, 138], label: 'Watch • Emerging Combos' },
        OPTIMIZE: { bg: [204, 251, 241], text: [15, 118, 110], border: [153, 246, 228], label: 'Optimize • Product Placement' },
        REVIEW: { bg: [255, 228, 230], text: [190, 18, 60], border: [254, 205, 211], label: 'Review • Attention Required' }
      };

      // Header Banner
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pageWidth, 28, 'F');

      pdf.setFillColor(37, 99, 235);
      pdf.roundedRect(margin, 6, 22, 6, 2, 2, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.text('COBUY', margin + 4, 10.2);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Business Recommendations & Advisory Report', margin + 26, 11);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.2);
      pdf.setTextColor(148, 163, 184);
      pdf.text('Actionable insights discovered from transaction affinities.', margin, 21);

      let y = 35;

      // Executive Audit Summary
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, y, contentWidth, 23, 3, 3, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(71, 85, 105);
      pdf.text('EXECUTIVE AUDIT SUMMARY', margin + 5, y + 5.5);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.2);
      pdf.setTextColor(15, 23, 42);
      pdf.text(`Dataset ID: ${datasetId}`, margin + 5, y + 11.5);
      pdf.text(`Total Transactions: ${totalTx.toLocaleString()}`, margin + 55, y + 11.5);
      pdf.text(`Analysis Window: ${period.start} – ${period.end}`, margin + 115, y + 11.5);

      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin + 5, y + 17.5);
      pdf.text(`Total Insights Found: ${recList.length}`, margin + 55, y + 17.5);
      pdf.text(`Sort Strategy: ${sortBy.toUpperCase()}`, margin + 115, y + 17.5);

      y += 28;

      // Pillars breakdown
      const badgeKeys = ['GROW', 'SELL_MORE', 'WATCH', 'OPTIMIZE', 'REVIEW'];
      const colWidth = (contentWidth - 8) / 5;
      badgeKeys.forEach((key, idx) => {
        const theme = CATEGORY_THEMES[key];
        const count = counts[key] || 0;
        const bx = margin + (idx * (colWidth + 2));
        pdf.setFillColor(...theme.bg);
        pdf.setDrawColor(...theme.border);
        pdf.roundedRect(bx, y, colWidth, 11, 2, 2, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(...theme.text);
        pdf.text(key.replace('_', ' '), bx + 3, y + 4.5);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.text(`${count} insights`, bx + 3, y + 8.8);
      });

      y += 16;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 6;

      // Recommendations list
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Discovered Actionable Recommendations', margin, y);
      y += 5;

      if (recList.length === 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(100, 116, 139);
        pdf.text('No recommendations found for the selected dataset criteria.', margin, y + 4);
      } else {
        recList.forEach((r) => {
          const theme = CATEGORY_THEMES[r.category] || CATEGORY_THEMES.GROW;
          const products = r.products || [];
          const anchorName = products[0]?.name || '';
          const targetName = products.slice(1).map(p => p.name).join(', ') || '';
          const pairingTitle = `${anchorName}${targetName ? ' + ' + targetName : ''}`;
          const suggestedAction = r.suggestedAction || '';
          const rationale = r.details?.rationale || r.summary || '';
          const supporting = r.details?.supportingData || {};

          const cardHeight = 32;
          if (y + cardHeight > pageHeight - 16) {
            pdf.addPage();
            y = 16;
          }

          pdf.setFillColor(255, 255, 255);
          pdf.setDrawColor(...theme.border);
          pdf.roundedRect(margin, y, contentWidth, cardHeight, 2, 2, 'FD');

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.setTextColor(15, 23, 42);
          pdf.text(pairingTitle, margin + 4, y + 6);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.5);
          pdf.setTextColor(71, 85, 105);
          const descLine = `${r.summary || ''} ${suggestedAction || ''}`.trim();
          pdf.text(pdf.splitTextToSize(descLine, contentWidth - 8), margin + 4, y + 12);

          const mTx = `Volume: ${(supporting.transactionCount || 0).toLocaleString()} orders`;
          const mConf = `Likelihood: ${supporting.confidencePct != null ? supporting.confidencePct + '%' : 'N/A'}`;
          const mLift = `Lift: ${supporting.liftRatio != null ? supporting.liftRatio + 'x' : 'N/A'}`;

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(6.8);
          pdf.setTextColor(100, 116, 139);
          pdf.text(`${mTx}   •   ${mConf}   •   ${mLift}`, margin + 4, y + cardHeight - 3);

          y += cardHeight + 4;
        });
      }

      // Footer
      const totalPages = pdf.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.2);
        pdf.setTextColor(148, 163, 184);
        pdf.text('CoBuy Recommendations • Business Advisory Report', margin, pageHeight - 5.5);
        pdf.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 5.5, { align: 'right' });
      }

      const fileName = `CoBuy_Business_Recommendations_${datasetId || 'Report'}.pdf`;
      const dataUri = pdf.output('datauristring');

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = `${API_BASE}/v2/recommendations/download-pdf`;
      form.style.display = 'none';

      const inputPdf = document.createElement('input');
      inputPdf.type = 'hidden';
      inputPdf.name = 'pdf_base64';
      inputPdf.value = dataUri;
      form.appendChild(inputPdf);

      const inputName = document.createElement('input');
      inputName.type = 'hidden';
      inputName.name = 'filename';
      inputName.value = fileName;
      form.appendChild(inputName);

      document.body.appendChild(form);
      form.submit();

      setTimeout(() => {
        try {
          if (form.parentNode) {
            form.parentNode.removeChild(form);
          }
        } catch (e) {
          // ignore
        }
      }, 3000);
    } catch (err) {
      console.error('Failed to export recommendation PDF report:', err);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Fetch recommendations from /api/v2/recommendations
  const fetchRecommendations = useCallback(async () => {
    if (!datasetId) {
      setLoading(false);
      setDataPayload(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await axios.get(`${API_BASE}/v2/recommendations`, {
        params: {
          dataset_id: datasetId,
          category: activeCategory,
          date_range: dateRange,
          search: searchQuery,
          sort_by: sortBy,
          page: currentPage,
          page_size: pageSize
        }
      });
      setDataPayload(res.data);
    } catch (err) {
      console.error('Failed to fetch v2 recommendations:', err);
      setError(err?.response?.data?.error || 'Failed to load business recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [datasetId, activeCategory, dateRange, searchQuery, sortBy, currentPage, pageSize]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleCategoryChange = (catKey) => {
    setActiveCategory(catKey);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (val) => {
    setDateRange(val);
    setDateDropdownOpen(false);
    setCurrentPage(1);
  };

  const handleSortChange = (val) => {
    setSortBy(val);
    setSortDropdownOpen(false);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPageSizeDropdownOpen(false);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    const totalPages = dataPayload?.pagination?.total_pages || 1;
    const safePage = Math.max(1, Math.min(totalPages, newPage));
    setCurrentPage(safePage);
    if (toolbarRef.current) {
      toolbarRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const activeCategoryMeta = useMemo(() => {
    return CATEGORIES.find(c => c.key === activeCategory) || CATEGORIES[0];
  }, [activeCategory]);

  const recommendations = dataPayload?.recommendations || [];
  const pagination = dataPayload?.pagination || { page: 1, total_pages: 1, total_items: 0 };
  const isInsufficientData = Boolean(dataPayload?.is_insufficient_data);
  const emptyReasons = dataPayload?.empty_reasons || {};

  const totalItems = pagination.total_items || 0;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const visiblePages = useMemo(() => {
    const total = pagination.total_pages || 1;
    const maxVisible = 5;
    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    if (end > total) {
      end = total;
      start = Math.max(1, end - maxVisible + 1);
    }
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, pagination.total_pages]);

  const selectedDateLabel = DATE_RANGES.find(d => d.value === dateRange)?.label || 'Last 30 days';
  const selectedSortLabel = SORT_OPTIONS.find(s => s.value === sortBy)?.label || 'Volume';

  return (
    <div className="cobuy-business-recommendations-root">
      {/* ── Phase 1: Section Header & Date Filter (Matches Visual Layout) ── */}
      <div className="cobuy-rec-header">
        <div className="cobuy-rec-header-left">
          <h2 className="cobuy-rec-header-title">Business Recommendations</h2>
          <p className="cobuy-rec-header-subtitle">
            Actionable insights discovered from your transaction patterns.
          </p>
        </div>

        <div className="cobuy-rec-header-right">
          <div className="cobuy-date-range-wrapper" ref={dateDropdownRef}>
            <button
              type="button"
              className="cobuy-date-range-trigger"
              onClick={() => setDateDropdownOpen(prev => !prev)}
              title="Change analysis date scope"
            >
              <Calendar size={14} style={{ color: '#60a5fa' }} />
              <span>{selectedDateLabel}</span>
              <ChevronDown size={14} />
            </button>

            {dateDropdownOpen && (
              <div className="cobuy-date-dropdown-menu">
                {DATE_RANGES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`cobuy-date-dropdown-item ${dateRange === option.value ? 'is-selected' : ''}`}
                    onClick={() => handleDateRangeChange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Phase 1: Category Navigation Tabs (Clean 5-Item Grid) ── */}
      <div className="cobuy-category-tabs-container">
        {CATEGORIES.map((cat) => {
          const IconComp = cat.icon;
          const isActive = activeCategory === cat.key;

          return (
            <button
              key={cat.key}
              type="button"
              className={`cobuy-category-tab-card ${isActive ? 'is-active' : ''}`}
              onClick={() => handleCategoryChange(cat.key)}
              title={`${cat.title} - ${cat.subtitle}`}
            >
              <div className="cobuy-category-tab-icon-wrap">
                <IconComp size={18} />
              </div>
              <div className="cobuy-category-tab-text-wrap">
                <span className="cobuy-category-tab-name">{cat.title}</span>
                <span className="cobuy-category-tab-subtitle">{cat.subtitle}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Phase 2: Action Toolbar (Search on Left, Sort & Export on Right) ── */}
      <div className="cobuy-rec-toolbar" ref={toolbarRef}>
        {/* Search input on far left */}
        <div className="cobuy-rec-search-box">
          <Search size={14} className="cobuy-rec-search-icon" />
          <input
            type="text"
            className="cobuy-rec-search-input"
            placeholder="Search product recommendations..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchQuery && (
            <button
              type="button"
              className="cobuy-rec-search-clear"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Secondary Actions on far right */}
        <div className="cobuy-rec-toolbar-actions">
          {/* Sort By Dropdown */}
          <div className="cobuy-sort-dropdown-wrapper" ref={sortDropdownRef}>
            <button
              type="button"
              className="cobuy-sort-dropdown-trigger"
              onClick={() => setSortDropdownOpen(prev => !prev)}
              title="Sort recommendations"
            >
              <span>Sort: {selectedSortLabel}</span>
              <ChevronDown size={14} />
            </button>

            {sortDropdownOpen && (
              <div className="cobuy-sort-dropdown-menu">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`cobuy-sort-dropdown-item ${sortBy === opt.value ? 'is-selected' : ''}`}
                    onClick={() => handleSortChange(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export Action Button */}
          <button
            type="button"
            className="cobuy-rec-export-btn"
            onClick={handleExportResult}
            disabled={exporting || loading}
            title="Export recommendations to PDF report"
          >
            {exporting ? (
              <RefreshCw size={14} className="cobuy-spin" />
            ) : (
              <Download size={14} />
            )}
            <span>{exporting ? 'Exporting...' : 'Export'}</span>
          </button>
        </div>
      </div>

      {/* ── Phase 3: Content Area (Cards or Resilient Edge States) ── */}
      <div className="cobuy-rec-content-area">
        {loading ? (
          <div className="cobuy-skeleton-cards-container">
            {[1, 2].map((n) => (
              <div key={n} className="cobuy-skeleton-card">
                <div className="cobuy-skeleton-pill" style={{ width: '120px' }} />
                <div className="cobuy-skeleton-line" style={{ width: '40%', height: '22px' }} />
                <div className="cobuy-skeleton-line" style={{ width: '75%', height: '14px' }} />
                <div className="cobuy-skeleton-line" style={{ width: '60%', height: '14px' }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="cobuy-rec-error-state">
            <AlertTriangle size={32} style={{ color: '#ef4444' }} />
            <h4 className="cobuy-rec-error-title">Unable to Load Recommendations</h4>
            <p className="cobuy-rec-error-msg">{error}</p>
            <button
              type="button"
              className="cobuy-rec-retry-btn"
              onClick={fetchRecommendations}
            >
              <RefreshCw size={13} />
              <span>Retry Analysis</span>
            </button>
          </div>
        ) : isInsufficientData ? (
          <div className="cobuy-rec-insufficient-state">
            <div className="cobuy-rec-empty-icon-circle">
              <Database size={28} />
            </div>
            <h4 className="cobuy-rec-insufficient-title">Insufficient Transaction Volume</h4>
            <p className="cobuy-rec-insufficient-desc">
              Not enough purchasing activity yet. CoBuy needs more transaction volume before establishing reliable patterns for this category.
            </p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="cobuy-rec-category-empty-state">
            <div className="cobuy-rec-empty-icon-circle">
              {React.createElement(activeCategoryMeta.icon, { size: 28 })}
            </div>
            <h4 className="cobuy-rec-empty-title">
              No {activeCategoryMeta.title} Recommendations Found
            </h4>
            <p className="cobuy-rec-empty-desc">
              {emptyReasons[activeCategory] ||
                `No statistically significant patterns meet the criteria for ${activeCategoryMeta.title} in the selected date window.`}
            </p>
            {searchQuery && (
              <button
                type="button"
                className="cobuy-clear-search-link"
                onClick={() => setSearchQuery('')}
              >
                Clear product search filter
              </button>
            )}
          </div>
        ) : (
          <div className="cobuy-rec-cards-list">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onViewDetails={(r) => setSelectedRecommendation(r)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Phase 4: Dedicated Full-Width Footer & Pagination ── */}
      {!loading && !error && totalItems > 0 && (
        <div className="cobuy-rec-footer-bar">
          {/* Left: Total item count */}
          <div className="cobuy-rec-footer-count">
            Showing <strong>{startItem}–{endItem}</strong> of <strong>{totalItems}</strong> recommendations
          </div>

          {/* Center: Items-per-page dropdown selector */}
          <div className="cobuy-rec-footer-pagesize">
            <span className="cobuy-rec-pagesize-label">Per page:</span>
            <div className="cobuy-pagesize-dropdown-wrapper" ref={pageSizeDropdownRef}>
              <button
                type="button"
                className="cobuy-pagesize-dropdown-trigger"
                onClick={() => setPageSizeDropdownOpen(prev => !prev)}
                title="Select recommendations per page"
              >
                <span>[ {pageSize} ▾ ]</span>
              </button>

              {pageSizeDropdownOpen && (
                <div className="cobuy-pagesize-dropdown-menu">
                  {[2, 4, 6, 10].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      className={`cobuy-pagesize-dropdown-item ${pageSize === sz ? 'is-selected' : ''}`}
                      onClick={() => handlePageSizeChange(sz)}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Standard pagination controls */}
          <div className="cobuy-rec-footer-pagination">
            <button
              type="button"
              className="cobuy-pagination-arrow"
              disabled={currentPage <= 1 || loading}
              onClick={() => handlePageChange(currentPage - 1)}
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>

            {visiblePages.map((pg) => {
              const isActive = pg === currentPage;
              return (
                <button
                  key={pg}
                  type="button"
                  className={`cobuy-pagination-page-num ${isActive ? 'is-active' : ''}`}
                  onClick={() => handlePageChange(pg)}
                  title={`Page ${pg}`}
                  aria-label={`Page ${pg}`}
                >
                  {pg}
                </button>
              );
            })}

            <button
              type="button"
              className="cobuy-pagination-arrow"
              disabled={currentPage >= (pagination.total_pages || 1) || loading}
              onClick={() => handlePageChange(currentPage + 1)}
              title="Next page"
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Slide-Over Inspection Drawer (Preserved Intact) ── */}
      <RecommendationDetailsDrawer
        recommendation={selectedRecommendation}
        isOpen={Boolean(selectedRecommendation)}
        onClose={() => setSelectedRecommendation(null)}
      />
    </div>
  );
};

export default BusinessRecommendations;
