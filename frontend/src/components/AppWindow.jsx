import { useEffect } from 'react';
import AppIcon from './AppIcon';
import Icon from './Icons';

// An embedded app opens in a window floating above the home screen, with the
// dock still visible underneath - the same feel as launching an app in UmbrelOS.
export default function AppWindow({ app, onClose }) {
  const { url, title } = app.config || {};

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="appwin-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="appwin" role="dialog" aria-modal="true" aria-label={title || url}>
        <div className="appwin__bar">
          <AppIcon url={url} title={title} size={30} />
          <span className="appwin__title">{title || url}</span>
          <span className="appwin__hint">Blank? Some sites block embedding —</span>
          <a className="btn btn--small" href={url} target="_blank" rel="noreferrer">
            <Icon name="external" size={14} /> Open in new tab
          </a>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close app">
            <Icon name="x" size={18} />
          </button>
        </div>
        <iframe src={url} title={title || url} className="appwin__frame" />
      </div>
    </div>
  );
}
