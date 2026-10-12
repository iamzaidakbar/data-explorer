import { ApiRequestError } from '../../lib/api-client';
import { Banner, Button } from '../../ui';
import styles from './explorer.module.css';

/** After this long, the loading state explains itself instead of looking stuck. */
export const SLOW_HINT_MS = 1500;

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
        // aria-disabled (not disabled) keeps keyboard focus on the button while the retry is in flight.
        <Button variant="primary" onClick={() => !retrying && onRetry()} aria-disabled={retrying}>
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
