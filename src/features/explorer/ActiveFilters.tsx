import { CHANNEL_LABEL, PRIORITY_LABEL, STATUS_LABEL } from '../../lib/ticket-labels';
import type { ExplorerFilters } from '../../lib/url-state';
import { UNASSIGNED } from '../../shared/contract';
import { Button } from '../../ui';
import styles from './explorer.module.css';

interface Chip {
  key: string;
  label: string;
  remove: Partial<ExplorerFilters>;
}

function chipsFor(f: ExplorerFilters): Chip[] {
  return [
    ...f.status.map((s) => ({
      key: `status:${s}`,
      label: `Status: ${STATUS_LABEL[s]}`,
      remove: { status: f.status.filter((x) => x !== s) },
    })),
    ...f.priority.map((p) => ({
      key: `priority:${p}`,
      label: `Priority: ${PRIORITY_LABEL[p]}`,
      remove: { priority: f.priority.filter((x) => x !== p) },
    })),
    ...f.channel.map((c) => ({
      key: `channel:${c}`,
      label: `Channel: ${CHANNEL_LABEL[c]}`,
      remove: { channel: f.channel.filter((x) => x !== c) },
    })),
    ...f.assignee.map((a) => ({
      key: `assignee:${a}`,
      label: `Assignee: ${a === UNASSIGNED ? 'Unassigned' : a}`,
      remove: { assignee: f.assignee.filter((x) => x !== a) },
    })),
    ...(f.from ? [{ key: 'from', label: `From ${f.from}`, remove: { from: undefined } }] : []),
    ...(f.to ? [{ key: 'to', label: `To ${f.to}`, remove: { to: undefined } }] : []),
  ];
}

/** Removable summary of active filters, so keyboard users can undo one without opening the panel. */
export function ActiveFilters({
  filters,
  onChange,
}: {
  filters: ExplorerFilters;
  onChange: (patch: Partial<ExplorerFilters>) => void;
}) {
  const chips = chipsFor(filters);
  if (chips.length === 0) return null;
  return (
    <ul className={styles.chips} aria-label="Active filters">
      {chips.map((chip) => (
        <li key={chip.key}>
          <Button size="sm" aria-label={`Remove filter ${chip.label}`} onClick={() => onChange(chip.remove)}>
            {chip.label} <span aria-hidden="true">✕</span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
