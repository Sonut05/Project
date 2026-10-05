import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ItemCard from '../components/ItemCard';
import ConfirmModal from '../components/ConfirmModal';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '../context/useAuth.js';
import { itemsApi } from '../api/items';
import { requestsApi } from '../api/requests';

export default function MyItems({ onOpenAddListing, onOpenEditListing, onViewUser, onViewItem, toast }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [myListings, setMyListings] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState(null);

  // Confirm delete modal state
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshData = useCallback(async () => {
    if (!user) return;
    try {
      const [items, requests] = await Promise.all([
        itemsApi.getItems({ lenderId: user.id }),
        requestsApi.getIncoming()
      ]);
      setMyListings(items);
      setIncomingRequests(requests);
    } catch (err) {
      setError(err.message || 'Failed to load your listings');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    async function load() {
      try {
        const [items, requests] = await Promise.all([
          itemsApi.getItems({ lenderId: user.id }),
          requestsApi.getIncoming()
        ]);
        if (isMounted) {
          setMyListings(items);
          setIncomingRequests(requests);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load your listings');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleRequestDelete = (itemId) => {
    const item = myListings.find((i) => i.id === itemId);
    if (item) {
      setDeleteModalItem(item);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalItem) return;
    setIsDeleting(true);
    try {
      await itemsApi.deleteItem(deleteModalItem.id);
      if (toast) {
        toast('Listing removed or archived successfully! 🧹');
      }
      setDeleteModalItem(null);
      await refreshData();
    } catch (err) {
      if (toast) {
        toast(err.message || 'Failed to delete listing');
      }
    } finally {
      setIsDeleting(false);
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

  // Stats summaries
  const availableCount = myListings.filter((i) => i.availability === 'Available').length;
  const rentedCount = myListings.filter((i) => i.availability === 'Rented Out').length;
  const totalEarnings = incomingRequests
    .filter((req) => req.status === 'Completed')
    .reduce((sum, req) => sum + (req.rentalAmount || 0), 0);

  if (loading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading your listings...</p>
      </div>
    );
  }

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

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-danger)', borderRadius: '8px', color: 'var(--status-danger)', marginBottom: '24px' }}>
          {error}
        </div>
      )}

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

      {/* Empty State */}
      {myListings.length === 0 ? (
        <div 
          style={{ 
            textAlign: 'center', 
            padding: '80px 24px', 
            backgroundColor: 'var(--card-bg)', 
            border: '1px dashed var(--border-color)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-sm)',
            maxWidth: '600px',
            margin: '40px auto'
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🤝</div>
          <h3 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>Share your spare items and earn with neighbors!</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '400px', margin: '8px auto 24px' }}>
            List electric drills, ladders, cameras, or appliances. Neighbors nearby can rent them per day, secured with refundable deposit handoffs.
          </p>
          <button onClick={onOpenAddListing} className="btn btn-primary" style={{ height: '48px' }}>
            List Your First Item Now
          </button>
        </div>
      ) : (
        <div className="grid-cols-responsive">
          {myListings.map((item) => (
            <div key={item.id}>
              <ItemCard 
                item={item}
                isOwner={true}
                onEdit={onOpenEditListing}
                onRemove={handleRequestDelete}
                onViewUser={handleViewProfile}
                onView={handleView}
              />
            </div>
          ))}
        </div>
      )}

      {/* Accessible Confirm Modal for Delete */}
      <ConfirmModal
        isOpen={Boolean(deleteModalItem)}
        title="Delete Listing"
        message={`Are you sure you want to remove "${deleteModalItem?.name}"? If this item has previous completed rental history, it will be securely archived rather than deleted.`}
        confirmText={isDeleting ? 'Removing...' : 'Delete Listing'}
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalItem(null)}
      />
    </div>
  );
}
