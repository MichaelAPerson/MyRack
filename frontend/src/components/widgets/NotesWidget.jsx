import { useCallback, useEffect, useRef, useState } from 'react';
import MiniCard from './MiniCard';

// Typing is debounced into a single save, and any pending text is flushed if the
// widget unmounts, so nothing is lost by navigating away mid-edit.
export default function NotesWidget({ config, onConfigChange, editMode, onRemove }) {
  const [text, setText] = useState(config.text || '');
  const timer = useRef(null);
  const pending = useRef(null);
  const configRef = useRef(config);
  const saveRef = useRef(onConfigChange);

  // Keep refs pointing at the latest props so a flush from a timer/unmount saves current data.
  useEffect(() => {
    configRef.current = config;
    saveRef.current = onConfigChange;
  });

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (pending.current !== null) {
      saveRef.current({ ...configRef.current, text: pending.current });
      pending.current = null;
    }
  }, []);

  useEffect(() => flush, [flush]);

  const change = (value) => {
    setText(value);
    pending.current = value;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  };

  return (
    <MiniCard label="Notes" tone="note" editMode={editMode} onRemove={onRemove}>
      <textarea
        className="notes"
        value={text}
        onChange={(e) => change(e.target.value)}
        onBlur={flush}
        placeholder="Jot something down…"
        spellCheck={false}
      />
    </MiniCard>
  );
}
