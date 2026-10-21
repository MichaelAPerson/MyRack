import { useEffect, useState } from 'react';
import { useTheme } from '../lib/themeContext';
import { PRESETS, sanitizeSpec } from '../lib/themes';
import { hexToRgb, isHex, rgbToHex } from '../lib/color';
import { ThemeSwatch } from './ThemeCard';

const norm = (hex) => rgbToHex(hexToRgb(hex)); // #abc -> #aabbcc (what <input type=color> needs)

function ColorField({ label, value, onChange }) {
  const [draft, setDraft] = useState(null); // text being typed (may be invalid mid-edit)
  const shown = draft ?? value;
  const bad = draft !== null && !isHex(draft);

  return (
    <div className="color-field">
      <span className="field__label">{label}</span>
      <div className="color-field__control">
        <span className="color-field__swatch" style={{ background: value }}>
          <input type="color" value={norm(value)} onChange={(e) => onChange(e.target.value)} aria-label={`${label} colour`} />
        </span>
        <input
          className={`color-field__hex ${bad ? 'color-field__hex--bad' : ''}`}
          value={shown}
          maxLength={7}
          spellCheck={false}
          aria-label={`${label} hex value`}
          onChange={(e) => {
            const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
            setDraft(v);
            if (isHex(v)) onChange(norm(v));
          }}
          onBlur={() => setDraft(null)}
        />
      </div>
    </div>
  );
}

function Choice({ label, value, options, onChange }) {
  return (
    <div className="theme-editor__group">
      <span className="field__label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            className={`segmented__option ${value === v ? 'segmented__option--active' : ''}`}
            onClick={() => onChange(v)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ThemeEditor({ initial, isNew, onSave, onCancel, onDelete }) {
  const { setPreview, themes } = useTheme();
  const [spec, setSpec] = useState(initial);
  const set = (patch) => setSpec((s) => ({ ...s, ...patch }));
  const solid = spec.style === 'solid';

  // Live-preview the whole UI while editing; always clean up so nothing leaks if the sheet closes.
  useEffect(() => {
    setPreview(sanitizeSpec(spec, spec));
  }, [spec, setPreview]);
  useEffect(() => () => setPreview(null), [setPreview]);

  const basedOn = (id) => {
    const t = themes.find((x) => x.id === id);
    if (!t) return;
    set({ style: t.style, meters: t.meters, font: t.font, primary: t.primary, base: t.base, glow1: t.glow1, glow2: t.glow2, glow3: t.glow3, accent: t.accent });
  };

  const submit = (e) => {
    e.preventDefault();
    onSave(sanitizeSpec(spec, spec));
  };

  return (
    <form className="theme-editor" onSubmit={submit}>
      <ThemeSwatch spec={sanitizeSpec(spec, spec)} className="theme-editor__swatch" />

      <div className="theme-editor__row">
        <label className="field" style={{ margin: 0 }}>
          <span className="field__label">Name</span>
          <input className="input" value={spec.name} maxLength={28} onChange={(e) => set({ name: e.target.value })} placeholder="My theme" />
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span className="field__label">Start from</span>
          <select className="input" value="" onChange={(e) => basedOn(e.target.value)}>
            <option value="" disabled>
              Copy a theme…
            </option>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="theme-editor__row">
        <Choice label="Panels" value={spec.style} onChange={(v) => set({ style: v })} options={[['glass', 'Glass'], ['solid', 'Flat']]} />
        <Choice label="Gauges" value={spec.meters} onChange={(v) => set({ meters: v })} options={[['rings', 'Rings'], ['bars', 'Bars']]} />
        <Choice label="Typeface" value={spec.font} onChange={(v) => set({ font: v })} options={[['modern', 'Modern'], ['industrial', 'Industrial']]} />
        <Choice label="Buttons" value={spec.primary} onChange={(v) => set({ primary: v })} options={[['accent', 'Accent'], ['neutral', 'Neutral']]} />
      </div>

      <div className="color-fields">
        <ColorField label="Background" value={spec.base} onChange={(v) => set({ base: v })} />
        <ColorField label="Accent" value={spec.accent} onChange={(v) => set({ accent: v })} />
        <ColorField label={solid ? 'Top glow' : 'Glow · top left'} value={spec.glow1} onChange={(v) => set({ glow1: v })} />
        {!solid && <ColorField label="Glow · top right" value={spec.glow2} onChange={(v) => set({ glow2: v })} />}
        {!solid && <ColorField label="Glow · bottom" value={spec.glow3} onChange={(v) => set({ glow3: v })} />}
      </div>

      <p className="field__hint" style={{ margin: 0 }}>
        The whole dashboard is previewing your changes live. Themes are saved in this browser. Light backgrounds
        automatically switch to dark text.
      </p>

      <div className="form__footer" style={{ justifyContent: 'space-between' }}>
        <div>
          {!isNew && (
            <button type="button" className="btn btn--danger" onClick={onDelete}>
              Delete
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={!spec.name.trim()}>
            {isNew ? 'Save theme' : 'Save changes'}
          </button>
        </div>
      </div>
    </form>
  );
}
