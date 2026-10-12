import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Banner, Button } from '../ui';

/** Last-resort boundary for render errors and routing failures. Never shows stale data; offers recovery. */
export function RootErrorPage() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error';
  return (
    <main style={{ padding: 'var(--space-6)', maxWidth: 640 }}>
      <h1>Something went wrong</h1>
      <Banner
        tone="danger"
        role="alert"
        title="The page crashed while rendering."
        actions={
          <Button variant="primary" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        }
      >
        <details>
          <summary>Technical details</summary>
          <code>{detail}</code>
        </details>
      </Banner>
      <p style={{ marginTop: 'var(--space-4)' }}>
        <Link to="/tickets">Go to all tickets</Link>
      </p>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-heading">
      <h1 id="not-found-heading">Page not found</h1>
      <p style={{ marginTop: 'var(--space-3)' }}>
        <Link to="/tickets">Go to all tickets</Link>
      </p>
    </section>
  );
}
