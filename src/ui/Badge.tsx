import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'outline';

/** Tone is decoration only: the text label always carries the meaning (never colour alone). */
export function Badge({
  tone = 'neutral',
  dot = false,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={[styles.badge, styles[tone], dot && styles.dot].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}
