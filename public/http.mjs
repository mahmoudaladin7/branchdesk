import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, join, sep, extname } from 'node:path';
import { normalizeRoot, scanWorkspace } from './git.mjs';
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};
const json = (res, status, data) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
};
export function createDashboardServer({ roots = [], staticDir, scan = scanWorkspace }) {
  const token = randomBytes(32).toString('hex');
  let rootList = [...roots],
    inflight = null;
  const refresh = () => {
    if (!inflight)
      inflight = scan([...rootList]).finally(() => {
        inflight = null;
      });
    return inflight;
  };
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    const port = server.address()?.port;
    const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
    if (!allowedHosts.has(req.headers.host)) {
      json(res, 403, { error: 'Invalid host.' });
      return;
    }
    const origin = req.headers.origin;
    if (origin && !new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]).has(origin)) {
      json(res, 403, { error: 'Cross-origin requests are not allowed.' });
      return;
    }
    if (req.headers['sec-fetch-site'] === 'cross-site') {
      json(res, 403, { error: 'Cross-site requests are not allowed.' });
      return;
    }
    let url;
    try {
      url = new URL(req.url, `http://127.0.0.1:${port}`);
    } catch {
      json(res, 400, { error: 'Invalid request.' });
      return;
    }
    try {
      if (url.pathname.startsWith('/api/')) {
        const supplied = req.headers['x-branchdesk-token'];
        if (
          typeof supplied !== 'string' ||
          Buffer.byteLength(supplied) !== Buffer.byteLength(token) ||
          !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))
        ) {
          json(res, 401, { error: 'Missing or invalid session token.' });
          return;
        }
        if (url.pathname === '/api/workspace' && req.method === 'GET') {
          json(res, 200, await refresh());
          return;
        }
        if (url.pathname === '/api/roots' && req.method === 'POST') {
          if (!req.headers['content-type']?.startsWith('application/json')) {
            json(res, 415, { error: 'Use application/json.' });
            return;
          }
          let body = '';
          for await (const chunk of req) {
            body += chunk;
            if (Buffer.byteLength(body) > 8192) {
              json(res, 413, { error: 'Request is too large.' });
              return;
            }
          }
          let payload;
          try {
            payload = JSON.parse(body);
          } catch {
            json(res, 400, { error: 'Invalid JSON.' });
            return;
          }
          let path;
          try {
            path = await normalizeRoot(payload.path);
          } catch (e) {
            json(res, 400, { error: e.message });
            return;
          }
          if (inflight) await inflight;
          if (!rootList.includes(path)) {
            if (rootList.length >= 20) {
              json(res, 400, { error: 'This session supports up to 20 root folders.' });
              return;
            }
            rootList.push(path);
          }
          json(res, 200, await refresh());
          return;
        }
        json(res, 404, { error: 'Unknown API route or method.' });
        return;
      }
      if (!['GET', 'HEAD'].includes(req.method)) {
        json(res, 405, { error: 'Method not allowed.' });
        return;
      }
      let pathname;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        json(res, 400, { error: 'Invalid URL encoding.' });
        return;
      }
      const path = resolve(staticDir, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!path.startsWith(resolve(staticDir) + sep)) {
        json(res, 403, { error: 'Invalid path.' });
        return;
      }
      let actual;
      try {
        actual = await realpath(path);
      } catch {
        json(res, 404, { error: 'Not found.' });
        return;
      }
      if (!actual.startsWith((await realpath(staticDir)) + sep) || !(await stat(actual)).isFile()) {
        json(res, 404, { error: 'Not found.' });
        return;
      }
      let data = await readFile(actual);
      const type = mime[extname(actual)] || 'application/octet-stream';
      if (actual === join(await realpath(staticDir), 'index.html'))
        data = Buffer.from(
          data
            .toString()
            .replace(
              '<head>',
              `<head><script>window.__BRANCHDESK__=${JSON.stringify({ token })}</script>`,
            ),
        );
      res.writeHead(200, {
        'Content-Type': type,
        'Cache-Control': extname(actual) === '.html' ? 'no-store' : 'public, max-age=3600',
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch {
      json(res, 500, { error: 'The workspace could not be read. Try refreshing.' });
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  return server;
}
