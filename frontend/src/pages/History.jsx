import React, { useState, useEffect } from 'react';
import { getDb, dbOps } from '../utils/mockDb';
import ReceiptModal from '../components/ReceiptModal';
import { Search, Calendar, FileText, ArrowRight, Printer, Star, Heart } from 'lucide-react';

export default function History({ onViewUser, onViewItem, toast }) {
  const [db, setDb] = useState(getDb());
  const activeUserId = db.currentUserId || 'user-self';
  const [activeTab, setActiveTab] = useState('borrowed'); // borrowed or lent

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

  const refreshData = () => {
    setDb(getDb());
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('rentit_db_update', refreshData);
    return () => window.removeEventListener('rentit_db_update', refreshData);
  }, []);

  // Filter lists based on Tab, Search input, and Dates
  const getHistoryList = () => {
    const list = db.requests.filter((req) => {
      // Completed, Cancelled, or Disputed
      const isHistoryStatus = ['Completed', 'Cancelled', 'Disputed'].includes(req.status);
      if (!isHistoryStatus) return false;

      if (activeTab === 'borrowed') {
        return req.borrowerId === activeUserId;
      } else {
        return req.lenderId === activeUserId;
      }
    });

    return list.filter((req) => {
      const item = db.items.find(i => i.id === req.itemId) || { name: '' };
      const lender = db.users[req.lenderId] || { name: '' };
      const borrower = db.users[req.borrowerId] || { name: '' };
      const otherUser = activeTab === 'borrowed' ? lender : borrower;

      // 1. Search Query filter (matches item name or person name)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchItem = item.name.toLowerCase().includes(query);
        const matchPerson = otherUser.name.toLowerCase().includes(query);
        if (!matchItem && !matchPerson) return false;
      }

      // 2. Date Range filter (check overlap or bounds)
      if (startDateFilter) {
        if (new Date(req.startDate) < new Date(startDateFilter)) return false;
      }
      if (endDateFilter) {
        if (new Date(req.endDate) > new Date(endDateFilter)) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.endDate) - new Date(a.endDate)); // Sort by most recent first
  };

  const historyList = getHistoryList();

  // Summary Metrics calculations for Lender Tab
  const getLenderStats = () => {
    const lentList = db.requests.filter(req => req.lenderId === activeUserId && req.status === 'Completed');
    const totalEarnings = lentList.reduce((sum, req) => {
      const item = db.items.find(i => i.id === req.itemId) || { dailyPrice: 0 };
      return sum + (req.totalDays * item.dailyPrice);
    }, 0);

    // Calculate most rented item
    const itemRentals = {};
    lentList.forEach(req => {
      itemRentals[req.itemId] = (itemRentals[req.itemId] || 0) + 1;
    });

    let mostRentedId = '';
    let maxRentals = 0;
    Object.keys(itemRentals).forEach(id => {
      if (itemRentals[id] > maxRentals) {
        maxRentals = itemRentals[id];
        mostRentedId = id;
      }
    });

    const mostRentedItemName = db.items.find(i => i.id === mostRentedId)?.name || 'None listed yet';

    return {
      totalEarnings,
      completedCount: lentList.length,
      mostRentedItem: mostRentedItemName
    };
  };

  const lenderStats = getLenderStats();

  const handleOpenReviewForm = (type, targetId, name, requestId) => {
    setReviewTarget({ type, targetId, name, requestId });
    setReviewRating(5);
    setReviewComment('');
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewTarget) return;

    dbOps.addReview({
      targetType: reviewTarget.type,
      targetId: reviewTarget.targetId,
      authorName: db.users[activeUserId]?.name || 'Rahul Sharma',
      authorAvatar: db.users[activeUserId]?.avatar || '',
      rating: reviewRating,
      comment: reviewComment.trim() || 'Great renting experience!'
    });

    // Mark as reviewed in request object metadata to prevent duplicate submissions
    const localDb = getDb();
    const req = localDb.requests.find(r => r.id === reviewTarget.requestId);
    if (req) {
      if (reviewTarget.type === 'item') {
        req.itemReviewed = true;
      } else {
        req.userReviewed = true;
      }
      dbOps.updateProfile({}); // triggers updates
      localStorage.setItem('rentit_p2p_db_v1', JSON.stringify(localDb));
      window.dispatchEvent(new Event('rentit_db_update'));
    }

    toast(`Review submitted successfully for ${reviewTarget.name}! 🌟`);
    setReviewTarget(null);
    refreshData();
  };

  const handleDownloadHistoryReport = () => {
    window.print(); // Uses standard print formatting stylesheet defined in index.css to create high quality PDFs!
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="main-content history-page">
      
      {/* Printable Report Header */}
      <div style={{ display: 'none' }} className="print-header">
        <h2>RentIt Daily Item Rental Report</h2>
        <p>Rental ledger generated on: {new Date().toLocaleDateString('en-IN')}</p>
        <p>Log Type: {activeTab === 'borrowed' ? 'Items Borrowed (Borrower)' : 'Items Lent (Lender)'}</p>
      </div>

      {/* Page Header Toolbar */}
      <header className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-display)', fontWeight: '700' }}>
            Rental History Logs
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '2px' }}>
            Keep track of invoices, reviews, receipts, and past earnings.
          </p>
        </div>
        
        {/* Export to PDF Button */}
        <button 
          onClick={handleDownloadHistoryReport}
          className="btn btn-outline"
          style={{ height: '48px', gap: '8px' }}
        >
          <Printer size={18} /> Export as PDF Report
        </button>
      </header>

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
            <strong style={{ fontSize: '28px', color: 'var(--accent-color)', fontFamily: 'var(--font-display)' }}>₹{lenderStats.totalEarnings}</strong>
          </div>
          <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '20px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', fontWeight: '700' }}>RENTALS COMPLETED</span>
            <strong style={{ fontSize: '28px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{lenderStats.completedCount} listings</strong>
          </div>
          <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '20px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', fontWeight: '700' }}>MOST RENTED ITEM</span>
            <strong style={{ fontSize: '16px', color: 'var(--text-primary)', display: 'block', marginTop: '6px' }}>{lenderStats.mostRentedItem}</strong>
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
          gridTemplateColumns: '1fr', 
          gap: '16px',
          backgroundColor: 'var(--bg-secondary)'
        }}
        ref={(el) => {
          if (el) {
            el.style.setProperty('grid-template-columns', window.innerWidth >= 768 ? '1.5fr 1fr 1fr' : '1fr');
          }
        }}
      >
        {/* Keyword Search */}
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-control"
            style={{ paddingLeft: '38px', height: '42px' }}
            placeholder="Search by item name or neighbor..."
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
            <h3 style={{ color: 'var(--text-secondary)' }}>No completed rentals matched your parameters</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
              Transact with neighbors nearby to start creating a secure history ledger!
            </p>
          </div>
        ) : (
          historyList.map((req) => {
            const item = db.items.find(i => i.id === req.itemId) || { name: 'Item', images: [''], category: 'General' };
            const lender = db.users[req.lenderId] || { name: 'Lender', avatar: '' };
            const borrower = db.users[req.borrowerId] || { name: 'Borrower', avatar: '' };

            const isBorrowedTab = activeTab === 'borrowed';
            const otherUser = isBorrowedTab ? lender : borrower;
            
            // Item details specific price calculation
            const rentCostOnly = req.totalDays * (item.dailyPrice || req.totalAmount / req.totalDays);

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
                  
                  {/* Photo and general descriptive columns */}
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button
                      type="button"
                      onClick={() => onViewItem(item.id)}
                      style={{ padding: 0, border: 'none', background: 'none', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}
                    >
                      <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                    <div>
                      <span className="badge badge-gray" style={{ fontSize: '11px', marginBottom: '4px' }}>
                        {item.category}
                      </span>
                      <h3 style={{ fontSize: '18px', fontWeight: '700' }}>
                        <button onClick={() => onViewItem(item.id)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}>
                          {item.name}
                        </button>
                      </h3>
                      
                      {/* Identity always visible! Click opens profile */}
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{isBorrowedTab ? 'Lender:' : 'Borrower:'}</span>
                        <button 
                          onClick={() => onViewUser(otherUser.id)} 
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
                          {otherUser.name}
                        </button>
                      </p>
                    </div>
                  </div>

                  {/* Summary date ranges column */}
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

                  {/* Pricing ledger right side */}
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>
                      {isBorrowedTab ? 'TOTAL PAID' : 'EARNED'}
                    </span>
                    <strong style={{ fontSize: '20px', color: 'var(--accent-color)', fontFamily: 'var(--font-display)', display: 'block' }}>
                      ₹{isBorrowedTab ? req.totalAmount : rentCostOnly}
                    </strong>
                    <span style={{ fontSize: '11px', color: 'var(--status-success)', fontWeight: '600' }}>
                      {req.status}
                    </span>
                  </div>

                </div>

                {/* Operations: Max 2 actions per card */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }} className="no-print">
                  
                  {/* View receipt modal button */}
                  <button 
                    onClick={() => setSelectedReceiptRequest(req)}
                    className="btn btn-outline"
                    style={{ padding: '6px 14px', minHeight: '34px', fontSize: '13px' }}
                  >
                    <FileText size={14} /> View Receipt
                  </button>

                  {/* Dynamic user review triggers */}
                  {isBorrowedTab ? (
                    <>
                      {/* Leave Review button if not yet submitted */}
                      {!req.itemReviewed ? (
                        <button 
                          onClick={() => handleOpenReviewForm('item', item.id, item.name, req.id)}
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', minHeight: '34px', fontSize: '13px' }}
                        >
                          <Star size={14} /> Leave a Review
                        </button>
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: '6px' }}>
                          ★ Reviewed
                        </span>
                      )}

                      {/* Rent Again pre-filling borrows */}
                      {item.availability === 'Available' && (
                        <button 
                          onClick={() => onViewItem(item.id)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 14px', minHeight: '34px', fontSize: '13px' }}
                        >
                          Rent Again 🔁
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Lend: View or add review for the borrower */}
                      {!req.userReviewed ? (
                        <button 
                          onClick={() => handleOpenReviewForm('user', borrower.id, borrower.name, req.id)}
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', minHeight: '34px', fontSize: '13px' }}
                        >
                          <Star size={14} /> Rate Borrower
                        </button>
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: '6px' }}>
                          ★ Rated
                        </span>
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
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Share your rating and feedback for <strong style={{ color: 'var(--text-primary)' }}>{reviewTarget.name}</strong> to build neighbor trust!
              </p>

              {/* Star selector buttons */}
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
                        style={{ transition: 'transform 0.1s' }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment area */}
              <div className="form-group">
                <label className="form-label" htmlFor="rev-comment">Review Comment</label>
                <textarea 
                  id="rev-comment"
                  className="form-control"
                  rows="3"
                  style={{ resize: 'vertical' }}
                  placeholder="Share details of your meetup, item quality, cleanliness, and handoff experience..."
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
                >
                  Submit Review
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
