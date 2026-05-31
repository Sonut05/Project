import React, { useState, useEffect } from 'react';
import { getDb, dbOps } from '../utils/mockDb';
import { Check, X, Inbox, ArrowRight, User } from 'lucide-react';

export default function Requests({ onViewUser, onViewItem, toast }) {
  const [db, setDb] = useState(getDb());
  const [activeTab, setActiveTab] = useState('incoming'); // incoming or outgoing

  const refreshData = () => {
    setDb(getDb());
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('rentit_db_update', refreshData);
    return () => window.removeEventListener('rentit_db_update', refreshData);
  }, []);

  const activeUserId = db.currentUserId || 'user-self';

  // Filter requests
  const incomingRequests = db.requests.filter(
    (req) => req.lenderId === activeUserId && req.status !== 'Completed'
  );
  const outgoingRequests = db.requests.filter(
    (req) => req.borrowerId === activeUserId && req.status !== 'Completed'
  );

  const handleAccept = (requestId) => {
    const req = db.requests.find(r => r.id === requestId);
    const item = db.items.find(i => i.id === req.itemId);
    
    if (confirm(`Do you want to accept this borrow request for "${item?.name}"? This will block the dates and change the item status.`)) {
      dbOps.acceptRequest(requestId);
      toast('Request accepted successfully! Meetup coordinated. 🤝');
      refreshData();
    }
  };

  const handleReject = (requestId) => {
    if (confirm('Are you sure you want to reject this request?')) {
      dbOps.rejectRequest(requestId);
      toast('Borrow request rejected.');
      refreshData();
    }
  };

  const handleCancel = (requestId) => {
    if (confirm('Are you sure you want to cancel your borrow request?')) {
      dbOps.cancelRequest(requestId);
      toast('Your request was successfully cancelled.');
      refreshData();
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending': return 'badge-warning';
      case 'Accepted': return 'badge-success';
      case 'Rejected': return 'badge-danger';
      default: return 'badge-gray';
    }
  };

  return (
    <div className="main-content requests-page">
      
      {/* Page Header */}
      <header style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-display)', fontWeight: '700' }}>
          Requests Hub
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '2px' }}>
          Approve incoming borrows or manage requests you've sent to other neighbors.
        </p>
      </header>

      {/* Segmented Tab Switcher */}
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
          onClick={() => setActiveTab('incoming')}
          style={{
            flex: 1,
            padding: '10px',
            border: 'none',
            borderRadius: '12px',
            backgroundColor: activeTab === 'incoming' ? 'var(--bg-secondary)' : 'transparent',
            color: activeTab === 'incoming' ? 'var(--accent-color)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'incoming' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '14px',
            boxShadow: activeTab === 'incoming' ? 'var(--shadow-sm)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          Incoming Borrows (Lender)
          {incomingRequests.filter(r => r.status === 'Pending').length > 0 && (
            <span style={{ backgroundColor: 'var(--status-danger)', color: 'white', fontSize: '10px', borderRadius: '50%', padding: '2px 6px' }}>
              {incomingRequests.filter(r => r.status === 'Pending').length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('outgoing')}
          style={{
            flex: 1,
            padding: '10px',
            border: 'none',
            borderRadius: '12px',
            backgroundColor: activeTab === 'outgoing' ? 'var(--bg-secondary)' : 'transparent',
            color: activeTab === 'outgoing' ? 'var(--accent-color)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'outgoing' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '14px',
            boxShadow: activeTab === 'outgoing' ? 'var(--shadow-sm)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          My Requests (Borrower)
        </button>
      </div>

      {/* TABS CONTENT */}
      {activeTab === 'incoming' ? (
        
        /* INCOMING TAB */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {incomingRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📬</div>
              <h3 style={{ color: 'var(--text-secondary)' }}>No incoming borrow requests</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
                When neighbors want to rent your listed items, they will show up here.
              </p>
            </div>
          ) : (
            incomingRequests.map((req) => {
              const item = db.items.find(i => i.id === req.itemId) || { name: 'Listed Item', images: [''] };
              const requester = db.users[req.borrowerId] || { name: 'Borrower', avatar: '', rating: 5.0 };
              
              return (
                <div 
                  key={req.id} 
                  className="card" 
                  style={{ 
                    padding: '24px', 
                    border: '1px solid var(--border-color)',
                    borderLeft: req.status === 'Pending' ? '5px solid var(--status-warning)' : '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    
                    {/* Item and borrower detail */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <button
                        type="button"
                        onClick={() => onViewItem(item.id)}
                        style={{ padding: 0, border: 'none', background: 'none', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}
                      >
                        <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                      <div>
                        <span className={`badge ${getStatusBadge(req.status)}`} style={{ marginBottom: '6px', fontSize: '11px' }}>
                          {req.status}
                        </span>
                        <h3 style={{ fontSize: '18px', fontWeight: '700' }}>
                          Borrower: <button onClick={() => onViewUser(requester.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 'bold', fontSize: '18px', color: 'var(--accent-color)' }}>
                            {requester.name}
                          </button>
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          wants to rent <button onClick={() => onViewItem(item.id)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-primary)', textDecoration: 'underline', cursor: 'pointer', fontWeight: '600' }}>{item.name}</button>
                        </p>
                      </div>
                    </div>

                    {/* Date timeline block */}
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
                        <strong style={{ fontSize: '13px' }}>{formatDate(req.startDate)}</strong>
                      </div>
                      <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                      <div>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontWeight: '700' }}>TO</span>
                        <strong style={{ fontSize: '13px' }}>{formatDate(req.endDate)}</strong>
                      </div>
                      <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '12px', marginLeft: '12px' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontWeight: '700' }}>EARNINGS</span>
                        <strong style={{ fontSize: '15px', color: 'var(--accent-color)' }}>₹{req.totalAmount - (item.depositAmount || 0)}</strong>
                      </div>
                    </div>

                  </div>

                  {/* Borrower introductory message */}
                  <div 
                    style={{ 
                      marginTop: '20px', 
                      padding: '14px 16px', 
                      backgroundColor: 'var(--bg-primary)', 
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      fontSize: '14px',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>
                      MESSAGE FROM BORROWER
                    </strong>
                    "{req.message || 'No custom message.'}"
                  </div>

                  {/* Actions: Max 2 actions per card */}
                  {req.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleReject(req.id)}
                        className="btn btn-outline"
                        style={{ padding: '8px 18px', minHeight: '38px', fontSize: '13px' }}
                      >
                        <X size={14} /> Reject Request
                      </button>
                      <button 
                        onClick={() => handleAccept(req.id)}
                        className="btn btn-primary"
                        style={{ padding: '8px 24px', minHeight: '38px', fontSize: '13px' }}
                      >
                        <Check size={14} /> Accept Request
                      </button>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      ) : (
        
        /* OUTGOING TAB */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {outgoingRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛠️</div>
              <h3 style={{ color: 'var(--text-secondary)' }}>You haven't requested any items</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
                Start browsing items nearby and send booking inquiries!
              </p>
            </div>
          ) : (
            outgoingRequests.map((req) => {
              const item = db.items.find(i => i.id === req.itemId) || { name: 'Item', images: ['https://images.unsplash.com/photo-1531685250784-7569952593d2?auto=format&fit=crop&q=80&w=150'] };
              const lender = db.users[req.lenderId] || { name: 'Lender Neighbor', avatar: '' };

              return (
                <div 
                  key={req.id} 
                  className="card" 
                  style={{ 
                    padding: '24px', 
                    border: '1px solid var(--border-color)' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    
                    {/* Item details */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <button
                        type="button"
                        onClick={() => onViewItem(item.id)}
                        style={{ padding: 0, border: 'none', background: 'none', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}
                      >
                        <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                      <div>
                        <span className={`badge ${getStatusBadge(req.status)}`} style={{ marginBottom: '6px', fontSize: '11px' }}>
                          {req.status}
                        </span>
                        <h3 style={{ fontSize: '18px', fontWeight: '700' }}>
                          Item: <button onClick={() => onViewItem(item.id)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}>
                            {item.name}
                          </button>
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Lender: <button onClick={() => onViewUser(lender.id)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-primary)', textDecoration: 'underline', fontWeight: '600', cursor: 'pointer' }}>{lender.name}</button>
                        </p>
                      </div>
                    </div>

                    {/* Date and Cost block */}
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
                        <strong style={{ fontSize: '13px' }}>{formatDate(req.startDate)}</strong>
                      </div>
                      <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                      <div>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontWeight: '700' }}>TO</span>
                        <strong style={{ fontSize: '13px' }}>{formatDate(req.endDate)}</strong>
                      </div>
                      <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '12px', marginLeft: '12px' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontWeight: '700' }}>TOTAL</span>
                        <strong style={{ fontSize: '15px', color: 'var(--accent-color)' }}>₹{req.totalAmount}</strong>
                      </div>
                    </div>

                  </div>

                  {/* Cancel button if still pending */}
                  {req.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleCancel(req.id)}
                        className="btn btn-outline"
                        style={{ padding: '8px 18px', minHeight: '38px', fontSize: '13px', color: 'var(--status-danger)', borderColor: 'var(--status-danger-light)' }}
                      >
                        Cancel Request
                      </button>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      )}

    </div>
  );
}
