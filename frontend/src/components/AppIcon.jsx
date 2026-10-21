import { useState } from 'react';

function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

function faviconFor(url) {
  try {
    return `${new URL(url).origin}/favicon.ico`;
  } catch {
    return null;
  }
}

// Rounded-square app icon. Tries the site's favicon first; if that's missing or
// blocked, falls back to a gradient tile with the first letter - always looks intentional.
export default function AppIcon({ url, title, size = 72 }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const label = (title || url || '?').trim();
  const hue = hashHue(label.toLowerCase());
  const src = faviconFor(url);
  const showImg = src && !failed;

  return (
    <span
      className="app-icon"
      style={{
        width: size,
        height: size,
        borderRadius: `calc(${size}px * var(--tile-radius))`,
        fontSize: size * 0.42,
        position: 'relative',
        background:
          showImg && loaded
            ? 'rgba(255,255,255,0.94)'
            : `linear-gradient(145deg, hsl(${hue} 78% 62%), hsl(${(hue + 40) % 360} 74% 46%))`,
      }}
    >
      {!(showImg && loaded) && label.charAt(0).toUpperCase()}
      {showImg && (
        <img
          src={src}
          alt=""
          draggable="false"
          style={{
            width: size * 0.56,
            height: size * 0.56,
            position: 'absolute',
            opacity: loaded ? 1 : 0,
          }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
