import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReceiptModal from '../components/ReceiptModal';
import { Search, FileText, ArrowRight, Printer, Star, X } from 'lucide-react';
import { useAuth } from '../context/useAuth.js';
import { requestsApi } from '../api/requests';
import { reviewsApi } from '../api/reviews';
import { formatDisplayDate } from '../utils/dateUtils';
import { resolveImageUrl, ITEM_PLACEHOLDER } from '../utils/imageUrl.js';

export default function History({ onViewUser, onViewItem, toast }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('borrowed'); // 'borrowed' | 'lent'
  const [borrowedRequests, setBorrowedRequests] = useState([]);
  const [lentRequests, setLentRequests] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Selected receipt modal states
  const [selectedReceiptRequest, setSelectedReceiptRequest] = useState(null);

  // Review submission states
  const [reviewTarget, setReviewTarget] = useState(null); // { type: 'item'|'user', targetId, name, requestId }
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);

  const refreshHistory = useCallback(async () => {
    if (!user) return;
    try {
      const [incoming, outgoing] = await Promise.all([
        requestsApi.getIncoming(),
        requestsApi.getOutgoing()
      ]);
      const historyStatuses = ['Completed', 'Cancelled', 'Disputed'];
      setLentRequests(incoming.filter((r) => historyStatuses.includes(r.status)));
      setBorrowedRequests(outgoing.filter((r) => historyStatuses.includes(r.status)));
    } catch (err) {
      setError(err.message || 'Failed to load rental history');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    async function loadData() {
      try {
        const [incoming, outgoing] = await Promise.all([
          requestsApi.getIncoming(),
          requestsApi.getOutgoing()
        ]);
        if (isMounted) {
          const historyStatuses = ['Completed', 'Cancelled', 'Disputed'];
          setLentRequests(incoming.filter((r) => historyStatuses.includes(r.status)));
          setBorrowedRequests(outgoing.filter((r) => historyStatuses.includes(r.status)));
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load rental history');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const rawList = activeTab === 'borrowed' ? borrowedRequests : lentRequests;

  const historyList = rawList
    .filter((req) => {
      const item = req.item || { name: '' };
      const otherUser = activeTab === 'borrowed' ? req.lender : req.borrower;
      const otherUserName = otherUser?.name || '';

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchItem = item.name.toLowerCase().includes(query);
        const matchPerson = otherUserName.toLowerCase().includes(query);
        if (!matchItem && !matchPerson) return false;
      }

      if (startDateFilter) {
        if (req.startDate < startDateFilter) return false;
      }
      if (endDateFilter) {
        if (req.endDate > endDateFilter) return false;
      }

      return true;
    })
    .sort((a, b) => b.endDate.localeCompare(a.endDate));

  // Summary Metrics calculations for Lender Tab
  const completedLent = lentRequests.filter((r) => r.status === 'Completed');
  const totalEarnings = completedLent.reduce((sum, r) => sum + (r.rentalAmount || 0), 0);

  const itemCounts = {};
  completedLent.forEach((req) => {
    const name = req.item?.name || 'Item';
    itemCounts[name] = (itemCounts[name] || 0) + 1;
  });

  let mostRentedItem = 'None yet';
  let maxCount = 0;
  Object.entries(itemCounts).forEach(([name, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostRentedItem = name;
    }
  });

  const handleOpenReviewForm = (type, targetId, name, requestId) => {
    setReviewTarget({ type, targetId, name, requestId });
    setReviewRating(5);
    setReviewComment('');
    setReviewError(null);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewTarget) return;

    setSubmittingReview(true);
    setReviewError(null);

    try {
      await reviewsApi.createReview(reviewTarget.requestId, {
        targetType: reviewTarget.type,
        targetId: reviewTarget.targetId,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined
      });

      if (toast) {
        toast(`Review submitted successfully for ${reviewTarget.name}! 🌟`);
      }
      setReviewTarget(null);
      await refreshHistory();
    } catch (err) {
      setReviewError(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return formatDisplayDate(dateStr);
  };

  const handleView = (itemId) => {
    if (onViewItem) {
      onViewItem(itemId);
    } else {
      navigate(`/items/${itemId}`);
    }
  };

  const handleViewProfile = (userId) => {
    if (onViewUser) {
      onViewUser(userId);
    } else {
      navigate(`/profile/${userId}`);
    }
  };

  if (loading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading rental history...</p>
      </div>
    );
  }

  return (
    <div className="main-content history-page">
      {/* Printable Report Header */}
      <div style={{ display: 'none' }} className="print-header">
        <h2>RentIt Daily Item Rental Report</h2>
        <p>Rental ledger generated on: {new Date().toLocaleDateString()}</p>
        <p>Log Type: {activeTab === 'borrowed' ? 'Items Borrowed (Borrower)' : 'Items Lent (Lender)'}</p>
      </div>

      {/* Page Header Toolbar */}
      <header className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-display)', fontWeight: '700' }}>
            Rental History Logs
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '2px' }}>
            Track receipts, completed rentals, reviews, and past earnings.
          </p>
        </div>
        
        <button 
          onClick={handlePrint}
          className="btn btn-outline"
          style={{ height: '48px', gap: '8px' }}
        >
          <Printer size={18} /> Print / Save as PDF
        </button>
      </header>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-danger)', borderRadius: '8px', color: 'var(--status-danger)', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {/* Segmented Tab switcher */}
      <div 
        className="no-print"
        style={{ 
          display: 'flex', 
          backgroundColor: 'var(--bg-tertiary)', 
          padding: '4px', 
          borderRadius: 'var(--radius-md)', 
          marginBottom: '28px',
          maxWidth: '480px'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('borrowed')}
          style={{
            flex: 1,
            padding: '10px',
            border: 'none',
            borderRadius: '12px',
            backgroundColor: activeTab === 'borrowed' ? 'var(--bg-secondary)' : 'transparent',
            color: activeTab === 'borrowed' ? 'var(--accent-color)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'borrowed' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '14px',
            boxShadow: activeTab === 'borrowed' ? 'var(--shadow-sm)' : 'none'
          }}
        >
          Rentals I've Completed (Borrower)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('lent')}
          style={{
            flex: 1,
            padding: '10px',
            border: 'none',
            borderRadius: '12px',
            backgroundColor: activeTab === 'lent' ? 'var(--bg-secondary)' : 'transparent',
            color: activeTab === 'lent' ? 'var(--accent-color)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'lent' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '14px',
            boxShadow: activeTab === 'lent' ? 'var(--shadow-sm)' : 'none'
          }}
        >
          Items I've Lent (Lender)
        </button>
      </div>

      {/* Top summary metrics banner for LENDER Tab */}
      {activeTab === 'lent' && (
        <section 
          className="card"
          style={{ 
            backgroundColor: 'var(--accent-color-light)', 
            border: '1px solid var(--accent-color-light)',
            padding: '20px 24px', 
            borderRadius: 'var(--radius-md)', 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '20px',
            marginBottom: '28px'
          }}
        >
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', fontWeight: '700' }}>TOTAL PAST EARNINGS</span>
            <strong style={{ fontSize: '28px', color: 'var(--accent-color)', fontFamily: 'var(--font-display)' }}>₹{totalEarnings}</strong>
          </div>
          <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '20px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', fontWeight: '700' }}>RENTALS COMPLETED</span>
            <strong style={{ fontSize: '28px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{completedLent.length} listings</strong>
          </div>
          <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '20px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', fontWeight: '700' }}>MOST RENTED ITEM</span>
            <strong style={{ fontSize: '16px', color: 'var(--text-primary)', display: 'block', marginTop: '6px' }}>{mostRentedItem}</strong>
          </div>
        </section>
      )}

      {/* Search and Filters panel */}
      <section 
        className="card no-print" 
        style={{ 
          padding: '16px 24px', 
          marginBottom: '28px', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px',
          backgroundColor: 'var(--bg-secondary)'
        }}
      >
        {/* Keyword Search */}
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-control"
            style={{ paddingLeft: '38px', height: '42px' }}
            placeholder="Search by item or neighbor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Start range date */}
        <div style={{ position: 'relative' }}>
          <span style={{ fontSize: '10px', position: 'absolute', left: '12px', top: '4px', color: 'var(--text-muted)', fontWeight: '700' }}>STARTING FROM</span>
          <input 
            type="date" 
            className="form-control"
            style={{ height: '42px', paddingTop: '16px', fontSize: '13px' }}
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
          />
        </div>

        {/* End range date */}
        <div style={{ position: 'relative' }}>
          <span style={{ fontSize: '10px', position: 'absolute', left: '12px', top: '4px', color: 'var(--text-muted)', fontWeight: '700' }}>ENDING BY</span>
          <input 
            type="date" 
            className="form-control"
            style={{ height: '42px', paddingTop: '16px', fontSize: '13px' }}
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
          />
        </div>
      </section>

      {/* Main Ledger List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {historyList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📜</div>
            <h3 style={{ color: 'var(--text-secondary)' }}>No completed rentals match your criteria</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
              Rent with neighbors nearby to build a rental history through completed transactions!
            </p>
          </div>
        ) : (
          historyList.map((req) => {
            const item = req.item || { name: 'Item', images: [], category: 'General' };
            const isBorrowedTab = activeTab === 'borrowed';
            const otherUser = isBorrowedTab ? req.lender : req.borrower;
            const otherUserName = otherUser?.name || (isBorrowedTab ? 'Lender' : 'Borrower');
            const otherUserId = otherUser?.id;

            const itemImage = item.images && item.images.length > 0
              ? resolveImageUrl(item.images[0])
              : ITEM_PLACEHOLDER;

            const reviewsList = req.reviews || [];
            const hasReviewedItem = reviewsList.some((r) => r.targetType === 'item' && r.authorId === user?.id);
            const hasReviewedUser = reviewsList.some((r) => r.targetType === 'user' && r.authorId === user?.id);

            return (
              <div 
                key={req.id} 
                className="card" 
                style={{ 
                  padding: '24px', 
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  {/* Photo and descriptive columns */}
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button
                      type="button"
                      onClick={() => handleView(item.id)}
                      style={{ padding: 0, border: 'none', background: 'none', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <img src={itemImage} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                    <div>
                      <span className="badge badge-gray" style={{ fontSize: '11px', marginBottom: '4px' }}>
                        {item.category}
                      </span>
                      <h3 style={{ fontSize: '18px', fontWeight: '700' }}>
                        <button onClick={() => handleView(item.id)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}>
                          {item.name}
                        </button>
                      </h3>
                      
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{isBorrowedTab ? 'Lender:' : 'Borrower:'}</span>
                        {otherUserId ? (
                          <button 
                            onClick={() => handleViewProfile(otherUserId)} 
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              padding: 0, 
                              color: 'var(--accent-color)', 
                              textDecoration: 'underline', 
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            {otherUserName}
                          </button>
                        ) : (
                          <span>{otherUserName}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Summary date ranges */}
                  <div 
                    style={{ 
                      backgroundColor: 'var(--bg-primary)', 
                      padding: '12px 18px', 
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontWeight: '700' }}>FROM</span>
                      <strong style={{ fontSize: '12px' }}>{formatDate(req.startDate)}</strong>
                    </div>
                    <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontWeight: '700' }}>TO</span>
                      <strong style={{ fontSize: '12px' }}>{formatDate(req.endDate)}</strong>
                    </div>
                    <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '12px', marginLeft: '12px' }}>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontWeight: '700' }}>DURATION</span>
                      <strong style={{ fontSize: '13px' }}>{req.totalDays} {req.totalDays === 1 ? 'day' : 'days'}</strong>
                    </div>
                  </div>

                  {/* Pricing ledger */}
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>
                      {isBorrowedTab ? 'TOTAL DUE' : 'EARNINGS'}
                    </span>
                    <strong style={{ fontSize: '20px', color: 'var(--accent-color)', fontFamily: 'var(--font-display)', display: 'block' }}>
                      ₹{isBorrowedTab ? req.totalAmount : req.rentalAmount}
                    </strong>
                    <span style={{ fontSize: '11px', color: req.status === 'Completed' ? 'var(--status-success)' : 'var(--text-muted)', fontWeight: '600' }}>
                      {req.status}
                    </span>
                  </div>
                </div>

                {/* Operations */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }} className="no-print">
                  <button 
                    onClick={() => setSelectedReceiptRequest(req)}
                    className="btn btn-outline"
                    style={{ padding: '6px 14px', minHeight: '34px', fontSize: '13px' }}
                  >
                    <FileText size={14} /> View Receipt
                  </button>

                  {req.status === 'Completed' && (
                    <>
                      {isBorrowedTab ? (
                        <>
                          {!hasReviewedItem ? (
                            <button 
                              onClick={() => handleOpenReviewForm('item', item.id, item.name, req.id)}
                              className="btn btn-primary"
                              style={{ padding: '6px 14px', minHeight: '34px', fontSize: '13px' }}
                            >
                              <Star size={14} /> Review Item
                            </button>
                          ) : (
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: '6px' }}>
                              ★ Item Reviewed
                            </span>
                          )}

                          <button 
                            onClick={() => handleView(item.id)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 14px', minHeight: '34px', fontSize: '13px' }}
                          >
                            Rent Again 🔁
                          </button>
                        </>
                      ) : (
                        <>
                          {!hasReviewedUser ? (
                            <button 
                              onClick={() => handleOpenReviewForm('user', otherUserId, otherUserName, req.id)}
                              className="btn btn-primary"
                              style={{ padding: '6px 14px', minHeight: '34px', fontSize: '13px' }}
                            >
                              <Star size={14} /> Rate Borrower
                            </button>
                          ) : (
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: '6px' }}>
                              ★ Borrower Rated
                            </span>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* LEAVE REVIEW POPUP MODAL */}
      {reviewTarget && (
        <div className="modal-overlay no-print" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={18} fill="var(--status-warning)" color="var(--status-warning)" />
                Rate and Review
              </h3>
              <button onClick={() => setReviewTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} style={{ padding: '24px' }}>
              {reviewError && (
                <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-danger)', borderRadius: '8px', color: 'var(--status-danger)', fontSize: '13px', marginBottom: '16px' }}>
                  {reviewError}
                </div>
              )}

              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Share your rating and feedback for <strong style={{ color: 'var(--text-primary)' }}>{reviewTarget.name}</strong> to build community trust!
              </p>

              {/* Star selector */}
              <div className="form-group">
                <label className="form-label">Rating Stars</label>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', padding: '10px 0' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        width: '40px',
                        height: '40px',
                        minWidth: 'auto',
                        minHeight: 'auto'
                      }}
                    >
                      <Star 
                        size={36} 
                        fill={star <= reviewRating ? 'var(--status-warning)' : 'none'} 
                        color={star <= reviewRating ? 'var(--status-warning)' : 'var(--border-color)'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="form-group">
                <label className="form-label" htmlFor="rev-comment">Review Comment</label>
                <textarea 
                  id="rev-comment"
                  className="form-control"
                  rows="3"
                  style={{ resize: 'vertical' }}
                  placeholder="Share details of your meetup, item condition, punctuality, and overall experience..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <button 
                  type="button" 
                  onClick={() => setReviewTarget(null)}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  disabled={submittingReview}
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENTAL RECEIPT INVOICE MODAL */}
      {selectedReceiptRequest && (
        <ReceiptModal 
          request={selectedReceiptRequest} 
          onClose={() => setSelectedReceiptRequest(null)}
        />
      )}
    </div>
  );
}
