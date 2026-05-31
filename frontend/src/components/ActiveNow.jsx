import React from 'react';
import { Calendar, User, ArrowRight, CheckSquare } from 'lucide-react';
import { getDb, dbOps } from '../utils/mockDb';
import RentalTimer from './RentalTimer';

export default function ActiveNow({ onViewUser, onRefresh, toast }) {
  const db = getDb();
  const activeUserId = db.currentUserId || 'user-self';

  // Find requests with status 'Accepted' (Ongoing active rentals)
  const activeLendings = db.requests.filter(
    (req) => req.lenderId === activeUserId && req.status === 'Accepted'
  );
  
  const activeBorrowings = db.requests.filter(
    (req) => req.borrowerId === activeUserId && req.status === 'Accepted'
  );

  const handleReturn = (requestId) => {
    if (confirm('Are you sure the borrower has returned the item in good condition?')) {
      dbOps.markAsReturned(requestId);
      toast('Item marked as returned successfully! 🤝');
      onRefresh();
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getDaysRemaining = (endDateStr) => {
    const end = new Date(endDateStr);
    const today = new Date('2026-05-21'); // Current local time from metadata
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Returns today!';
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} left`;
  };

  return (
    <section style={{ marginTop: '32px' }}>
      <h2 style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>⚡</span> Active Now
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', width: '100%' }} ref={(el) => {
        if (el) {
          el.style.setProperty('grid-template-columns', window.innerWidth >= 1024 ? '1fr 1fr' : '1fr');
        }
      }}>
        
        {/* LENDING CARD LIST (Borrowed from me) */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '12px' }}>
            Currently Borrowed From Me (Lending)
          </h3>
          
          {activeLendings.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              No one is borrowing your items at the moment.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeLendings.map((req) => {
                const item = db.items.find(i => i.id === req.itemId) || { name: 'Your Item', images: [''] };
                const borrower = db.users[req.borrowerId] || { name: 'Borrower', avatar: '' };
                const daysLeft = getDaysRemaining(req.endDate);
                
                return (
                  <div 
                    key={req.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--bg-primary)',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img 
                        src={item.images[0]} 
                        alt={item.name} 
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px' }} 
                      />
                      <div>
                        <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block' }}>{item.name}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                          <span>Due: {formatDate(req.endDate)}</span>
                          <RentalTimer endDateStr={req.endDate} />
                        </div>
                      </div>
                    </div>

                    {/* Borrower avatar & Mark Returned Action */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>BORROWER</span>
                        <button 
                          onClick={() => onViewUser(borrower.id)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}
                        >
                          {borrower.name.split(' ')[0]}
                        </button>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => onViewUser(borrower.id)}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <img src={borrower.avatar} alt={borrower.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>

                      <button 
                        onClick={() => handleReturn(req.id)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', minHeight: '32px', fontSize: '12px', borderRadius: '8px' }}
                        title="Mark as Returned"
                      >
                        <CheckSquare size={14} /> Returned
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* BORROWING CARD LIST (Items I am borrowing) */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '12px' }}>
            Items I'm Currently Borrowing
          </h3>
          
          {activeBorrowings.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              You aren't borrowing any items right now.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeBorrowings.map((req) => {
                const item = db.items.find(i => i.id === req.itemId) || { name: 'Item', images: [''] };
                const lender = db.users[req.lenderId] || { name: 'Lender', avatar: '' };
                const daysLeft = getDaysRemaining(req.endDate);

                return (
                  <div 
                    key={req.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--bg-primary)',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img 
                        src={item.images[0]} 
                        alt={item.name} 
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px' }} 
                      />
                      <div>
                        <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block' }}>{item.name}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                          <span>Return: {formatDate(req.endDate)}</span>
                          <RentalTimer endDateStr={req.endDate} />
                        </div>
                      </div>
                    </div>

                    {/* Lender avatar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', fontWeight: '600' }}>LENDER</span>
                        <button 
                          onClick={() => onViewUser(lender.id)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}
                        >
                          {lender.name.split(' ')[0]}
                        </button>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => onViewUser(lender.id)}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <img src={lender.avatar} alt={lender.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
