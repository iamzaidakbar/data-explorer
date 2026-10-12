import { Navigate, useLocation, type RouteObject } from 'react-router';
import { ExplorerPage } from '../features/explorer/ExplorerPage';
import { TicketDrawerRoute } from '../features/ticket-detail/TicketDrawer';
import { AppShell } from './AppShell';
import { NotFoundPage, RootErrorPage } from './ErrorPages';

/** "/" → "/tickets", keeping any query string so shared links that omit the path still restore their view. */
function RedirectToTickets() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/tickets', search }} replace />;
}

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    errorElement: <RootErrorPage />,
    children: [
      { index: true, element: <RedirectToTickets /> },
      // The detail drawer is a child route so the list never unmounts under it (ADR-0006).
      {
        path: 'tickets',
        element: <ExplorerPage />,
        children: [{ path: ':ticketId', element: <TicketDrawerRoute /> }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
