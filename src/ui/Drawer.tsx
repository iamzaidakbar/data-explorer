import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { IconButton } from './Button';
import styles from './Drawer.module.css';

export interface DrawerProps {
  title: ReactNode;
  /** Secondary line under the title (e.g. id and status badges). Not part of the accessible name. */
  subtitle?: ReactNode;
  children: ReactNode;
  /** Called for Esc, the close button and backdrop clicks. The owner decides what closing means (e.g. navigate). */
  onClose: () => void;
  /**
   * Where focus goes when the drawer unmounts. Defaults to the element focused before it opened, if still in the
   * DOM. Owners of virtualized lists pass a function because the original element may have been recycled.
   */
  returnFocus?: () => void;
  closeLabel?: string;
}

/**
 * Modal side drawer built on native <dialog>.showModal(): the browser provides the focus trap, inert background,
 * top-layer stacking and Esc handling. The drawer is open for as long as it is mounted, which lets a route own it.
 */
export function Drawer({
  title,
  subtitle,
  children,
  onClose,
  returnFocus,
  closeLabel = 'Close',
}: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // Latest-callback ref so the mount/unmount effect below runs exactly once yet calls the current callback.
  const returnFocusRef = useRef(returnFocus);
  useLayoutEffect(() => {
    returnFocusRef.current = returnFocus;
  });
  const unmounting = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    return () => {
      unmounting.current = true;
      if (dialog.open) dialog.close();
      if (returnFocusRef.current) returnFocusRef.current();
      else if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  return (
    // Backdrop click is a mouse convenience; keyboard users have Esc and the close button.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      className={styles.drawer}
      aria-labelledby={titleId}
      onCancel={(e) => {
        // Esc: let the owner close (e.g. via navigation) instead of the browser closing the dialog behind React.
        e.preventDefault();
        onClose();
      }}
      onClose={() => {
        // The browser can close a modal dialog itself (e.g. Chrome may skip a cancelable `cancel` event for Esc
        // without prior user activation). Keep the owner in sync so the URL never claims an open drawer.
        if (!unmounting.current) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.header}>
        <div className={styles.heading}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {subtitle}
        </div>
        <IconButton label={closeLabel} icon="x" size="sm" className={styles.close} onClick={onClose} />
      </div>
      <div className={styles.body}>{children}</div>
    </dialog>
  );
}
