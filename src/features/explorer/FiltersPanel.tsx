import { useRef } from 'react';
import { AGENTS } from '../../shared/agents';
import { CHANNELS, PRIORITIES, STATUSES, UNASSIGNED } from '../../shared/contract';
import { countActiveFilters, type ExplorerFilters } from '../../lib/url-state';
import { CHANNEL_LABEL, PRIORITY_LABEL, STATUS_LABEL } from '../../lib/ticket-labels';
import { Button, CheckboxGroup, SelectField, TextField } from '../../ui';
import styles from './explorer.module.css';

const STATUS_OPTIONS = STATUSES.map((value) => ({ value, label: STATUS_LABEL[value] }));
const PRIORITY_OPTIONS = PRIORITIES.map((value) => ({ value, label: PRIORITY_LABEL[value] }));
const CHANNEL_OPTIONS = CHANNELS.map((value) => ({ value, label: CHANNEL_LABEL[value] }));
const MULTIPLE = '__multiple__';
const ASSIGNEE_OPTIONS = [
  { value: '', label: 'Anyone' },
  { value: UNASSIGNED, label: 'Unassigned' },
  ...AGENTS.map((name) => ({ value: name, label: name })),
];

export interface FiltersPanelProps {
  id: string;
  open: boolean;
  filters: ExplorerFilters;
  onChange: (patch: Partial<ExplorerFilters>) => void;
  onClear: () => void;
}

export function FiltersPanel({ id, open, filters, onChange, onClear }: FiltersPanelProps) {
  const active = countActiveFilters(filters);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const assigneeValue =
    filters.assignee.length === 0 ? '' : filters.assignee.length === 1 ? filters.assignee[0] : MULTIPLE;
  const assigneeOptions =
    assigneeValue === MULTIPLE
      ? [...ASSIGNEE_OPTIONS, { value: MULTIPLE, label: `${filters.assignee.length} selected` }]
      : ASSIGNEE_OPTIONS;

  return (
    <aside
      id={id}
      aria-labelledby={`${id}-title`}
      className={[styles.filters, open && styles.filtersOpen].filter(Boolean).join(' ')}
    >
      <div className={styles.filtersHeader}>
        <h2 id={`${id}-title`} ref={headingRef} tabIndex={-1} className={styles.filtersTitle}>
          Filters
        </h2>
        {active > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onClear();
              // The button disappears once no filters are active; keep focus in the panel instead of losing it.
              headingRef.current?.focus();
            }}
          >
            Clear filters
          </Button>
        )}
      </div>
      <CheckboxGroup
        legend="Status"
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={(status) => onChange({ status })}
      />
      <CheckboxGroup
        legend="Priority"
        options={PRIORITY_OPTIONS}
        value={filters.priority}
        onChange={(priority) => onChange({ priority })}
      />
      <CheckboxGroup
        legend="Channel"
        options={CHANNEL_OPTIONS}
        value={filters.channel}
        onChange={(channel) => onChange({ channel })}
      />
      <SelectField
        label="Assignee"
        options={assigneeOptions}
        value={assigneeValue}
        onChange={(e) => {
          if (e.target.value !== MULTIPLE) onChange({ assignee: e.target.value ? [e.target.value] : [] });
        }}
      />
      <fieldset className={styles.dateFields} style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className={styles.filtersTitle} style={{ fontSize: 'var(--text-sm)', padding: 0 }}>
          Created (UTC)
        </legend>
        <TextField
          type="date"
          label="From"
          value={filters.from ?? ''}
          max={filters.to}
          onChange={(e) => onChange({ from: e.target.value || undefined })}
        />
        <TextField
          type="date"
          label="To"
          value={filters.to ?? ''}
          min={filters.from}
          onChange={(e) => onChange({ to: e.target.value || undefined })}
        />
      </fieldset>
    </aside>
  );
}
