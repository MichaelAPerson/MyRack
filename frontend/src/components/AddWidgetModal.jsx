import { useState } from 'react';
import Modal from './Modal';
import Icon from './Icons';
import { MINI_WIDGETS } from '../lib/widgetTypes';

export default function AddWidgetModal({ devices, onClose, onCreate }) {
  const [type, setType] = useState('gallery');
  const [deviceId, setDeviceId] = useState(devices[0]?.id || '');
  const [iframeTitle, setIframeTitle] = useState('');
  const [iframeUrl, setIframeUrl] = useState('');

  const canSubmit = type === 'stats' ? !!deviceId : iframeUrl.trim().length > 0;

  const addMini = (m) => onCreate({ type: m.type, w: m.w, h: m.h, config: m.config });

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (type === 'stats') {
      const device = devices.find((d) => d.id === deviceId);
      onCreate({ type: 'stats', w: 4, h: 7, config: { deviceId }, title: device?.name });
    } else {
      let url = iframeUrl.trim();
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      onCreate({ type: 'iframe', w: 5, h: 8, config: { url, title: iframeTitle.trim() || url } });
    }
  };

  return (
    <Modal title="Add to home" onClose={onClose} width={560}>
      <form onSubmit={submit} className="form">
        <div className="segmented">
          <button
            type="button"
            className={`segmented__option ${type === 'gallery' ? 'segmented__option--active' : ''}`}
            onClick={() => setType('gallery')}
          >
            Widgets
          </button>
          <button
            type="button"
            className={`segmented__option ${type === 'stats' ? 'segmented__option--active' : ''}`}
            onClick={() => setType('stats')}
          >
            Device
          </button>
          <button
            type="button"
            className={`segmented__option ${type === 'iframe' ? 'segmented__option--active' : ''}`}
            onClick={() => setType('iframe')}
          >
            App
          </button>
        </div>

        {type === 'gallery' ? (
          <div className="gallery">
            {MINI_WIDGETS.map((m) => (
              <button type="button" key={m.type} className="gallery__item" onClick={() => addMini(m)}>
                <span className="gallery__icon" style={{ background: m.tone }}>
                  <Icon name={m.icon} size={22} />
                </span>
                <span className="gallery__text">
                  <span className="gallery__name">{m.label}</span>
                  <span className="gallery__desc">{m.desc}</span>
                </span>
              </button>
            ))}
          </div>
        ) : type === 'stats' ? (
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
              <span className="field__label">Name</span>
              <input
                className="input"
                placeholder="e.g. Router admin"
                value={iframeTitle}
                onChange={(e) => setIframeTitle(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Address</span>
              <input
                className="input"
                placeholder="192.168.1.1:8080 or https://..."
                value={iframeUrl}
                onChange={(e) => setIframeUrl(e.target.value)}
              />
            </label>
            <p className="field__hint">
              Apps appear as icons on your home screen and open in a window. Some sites block being embedded
              (X-Frame-Options) — self-hosted tools and most router/NAS admin pages on your LAN work fine, and
              you can always open the app in a new tab.
            </p>
          </>
        )}

        {type !== 'gallery' && (
          <div className="form__footer">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
              {type === 'stats' ? 'Add widget' : 'Add app'}
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}
