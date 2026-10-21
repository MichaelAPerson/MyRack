import Modal from './Modal';
import Icon from './Icons';
import Logo from './Logo';
import { useState } from 'react';
import { useTheme } from '../lib/themeContext';
import { cloneAsCustom } from '../lib/themes';
import ThemeCard from './ThemeCard';
import ThemeEditor from './ThemeEditor';

const HEADER_ITEM_OPTIONS = [
  { value: 'greeting', label: 'Time-based greeting' },
  { value: 'username', label: 'Username' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'weather', label: 'Weather' },
  { value: 'deviceStatus', label: 'Device status' },
  { value: 'custom', label: 'Custom text' },
];

function HeaderContentRow({ label, items, onChange }) {
  const updateItem = (index, patch) => onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  const moveItem = (index, offset) => {
    const next = [...items];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
  };

  return (
    <div className="header-content-row">
      <div className="header-content-row__heading">
        <span className="settings-row__label">{label}</span>
        <button type="button" className="btn btn--small" onClick={() => onChange([...items, { type: 'custom', text: '' }])}>
          Add item
        </button>
      </div>
      {items.length === 0 && <p className="settings-row__hint">No items shown. Add one to this row.</p>}
      {items.map((item, index) => (
        <div className="header-content-item" key={`${item.type}-${index}`}>
          <select
            className="input"
            aria-label={`${label} item ${index + 1} type`}
            value={item.type}
            onChange={(event) => updateItem(index, { type: event.target.value })}
          >
            {HEADER_ITEM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {item.type === 'custom' && (
            <input
              className="input"
              aria-label={`${label} item ${index + 1} text`}
              value={item.text || ''}
              onChange={(event) => updateItem(index, { text: event.target.value })}
              placeholder="Write anything"
              maxLength={120}
            />
          )}
          <div className="header-content-item__actions">
            <button type="button" className="btn btn--small" disabled={index === 0} onClick={() => moveItem(index, -1)} aria-label={`Move ${label} item ${index + 1} up`}>Up</button>
            <button type="button" className="btn btn--small" disabled={index === items.length - 1} onClick={() => moveItem(index, 1)} aria-label={`Move ${label} item ${index + 1} down`}>Down</button>
            <button type="button" className="btn btn--small" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${label} item ${index + 1}`}>Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SettingsSheet({
  username,
  headerContent,
  onHeaderContentChange,
  hubVersion,
  notificationsEnabled,
  onEnableNotifications,
  onLogout,
  onClose,
}) {
  const { themes, active, activeId, setActiveId, saveCustom, deleteCustom } = useTheme();
  const [editor, setEditor] = useState(null); // { spec, isNew } while the theme editor is open

  const notifSupported = typeof Notification !== 'undefined';
  const notifDenied = notifSupported && Notification.permission === 'denied';

  if (editor) {
    return (
      <Modal title={editor.isNew ? 'New theme' : 'Edit theme'} onClose={onClose} width={640}>
        <ThemeEditor
          initial={editor.spec}
          isNew={editor.isNew}
          onCancel={() => setEditor(null)}
          onSave={(spec) => {
            saveCustom(spec);
            setEditor(null);
          }}
          onDelete={() => {
            if (confirm(`Delete the theme "${editor.spec.name}"?`)) {
              deleteCustom(editor.spec.id);
              setEditor(null);
            }
          }}
        />
      </Modal>
    );
  }

  return (
    <Modal title="Settings" onClose={onClose} width={620}>
      <section className="settings-section">
        <h3 className="settings-section__title">Account</h3>
        <div className="settings-row">
          <div className="settings-row__text">
            <span className="settings-row__label">{username || 'Admin'}</span>
            <span className="settings-row__hint">Signed in to this hub</span>
          </div>
          <button type="button" className="btn btn--small" onClick={onLogout}>
            <Icon name="logout" size={14} /> Log out
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__title">Home header</h3>
        <p className="settings-row__hint">Choose what appears in the large line and the line beneath it. Items appear in order.</p>
        <HeaderContentRow
          label="Headline"
          items={headerContent.title}
          onChange={(title) => onHeaderContentChange({ ...headerContent, title })}
        />
        <HeaderContentRow
          label="Line below"
          items={headerContent.subtitle}
          onChange={(subtitle) => onHeaderContentChange({ ...headerContent, subtitle })}
        />
        <label className="header-weather-location">
          <span className="settings-row__label">Weather city</span>
          <input
            className="input"
            value={headerContent.weatherLocation}
            onChange={(event) => onHeaderContentChange({ ...headerContent, weatherLocation: event.target.value })}
            placeholder="e.g. London"
            aria-label="Weather city for the home header"
          />
          <span className="settings-row__hint">Used when Weather is added to either line.</span>
        </label>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__title">Alerts</h3>
        <div className="settings-row">
          <div className="settings-row__text">
            <span className="settings-row__label">Browser notifications</span>
            <span className="settings-row__hint">
              {notifDenied
                ? 'Blocked by your browser - allow notifications for this site to turn them on.'
                : 'Get notified when a device goes offline or its CPU spikes.'}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={notificationsEnabled}
            aria-label="Browser notifications"
            className={`switch ${notificationsEnabled ? 'switch--on' : ''}`}
            disabled={!notifSupported || notifDenied || notificationsEnabled}
            onClick={onEnableNotifications}
            title={notificationsEnabled ? 'Enabled - manage in your browser site settings' : 'Enable notifications'}
          >
            <span className="switch__knob" />
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__title">Theme</h3>
        <div className="theme-grid">
          {themes.map((t) => (
            <ThemeCard key={t.id} spec={t} active={t.id === activeId} onSelect={() => setActiveId(t.id)}>
              {!t.builtIn && (
                <button
                  type="button"
                  className="theme-card__edit"
                  onClick={() => setEditor({ spec: t, isNew: false })}
                  aria-label={`Edit ${t.name}`}
                  title="Edit theme"
                >
                  <Icon name="edit" size={13} />
                </button>
              )}
            </ThemeCard>
          ))}
          <div className="theme-card-wrap">
            <button
              type="button"
              className="theme-card theme-card--new"
              onClick={() => setEditor({ spec: cloneAsCustom(active), isNew: true })}
            >
              <span className="theme-card__preview">
                <Icon name="plus" size={26} />
              </span>
              <span className="theme-card__name">Create theme</span>
            </button>
          </div>
        </div>
      </section>

      <section className="settings-section settings-about" aria-label="About MyRack">
        <div className="settings-about__logo">
          <Logo size={30} />
        </div>
        <div className="settings-about__content">
          <div className="settings-about__heading">
            <h3 className="settings-about__name">MyRack</h3>
            <span className="settings-about__version">Hub {hubVersion ? `v${hubVersion}` : ''}</span>
          </div>
          <p className="settings-about__tagline">Self-hosted. Your data stays on your machines.</p>
        </div>
        <a
          className="settings-about__link"
          href="https://myrack.ct.ws"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit MyRack website"
        >
          <span>myrack.ct.ws</span>
          <Icon name="external" size={14} />
        </a>
      </section>

    </Modal>
  );
}
