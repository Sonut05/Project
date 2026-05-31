import React, { useState, useEffect } from 'react';
import { getDb, dbOps } from '../utils/mockDb';
import ActiveNow from '../components/ActiveNow';
import RentalTimer from '../components/RentalTimer';
import { Box, HelpCircle, ArrowRight, PlusCircle, CheckCircle, TrendingUp, Inbox, ShieldAlert, X } from 'lucide-react';

export default function Dashboard({ onViewUser, onNavigatePage, onOpenAddListing, toast }) {
  const [db, setDb] = useState(getDb());
  const [showTip, setShowTip] = useState(true);

  const refreshData = () => {
    setDb(getDb());
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('rentit_db_update', refreshData);
    return () => window.removeEventListener('rentit_db_update', refreshData);
  }, []);

  const activeUserId = db.currentUserId || 'user-self';
  const self = db.users[activeUserId] || { name: 'Guest', avatar: '', loginCount: 1 };
  
  // Filter activities to show only those belonging to the logged-in user
  const userActivities = (db.activities || []).filter(
    act => act.userId === activeUserId
  );
  
  // Calculate metrics
  const listedCount = db.items.filter(item => item.lenderId === activeUserId).length;
  
  const borrowedCount = db.requests.filter(
    req => req.borrowerId === activeUserId && (req.status === 'Accepted' || req.status === 'Completed')
  ).length;
  
  const pendingRequests = db.requests.filter(
    req => req.lenderId === activeUserId && req.status === 'Pending'
  ).length;

  const completedCount = db.requests.filter(
    req => (req.borrowerId === activeUserId || req.lenderId === activeUserId) && req.status === 'Completed'
  ).length;

  // Decide if greeting should match current time (morning, afternoon, evening)
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good morning';
    if (hrs < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getRelativeTime = (act) => {
    const timestamp = act.timestamp || parseInt(act.id.split('-')[1]) || Date.now();
    const diffMs = Date.now() - timestamp;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleDeleteActivity = (activityId) => {
    dbOps.removeActivity(activityId);
    refreshData();
    toast('Activity log deleted successfully. 🧹');
  };

  const handleDismissTip = () => {
    setShowTip(false);
  };

  return (
    <div className="main-content">
      
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
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            type="button"
            onClick={() => onViewUser(activeUserId)}
            style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '50%', 
              overflow: 'hidden', 
              border: '2px solid var(--accent-color)',
              padding: 0,
              cursor: 'pointer'
            }}
          >
            <img 
              src={self.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'} 
              alt={self.name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </button>
          <div>
            <h1 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', fontWeight: '700' }}>
              {getGreeting()}, {self.name.split(' ')[0]}!
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
              Welcome back to your sharing dashboard. Ready to rent some items?
            </p>
          </div>
        </div>

        {/* Quick add item shortcut */}
        <button 
          onClick={onOpenAddListing}
          className="btn btn-primary"
          style={{ height: '48px', padding: '0 20px' }}
        >
          <PlusCircle size={18} /> Quick Add Item
        </button>
      </header>

      {/* Dynamic Borrow Alerts Banner */}
      {db.requests.filter(req => req.borrowerId === activeUserId && req.status === 'Accepted').map(req => {
        const item = db.items.find(i => i.id === req.itemId) || { name: 'Item' };
        const lender = db.users[req.lenderId] || { name: 'Lender' };
        
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
                <strong style={{ color: 'var(--status-danger)', fontSize: '15px' }}>Active Borrow Warning!</strong>
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

      {/* Dismissible Pro Tip Banner */}
      {showTip && self.loginCount <= 3 && (
        <div 
          style={{ 
            backgroundColor: 'var(--accent-color-light)', 
            borderLeft: '5px solid var(--accent-color)',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: 'var(--shadow-sm)',
            animation: 'slide-in 0.25s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>💡</span>
            <div>
              <strong style={{ color: 'var(--accent-color)', fontSize: '15px' }}>Pro Tip for New Neighbors!</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
                Add a photo to your item listings — items with photos get <strong>3x more borrow requests</strong>!
              </p>
            </div>
          </div>
          <button 
            onClick={handleDismissTip}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-secondary)', 
              fontWeight: '600', 
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Got it, thanks!
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
          onClick={() => onNavigatePage('my-items')}
          className="card" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            padding: '20px', 
            textAlign: 'left',
            cursor: 'pointer',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)'
          }}
        >
          <div style={{ backgroundColor: 'var(--accent-color-light)', color: 'var(--accent-color)', padding: '12px', borderRadius: '12px' }}>
            <Box size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>Items Listed</span>
            <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '2px 0' }}>{listedCount}</h2>
          </div>
        </button>

        {/* Borrowed Items */}
        <button 
          onClick={() => onNavigatePage('history')}
          className="card" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            padding: '20px', 
            textAlign: 'left',
            cursor: 'pointer',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)'
          }}
        >
          <div style={{ backgroundColor: 'var(--secondary-color-light)', color: 'var(--secondary-color)', padding: '12px', borderRadius: '12px' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>Items Borrowed</span>
            <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '2px 0' }}>{borrowedCount}</h2>
          </div>
        </button>

        {/* Pending Requests */}
        <button 
          onClick={() => onNavigatePage('requests')}
          className="card" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            padding: '20px', 
            textAlign: 'left',
            cursor: 'pointer',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)'
          }}
        >
          <div style={{ backgroundColor: 'var(--status-warning-light)', color: 'var(--status-warning)', padding: '12px', borderRadius: '12px' }}>
            <Inbox size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>Pending Requests</span>
            <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '2px 0', color: pendingRequests > 0 ? 'var(--status-warning)' : 'var(--text-primary)' }}>
              {pendingRequests}
            </h2>
          </div>
        </button>

        {/* Completed Rentals */}
        <button 
          onClick={() => onNavigatePage('history')}
          className="card" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            padding: '20px', 
            textAlign: 'left',
            cursor: 'pointer',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)'
          }}
        >
          <div style={{ backgroundColor: 'var(--status-success-light)', color: 'var(--status-success)', padding: '12px', borderRadius: '12px' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>Completed Rentals</span>
            <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '2px 0' }}>{completedCount}</h2>
          </div>
        </button>
      </section>

      {/* Active Now borrowings / lendings split section */}
      <ActiveNow onViewUser={onViewUser} onRefresh={refreshData} toast={toast} />

      {/* Recent Activity Feed log */}
      <section style={{ marginTop: '36px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>📰 Recent Activities</h2>
        <div className="card" style={{ padding: '0 24px' }}>
          {userActivities.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No recent notifications or activities.
            </div>
          ) : (
            userActivities.slice(0, 5).map((act, index) => (
              <div 
                key={act.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '18px 0',
                  borderBottom: index === 4 || index === userActivities.slice(0, 5).length - 1 ? 'none' : '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '18px' }}>
                    {act.type === 'success' ? '✅' : act.type === 'review' ? '★' : 'ℹ️'}
                  </span>
                  <span style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: '500' }}>
                    {act.message}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {getRelativeTime(act)}
                  </span>
                  <button 
                    onClick={() => handleDeleteActivity(act.id)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      color: 'var(--text-muted)', 
                      padding: '4px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      minWidth: 'auto',
                      minHeight: 'auto'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--status-danger)';
                      e.currentTarget.style.backgroundColor = 'var(--status-danger-light)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    title="Delete activity log"
                  >
                    <X size={14} />
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
