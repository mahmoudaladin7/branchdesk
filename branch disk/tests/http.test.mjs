import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm, symlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { once } from 'node:events';
import { createDashboardServer } from '../server/http.mjs';
async function setup(t) {
  const dir = await mkdtemp(join(tmpdir(), 'branchdesk-http-')),
    web = join(dir, 'web');
  await mkdir(web);
  await writeFile(join(web, 'index.html'), '<html><head></head><body>Branchdesk</body></html>');
  await writeFile(join(dir, 'secret.txt'), 'private');
  await symlink(join(dir, 'secret.txt'), join(web, 'linked.txt'));
  const server = createDashboardServer({
    staticDir: web,
    roots: [],
    scan: async (roots) => ({
      mode: 'local',
      roots,
      repositories: [],
      scannedAt: new Date().toISOString(),
      warnings: [],
    }),
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    await rm(dir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const html = await (await fetch(base)).text();
  const token = JSON.parse(html.match(/window\.__BRANCHDESK__=(.*?)<\/script>/)[1]).token;
  return { base, token, dir };
}
test('serves dashboard with a per-session token and requires it for repository data', async (t) => {
  const { base, token } = await setup(t);
  assert.equal((await fetch(base + '/api/workspace')).status, 401);
  const r = await fetch(base + '/api/workspace', { headers: { 'X-Branchdesk-Token': token } });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).mode, 'local');
  assert.equal(r.headers.get('cache-control'), 'no-store');
});
test('blocks foreign origins, DNS rebinding hosts and cross-site navigations', async (t) => {
  const { base, token } = await setup(t);
  for (const headers of [
    { Origin: 'https://evil.example' },
    { Host: 'evil.example' },
    { 'Sec-Fetch-Site': 'cross-site' },
  ]) {
    const status = await new Promise((resolve, reject) => {
      const req = request(
        base + '/api/workspace',
        { headers: { ...headers, 'X-Branchdesk-Token': token } },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      req.on('error', reject);
      req.end();
    });
    assert.equal(status, 403, JSON.stringify(headers));
  }
});
test('does not serve files outside the public directory or symlinks to them', async (t) => {
  const { base } = await setup(t);
  assert.notEqual((await fetch(base + '/%2e%2e%2fsecret.txt')).status, 200);
  assert.equal((await fetch(base + '/linked.txt')).status, 404);
  assert.equal((await fetch(base + '/%E0%A4%A')).status, 400);
});
test('adding a folder validates input and only changes the current session', async (t) => {
  const { base, token, dir } = await setup(t);
  const headers = { 'Content-Type': 'application/json', 'X-Branchdesk-Token': token };
  assert.equal(
    (await fetch(base + '/api/roots', { method: 'POST', headers, body: 'not json' })).status,
    400,
  );
  assert.equal(
    (
      await fetch(base + '/api/roots', {
        method: 'POST',
        headers,
        body: JSON.stringify({ path: dir + '/missing' }),
      })
    ).status,
    400,
  );
  const r = await fetch(base + '/api/roots', {
    method: 'POST',
    headers,
    body: JSON.stringify({ path: dir }),
  });
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).roots, [await realpath(dir)]);
});
