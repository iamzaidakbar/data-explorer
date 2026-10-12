import { Navigate, useLocation, type RouteObject } from 'react-router';
import { ExplorerPage } from '../features/explorer/ExplorerPage';
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
      // The detail drawer will be a child route of "tickets" (Phase 7) so the list never unmounts under it.
      { path: 'tickets', element: <ExplorerPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
