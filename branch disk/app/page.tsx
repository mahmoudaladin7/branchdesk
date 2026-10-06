import { useWebMCP } from '@/lib/use-webmcp';
import { RepositoryCard } from '@/components/repository-card';
import { RepositoryDetails } from '@/components/repository-details';
import { Empty } from '@/components/empty-state';
import { github, colors, relative, stored, save, needsAttention } from '@/lib/presentation';
import { useEffect, useRef, useState } from 'react';
import {
  GitBranch,
  LayoutDashboard,
  FolderGit2,
  History,
  Star,
  Search,
  Plus,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  CircleDot,
  CodeXml,
  Settings2,
  Terminal,
  ChevronRight,
  Grid2X2,
  List,
  Check,
  SlidersHorizontal,
  Layers,
  FileCode2,
  ShieldCheck,
  GitCommitHorizontal,
  Copy,
  Sun,
  Moon,
  AlertCircle,
  FolderOpen,
  ExternalLink,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { demoWorkspace } from '@/lib/demo';
import type { Repository, Workspace } from '@/lib/types';

declare global {
  interface Window {
    __BRANCHDESK__?: { token: string };
  }
}
type View = 'overview' | 'repositories' | 'activity' | 'favorites';
export default function Dashboard() {
  const local = !!window.__BRANCHDESK__;
  const [workspace, setWorkspace] = useState<Workspace>(
    local
      ? { mode: 'local', roots: [], repositories: [], scannedAt: '', warnings: [] }
      : demoWorkspace,
  );
  const [loading, setLoading] = useState(local),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState('all'),
    [sort, setSort] = useState('recent');
  const [view, setView] = useState<View>(() =>
    ['repositories', 'activity', 'favorites'].includes(location.hash.slice(1))
      ? (location.hash.slice(1) as View)
      : 'overview',
  );
  const [layout, setLayout] = useState<'grid' | 'list'>(() => stored('branchdesk:layout', 'grid'));
  const [favorites, setFavorites] = useState<string[]>(() =>
    stored(
      local ? 'branchdesk:pins' : 'branchdesk:demo-pins',
      local ? [] : ['orbit-web', 'formkit'],
    ),
  );
  const [theme, setTheme] = useState<'dark' | 'light'>(() => stored('branchdesk:theme', 'dark'));
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() =>
    stored('branchdesk:auto-refresh', true),
  );
  const [modal, setModal] = useState<'folder' | 'preferences' | 'search' | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [detailTab, setDetailTab] = useState('changes');
  const [folder, setFolder] = useState(''),
    [folderError, setFolderError] = useState(''),
    [adding, setAdding] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null),
    refreshing = useRef(false);
  const repos = workspace.repositories,
    attention = repos.filter(needsAttention),
    pinned = repos.filter((r) => favorites.includes(r.id));
  const selectedRepo = repos.find((r) => r.id === selected);
  const activity = repos
    .flatMap((r) => r.commits.map((c) => ({ ...c, repo: r })))
    .sort((a, b) => b.date.localeCompare(a.date));
  const recent = activity.filter((c) => Date.now() - new Date(c.date).getTime() < 7 * 86400000);
  const visible = repos
    .filter(
      (r) =>
        (view !== 'favorites' || favorites.includes(r.id)) &&
        `${r.name} ${r.description} ${r.branch} ${r.language}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (filter === 'all' ||
          (filter === 'attention' && needsAttention(r)) ||
          (filter === 'clean' && !needsAttention(r)) ||
          (filter === 'unpushed' && r.ahead > 0)),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : sort === 'attention'
          ? Number(needsAttention(b)) - Number(needsAttention(a))
          : (b.lastActivity || '').localeCompare(a.lastActivity || ''),
    );
  async function refresh() {
    if (refreshing.current) return;
    refreshing.current = true;
    setLoading(true);
    try {
      if (local) {
        const r = await fetch('/api/workspace', {
          headers: { 'X-Branchdesk-Token': window.__BRANCHDESK__!.token },
        });
        if (!r.ok)
          throw new Error('Could not read the workspace. Make sure the local server is running.');
        setWorkspace(await r.json());
      } else {
        setWorkspace((w) => ({ ...w, scannedAt: new Date().toISOString() }));
      }
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      refreshing.current = false;
    }
  }
  useEffect(() => {
    if (local) void refresh();
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    save('branchdesk:theme', theme);
  }, [theme]);
  useEffect(() => {
    save(local ? 'branchdesk:pins' : 'branchdesk:demo-pins', favorites);
  }, [favorites, local]);
  useEffect(() => {
    save('branchdesk:layout', layout);
  }, [layout]);
  useEffect(() => {
    save('branchdesk:auto-refresh', autoRefresh);
    if (!local || !autoRefresh) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, local]);
  useEffect(() => {
    const onHash = () => {
      const v = location.hash.slice(1);
      setView(['repositories', 'activity', 'favorites'].includes(v) ? (v as View) : 'overview');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSelected(null);
        setModal('search');
      } else if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) &&
        !modal &&
        !selected
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [modal, selected]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);
  function navigate(v: View) {
    location.hash = v;
    setView(v);
    setQuery('');
    setFilter('all');
  }
  function pin(id: string) {
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  }
  function open(r: Repository) {
    setSelected(r.id);
    setDetailTab('changes');
    setModal(null);
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice('Copied to clipboard');
    } catch {
      setNotice('Clipboard unavailable. Select and copy the text instead.');
    }
  }
  async function addFolder(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setFolderError('');
    try {
      const r = await fetch('/api/roots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Branchdesk-Token': window.__BRANCHDESK__!.token,
        },
        body: JSON.stringify({ path: folder }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Could not add folder');
      setWorkspace(data);
      setFolder('');
      setModal(null);
      setNotice('Folder added to this session');
    } catch (e) {
      setFolderError((e as Error).message);
    } finally {
      setAdding(false);
    }
  }
  const nav = [
    { id: 'overview' as View, label: 'Overview', icon: LayoutDashboard },
    { id: 'repositories' as View, label: 'Repositories', icon: FolderGit2, count: repos.length },
    { id: 'activity' as View, label: 'Activity', icon: History },
    { id: 'favorites' as View, label: 'Favorites', icon: Star, count: pinned.length },
  ];
  useWebMCP(repos, (nextQuery) => {
    navigate('repositories');
    setQuery(nextQuery);
  });
  const title =
    view === 'overview'
      ? 'Your work, in focus'
      : view === 'repositories'
        ? 'All your repositories'
        : view === 'favorites'
          ? 'Keep the good stuff close'
          : 'A little forward momentum';
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Branchdesk overview">
          <span className="brand-mark">
            <GitBranch size={24} />
          </span>
          <span className="wordmark">branchdesk</span>
          <span className="beta">BETA</span>
        </a>
        <button
          className="workspace-switch"
          onClick={() => setModal('folder')}
          aria-label="Manage workspace folders"
        >
          <span className="workspace-avatar">P</span>
          <span>
            Personal workspace<small>{local ? 'Local development' : 'Interactive demo'}</small>
          </span>
          <ChevronRight size={14} />
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Workspace">
          {nav.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${view === n.id ? 'active' : ''}`}
              onClick={() => navigate(n.id)}
              aria-label={n.label}
              aria-current={view === n.id ? 'page' : undefined}
            >
              <n.icon />
              <span className="nav-text">{n.label}</span>
              {n.count !== undefined && <span className="nav-count">{n.count}</span>}
            </button>
          ))}
        </nav>
        <div className="nav-label pinned-label">PINNED REPOSITORIES</div>
        <div className="pinned-repos">
          {pinned.length ? (
            pinned.map((r) => (
              <button key={r.id} onClick={() => open(r)}>
                <span
                  className="repo-dot"
                  style={{ background: colors[r.language] || colors.Other }}
                />
                {r.name}
              </button>
            ))
          ) : (
            <p>Pin a repository to keep it here.</p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="local-note">
            <ShieldCheck size={19} />
            <strong>Your code stays yours.</strong>
            <p>
              Runs on your machine.
              <br />
              No account. No uploads.
            </p>
          </div>
          <button className="nav-item" onClick={() => setModal('preferences')}>
            <Settings2 />
            Preferences
          </button>
          <a className="nav-item" href={github} target="_blank" rel="noreferrer">
            <CodeXml />
            View on GitHub
          </a>
          <div className="profile">
            <span className="profile-avatar">BD</span>
            <div>
              Developer workspace<small>Branchdesk v0.1.0</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <Layers size={16} />
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>{nav.find((n) => n.id === view)?.label}</strong>
          </div>
          <div className="topbar-actions">
            <span className="demo-pill">
              <span />
              {local ? 'Local workspace' : 'Demo workspace'}
            </span>
            <button
              className="key-command"
              onClick={() => setModal('search')}
              aria-label="Open quick search"
            >
              <Search size={16} />
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="mobile-settings"
              aria-label="Preferences"
              onClick={() => setModal('preferences')}
            >
              <Settings2 size={19} />
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <div className="eyebrow">A PLACE FOR YOUR PROJECTS</div>
              <h1>
                {title}
                <span>.</span>
              </h1>
              <p>
                {view === 'overview'
                  ? 'Pick up where you left off. Everything is right here.'
                  : view === 'activity'
                    ? 'Recent commits across the repositories in your workspace.'
                    : view === 'favorites'
                      ? 'Your pinned projects, always within reach.'
                      : 'One place for every project you’re building.'}
              </p>
            </div>
            <div className="heading-actions">
              <Button
                className="button secondary"
                onClick={() => void refresh()}
                disabled={loading}
              >
                <RefreshCw className={loading ? 'spin' : ''} />
                {loading ? 'Refreshing' : 'Refresh'}
              </Button>
              <Button className="button primary" onClick={() => setModal('folder')}>
                <Plus />
                Add folder
              </Button>
            </div>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
              <button onClick={() => void refresh()}>Retry</button>
            </div>
          )}
          {workspace.warnings.length > 0 && (
            <details className="warning-banner">
              <summary>
                {workspace.warnings.length} scan notice{workspace.warnings.length !== 1 ? 's' : ''}
              </summary>
              {workspace.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </details>
          )}
          <section className="metrics" aria-label="Workspace summary">
            {[
              {
                label: 'Repositories',
                value: repos.length,
                detail: `Across ${workspace.roots.length} folder${workspace.roots.length !== 1 ? 's' : ''}`,
                icon: FolderGit2,
                color: '',
              },
              {
                label: 'Need attention',
                value: attention.length,
                detail: attention.length ? 'A few loose ends' : 'All caught up',
                icon: CircleDot,
                color: 'amber',
              },
              {
                label: 'Unpushed commits',
                value: repos.reduce((n, r) => n + r.ahead, 0),
                detail: 'Compared with local upstream',
                icon: ArrowUp,
                color: 'violet',
              },
              {
                label: 'Recent commits',
                value: recent.length,
                detail: 'Last 7 days · up to 30 per repo',
                icon: GitCommitHorizontal,
                color: 'mint',
              },
            ].map((m) => (
              <div className={`metric ${m.color}`} key={m.label}>
                <div className="metric-label">
                  {m.label}
                  <m.icon size={17} />
                </div>
                <div className="metric-value">
                  {loading && !repos.length ? '—' : m.value.toString().padStart(2, '0')}
                </div>
                <div className="metric-detail">{m.detail}</div>
              </div>
            ))}
          </section>
          {view === 'activity' ? (
            <section className="full-activity">
              <div className="section-heading">
                <h2>
                  Recent commits <span>{activity.length}</span>
                </h2>
                <span className="muted">Newest first</span>
              </div>
              {activity.length ? (
                activity.map((c) => (
                  <button
                    className="commit-row"
                    onClick={() => open(c.repo)}
                    key={`${c.repo.id}-${c.hash}`}
                  >
                    <GitCommitHorizontal size={20} />
                    <span>
                      <strong>{c.subject}</strong>
                      <small>
                        {c.repo.name} · {c.author}
                      </small>
                    </span>
                    <code>{c.hash.slice(0, 7)}</code>
                    <time>{relative(c.date)}</time>
                  </button>
                ))
              ) : (
                <Empty
                  icon={History}
                  title="Your next commit starts the story"
                  text="Commits from your tracked repositories will appear here."
                />
              )}
            </section>
          ) : (
            <div className={`workspace-grid ${view !== 'overview' ? 'wide-view' : ''}`}>
              <section className="repositories-panel">
                <div className="section-heading">
                  <h2>
                    {view === 'favorites' ? 'Pinned repositories' : 'Repositories'}{' '}
                    <span>{visible.length}</span>
                  </h2>
                  <div className="view-toggle" aria-label="Repository layout">
                    <button
                      className={layout === 'grid' ? 'selected' : ''}
                      onClick={() => setLayout('grid')}
                      aria-label="Grid view"
                      aria-pressed={layout === 'grid'}
                    >
                      <Grid2X2 size={16} />
                    </button>
                    <button
                      className={layout === 'list' ? 'selected' : ''}
                      onClick={() => setLayout('list')}
                      aria-label="List view"
                      aria-pressed={layout === 'list'}
                    >
                      <List size={17} />
                    </button>
                  </div>
                </div>
                <div className="repo-toolbar">
                  <div className="search-field">
                    <Search size={17} />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Find a repository…"
                      aria-label="Search repositories"
                    />
                    {query ? (
                      <button onClick={() => setQuery('')} aria-label="Clear search">
                        <X size={14} />
                      </button>
                    ) : (
                      <kbd>/</kbd>
                    )}
                  </div>
                  <label className="filter-button">
                    <SlidersHorizontal size={15} />
                    <select
                      aria-label="Filter repositories"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All statuses</option>
                      <option value="attention">Needs attention</option>
                      <option value="clean">All caught up</option>
                      <option value="unpushed">Unpushed commits</option>
                    </select>
                  </label>
                  <select
                    className="sort-select"
                    aria-label="Sort repositories"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="recent">Recent</option>
                    <option value="name">Name</option>
                    <option value="attention">Attention</option>
                  </select>
                </div>
                {loading && !repos.length ? (
                  <div className="empty-state" role="status">
                    <RefreshCw className="spin" />
                    <h3>Finding your repositories</h3>
                    <p>Reading Git status and recent commits.</p>
                  </div>
                ) : visible.length ? (
                  <div className={`repository-grid ${layout === 'list' ? 'list-layout' : ''}`}>
                    {visible.map((r) => (
                      <RepositoryCard
                        key={r.id}
                        repo={r}
                        pinned={favorites.includes(r.id)}
                        onPin={() => pin(r.id)}
                        onOpen={() => open(r)}
                        list={layout === 'list'}
                      />
                    ))}
                  </div>
                ) : (
                  <Empty
                    icon={view === 'favorites' ? Star : FolderOpen}
                    title={
                      query || filter !== 'all'
                        ? 'No matching repositories'
                        : view === 'favorites'
                          ? 'Make room for your favorites'
                          : 'Your workspace starts here'
                    }
                    text={
                      query || filter !== 'all'
                        ? 'Try a different search or clear the status filter.'
                        : view === 'favorites'
                          ? 'Pin a repository using the star on its card.'
                          : 'Add a folder containing Git repositories to get started.'
                    }
                    action={
                      <Button
                        className="button secondary"
                        onClick={() => {
                          if (query || filter !== 'all') {
                            setQuery('');
                            setFilter('all');
                          } else if (view === 'favorites') navigate('repositories');
                          else setModal('folder');
                        }}
                      >
                        {query || filter !== 'all'
                          ? 'Clear filters'
                          : view === 'favorites'
                            ? 'Browse repositories'
                            : 'Add your first folder'}
                      </Button>
                    }
                  />
                )}
                <div className="repo-footnote">
                  <ShieldCheck size={14} />
                  Read-only by design. Your repositories stay untouched.
                </div>
              </section>
              {view === 'overview' && (
                <aside className="insights">
                  <section className="attention-panel">
                    <div className="section-heading">
                      <h2>
                        <CircleDot size={16} />
                        On your radar
                      </h2>
                      <span className="count-badge">{attention.length}</span>
                    </div>
                    <p className="section-description">Small things to pick up next.</p>
                    {attention.length ? (
                      attention.slice(0, 3).map((r) => (
                        <button className="attention-item" key={r.id} onClick={() => open(r)}>
                          <span className={`attention-icon ${r.behind ? 'amber' : 'violet'}`}>
                            {r.behind ? (
                              <ArrowDown size={16} />
                            ) : r.changes.length ? (
                              <FileCode2 size={16} />
                            ) : (
                              <ArrowUp size={16} />
                            )}
                          </span>
                          <span>
                            <strong>{r.name}</strong>
                            <small>
                              {r.error
                                ? 'Repository needs a closer look'
                                : r.behind
                                  ? `${r.behind} commit${r.behind !== 1 ? 's' : ''} behind upstream`
                                  : r.changes.length
                                    ? `${r.changes.length} file${r.changes.length !== 1 ? 's' : ''} with local changes`
                                    : `${r.ahead} commits to push`}
                            </small>
                          </span>
                          <ChevronRight size={14} />
                        </button>
                      ))
                    ) : (
                      <p className="all-clear">
                        <Check size={18} />
                        All caught up. Nice work.
                      </p>
                    )}
                    {attention.length > 0 && (
                      <button
                        className="text-button"
                        onClick={() => {
                          navigate('repositories');
                          setFilter('attention');
                        }}
                      >
                        View everything that needs attention
                      </button>
                    )}
                  </section>
                  <section className="activity-panel">
                    <div className="section-heading">
                      <h2>Recent activity</h2>
                      <button aria-label="View all activity" onClick={() => navigate('activity')}>
                        <History size={16} />
                      </button>
                    </div>
                    <div className="activity-list">
                      {activity.slice(0, 5).map((c) => (
                        <button
                          className="activity-item"
                          key={`${c.repo.id}-${c.hash}`}
                          onClick={() => open(c.repo)}
                        >
                          <span className="timeline-dot">
                            <GitCommitHorizontal size={16} />
                          </span>
                          <span>
                            <strong>{c.subject.replace(/^\w+: /, '')}</strong>
                            <span className="activity-meta">
                              <span>{c.repo.name}</span>
                              <span>{relative(c.date)}</span>
                            </span>
                            <code>{c.hash.slice(0, 7)}</code>
                          </span>
                        </button>
                      ))}
                      {!activity.length && <p className="muted">No commits to show yet.</p>}
                    </div>
                  </section>
                  <div className="keyboard-note">
                    <Terminal size={15} />
                    <span>A quieter kind of developer tool.</span>
                  </div>
                </aside>
              )}
            </div>
          )}
          <footer className="workspace-footer">
            <span>
              <span className="live-dot" />
              {local
                ? `Local data · ${workspace.scannedAt ? `Updated ${relative(workspace.scannedAt).toLowerCase()}` : 'Ready to scan'}`
                : 'Sample data · Explore freely'}
            </span>
            <span>
              {local
                ? 'Upstream status reflects your last Git fetch.'
                : 'Try it here. Run it on your machine.'}
            </span>
          </footer>
        </main>
      </div>
      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="app-dialog">
          <DialogTitle>
            {modal === 'folder'
              ? local
                ? 'Add a workspace folder'
                : 'Bring your own repositories'
              : modal === 'preferences'
                ? 'Make yourself at home'
                : 'Jump to a repository'}
          </DialogTitle>
          <DialogDescription>
            {modal === 'folder'
              ? local
                ? 'Add an absolute folder path. Repositories are discovered up to 3 levels deep.'
                : 'You’re exploring sample projects. Run Branchdesk locally to see your real Git repositories.'
              : modal === 'preferences'
                ? 'Small adjustments for the way you work.'
                : 'Search by name, branch, language, or description.'}
          </DialogDescription>
          {modal === 'folder' &&
            (local ? (
              <form onSubmit={(e) => void addFolder(e)} className="folder-form">
                <label htmlFor="folder-path">Folder path</label>
                <input
                  id="folder-path"
                  autoComplete="off"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  placeholder="/Users/you/Developer"
                  required
                  aria-describedby={folderError ? 'folder-error' : undefined}
                />
                {folderError && (
                  <p id="folder-error" className="red" role="alert">
                    {folderError}
                  </p>
                )}
                <p className="muted">
                  Folders added here last for this session. Use <code>--root</code> at launch to
                  keep your setup repeatable.
                </p>
                <Button className="button primary" type="submit" disabled={adding}>
                  {adding ? 'Scanning…' : 'Add folder'}
                </Button>
                {workspace.roots.length > 0 && (
                  <div className="tracked-folders">
                    <strong>Tracked folders</strong>
                    {workspace.roots.map((r) => (
                      <code key={r}>{r}</code>
                    ))}
                  </div>
                )}
              </form>
            ) : (
              <>
                <div className="setup-note">
                  <ShieldCheck />
                  <span>
                    The demo never connects to your computer. The local app stays on your machine.
                  </span>
                </div>
                <div className="code-block">
                  <code>
                    git clone {github}.git
                    <br />
                    cd branchdesk
                    <br />
                    npm ci
                    <br />
                    npm run build
                    <br />
                    npm start -- --root ~/Developer
                  </code>
                  <button
                    aria-label="Copy installation commands"
                    onClick={() =>
                      void copy(
                        `git clone ${github}.git\ncd branchdesk\nnpm ci\nnpm run build\nnpm start -- --root ~/Developer`,
                      )
                    }
                  >
                    <Copy size={17} />
                  </button>
                </div>
                <p className="muted">
                  Requires Node.js 22.13+ and Git. Replace <code>~/Developer</code> with your
                  projects folder.
                </p>
                <a
                  className="button secondary inline-button"
                  href={`${github}#quick-start`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <CodeXml size={16} />
                  Read the setup guide
                </a>
              </>
            ))}
          {modal === 'preferences' && (
            <div className="preferences">
              <div className="preference-row">
                <span>
                  <strong>Appearance</strong>
                  <small>Choose your preferred workspace.</small>
                </span>
                <div className="theme-switch">
                  <button
                    aria-label="Dark theme"
                    aria-pressed={theme === 'dark'}
                    onClick={() => setTheme('dark')}
                  >
                    <Moon size={17} />
                  </button>
                  <button
                    aria-label="Light theme"
                    aria-pressed={theme === 'light'}
                    onClick={() => setTheme('light')}
                  >
                    <Sun size={17} />
                  </button>
                </div>
              </div>
              <label className="preference-row">
                <span>
                  <strong>Refresh automatically</strong>
                  <small>
                    {local
                      ? 'Check for changes every 30 seconds.'
                      : 'Applies when running the local app.'}
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
              </label>
              <p className="muted">
                Preferences and pins are saved in this browser. Repository data is never uploaded.
              </p>
            </div>
          )}
          {modal === 'search' && (
            <div className="quick-search">
              <div className="search-field">
                <Search size={18} />
                <input
                  autoFocus
                  aria-label="Quick search"
                  placeholder="Search your workspace…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {repos
                .filter((r) =>
                  `${r.name} ${r.description} ${r.branch} ${r.language}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((r) => (
                  <button className="quick-result" key={r.id} onClick={() => open(r)}>
                    <FolderGit2 size={20} />
                    <span>
                      <strong>{r.name}</strong>
                      <small>{r.branch}</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <RepositoryDetails
        selectedRepo={selectedRepo}
        setSelected={setSelected}
        detailTab={detailTab}
        setDetailTab={setDetailTab}
        copy={copy}
      />
      <div className={`toast ${notice ? 'visible' : ''}`} role="status" aria-live="polite">
        {notice && (
          <>
            <Check size={16} />
            {notice}
          </>
        )}
      </div>
    </div>
  );
}
