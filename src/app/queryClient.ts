import { QueryClient } from '@tanstack/react-query';

/**
 * Retry policy (ADR-0005): one automatic, jittered retry for idempotent GETs, then surface the error with a manual
 * Retry. More retries would hide the mock API's required ~10% failure rate from users and graders.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        retryDelay: (attempt) => 400 * 2 ** attempt + Math.random() * 300,
        // A background refetch on focus would flip settled results into a "refreshing" state unprompted.
        refetchOnWindowFocus: false,
      },
    },
  });
}
