// Static server for the film. Serves the repo root, transpiling .ts on the fly with
// Node's built-in type stripper so the browser gets plain ESM. No bundler, no build step,
// no HMR: a file saved during a render can never reload the page.
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.ts': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff2': 'font/woff2',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

const tsCache = new Map();

function transpile(src, file, mtimeMs) {
  // keyed by path *and* mtime: an edited file must never be served from the cache
  const hit = tsCache.get(file);
  if (hit && hit.mtimeMs === mtimeMs) return hit.code;
  let code;
  try {
    code = stripTypeScriptTypes(src, { mode: 'strip', sourceUrl: file });
  } catch (e) {
    code = `throw new Error(${JSON.stringify('TS strip failed in ' + file + ': ' + e.message)});`;
  }
  tsCache.set(file, { code, mtimeMs });
  return code;
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let p = decodeURIComponent(url.pathname);
      if (p === '/') p = '/web/index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('no'); return; }
      let src;
      try {
        src = await fsp.readFile(file, 'utf8');
      } catch {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('404 ' + p);
        return;
      }
      const ext = path.extname(file);
      if (ext === '.ts') {
        const st = await fsp.stat(file);
        res.writeHead(200, { 'content-type': MIME['.ts'], 'cache-control': 'no-store' });
        res.end(transpile(src, file, st.mtimeMs));
        return;
      }
      if (ext === '.json') {
        res.writeHead(200, { 'content-type': MIME['.json'], 'cache-control': 'no-store' });
        res.end(src);
        return;
      }
      const bin = await fsp.readFile(file);
      res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(bin);
    } catch (e) {
      res.writeHead(500); res.end(String(e));
    }
  });
}

export function serve(port = 5177) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.listen(port, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('serve.mjs')) {
  const port = +(process.argv[2] || 5177);
  const { port: p } = await serve(port);
  console.log(`beyond-one preview  http://127.0.0.1:${p}/  (?t=12  ?scene=limit  ?scale=2)`);
}
