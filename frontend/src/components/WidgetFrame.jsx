import './widget-frame.css';

// Every widget on the board is dressed as a rack-mounted unit: a faceplate
// header with mounting-screw dots at each corner, an uppercase equipment
// label, a status LED, and the body underneath. This is the one visual
// idea the whole dashboard is built around.
export default function WidgetFrame({ title, eyebrow, led, onRemove, children, bodyPadding = true }) {
  return (
    <div className="widget-frame">
      <div className="widget-frame__header widget-drag-handle">
        <span className="widget-frame__screw" aria-hidden="true" />
        <div className="widget-frame__titleblock">
          {eyebrow && <span className="widget-frame__eyebrow">{eyebrow}</span>}
          <span className="widget-frame__title">{title}</span>
        </div>
        <div className="widget-frame__headerRight">
          {led && <span className={`led led--${led}`} aria-hidden="true" />}
          <button
            type="button"
            className="widget-frame__remove"
            onClick={onRemove}
            aria-label={`Remove ${title} widget`}
            title="Remove widget"
          >
            ×
          </button>
        </div>
        <span className="widget-frame__screw" aria-hidden="true" />
      </div>
      <div className={`widget-frame__body ${bodyPadding ? 'widget-frame__body--padded' : ''}`}>{children}</div>
    </div>
  );
}
