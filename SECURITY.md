# Security

## Local trust boundary

Branchdesk is intended for one developer on their own machine, scanning repositories they trust. The local server binds to `127.0.0.1`, validates HTTP Host and Origin, rejects cross-site fetches, and requires a random per-process token for API requests. The token is delivered only with the local HTML document. Do not expose this server through a public reverse proxy or tunnel.

Git is invoked with argument arrays, not a shell. Optional Git locks, fsmonitor hooks, and log signature checks are disabled for these reads. The app never runs package scripts or Git write commands. Symlinked directories are not traversed. Remote URL credentials, query strings, and fragments are removed before links reach the UI.

The static demo contains fictional data. Running the local app sends no repository metadata to the hosted demo, GitHub, or an analytics service. Opening a remote link or the GitHub link is a normal browser navigation. Installing dependencies requires registry access.

The session token does not protect against software already running as your OS user, a malicious browser extension, or compromised same-origin JavaScript. Keep your Node.js, Git, browser, and dependencies updated.

## Report a vulnerability

Please do not include credentials, private file contents, or personal filesystem paths in public issues. Contact the maintainer through the contact link on [their GitHub profile](https://github.com/mahmoudaladin7) for a sensitive report. Include the affected version, reproduction steps using a minimal fictional repository, and the expected impact.
