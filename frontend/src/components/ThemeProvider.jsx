import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ThemeContext } from '../lib/themeContext';
import { DEFAULT_THEME_ID, PRESETS, buildTokens, sanitizeSpec } from '../lib/themes';

const KEY_ACTIVE = 'myrack.theme';
const KEY_CUSTOM = 'myrack.themes.custom';

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // storage can be blocked (private mode etc.)
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore - theme just won't persist
  }
}

function loadCustom() {
  try {
    const parsed = JSON.parse(read(KEY_CUSTOM) || '[]');
    return Array.isArray(parsed) ? parsed.map((t) => sanitizeSpec(t)) : [];
  } catch {
    return [];
  }
}

export default function ThemeProvider({ children }) {
  const [customs, setCustoms] = useState(loadCustom);
  const [activeId, setActiveId] = useState(() => read(KEY_ACTIVE) || DEFAULT_THEME_ID);
  // While the theme editor is open, the whole UI previews the draft without saving it.
  const [preview, setPreview] = useState(null);

  const themes = useMemo(() => [...PRESETS, ...customs], [customs]);
  const active = themes.find((t) => t.id === activeId) || PRESETS[0];
  const built = useMemo(() => buildTokens(preview || active), [preview, active]);

  // Apply before paint so there's no flash of the wrong theme.
  useLayoutEffect(() => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(built.vars)) root.style.setProperty(k, v);
    root.dataset.ui = built.ui;
    root.dataset.font = built.font;
    root.dataset.meters = built.meters;
  }, [built]);

  useEffect(() => write(KEY_ACTIVE, active.id), [active.id]);

  const saveCustom = useCallback((spec) => {
    const clean = sanitizeSpec(spec, spec);
    setCustoms((prev) => {
      const next = prev.some((t) => t.id === clean.id) ? prev.map((t) => (t.id === clean.id ? clean : t)) : [...prev, clean];
      write(KEY_CUSTOM, JSON.stringify(next));
      return next;
    });
    setActiveId(clean.id);
    return clean.id;
  }, []);

  const deleteCustom = useCallback((id) => {
    setCustoms((prev) => {
      const next = prev.filter((t) => t.id !== id);
      write(KEY_CUSTOM, JSON.stringify(next));
      return next;
    });
    setActiveId((cur) => (cur === id ? DEFAULT_THEME_ID : cur));
  }, []);

  const value = useMemo(
    () => ({ themes, active, activeId: active.id, setActiveId, setPreview, saveCustom, deleteCustom, meters: built.meters, ui: built.ui }),
    [themes, active, built, saveCustom, deleteCustom]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
