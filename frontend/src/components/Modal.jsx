import { useEffect } from 'react';

export default function Modal({ title, onClose, children, width = 480 }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__header">
          <span className="modal__title">{title}</span>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
