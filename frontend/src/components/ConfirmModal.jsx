import { useEffect, useRef } from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel
}) {
  const modalRef = useRef(null);
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus confirm button on open
    setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onCancel();
      }}
    >
      <div
        ref={modalRef}
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          padding: '24px',
          position: 'relative'
        }}
      >
        <button
          onClick={onCancel}
          disabled={isLoading}
          aria-label="Close dialog"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div
            style={{
              padding: '10px',
              borderRadius: '12px',
              backgroundColor: isDestructive ? 'rgba(239, 68, 68, 0.15)' : 'var(--accent-color-light)',
              color: isDestructive ? '#ef4444' : 'var(--accent-color)',
              flexShrink: 0
            }}
          >
            <AlertCircle size={24} />
          </div>

          <div style={{ flex: 1 }}>
            <h3
              id="confirm-modal-title"
              style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}
            >
              {title}
            </h3>
            <p
              id="confirm-modal-desc"
              style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}
            >
              {message}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            {cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={isDestructive ? 'btn' : 'btn btn-primary'}
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: isDestructive ? '#ef4444' : undefined,
              color: isDestructive ? '#fff' : undefined,
              border: isDestructive ? 'none' : undefined
            }}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
