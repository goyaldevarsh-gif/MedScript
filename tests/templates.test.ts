import { describe, expect, it } from 'vitest';
import { STARTERS } from '../src/data/templates';

/** these words are notes to the doctor, not things to print on a prescription */
const META = /\b(only if|usually|if suspected|if persistent|if not improving|as advised|as needed|to exclude|clinical diagnosis|not needed|no routine|refer to|if needed|if any)\b|___/i;

describe('starter templates', () => {
  it('has unique keys, names and diagnoses', () => {
    expect(STARTERS.length).toBeGreaterThanOrEqual(251);
    for (const f of ['key', 'name'] as const) expect(new Set(STARTERS.map((s) => s[f])).size).toBe(STARTERS.length);
    const dx = STARTERS.map((s) => s.clinical.diagnosis); expect(new Set(dx).size).toBe(dx.length);
  });
  it('has a diagnosis, some advice and a sane follow-up for every template', () => {
    for (const s of STARTERS) {
      expect(s.clinical.diagnosis.trim(), s.key).not.toBe('');
      expect(s.clinical.advice.length, s.key).toBeGreaterThan(0);
      expect(s.followUpDays, s.key).toBeGreaterThanOrEqual(0); expect(s.followUpDays, s.key).toBeLessThanOrEqual(365);
    }
  });
  it('prints only real tests in Investigations (no notes to the doctor)', () => {
    for (const s of STARTERS) expect(s.clinical.investigations, `${s.key}: ${s.clinical.investigations}`).not.toMatch(META);
  });
  it('keeps diagnosis and complaint clean of blanks and alternatives', () => {
    for (const s of STARTERS) {
      expect(s.clinical.diagnosis, s.key).not.toMatch(/___|to be confirmed/i);
      expect(s.clinical.complaint, s.key).not.toMatch(/ \/ follow-up of /);
    }
  });
  it('never adds medicines on its own', () => {
    for (const s of STARTERS) expect((s as any).items ?? [], s.key).toHaveLength(0);
  });
});
