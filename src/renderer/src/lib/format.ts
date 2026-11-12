export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value >= 100 || unit === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

export function shortHash(hash: string | null | undefined, length = 12): string {
  if (!hash) return "—";
  return hash.length <= length * 2 ? hash : `${hash.slice(0, length)}…${hash.slice(-6)}`;
}

export function timeAgo(value: string | null, locale: string): string {
  if (!value) return locale === "ru" ? "Ещё не играли" : "Never played";
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "—";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (minutes < 60) return formatter.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 48) return formatter.format(-hours, "hour");
  return formatter.format(-Math.round(hours / 24), "day");
}

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function percent(value: number): string {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}
