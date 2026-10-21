import { isHex, luminance, mix, readableOn, withAlpha } from './color';

// ---------------------------------------------------------------------------
// A theme is a small "spec". buildTokens() expands it into every CSS variable the
// UI uses, so built-in themes and user-made ones go through exactly the same path.
// ---------------------------------------------------------------------------

export const FONT_SETS = {
  modern: {
    label: 'Modern',
    font: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    display: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    meta: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    transform: 'none',
    spacing: '-0.02em',
  },
  industrial: {
    label: 'Industrial',
    font: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    display: "'Barlow Condensed', 'Arial Narrow', 'Inter', sans-serif",
    meta: "'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
    transform: 'uppercase',
    spacing: '0.05em',
  },
};

export const PRESETS = [
  {
    id: 'classic',
    name: 'MyRack Classic',
    builtIn: true,
    style: 'solid',
    meters: 'bars',
    font: 'industrial',
    primary: 'accent',
    base: '#0b0d10',
    glow1: '#ffb454',
    glow2: '#ffb454',
    glow3: '#ffb454',
    accent: '#ffb454',
    // Exact values from the original MyRack stylesheet
    overrides: {
      panel: '#15181d',
      raised: '#1b1f26',
      border: '#2a2f38',
      borderStrong: '#3a4150',
      text: '#e7e9ec',
      dim: '#8b92a0',
      faint: '#5b6270',
      green: '#4ade80',
      red: '#f66b6b',
      blue: '#5ec8f5',
      amber: '#ffb454',
      purple: '#a78bfa',
    },
  },
  { id: 'aurora', name: 'Aurora', builtIn: true, style: 'glass', meters: 'rings', font: 'modern', primary: 'neutral', base: '#120f33', glow1: '#6d4aff', glow2: '#0fb5d8', glow3: '#e04fb0', accent: '#8b7bff' },
  { id: 'dusk', name: 'Dusk', builtIn: true, style: 'glass', meters: 'rings', font: 'modern', primary: 'neutral', base: '#1b1030', glow1: '#ff8a4c', glow2: '#c2379d', glow3: '#5b2bd6', accent: '#ff8fb1' },
  { id: 'ocean', name: 'Ocean', builtIn: true, style: 'glass', meters: 'rings', font: 'modern', primary: 'neutral', base: '#08183a', glow1: '#1fa2d8', glow2: '#1b57c9', glow3: '#12c2a4', accent: '#5ec8f5' },
  { id: 'forest', name: 'Forest', builtIn: true, style: 'glass', meters: 'rings', font: 'modern', primary: 'neutral', base: '#08201c', glow1: '#2fae7b', glow2: '#1d7a8c', glow3: '#5aa13a', accent: '#3ddc97' },
  { id: 'sakura', name: 'Sakura', builtIn: true, style: 'glass', meters: 'rings', font: 'modern', primary: 'accent', base: '#2a0f1f', glow1: '#ff5c8a', glow2: '#b5179e', glow3: '#ff9e6d', accent: '#ff7aa8' },
  { id: 'midnight', name: 'Midnight', builtIn: true, style: 'glass', meters: 'rings', font: 'modern', primary: 'neutral', base: '#090b18', glow1: '#2c3563', glow2: '#3a2a6b', glow3: '#16304f', accent: '#8b9cff' },
  { id: 'graphite', name: 'Graphite', builtIn: true, style: 'glass', meters: 'rings', font: 'modern', primary: 'neutral', base: '#14161b', glow1: '#3b4252', glow2: '#2a2f3a', glow3: '#4c566a', accent: '#e5e9f0' },
  { id: 'nord', name: 'Nord', builtIn: true, style: 'solid', meters: 'bars', font: 'modern', primary: 'accent', base: '#2e3440', glow1: '#88c0d0', glow2: '#88c0d0', glow3: '#88c0d0', accent: '#88c0d0' },
  {
    id: 'terminal',
    name: 'Terminal',
    builtIn: true,
    style: 'solid',
    meters: 'bars',
    font: 'industrial',
    primary: 'accent',
    base: '#050805',
    glow1: '#22c55e',
    glow2: '#22c55e',
    glow3: '#22c55e',
    accent: '#4ade80',
    overrides: { panel: '#0a100c', raised: '#0f1912', border: '#1d3324', borderStrong: '#2b4d37', text: '#d4f5dc', dim: '#7fae8c', faint: '#4a6e55' },
  },
  { id: 'daylight', name: 'Daylight', builtIn: true, style: 'glass', meters: 'rings', font: 'modern', primary: 'accent', base: '#eaeeff', glow1: '#aebdff', glow2: '#ffc9e3', glow3: '#b6e8ff', accent: '#5b5bf0' },
];

export const DEFAULT_THEME_ID = 'classic';

const WHITE = '#ffffff';
const BLACK = '#000000';

