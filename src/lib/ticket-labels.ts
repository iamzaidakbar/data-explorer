import type { BadgeTone } from '../ui';
import type { Channel, Priority, SortField, Status } from '../shared/contract';

export const STATUS_LABEL: Record<Status, string> = {
  open: 'Open',
  pending: 'Pending',
  on_hold: 'On hold',
  solved: 'Solved',
  closed: 'Closed',
};
export const STATUS_TONE: Record<Status, BadgeTone> = {
  open: 'info',
  pending: 'warning',
  on_hold: 'neutral',
  solved: 'success',
  closed: 'neutral',
};
export const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};
export const PRIORITY_TONE: Record<Priority, BadgeTone> = {
  low: 'neutral',
  normal: 'neutral',
  high: 'warning',
  urgent: 'danger',
};
export const CHANNEL_LABEL: Record<Channel, string> = {
  email: 'Email',
  chat: 'Chat',
  phone: 'Phone',
  web: 'Web form',
};
export const SORT_LABEL: Record<SortField, string> = {
  createdAt: 'Created',
  updatedAt: 'Updated',
  priority: 'Priority',
  status: 'Status',
  subject: 'Subject',
};
