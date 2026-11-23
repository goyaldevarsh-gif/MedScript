/** The Comorbidities box is free text. "No diabetes", "not pregnant", "non-diabetic", "pregnancy test negative"
 *  must not switch a condition ON, so negated phrases are dropped before any rule reads the text.
 *  Only clear negations are dropped; "not well controlled diabetes" and "non-insulin dependent diabetes" stay. */
export function affirmed(raw: string): string {
  const t = (raw || '').toLowerCase().replace(/h\s*\/\s*o/g, 'ho');
  return t.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).filter((seg) => {
    if (/^(no|nil|without|denies|denied|never)\b/.test(seg)) return false;
    if (/^not\s+(?:a\s+|known\s+|currently\s+)*(?:pregnan\w*|diabet\w*|hypertens\w*|asthma\w*|lactat\w*|breast\s?feed\w*|on\b)/.test(seg)) return false;
    if (/\bnon[\s-]*(?:diabetic|hypertensive|asthmatic|pregnant|lactating)\b/.test(seg)) return false;
    if (/\b(?:negative|neg|ruled out|excluded)\b|(?:^|\s)-ve\b/.test(seg)) return false;
    return true;
  }).join(', ');
}
