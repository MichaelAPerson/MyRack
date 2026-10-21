import AppIcon from './AppIcon';
import Icon from './Icons';

// Embedded sites / self-hosted tools live here as app icons, like the Umbrel home screen.
export default function AppGrid({ apps, editMode, onOpen, onRemove, onAdd }) {
  const sorted = [...apps].sort((a, b) => a.y - b.y || a.x - b.x);

  return (
    <div className={`app-grid ${editMode ? 'is-editing' : ''}`}>
      {sorted.map((app, i) => {
        const { url, title } = app.config || {};
        const name = title || url;
        return (
          <div className="app-tile" key={app.id} style={{ '--i': i }}>
            <button
              type="button"
              className="app-tile__btn"
              onClick={() => !editMode && onOpen(app)}
              title={editMode ? name : `Open ${name}`}
            >
              <AppIcon url={url} title={title} size={72} />
              <span className="app-tile__name">{name}</span>
            </button>
            {editMode && (
              <button
                type="button"
                className="remove-badge"
                onClick={() => onRemove(app.id)}
                aria-label={`Remove ${name}`}
                title="Remove"
              >
                <Icon name="x" size={12} strokeWidth={3} />
              </button>
            )}
          </div>
        );
      })}

      {!editMode && (
        <div className="app-tile">
          <button type="button" className="app-tile__btn" onClick={onAdd} title="Add app or widget">
            <span className="app-icon app-icon--add" style={{ width: 72, height: 72, borderRadius: 'calc(72px * var(--tile-radius))' }}>
              <Icon name="plus" size={28} />
            </span>
            <span className="app-tile__name">Add</span>
          </button>
        </div>
      )}
    </div>
  );
}
