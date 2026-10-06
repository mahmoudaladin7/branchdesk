# Roadmap

The goal is a dependable place to resume local development. This list is a direction, not a delivery promise. Feedback can change the order.

## v0.1 — A useful starting point

- [x] Local Git repository discovery and status.
- [x] Changed filenames, staging states, recent commits, local branches, and stash counts.
- [x] Ahead/behind counts using local upstream refs.
- [x] Search, status filters, sorting, pins, and grid/list layouts.
- [x] Dark/light themes and responsive interface.
- [x] Fictional sample-data demo, screenshots, contribution guide, and integration tests.
- [ ] Publish the source and enable the GitHub Pages demo.

## Next small releases

1. **Remember workspace roots.** Add an explicit configuration file and UI for managing saved folders, with migration tests.
2. **Make resuming work easier.** Show a concise read-only diff preview and worktree relationships. Keep large/binary diffs bounded.
3. **Improve discovery feedback.** Progress indicators, adjustable scan depth, and clearer reporting for inaccessible roots.
4. **Make installation easier.** Validate Windows, add release bundles, and consider npm distribution after checking the name and packaging.

## Evaluate with user feedback

- Safe, explicit “open in editor” actions.
- A compact command palette for common navigation.
- Opt-in GitHub PR and CI context, with scoped authentication.

## Sustainable cadence

For each day or two of work, choose one user problem, ship a tested improvement, and show a short before/after example in the changelog. Prioritize reported friction over feature count. Keep the public demo in sync with releases.

We will not pad the repository with meaningless commits or build features just to chase stars.
