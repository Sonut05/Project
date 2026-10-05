import { useRef } from 'react';
import { X, Printer, CheckCircle, ArrowRight } from 'lucide-react';
import { formatDisplayDate } from '../utils/dateUtils.js';
import { resolveImageUrl, ITEM_PLACEHOLDER } from '../utils/imageUrl.js';

export default function ReceiptModal({ request, onClose }) {
  const overlayRef = useRef(null);
  if (!request) return null;

  const item = request.item || {
    name: 'Rented Item',
    category: 'Item',
    dailyPrice: 0,
    depositAmount: 0,
    images: []
  };

  const lender = request.lender || { name: 'Lender', city: 'Neighborhood' };
  const borrower = request.borrower || { name: 'Borrower', city: 'Neighborhood' };

  const days = request.totalDays || 1;
  const rentalAmount = request.rentalAmount ?? days * (item.dailyPrice || 0);
  const depositAmount = request.depositAmount ?? (item.depositAmount || 0);
  const totalAmount = request.totalAmount ?? (rentalAmount + depositAmount);

  const rawImage = (item.images && item.images.length > 0 && item.images[0]) || null;
  const itemImg = resolveImageUrl(rawImage, ITEM_PLACEHOLDER);

  const handlePrint = () => {
    if (overlayRef.current) {
      overlayRef.current.classList.add('print-target');
      window.print();
      overlayRef.current.classList.remove('print-target');
    }
  };

  return (
    <div
      ref={overlayRef}
      className="modal-overlay receipt-overlay"
      style={{ zIndex: 1100 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-title"
    >
      <div
        className="modal-content"
        style={{
          maxWidth: '500px',
          border: '2px solid var(--accent-color)',
          padding: 0,
          overflow: 'hidden'
        }}
      >
        {/* Header Bar */}
        <div
          className="no-print"
          style={{
            backgroundColor: 'var(--accent-color)',
            color: 'white',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={22} />
            <h2 id="receipt-title" style={{ fontSize: '18px', color: 'white', fontFamily: 'var(--font-display)', margin: 0 }}>
              Transaction Receipt
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close receipt"
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Receipt Body */}
        <div style={{ padding: '32px 24px' }}>
          {/* Printable Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', color: 'var(--accent-color)', fontWeight: '700', margin: 0 }}>
              RentIt Receipt
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
              REFERENCE ID: <strong style={{ color: 'var(--text-primary)' }}>{request.id}</strong>
            </span>
          </div>

          {/* Item details */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              paddingBottom: '20px',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '20px'
            }}
          >
            <img
              src={itemImg}
              alt={item.name}
              style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
              onError={(e) => {
                e.currentTarget.src = ITEM_PLACEHOLDER;
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                {item.category}
              </span>
              <h4 style={{ fontSize: '16px', fontWeight: '600', margin: '2px 0' }}>
                {item.name}
              </h4>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                ₹{item.dailyPrice} per day rent
              </span>
            </div>
          </div>

          {/* Parties involved */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              paddingBottom: '20px',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '20px'
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>
                LENDER
              </span>
              <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{lender.name}</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>{lender.city || 'Neighborhood'}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>
                BORROWER
              </span>
              <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{borrower.name}</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>{borrower.city || 'Neighborhood'}</span>
            </div>
          </div>

          {/* Rental Dates */}
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
              border: '1px solid var(--border-color)'
            }}
          >
            <div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>FROM</span>
              <strong style={{ fontSize: '13px' }}>{formatDisplayDate(request.startDate)}</strong>
            </div>
            <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>TO</span>
              <strong style={{ fontSize: '13px' }}>{formatDisplayDate(request.endDate)}</strong>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '12px', marginLeft: '12px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>DURATION</span>
              <strong style={{ fontSize: '14px', color: 'var(--accent-color)' }}>{days} {days === 1 ? 'Day' : 'Days'}</strong>
            </div>
          </div>

          {/* Pricing ledger */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Rental Cost ({days} days × ₹{item.dailyPrice})</span>
              <span style={{ fontWeight: '500' }}>₹{rentalAmount}</span>
            </div>
            {depositAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Refundable Item Deposit</span>
                <span style={{ fontWeight: '500' }}>₹{depositAmount}</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '18px',
                fontWeight: '700',
                borderTop: '2px solid var(--border-color)',
                paddingTop: '12px',
                marginTop: '8px',
                color: 'var(--text-primary)'
              }}
            >
              <span>Total Amount Due</span>
              <span style={{ color: 'var(--accent-color)', fontFamily: 'var(--font-display)' }}>₹{totalAmount}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="no-print" style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              style={{ flex: 1 }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-primary"
              style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Printer size={18} /> Print / Save as PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
