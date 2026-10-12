import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

/**
 * Online status from TanStack Query's onlineManager — the same signal that pauses and resumes queries — so the UI
 * can never disagree with what the data layer is doing. (It listens to the window online/offline events.)
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (notify) => onlineManager.subscribe(() => notify()),
    () => onlineManager.isOnline(),
    () => true,
  );
}

/** onlineManager assumes "online" until an event says otherwise; seed it from the browser (e.g. bfcache restores). */
export function syncInitialOnlineStatus() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) onlineManager.setOnline(false);
}
