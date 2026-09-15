import React from 'react';
import { X, Download, FileSpreadsheet, CheckCircle2, HelpCircle } from 'lucide-react';

const SampleFileModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const sampleColumns = [
    { name: 'TransactionID', desc: 'Order or invoice number grouping items in the same basket', example: '1001, 1002' },
    { name: 'Item / Description', desc: 'Name or description of the product purchased', example: 'Latte, Croissant, Whole Milk' },
    { name: 'Quantity (Optional)', desc: 'Number of units purchased in this transaction', example: '1, 2, 3' },
    { name: 'Date / Time (Optional)', desc: 'Timestamp of the transaction for time-based analysis', example: '2026-09-14 09:30' }
  ];

  const sampleRows = [
    { tx: 'TX-001', item: 'Espresso', qty: '1', date: '2026-09-14 08:15' },
    { tx: 'TX-001', item: 'Croissant', qty: '1', date: '2026-09-14 08:15' },
    { tx: 'TX-002', item: 'Latte', qty: '2', date: '2026-09-14 08:32' },
    { tx: 'TX-002', item: 'Muffin', qty: '1', date: '2026-09-14 08:32' },
    { tx: 'TX-003', item: 'Espresso', qty: '1', date: '2026-09-14 09:05' },
    { tx: 'TX-003', item: 'Croissant', qty: '2', date: '2026-09-14 09:05' },
    { tx: 'TX-004', item: 'Latte', qty: '1', date: '2026-09-14 09:20' },
    { tx: 'TX-004', item: 'Croissant', qty: '1', date: '2026-09-14 09:20' }
  ];

  const handleDownloadSample = () => {
    const csvContent = "TransactionID,Item\n1,Espresso\n1,Croissant\n2,Latte\n2,Muffin\n3,Espresso\n3,Croissant\n4,Latte\n4,Croissant\n5,Espresso\n5,Muffin\n6,Latte\n6,Muffin\n7,Espresso\n7,Croissant\n8,Latte\n8,Croissant\n9,Espresso\n9,Muffin\n10,Latte\n10,Croissant\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_transactions.csv');
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
      <div className="cobuy-modal-card" style={{ maxWidth: '680px', width: '100%' }}>
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
                Recommended CSV or Excel structure for optimal shopping pattern analysis
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

        {/* Expected Columns Explanation */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.6rem' }}>
            Expected Column Formats:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
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
                  <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>TransactionID</th>
                  <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Item</th>
                  <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Quantity</th>
                  <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {sampleRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: i < sampleRows.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <td style={{ padding: '0.45rem 0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>{r.tx}</td>
                    <td style={{ padding: '0.45rem 0.75rem', fontWeight: '600', color: '#6366f1' }}>{r.item}</td>
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
