import { useQuery } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ApiRequestError, fetchTicket } from '../../lib/api-client';
import { formatCount, formatDateTime } from '../../lib/format';
import {
  CHANNEL_LABEL,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  STATUS_LABEL,
  STATUS_TONE,
} from '../../lib/ticket-labels';
import type { Ticket } from '../../shared/contract';
import { Badge, Banner, Button, Drawer, Skeleton, VisuallyHidden } from '../../ui';
import styles from './ticket-detail.module.css';

const TICKET_ID = /^TCK-\d{6}$/;

function openedFromList(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'fromList' in state && state.fromList === true;
}

/**
 * Route element for /tickets/:ticketId (ADR-0006). Rendered inside the explorer's <Outlet />, so the list, its
 * filters and scroll position stay mounted underneath. Has its own loading/error/404 states: a failure here never
 * affects the list.
 */
export function TicketDrawerRoute() {
  const { ticketId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const validId = TICKET_ID.test(ticketId);

  const query = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: ({ signal }) => fetchTicket(ticketId, signal),
    enabled: validId,
    // A missing ticket won't appear on retry.
    retry: (failures, error) => !(error instanceof ApiRequestError && error.status === 404) && failures < 1,
  });

  // Esc auto-repeat or a double click can request close twice before the navigation lands; stepping back twice
  // could leave the app entirely.
  const closing = useRef(false);
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    // Opened from the list: step back to that exact history entry. Deep link: replace with the list URL.
    if (openedFromList(location.state)) navigate(-1);
    else navigate({ pathname: '/tickets', search: location.search }, { replace: true });
  }, [location.search, location.state, navigate]);

  // Return focus to this ticket's row if it is rendered, else to the grid's current tab stop. preventScroll:
  // closing the drawer must leave the list exactly where it was (R9), even if the target is an off-screen row.
  const returnFocus = useCallback(() => {
    const target =
      (validId ? document.querySelector<HTMLElement>(`[data-ticket-id="${ticketId}"]`) : null) ??
      document.querySelector<HTMLElement>('[role="grid"] [role="row"][tabindex="0"]');
    target?.focus({ preventScroll: true });
  }, [ticketId, validId]);

  const notFound = !validId || (query.error instanceof ApiRequestError && query.error.status === 404);
  const title = query.data?.subject ?? (notFound ? 'Ticket not found' : ticketId);

  return (
    <Drawer title={title} onClose={close} returnFocus={returnFocus} closeLabel="Close ticket details">
      {notFound ? (
        <p>
          There is no ticket with ID <strong>{ticketId}</strong>. It may have been mistyped in the link.
        </p>
      ) : query.isError ? (
        <Banner
          tone="danger"
          role="alert"
          title="Couldn’t load this ticket"
          actions={
            <Button
              variant="primary"
              aria-disabled={query.isFetching}
              onClick={() => !query.isFetching && void query.refetch()}
            >
              {query.isFetching ? 'Retrying…' : 'Retry'}
            </Button>
          }
        >
          <p>{query.error.message}</p>
        </Banner>
      ) : query.data ? (
        // A failed refetch keeps old `data`; the error branch above wins so it is never shown as current.
        <TicketDetails ticket={query.data} />
      ) : (
        <div className={styles.loading} aria-busy="true">
          <VisuallyHidden>Loading ticket {ticketId}</VisuallyHidden>
          <Skeleton width="60%" />
          <Skeleton width="40%" />
          <Skeleton width="75%" />
          <Skeleton width="50%" />
        </div>
      )}
    </Drawer>
  );
}

function TicketDetails({ ticket }: { ticket: Ticket }) {
  return (
    <>
      <dl className={styles.fields}>
        <dt>Ticket</dt>
        <dd>{ticket.id}</dd>
        <dt>Status</dt>
        <dd>
          <Badge tone={STATUS_TONE[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge>
        </dd>
        <dt>Priority</dt>
        <dd>
          <Badge tone={PRIORITY_TONE[ticket.priority]}>{PRIORITY_LABEL[ticket.priority]}</Badge>
          {ticket.slaBreached && (
            <>
              {' '}
              <Badge tone="danger">SLA breached</Badge>
            </>
          )}
        </dd>
        <dt>Customer</dt>
        <dd>
          {ticket.customer.name}
          <br />
          <span className={styles.muted}>{ticket.customer.email}</span>
        </dd>
        <dt>Assignee</dt>
        <dd>{ticket.assignee ?? <span className={styles.muted}>Unassigned</span>}</dd>
        <dt>Channel</dt>
        <dd>{CHANNEL_LABEL[ticket.channel]}</dd>
        <dt>Messages</dt>
        <dd>{formatCount(ticket.messageCount)}</dd>
        <dt>Created</dt>
        <dd>{formatDateTime(ticket.createdAt)}</dd>
        <dt>Updated</dt>
        <dd>{formatDateTime(ticket.updatedAt)}</dd>
        <dt>Tags</dt>
        <dd>
          {ticket.tags.length > 0 ? (
            <span className={styles.tags}>
              {ticket.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </span>
          ) : (
            <span className={styles.muted}>None</span>
          )}
        </dd>
      </dl>
      <section className={styles.section} aria-labelledby="ticket-description">
        <h3 id="ticket-description" className={styles.sectionTitle}>
          Description
        </h3>
        <p className={styles.description}>{ticket.description}</p>
      </section>
    </>
  );
}
