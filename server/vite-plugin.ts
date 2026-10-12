import type { Connect, Plugin } from 'vite';
import { routeApiRequest } from './handlers.js';

/** Serves the mock API from the Vite dev and preview servers so local behaviour matches Vercel (ADR-0002). */
const middleware: Connect.NextHandleFunction = (req, res, next) => {
  if (!req.url?.startsWith('/api/')) return next();

  // Propagate client disconnects (e.g. an aborted fetch) into the handler so its latency sleep ends early.
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(', '));
  }
  const request = new Request(new URL(req.url, 'http://localhost'), {
    method: req.method ?? 'GET',
    headers,
    signal: controller.signal,
  });

  routeApiRequest(request)
    .then(async (response) => {
      if (res.destroyed) return;
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(await response.text());
    })
    .catch(next);
};

export function mockApi(): Plugin {
  return {
    name: 'mock-api',
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  };
}
