import { useEffect, useState } from 'react';
import GridLayout, { WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import StatsWidget from './widgets/StatsWidget';
import ClockWidget from './widgets/ClockWidget';
import AnalogClockWidget from './widgets/AnalogClockWidget';
import CalendarWidget from './widgets/CalendarWidget';
import TodoWidget from './widgets/TodoWidget';
import NotesWidget from './widgets/NotesWidget';
import WeatherWidget from './widgets/WeatherWidget';
import CountdownWidget from './widgets/CountdownWidget';
import OverviewWidget from './widgets/OverviewWidget';
import { WIDGET_META } from '../lib/widgetTypes';

const ResponsiveGrid = WidthProvider(GridLayout);
const NARROW_QUERY = '(max-width: 760px)';

function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    const onChange = (e) => setNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

function renderWidget(widget, { deviceById, devices, editMode, onRemove, onConfigChange }) {
  const common = {
    config: widget.config || {},
    editMode,
    onRemove,
    onConfigChange: (config) => onConfigChange(widget.id, config),
  };
  switch (widget.type) {
    case 'clock':
      return <ClockWidget {...common} />;
    case 'analog':
      return <AnalogClockWidget {...common} />;
    case 'calendar':
      return <CalendarWidget {...common} />;
    case 'todo':
      return <TodoWidget {...common} />;
    case 'notes':
      return <NotesWidget {...common} />;
    case 'weather':
    case 'stopwatch':
      return <WeatherWidget {...common} />;
    case 'countdown':
      return <CountdownWidget {...common} />;
    case 'overview':
      return <OverviewWidget devices={devices} editMode={editMode} onRemove={onRemove} />;
    default:
      return <StatsWidget device={deviceById[widget.config?.deviceId]} editMode={editMode} onRemove={onRemove} />;
  }
}

export default function DashboardGrid({ widgets, devices, editMode, onLayoutCommit, onRemoveWidget, onConfigChange }) {
  const narrow = useNarrow();
  const deviceById = Object.fromEntries(devices.map((d) => [d.id, d]));

  // On phones every widget becomes full width and stacks; that arrangement is
  // display-only and never written back to the saved desktop layout.
  let layout;
  if (narrow) {
    let y = 0;
    layout = [...widgets]
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((w) => {
        const item = { i: w.id, x: 0, y, w: 12, h: Math.max(w.h, 4), static: true };
        y += item.h;
        return item;
      });
  } else {
    layout = widgets.map((w) => {
      const meta = WIDGET_META[w.type];
      return { i: w.id, x: w.x, y: w.y, w: w.w, h: w.h, minW: meta?.minW ?? 3, minH: meta?.minH ?? 4 };
    });
  }

  const handleDragOrResizeStop = (newLayout) => {
    if (narrow) return;
    newLayout.forEach((item) => {
      const widget = widgets.find((w) => w.id === item.i);
      if (!widget) return;
      if (widget.x !== item.x || widget.y !== item.y || widget.w !== item.w || widget.h !== item.h) {
        onLayoutCommit(widget.id, { x: item.x, y: item.y, w: item.w, h: item.h });
      }
    });
  };

  return (
    <div className={`widget-grid ${editMode ? 'is-editing' : ''}`}>
      <ResponsiveGrid
        className="layout"
        cols={12}
        rowHeight={32}
        margin={[18, 18]}
        containerPadding={[0, 0]}
        isDraggable={editMode && !narrow}
        isResizable={editMode && !narrow}
        draggableCancel=".widget-remove,button,input,textarea,select"
        onDragStop={handleDragOrResizeStop}
        onResizeStop={handleDragOrResizeStop}
        layout={layout}
        compactType="vertical"
      >
        {widgets.map((widget) => (
          <div key={widget.id}>
            {renderWidget(widget, {
              deviceById,
              devices,
              editMode,
              onRemove: () => onRemoveWidget(widget.id),
              onConfigChange,
            })}
          </div>
        ))}
      </ResponsiveGrid>
    </div>
  );
}
