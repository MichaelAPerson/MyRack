import GridLayout, { WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import StatsWidget from './widgets/StatsWidget';
import IframeWidget from './widgets/IframeWidget';

const ResponsiveGrid = WidthProvider(GridLayout);

export default function DashboardGrid({ widgets, devices, onLayoutCommit, onRemoveWidget, onAddWidget }) {
  const layout = widgets.map((w) => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h, minW: 2, minH: 3 }));
  const deviceById = Object.fromEntries(devices.map((d) => [d.id, d]));

  const handleDragOrResizeStop = (newLayout) => {
    newLayout.forEach((item) => {
      const widget = widgets.find((w) => w.id === item.i);
      if (!widget) return;
      if (widget.x !== item.x || widget.y !== item.y || widget.w !== item.w || widget.h !== item.h) {
        onLayoutCommit(widget.id, { x: item.x, y: item.y, w: item.w, h: item.h });
      }
    });
  };

  if (widgets.length === 0) {
    return (
      <div className="empty-board">
        <p className="empty-board__title">The board is empty.</p>
        <p className="empty-board__hint">Add a widget to watch a device's stats, or embed anything by URL.</p>
        <button type="button" className="btn btn--amber" onClick={onAddWidget}>
          + Add widget
        </button>
      </div>
    );
  }

  return (
    <ResponsiveGrid
      className="layout"
      cols={12}
      rowHeight={32}
      margin={[14, 14]}
      draggableHandle=".widget-drag-handle"
      onDragStop={handleDragOrResizeStop}
      onResizeStop={handleDragOrResizeStop}
      layout={layout}
      compactType="vertical"
    >
      {widgets.map((widget) => (
        <div key={widget.id}>
          {widget.type === 'stats' ? (
            <StatsWidget device={deviceById[widget.config?.deviceId]} onRemove={() => onRemoveWidget(widget.id)} />
          ) : (
            <IframeWidget widget={widget} onRemove={() => onRemoveWidget(widget.id)} />
          )}
        </div>
      ))}
    </ResponsiveGrid>
  );
}
