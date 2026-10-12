/**
 * default: random latency + 10% failures (production behaviour)
 * off:     no latency, no failures (E2E determinism)
 * fail:    random latency, then always fail (demoing error UI)
 * slow:    maximum latency, no failures (demoing loading/race UI)
 */
export const CHAOS_MODES = ['default', 'off', 'fail', 'slow'] as const;
export type ChaosMode = (typeof CHAOS_MODES)[number];
export const CHAOS_HEADER = 'x-chaos';

export function asChaosMode(value: string | null | undefined): ChaosMode | undefined {
  return CHAOS_MODES.find((m) => m === value?.trim().toLowerCase());
}
