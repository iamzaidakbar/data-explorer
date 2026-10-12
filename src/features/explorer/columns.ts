import type { SortField } from '../../shared/contract';

/** Row height in rem (two lines of text + padding). Converted to px at mount so text-only zoom scales rows. */
const ROW_HEIGHT_REM = 3.5;

/** Current row height in px. 56 at the default 16px root font size. */
export function getRowHeight(): number {
  const rootPx = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Math.round((Number.isFinite(rootPx) && rootPx > 0 ? rootPx : 16) * ROW_HEIGHT_REM);
}

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

/** Options for the compact "Sort by" control shown when the grid is too narrow for every column header. */
export const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt', label: 'Oldest first' },
  { value: '-updatedAt', label: 'Recently updated' },
  { value: '-priority', label: 'Priority: high to low' },
  { value: 'priority', label: 'Priority: low to high' },
  { value: 'status', label: 'Status' },
  { value: 'subject', label: 'Subject A–Z' },
  { value: '-subject', label: 'Subject Z–A' },
] as const;
