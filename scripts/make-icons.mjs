import sharp from 'sharp';
import fs from 'fs';
const mark = fs.readFileSync('public/logo-mark.svg', 'utf8')
  .replace(/<svg[^>]*>/, '').replace('</svg>', '').replace('url(#b)', '#FFFFFF').replace('url(#t)', '#5EEAD4');
function icon(size, pad, bg) {
  const s = size, inner = s * (1 - pad * 2);
  const w = inner, h = inner * (100 / 130);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2563EB"/><stop offset="1" stop-color="#10243A"/></linearGradient></defs>
  <rect width="${s}" height="${s}" ${bg ? `rx="${s * 0.22}"` : ''} fill="url(#g)"/>
  <g transform="translate(${(s - w) / 2} ${(s - h) / 2}) scale(${w / 130})">${mark}</g></svg>`);
}
await sharp(icon(192, 0.2, true)).png().toFile('public/icon-192.png');
await sharp(icon(512, 0.2, true)).png().toFile('public/icon-512.png');
await sharp(icon(512, 0.3, false)).png().toFile('public/icon-maskable-512.png');
console.log('icons done');
