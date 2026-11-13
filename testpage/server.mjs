// Zero-dependency static server for the test page: node server.mjs [port] (default 43130)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || process.env.PORT || 43130);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const allowed = new Set(['index.html', 'app.js']);

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let name = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '') || 'index.html';
  if (!allowed.has(name)) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('not found'); }
  try {
    const body = await readFile(join(root, name));
    res.writeHead(200, {
      'content-type': types[extname(name)] || 'application/octet-stream',
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'self'; style-src 'unsafe-inline'; frame-src 'self'",
      'referrer-policy': 'no-referrer',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(500, { 'content-type': 'text/plain' }); res.end('error');
  }
}).listen(port, '0.0.0.0', () => console.log(`still-here test page on :${port}`));