export function buildTokens(spec) {
  const o = spec.overrides || {};
  const solid = spec.style === 'solid';
  const light = luminance(spec.base) > 0.4;
  const fonts = FONT_SETS[spec.font] || FONT_SETS.modern;
  const { base, accent } = spec;

  const status = light
    ? { green: '#12a36b', amber: '#d98200', red: '#e0364a', blue: '#2a7de1', purple: '#7a4be0' }
    : { green: '#3ddc97', amber: '#ffb84d', red: '#ff6370', blue: '#5eb0ff', purple: '#b58bff' };
  for (const k of Object.keys(status)) if (o[k]) status[k] = o[k];

  const text = o.text || (light ? '#17142b' : solid ? '#e7e9ec' : '#ffffff');
  const dim = o.dim || (light ? 'rgba(23, 20, 43, 0.64)' : solid ? 'rgba(231, 233, 236, 0.6)' : 'rgba(255, 255, 255, 0.66)');
  const faint = o.faint || (light ? 'rgba(23, 20, 43, 0.42)' : solid ? 'rgba(231, 233, 236, 0.38)' : 'rgba(255, 255, 255, 0.42)');

  // Surfaces ---------------------------------------------------------------
  let panel, raised, border, borderStrong, glass, glassHover, sheet, dockBg, dockBorder;
  if (solid) {
    panel = o.panel || (light ? mix(base, WHITE, 0.7) : mix(base, WHITE, 0.045));
    raised = o.raised || (light ? mix(base, WHITE, 0.4) : mix(base, WHITE, 0.075));
    border = o.border || (light ? mix(base, BLACK, 0.12) : mix(base, WHITE, 0.14));
    borderStrong = o.borderStrong || (light ? mix(base, BLACK, 0.22) : mix(base, WHITE, 0.22));
    glass = panel;
    glassHover = raised;
    sheet = panel;
    dockBg = panel;
    dockBorder = border;
  } else if (light) {
    panel = 'rgba(255, 255, 255, 0.55)';
    raised = 'rgba(255, 255, 255, 0.7)';
    border = 'rgba(255, 255, 255, 0.85)';
    borderStrong = 'rgba(24, 20, 48, 0.2)';
    glass = panel;
    glassHover = 'rgba(255, 255, 255, 0.78)';
    sheet = 'rgba(255, 255, 255, 0.84)';
    dockBg = 'rgba(255, 255, 255, 0.55)';
    dockBorder = 'rgba(255, 255, 255, 0.85)';
  } else {
    panel = 'rgba(255, 255, 255, 0.09)';
    raised = 'rgba(255, 255, 255, 0.12)';
    border = 'rgba(255, 255, 255, 0.14)';
    borderStrong = 'rgba(255, 255, 255, 0.24)';
    glass = panel;
    glassHover = 'rgba(255, 255, 255, 0.15)';
    sheet = withAlpha(mix(base, WHITE, 0.05), 0.78);
    dockBg = 'rgba(255, 255, 255, 0.12)';
    dockBorder = 'rgba(255, 255, 255, 0.18)';
  }

  // Background -------------------------------------------------------------
  const wallpaper = solid
    ? `radial-gradient(circle at 50% 0%, ${withAlpha(spec.glow1, light ? 0.16 : 0.06)}, transparent 60%), ${base}`
    : `radial-gradient(60% 55% at 12% 8%, ${spec.glow1} 0%, transparent 62%),
       radial-gradient(55% 55% at 92% 18%, ${spec.glow2} 0%, transparent 62%),
       radial-gradient(70% 60% at 72% 100%, ${spec.glow3} 0%, transparent 64%),
       radial-gradient(60% 60% at 0% 100%, ${mix(base, spec.glow1, 0.5)} 0%, transparent 62%), ${base}`;
  const wallOverlay =
    !solid && !light
      ? 'linear-gradient(to bottom, rgba(8, 5, 24, 0.12), rgba(8, 5, 24, 0.38))'
      : 'linear-gradient(transparent, transparent)';

  // Buttons ----------------------------------------------------------------
  const neutral = spec.primary === 'neutral';
  const primaryBg = neutral ? (light ? '#17142b' : '#ffffff') : accent;
  const primaryText = neutral ? (light ? '#ffffff' : '#1b1640') : readableOn(accent);
  const primaryHover = neutral ? (light ? '#2d2950' : '#eceaff') : mix(accent, WHITE, 0.2);

  // Dock -------------------------------------------------------------------
  const accentIsLight = luminance(accent) > 0.5;
  const homeTile = `linear-gradient(145deg, ${accentIsLight ? mix(accent, BLACK, 0.35) : mix(accent, WHITE, 0.2)}, ${mix(accent, BLACK, accentIsLight ? 0.55 : 0.25)})`;
  const dock = solid
    ? { home: raised, devices: raised, add: raised, edit: raised, settings: raised, icon: accent }
    : {
        home: homeTile,
        devices: 'linear-gradient(145deg, #36d6b2, #0f9aa8)',
        add: 'linear-gradient(145deg, #ff8fb1, #e0466f)',
        edit: 'linear-gradient(145deg, #ffc15a, #f2802b)',
        settings: 'linear-gradient(145deg, #6f7a94, #444d66)',
        icon: '#ffffff',
      };

  const vars = {
    '--accent': accent,
    '--accent-text': readableOn(accent),
    '--accent-soft': withAlpha(accent, 0.16),
    '--selection': withAlpha(accent, 0.45),
    '--fg-rgb': light ? '24, 20, 48' : '255, 255, 255',
    '--color-scheme': light ? 'light' : 'dark',

    '--text': text,
    '--text-dim': dim,
    '--text-faint': faint,
    '--text-shadow': !solid && !light ? '0 2px 24px rgba(0, 0, 0, 0.28)' : 'none',

    '--green': status.green,
    '--amber': status.amber,
    '--red': status.red,
    '--blue': status.blue,
    '--purple': status.purple,

    '--bg-base': base,
    '--wallpaper': wallpaper,
    '--wall-overlay': wallOverlay,

    '--panel': panel,
    '--panel-raised': raised,
    '--glass': glass,
    '--glass-hover': glassHover,
    '--glass-border': border,
    '--border-strong': borderStrong,
    '--sheet': sheet,
    '--dock-bg': dockBg,
    '--dock-border': dockBorder,
    '--shadow': solid
      ? '0 1px 0 rgba(255, 255, 255, 0.02)'
      : light
        ? '0 12px 34px rgba(70, 70, 130, 0.16)'
        : '0 12px 40px rgba(8, 5, 30, 0.3)',

    '--primary-bg': primaryBg,
    '--primary-text': primaryText,
    '--primary-hover': primaryHover,

    '--dock-home': dock.home,
    '--dock-devices': dock.devices,
    '--dock-add': dock.add,
    '--dock-edit': dock.edit,
    '--dock-settings': dock.settings,
    '--dock-icon': dock.icon,

    '--logo-a': mix(accent, WHITE, 0.2),
    '--logo-b': mix(accent, BLACK, 0.25),
    '--logo-bar': readableOn(accent),

    '--font': fonts.font,
    '--font-display': fonts.display,
    '--font-meta': fonts.meta,
    '--display-transform': fonts.transform,
    '--display-spacing': fonts.spacing,

    // Shape: round & soft for glass, small & square for the flat "rack panel" look
    '--r-card': solid ? '6px' : '30px',
    '--r-sheet': solid ? '10px' : '32px',
    '--r-dock': solid ? '8px' : '30px',
    '--r-dockitem': solid ? '6px' : '17px',
    '--r-btn': solid ? '6px' : '999px',
    '--r-input': solid ? '6px' : '14px',
    '--r-input-round': solid ? '6px' : '999px',
    '--r-row': solid ? '6px' : '22px',
    '--r-small': solid ? '4px' : '14px',
    '--r-pill': solid ? '4px' : '999px',
    '--r-icon': solid ? '6px' : '50%',
    '--tile-radius': solid ? '0.14' : '0.26',
  };

  return { vars, ui: solid ? 'solid' : 'glass', font: spec.font, meters: spec.meters, light };
}

