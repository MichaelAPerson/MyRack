import { useState } from 'react';
import MiniCard from './MiniCard';
import Icon from '../Icons';

// crypto.randomUUID needs a secure context, which plain http://<lan-ip> isn't.
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export default function TodoWidget({ config, onConfigChange, editMode, onRemove }) {
  const items = config.items || [];
  const [text, setText] = useState('');
  const doneCount = items.filter((i) => i.done).length;

  const save = (next) => onConfigChange({ ...config, items: next });

  const add = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    save([...items, { id: newId(), text: t, done: false }]);
    setText('');
  };

  return (
    <MiniCard
      label="To-do"
      editMode={editMode}
      onRemove={onRemove}
      aside={items.length > 0 && <span className="mini-count">{doneCount}/{items.length}</span>}
    >
      <div className="todo">
        <ul className="todo__list">
          {items.length === 0 && <li className="todo__empty">Nothing to do. Add a task below.</li>}
          {items.map((item) => (
            <li key={item.id} className={`todo__item ${item.done ? 'todo__item--done' : ''}`}>
              <button
                type="button"
                className="todo__check"
                role="checkbox"
                aria-checked={item.done}
                aria-label={item.text}
                onClick={() => save(items.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))}
              >
                {item.done && <Icon name="check" size={13} strokeWidth={3.2} />}
              </button>
              <span className="todo__text">{item.text}</span>
              <button
                type="button"
                className="todo__remove"
                aria-label={`Delete ${item.text}`}
                onClick={() => save(items.filter((i) => i.id !== item.id))}
              >
                <Icon name="x" size={14} />
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={add} className="todo__form">
          <input
            className="input input--sm"
            placeholder="Add a task…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
          />
        </form>
      </div>
    </MiniCard>
  );
}
