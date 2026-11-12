// Concatenates src/main/*.js (core first) into one MAIN-world script wrapped in an IIFE.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src', 'main');
const files = ['core.js', ...readdirSync(dir).filter((f) => f !== 'core.js' && f.endsWith('.js')).sort()];
const body = files.map((f) => `// ---- ${f}\n${readFileSync(join(dir, f), 'utf8')}`).join('\n');
writeFileSync(join(root, 'extension', 'main.js'), `(() => {\n'use strict';\n${body}\n})();\n`);
console.log(`built extension/main.js from ${files.join(', ')}`);
