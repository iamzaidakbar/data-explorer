import { useEffect, useRef } from 'react';
import { useAnnounce } from '../../lib/announcer';
import { plural } from '../../lib/format';
import type { TicketListState } from './useTicketPages';

/**
 * Screen-reader announcements for list outcomes: one per settled result set (count, empty or error), one per new
 * failure (including a retry that fails again), and one when failed rows are restored. Keyed by result set and
 * failure time, so re-renders and scrolling never repeat them and a superseded search is never announced.
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
              `${setKey}|error|${list.failedAt}`,
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
    list.kind === 'ready' && list.failedPages.length > 0
      ? `${setKey}|${list.failureStamp}`
      : `${setKey}|none`;
  useEffect(() => {
    const previous = lastFailure.current;
    lastFailure.current = failureId;
    if (failureId === previous) return;
    if (!failureId.endsWith('|none')) {
      announce('Some rows couldn’t be loaded. A Retry button is available above the table.', 'assertive');
    } else if (previous.startsWith(`${setKey}|`) && !previous.endsWith('|none')) {
      announce('The missing rows have loaded.', 'polite');
    }
  }, [announce, failureId, setKey]);
}
