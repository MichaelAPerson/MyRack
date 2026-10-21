// Small stroke icon set (Feather-style). Inline so there's no icon dependency.
const PATHS = {
  home: (
    <>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  server: (
    <>
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <path d="M7 7.5h.01M7 16.5h.01" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  edit: <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  settings: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />,
  logout: <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  digital: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="3.5" />
      <path d="M8 10.5v3M12 10.5v3M16 10.5v3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  todo: (
    <>
      <path d="M10 6h10M10 12h10M10 18h10" />
      <path d="M3.5 6l1.3 1.3L7 5M3.5 12l1.3 1.3L7 11M3.5 18l1.3 1.3L7 17" />
    </>
  ),
  note: (
    <>
      <path d="M5 4h14a1 1 0 011 1v10l-5 5H5a1 1 0 01-1-1V5a1 1 0 011-1z" />
      <path d="M15 20v-4a1 1 0 011-1h4" />
    </>
  ),
  weather: (
    <>
      <circle cx="17" cy="7" r="3" />
      <path d="M17 1v2M17 11v2M11 7h2M21 7h2M12.8 4.8l1.4 1.4M19.8 11.8l1.4 1.4M19.8 2.8l-1.4 1.4M12.8 9.8l1.4-1.4" />
      <path d="M7 19h11a4 4 0 000-8 5.5 5.5 0 00-10.5-1.5A4.8 4.8 0 007 19z" />
    </>
  ),
  hourglass: (
    <path d="M6 3h12M6 21h12M7 3v3.5a5 5 0 002 4L12 12l-3 1.5a5 5 0 00-2 4V21M17 3v3.5a5 5 0 01-2 4L12 12l3 1.5a5 5 0 012 4V21" />
  ),
  activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  'chevron-left': <path d="M15 6l-6 6 6 6" />,
  'chevron-right': <path d="M9 6l6 6-6 6" />,
  bell: <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />,
};

export default function Icon({ name, size = 24, strokeWidth = 1.9 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
