import Icon from '../Icons';

// Shared glass shell for the small built-in widgets. `label` is the small caps
// title; `bare` drops it for widgets (like the analog clock) that want every pixel.
export default function MiniCard({ label, aside, bare, tone, editMode, onRemove, children }) {
  return (
    <div className={`card card--mini ${tone ? `card--${tone}` : ''}`}>
      {editMode && (
        <button
          type="button"
          className="remove-badge widget-remove"
          onClick={onRemove}
          aria-label={`Remove ${label || 'widget'}`}
          title="Remove widget"
        >
          <Icon name="x" size={12} strokeWidth={3} />
        </button>
      )}
      {!bare && (
        <div className="mini-label">
          <span>{label}</span>
          {aside}
        </div>
      )}
      <div className="mini-body">{children}</div>
    </div>
  );
}
