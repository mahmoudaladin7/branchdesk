import {
  AlertCircle,
  CircleDot,
  Check,
  FolderGit2,
  Star,
  ChevronRight,
  GitBranch,
  ArrowUp,
  ArrowDown,
  Layers,
} from 'lucide-react';
import { colors, relative } from '@/lib/presentation';
import type { Repository } from '@/lib/types';
export function ChangeLabel({ r }: { r: Repository }) {
  return r.error ? (
    <span className="status amber">
      <AlertCircle size={14} />
      Unavailable
    </span>
  ) : r.changes.some((c) => c.conflict) ? (
    <span className="status red">
      <AlertCircle size={14} />
      Merge conflicts
    </span>
  ) : r.changes.length ? (
    <span className="status amber">
      <CircleDot size={14} />
      {r.changes.length} changed
    </span>
  ) : (
    <span className="status mint">
      <Check size={14} />
      Clean
    </span>
  );
}

export function RepositoryCard({
  repo: r,
  pinned,
  onPin,
  onOpen,
  list,
}: {
  repo: Repository;
  pinned: boolean;
  onPin: () => void;
  onOpen: () => void;
  list: boolean;
}) {
  return (
    <article className={`repo-card ${list ? 'row-card' : ''}`}>
      <div className="repo-card-top">
        <div
          className="repo-icon"
          style={{ '--repo-color': colors[r.language] || colors.Other } as React.CSSProperties}
        >
          <FolderGit2 size={23} />
        </div>
        <button
          className={`pin-button ${pinned ? 'pinned' : ''}`}
          onClick={onPin}
          aria-label={`${pinned ? 'Unpin' : 'Pin'} ${r.name}`}
          aria-pressed={pinned}
        >
          <Star size={17} />
        </button>
      </div>
      <div className="repo-info">
        <h3>
          <button onClick={onOpen}>
            {r.name}
            <ChevronRight size={16} />
          </button>
        </h3>
        <p>{r.description || 'Local Git repository'}</p>
        <div className="branch">
          <GitBranch size={14} />
          <code title={r.branch}>{r.branch}</code>
        </div>
      </div>
      <div className="repo-status">
        <ChangeLabel r={r} />
        {r.ahead > 0 && (
          <span className="sync-count" title={`${r.ahead} ahead of upstream`}>
            <ArrowUp size={13} />
            {r.ahead}
          </span>
        )}
        {r.behind > 0 && (
          <span className="sync-count amber" title={`${r.behind} behind upstream`}>
            <ArrowDown size={13} />
            {r.behind}
          </span>
        )}
        {r.stashes > 0 && (
          <span className="stash-count">
            <Layers size={12} />
            {r.stashes} stash{r.stashes !== 1 ? 'es' : ''}
          </span>
        )}
      </div>
      <footer>
        <span className="language">
          <span style={{ background: colors[r.language] || colors.Other }} />
          {r.language}
        </span>
        <span title={r.lastActivity || ''}>{relative(r.lastActivity)}</span>
      </footer>
    </article>
  );
}
