const numberFormat = new Intl.NumberFormat('en-US');
// Ticket timestamps and the date filter are both UTC; display in UTC so a ticket never appears outside the range.
const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const dateTimeFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

export const formatCount = (n: number) => numberFormat.format(n);
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
export const formatDateTime = (iso: string) => `${dateTimeFormat.format(new Date(iso))} UTC`;
export const plural = (n: number, one: string, many: string) => `${formatCount(n)} ${n === 1 ? one : many}`;
