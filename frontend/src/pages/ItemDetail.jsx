import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, ShieldAlert, AlertCircle, CheckCircle2 } from 'lucide-react';
import L from 'leaflet';
import { useAuth } from '../context/useAuth.js';
import { itemsApi } from '../api/items';
import { requestsApi } from '../api/requests';
import { getTodayString, isDateRangeOverlapping, parseStrictDateOnly, formatDisplayDate } from '../utils/dateUtils';
import { resolveImageUrl, resolveAvatarUrl, ITEM_PLACEHOLDER, AVATAR_PLACEHOLDER } from '../utils/imageUrl.js';

export default function ItemDetail({ itemId: propItemId, onBack, onViewUser, toast }) {
  const { id: paramItemId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const itemId = propItemId || paramItemId;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(Boolean(itemId));
  const [fetchError, setFetchError] = useState(!itemId ? 'Item ID not specified' : null);

  // Date booking states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const todayStr = getTodayString();

  // Load item details
  useEffect(() => {
    if (!itemId) return;
    let isMounted = true;

    itemsApi.getItemById(itemId)
      .then((data) => {
        if (isMounted) {
          setItem(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setFetchError(err.message || 'Failed to load item details');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [itemId]);

  const hasCoords = typeof item?.latitude === 'number' && typeof item?.longitude === 'number' && !isNaN(item.latitude) && !isNaN(item.longitude);

  // Leaflet Mini Map setup (ONLY if item has valid coordinates - NO fake Bangalore defaults)
  useEffect(() => {
    if (!item || !hasCoords || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const lat = item.latitude;
    const lng = item.longitude;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      touchZoom: false
    }).setView([lat, lng], 15);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    const pinIcon = L.divIcon({
      className: 'mini-item-pin',
      html: `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#0D9488" stroke="#FFFFFF" stroke-width="1.5"/>
          <circle cx="12" cy="9" r="3" fill="#FFFFFF"/>
        </svg>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 24]
    });

    L.marker([lat, lng], { icon: pinIcon }).addTo(map);
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [item, hasCoords]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/browse');
    }
  };

  const handleViewLender = (lenderId) => {
    if (onViewUser) {
      onViewUser(lenderId);
    } else {
      navigate(`/profile/${lenderId}`);
    }
  };

  if (loading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading item details...</p>
      </div>
    );
  }

  if (fetchError || !item) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <button onClick={handleBack} className="btn btn-outline" style={{ marginBottom: '24px' }}>
          <ArrowLeft size={16} /> Back to Browse
        </button>
        <div style={{ maxWidth: '400px', margin: '0 auto', padding: '24px', backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <AlertCircle size={40} style={{ color: 'var(--status-danger)', marginBottom: '12px' }} />
          <h3>Item Not Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>{fetchError || 'The requested listing could not be found or has been archived.'}</p>
        </div>
      </div>
    );
  }

  const lender = item.lender || { name: 'Neighbor', id: item.lenderId };
  const reviews = item.reviews || [];
  const ratingAvg = reviews.length > 0 
    ? (reviews.reduce((sum, rev) => sum + rev.rating, 0) / reviews.length).toFixed(1)
    : 'New';

  const isOwnItem = user && user.id === item.lenderId;

  // Active accepted bookings from standardized bookedRanges contract
  const activeBookings = item.bookedRanges || [];

  // Compute number of days and total cost safely using timezone-safe parseStrictDateOnly
  const getDaysCount = () => {
    if (!startDate || !endDate) return 0;
    const start = parseStrictDateOnly(startDate);
    const end = parseStrictDateOnly(endDate);
    if (!start || !end) return 0;
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  };

  const daysCount = getDaysCount();
  const rentalCost = daysCount * (item.dailyPrice || 0);
  const deposit = item.depositAmount || 0;
  const grandTotal = rentalCost + deposit;

  // Date collision check
  const hasCollision = () => {
    if (!startDate || !endDate) return false;
    for (const booking of activeBookings) {
      if (isDateRangeOverlapping(startDate, endDate, booking.startDate, booking.endDate)) {
        return true;
      }
    }
    return false;
  };

  const isDateInvalid = Boolean(
    (startDate && !parseStrictDateOnly(startDate)) ||
    (endDate && !parseStrictDateOnly(endDate)) ||
    (startDate && startDate < todayStr) ||
    (startDate && endDate && endDate < startDate)
  );
  const collisionDetected = hasCollision();

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!user) {
      setFormError('Please log in or register to submit a rental request.');
      return;
    }

    if (isOwnItem) {
      setFormError('You cannot borrow your own item.');
      return;
    }

    if (!startDate || !endDate) {
      setFormError('Please select both start and end rental dates.');
      return;
    }

    if (!parseStrictDateOnly(startDate) || !parseStrictDateOnly(endDate)) {
      setFormError('Please select valid calendar dates in YYYY-MM-DD format.');
      return;
    }

    if (startDate < todayStr) {
      setFormError('Start date cannot be in the past.');
      return;
    }

    if (endDate < startDate) {
      setFormError('End date cannot be earlier than start date.');
      return;
    }

    if (collisionDetected) {
      setFormError('Selected dates overlap with an existing accepted booking.');
      return;
    }

    setIsSending(true);

    try {
      await requestsApi.createRequest({
        itemId: item.id,
        startDate,
        endDate,
        message: requestMessage.trim() || 'Hi! I would like to borrow your item.'
      });

      setIsSending(false);
      setSuccessMessage('Borrow request submitted successfully! The lender has been notified.');
      if (toast) {
        toast('Borrow request sent successfully! Lender notified. 📬');
      }

      // Clear stale local form state
      setStartDate('');
      setEndDate('');
      setRequestMessage('');

      // Re-fetch item to update availability and requests list
      itemsApi.getItemById(itemId).then((updated) => setItem(updated)).catch(() => {});
    } catch (err) {
      setIsSending(false);
      setFormError(err.message || 'Failed to submit borrow request.');
    }
  };

  const getConditionColor = (cond) => {
    switch (cond) {
      case 'New': return 'badge-success';
      case 'Good': return 'badge-info';
      case 'Fair': return 'badge-warning';
      default: return 'badge-gray';
    }
  };

  const rawImage = item.images && item.images.length > 0 ? item.images[0] : null;
  const displayImage = rawImage
    ? resolveImageUrl(rawImage)
    : ITEM_PLACEHOLDER;

  return (
    <div className="main-content">
      {/* Back button */}
      <button onClick={handleBack} className="btn btn-outline" style={{ marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Back to Browse
      </button>

      {/* Main split grid */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '32px',
          alignItems: 'start'
        }}
      >
        {/* LEFT COLUMN: Media gallery & description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Photo banner */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', height: '360px', backgroundColor: '#0f172a' }}>
            <img 
              src={displayImage} 
              alt={item.name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              onError={(e) => {
                e.target.src = ITEM_PLACEHOLDER;
              }}
            />
          </div>

          {/* Item details card */}
          <div className="card" style={{ padding: '32px' }}>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontFamily: 'var(--font-display)', fontWeight: '700', marginBottom: '8px' }}>
              {item.name}
            </h1>

            {/* Category & Condition tags placed after Title */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
              <span className="badge badge-gray">{item.category}</span>
              <span className={`badge ${getConditionColor(item.condition)}`}>Condition: {item.condition}</span>
            </div>

            {/* Ratings and availability */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={18} fill="var(--status-warning)" color="var(--status-warning)" />
                <strong style={{ color: 'var(--text-primary)' }}>{ratingAvg}</strong> ({reviews.length} reviews)
              </span>
              <span>•</span>
              <span style={{ color: item.availability === 'Available' ? 'var(--status-success)' : 'var(--status-warning)', fontWeight: '600' }}>
                {item.availability || 'Available'}
              </span>
            </div>

            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: '10px' }}>Description</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)', lineHeight: '1.7', marginBottom: '28px' }}>
              {item.description}
            </p>

            {/* Mini pickup Map display */}
            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: '10px' }}>Pickup Area</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={18} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                <span>Pickup Point: <strong>{item.locationLabel || 'Location provided upon booking'}</strong></span>
              </div>
              {hasCoords ? (
                <>
                  <div 
                    ref={mapContainerRef} 
                    style={{ height: '180px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}
                  />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} /> Approximate neighborhood radius shown for privacy. Exact handoff details are shared once the booking is accepted.
                  </span>
                </>
              ) : (
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                  Approximate neighborhood: <strong>{item.locationLabel || 'Neighborhood area'}</strong>. Map coordinates were not specified for this listing.
                </div>
              )}
            </div>
          </div>

          {/* Past reviews */}
          <div className="card" style={{ padding: reviews.length === 0 ? '20px 24px' : '32px' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: reviews.length === 0 ? '8px' : '16px', borderBottom: reviews.length === 0 ? 'none' : '1px solid var(--border-color)', paddingBottom: reviews.length === 0 ? 0 : '10px' }}>
              Item Reviews ({reviews.length})
            </h2>
            
            {reviews.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
                No reviews yet for this listing. Borrowers can leave a review after completing their rental.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {reviews.map((rev) => (
                  <div key={rev.id} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 'var(--text-sm)' }}>{rev.author?.name || 'Borrower'}</strong>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '2px', margin: '4px 0' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star 
                          key={s} 
                          size={14} 
                          fill={s <= rev.rating ? 'var(--status-warning)' : 'none'} 
                          color={s <= rev.rating ? 'var(--status-warning)' : 'var(--border-color)'} 
                        />
                      ))}
                    </div>
                    {rev.comment && (
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        "{rev.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Booking form & Lender Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Booking card */}
          <div className="card" style={{ padding: '24px', border: '2px solid var(--accent-color-light)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: '16px', fontFamily: 'var(--font-display)' }}>
              Choose Booking Dates
            </h2>

            {/* Blocked dates */}
            {activeBookings.length > 0 && (
              <div 
                style={{ 
                  backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                  border: '1px solid rgba(245, 158, 11, 0.3)', 
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
                  <strong style={{ color: 'var(--status-warning)', fontSize: '13px' }}>Currently Booked Dates</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                    {activeBookings.map((b, idx) => (
                      <span key={`${b.startDate}_${b.endDate}_${idx}`} style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        📅 {formatDisplayDate(b.startDate)} to {formatDisplayDate(b.endDate)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isOwnItem ? (
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <p style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>This is your listing</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>You cannot borrow your own item. Manage this item from your listings page.</p>
                <Link to="/my-items" className="btn btn-outline" style={{ display: 'inline-flex' }}>
                  Manage My Items
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest}>
                {collisionDetected && (
                  <div 
                    data-testid="date-collision-warning"
                    style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-danger)', borderRadius: '8px', color: 'var(--status-danger)', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <AlertCircle size={16} />
                    <span>Selected dates are unavailable (already booked).</span>
                  </div>
                )}

                {formError && (
                  <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-danger)', borderRadius: '8px', color: 'var(--status-danger)', fontSize: '13px', marginBottom: '16px' }}>
                    {formError}
                  </div>
                )}

                {successMessage && (
                  <div style={{ padding: '10px 14px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--status-success)', borderRadius: '8px', color: 'var(--status-success)', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} />
                    {successMessage}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="b-start" style={{ fontSize: 'var(--text-sm)' }}>Start date</label>
                    <input 
                      type="date" 
                      id="b-start"
                      className="form-control" 
                      min={todayStr}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="b-end" style={{ fontSize: 'var(--text-sm)' }}>End date</label>
                    <input 
                      type="date" 
                      id="b-end"
                      className="form-control" 
                      min={startDate || todayStr}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="b-msg" style={{ fontSize: 'var(--text-sm)' }}>Message to lender</label>
                  <textarea 
                    id="b-msg"
                    className="form-control" 
                    rows="2"
                    style={{ fontSize: 'var(--text-sm)', resize: 'vertical' }}
                    placeholder="Tell the lender how you plan to use this, and propose convenient handoff times..."
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                  />
                </div>

                {/* Ledger Summary */}
                {startDate && endDate && !isDateInvalid && !collisionDetected && (
                  <div 
                    style={{ 
                      backgroundColor: 'var(--bg-primary)', 
                      borderRadius: '12px', 
                      padding: '16px', 
                      border: '1px solid var(--border-color)',
                      marginBottom: '20px'
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', fontWeight: '700', marginBottom: '8px' }}>
                      Cost breakdown
                    </span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: 'var(--text-sm)' }}>
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
                          fontSize: 'var(--text-lg)', 
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

                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={isSending || collisionDetected || isDateInvalid || !startDate || !endDate}
                >
                  {isSending ? 'Sending Request...' : collisionDetected ? 'Dates Unavailable' : 'Send Borrow Request'}
                </button>
              </form>
            )}
          </div>

          {/* Lender Bio Card */}
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '16px', letterSpacing: '0.5px' }}>
              About the lender
            </h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div
                onClick={() => handleViewLender(lender.id)}
                style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', backgroundColor: 'var(--accent-color-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--accent-color)' }}
              >
                {lender.avatarUrl ? (
                  <img
                    src={resolveAvatarUrl(lender.avatarUrl, AVATAR_PLACEHOLDER)}
                    alt={lender.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.src = AVATAR_PLACEHOLDER;
                    }}
                  />
                ) : (
                  (lender.name || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <button 
                  type="button"
                  onClick={() => handleViewLender(lender.id)}
                  style={{ background: 'none', border: 'none', padding: 0, fontSize: 'var(--text-base)', fontWeight: '700', color: 'var(--text-primary)', cursor: 'pointer', display: 'block', textAlign: 'left' }}
                >
                  {lender.name}
                </button>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  ★ {typeof lender.rating === 'number' ? lender.rating.toFixed(1) : (lender.rating || 'New')}
                  {lender.city ? ` • ${lender.city}` : ''}
                </span>
              </div>
            </div>

            {/* Aligned metadata grid with consistent spacing */}
            <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', padding: '14px 16px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 'var(--text-xs)', marginBottom: '2px' }}>Member since</span>
                <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{lender.createdAt ? new Date(lender.createdAt).getFullYear() : '2024'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 'var(--text-xs)', marginBottom: '2px' }}>City</span>
                <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{lender.city || 'Nearby'}</strong>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => handleViewLender(lender.id)}
              className="btn btn-outline"
              style={{ width: '100%' }}
            >
              View Lender's Profile
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
