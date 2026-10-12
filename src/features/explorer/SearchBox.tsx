import { useEffect, useRef } from 'react';
import { TextField } from '../../ui';
import { MAX_QUERY_LENGTH } from '../../shared/contract';
import styles from './explorer.module.css';

export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Debounced search input. The input is uncontrolled so typing never waits on a URL round-trip; the URL value is
 * pushed into it only when it changes from elsewhere (Back/Forward, "Clear search"), never as an echo of our own
 * commit — which could otherwise overwrite characters typed while the commit was in flight.
 */
export function SearchBox({ value, onCommit }: { value: string; onCommit: (q: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const committed = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (value === committed.current) return;
    committed.current = value;
    if (inputRef.current) inputRef.current.value = value;
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = (raw: string) => {
    clearTimeout(timer.current);
    const q = raw.trim();
    if (q === committed.current) return;
    committed.current = q;
    onCommit(q);
  };

  return (
    <TextField
      ref={inputRef}
      className={styles.search}
      type="search"
      label="Search tickets"
      placeholder="Subject, customer, email or ticket ID"
      defaultValue={value}
      maxLength={MAX_QUERY_LENGTH}
      autoComplete="off"
      spellCheck={false}
      onChange={(e) => {
        const raw = e.target.value;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => commit(raw), SEARCH_DEBOUNCE_MS);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit(e.currentTarget.value);
      }}
    />
  );
}
