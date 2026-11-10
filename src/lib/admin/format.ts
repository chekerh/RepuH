const NUMBER = new Intl.NumberFormat("en-GB");

export function count(value: number): string {
  return NUMBER.format(value);
}

export function bytes(value: number | null): string {
  if (value === null) return "unavailable";
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = value / 1024;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[index] ?? "B"}`;
}

export function duration(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${Math.floor(totalSeconds % 60)}s`;
  return `${Math.floor(totalSeconds)}s`;
}

export function percent(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return `${((part / whole) * 100).toFixed(part === whole ? 0 : 1)}%`;
}

export function milliseconds(value: number): string {
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ms`;
}
