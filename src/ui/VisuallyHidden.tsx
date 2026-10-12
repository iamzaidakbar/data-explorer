import type { HTMLAttributes } from 'react';
import styles from './VisuallyHidden.module.css';

/** Content for screen readers only (still in the accessibility tree, unlike display:none). */
export function VisuallyHidden(props: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={styles.root} />;
}

export const visuallyHiddenClass = styles.root;
