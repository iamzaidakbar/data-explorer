/**
 * Latency and failure injection required by the assignment (R3): 200 ms–3 s latency, ~1 in 10 requests fail.
 * The defaults must not change. Overrides exist only for demos and deterministic tests.
 */
export const MIN_LATENCY_MS = 200;
export const MAX_LATENCY_MS = 3000;
export const FAILURE_RATE = 0.1;

/**
 * default: random latency + 10% failures (production behaviour)
 * off:     no latency, no failures (E2E determinism)
 * fail:    random latency, then always fail (demoing error UI)
 * slow:    maximum latency, no failures (demoing loading/race UI)
 */
export const CHAOS_MODES = ['default', 'off', 'fail', 'slow'] as const;
export type ChaosMode = (typeof CHAOS_MODES)[number];
export const CHAOS_HEADER = 'x-chaos';

function asMode(value: string | null | undefined): ChaosMode | undefined {
  return CHAOS_MODES.find((m) => m === value?.trim().toLowerCase());
}

/** A per-request header wins over the process-wide env var; unknown values fall back to default. */
export function resolveChaosMode(header: string | null, env: string | undefined): ChaosMode {
  return asMode(header) ?? asMode(env) ?? 'default';
}

export interface ChaosDecision {
  latencyMs: number;
  fail: boolean;
}

export function decideChaos(mode: ChaosMode, random: () => number): ChaosDecision {
  const randomLatency = () => Math.round(MIN_LATENCY_MS + random() * (MAX_LATENCY_MS - MIN_LATENCY_MS));
  switch (mode) {
    case 'off':
      return { latencyMs: 0, fail: false };
    case 'fail':
      return { latencyMs: randomLatency(), fail: true };
    case 'slow':
      return { latencyMs: MAX_LATENCY_MS, fail: false };
    case 'default':
      return { latencyMs: randomLatency(), fail: random() < FAILURE_RATE };
  }
}

/** Resolves after `ms`, or early (without throwing) once `signal` aborts so cancelled requests free up quickly. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0 || signal?.aborted) return resolve();
    const timer = setTimeout(done, ms);
    signal?.addEventListener('abort', done, { once: true });
    function done() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', done);
      resolve();
    }
  });
}
