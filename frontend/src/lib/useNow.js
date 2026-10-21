import { useEffect, useState } from 'react';

// Re-render on a fixed interval with the current Date (clocks, "today" highlighting, etc.)
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
