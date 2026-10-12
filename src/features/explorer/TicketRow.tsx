import { memo } from 'react';
import { formatDate } from '../../lib/format';
import {
  PRIORITY_LABEL,
  PRIORITY_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  CHANNEL_LABEL,
} from '../../lib/ticket-labels';
import type { Ticket } from '../../shared/contract';
import { Badge, Skeleton, VisuallyHidden } from '../../ui';
import { COLUMNS } from './columns';
import styles from './explorer.module.css';

export interface TicketRowProps {
  index: number;
  start: number;
  height: number;
  status: 'loaded' | 'loading' | 'offline' | 'failed';
  /** Stable reference from the query cache, so unchanged rows skip re-rendering. */
  ticket: Ticket | undefined;
  tabbable: boolean;
  onOpen: (ticketId: string) => void;
  onFocusRow: (index: number) => void;
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const col = (id: string) => `${styles.cell} ${styles[`col-${id}`] ?? ''}`;

export const TicketRow = memo(function TicketRow({
  index,
  start,
  height,
  status,
  ticket,
  tabbable,
  onOpen,
  onFocusRow,
}: TicketRowProps) {
  const common = {
    'aria-rowindex': index + 2, // +1 for 1-based, +1 for the header row
    'data-index': index,
    onFocus: () => onFocusRow(index),
    style: { height, transform: `translateY(${start}px)` },
  } as const;

  if (status !== 'loaded' || !ticket) {
    return (
      <div
        role="row"
        tabIndex={tabbable ? 0 : -1}
        {...common}
        className={`${styles.row} ${styles.bodyRow} ${styles.placeholderRow}`}
      >
        <div
          role="gridcell"
          aria-colindex={1}
          aria-colspan={COLUMNS.length}
          className={`${styles.cell} ${styles.spanAll}`}
        >
          {status === 'failed' ? (
            <span className={styles.failedText}>Row {index + 1} couldn’t be loaded</span>
          ) : status === 'offline' ? (
            <span className={styles.failedText}>Row {index + 1}: waiting for connection…</span>
          ) : (
            <>
              <VisuallyHidden>Loading row {index + 1}</VisuallyHidden>
              <Skeleton width="40%" />
              <Skeleton width="12%" />
            </>
          )}
        </div>
      </div>
    );
  }

  const meta = [ticket.id, ticket.customer.name, CHANNEL_LABEL[ticket.channel]].join(' · ');
  return (
    <div
      role="row"
      tabIndex={tabbable ? 0 : -1}
      {...common}
      data-ticket-id={ticket.id}
      className={`${styles.row} ${styles.bodyRow}`}
      onClick={() => onOpen(ticket.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onOpen(ticket.id);
        }
      }}
    >
      <div role="gridcell" aria-colindex={1} className={`${col('subject')} ${styles.subject}`}>
        <span className={styles.subjectText}>{ticket.subject}</span>
        <span className={styles.meta}>
          {meta}
          {ticket.slaBreached && <span className={styles.sla}> · SLA breached</span>}
        </span>
      </div>
      <div role="gridcell" aria-colindex={2} className={col('status')}>
        <Badge tone={STATUS_TONE[ticket.status]} dot>
          {STATUS_LABEL[ticket.status]}
        </Badge>
      </div>
      <div role="gridcell" aria-colindex={3} className={col('priority')}>
        <Badge tone={PRIORITY_TONE[ticket.priority]}>{PRIORITY_LABEL[ticket.priority]}</Badge>
      </div>
      <div role="gridcell" aria-colindex={4} className={col('assignee')}>
        {ticket.assignee ? (
          <span className={styles.assignee}>
            <span className={styles.avatar} aria-hidden="true">
              {initials(ticket.assignee)}
            </span>
            <span className={styles.cell}>{ticket.assignee}</span>
          </span>
        ) : (
          <span className={styles.unassigned}>Unassigned</span>
        )}
      </div>
      <div role="gridcell" aria-colindex={5} className={`${col('createdAt')} ${styles.date}`}>
        {formatDate(ticket.createdAt)}
      </div>
      <div role="gridcell" aria-colindex={6} className={`${col('updatedAt')} ${styles.date}`}>
        {formatDate(ticket.updatedAt)}
      </div>
    </div>
  );
});
