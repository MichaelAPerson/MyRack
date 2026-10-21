// Catalogue of the ready-made widgets. 'stats' (device) and 'iframe' (app) are
// handled separately by the Add dialog; everything here is a one-click widget.
export const MINI_WIDGETS = [
  { type: 'clock', label: 'Clock', desc: 'Digital time and date', icon: 'digital', tone: 'linear-gradient(145deg,#8f7dff,#5a46ee)', w: 3, h: 4, minW: 2, minH: 3, config: { hour12: true } },
  { type: 'analog', label: 'Analog clock', desc: 'Classic clock face', icon: 'clock', tone: 'linear-gradient(145deg,#6f7a94,#3d4560)', w: 3, h: 5, minW: 2, minH: 4, config: {} },
  { type: 'calendar', label: 'Calendar', desc: 'Month view with today', icon: 'calendar', tone: 'linear-gradient(145deg,#ff8fb1,#e0466f)', w: 3, h: 7, minW: 3, minH: 6, config: {} },
  { type: 'todo', label: 'To-do', desc: 'Saved task list', icon: 'todo', tone: 'linear-gradient(145deg,#36d6b2,#0f9aa8)', w: 3, h: 7, minW: 3, minH: 5, config: { items: [] } },
  { type: 'notes', label: 'Notes', desc: 'Sticky note, auto-saved', icon: 'note', tone: 'linear-gradient(145deg,#ffd66b,#f2a62b)', w: 3, h: 6, minW: 2, minH: 4, config: { text: '' } },
  { type: 'weather', label: 'Weather', desc: 'Current conditions and 5-day forecast', icon: 'weather', tone: 'linear-gradient(145deg,#56b6c2,#317ca8)', w: 3, h: 5, minW: 2, minH: 4, config: {} },
  { type: 'countdown', label: 'Countdown', desc: 'Days until a date', icon: 'hourglass', tone: 'linear-gradient(145deg,#b58bff,#7a4be0)', w: 3, h: 4, minW: 2, minH: 3, config: {} },
  { type: 'overview', label: 'Rack overview', desc: 'Average load across devices', icon: 'activity', tone: 'linear-gradient(145deg,#5eb0ff,#2f6fe0)', w: 4, h: 6, minW: 3, minH: 4, config: {} },
];

export const WIDGET_META = Object.fromEntries(MINI_WIDGETS.map((m) => [m.type, m]));
