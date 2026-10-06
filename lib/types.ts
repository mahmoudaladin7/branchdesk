export interface Change {
  path: string;
  index: string;
  working: string;
  conflict: boolean;
}
export interface Commit {
  hash: string;
  subject: string;
  author: string;
  date: string;
}
export interface Branch {
  name: string;
  current: boolean;
  lastCommit: string;
}
export interface Repository {
  id: string;
  name: string;
  path: string;
  description: string;
  language: string;
  branch: string;
  upstream: string | null;
  ahead: number;
  behind: number;
  changes: Change[];
  commits: Commit[];
  branches: Branch[];
  stashes: number;
  remote: string | null;
  lastActivity: string | null;
  error?: string;
}
export interface Workspace {
  mode: 'demo' | 'local';
  roots: string[];
  repositories: Repository[];
  scannedAt: string;
  warnings: string[];
}
