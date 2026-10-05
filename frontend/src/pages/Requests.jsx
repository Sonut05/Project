import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/useAuth.js';
import { requestsApi } from '../api/requests';
import ConfirmModal from '../components/ConfirmModal';
import { formatDisplayDate } from '../utils/dateUtils';
import { resolveImageUrl, ITEM_PLACEHOLDER } from '../utils/imageUrl.js';

export default function Requests({ onViewUser, onViewItem, toast }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('incoming'); // 'incoming' | 'outgoing'
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState(null);

  // Modal action state
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: null, // 'accept' | 'reject' | 'cancel'
    requestId: null,
    title: '',
    message: '',
    isDanger: false
  });
  const [actionPending, setActionPending] = useState(false);

  const refreshRequests = useCallback(async () => {
    if (!user) return;
    try {
      const [incoming, outgoing] = await Promise.all([
        requestsApi.getIncoming(),
        requestsApi.getOutgoing()
      ]);
      setIncomingRequests(Array.isArray(incoming) ? incoming : (incoming?.requests || []));
      setOutgoingRequests(Array.isArray(outgoing) ? outgoing : (outgoing?.requests || []));
    } catch (err) {
      setError(err.message || 'Failed to load requests');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    async function load() {
      try {
        const [incoming, outgoing] = await Promise.all([
          requestsApi.getIncoming(),
          requestsApi.getOutgoing()
        ]);
        if (isMounted) {
          setIncomingRequests(Array.isArray(incoming) ? incoming : (incoming?.requests || []));
          setOutgoingRequests(Array.isArray(outgoing) ? outgoing : (outgoing?.requests || []));
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load requests');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleOpenAction = (type, req) => {
    const itemName = req.item?.name || 'this item';
    if (type === 'accept') {
      setActionModal({
        isOpen: true,
        type: 'accept',
        requestId: req.id,
        title: 'Accept Borrow Request',
        message: `Accept borrow request for "${itemName}"? This will confirm the booking and reserve the selected dates.`,
        isDanger: false
      });
    } else if (type === 'reject') {
      setActionModal({
        isOpen: true,
        type: 'reject',
        requestId: req.id,
        title: 'Reject Borrow Request',
        message: `Are you sure you want to decline this borrow request for "${itemName}"?`,
        isDanger: true
      });
    } else if (type === 'cancel') {
      setActionModal({
        isOpen: true,
        type: 'cancel',
        requestId: req.id,
        title: 'Cancel Request',
        message: `Are you sure you want to cancel your borrow request for "${itemName}"?`,
        isDanger: true
      });
    }
  };

  const handleConfirmAction = async () => {
    const { type, requestId } = actionModal;
    if (!requestId || !type) return;

    setActionPending(true);
    try {
      if (type === 'accept') {
        await requestsApi.acceptRequest(requestId);
        if (toast) toast('Request accepted successfully! Meetup coordinated. 🤝');
      } else if (type === 'reject') {
        await requestsApi.rejectRequest(requestId);
        if (toast) toast('Borrow request rejected.');
      } else if (type === 'cancel') {
        await requestsApi.cancelRequest(requestId);
        if (toast) toast('Your request was successfully cancelled.');
      }
      setActionModal((prev) => ({ ...prev, isOpen: false }));
      await refreshRequests();
    } catch (err) {
      if (toast) toast(err.message || 'Action failed');
    } finally {
      setActionPending(false);
    }
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return formatDisplayDate(dateStr);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending': return 'badge-warning';
      case 'Accepted': return 'badge-success';
      case 'Rejected': return 'badge-danger';
      case 'Cancelled': return 'badge-gray';
      default: return 'badge-gray';
    }
  };

  const pendingIncomingCount = incomingRequests.filter((r) => r.status === 'Pending').length;

  if (loading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading requests...</p>
      </div>
    );
  }

  return (
    <div className="main-content requests-page">
      {/* Page Header */}
      <header style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-display)', fontWeight: '700' }}>
          Requests Hub
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '2px' }}>
          Approve incoming borrows or manage requests you've sent to neighbors.
        </p>
      </header>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-danger)', borderRadius: '8px', color: 'var(--status-danger)', marginBottom: '24px' }}>
          {error}
        </div>
      )}

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
          {pendingIncomingCount > 0 && (
            <span style={{ backgroundColor: 'var(--status-danger)', color: 'white', fontSize: '10px', borderRadius: '50%', padding: '2px 6px' }}>
              {pendingIncomingCount}
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
              const item = req.item || { name: 'Listed Item', images: [] };
              const requester = req.borrower || { name: 'Borrower', rating: 5.0 };
              const itemImage = item.images && item.images.length > 0
                ? resolveImageUrl(item.images[0])
                : ITEM_PLACEHOLDER;

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
                        onClick={() => handleView(item.id)}
                        style={{ padding: 0, border: 'none', background: 'none', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <img src={itemImage} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                      <div>
                        <span className={`badge ${getStatusBadge(req.status)}`} style={{ marginBottom: '6px', fontSize: '11px' }}>
                          {req.status}
                        </span>
                        <h3 style={{ fontSize: '18px', fontWeight: '700' }}>
                          Borrower:{' '}
                          <button 
                            onClick={() => handleViewProfile(requester.id)} 
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 'bold', fontSize: '18px', color: 'var(--accent-color)' }}
                          >
                            {requester.name}
                          </button>
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          wants to rent{' '}
                          <button 
                            onClick={() => handleView(item.id)} 
                            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-primary)', textDecoration: 'underline', cursor: 'pointer', fontWeight: '600' }}
                          >
                            {item.name}
                          </button>
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
                        <strong style={{ fontSize: '15px', color: 'var(--accent-color)' }}>₹{req.rentalAmount}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Borrower message */}
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
                    "{req.message || 'No custom message provided.'}"
                  </div>

                  {/* Actions for Pending requests */}
                  {req.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleOpenAction('reject', req)}
                        className="btn btn-outline"
                        style={{ padding: '8px 18px', minHeight: '38px', fontSize: '13px' }}
                      >
                        <X size={14} /> Reject Request
                      </button>
                      <button 
                        onClick={() => handleOpenAction('accept', req)}
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
              const item = req.item || { name: 'Item', images: [] };
              const lender = req.lender || { name: 'Neighbor' };
              const itemImage = item.images && item.images.length > 0
                ? resolveImageUrl(item.images[0])
                : ITEM_PLACEHOLDER;

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
                        onClick={() => handleView(item.id)}
                        style={{ padding: 0, border: 'none', background: 'none', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <img src={itemImage} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                      <div>
                        <span className={`badge ${getStatusBadge(req.status)}`} style={{ marginBottom: '6px', fontSize: '11px' }}>
                          {req.status}
                        </span>
                        <h3 style={{ fontSize: '18px', fontWeight: '700' }}>
                          Item:{' '}
                          <button 
                            onClick={() => handleView(item.id)} 
                            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}
                          >
                            {item.name}
                          </button>
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Lender:{' '}
                          <button 
                            onClick={() => handleViewProfile(lender.id)} 
                            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-primary)', textDecoration: 'underline', fontWeight: '600', cursor: 'pointer' }}
                          >
                            {lender.name}
                          </button>
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
                        onClick={() => handleOpenAction('cancel', req)}
                        className="btn btn-outline"
                        style={{ padding: '8px 18px', minHeight: '38px', fontSize: '13px', color: 'var(--status-danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
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

      {/* Accessible Confirmation Modal */}
      <ConfirmModal
        isOpen={actionModal.isOpen}
        title={actionModal.title}
        message={actionModal.message}
        confirmText={actionPending ? 'Processing...' : 'Confirm'}
        isDanger={actionModal.isDanger}
        onConfirm={handleConfirmAction}
        onCancel={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
