// Builds the generated extension files with a fresh random per-build channel token:
//   extension/main.js     MAIN-world script (src/defaults.js + src/main/*.js in an IIFE)
//   extension/bridge.js   isolated-world bridge
//   extension/defaults.js shared defaults (copied)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => readFileSync(join(root, ...p), 'utf8');
const out = (name, text) => writeFileSync(join(root, 'extension', name), text);
const token = randomBytes(8).toString('hex');
const stamp = (s) => s.replaceAll('__SH_TOKEN__', token);

const defaults = read('src', 'defaults.js');
const dir = join(root, 'src', 'main');
const files = ['core.js', ...readdirSync(dir).filter((f) => f !== 'core.js' && f.endsWith('.js')).sort()];
const body = files.map((f) => `// ---- ${f}\n${read('src', 'main', f)}`).join('\n');

out('main.js', stamp(`(() => {\n'use strict';\n${defaults}\n${body}\n})();\n`));
out('bridge.js', stamp(read('src', 'bridge.js')));
out('defaults.js', defaults);

for (const f of ['main.js', 'bridge.js', 'defaults.js', 'background.js', 'popup.js', 'options.js', 'ui.js']) {
  execFileSync(process.execPath, ['--check', join(root, 'extension', f)]);
}
console.log(`built (token ${token}): main.js [${files.join(', ')}], bridge.js, defaults.js`);
