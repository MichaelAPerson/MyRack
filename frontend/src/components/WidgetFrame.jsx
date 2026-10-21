import Icon from './Icons';

// Every widget is a frosted-glass card. In edit mode it grows an iOS/Umbrel-style
// remove badge in the corner and can be dragged/resized.
export default function WidgetFrame({ title, eyebrow, status, editMode, onRemove, children }) {
  return (
    <div className="card">
      {editMode && (
        <button
          type="button"
          className="remove-badge widget-remove"
          onClick={onRemove}
          aria-label={`Remove ${title} widget`}
          title="Remove widget"
        >
          <Icon name="x" size={12} strokeWidth={3} />
        </button>
      )}
      <div className="card__header">
        <span className="card__icon" aria-hidden="true">
          <Icon name="server" size={18} />
        </span>
        <div className="card__titleblock">
          <span className="card__title">{title}</span>
          {eyebrow && <span className="card__eyebrow">{eyebrow}</span>}
        </div>
        {status && (
          <span className={`chip chip--${status}`}>
            <span className="dot" aria-hidden="true" />
            {status === 'online' ? 'Online' : 'Offline'}
          </span>
        )}
      </div>
      <div className="card__body">{children}</div>
    </div>
  );
}
