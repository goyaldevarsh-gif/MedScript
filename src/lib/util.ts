export const uid = (): string =>
  (crypto as any).randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
export const fmtDate = (t: number | string | Date) => {
  const d = new Date(t);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const fmtDateTime = (t: number) =>
  new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
export const isToday = (t: number) => new Date(t).toDateString() === new Date().toDateString();
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const toISODate = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
export function debounce<T extends (...a: any[]) => void>(fn: T, ms: number) {
  let h: any;
  const f = (...a: Parameters<T>) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); };
  (f as any).cancel = () => clearTimeout(h);
  return f as T & { cancel: () => void };
}
export async function sha256(text: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let h = 5381; for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return 'weak-' + (h >>> 0).toString(16);
  }
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9+ ]/g, ' ').replace(/\s+/g, ' ').trim();