// ---------------------------------------------------------------------------
// Custom themes live in localStorage; anything loaded from there is sanitised so a
// hand-edited or corrupt entry can never break the UI.
// ---------------------------------------------------------------------------

export function sanitizeSpec(raw, fallback = PRESETS[1]) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const color = (v, d) => (isHex(v) ? v : d);
  const pick = (v, allowed, d) => (allowed.includes(v) ? v : d);
  return {
    id: typeof s.id === 'string' && s.id ? s.id : `custom-${Date.now().toString(36)}`,
    name: typeof s.name === 'string' && s.name.trim() ? s.name.trim().slice(0, 28) : 'My theme',
    builtIn: false,
    style: pick(s.style, ['glass', 'solid'], fallback.style),
    meters: pick(s.meters, ['rings', 'bars'], fallback.meters),
    font: pick(s.font, ['modern', 'industrial'], fallback.font),
    primary: pick(s.primary, ['accent', 'neutral'], fallback.primary),
    base: color(s.base, fallback.base),
    glow1: color(s.glow1, fallback.glow1),
    glow2: color(s.glow2, fallback.glow2),
    glow3: color(s.glow3, fallback.glow3),
    accent: color(s.accent, fallback.accent),
  };
}

// Editor starting point: copy of a theme, minus the exact-match overrides, as a new custom theme.
export function cloneAsCustom(spec) {
  return sanitizeSpec({ ...spec, id: undefined, name: spec.builtIn ? `${spec.name} copy` : spec.name }, spec);
}
