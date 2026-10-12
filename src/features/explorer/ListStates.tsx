import { useEffect, useState } from 'react';
import { ApiRequestError } from '../../lib/api-client';
import { Banner, Button, Skeleton } from '../../ui';
import styles from './explorer.module.css';

/** After this long, the loading state explains itself instead of looking stuck. */
export const SLOW_HINT_MS = 1500;

export function LoadingState({ query }: { query: string }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_HINT_MS);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className={styles.stateBox} aria-busy="true">
      <p className={styles.stateTitle}>{query ? `Searching for “${query}”…` : 'Loading tickets…'}</p>
      {slow && <p className={styles.muted}>The server is responding slowly. Still waiting for results…</p>}
      <div className={styles.skeletonRows} aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className={styles.skeletonRow}>
            <Skeleton width={`${55 + ((i * 17) % 40)}%`} />
            <Skeleton />
            <Skeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ErrorState({
  error,
  retrying,
  onRetry,
}: {
  error: Error;
  retrying: boolean;
  onRetry: () => void;
}) {
  const requestId = error instanceof ApiRequestError ? error.requestId : undefined;
  const status = error instanceof ApiRequestError && error.status ? `HTTP ${error.status}` : undefined;
  return (
    <Banner
      tone="danger"
      title="Couldn’t load tickets"
      actions={
        <Button variant="primary" onClick={onRetry} disabled={retrying}>
          {retrying ? 'Retrying…' : 'Retry'}
        </Button>
      }
    >
      <p>{error.message} No results are shown because they might not match your current search.</p>
      {(requestId || status) && (
        <details className={styles.details}>
          <summary>Technical details</summary>
          {[status, requestId && `Request ID ${requestId}`].filter(Boolean).join(' · ')}
        </details>
      )}
    </Banner>
  );
}

export function EmptyState({ canClear, onClear }: { canClear: boolean; onClear: () => void }) {
  return (
    <div className={styles.stateBox}>
      <p className={styles.stateTitle}>No tickets match</p>
      <p className={styles.muted}>Try a different search term or remove some filters.</p>
      {canClear && (
        <div>
          <Button onClick={onClear}>Clear search and filters</Button>
        </div>
      )}
    </div>
  );
}

export function PartialFailureBanner({
  pages,
  pageSize,
  onRetry,
}: {
  pages: number[];
  pageSize: number;
  onRetry: () => void;
}) {
  const ranges = pages.map((p) => `${p * pageSize + 1}–${(p + 1) * pageSize}`).join(', ');
  return (
    <Banner
      tone="warning"
      title="Some rows couldn’t be loaded"
      actions={
        <Button size="sm" onClick={onRetry}>
          Retry failed rows
        </Button>
      }
    >
      <p>Rows {ranges} failed to load. The other rows shown are up to date for your current search.</p>
    </Banner>
  );
}
