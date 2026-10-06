# Contributing to Branchdesk

Thanks for helping make local development a little calmer.

## Get started

1. Fork and clone the repository.
2. Use Node.js 22.13 or newer and run `npm ci`.
3. Run `npm run dev` for the fictional demo workspace.
4. For local Git integration, run `npm run build`, then `npm start -- --root /path/to/test-projects`.

Before submitting a pull request, run `npm test` and `npm run build`. Include a screenshot for visible UI changes. Use `npm run format` to keep code style consistent.

## Keep changes focused

Explain the problem, the behavior after your change, and how you checked it. A small, complete improvement is easier to review than a broad redesign. Open an issue before adding Git write operations, authentication, telemetry, or a major dependency.

Prefer tests using temporary repositories over mocks for Git behavior. Never add actual project names, absolute personal paths, credentials, or private code to fixtures or screenshots. Keep the public demo fictional.

## Design principles

- Open directly on useful work. Avoid onboarding that gets in the way.
- Keep data provenance clear: local data and sample data must be distinguishable.
- Make empty, loading, failure, and success states useful.
- Preserve keyboard access, readable contrast, reduced-motion support, and narrow-screen layouts.
- Keep the local app read-only unless a separately designed workflow is explicitly approved.

## Good first contributions

- Reproduction fixtures for unusual filenames and Git states.
- Improved keyboard or screen-reader behavior.
- Clearer setup instructions for Windows.
- Fixes for reproducible layout problems.

Be respectful, assume good intent, and discuss the work rather than the person. Please keep issues and pull requests relevant to the project.
