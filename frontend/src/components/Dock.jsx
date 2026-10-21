import { useEffect, useRef, useState } from 'react';
import Icon from './Icons';

function DockItem({ icon, label, active, onClick }) {
  return (
    <button
      type="button"
      className={`nav-menu__item ${active ? 'nav-menu__item--active' : ''}`}
      onClick={onClick}
      role="menuitem"
    >
      <Icon name={icon} size={19} />
      <span>{label}</span>
    </button>
  );
}

export default function Dock({ view, editMode, onHome, onDevices, onAdd, onToggleEdit, onSettings }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnPointerDown);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const runAction = (action) => {
    action();
    setOpen(false);
  };

  return (
    <div className="nav-menu" ref={menuRef}>
      <button
        type="button"
        className="nav-menu__trigger"
        aria-label="Open navigation menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name={open ? 'x' : 'menu'} size={21} />
      </button>
      {open && (
        <nav className="nav-menu__panel" aria-label="Main navigation" role="menu">
          <DockItem icon="home" label="Home" active={view === 'home'} onClick={() => runAction(onHome)} />
          <DockItem icon="server" label="Devices" active={view === 'devices'} onClick={() => runAction(onDevices)} />
          <DockItem icon="plus" label="Add" onClick={() => runAction(onAdd)} />
          <DockItem
            icon={editMode ? 'check' : 'edit'}
            label={editMode ? 'Done editing' : 'Edit home'}
            active={editMode}
            onClick={() => runAction(onToggleEdit)}
          />
          <DockItem icon="settings" label="Settings" active={view === 'settings'} onClick={() => runAction(onSettings)} />
        </nav>
      )}
    </div>
  );
}
