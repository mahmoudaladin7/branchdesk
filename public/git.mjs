import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { resolve, basename, join, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
const execFileAsync = promisify(execFile);
const skipped = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.cache',
  '.venv',
  'venv',
  'vendor',
  '.wrangler',
  '.sites-runtime',
  'target',
]);
const languageNames = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.mdx': 'MDX',
  '.md': 'Markdown',
  '.astro': 'Astro',
  '.java': 'Java',
  '.php': 'PHP',
  '.swift': 'Swift',
  '.rb': 'Ruby',
  '.cs': 'C#',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
  '.dart': 'Dart',
};

export async function git(directory, args) {
  const { stdout } = await execFileAsync(
    'git',
    [
      '--no-optional-locks',
      '--no-pager',
      '-c',
      'core.fsmonitor=false',
      '-c',
      'core.untrackedCache=false',
      '-c',
      'log.showSignature=false',
      '-c',
      'core.quotepath=false',
      '-C',
      directory,
      ...args,
    ],
    {
      encoding: 'utf8',
      timeout: 15000,
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
        GIT_OPTIONAL_LOCKS: '0',
        GIT_NO_REPLACE_OBJECTS: '1',
      },
    },
  );
  return stdout;
}
export async function normalizeRoot(input) {
  if (typeof input !== 'string' || !input.trim() || input.includes('\0'))
    throw new Error('Enter a valid folder path.');
  const expanded =
    input === '~' ? homedir() : input.startsWith('~/') ? join(homedir(), input.slice(2)) : input;
  const path = await realpath(resolve(expanded)).catch(() => {
    throw new Error('That folder does not exist or cannot be read.');
  });
  if (!(await stat(path)).isDirectory()) throw new Error('Choose a folder, not a file.');
  return path;
}
export function parseStatus(raw) {
  const entries = raw.split('\0');
  const changes = [];
  let branch = 'HEAD',
    upstream = null,
    ahead = 0,
    behind = 0,
    stashes = 0;
  for (let i = 0; i < entries.length; i++) {
    const line = entries[i];
    if (line.startsWith('# branch.head '))
      branch = line.slice(14) === '(detached)' ? 'Detached HEAD' : line.slice(14);
    else if (line.startsWith('# branch.upstream ')) upstream = line.slice(18);
    else if (line.startsWith('# branch.ab ')) {
      const m = line.match(/\+(\d+) -(\d+)/);
      if (m) {
        ahead = Number(m[1]);
        behind = Number(m[2]);
      }
    } else if (line.startsWith('# stash ')) stashes = Number(line.slice(8)) || 0;
    else if (line.startsWith('? '))
      changes.push({ path: line.slice(2), index: '?', working: '?', conflict: false });
    else if (/^[12u] /.test(line)) {
      const fields = line.split(' '),
        kind = fields[0],
        xy = fields[1];
      const path = fields.slice(kind === '1' ? 8 : kind === '2' ? 9 : 10).join(' ');
      changes.push({
        path,
        index: xy[0] === '.' ? ' ' : xy[0],
        working: xy[1] === '.' ? ' ' : xy[1],
        conflict: kind === 'u',
      });
      if (kind === '2') i++; // Rename source is a separate NUL-terminated field.
    }
  }
  return { branch, upstream, ahead, behind, stashes, changes };
}
export function safeRemote(raw) {
  const text = raw.trim();
  if (!text) return null;
  let candidate = text;
  if (/^[^@\s]+@[^:\s]+:/.test(text))
    candidate = 'https://' + text.replace(/^[^@]+@/, '').replace(':', '/');
  try {
    const u = new URL(candidate);
    if (!['https:', 'ssh:', 'git:'].includes(u.protocol)) return null;
    return new URL('https://' + u.hostname + u.pathname.replace(/\.git\/?$/, '')).toString();
  } catch {
    return null;
  }
}
async function readDescription(path) {
  // Never follow package.json symlinks or execute package scripts.
  try {
    const items = await readdir(path, { withFileTypes: true });
    const pkg = items.find((i) => i.name === 'package.json');
    if (!pkg?.isFile()) return '';
    const metadata = JSON.parse(await readFile(join(path, 'package.json'), 'utf8'));
    return typeof metadata.description === 'string' ? metadata.description.slice(0, 240) : '';
  } catch {
    return '';
  }
}
export async function readRepository(path) {
  const id = createHash('sha256').update(path).digest('hex').slice(0, 20);
  const base = {
    id,
    name: basename(path),
    path,
    description: '',
    language: 'Other',
    branch: 'Unknown',
    upstream: null,
    ahead: 0,
    behind: 0,
    changes: [],
    commits: [],
    branches: [],
    stashes: 0,
    remote: null,
    lastActivity: null,
  };
  try {
    const status = await git(path, [
      'status',
      '--porcelain=v2',
      '--branch',
      '--show-stash',
      '-z',
      '--untracked-files=all',
    ]);
    const parsed = parseStatus(status);
    const [log, branches, remote, files, description] = await Promise.all([
      git(path, ['log', '-30', '--format=%H%x00%s%x00%an%x00%cI%x00']).catch(() => ''),
      git(path, [
        'for-each-ref',
        '--format=%(refname:short)%00%(HEAD)%00%(committerdate:iso-strict)',
        'refs/heads/',
      ]).catch(() => ''),
      git(path, ['remote', 'get-url', 'origin']).catch(() => ''),
      git(path, ['ls-files', '-z']).catch(() => ''),
      readDescription(path),
    ]);
    const chunks = log.split('\0');
    const commits = [];
    for (let i = 0; i + 3 < chunks.length; i += 4) {
      const hash = chunks[i].trim();
      if (hash)
        commits.push({ hash, subject: chunks[i + 1], author: chunks[i + 2], date: chunks[i + 3] });
    }
    const branchList = branches
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [name, current, lastCommit] = line.split('\0');
        return { name, current: current === '*', lastCommit: lastCommit || '' };
      });
    const counts = {};
    for (const file of files.split('\0')) {
      if (file.split('/').some((p) => skipped.has(p))) continue;
      const language = languageNames[extname(file)];
      if (language) counts[language] = (counts[language] || 0) + 1;
    }
    const language = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Other';
    return {
      ...base,
      ...parsed,
      description,
      language,
      commits,
      branches: branchList,
      remote: safeRemote(remote),
      lastActivity: commits[0]?.date || null,
    };
  } catch {
    return {
      ...base,
      error:
        'Git could not read this repository. Check permissions or whether another operation is in progress.',
    };
  }
}
export async function discoverRepositories(
  roots,
  { maxDepth = 3, maxRepos = 200, maxDirectories = 10000 } = {},
) {
  const found = new Set(),
    warnings = [];
  let visited = 0,
    limitReported = false;
  async function walk(path, depth) {
    if (visited++ >= maxDirectories) {
      if (!limitReported) {
        warnings.push(`Scan stopped after ${maxDirectories} folders. Choose a more specific root.`);
        limitReported = true;
      }
      return;
    }
    if (found.size >= maxRepos) return;
    let entries;
    try {
      entries = await readdir(path, { withFileTypes: true });
    } catch {
      warnings.push(`Cannot read folder: ${path}`);
      return;
    }
    if (entries.some((e) => e.name === '.git' && (e.isDirectory() || e.isFile()))) {
      try {
        const top = (await git(path, ['rev-parse', '--show-toplevel'])).trim();
        if ((await realpath(top)) === path) found.add(path);
      } catch {
        warnings.push(`Could not read Git metadata: ${path}`);
      }
    }
    if (depth >= maxDepth) return;
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (
        entry.isDirectory() &&
        !entry.isSymbolicLink() &&
        !skipped.has(entry.name) &&
        !entry.name.startsWith('.')
      )
        await walk(join(path, entry.name), depth + 1);
      if (found.size >= maxRepos || visited >= maxDirectories) break;
    }
  }
  for (const root of roots) await walk(await realpath(root), 0);
  if (found.size >= maxRepos)
    warnings.push(
      `Showing the first ${maxRepos} repositories. Choose a smaller root to narrow the scan.`,
    );
  return { paths: [...found], warnings };
}
export async function scanWorkspace(roots, options) {
  const { paths, warnings } = await discoverRepositories(roots, options);
  const repositories = new Array(paths.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, paths.length) }, async () => {
      while (cursor < paths.length) {
        const i = cursor++;
        repositories[i] = await readRepository(paths[i]);
      }
    }),
  );
  return { mode: 'local', roots, repositories, scannedAt: new Date().toISOString(), warnings };
}
