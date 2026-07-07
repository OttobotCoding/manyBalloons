/**
 * client/src/App.js
 * Root component: ThemeProvider, React Router v6, TanStack Query.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { ThemeProvider } from './context/ThemeContext';
import Layout       from './components/Layout';
import Dashboard    from './pages/Dashboard';
import FriendDetail from './pages/FriendDetail';
import FriendForm   from './pages/FriendForm';
import CalendarView from './pages/CalendarView';
import UpcomingList from './pages/UpcomingList';
import Settings     from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{ duration: 3500, style: { borderRadius: '8px', fontSize: '14px' } }}
          />
          <Routes>
            <Route element={<Layout />}>
              <Route index                  element={<Dashboard />}    />
              <Route path="calendar"        element={<CalendarView />} />
              <Route path="upcoming"        element={<UpcomingList />} />
              <Route path="settings"        element={<Settings />} />
              <Route path="friends/new"     element={<FriendForm />}   />
              <Route path="friends/:id"     element={<FriendDetail />} />
              <Route path="friends/:id/edit" element={<FriendForm />}  />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}