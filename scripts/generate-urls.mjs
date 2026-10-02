// Writes urls.csv -- the master list used for programming the NFC tags.
// Usage: node scripts/generate-urls.mjs https://fpe-archive.pages.dev [count]
import { writeFileSync } from 'node:fs';

const base = (process.argv[2] || '').replace(/\/+$/, '');
const count = parseInt(process.argv[3] || '100', 10);

if (!/^https:\/\/[^\s/]+$/.test(base)) {
  console.error('Usage: node scripts/generate-urls.mjs https://your-site.pages.dev [count]');
  process.exit(1);
}

const lines = ['designation,url'];
for (let n = 1; n <= count; n++) {
  const id = String(n).padStart(4, '0');
  lines.push(`FPE-${id},${base}/f/${id}`);
}

writeFileSync('urls.csv', lines.join('\n') + '\n');
console.log(`urls.csv written: ${count} rows, ${base}/f/0001 .. ${base}/f/${String(count).padStart(4, '0')}`);
