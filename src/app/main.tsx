import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter } from 'react-router';
// The react-dom flavour wires up flushSync, used for discrete URL updates (see useExplorerParams).
import { RouterProvider } from 'react-router/dom';
import { AnnouncerProvider } from '../lib/announcer';
import { syncInitialOnlineStatus } from '../lib/online-status';
import { createQueryClient } from './queryClient';
import { routes } from './router';
import '../ui/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing from index.html');

syncInitialOnlineStatus();
const queryClient = createQueryClient();
const router = createBrowserRouter(routes);

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AnnouncerProvider>
        <RouterProvider router={router} />
      </AnnouncerProvider>
    </QueryClientProvider>
  </StrictMode>,
);
