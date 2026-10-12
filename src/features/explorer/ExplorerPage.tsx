import { Outlet } from 'react-router';

/** Placeholder until Phase 6 builds the explorer. Renders <Outlet /> for the nested detail route. */
export function ExplorerPage() {
  return (
    <section aria-labelledby="tickets-heading">
      <h1 id="tickets-heading">Support tickets</h1>
      <Outlet />
    </section>
  );
}
