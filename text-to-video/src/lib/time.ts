/** 75.4 → "01:15.4" */
export function formatTimecode(seconds: number, withTenths = true): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const base = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return withTenths ? `${base}.${Math.floor((safe % 1) * 10)}` : base;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export const formatSpeed = (speed: number): string => `${Number(speed.toFixed(2))}×`;
