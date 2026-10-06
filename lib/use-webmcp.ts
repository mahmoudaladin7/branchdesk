import { useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import type { Repository } from './types';

type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
/** Progressive enhancement: ordinary browsers need no WebMCP support. */
export function useWebMCP(repositories: Repository[], applyQuery: (query: string) => void) {
  const current = useRef({ repositories, applyQuery });
  current.current = { repositories, applyQuery };
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'filter_repositories',
            title: 'Filter workspace repositories',
            description:
              'Show repositories matching a query in the visible Branchdesk workspace. Changes only the current view and search filter, never repository files.',
            inputSchema: {
              type: 'object',
              properties: { query: { type: 'string', maxLength: 200 } },
              required: ['query'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: true },
            execute(input: unknown) {
              if (
                !input ||
                typeof input !== 'object' ||
                !('query' in input) ||
                typeof input.query !== 'string' ||
                input.query.length > 200 ||
                Object.keys(input).length !== 1
              )
                throw new Error('Provide only a query string of at most 200 characters.');
              const query = input.query;
              flushSync(() => current.current.applyQuery(query));
              return {
                repositories: current.current.repositories
                  .filter((r) =>
                    `${r.name} ${r.description} ${r.branch} ${r.language}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((r) => ({
                    name: r.name,
                    branch: r.branch,
                    changed: r.changes.length,
                    ahead: r.ahead,
                    behind: r.behind,
                  })),
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {
        /* Optional browser capability. */
      });
    } catch {
      /* Unsupported proposal versions do not break the app. */
    }
    return () => lifecycle.abort();
  }, []);
}
