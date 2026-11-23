import type { Clinical, Side } from '../lib/types';

export interface StarterTemplate { key: string; name: string; icon: string; followUpDays: number; clinical: Clinical }
export const t = (key: string, name: string, icon: string, followUpDays: number, c: Partial<Clinical> & { diagnosis: string; advice: string[] }, side: Side = 'N/A'): StarterTemplate => ({
  key, name, icon, followUpDays,
  clinical: { complaint: '', side, notes: '', examination: '', investigations: '', ...c },
});


/** compact builder: exam = labels separated by |, investigations = tests separated by ; (no medicines are ever added by a template) */
export const e = (key: string, name: string, icon: string, fu: number, complaint: string, diagnosis: string, exam: string, inv: string, advice: string[], side: Side = 'N/A'): StarterTemplate =>
  t(key, name, icon, fu, { complaint, diagnosis, examination: exam.split('|').map((x) => x + ': ').join('\n'), investigations: inv, advice }, side);
export const RF_NERVE = 'Come back immediately if you develop new weakness, numbness or loss of grip or balance.';
export const RF_WOUND = 'Come back immediately for fever, wound redness or discharge, increasing pain or swelling, or numbness / colour change in the limb.';
export const RF_INJ = 'Come back immediately for severe pain, tight swelling, numbness, pale or blue fingers / toes, or if the cast feels too tight.';

