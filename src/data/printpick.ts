import { norm } from '../lib/util';
import { splitTests, testKey, printTests } from './tests';

/** Everything the doctor records is kept with the patient. Each examination finding and each test can be left off the printed
 *  prescription by its key; the rest prints as before. */
export interface PickLine { key: string; text: string }

const pieces = (text: string) => (text || '').split(/[;\n]/).map((x) => x.trim()).filter((x) => x && !/:\s*$/.test(x));
export const examKey = (line: string) => norm(line.includes(':') ? line.slice(0, line.indexOf(':')).replace(/\(.*?\)/g, '') : line);

export function examLines(text: string): PickLine[] { return pieces(text).map((t) => ({ key: examKey(t), text: t })); }
export function testLines(value: string): PickLine[] { return splitTests(value).map((t) => ({ key: testKey(t), text: t })); }

export const printableExam = (text: string, hide: string[] = []) => examLines(text).filter((l) => !hide.includes(l.key)).map((l) => l.text).join('; ');
export const printableTests = (value: string, hide: string[] = []) => printTests(testLines(value).filter((l) => !hide.includes(l.key)).map((l) => l.text).join('; '));
export const toggleKey = (hide: string[] = [], key: string) => (hide.includes(key) ? hide.filter((k) => k !== key) : [...hide, key]);
