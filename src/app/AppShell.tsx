import { useRef } from 'react';
import { Link, Outlet } from 'react-router';
import { ChaosControl } from './ChaosControl';
import styles from './AppShell.module.css';

export const MAIN_ID = 'main-content';

export function AppShell() {
  const mainRef = useRef<HTMLElement>(null);
  return (
    <>
      <a
        href={`#${MAIN_ID}`}
        className={styles.skipLink}
        onClick={(e) => {
          // Move focus without touching the URL: the hash would otherwise add a history entry.
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to main content
      </a>
      <header className={styles.header}>
        <Link to="/tickets" className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            TE
          </span>
          Ticket Explorer
        </Link>
        <ChaosControl className={styles.chaos} />
      </header>
      <main id={MAIN_ID} ref={mainRef} tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
    </>
  );
}
