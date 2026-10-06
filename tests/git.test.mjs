import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  parseStatus,
  safeRemote,
  readRepository,
  scanWorkspace,
  normalizeRoot,
} from '../server/git.mjs';
const exec = promisify(execFile);
async function run(cwd, ...args) {
  return (
    await exec('git', [
      '-c',
      'user.name=Test Developer',
      '-c',
      'user.email=test@example.invalid',
      '-c',
      'commit.gpgsign=false',
      '-C',
      cwd,
      ...args,
    ])
  ).stdout;
}
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'branchdesk-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function init(path) {
  await mkdir(path, { recursive: true });
  await run(path, 'init', '-b', 'main');
}
async function commit(path, message = 'First commit') {
  await run(path, 'add', '.');
  await run(path, 'commit', '-m', message);
}

test('parses status records including newlines, renames, conflicts and branch counts', () => {
  const text = [
    '# branch.head feature/test',
    '# branch.upstream origin/main',
    '# branch.ab +3 -2',
    '# stash 2',
    '1 .M N... 100644 100644 100644 a b src/file name.ts',
    '2 R. N... 100644 100644 100644 a b R100 new\nname.ts',
    'old name.ts',
    'u UU N... 100644 100644 100644 100644 a b c conflict.ts',
    '? new file.ts',
    '',
  ].join('\0');
  const p = parseStatus(text);
  assert.equal(p.branch, 'feature/test');
  assert.equal(p.upstream, 'origin/main');
  assert.equal(p.ahead, 3);
  assert.equal(p.behind, 2);
  assert.equal(p.stashes, 2);
  assert.equal(p.changes.length, 4);
  assert.equal(p.changes[0].path, 'src/file name.ts');
  assert.equal(p.changes[1].path, 'new\nname.ts');
  assert.equal(p.changes[2].conflict, true);
  assert.equal(p.changes[3].working, '?');
});
test('remote links exclude credentials, query strings and unsafe protocols', () => {
  assert.equal(
    safeRemote('git@github.com:someone/project.git'),
    'https://github.com/someone/project',
  );
  assert.equal(
    safeRemote('https://token:secret@gitlab.com/team/project.git?access_token=secret#x'),
    'https://gitlab.com/team/project',
  );
  assert.equal(
    safeRemote('ssh://git@github.com/someone/project.git'),
    'https://github.com/someone/project',
  );
  assert.equal(safeRemote('javascript:alert(1)'), null);
  assert.equal(safeRemote('/local/bare.git'), null);
});
test('real repository detects staged, modified, untracked and renamed files without running scripts', async (t) => {
  const root = await fixture(t);
  await init(root);
  await writeFile(join(root, 'index.ts'), 'export const a = 1;\n');
  await writeFile(join(root, 'old name.ts'), 'export const old = true;\n');
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ description: 'Test repo', scripts: { postinstall: 'exit 99' } }),
  );
  await commit(root);
  await run(root, 'mv', 'old name.ts', 'new name.ts');
  await writeFile(join(root, 'index.ts'), 'export const a = 2;\n');
  await writeFile(join(root, 'new file.ts'), 'new\n');
  const data = await readRepository(root);
  assert.equal(data.error, undefined);
  assert.equal(data.branch, 'main');
  assert.equal(data.description, 'Test repo');
  assert.equal(data.language, 'TypeScript');
  assert.equal(data.changes.length, 3);
  assert.ok(data.changes.some((c) => c.path === 'new name.ts' && c.index === 'R'));
  assert.ok(data.changes.some((c) => c.path === 'new file.ts' && c.index === '?'));
  assert.equal(data.commits[0].subject, 'First commit');
  assert.ok(data.branches.some((b) => b.current && b.name === 'main'));
});
test('empty repositories and detached HEAD are readable', async (t) => {
  const root = await fixture(t);
  await init(root);
  let r = await readRepository(root);
  assert.equal(r.branch, 'main');
  assert.deepEqual(r.commits, []);
  await writeFile(join(root, 'a.py'), 'x=1\n');
  await commit(root);
  await run(root, 'checkout', '--detach');
  r = await readRepository(root);
  assert.equal(r.branch, 'Detached HEAD');
  assert.equal(r.error, undefined);
});
test('ahead and behind reflect actual upstream tracking refs', async (t) => {
  const root = await fixture(t),
    remote = join(root, 'remote.git'),
    a = join(root, 'a'),
    b = join(root, 'b');
  await mkdir(remote);
  await run(remote, 'init', '--bare', '--initial-branch=main');
  await run(root, 'clone', remote, a);
  await writeFile(join(a, 'a.ts'), 'one\n');
  await commit(a);
  await run(a, 'push', '-u', 'origin', 'main');
  await run(root, 'clone', remote, b);
  await writeFile(join(a, 'a.ts'), 'two\n');
  await commit(a, 'Local only');
  let r = await readRepository(a);
  assert.equal(r.ahead, 1);
  assert.equal(r.behind, 0);
  await writeFile(join(b, 'b.ts'), 'other\n');
  await commit(b, 'Remote change');
  await run(b, 'push');
  await run(a, 'fetch');
  r = await readRepository(a);
  assert.equal(r.ahead, 1);
  assert.equal(r.behind, 1);
});
test('discovery finds linked worktrees, deduplicates roots and skips dependency directories', async (t) => {
  const root = await fixture(t),
    main = join(root, 'main');
  await init(main);
  await writeFile(join(main, 'x.ts'), 'x\n');
  await commit(main);
  await run(main, 'worktree', 'add', '-b', 'feature', join(root, 'feature'));
  await init(join(root, 'node_modules', 'hidden'));
  await symlink(main, join(root, 'alias'), 'dir');
  const w = await scanWorkspace([root, main]);
  assert.equal(w.repositories.length, 2);
  assert.ok(w.repositories.some((r) => r.branch === 'feature'));
  assert.equal(new Set(w.repositories.map((r) => r.id)).size, 2);
});
test('invalid roots produce actionable errors', async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, 'file'), 'x');
  await assert.rejects(normalizeRoot(join(root, 'missing')), /does not exist/);
  await assert.rejects(normalizeRoot(join(root, 'file')), /folder, not a file/);
});
test('malicious fsmonitor setting is not executed', async (t) => {
  const root = await fixture(t);
  await init(root);
  await writeFile(join(root, 'x.ts'), 'x');
  await commit(root);
  await run(root, 'config', 'core.fsmonitor', 'echo MUST_NOT_EXECUTE');
  const r = await readRepository(root);
  assert.equal(r.error, undefined);
});
