import { onlineManager } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useAnnounce } from '../lib/announcer';
import { useOnlineStatus } from '../lib/online-status';
import { Icon } from '../ui';
import styles from './ConnectionBanner.module.css';

/** How long the "Back online" confirmation stays visible. */
export const BACK_ONLINE_MS = 4000;

/**
 * App-wide connection status. Offline: a persistent banner explaining what the user is looking at. Reconnected:
 * a brief confirmation while paused requests resume. Transitions are announced; the initial state is not.
 */
export function ConnectionBanner() {
  const online = useOnlineStatus();
  const announce = useAnnounce();
  const [justReconnected, setJustReconnected] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // React to transitions (not the initial state) straight from the same source that pauses/resumes queries.
  useEffect(() => {
    const unsubscribe = onlineManager.subscribe((isOnline) => {
      clearTimeout(timer.current);
      if (!isOnline) {
        setJustReconnected(false);
        announce('You’re offline. Results already shown may be out of date.', 'assertive');
        return;
      }
      announce('Back online. Refreshing results.', 'polite');
      setJustReconnected(true);
      timer.current = setTimeout(() => setJustReconnected(false), BACK_ONLINE_MS);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer.current);
    };
  }, [announce]);

  if (online && !justReconnected) return null;
  return (
    <div className={styles.region}>
      {online ? (
        <div className={`${styles.banner} ${styles.online}`}>
          <Icon name="wifi" size={16} />
          <span className={styles.title}>Back online</span>
          <span className={styles.text}>Refreshing results…</span>
        </div>
      ) : (
        <div className={`${styles.banner} ${styles.offline}`}>
          <Icon name="wifiOff" size={16} />
          <span className={styles.title}>You’re offline.</span>
          <span className={`${styles.text} ${styles.long}`}>
            Results already loaded stay visible but may be out of date. Anything else loads automatically when
            you reconnect.
          </span>
          <span className={`${styles.text} ${styles.short}`}>Loaded results may be out of date.</span>
        </div>
      )}
    </div>
  );
}
