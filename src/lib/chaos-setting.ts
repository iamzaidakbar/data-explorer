import { useSyncExternalStore } from 'react';
import { asChaosMode, type ChaosMode } from '../shared/chaos';

/**
 * The "Simulated network" demo control. A per-viewer preference (not view state, so not in the URL); stored in
 * localStorage when available and sent to the mock API as the x-chaos header.
 */
export const CHAOS_OPTIONS: readonly { value: ChaosMode; label: string }[] = [
  { value: 'default', label: 'Realistic' }, // 0.2–3 s latency, ~10% failures (the assignment's spec)
  { value: 'off', label: 'Fast & reliable' },
  { value: 'slow', label: 'Always slow' },
  { value: 'fail', label: 'Always fail' },
];

const STORAGE_KEY = 'ticket-explorer.chaos';
const listeners = new Set<() => void>();
let memoryValue: ChaosMode = 'default';

export function getChaosMode(): ChaosMode {
  try {
    return asChaosMode(window.localStorage.getItem(STORAGE_KEY)) ?? 'default';
  } catch {
    return memoryValue;
  }
}

export function setChaosMode(mode: ChaosMode) {
  memoryValue = mode;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage unavailable (private mode, blocked): the in-memory value still applies for this page view.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useChaosMode(): ChaosMode {
  return useSyncExternalStore(subscribe, getChaosMode, () => 'default');
}
