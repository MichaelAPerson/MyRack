import { useState } from 'react';
import { formatRelativeTime } from '../lib/format';

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // navigator.clipboard requires a secure context, which plain http://<lan-ip>
      // typically is not. Fall back to the old textarea+execCommand trick.
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    return true;
  } catch {
    return false;
  }
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn--small"
      onClick={async () => {
        if (await copyToClipboard(text)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

function InstallPanel({ device, hubUrl }) {
  const [os, setOs] = useState('linux');
  const [manualOpen, setManualOpen] = useState(false);

  const linuxCmd = `curl -fsSL ${hubUrl}/install.sh | bash -s -- "${hubUrl}" "${device.apiKey}"`;
  const windowsCmd = `iwr ${hubUrl}/install.ps1 -OutFile install.ps1; powershell -ExecutionPolicy Bypass -File install.ps1 -HubUrl "${hubUrl}" -ApiKey "${device.apiKey}"`;
  const command = os === 'linux' ? linuxCmd : windowsCmd;

  const manualConfig = JSON.stringify({ hubUrl, apiKey: device.apiKey, intervalSeconds: 5 }, null, 2);

  return (
    <div className="install-panel">
      <p className="install-panel__intro">
        Run this on <strong>{device.name}</strong> to install and start the agent in one step:
      </p>

      <div className="segmented segmented--compact">
        <button
          type="button"
          className={`segmented__option ${os === 'linux' ? 'segmented__option--active' : ''}`}
          onClick={() => setOs('linux')}
        >
          Linux / macOS
        </button>
        <button
          type="button"
          className={`segmented__option ${os === 'windows' ? 'segmented__option--active' : ''}`}
          onClick={() => setOs('windows')}
        >
          Windows
        </button>
      </div>

      <pre className="install-panel__code">{command}</pre>
      <div className="install-panel__row">
        <CopyButton text={command} label="Copy command" />
        {os === 'windows' && <span className="install-panel__hint">Run from an elevated PowerShell to also register it at startup.</span>}
      </div>

      <p className="install-panel__caveat">
        Piping a script straight into bash/PowerShell requires trusting it. You can also{' '}
        <a href={os === 'linux' ? `${hubUrl}/install.sh` : `${hubUrl}/install.ps1`} target="_blank" rel="noreferrer">
          open the script
        </a>{' '}
        to read it first, then run it locally instead of piping.
      </p>

      <button type="button" className="install-panel__manualToggle" onClick={() => setManualOpen((v) => !v)}>
        {manualOpen ? '\u2212' : '+'} Prefer to set it up by hand?
      </button>
      {manualOpen && (
        <div className="install-panel__manual">
          <p className="install-panel__intro">
            Copy the <code>agent/</code> folder to the device, run <code>npm install</code>, save this as its{' '}
            <code>config.json</code>, then <code>npm start</code>:
          </p>
          <pre className="install-panel__code">{manualConfig}</pre>
          <CopyButton text={manualConfig} label="Copy config" />
        </div>
      )}
    </div>
  );
}

export default function DeviceDrawer({ devices, apiKeys, hubVersion, onClose, onAddDevice, onDeleteDevice, onRotateKey }) {
  const [name, setName] = useState('');
  const [revealedId, setRevealedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rotating, setRotating] = useState(null);
  const hubUrl = `${window.location.protocol}//${window.location.host}`;

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const device = await onAddDevice(name.trim());
      setName('');
      setRevealedId(device.id);
    } finally {
      setBusy(false);
    }
  };

  const rotateAndReveal = async (deviceId) => {
    setRotating(deviceId);
    try {
      await onRotateKey(deviceId);
    } finally {
      setRotating(null);
    }
  };

  return (
    <div className="drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Devices">
        <div className="drawer__header">
          <span className="modal__title">Devices</span>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="drawer__addForm" onSubmit={submit}>
          <input
            type="text"
            placeholder="Device name, e.g. Plex Server"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
          <button type="submit" className="btn btn--amber" disabled={busy || !name.trim()}>
            Add
          </button>
        </form>

        <div className="drawer__list">
          {devices.length === 0 && <p className="empty-note">No devices yet. Add one above to get an install command.</p>}
          {devices.map((device) => {
            const versionMismatch = device.agentVersion && hubVersion && device.agentVersion !== hubVersion;
            const cachedKey = apiKeys[device.id];
            return (
              <div className="device-row" key={device.id}>
                <div className="device-row__main">
                  <span className={`led ${device.online ? 'led--online' : 'led--offline'}`} aria-hidden="true" />
                  <div className="device-row__text">
                    <div className="device-row__name">{device.name}</div>
                    <div className="device-row__meta">
                      {device.hostname ? `${device.hostname} · ` : ''}
                      {device.online ? 'online' : `last seen ${formatRelativeTime(device.lastSeen)}`}
                      {versionMismatch && (
                        <span className="device-row__versionWarn" title="Agent and hub versions differ - things should still work, but consider updating">
                          {' '}
                          · agent v{device.agentVersion} ≠ hub v{hubVersion}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="device-row__actions">
                  <button type="button" className="btn btn--small" onClick={() => setRevealedId(revealedId === device.id ? null : device.id)}>
                    {revealedId === device.id ? 'Hide setup' : 'Setup'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--small btn--danger"
                    onClick={() => {
                      if (confirm(`Remove ${device.name}? This deletes its history too.`)) onDeleteDevice(device.id);
                    }}
                  >
                    Remove
                  </button>
                </div>
                {revealedId === device.id && (
                  <div className="device-row__expand">
                    {cachedKey ? (
                      <InstallPanel device={{ ...device, apiKey: cachedKey }} hubUrl={hubUrl} />
                    ) : (
                      <div className="install-panel">
                        <p className="empty-note">
                          For security, the hub doesn't keep this device's API key around after it was first shown to
                          you - if you navigated away or reloaded since adding it, it's gone from this dashboard too
                          (the agent still has it and keeps working fine). Rotate to issue a new one and get a fresh
                          setup command - just remember to re-run the install command on the device afterward, since
                          its old key will stop working.
                        </p>
                        <button type="button" className="btn btn--small" disabled={rotating === device.id} onClick={() => rotateAndReveal(device.id)}>
                          {rotating === device.id ? 'Rotating…' : 'Rotate key & show setup'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
