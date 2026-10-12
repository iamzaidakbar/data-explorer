import { decideChaos, FAILURE_RATE, MAX_LATENCY_MS, MIN_LATENCY_MS, resolveChaosMode, sleep } from './chaos';
import { mulberry32 } from './dataset';

describe('chaos', () => {
  it('keeps default latency within the required 200 ms–3 s window', () => {
    expect(decideChaos('default', () => 0).latencyMs).toBe(MIN_LATENCY_MS);
    expect(decideChaos('default', () => 0.999_999).latencyMs).toBe(MAX_LATENCY_MS);
  });

  it('fails roughly 1 in 10 requests by default', () => {
    const rng = mulberry32(7);
    const n = 20_000;
    let failures = 0;
    for (let i = 0; i < n; i++) if (decideChaos('default', rng).fail) failures++;
    expect(failures / n).toBeCloseTo(FAILURE_RATE, 2);
  });

  it('supports deterministic override modes', () => {
    expect(decideChaos('off', () => 0)).toEqual({ latencyMs: 0, fail: false });
    expect(decideChaos('fail', () => 0.99).fail).toBe(true);
    expect(decideChaos('slow', () => 0)).toEqual({ latencyMs: MAX_LATENCY_MS, fail: false });
  });

  it('lets the request header override the env, and ignores unknown values', () => {
    expect(resolveChaosMode('fail', 'off')).toBe('fail');
    expect(resolveChaosMode(null, 'off')).toBe('off');
    expect(resolveChaosMode('nonsense', undefined)).toBe('default');
    expect(resolveChaosMode(null, undefined)).toBe('default');
  });

  it('sleep ends early when the request is aborted', async () => {
    vi.useFakeTimers();
    try {
      const controller = new AbortController();
      let done = false;
      const pending = sleep(3000, controller.signal).then(() => (done = true));
      await vi.advanceTimersByTimeAsync(100);
      expect(done).toBe(false);
      controller.abort();
      await pending;
      expect(done).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
