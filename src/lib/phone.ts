/** Indian mobile numbers print as +91-XXXXXXXXXX; landlines / other formats are left as typed. */
export function fmtMobile(raw: string): string {
  const s = (raw || '').trim(); if (!s) return '';
  let d = s.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && /^0[6-9]/.test(d)) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? '+91-' + d : s;
}
export const phoneList = (primary: string, more?: string[]) => [primary, ...(more || [])].map(fmtMobile).filter(Boolean);
