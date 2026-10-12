import type { ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './Banner.module.css';

export interface BannerProps {
  tone?: 'info' | 'warning' | 'danger';
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  /**
   * No live role by default: announcements go through the app-wide announcer so they are not duplicated.
   * Pass a role only for content that is not announced elsewhere.
   */
  role?: 'status' | 'alert';
}

export function Banner({ tone = 'info', title, children, actions, role }: BannerProps) {
  return (
    <div className={`${styles.banner} ${styles[tone]}`} role={role}>
      {tone !== 'info' && <Icon name="alert" size={16} className={styles.icon} />}
      <div className={styles.body}>
        {title && <p className={styles.title}>{title}</p>}
        {children}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
