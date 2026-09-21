import React from 'react';
import { X, Download, FileSpreadsheet, CheckCircle2, HelpCircle } from 'lucide-react';

const SampleFileModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const sampleColumns = [
    { name: 'Transaction ID', desc: 'Identifies and groups rows belonging to the same receipt/transaction', example: '1001, 1002' },
    { name: 'Product Name', desc: 'Name or description of the purchased product', example: 'Espresso, Croissant' },
    { name: 'Category', desc: 'Category assigned to the product; used by Analytics for dynamic category filtering.', example: 'Beverages, Bakery' },
    { name: 'Quantity', desc: 'Number of units purchased in that transaction row', example: '1, 2, 3' },
    { name: 'Date', desc: 'Transaction date and time for time-based analysis', example: '2026-09-14 08:15' }
  ];

  const sampleRows = [
    { tx: 'TX-001', item: 'Espresso', cat: 'Beverages', qty: '1', date: '2026-09-14 08:15' },
    { tx: 'TX-001', item: 'Croissant', cat: 'Bakery', qty: '1', date: '2026-09-14 08:15' },
    { tx: 'TX-002', item: 'Latte', cat: 'Beverages', qty: '2', date: '2026-09-14 08:32' },
    { tx: 'TX-002', item: 'Muffin', cat: 'Bakery', qty: '1', date: '2026-09-14 08:32' },
    { tx: 'TX-003', item: 'Espresso', cat: 'Beverages', qty: '1', date: '2026-09-14 09:05' },
    { tx: 'TX-003', item: 'Croissant', cat: 'Bakery', qty: '2', date: '2026-09-14 09:05' },
    { tx: 'TX-004', item: 'Latte', cat: 'Beverages', qty: '1', date: '2026-09-14 09:20' },
    { tx: 'TX-004', item: 'Croissant', cat: 'Bakery', qty: '1', date: '2026-09-14 09:20' }
  ];

  const handleDownloadSample = () => {
    const csvContent = "Transaction ID,Product Name,Category,Quantity,Date\nTX-001,Espresso,Beverages,1,2026-09-14 08:15\nTX-001,Croissant,Bakery,1,2026-09-14 08:15\nTX-002,Latte,Beverages,2,2026-09-14 08:32\nTX-002,Muffin,Bakery,1,2026-09-14 08:32\nTX-003,Espresso,Beverages,1,2026-09-14 09:05\nTX-003,Croissant,Bakery,2,2026-09-14 09:05\nTX-004,Latte,Beverages,1,2026-09-14 09:20\nTX-004,Croissant,Bakery,1,2026-09-14 09:20\nTX-005,Espresso,Beverages,1,2026-09-14 09:45\nTX-005,Muffin,Bakery,1,2026-09-14 09:45\nTX-006,Latte,Beverages,1,2026-09-14 10:10\nTX-006,Croissant,Bakery,1,2026-09-14 10:10\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_transactions_with_categories.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="cobuy-modal-overlay fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cobuy-modal-card" style={{ maxWidth: '720px', width: '100%' }}>
        {/* Header */}
        <div className="cobuy-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              background: 'rgba(79, 70, 229, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6366f1'
            }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="cobuy-modal-title" style={{ margin: 0 }}>Sample Dataset Format</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Required 5-column CSV or Excel structure for dynamic category filtering and association pattern analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Requirements Notice */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '8px',
          padding: '0.65rem 0.85rem',
          marginBottom: '1rem',
          fontSize: '0.76rem',
          color: 'var(--text-muted)',
          lineHeight: '1.45'
        }}>
          <strong style={{ color: '#6366f1' }}>Dynamic Category Requirement:</strong> Category is required for dynamic category filtering. All categories and products are dynamically discovered from your uploaded dataset. The categories shown below are illustrative examples only.
        </div>

        {/* Expected Columns Explanation */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.6rem' }}>
            Expected Column Formats (5 Fields):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
            {sampleColumns.map((col) => (
              <div
                key={col.name}
                style={{
                  background: 'var(--inner-box-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem'
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#6366f1', marginBottom: '0.2rem' }}>
                  {col.name}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                  {col.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sample Table Preview */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Sample Data Preview:
          </div>
          <div style={{
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            overflow: 'hidden',
            background: 'var(--card-bg)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: 'var(--inner-box-bg)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Transaction ID</th>
                  <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Product Name</th>
                  <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Category</th>
                  <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Quantity</th>
                  <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {sampleRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: i < sampleRows.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <td style={{ padding: '0.45rem 0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>{r.tx}</td>
                    <td style={{ padding: '0.45rem 0.75rem', fontWeight: '600', color: '#6366f1' }}>{r.item}</td>
                    <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-main)' }}>
                      <span style={{
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: '#6366f1',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: '600'
                      }}>
                        {r.cat}
                      </span>
                    </td>
                    <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-muted)' }}>{r.qty}</td>
                    <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-dim)', fontSize: '0.72rem' }}>{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1rem'
        }}>
          <button
            type="button"
            onClick={handleDownloadSample}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--inner-box-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Download size={14} style={{ color: '#6366f1' }} />
            Download Sample CSV
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary"
            style={{ padding: '0.55rem 1.4rem', fontSize: '0.82rem', fontWeight: '600' }}
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

export default SampleFileModal;
