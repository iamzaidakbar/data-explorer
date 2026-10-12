import { act, render, screen } from '@testing-library/react';
import { ANNOUNCE_DELAY_MS, AnnouncerProvider, useAnnounce, type Announce } from './announcer';

function setup() {
  let announce: Announce = () => {};
  function Capture() {
    announce = useAnnounce();
    return null;
  }
  render(
    <AnnouncerProvider>
      <Capture />
    </AnnouncerProvider>,
  );
  return (message: string, politeness?: 'polite' | 'assertive') => act(() => announce(message, politeness));
}

describe('announcer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders empty live regions up front (screen readers ignore regions inserted with content)', () => {
    setup();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('routes polite and assertive messages to separate regions', () => {
    const announce = setup();
    announce('1,234 tickets');
    announce('Could not load tickets', 'assertive');
    act(() => vi.advanceTimersByTime(ANNOUNCE_DELAY_MS));
    expect(screen.getByRole('status')).toHaveTextContent('1,234 tickets');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load tickets');
  });

  it('collapses a burst of messages to the latest one (no stale counts read out)', () => {
    const announce = setup();
    announce('5,000 tickets');
    act(() => vi.advanceTimersByTime(ANNOUNCE_DELAY_MS / 2));
    announce('312 tickets');
    act(() => vi.advanceTimersByTime(ANNOUNCE_DELAY_MS / 2));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    act(() => vi.advanceTimersByTime(ANNOUNCE_DELAY_MS));
    expect(screen.getByRole('status')).toHaveTextContent('312 tickets');
  });

  it('clears before re-announcing so an identical message is read again', () => {
    const announce = setup();
    announce('No tickets match');
    act(() => vi.advanceTimersByTime(ANNOUNCE_DELAY_MS));
    announce('No tickets match');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    act(() => vi.advanceTimersByTime(ANNOUNCE_DELAY_MS));
    expect(screen.getByRole('status')).toHaveTextContent('No tickets match');
  });
});
