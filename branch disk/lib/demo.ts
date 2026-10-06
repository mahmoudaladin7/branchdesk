import type { Repository, Workspace } from './types';
const now = Date.now();
const ago = (hours: number) => new Date(now - hours * 3600_000).toISOString();
const create = (data: Partial<Repository> & Pick<Repository, 'name'>): Repository => ({
  id: data.name,
  path: `~/Developer/${data.name}`,
  description: '',
  language: 'TypeScript',
  branch: 'main',
  upstream: 'origin/main',
  ahead: 0,
  behind: 0,
  changes: [],
  stashes: 0,
  remote: null,
  lastActivity: ago(2),
  commits: [
    {
      hash: 'a7f3e21',
      subject: 'refactor: simplify shared utilities',
      author: 'Alex Morgan',
      date: ago(2),
    },
    {
      hash: '9bc410e',
      subject: 'test: cover the empty state',
      author: 'Alex Morgan',
      date: ago(23),
    },
    {
      hash: 'd284f6a',
      subject: 'docs: update local development guide',
      author: 'Sam Chen',
      date: ago(49),
    },
  ],
  branches: [
    { name: data.branch || 'main', current: true, lastCommit: data.lastActivity || ago(2) },
  ],
  ...data,
});
export const demoWorkspace: Workspace = {
  mode: 'demo',
  roots: ['~/Developer'],
  scannedAt: new Date(now).toISOString(),
  warnings: [],
  repositories: [
    create({
      name: 'orbit-web',
      description: 'The frontend for a calmer project workspace.',
      branch: 'feat/command-menu',
      ahead: 3,
      changes: [
        { path: 'src/components/command-menu.tsx', index: ' ', working: 'M', conflict: false },
        { path: 'src/hooks/use-search.ts', index: 'M', working: ' ', conflict: false },
        { path: 'src/styles/tokens.css', index: ' ', working: 'M', conflict: false },
        { path: 'src/components/search-empty.tsx', index: '?', working: '?', conflict: false },
      ],
      branches: [
        { name: 'feat/command-menu', current: true, lastCommit: ago(0.3) },
        { name: 'main', current: false, lastCommit: ago(24) },
        { name: 'fix/mobile-nav', current: false, lastCommit: ago(60) },
      ],
      lastActivity: ago(0.3),
      commits: [
        {
          hash: '8b2f4a1',
          subject: 'feat: add keyboard navigation to command menu',
          author: 'Alex Morgan',
          date: ago(0.3),
        },
        {
          hash: 'ef48c2a',
          subject: 'feat: search projects and recent pages',
          author: 'Alex Morgan',
          date: ago(3),
        },
        {
          hash: '4c92d7e',
          subject: 'style: refine workspace spacing',
          author: 'Sam Chen',
          date: ago(27),
        },
        {
          hash: 'e352f1b',
          subject: 'fix: restore focus after closing a dialog',
          author: 'Alex Morgan',
          date: ago(74),
        },
      ],
    }),
    create({
      name: 'atlas-api',
      description: 'A fast, thoughtfully structured REST API.',
      language: 'Go',
      branch: 'fix/rate-limiter',
      ahead: 2,
      behind: 1,
      stashes: 1,
      changes: [
        { path: 'internal/middleware/limiter.go', index: ' ', working: 'M', conflict: false },
        { path: 'internal/middleware/limiter_test.go', index: ' ', working: 'M', conflict: false },
      ],
      lastActivity: ago(1.5),
      commits: [
        {
          hash: 'f91d0b3',
          subject: 'fix: handle burst traffic in rate limiter',
          author: 'Sam Chen',
          date: ago(1.5),
        },
        {
          hash: '2ad71f0',
          subject: 'test: add concurrent request coverage',
          author: 'Alex Morgan',
          date: ago(25),
        },
      ],
    }),
    create({
      name: 'formkit',
      description: 'Accessible form primitives for React.',
      lastActivity: ago(4),
      commits: [
        {
          hash: 'c3d8a04',
          subject: 'fix: announce field errors to screen readers',
          author: 'Alex Morgan',
          date: ago(4),
        },
        {
          hash: '317b9d2',
          subject: 'docs: add validation examples',
          author: 'Sam Chen',
          date: ago(52),
        },
      ],
    }),
    create({
      name: 'dev-notes',
      description: 'Things learned, ideas saved, problems solved.',
      language: 'MDX',
      changes: [{ path: 'notes/git-worktrees.mdx', index: '?', working: '?', conflict: false }],
      lastActivity: ago(21),
      commits: [
        {
          hash: 'b61ae42',
          subject: 'docs: notes on optimistic updates',
          author: 'Alex Morgan',
          date: ago(21),
        },
      ],
    }),
    create({
      name: 'relay-worker',
      description: 'Background jobs without the busywork.',
      language: 'Python',
      branch: 'feat/retry-policy',
      ahead: 2,
      lastActivity: ago(28),
      commits: [
        {
          hash: '90d1b6f',
          subject: 'feat: add exponential backoff for retries',
          author: 'Sam Chen',
          date: ago(28),
        },
        {
          hash: 'f614e30',
          subject: 'fix: close connections after job failure',
          author: 'Sam Chen',
          date: ago(58),
        },
      ],
    }),
    create({
      name: 'personal-site',
      description: 'A small corner of the internet.',
      language: 'Astro',
      lastActivity: ago(46),
      commits: [
        {
          hash: '7ae50d1',
          subject: 'content: publish the September reading list',
          author: 'Alex Morgan',
          date: ago(46),
        },
      ],
    }),
  ],
};
