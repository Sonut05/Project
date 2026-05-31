import React, { useState, useEffect } from 'react';
import { getDb, dbOps, isDateRangeOverlapping } from '../utils/mockDb';
import { ArrowLeft, Star, Calendar, MessageSquare, MapPin, Info, ShieldAlert } from 'lucide-react';
import L from 'leaflet';

export default function ItemDetail({ itemId, onBack, onViewUser, toast }) {
  const [db, setDb] = useState(getDb());
  
  // Date booking states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setDb(getDb());
    window.addEventListener('rentit_db_update', handleUpdate);
    return () => window.removeEventListener('rentit_db_update', handleUpdate);
  }, []);

  const item = db.items.find(i => i.id === itemId);
  if (!item) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '40px' }}>
        <button onClick={onBack} className="btn btn-outline" style={{ marginBottom: '24px' }}>
          <ArrowLeft size={16} /> Go Back to Browse
        </button>
        <h3>Item not found.</h3>
      </div>
    );
  }

  const lender = db.users[item.lenderId] || { name: 'Lender Neighbor', avatar: '', rating: 5.0, memberSince: '2024' };

  // Calculate rating average
  const ratingAvg = item.reviews.length > 0 
    ? (item.reviews.reduce((sum, rev) => sum + rev.rating, 0) / item.reviews.length).toFixed(1)
    : 'New';

  // Get active booked date ranges for this item to show in calendar/availability list
  const activeBookings = db.requests.filter(
    req => req.itemId === item.id && req.status === 'Accepted'
  );

  // Compute number of days and total cost
  const getDaysCount = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive of start/end day
    return diffDays > 0 ? diffDays : 0;
  };

  const daysCount = getDaysCount();
  const rentalCost = daysCount * item.dailyPrice;
  const deposit = item.depositAmount || 0;
  const grandTotal = rentalCost + deposit;

  // Double booking collision detector
  const isSelectedRangeBooked = () => {
    if (!startDate || !endDate) return false;
    
    // Check past dates
    const today = new Date('2026-05-21'); // Current local time from metadata
    const start = new Date(startDate);
    if (start < today) return true;

    // Check collision with existing active bookings
    for (const booking of activeBookings) {
      if (isDateRangeOverlapping(startDate, endDate, booking.startDate, booking.endDate)) {
        return true;
      }
    }
    return false;
  };

  const hasCollision = isSelectedRangeBooked();
  const isDateInvalid = startDate && endDate && new Date(endDate) < new Date(startDate);

  // Mini Leaflet Map setup for Handoff Location
  useEffect(() => {
    const mapContainer = document.getElementById(`item-mini-map-${item.id}`);
    let map = null;

    if (mapContainer && item) {
      map = L.map(mapContainer, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        touchZoom: false
      }).setView([item.lat, item.lng], 15);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(map);

      // Category color marker
      const pinIcon = L.divIcon({
        className: 'mini-item-pin',
        html: `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="var(--accent-color)" stroke="#FFFFFF" stroke-width="1.5"/>
            <circle cx="12" cy="9" r="3" fill="#FFFFFF"/>
          </svg>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 24]
      });

      L.marker([item.lat, item.lng], { icon: pinIcon }).addTo(map);
    }

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [item]);

  const handleSubmitRequest = (e) => {
    e.preventDefault();
    if (!startDate || !endDate) return alert('Please select rental start and end dates');
    if (isDateInvalid) return alert('End date cannot be earlier than start date');
    if (hasCollision) return alert('Oops! Those dates are already taken. Try different ones.');

    setIsSending(true);

    // Simulate 800ms natural network delay with loader feedback
    setTimeout(() => {
      dbOps.sendBorrowRequest({
        itemId: item.id,
        lenderId: item.lenderId,
        startDate,
        endDate,
        totalDays: daysCount,
        totalAmount: grandTotal,
        message: requestMessage.trim() || 'Hi! I would like to rent your item.'
      });

      setIsSending(false);
      toast('Borrow request sent successfully! Lender notified. 📬');
      onBack();
    }, 800);
  };

  const getConditionColor = (cond) => {
    switch (cond) {
      case 'New': return 'badge-success';
      case 'Good': return 'badge-info';
      case 'Fair': return 'badge-warning';
      default: return 'badge-gray';
    }
  };

  return (
    <div className="main-content">
      
      {/* Back button header */}
      <button onClick={onBack} className="btn btn-outline" style={{ marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Back to Browse
      </button>

      {/* Main split grid */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr', 
          gap: '32px',
          alignItems: 'start'
        }}
        ref={(el) => {
          if (el) {
            el.style.setProperty('grid-template-columns', window.innerWidth >= 1024 ? '1.5fr 1fr' : '1fr');
          }
        }}
      >
        
        {/* LEFT COLUMN: Media gallery & description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Photo gallery */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', height: '360px' }}>
            <img 
              src={item.images[0]} 
              alt={item.name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </div>

          {/* Item details card */}
          <div className="card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span className="badge badge-gray">{item.category}</span>
              <span className={`badge ${getConditionColor(item.condition)}`}>Condition: {item.condition}</span>
            </div>

            <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-display)', fontWeight: '700', marginBottom: '8px' }}>
              {item.name}
            </h1>

            {/* Ratings and metrics */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={18} fill="var(--status-warning)" color="var(--status-warning)" />
                <strong style={{ color: 'var(--text-primary)' }}>{ratingAvg}</strong> ({item.reviews.length} reviews)
              </span>
              <span>•</span>
              <span style={{ color: 'var(--accent-color)', fontWeight: '600' }}>{item.availability}</span>
            </div>

            <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Description</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.7', marginBottom: '28px' }}>
              {item.description}
            </p>

            {/* Mini pickup Map display */}
            <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Pickup Area</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={18} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                <span>Pickup Point: <strong>{item.location || 'Not Specified'}</strong></span>
              </div>
              <div 
                id={`item-mini-map-${item.id}`} 
                style={{ height: '160px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} /> Locations are shown approximately within a 0.5km neighborhood radius for safety. Address is revealed after booking is accepted.
              </span>
            </div>

          </div>

          {/* Past reviews specific to this item */}
          <div className="card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              Item Reviews ({item.reviews.length})
            </h3>
            
            {item.reviews.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                No reviews yet for this specific item.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {item.reviews.map((rev, idx) => (
                  <div key={idx} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '14px' }}>{rev.reviewerName}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{rev.date}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '2px', margin: '4px 0' }}>
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={14} fill={s <= rev.rating ? 'var(--status-warning)' : 'none'} color={s <= rev.rating ? 'var(--status-warning)' : 'var(--border-color)'} />
                      ))}
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      "{rev.comment}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Booking form & Lender Profile card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '40px' }}>
          
          {/* Booking calculation card */}
          <div className="card" style={{ padding: '24px', border: '2px solid var(--accent-color-light)' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', fontFamily: 'var(--font-display)' }}>
              Choose Booking Dates
            </h3>

            {/* Existing Blocked Date schedule display list */}
            {activeBookings.length > 0 && (
              <div 
                style={{ 
                  backgroundColor: 'var(--status-warning-light)', 
                  border: '1px solid #FCD34D', 
                  borderRadius: '12px', 
                  padding: '12px 16px', 
                  marginBottom: '16px',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start'
                }}
              >
                <ShieldAlert size={20} style={{ color: 'var(--status-warning)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--status-warning)', fontSize: '13px' }}>Blocked Dates (Booked out)</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                    {activeBookings.map(b => (
                      <span key={b.id} style={{ fontSize: '12px', color: '#78350F', fontWeight: '500' }}>
                        📅 {new Date(b.startDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'})} to {new Date(b.endDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Date input Form */}
            <form onSubmit={handleSubmitRequest}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="b-start" style={{ fontSize: '13px' }}>START DATE</label>
                  <input 
                    type="date" 
                    id="b-start"
                    className="form-control" 
                    min="2026-05-21" // Block history booking
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="b-end" style={{ fontSize: '13px' }}>END DATE</label>
                  <input 
                    type="date" 
                    id="b-end"
                    className="form-control" 
                    min={startDate || '2026-05-21'}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Handoff Message */}
              <div className="form-group">
                <label className="form-label" htmlFor="b-msg" style={{ fontSize: '13px' }}>MESSAGE TO LENDER</label>
                <textarea 
                  id="b-msg"
                  className="form-control" 
                  rows="2"
                  style={{ fontSize: '14px', resize: 'vertical' }}
                  placeholder="Tell the lender how you will use this, and suggest handoff times..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                />
              </div>

              {/* Dynamic Error Displays */}
              {isDateInvalid && (
                <div style={{ color: 'var(--status-danger)', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
                  Oops! End date cannot be before the start date.
                </div>
              )}

              {hasCollision && (
                <div style={{ color: 'var(--status-danger)', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
                  Oops! Those dates are already taken. Try different ones.
                </div>
              )}

              {/* Ledger Summary */}
              {startDate && endDate && !isDateInvalid && !hasCollision && (
                <div 
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    borderRadius: '12px', 
                    padding: '16px', 
                    border: '1px solid var(--border-color)',
                    marginBottom: '20px',
                    animation: 'slide-in 0.2s'
                  }}
                >
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Cost breakdown
                  </span>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Daily rent (₹{item.dailyPrice} × {daysCount} {daysCount === 1 ? 'day' : 'days'})</span>
                      <strong style={{ color: 'var(--text-primary)' }}>₹{rentalCost}</strong>
                    </div>
                    {deposit > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Refundable Item Deposit</span>
                        <strong style={{ color: 'var(--text-primary)' }}>₹{deposit}</strong>
                      </div>
                    )}
                    <div 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '18px', 
                        fontWeight: '700',
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: '10px',
                        marginTop: '6px',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <span>Grand Total</span>
                      <span style={{ color: 'var(--accent-color)' }}>₹{grandTotal}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ width: '100%', height: '52px' }}
                disabled={isSending || hasCollision || isDateInvalid}
              >
                {isSending ? 'Sending Request...' : 'Send Borrow Request'}
              </button>
            </form>
          </div>

          {/* Lender Bio Card */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '14px', letterSpacing: '0.5px' }}>
              ABOUT THE LENDER
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => onViewUser(lender.id)}
                style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <img src={lender.avatar} alt={lender.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
              <div>
                <button 
                  onClick={() => onViewUser(lender.id)}
                  style={{ background: 'none', border: 'none', padding: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', cursor: 'pointer', display: 'block', textAlign: 'left' }}
                >
                  {lender.name}
                </button>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  ★ {lender.rating?.toFixed(1) || '5.0'} ({lender.reviewCount} Reviews)
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '13px', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>MEMBER SINCE</span>
                <strong>{lender.memberSince}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>TOTAL RENTALS</span>
                <strong>{lender.totalCompletedRentals} completed</strong>
              </div>
            </div>

            <button 
              onClick={() => onViewUser(lender.id)}
              className="btn btn-outline"
              style={{ width: '100%', marginTop: '16px', minHeight: '38px', fontSize: '13px' }}
            >
              View Lender's Full Profile
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
