import { useEffect, useRef } from 'react';
import { useAnnounce } from '../../lib/announcer';
import { plural } from '../../lib/format';
import type { TicketListState } from './useTicketPages';

/**
 * Screen-reader announcements for list outcomes: one per settled result set (count, empty or error) and one per
 * new partial failure. Keyed by result set, so re-renders and scrolling never repeat them, and an intermediate
 * search that was superseded is never announced.
 */
export function useListAnnouncements(setKey: string, list: TicketListState) {
  const announce = useAnnounce();
  const lastOutcome = useRef('');
  const lastFailure = useRef('');

  const [outcomeId, message, politeness] =
    list.kind === 'ready'
      ? [`${setKey}|ready`, `${plural(list.total, 'ticket', 'tickets')} found`, 'polite' as const]
      : list.kind === 'empty'
        ? [`${setKey}|empty`, 'No tickets match your search and filters.', 'polite' as const]
        : list.kind === 'error'
          ? [
              `${setKey}|error`,
              `Couldn’t load tickets. ${list.error.message} A Retry button is available.`,
              'assertive' as const,
            ]
          : ['', '', 'polite' as const];

  useEffect(() => {
    if (!outcomeId || outcomeId === lastOutcome.current) return;
    lastOutcome.current = outcomeId;
    announce(message, politeness);
  }, [announce, outcomeId, message, politeness]);

  const failureId =
    list.kind === 'ready' && list.failedPages.length > 0 ? `${setKey}|${list.failedPages.join(',')}` : '';
  useEffect(() => {
    if (!failureId || failureId === lastFailure.current) return;
    lastFailure.current = failureId;
    announce('Some rows couldn’t be loaded. A Retry button is available above the table.', 'assertive');
  }, [announce, failureId]);
}
