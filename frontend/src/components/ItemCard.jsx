import React from 'react';
import { Star, MapPin, Eye, Edit2, Trash2 } from 'lucide-react';
import { getDb } from '../utils/mockDb';

export default function ItemCard({ 
  item, 
  onView, 
  onEdit, 
  onRemove, 
  onViewUser,
  isOwner = false 
}) {
  const db = getDb();
  
  // Find lender user
  const lender = db.users[item.lenderId] || { name: 'Lender', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150', rating: 5.0 };
  
  // Find if there is an active rental to get the borrower's info
  let activeBorrower = null;
  if (item.availability === 'Rented Out') {
    const activeReq = db.requests.find(
      req => req.itemId === item.id && (req.status === 'Accepted' || req.status === 'Rented Out')
    );
    if (activeReq) {
      activeBorrower = db.users[activeReq.borrowerId];
    }
  }

  // Calculate rating average
  const ratingAvg = item.reviews.length > 0 
    ? (item.reviews.reduce((sum, rev) => sum + rev.rating, 0) / item.reviews.length).toFixed(1)
    : 'New';

  const getConditionColor = (cond) => {
    switch (cond) {
      case 'New': return '#D1FAE5'; // green-100
      case 'Good': return '#DBEAFE'; // blue-100
      case 'Fair': return '#FEE2E2'; // red-100
      default: return '#E2E8F0';
    }
  };

  const getConditionTextColor = (cond) => {
    switch (cond) {
      case 'New': return '#065F46'; // green-800
      case 'Good': return '#1E40AF'; // blue-800
      case 'Fair': return '#991B1B'; // red-800
      default: return '#475569';
    }
  };

  return (
    <article className="card" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Photo and category badges */}
      <div style={{ position: 'relative', width: '100%', height: '180px', overflow: 'hidden' }}>
        <img 
          src={item.images[0]} 
          alt={item.name} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        
        {/* Availability Badge */}
        <span 
          className={`badge ${item.availability === 'Available' ? 'badge-success' : 'badge-danger'}`}
          style={{ position: 'absolute', top: '12px', left: '12px', boxShadow: 'var(--shadow-sm)' }}
        >
          {item.availability}
        </span>

        {/* Condition Badge */}
        <span 
          style={{ 
            position: 'absolute', 
            top: '12px', 
            right: '12px', 
            backgroundColor: getConditionColor(item.condition),
            color: getConditionTextColor(item.condition),
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: '600',
            borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {item.condition}
        </span>
      </div>

      {/* Card Content body */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {item.category}
        </span>
        <h3 style={{ fontSize: '18px', margin: '6px 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {item.name}
        </h3>
        
        {/* Pickup Location Display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          <MapPin size={14} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {item.location || 'Not Specified'}
          </span>
        </div>

        {/* Rating and Reviews */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          <Star size={16} fill="var(--status-warning)" color="var(--status-warning)" />
          <strong style={{ color: 'var(--text-primary)' }}>{ratingAvg}</strong>
          <span>({item.reviews.length} {item.reviews.length === 1 ? 'review' : 'reviews'})</span>
        </div>

        {/* Price & Deposit detail */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: 'auto' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>DAILY RENT</span>
            <strong style={{ fontSize: '20px', color: 'var(--accent-color)', fontFamily: 'var(--font-display)' }}>
              ₹{item.dailyPrice}
            </strong>
          </div>
          {item.depositAmount && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>REFUNDABLE DEPOSIT</span>
              <strong style={{ fontSize: '16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>
                ₹{item.depositAmount}
              </strong>
            </div>
          )}
        </div>

        {/* Lender and Borrower Row (Identity always visible!) */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-primary)',
            padding: '12px',
            borderRadius: '12px',
            marginTop: '16px',
            border: '1px dashed var(--border-color)'
          }}
        >
          {/* Lender Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              type="button"
              onClick={() => onViewUser(lender.id)}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                overflow: 'hidden',
                cursor: 'pointer'
              }}
            >
              <img src={lender.avatar} alt={lender.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>LENDER</span>
              <button 
                onClick={() => onViewUser(lender.id)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  padding: 0, 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {item.lenderId === 'user-self' ? 'You' : lender.name.split(' ')[0]}
              </button>
            </div>
          </div>

          {/* Rented Status / Borrower Section */}
          {item.availability === 'Rented Out' && activeBorrower ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--border-color)', paddingLeft: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>BORROWER</span>
                <button 
                  onClick={() => onViewUser(activeBorrower.id)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    padding: 0, 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: 'var(--secondary-color)',
                    cursor: 'pointer',
                    textAlign: 'right'
                  }}
                >
                  {activeBorrower.id === 'user-self' ? 'You' : activeBorrower.name.split(' ')[0]}
                </button>
              </div>
              <button 
                type="button"
                onClick={() => onViewUser(activeBorrower.id)}
                style={{
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
              >
                <img src={activeBorrower.avatar} alt={activeBorrower.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--status-success)', fontWeight: '600' }}>
              Available now!
            </div>
          )}
        </div>

        {/* Action Buttons: Max 2 actions per card */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          {isOwner ? (
            <>
              <button 
                onClick={() => onEdit(item)}
                className="btn btn-outline"
                style={{ flex: 1, padding: '8px 12px', minHeight: '38px', fontSize: '13px' }}
              >
                <Edit2 size={14} /> Edit
              </button>
              <button 
                onClick={() => onRemove(item.id)}
                className="btn btn-danger"
                style={{ flex: 1, padding: '8px 12px', minHeight: '38px', fontSize: '13px' }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </>
          ) : (
            <button 
              onClick={() => onView(item.id)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px 16px', minHeight: '40px', fontSize: '14px' }}
            >
              <Eye size={16} /> View & Borrow
            </button>
          )}
        </div>

      </div>
    </article>
  );
}
