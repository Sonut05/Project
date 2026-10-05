import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ActiveNow from '../components/ActiveNow';
import RentalTimer from '../components/RentalTimer';
import { Box, PlusCircle, CheckCircle, TrendingUp, Inbox, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/useAuth.js';
import { itemsApi } from '../api/items';
import { requestsApi } from '../api/requests';
import { activitiesApi } from '../api/activities';
import { formatRelativeTime, getTodayString } from '../utils/dateUtils';
import { resolveAvatarUrl, AVATAR_PLACEHOLDER } from '../utils/imageUrl.js';

export default function Dashboard({ onViewUser, onNavigatePage, onOpenAddListing, toast }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [showTip, setShowTip] = useState(true);
  const [items, setItems] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState(null);

  const refreshData = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const [userItems, incoming, outgoing, acts] = await Promise.all([
        itemsApi.getItems({ lenderId: user.id }),
        requestsApi.getIncoming(),
        requestsApi.getOutgoing(),
        activitiesApi.getActivities()
      ]);
      setItems(Array.isArray(userItems) ? userItems : (userItems?.items || []));
      setIncomingRequests(Array.isArray(incoming) ? incoming : (incoming?.requests || []));
      setOutgoingRequests(Array.isArray(outgoing) ? outgoing : (outgoing?.requests || []));
      setActivities(Array.isArray(acts) ? acts : (acts?.activities || []));
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
      if (toast) toast('Error loading dashboard data');
    }
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    async function loadData() {
      try {
        const [userItems, incoming, outgoing, acts] = await Promise.all([
          itemsApi.getItems({ lenderId: user.id }),
          requestsApi.getIncoming(),
          requestsApi.getOutgoing(),
          activitiesApi.getActivities()
        ]);
        if (isMounted) {
          setItems(Array.isArray(userItems) ? userItems : (userItems?.items || []));
          setIncomingRequests(Array.isArray(incoming) ? incoming : (incoming?.requests || []));
          setOutgoingRequests(Array.isArray(outgoing) ? outgoing : (outgoing?.requests || []));
          setActivities(Array.isArray(acts) ? acts : (acts?.activities || []));
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load dashboard data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleNavigate = (path) => {
    if (onNavigatePage) {
      onNavigatePage(path);
    } else {
      navigate(`/${path}`);
    }
  };

  const handleViewProfile = (userId) => {
    if (onViewUser) {
      onViewUser(userId);
    } else {
      navigate(`/profile/${userId}`);
    }
  };

  // Metrics
  const listedCount = items.length;
  const borrowedCount = outgoingRequests.filter(
    (req) => req.status === 'Accepted' || req.status === 'Completed'
  ).length;
  const pendingRequests = incomingRequests.filter((req) => req.status === 'Pending').length;
  const completedCount = [
    ...incomingRequests.filter((r) => r.status === 'Completed'),
    ...outgoingRequests.filter((r) => r.status === 'Completed')
  ].length;

  // Active rentals: must be Accepted AND today >= startDate AND today <= endDate
  const today = getTodayString();
  const activeBorrowings = outgoingRequests.filter(
    (req) => req.status === 'Accepted' && today >= req.startDate && today <= req.endDate
  );
  const activeLendings = incomingRequests.filter(
    (req) => req.status === 'Accepted' && today >= req.startDate && today <= req.endDate
  );

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good morning';
    if (hrs < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleDeleteActivity = async (activityId) => {
    try {
      await activitiesApi.deleteActivity(activityId);
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
      if (toast) toast('Activity log removed.');
    } catch {
      if (toast) toast('Failed to remove activity log.');
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'REQUEST_RECEIVED': return '📥';
      case 'REQUEST_ACCEPTED': return '🤝';
      case 'REQUEST_REJECTED': return '❌';
      case 'REQUEST_CANCELLED': return '🚫';
      case 'RENTAL_COMPLETED': return '🎉';
      case 'REVIEW_RECEIVED': return '⭐';
      case 'LISTING_CREATED': return '📦';
      default: return '🔔';
    }
  };

  if (loading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading your dashboard...</p>
      </div>
    );
  }

  if (error && !items.length && !incomingRequests.length && !outgoingRequests.length) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="card" style={{ maxWidth: '440px', margin: '0 auto', padding: '32px' }}>
          <h3 style={{ color: 'var(--status-danger)', marginBottom: '8px' }}>Failed to Load Dashboard</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>{error}</p>
          <button onClick={refreshData} className="btn btn-primary" style={{ padding: '8px 24px' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const displayName = user?.name || 'Neighbor';

  return (
    <div className="main-content">
      {error && (
        <div style={{ padding: '12px 16px', marginBottom: '20px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: 'var(--status-danger)' }}>{error}</span>
          <button onClick={refreshData} className="btn btn-outline" style={{ fontSize: '12px', padding: '4px 12px', minHeight: '32px' }}>
            Retry
          </button>
        </div>
      )}
      {/* Greetings Header Row */}
      <header 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '28px',
          backgroundColor: 'var(--bg-secondary)',
          padding: '20px 24px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            type="button"
            onClick={() => handleViewProfile(user?.id)}
            style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '50%', 
              overflow: 'hidden', 
              border: '2px solid var(--accent-color)',
              padding: 0,
              cursor: 'pointer',
              backgroundColor: 'var(--accent-color-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              color: 'var(--accent-color)',
              fontSize: '20px'
            }}
          >
            {user?.avatarUrl ? (
              <img 
                src={resolveAvatarUrl(user.avatarUrl, AVATAR_PLACEHOLDER)} 
                alt={displayName} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.currentTarget.src = AVATAR_PLACEHOLDER;
                }}
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </button>
          <div>
            <h1 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', fontWeight: '700' }}>
              {getGreeting()}, {displayName.split(' ')[0]}!
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
              Welcome back to your RentIt sharing dashboard.
            </p>
          </div>
        </div>

        {/* Quick add item shortcut */}
        <button 
          onClick={onOpenAddListing}
          className="btn btn-primary"
        >
          <PlusCircle size={18} /> Quick Add Item
        </button>
      </header>

      {/* Dynamic Borrow Alerts Banner */}
      {activeBorrowings.map((req) => {
        const item = req.item || { name: 'Item' };
        const lender = req.lender || { name: 'Lender' };
        
        return (
          <div 
            key={req.id}
            style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.05)', 
              borderLeft: '5px solid var(--status-danger)',
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: 'var(--shadow-sm)',
              animation: 'slide-in 0.25s',
              border: '1px solid rgba(239, 68, 68, 0.1)',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>🚨</span>
              <div>
                <strong style={{ color: 'var(--status-danger)', fontSize: '15px' }}>Active Borrow in Progress</strong>
                <p style={{ color: 'var(--text-primary)', fontSize: '13px', marginTop: '2px' }}>
                  You are currently borrowing <strong>{item.name}</strong> from <strong>{lender.name}</strong>.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <RentalTimer endDateStr={req.endDate} />
            </div>
          </div>
        );
      })}

      {/* Dismissible Tip Banner */}
      {showTip && (
        <div 
          style={{ 
            backgroundColor: 'var(--accent-color-light)', 
            borderLeft: '5px solid var(--accent-color)',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
            boxShadow: 'var(--shadow-sm)',
            animation: 'slide-in 0.25s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '24px', lineHeight: 1 }} aria-hidden="true">💡</span>
            <div>
              <strong style={{ color: 'var(--accent-color)', fontSize: '15px' }}>Community Tip for Sharing</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px', marginBottom: '8px' }}>
                Add clear photos and describe the condition of your items to help neighbors find what they need.
              </p>
              <button 
                onClick={() => setShowTip(false)}
                className="btn btn-secondary"
                style={{ 
                  fontSize: 'var(--text-xs)', 
                  padding: '6px 14px', 
                  minHeight: '32px',
                  borderRadius: 'var(--radius-full)'
                }}
              >
                Got it, thanks!
              </button>
            </div>
          </div>
          <button 
            onClick={() => setShowTip(false)}
            aria-label="Dismiss community tip"
            title="Dismiss tip"
            className="btn-icon"
            style={{ 
              color: 'var(--text-muted)',
              minWidth: '44px',
              minHeight: '44px',
              padding: '8px'
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Grid of 4 quick stat widgets */}
      <section 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px',
          marginBottom: '32px'
        }}
      >
        {/* Listed Items */}
        <button 
          onClick={() => handleNavigate('my-items')}
          className="card" 
          aria-label="View Items Listed"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: '16px', 
            padding: '20px', 
            textAlign: 'left',
            cursor: 'pointer',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            width: '100%'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ backgroundColor: 'var(--accent-color-light)', color: 'var(--accent-color)', padding: '12px', borderRadius: '12px' }}>
              <Box size={24} aria-hidden="true" />
            </div>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>Items Listed</span>
              <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '2px 0' }}>{listedCount}</h2>
            </div>
          </div>
          <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
        </button>

        {/* Borrowed Items */}
        <button 
          onClick={() => handleNavigate('history')}
          className="card" 
          aria-label="View Items Borrowed"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: '16px', 
            padding: '20px', 
            textAlign: 'left',
            cursor: 'pointer',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            width: '100%'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', padding: '12px', borderRadius: '12px' }}>
              <TrendingUp size={24} aria-hidden="true" />
            </div>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>Items Borrowed</span>
              <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '2px 0' }}>{borrowedCount}</h2>
            </div>
          </div>
          <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
        </button>

        {/* Pending Requests */}
        <button 
          onClick={() => handleNavigate('requests')}
          className="card" 
          aria-label="View Pending Requests"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: '16px', 
            padding: '20px', 
            textAlign: 'left',
            cursor: 'pointer',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            width: '100%'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--status-warning)', padding: '12px', borderRadius: '12px' }}>
              <Inbox size={24} aria-hidden="true" />
            </div>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>Pending Requests</span>
              <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '2px 0', color: pendingRequests > 0 ? 'var(--status-warning)' : 'var(--text-primary)' }}>
                {pendingRequests}
              </h2>
            </div>
          </div>
          <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
        </button>

        {/* Completed Rentals */}
        <button 
          onClick={() => handleNavigate('history')}
          className="card" 
          aria-label="View Completed Rentals"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: '16px', 
            padding: '20px', 
            textAlign: 'left',
            cursor: 'pointer',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            width: '100%'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-success)', padding: '12px', borderRadius: '12px' }}>
              <CheckCircle size={24} aria-hidden="true" />
            </div>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>Completed Rentals</span>
              <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '2px 0' }}>{completedCount}</h2>
            </div>
          </div>
          <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
        </button>
      </section>

      {/* Active Now borrowings / lendings section */}
      <ActiveNow 
        activeBorrowings={activeBorrowings}
        activeLendings={activeLendings}
        onViewUser={handleViewProfile} 
        onNavigatePage={handleNavigate}
        onOpenAddListing={onOpenAddListing}
        onRefresh={refreshData} 
        toast={toast} 
      />

      {/* Recent Activity Feed */}
      <section style={{ marginTop: '36px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>📰 Recent Activities</h2>
        <div className="card" style={{ padding: '0 24px' }}>
          {activities.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No recent notifications or activities.
            </div>
          ) : (
            activities.slice(0, 5).map((act, index) => (
              <div 
                key={act.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '18px 0',
                  borderBottom: index === Math.min(4, activities.length - 1) ? 'none' : '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '18px' }}>
                    {getActivityIcon(act.type)}
                  </span>
                  <span style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: '500' }}>
                    {act.message}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {formatRelativeTime(act.createdAt)}
                  </span>
                  <button 
                    onClick={() => handleDeleteActivity(act.id)}
                    className="btn-icon"
                    style={{ 
                      minWidth: '44px',
                      minHeight: '44px',
                      padding: '8px',
                      color: 'var(--text-muted)'
                    }}
                    title="Delete activity log"
                    aria-label="Delete activity log"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
