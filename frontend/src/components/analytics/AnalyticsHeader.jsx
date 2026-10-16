import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  RotateCcw,
  UploadCloud,
  CheckCircle2,
  Sliders,
  Loader2,
  FolderOpen,
  Cpu,
  ChevronRight
} from 'lucide-react';

const AnalyticsHeader = ({
  datasetId,
  activeDatasetName,
  file,
  stats,
  miningStatus,
  uploadStatus,
  onFileUpload,
  onClearSession,
  onRunMining,
  onOpenParamsModal
}) => {
  const fileInputRef = useRef(null);

  const displayDatasetName = activeDatasetName || (file ? file.name : (datasetId ? `Dataset #${datasetId}` : null));
  const isMining = miningStatus === 'mining';
  const isUploading = uploadStatus === 'uploading';
  const isReadyToMine = stats.total_transactions > 0 || !!file || !!datasetId;
  const hasData = stats.total_transactions > 0;

  return (
    <div className="cobuy-dark-banner">
      {/* ── Left: Title ───────────────────────────────────────────── */}
      <div className="cobuy-banner-left">
        <div className="cobuy-banner-icon">
          <ShoppingCart size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 className="cobuy-banner-title">
              Shopping Pattern Finder
            </h1>
            {hasData && (
              <span className="cobuy-banner-live-badge">
                Live
              </span>
            )}
          </div>
          <p className="cobuy-banner-subtitle">
            Configure parameters, view product frequencies, and generate buying patterns.
          </p>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        hidden
        disabled={isMining || isUploading}
        onChange={onFileUpload}
        accept=".csv, .xlsx, .xls"
      />

      {/* ── Right: Controls ──────────────────────────────────────── */}
      <div className="cobuy-banner-right">

        {/* Clear Session Button */}
        <button
          className="cobuy-clear-session-btn"
          onClick={onClearSession}
          title="Reset current session and dataset"
        >
          <RotateCcw size={13} />
          Clear Session
        </button>

        {/* ── Card 1: Active Dataset ────────────────────────────── */}
        <div className="cobuy-header-pill-card">
          <div className="cobuy-header-pill-icon cobuy-header-pill-icon--purple">
            <FolderOpen size={14} />
          </div>
          <div className="pill-content" style={{ minWidth: 0 }}>
            <span className="cobuy-header-pill-label">Active Dataset</span>
            <div className="cobuy-header-pill-value">
              <span className={`cobuy-header-pill-val-text ${!displayDatasetName ? 'is-none' : ''}`}>
                {displayDatasetName ? (datasetId ? `#${datasetId}` : displayDatasetName) : 'None'}
              </span>
              <Link
                to="/history"
                className="cobuy-header-pill-badge"
                title="Switch dataset in History"
              >
                Change <ChevronRight size={11} />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Card 2: CSV Upload ────────────────────────────────── */}
        <div
          className="cobuy-header-pill-card cobuy-header-pill-card--clickable"
          onClick={() => fileInputRef.current?.click()}
          title="Click to upload or switch CSV transaction dataset"
        >
          <div className={`cobuy-header-pill-icon ${isUploading ? 'cobuy-header-pill-icon--purple' : displayDatasetName ? 'cobuy-header-pill-icon--green' : 'cobuy-header-pill-icon--neutral'}`}>
            {isUploading ? (
              <Loader2 size={14} className="spin" />
            ) : displayDatasetName ? (
              <CheckCircle2 size={14} />
            ) : (
              <UploadCloud size={14} />
            )}
          </div>
          <div className="pill-content">
            <span className="cobuy-header-pill-label">Upload Dataset</span>
            <div className="cobuy-header-pill-value">
              {isUploading ? (
                <span className="cobuy-pill-status-uploading">Uploading...</span>
              ) : displayDatasetName ? (
                <span className="cobuy-pill-status-loaded">
                  {datasetId ? `Dataset #${datasetId}` : 'File Loaded'}
                </span>
              ) : (
                <span className="cobuy-pill-status-empty">Choose file...</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Card 3: Mine / Parameters ─────────────────────────── */}
        <div
          className="cobuy-header-pill-card cobuy-header-pill-card--clickable cobuy-header-pill-card--accent"
          onClick={() => { if (!isMining) { if (onOpenParamsModal) onOpenParamsModal(); else onRunMining(); } }}
          title="Click to configure parameters or run algorithm"
        >
          <div className={`cobuy-header-pill-icon ${isMining ? 'cobuy-header-pill-icon--purple' : isReadyToMine ? 'cobuy-header-pill-icon--green' : 'cobuy-header-pill-icon--neutral'}`}>
            {isMining ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <Cpu size={14} />
            )}
          </div>
          <div className="pill-content" style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
              <span className="cobuy-header-pill-label">
                {isMining ? 'Mining...' : isReadyToMine ? 'Ready to Mine' : 'No Data'}
              </span>
              <button
                type="button"
                className="cobuy-pill-settings-btn"
                onClick={(e) => { e.stopPropagation(); onOpenParamsModal(); }}
                title="Configure thresholds"
              >
                <Sliders size={11} />
              </button>
            </div>
            <div className="cobuy-header-pill-value">
              <span className="cobuy-header-pill-subtext">
                {hasData
                  ? `${stats.total_transactions.toLocaleString()} transactions`
                  : isReadyToMine ? 'Click to mine' : '(Upload dataset)'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsHeader;
