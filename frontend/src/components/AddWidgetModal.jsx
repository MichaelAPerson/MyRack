import { useState } from 'react';
import Modal from './Modal';

export default function AddWidgetModal({ devices, onClose, onCreate }) {
  const [type, setType] = useState(devices.length ? 'stats' : 'iframe');
  const [deviceId, setDeviceId] = useState(devices[0]?.id || '');
  const [iframeTitle, setIframeTitle] = useState('');
  const [iframeUrl, setIframeUrl] = useState('');

  const canSubmit = type === 'stats' ? !!deviceId : iframeUrl.trim().length > 0;

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (type === 'stats') {
      const device = devices.find((d) => d.id === deviceId);
      onCreate({ type: 'stats', w: 4, h: 6, config: { deviceId } , title: device?.name });
    } else {
      let url = iframeUrl.trim();
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      onCreate({ type: 'iframe', w: 5, h: 8, config: { url, title: iframeTitle.trim() || url } });
    }
  };

  return (
    <Modal title="Add widget" onClose={onClose}>
      <form onSubmit={submit} className="add-widget-form">
        <div className="segmented">
          <button
            type="button"
            className={`segmented__option ${type === 'stats' ? 'segmented__option--active' : ''}`}
            onClick={() => setType('stats')}
          >
            Device stats
          </button>
          <button
            type="button"
            className={`segmented__option ${type === 'iframe' ? 'segmented__option--active' : ''}`}
            onClick={() => setType('iframe')}
          >
            Iframe / embed
          </button>
        </div>

        {type === 'stats' ? (
          devices.length ? (
            <label className="field">
              <span className="field__label">Device</span>
              <select className="input" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="empty-note">No devices yet. Add a device first from the Devices panel.</p>
          )
        ) : (
          <>
            <label className="field">
              <span className="field__label">Title</span>
              <input
                className="input"
                placeholder="e.g. Router admin"
                value={iframeTitle}
                onChange={(e) => setIframeTitle(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">URL</span>
              <input
                className="input"
                placeholder="192.168.1.1 or https://..."
                value={iframeUrl}
                onChange={(e) => setIframeUrl(e.target.value)}
              />
            </label>
            <p className="field__hint">
              Some sites block being embedded in an iframe (X-Frame-Options). Self-hosted tools and most
              router/NAS admin pages on your LAN usually work fine.
            </p>
          </>
        )}

        <div className="modal__footer">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--amber" disabled={!canSubmit}>
            Add to board
          </button>
        </div>
      </form>
    </Modal>
  );
}
