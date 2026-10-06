#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { access } from 'node:fs/promises';
import { normalizeRoot } from '../server/git.mjs';
import { createDashboardServer } from '../server/http.mjs';
const args = process.argv.slice(2),
  roots = [];
let port = 4317;
const help = `Branchdesk v0.1.0 — Your local repositories, back in focus.\n\nUsage: branchdesk [--root <folder>] [--port <number>]\n\n  --root <folder>   Scan a folder (repeat for multiple roots; default: current directory).\n  --port <number>   Local port (default: 4317).\n  --help           Show this guide.\n  --version        Print the version.\n\nThe dashboard is read-only. It never fetches, commits, pushes, or runs project scripts.\n`;
try {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      console.log(help);
      process.exit(0);
    }
    if (args[i] === '--version') {
      console.log('0.1.0');
      process.exit(0);
    }
    if (args[i] === '--root') {
      if (!args[i + 1] || args[i + 1].startsWith('--'))
        throw new Error('--root needs a folder path.');
      roots.push(args[++i]);
    } else if (args[i] === '--port') {
      if (!/^\d+$/.test(args[i + 1] || ''))
        throw new Error('--port needs an integer from 1 to 65535.');
      port = Number(args[++i]);
      if (port < 1 || port > 65535) throw new Error('--port must be between 1 and 65535.');
    } else throw new Error(`Unknown option: ${args[i]}. Use --help for usage.`);
  }
  if (roots.length > 20) throw new Error('Use at most 20 root folders.');
  const normalized = [
    ...new Set(await Promise.all((roots.length ? roots : [process.cwd()]).map(normalizeRoot))),
  ];
  const staticDir = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
  await access(resolve(staticDir, 'index.html')).catch(() => {
    throw new Error('Dashboard assets are missing. Run npm ci and npm run build first.');
  });
  const server = createDashboardServer({ roots: normalized, staticDir });
  server.on('error', (e) => {
    console.error(
      `Branchdesk: ${e.code === 'EADDRINUSE' ? `Port ${port} is in use. Choose another with --port.` : e.message}`,
    );
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(
      `\n  Branchdesk v0.1.0\n  http://127.0.0.1:${port}\n\n  Watching ${normalized.length} root folder${normalized.length === 1 ? '' : 's'} (read-only).\n  Press Ctrl+C to stop.\n`,
    );
  });
  const stop = () => server.close(() => process.exit(0));
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
} catch (e) {
  console.error(`Branchdesk: ${e.message}`);
  process.exitCode = 1;
}
