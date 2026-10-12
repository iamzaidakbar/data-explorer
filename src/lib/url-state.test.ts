import { DEFAULT_SORT } from '../shared/contract';
import {
  DEFAULT_STATE,
  parseExplorerParams,
  resultSetKey,
  serializeExplorerState,
  type ExplorerState,
} from './url-state';

const parse = (qs: string) => parseExplorerParams(new URLSearchParams(qs));

describe('explorer URL state', () => {
  it('round-trips a full state through the URL', () => {
    const state: ExplorerState = {
      q: 'refund',
      status: ['open', 'pending'],
      priority: ['urgent'],
      channel: ['chat'],
      assignee: ['Alex Rivera', 'unassigned'],
      from: '2026-01-01',
      to: '2026-02-28',
      sort: { field: 'updatedAt', dir: 'asc' },
      row: 1200,
    };
    const roundTripped = parse(serializeExplorerState(state).toString());
    expect(roundTripped).toEqual({ ...state, assignee: ['unassigned', 'Alex Rivera'] });
    // Re-serializing is stable (canonical), so the same view always has the same URL.
    expect(serializeExplorerState(roundTripped).toString()).toBe(serializeExplorerState(state).toString());
  });

  it('serializes the default view to an empty query string', () => {
    expect(serializeExplorerState(DEFAULT_STATE).toString()).toBe('');
  });

  it('degrades invalid or hostile params to defaults instead of failing', () => {
    expect(
      parse(
        'status=open,bogus&priority=<script>&sort=-colour&row=-5&from=2026-02-30&to=nope&assignee=Mallory',
      ),
    ).toEqual({ ...DEFAULT_STATE, status: ['open'] });
    expect(parse('row=abc').row).toBe(0);
    expect(parse('sort=priority').sort).toEqual({ field: 'priority', dir: 'asc' });
    expect(parse('q=' + 'x'.repeat(500)).q).toHaveLength(100);
  });

  it('drops an inverted date range end rather than producing an impossible query', () => {
    expect(parse('from=2026-05-01&to=2026-04-01')).toMatchObject({ from: '2026-05-01', to: undefined });
  });

  it('result-set key ignores scroll position and value order, but nothing else', () => {
    const a = parse('status=pending,open&row=500');
    const b = parse('status=open,pending');
    expect(resultSetKey(a)).toBe(resultSetKey(b));
    expect(resultSetKey(a)).not.toBe(resultSetKey({ ...b, sort: { ...DEFAULT_SORT, dir: 'asc' } }));
    expect(resultSetKey(a)).not.toBe(resultSetKey({ ...b, q: 'x' }));
  });
});
