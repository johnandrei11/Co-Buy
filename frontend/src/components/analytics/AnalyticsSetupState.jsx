import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  Play,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ChevronRight,
  Loader2,
  Sparkles,
  BarChart2,
  ShieldCheck,
  FileText,
  X,
  TrendingUp,
  Eye,
  Layers
} from 'lucide-react';

const AnalyticsSetupState = ({
  file,
  uploadStatus,
  uploadError,
  stats,
  onFileUpload,
  onClearFile,
  isAnalyzing,
  onRunAnalysis,
  onOpenParamsModal,
  onOpenSampleModal
}) => {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // File validity check: file exists, upload is success, and no blocking upload error
  const hasValidDataset = Boolean(
    (file || (stats && stats.active)) &&
    uploadStatus !== 'uploading' &&
    uploadStatus !== 'error' &&
    (!stats || stats.total_transactions > 0 || stats.active || file)
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      const dummyEvent = {
        target: {
          files: [droppedFile],
          value: ''
        }
      };
      onFileUpload(dummyEvent);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const fileName = file?.name || (stats?.active ? 'Active Dataset' : null);
  const fileSize = file?.size ? formatFileSize(file.size) : null;
  const txCount = stats?.total_transactions ? `${stats.total_transactions.toLocaleString()} rows` : null;

  return (
    <div className="cobuy-setup-container fade-in">
      {/* ── 1. Page Header / Hero ────────────────────────────────────────── */}
      <div className="cobuy-setup-hero">
        <div className="cobuy-setup-hero-left">
          <div className="cobuy-setup-hero-icon">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="cobuy-setup-hero-title">
              Get Started with CoBuy Analytics
            </h1>
            <p className="cobuy-setup-hero-subtitle">
              Upload your sales data and run an analysis to discover valuable shopping patterns, top sellers, and useful insights for your business.
            </p>
          </div>
        </div>

        {/* Decorative mini metric card matching Reference B */}
        <div className="cobuy-setup-hero-metric-card" aria-hidden="true">
          <div className="cobuy-setup-metric-icon">
            <BarChart2 size={18} />
          </div>
          <div className="cobuy-setup-metric-bars">
            <span style={{ height: '40%' }}></span>
            <span style={{ height: '65%' }}></span>
            <span style={{ height: '100%' }}></span>
            <span style={{ height: '55%' }}></span>
            <span style={{ height: '80%' }}></span>
          </div>
        </div>
      </div>

      {/* ── 2. Four-Step Guidance Strip ─────────────────────────────────── */}
      <div className="cobuy-steps-strip">
        {/* Step 1: Upload Dataset (Active/Current Step) */}
        <div className={`cobuy-step-card ${hasValidDataset ? 'is-completed' : 'is-active'}`}>
          <div className="cobuy-step-number">1</div>
          <div className="cobuy-step-icon-wrapper">
            <UploadCloud size={18} />
          </div>
          <div className="cobuy-step-content">
            <div className="cobuy-step-title">Upload Dataset</div>
            <div className="cobuy-step-desc">
              Add your sales data (CSV/Excel) or drag &amp; drop.
            </div>
          </div>
        </div>

        <div className="cobuy-step-arrow">
          <ChevronRight size={18} />
        </div>

        {/* Step 2: Set Parameters (Optional) */}
        <div
          className={`cobuy-step-card is-interactive ${hasValidDataset ? 'is-next' : ''}`}
          onClick={onOpenParamsModal}
          title="Click to configure mining thresholds (Optional)"
          role="button"
          tabIndex={0}
        >
          <div className="cobuy-step-number">2</div>
          <div className="cobuy-step-icon-wrapper">
            <Sliders size={18} />
          </div>
          <div className="cobuy-step-content">
            <div className="cobuy-step-title" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>Set Parameters</span>
              <span className="cobuy-step-optional-pill">Optional</span>
            </div>
            <div className="cobuy-step-desc">
              Choose analysis options like thresholds &amp; algorithm.
            </div>
          </div>
        </div>

        <div className="cobuy-step-arrow">
          <ChevronRight size={18} />
        </div>

        {/* Step 3: Automatic Discovery */}
        <div className={`cobuy-step-card ${isAnalyzing ? 'is-active' : ''}`}>
          <div className="cobuy-step-number">3</div>
          <div className="cobuy-step-icon-wrapper">
            <Sparkles size={18} />
          </div>
          <div className="cobuy-step-content">
            <div className="cobuy-step-title">Automatic Discovery</div>
            <div className="cobuy-step-desc">
              Process your data and automatically generate recommendations and insights.
            </div>
          </div>
        </div>

        <div className="cobuy-step-arrow">
          <ChevronRight size={18} />
        </div>

        {/* Step 4: View Results */}
        <div className="cobuy-step-card">
          <div className="cobuy-step-number">4</div>
          <div className="cobuy-step-icon-wrapper">
            <TrendingUp size={18} />
          </div>
          <div className="cobuy-step-content">
            <div className="cobuy-step-title">View Results</div>
            <div className="cobuy-step-desc">
              Explore your results, share, and actionable insights.
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Dataset Upload Area (2-Column Grid) ───────────────────────── */}
      <div className="cobuy-upload-grid">
        {/* Left: Upload Card */}
        <div className="cobuy-card cobuy-upload-main-card">
          <div className="cobuy-card-title-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FileSpreadsheet size={20} style={{ color: 'var(--primary-color)' }} />
              <h2 className="cobuy-card-main-title">Upload Your Dataset</h2>
            </div>
            <p className="cobuy-card-subtitle">
              Upload your sales data in CSV or Excel format, or drag and drop the file here.
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            hidden
            disabled={isAnalyzing || uploadStatus === 'uploading'}
            onChange={onFileUpload}
            accept=".csv, .xlsx, .xls"
          />

          {/* Single Drag & Drop Zone */}
          <div
            className={`cobuy-dropzone ${isDragOver ? 'drag-over' : ''} ${hasValidDataset ? 'has-file' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (!isAnalyzing && uploadStatus !== 'uploading') {
                fileInputRef.current?.click();
              }
            }}
          >
            <div className="cobuy-dropzone-icon-circle">
              <UploadCloud size={28} />
            </div>
            <div className="cobuy-dropzone-prompt">
              Drag &amp; drop your file here
            </div>

            {/* Exactly ONE primary upload button */}
            <button
              type="button"
              className="btn btn-primary cobuy-choose-file-btn"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={isAnalyzing || uploadStatus === 'uploading'}
            >
              Choose File
            </button>

            <div className="cobuy-dropzone-formats">
              Supported formats: CSV, XLSX, XLS • Max file size: 50MB
            </div>
          </div>

          {/* File Validation Status Feedback Bar */}
          <div className="cobuy-file-status-bar">
            {uploadStatus === 'uploading' ? (
              <div className="cobuy-file-status-item is-loading">
                <Loader2 size={16} className="spin" style={{ color: 'var(--primary-color)' }} />
                <span>Uploading and validating file structure...</span>
              </div>
            ) : uploadStatus === 'error' && uploadError ? (
              <div className="cobuy-file-status-item is-error">
                <AlertTriangle size={17} style={{ color: '#ef4444', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', color: '#b91c1c' }}>Upload Failed</div>
                  <div style={{ fontSize: '0.78rem', color: '#dc2626' }}>{uploadError}</div>
                </div>
                <button
                  type="button"
                  className="cobuy-status-retry-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Try Again
                </button>
              </div>
            ) : hasValidDataset && fileName ? (
              <div className="cobuy-file-status-item is-success">
                <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cobuy-status-filename" title={fileName}>
                    {fileName}
                  </div>
                  <div className="cobuy-status-meta">
                    {fileSize && <span>{fileSize}</span>}
                    {fileSize && txCount && <span>•</span>}
                    {txCount && <span>{txCount}</span>}
                  </div>
                </div>
                <div className="cobuy-status-badge is-valid">
                  Valid dataset • Ready to analyze
                </div>
                {onClearFile && (
                  <button
                    type="button"
                    className="cobuy-status-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearFile();
                    }}
                    title="Remove or change file"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ) : (
              <div className="cobuy-file-status-item is-idle">
                <FileText size={16} style={{ color: 'var(--text-dim)' }} />
                <span>No file uploaded yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Before You Upload Card */}
        <div className="cobuy-card cobuy-info-card">
          <h3 className="cobuy-info-card-title">Before you upload</h3>

          <div className="cobuy-info-list">
            <div className="cobuy-info-item">
              <div className="cobuy-info-check">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <div className="cobuy-info-item-title">Use a CSV or Excel file format</div>
                <div className="cobuy-info-item-desc">
                  Ensure your file is in .csv or .xlsx format before uploading.
                </div>
              </div>
            </div>

            <div className="cobuy-info-item">
              <div className="cobuy-info-check">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <div className="cobuy-info-item-title">Keep your data clean</div>
                <div className="cobuy-info-item-desc">
                  The dataset should contain organized rows for transactions and product IDs.
                </div>
              </div>
            </div>

            <div className="cobuy-info-item">
              <div className="cobuy-info-check">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <div className="cobuy-info-item-title">Make sure you have the right columns</div>
                <div className="cobuy-info-item-desc">
                  Common columns: InvoiceNo, StockCode, Description, Quantity, InvoiceDate, UnitPrice, CustomerID etc.
                </div>
              </div>
            </div>
          </div>

          <div className="cobuy-info-card-footer">
            <button
              type="button"
              className="cobuy-sample-file-link"
              onClick={onOpenSampleModal}
            >
              <FileSpreadsheet size={14} />
              <span>View Sample File</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. Bottom Action Bar: "Ready to analyze?" ──────────────────── */}
      <div className="cobuy-bottom-action-bar">
        <div className="cobuy-action-bar-left">
          <div className="cobuy-action-bar-icon">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="cobuy-action-bar-title">Automatic Processing</div>
            <div className="cobuy-action-bar-desc">
              Your dataset is processed automatically to generate shopping recommendations.
            </div>
          </div>
        </div>

        {/* Automatic processing path: No Run Analysis button required */}
        {hasValidDataset && (
          <div className="cobuy-action-bar-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: 'var(--primary-color)', fontSize: '0.85rem', fontWeight: '700' }}>
              <Loader2 size={16} className="spin" />
              <span>Analyzing Shopping Patterns...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsSetupState;
