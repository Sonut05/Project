import React, { useState, useEffect } from 'react';
import { getDb, dbOps } from '../utils/mockDb';
import ItemCard from '../components/ItemCard';
import { PlusCircle, Info, ShieldAlert, Sparkles } from 'lucide-react';

export default function MyItems({ onOpenAddListing, onOpenEditListing, onViewUser, onViewItem, toast }) {
  const [db, setDb] = useState(getDb());

  const refreshData = () => {
    setDb(getDb());
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('rentit_db_update', refreshData);
    return () => window.removeEventListener('rentit_db_update', refreshData);
  }, []);

  const activeUserId = db.currentUserId || 'user-self';
  const myListings = db.items.filter(item => item.lenderId === activeUserId);

  const handleDeleteListing = (itemId) => {
    const item = db.items.find(i => i.id === itemId);
    if (confirm(`Are you absolutely sure you want to delete "${item?.name || 'this listing'}"? This action cannot be undone.`)) {
      dbOps.removeItem(itemId);
      toast('Listing deleted successfully! 🧹');
      refreshData();
    }
  };

  // Stats summaries
  const availableCount = myListings.filter(i => i.availability === 'Available').length;
  const rentedCount = myListings.filter(i => i.availability === 'Rented Out').length;
  const totalEarnings = db.requests
    .filter(req => req.lenderId === activeUserId && req.status === 'Completed')
    .reduce((sum, req) => {
      // Find item daily price to calculate earnings
      const item = db.items.find(i => i.id === req.itemId) || { dailyPrice: 0 };
      return sum + (req.totalDays * item.dailyPrice);
    }, 0);

  return (
    <div className="main-content">
      
      {/* Title Header Toolbar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-display)', fontWeight: '700' }}>
            My Listings Center
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '2px' }}>
            Manage the household items you are sharing with neighbors.
          </p>
        </div>
        <button 
          onClick={onOpenAddListing}
          className="btn btn-primary"
          style={{ height: '48px' }}
        >
          <PlusCircle size={18} /> Add New Listing
        </button>
      </header>

      {/* Listings statistics widget */}
      {myListings.length > 0 && (
        <section 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '16px',
            marginBottom: '32px'
          }}
        >
          <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>TOTAL LISTED</span>
              <strong style={{ fontSize: '24px', display: 'block', marginTop: '4px' }}>{myListings.length}</strong>
            </div>
            <span style={{ fontSize: '24px' }}>📦</span>
          </div>

          <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>AVAILABLE</span>
              <strong style={{ fontSize: '24px', display: 'block', marginTop: '4px', color: 'var(--status-success)' }}>{availableCount}</strong>
            </div>
            <span style={{ fontSize: '24px' }}>🟢</span>
          </div>

          <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>RENTED OUT</span>
              <strong style={{ fontSize: '24px', display: 'block', marginTop: '4px', color: 'var(--status-danger)' }}>{rentedCount}</strong>
            </div>
            <span style={{ fontSize: '24px' }}>🔴</span>
          </div>

          <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>TOTAL EARNINGS</span>
              <strong style={{ fontSize: '24px', display: 'block', marginTop: '4px', color: 'var(--accent-color)' }}>₹{totalEarnings}</strong>
            </div>
            <span style={{ fontSize: '24px' }}>💰</span>
          </div>
        </section>
      )}

      {/* Empty State visual */}
      {myListings.length === 0 ? (
        <div 
          style={{ 
            textAlign: 'center', 
            padding: '80px 24px', 
            backgroundColor: 'white', 
            border: '1px dashed var(--border-color)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-sm)',
            maxWidth: '600px',
            margin: '40px auto'
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🤝</div>
          <h3 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>Share your spare items and earn pocket money!</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '400px', margin: '8px auto 24px' }}>
            List electric drills, ladders, cameras, or blenders. Neighbors nearby can rent them per day, and items are secured with deposit handoffs.
          </p>
          <button onClick={onOpenAddListing} className="btn btn-primary" style={{ height: '48px' }}>
            List Your First Item Now
          </button>
        </div>
      ) : (
        <div className="grid-cols-responsive">
          {myListings.map(item => (
            <div key={item.id}>
              <ItemCard 
                item={item}
                isOwner={true}
                onEdit={onOpenEditListing}
                onRemove={handleDeleteListing}
                onViewUser={onViewUser}
                onView={onViewItem}
              />
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
