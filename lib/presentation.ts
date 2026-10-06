import type { Repository } from './types';
export const github = 'https://github.com/mahmoudaladin7/branchdesk';
export const colors: Record<string, string> = {
  TypeScript: '#a7a0fa',
  JavaScript: '#e1c66e',
  Go: '#7bc5d3',
  MDX: '#e0b67f',
  Markdown: '#e0b67f',
  Python: '#8abb9e',
  Astro: '#dca3c5',
  Rust: '#d59e85',
  Other: '#a8a8b6',
};
export function relative(date: string | null) {
  if (!date) return 'No commits yet';
  const m = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  return m < 1
    ? 'Just now'
    : m < 60
      ? `${m}m ago`
      : m < 1440
        ? `${Math.floor(m / 60)}h ago`
        : `${Math.floor(m / 1440)}d ago`;
}
export function stored<T>(key: string, fallback: T): T {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    if (Array.isArray(fallback))
      return (
        Array.isArray(value) && value.every((v) => typeof v === 'string') ? value : fallback
      ) as T;
    return (typeof value === typeof fallback ? value : fallback) as T;
  } catch {
    return fallback;
  }
}
export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Preferences are optional in restricted browsers. */
  }
}
export function needsAttention(r: Repository) {
  return !!(r.changes.length || r.ahead || r.behind || r.error);
}
