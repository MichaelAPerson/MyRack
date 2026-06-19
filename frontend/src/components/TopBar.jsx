export default function TopBar({
  devices,
  username,
  notificationsEnabled,
  onEnableNotifications,
  onOpenDevices,
  onAddWidget,
  onLogout,
}) {
  const onlineCount = devices.filter((d) => d.online).length;

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__logoDot" aria-hidden="true" />
        <span className="topbar__wordmark">MYRACK</span>
      </div>

      <div className="topbar__status">
        <span className={`led ${onlineCount > 0 ? 'led--green' : 'led--red'}`} aria-hidden="true" />
        <span className="topbar__statusText">
          {onlineCount}/{devices.length} online
        </span>
      </div>

      <div className="topbar__actions">
        {!notificationsEnabled && (
          <button type="button" className="btn" onClick={onEnableNotifications} title="Get a browser notification when a device goes offline or CPU spikes">
            Enable alerts
          </button>
        )}
        <button type="button" className="btn" onClick={onOpenDevices}>
          Devices
        </button>
        <button type="button" className="btn btn--amber" onClick={onAddWidget}>
          + Add widget
        </button>
        {username && (
          <div className="topbar__user">
            <span className="topbar__username">{username}</span>
            <button type="button" className="btn btn--small" onClick={onLogout}>
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
