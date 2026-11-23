import type { Clinical, Side } from '../lib/types';

export interface StarterTemplate { key: string; name: string; icon: string; followUpDays: number; clinical: Clinical }
export const t = (key: string, name: string, icon: string, followUpDays: number, c: Partial<Clinical> & { diagnosis: string; advice: string[] }, side: Side = 'N/A'): StarterTemplate => ({
  key, name, icon, followUpDays,
  clinical: { complaint: '', side, notes: '', examination: '', investigations: '', ...c },
});

