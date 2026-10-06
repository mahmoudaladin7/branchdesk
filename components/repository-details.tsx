import {
  FolderGit2,
  GitBranch,
  Copy,
  ArrowUp,
  ArrowDown,
  FileCode2,
  Check,
  GitCommitHorizontal,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ChangeLabel } from './repository-card';
import { Empty } from './empty-state';
import { relative } from '@/lib/presentation';
import type { Repository } from '@/lib/types';
export function RepositoryDetails({
  selectedRepo,
  setSelected,
  detailTab,
  setDetailTab,
  copy,
}: {
  selectedRepo: Repository | undefined;
  setSelected: (id: string | null) => void;
  detailTab: string;
  setDetailTab: (tab: string) => void;
  copy: (text: string) => Promise<void>;
}) {
  return (
    <Dialog open={!!selectedRepo} onOpenChange={(o) => !o && setSelected(null)}>
      <DialogContent className="app-dialog repository-dialog">
        {selectedRepo && (
          <>
            <div className="detail-heading">
              <div className="repo-icon">
                <FolderGit2 size={25} />
              </div>
              <div>
                <DialogTitle>{selectedRepo.name}</DialogTitle>
                <DialogDescription>
                  {selectedRepo.description || 'Local Git repository'}
                </DialogDescription>
              </div>
            </div>
            <div className="detail-path">
              <code>{selectedRepo.path}</code>
              <button
                aria-label="Copy repository path"
                onClick={() => void copy(selectedRepo.path)}
              >
                <Copy size={15} />
              </button>
            </div>
            <div className="detail-summary">
              <span>
                <GitBranch size={15} />
                {selectedRepo.branch}
              </span>
              <ChangeLabel r={selectedRepo} />
              <span>
                <ArrowUp size={14} />
                {selectedRepo.ahead} ahead
              </span>
              <span>
                <ArrowDown size={14} />
                {selectedRepo.behind} behind
              </span>
            </div>
            {selectedRepo.error && (
              <p className="error-banner" role="alert">
                {selectedRepo.error}
              </p>
            )}
            <div className="detail-tabs" role="group" aria-label="Repository details">
              {['changes', 'commits', 'branches'].map((t) => (
                <button key={t} aria-pressed={detailTab === t} onClick={() => setDetailTab(t)}>
                  {t}
                  <span>{selectedRepo[t as 'changes' | 'commits' | 'branches'].length}</span>
                </button>
              ))}
            </div>
            <div className="detail-body">
              {detailTab === 'changes' &&
                (selectedRepo.changes.length ? (
                  selectedRepo.changes.map((c, i) => (
                    <div className="file-row" key={`${c.path}-${i}`}>
                      <FileCode2 size={17} />
                      <code>{c.path}</code>
                      <span className={c.conflict ? 'red' : c.index === '?' ? 'mint' : 'amber'}>
                        {c.conflict
                          ? 'Conflict'
                          : c.index === '?'
                            ? 'Untracked'
                            : c.index !== ' '
                              ? 'Staged' + (c.working !== ' ' ? ' + modified' : '')
                              : 'Modified'}
                      </span>
                    </div>
                  ))
                ) : (
                  <Empty
                    icon={Check}
                    title="Working tree is clean"
                    text="There are no uncommitted changes in this repository."
                  />
                ))}
              {detailTab === 'commits' &&
                (selectedRepo.commits.length ? (
                  selectedRepo.commits.map((c) => (
                    <div className="detail-commit" key={c.hash}>
                      <GitCommitHorizontal size={18} />
                      <div>
                        <strong>{c.subject}</strong>
                        <small>
                          {c.author} · {relative(c.date)}
                        </small>
                      </div>
                      <button
                        aria-label={`Copy commit ${c.hash}`}
                        onClick={() => void copy(c.hash)}
                      >
                        <code>{c.hash.slice(0, 7)}</code>
                        <Copy size={12} />
                      </button>
                    </div>
                  ))
                ) : (
                  <Empty
                    icon={GitCommitHorizontal}
                    title="A fresh start"
                    text="No commits in this repository yet."
                  />
                ))}
              {detailTab === 'branches' &&
                (selectedRepo.branches.length ? (
                  selectedRepo.branches.map((b) => (
                    <div className="branch-row" key={b.name}>
                      <GitBranch size={17} />
                      <code>{b.name}</code>
                      {b.current && <span className="status violet">Current</span>}
                      <time>{relative(b.lastCommit || null)}</time>
                    </div>
                  ))
                ) : (
                  <p className="muted">The first commit will create your branch.</p>
                ))}
            </div>
            <div className="detail-footer">
              <span>
                <ShieldCheck size={14} />
                Read-only · {selectedRepo.stashes} stash{selectedRepo.stashes !== 1 ? 'es' : ''}
              </span>
              {selectedRepo.remote && (
                <a href={selectedRepo.remote} target="_blank" rel="noreferrer">
                  Open remote
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
            <p className="upstream-note">
              {selectedRepo.upstream
                ? `Tracking ${selectedRepo.upstream}. Ahead/behind uses your last local fetch.`
                : 'No upstream configured for this branch.'}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
