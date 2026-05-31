import React from 'react';
import { X, Printer, CheckCircle, ArrowRight } from 'lucide-react';
import { getDb } from '../utils/mockDb';

export default function ReceiptModal({ request, onClose }) {
  const db = getDb();
  
  // Find item
  const item = db.items.find(i => i.id === request.itemId) || {
    name: 'Household Item',
    category: 'General',
    dailyPrice: 200,
    depositAmount: 500,
    images: ['https://images.unsplash.com/photo-1531685250784-7569952593d2?auto=format&fit=crop&q=80&w=150']
  };

  // Find lender and borrower
  const lender = db.users[request.lenderId] || { name: 'Lender User', avatar: '' };
  const borrower = db.users[request.borrowerId] || { name: 'Borrower User', avatar: '' };

  const days = request.totalDays || 1;
  const rentTotal = days * item.dailyPrice;
  const deposit = item.depositAmount || 0;
  const total = rentTotal + deposit;

  // Formatted date generator
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const handlePrint = () => {
    // Add print class to the overlay, trigger print dialog, and clean up!
    const overlay = document.querySelector('.receipt-overlay');
    if (overlay) {
      overlay.classList.add('print-target');
      window.print();
      overlay.classList.remove('print-target');
    }
  };

  return (
    <div className="modal-overlay receipt-overlay" style={{ zIndex: 1100 }}>
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
            <h2 style={{ fontSize: '18px', color: 'white', fontFamily: 'var(--font-display)' }}>
              Transaction Receipt
            </h2>
          </div>
          <button 
            onClick={onClose}
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
            <h3 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', color: 'var(--accent-color)', fontWeight: '700' }}>
              RentIt Receipt
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
              REFERENCE ID: <strong style={{ color: 'var(--text-primary)' }}>{request.id.toUpperCase()}</strong>
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
              src={item.images[0]} 
              alt={item.name} 
              style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
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
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>{lender.city}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>
                BORROWER
              </span>
              <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{borrower.name}</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>{borrower.city}</span>
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
              <strong style={{ fontSize: '13px' }}>{formatDate(request.startDate)}</strong>
            </div>
            <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>TO</span>
              <strong style={{ fontSize: '13px' }}>{formatDate(request.endDate)}</strong>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '12px', marginLeft: '12px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>DURATION</span>
              <strong style={{ fontSize: '14px', color: 'var(--accent-color)' }}>{days} {days === 1 ? 'Day' : 'Days'}</strong>
            </div>
          </div>

          {/* Pricing ledger list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Rental Cost ({days} days × ₹{item.dailyPrice})</span>
              <span style={{ fontWeight: '500' }}>₹{rentTotal}</span>
            </div>
            {deposit > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Refundable Item Deposit</span>
                <span style={{ fontWeight: '500' }}>₹{deposit}</span>
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
              <span>Grand Total</span>
              <span style={{ color: 'var(--accent-color)', fontFamily: 'var(--font-display)' }}>₹{total}</span>
            </div>
          </div>

          {/* Action buttons (hidden in print automatically) */}
          <div className="no-print" style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={onClose}
              className="btn btn-outline"
              style={{ flex: 1 }}
            >
              Close Receipt
            </button>
            <button 
              onClick={handlePrint}
              className="btn btn-primary"
              style={{ flex: 2 }}
            >
              <Printer size={18} /> Download as PDF
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
