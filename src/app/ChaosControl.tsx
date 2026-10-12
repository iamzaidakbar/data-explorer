import { CHAOS_OPTIONS, setChaosMode, useChaosMode } from '../lib/chaos-setting';
import { asChaosMode } from '../shared/chaos';
import { SelectField } from '../ui';

/** Demo control for the mock API's simulated latency/failures (sent as the x-chaos header). */
export function ChaosControl({ className }: { className?: string }) {
  const mode = useChaosMode();
  return (
    <SelectField
      className={className}
      label="Simulated network"
      options={CHAOS_OPTIONS}
      value={mode}
      onChange={(e) => setChaosMode(asChaosMode(e.target.value) ?? 'default')}
    />
  );
}
