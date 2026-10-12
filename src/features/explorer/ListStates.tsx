import { ApiRequestError } from '../../lib/api-client';
import { Banner, Button, Icon } from '../../ui';
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
    <div className={styles.state}>
      <span className={`${styles.stateIcon} ${styles.stateIconDanger}`}>
        <Icon name="alert" size={22} />
      </span>
      <p className={styles.stateTitle}>Couldn’t load tickets</p>
      <p className={styles.stateText}>
        {error.message} No results are shown because they might not match your current search.
      </p>
      <div className={styles.stateActions}>
        {/* aria-disabled (not disabled) keeps keyboard focus on the button while the retry is in flight. */}
        <Button
          variant="primary"
          icon="refresh"
          onClick={() => !retrying && onRetry()}
          aria-disabled={retrying}
        >
          {retrying ? 'Retrying…' : 'Retry'}
        </Button>
      </div>
      {(requestId || status) && (
        <details className={styles.details}>
          <summary>Technical details</summary>
          {[status, requestId && `Request ID ${requestId}`].filter(Boolean).join(' · ')}
        </details>
      )}
    </div>
  );
}

export function OfflineState({ query }: { query: string }) {
  return (
    <div className={styles.state}>
      <span className={styles.stateIcon}>
        <Icon name="wifiOff" size={22} />
      </span>
      <p className={styles.stateTitle}>You’re offline</p>
      <p className={styles.stateText}>
        {query ? `Results for “${query}”` : 'These results'} will load automatically when your connection
        returns. Nothing is shown in the meantime because older results might not match this search.
      </p>
    </div>
  );
}

export function EmptyState({ canClear, onClear }: { canClear: boolean; onClear: () => void }) {
  return (
    <div className={styles.state}>
      <span className={styles.stateIcon}>
        <Icon name="inbox" size={22} />
      </span>
      <p className={styles.stateTitle}>No tickets match</p>
      <p className={styles.stateText}>Try a different search term or remove some filters.</p>
      {canClear && (
        <div className={styles.stateActions}>
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
        <Button size="sm" icon="refresh" onClick={onRetry}>
          Retry failed rows
        </Button>
      }
    >
      <p>Rows {ranges} failed to load. The other rows shown are up to date for your current search.</p>
    </Banner>
  );
}
