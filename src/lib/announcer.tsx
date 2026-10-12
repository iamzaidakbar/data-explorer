import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { visuallyHiddenClass } from '../ui';

export type Politeness = 'polite' | 'assertive';
export type Announce = (message: string, politeness?: Politeness) => void;

const AnnouncerContext = createContext<Announce | null>(null);

/** Delay between clearing and setting a region so an identical repeated message is announced again. */
export const ANNOUNCE_DELAY_MS = 100;

/**
 * App-wide live regions. They are rendered once, empty, at startup: screen readers only announce changes to live
 * regions that already exist in the DOM. Within each politeness level the latest message wins, so a burst of
 * updates (e.g. fast typing) produces one announcement, not a queue of stale ones.
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');
  const timers = useRef<Record<Politeness, ReturnType<typeof setTimeout> | undefined>>({
    polite: undefined,
    assertive: undefined,
  });

  const announce = useCallback<Announce>((message, politeness = 'polite') => {
    const set = politeness === 'assertive' ? setAssertive : setPolite;
    clearTimeout(timers.current[politeness]);
    set('');
    timers.current[politeness] = setTimeout(() => set(message), ANNOUNCE_DELAY_MS);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      clearTimeout(pending.polite);
      clearTimeout(pending.assertive);
    };
  }, []);

  const value = useMemo(() => announce, [announce]);
  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className={visuallyHiddenClass}>
        {polite}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" className={visuallyHiddenClass}>
        {assertive}
      </div>
    </AnnouncerContext.Provider>
  );
}

export function useAnnounce(): Announce {
  const announce = useContext(AnnouncerContext);
  if (!announce) throw new Error('useAnnounce must be used inside <AnnouncerProvider>');
  return announce;
}
