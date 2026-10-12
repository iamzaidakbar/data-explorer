import type { SortField } from '../../shared/contract';

export const ROW_HEIGHT = 56;

export interface Column {
  id: 'subject' | 'status' | 'priority' | 'assignee' | 'createdAt' | 'updatedAt';
  label: string;
  sortField?: SortField;
  /** Direction applied when a column is first chosen for sorting. */
  defaultDir?: 'asc' | 'desc';
}

export const COLUMNS: readonly Column[] = [
  { id: 'subject', label: 'Subject', sortField: 'subject', defaultDir: 'asc' },
  { id: 'status', label: 'Status', sortField: 'status', defaultDir: 'asc' },
  { id: 'priority', label: 'Priority', sortField: 'priority', defaultDir: 'desc' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'createdAt', label: 'Created', sortField: 'createdAt', defaultDir: 'desc' },
  { id: 'updatedAt', label: 'Updated', sortField: 'updatedAt', defaultDir: 'desc' },
];
