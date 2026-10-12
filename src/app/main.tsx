import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AnnouncerProvider } from '../lib/announcer';
import { createQueryClient } from './queryClient';
import { routes } from './router';
import '../ui/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing from index.html');

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
