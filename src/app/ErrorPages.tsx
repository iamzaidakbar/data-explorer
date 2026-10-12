import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button, Icon } from '../ui';
import styles from './ErrorPages.module.css';

/** Last-resort boundary for render errors and routing failures. Never shows stale data; offers recovery. */
export function RootErrorPage() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error';
  return (
    <main className={styles.wrap}>
      <div className={styles.card} role="alert">
        <span className={`${styles.icon} ${styles.danger}`}>
          <Icon name="alert" size={22} />
        </span>
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.text}>The page crashed while rendering. Reloading usually fixes it.</p>
        <div className={styles.actions}>
          <Button variant="primary" icon="refresh" onClick={() => window.location.reload()}>
            Reload page
          </Button>
          <Link to="/tickets" className={styles.link}>
            Go to all tickets
          </Link>
        </div>
        <details className={styles.details}>
          <summary>Technical details</summary>
          <code>{detail}</code>
        </details>
      </div>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <section className={styles.wrap} aria-labelledby="not-found-heading">
      <div className={styles.card}>
        <span className={styles.icon}>
          <Icon name="inbox" size={22} />
        </span>
        <h1 id="not-found-heading" className={styles.title}>
          Page not found
        </h1>
        <p className={styles.text}>The address may be mistyped, or the page may have moved.</p>
        <div className={styles.actions}>
          <Link to="/tickets" className={styles.link}>
            Go to all tickets
          </Link>
        </div>
      </div>
    </section>
  );
}
