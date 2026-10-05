import { useState } from 'react';
import { Calendar, User, CheckSquare } from 'lucide-react';
import RentalTimer from './RentalTimer.jsx';
import ConfirmModal from './ConfirmModal.jsx';
import { formatDisplayDate, getTodayString } from '../utils/dateUtils.js';
import { resolveImageUrl, ITEM_PLACEHOLDER } from '../utils/imageUrl.js';
import { requestsApi } from '../api/requests.js';

export default function ActiveNow({
  activeLendings = [],
  activeBorrowings = [],
  onViewUser,
  onNavigatePage,
  onOpenAddListing,
  onRefresh,
  toast
}) {
  const [returnTarget, setReturnTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReturnConfirm = async () => {
    if (!returnTarget) return;
    setIsSubmitting(true);
    try {
      await requestsApi.returnRequest(returnTarget.id);
      if (toast) toast('Item marked as returned successfully! 🤝');
      setReturnTarget(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      if (toast) toast(`Error: ${err.message || 'Failed to complete return'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDaysRemaining = (endDateStr) => {
    if (!endDateStr) return '';
    const today = getTodayString();
    if (endDateStr < today) return 'Overdue';
    if (endDateStr === today) return 'Returns today!';
    const [y1, m1, d1] = today.split('-').map(Number);
    const [y2, m2, d2] = endDateStr.split('-').map(Number);
    const diff = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / (1000 * 60 * 60 * 24));
    return `${diff} ${diff === 1 ? 'day' : 'days'} left`;
  };

  const fallbackImg = ITEM_PLACEHOLDER;

  return (
    <>
      <section style={{ marginTop: '32px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚡</span> Active Now
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
            width: '100%'
          }}
        >
          {/* LENDING CARD LIST (Borrowed from me) */}
          <div className="card" style={{ padding: '20px' }}>
            <h3
              style={{
                fontSize: '16px',
                color: 'var(--text-secondary)',
                borderBottom: '1px solid var(--border-color)',
                margin: '0 -20px 16px -20px',
                padding: '0 20px 12px 20px'
              }}
            >
              Currently Borrowed From Me (Lending)
            </h3>

            {activeLendings.length === 0 ? (
              <div style={{ padding: '20px 0 8px 0', textAlign: 'left' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
                  No one is borrowing your items at the moment.
                </p>
                {onOpenAddListing && (
                  <button
                    type="button"
                    onClick={onOpenAddListing}
                    className="btn btn-primary"
                    style={{ fontSize: '13px' }}
                  >
                    + List an Item to Share
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeLendings.map((req) => {
                  const item = req.item || { name: 'Item', images: [] };
                  const borrower = req.borrower || { name: 'Borrower', avatarUrl: '' };
                  const rawImg = item.images && item.images.length > 0 ? item.images[0] : null;
                  const itemImg = rawImg ? resolveImageUrl(rawImg) : fallbackImg;

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
                        border: '1px solid var(--border-color)',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <img
                          src={itemImg}
                          alt={item.name}
                          style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                          onError={(e) => {
                            e.currentTarget.src = fallbackImg;
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 2px 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <User size={13} style={{ flexShrink: 0 }} />
                            <span>Lent to: </span>
                            <button
                              type="button"
                              onClick={() => onViewUser && onViewUser(borrower.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                fontWeight: '600',
                                color: 'var(--accent-color)',
                                cursor: 'pointer'
                              }}
                            >
                              {borrower.name}
                            </button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            <Calendar size={12} />
                            <span>Due: {formatDisplayDate(req.endDate)}</span>
                            <span>•</span>
                            <span style={{ fontWeight: '600', color: 'var(--status-warning)' }}>
                              {getDaysRemaining(req.endDate)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                        <RentalTimer endDateStr={req.endDate} />
                        {(() => {
                          const today = getTodayString();
                          const hasStarted = today >= req.startDate;
                          return (
                            <button
                              type="button"
                              onClick={() => setReturnTarget(req)}
                              disabled={!hasStarted}
                              title={!hasStarted ? `Rental has not started yet (starts ${formatDisplayDate(req.startDate)})` : 'Mark Returned'}
                              className="btn btn-outline"
                              style={{ fontSize: '12px', padding: '4px 10px', minHeight: '32px', opacity: !hasStarted ? 0.6 : 1, cursor: !hasStarted ? 'not-allowed' : 'pointer' }}
                            >
                              <CheckSquare size={14} /> {!hasStarted ? `Starts on ${formatDisplayDate(req.startDate)}` : 'Mark Returned'}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* BORROWING CARD LIST (Currently borrowed by me) */}
          <div className="card" style={{ padding: '20px' }}>
            <h3
              style={{
                fontSize: '16px',
                color: 'var(--text-secondary)',
                borderBottom: '1px solid var(--border-color)',
                margin: '0 -20px 16px -20px',
                padding: '0 20px 12px 20px'
              }}
            >
              Items I Am Currently Borrowing
            </h3>

            {activeBorrowings.length === 0 ? (
              <div style={{ padding: '20px 0 8px 0', textAlign: 'left' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
                  You are not currently borrowing any items.
                </p>
                {onNavigatePage && (
                  <button
                    type="button"
                    onClick={() => onNavigatePage('browse')}
                    className="btn btn-primary"
                    style={{ fontSize: '13px' }}
                  >
                    Browse Available Items
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeBorrowings.map((req) => {
                  const item = req.item || { name: 'Item', images: [] };
                  const lender = req.lender || { name: 'Lender', avatarUrl: '' };
                  const rawImg = item.images && item.images.length > 0 ? item.images[0] : null;
                  const itemImg = rawImg ? resolveImageUrl(rawImg) : fallbackImg;

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
                        border: '1px solid var(--border-color)',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <img
                          src={itemImg}
                          alt={item.name}
                          style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                          onError={(e) => {
                            e.currentTarget.src = fallbackImg;
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 2px 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <User size={13} style={{ flexShrink: 0 }} />
                            <span>Lender: </span>
                            <button
                              type="button"
                              onClick={() => onViewUser && onViewUser(lender.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                fontWeight: '600',
                                color: 'var(--secondary-color)',
                                cursor: 'pointer'
                              }}
                            >
                              {lender.name}
                            </button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            <Calendar size={12} />
                            <span>Due: {formatDisplayDate(req.endDate)}</span>
                            <span>•</span>
                            <span style={{ fontWeight: '600', color: 'var(--status-warning)' }}>
                              {getDaysRemaining(req.endDate)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                        <RentalTimer endDateStr={req.endDate} />
                        {(() => {
                          const today = getTodayString();
                          const hasStarted = today >= req.startDate;
                          return (
                            <button
                              type="button"
                              onClick={() => setReturnTarget(req)}
                              disabled={!hasStarted}
                              title={!hasStarted ? `Rental has not started yet (starts ${formatDisplayDate(req.startDate)})` : 'Return Item'}
                              className="btn btn-outline"
                              style={{ fontSize: '12px', padding: '4px 10px', minHeight: '32px', opacity: !hasStarted ? 0.6 : 1, cursor: !hasStarted ? 'not-allowed' : 'pointer' }}
                            >
                              <CheckSquare size={14} /> {!hasStarted ? `Starts on ${formatDisplayDate(req.startDate)}` : 'Return Item'}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Accessible Confirmation Modal */}
      <ConfirmModal
        isOpen={!!returnTarget}
        title="Confirm Item Return"
        message={`Are you sure the rental for "${returnTarget?.item?.name || 'this item'}" is complete and returned in good condition?`}
        confirmText="Confirm Return"
        cancelText="Keep Active"
        isLoading={isSubmitting}
        onConfirm={handleReturnConfirm}
        onCancel={() => setReturnTarget(null)}
      />
    </>
  );
}
