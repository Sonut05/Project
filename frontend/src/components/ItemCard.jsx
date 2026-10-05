import { Star, MapPin, Eye, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/useAuth.js';
import { resolveImageUrl, resolveAvatarUrl, ITEM_PLACEHOLDER, AVATAR_PLACEHOLDER } from '../utils/imageUrl.js';

export default function ItemCard({
  item,
  onView,
  onEdit,
  onRemove,
  onViewUser,
  isOwner = false
}) {
  const { user } = useAuth();

  const lender = item.lender || {
    id: item.lenderId,
    name: 'Neighbor',
    avatarUrl: '',
    rating: null
  };

  const isUserLender = user && user.id === item.lenderId;

  const displayRating = item.rating !== null && item.rating !== undefined ? item.rating : 'New';
  const reviewsCount = item.reviewsCount || 0;

  const getConditionColor = (cond) => {
    switch (cond) {
      case 'New':
        return '#D1FAE5';
      case 'Good':
        return '#DBEAFE';
      case 'Fair':
        return '#FEE2E2';
      default:
        return '#E2E8F0';
    }
  };

  const getConditionTextColor = (cond) => {
    switch (cond) {
      case 'New':
        return '#065F46';
      case 'Good':
        return '#1E40AF';
      case 'Fair':
        return '#991B1B';
      default:
        return '#475569';
    }
  };

  const rawImage = (item.images && item.images.length > 0 && item.images[0]) || null;
  const itemImg = resolveImageUrl(rawImage, ITEM_PLACEHOLDER);

  return (
    <article className="card" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Photo and category badges */}
      <div style={{ position: 'relative', width: '100%', height: '180px', overflow: 'hidden' }}>
        <img
          src={itemImg}
          alt={item.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            e.currentTarget.src = ITEM_PLACEHOLDER;
          }}
        />

        {/* Availability Badge */}
        <span
          className={`badge ${item.availability === 'Available' ? 'badge-success' : 'badge-danger'}`}
          style={{ position: 'absolute', top: '12px', left: '12px', boxShadow: 'var(--shadow-sm)' }}
        >
          {item.availability}
        </span>

        {/* Condition Badge */}
        <span
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            backgroundColor: getConditionColor(item.condition),
            color: getConditionTextColor(item.condition),
            padding: '4px 10px',
            fontSize: 'var(--text-xs)',
            fontWeight: '600',
            borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {item.condition}
        </span>
      </div>

      {/* Card Content body */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: '600' }}>
          {item.category}
        </span>
        <h3 style={{ fontSize: 'var(--text-lg)', margin: '6px 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {item.name}
        </h3>

        {/* Pickup Location Display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          <MapPin size={14} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {item.locationLabel || 'Local Area'}
          </span>
        </div>

        {/* Rating and Reviews */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          <Star size={16} fill="var(--status-warning)" color="var(--status-warning)" />
          <strong style={{ color: 'var(--text-primary)' }}>{displayRating}</strong>
          <span>({reviewsCount} {reviewsCount === 1 ? 'review' : 'reviews'})</span>
        </div>

        {/* Price & Deposit detail */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: 'auto' }}>
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block' }}>Daily rent</span>
            <strong style={{ fontSize: 'var(--text-xl)', color: 'var(--accent-color)', fontFamily: 'var(--font-display)' }}>
              ₹{item.dailyPrice}
            </strong>
          </div>
          {item.depositAmount > 0 && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block' }}>Refundable deposit</span>
              <strong style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>
                ₹{item.depositAmount}
              </strong>
            </div>
          )}
        </div>

        {/* Lender Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-primary)',
            padding: '12px',
            borderRadius: '12px',
            marginTop: '16px',
            border: '1px dashed var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isUserLender ? (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid var(--accent-color)'
                }}
              >
                <img
                  src={resolveAvatarUrl(lender.avatarUrl, AVATAR_PLACEHOLDER)}
                  alt={user?.name || 'You'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onViewUser && onViewUser(lender.id)}
                style={{
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
                aria-label={`View ${lender.name}'s profile`}
              >
                <img
                  src={resolveAvatarUrl(lender.avatarUrl, AVATAR_PLACEHOLDER)}
                  alt={lender.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.src = AVATAR_PLACEHOLDER;
                  }}
                />
              </button>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: '600' }}>Lender</span>
              {isUserLender ? (
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: '600',
                    color: 'var(--accent-color)'
                  }}
                >
                  You <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 'normal' }}>(Owner)</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onViewUser && onViewUser(lender.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 'var(--text-xs)',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {lender.name}
                </button>
              )}
            </div>
          </div>

          <div style={{ fontSize: 'var(--text-xs)', color: item.availability === 'Available' ? 'var(--status-success)' : 'var(--status-danger)', fontWeight: '600' }}>
            {item.availability}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          {isOwner && onEdit ? (
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                <Edit2 size={16} /> Edit
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="btn btn-outline"
                  style={{ minWidth: '44px', color: 'var(--status-danger)' }}
                  aria-label={`Delete ${item.name}`}
                  title="Delete item"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onView && onView(item.id)}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              <Eye size={16} /> {isOwner ? 'View Details' : 'View & Borrow'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
