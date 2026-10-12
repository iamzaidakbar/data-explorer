import styles from './Skeleton.module.css';

/** Purely visual placeholder; the surrounding container must convey loading state to assistive tech. */
export function Skeleton({ width = '100%' }: { width?: string | number }) {
  return <span aria-hidden="true" className={styles.skeleton} style={{ width }} />;
}
