# Architecture

Branchdesk has two runtime modes sharing one interface.

## Local application

`bin/branchdesk.mjs` parses root folders and the loopback port, validates the roots, and starts `server/http.mjs`. The HTTP server serves `dist/` and embeds a random session token in the root HTML document. Presence of that bootstrap value selects local mode in the UI.

`GET /api/workspace` returns the current root list, repository snapshots, scan timestamp, and scan warnings. `POST /api/roots` validates a folder, adds it to the in-memory root list, and returns a fresh snapshot. Both endpoints require `X-Branchdesk-Token`. There is no disk-backed application database.

`server/git.mjs` walks roots without following symlinks, detects `.git` files or directories, and verifies repository roots. It reads repositories with at most four concurrent readers. Git reads have a 15-second timeout and an 8 MiB output cap. Requests share an in-flight scan instead of launching duplicate scans.

Status uses NUL-delimited Git porcelain v2. Rename source fields are skipped without corrupting filenames containing spaces or newlines. Recent log data, local branches, origin URL, and tracked-file language estimates are fetched independently. Missing optional information does not discard a readable status.

## Static demo

Without the local bootstrap, the UI uses `lib/demo.ts`. The demo makes no API calls to the user's machine. Its data is fictional and labeled. Installation instructions explain how to run the real application. `npm run build` produces static assets suitable for a static host.

### Publishing the demo

The `pages.yml` workflow tests and builds the app, then deploys `dist/` to GitHub Pages on pushes to `main`. Relative asset paths support both a project URL such as `/branchdesk/` and a root domain. Only the client assets and fictional demo data are deployed; the local Node server is not hosted.

1. Push the source to `mahmoudaladin7/branchdesk` on the `main` branch.
2. In repository **Settings → Pages**, select **GitHub Actions** as the source.
3. In **Actions → Deploy demo to GitHub Pages**, run the workflow or rerun the initial deployment.
4. Verify the deployed page at `https://mahmoudaladin7.github.io/branchdesk/`, then add its live link to the README and repository website field.

The workflow file alone does not mean the demo is live. Future pushes to `main` update the demo automatically after its tests and build pass.

## UI

The React workspace owns view, filter, search, and dialog state. Radix dialogs provide focus trapping and Escape behavior. Pins, theme, layout, and auto-refresh preferences use browser storage. These preferences are separate for local and demo pin lists. Repository data itself stays in memory.

The navigation uses URL hashes, so browser back/forward can switch views. The app respects reduced motion and supports keyboard navigation and responsive layouts.

## Repository map

| Path | Responsibility |
| --- | --- |
| `app/` | React entry, workspace, and theme/layout styles |
| `components/` | UI primitives and reusable display components |
| `lib/` | Types, sample data, and client helpers |
| `bin/` | CLI entry point |
| `server/` | Git discovery/reads and loopback HTTP API |
| `tests/` | Temporary Git and HTTP integration tests |
| `docs/` | Screenshots, architecture, and roadmap |
| `.github/` | CI and issue templates |

See the README for v0.1.0 limits and `SECURITY.md` for the local trust model.
