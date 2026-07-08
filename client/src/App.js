/**
 * client/src/App.js
 * Root component. Wraps everything in ThemeProvider and AuthProvider.
 * Protected routes redirect to /login if the user is not authenticated.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import Layout       from './components/Layout';
import Dashboard    from './pages/Dashboard';
import FriendDetail from './pages/FriendDetail';
import FriendForm   from './pages/FriendForm';
import CalendarView from './pages/CalendarView';
import UpcomingList from './pages/UpcomingList';
import Settings     from './pages/Settings';
import Login        from './pages/Login';
import Spinner      from './components/Spinner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1, refetchOnWindowFocus: false },
  },
});

// Wraps protected routes — redirects to /login if not authenticated
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}

// Redirects logged-in users away from /login back to the dashboard
function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user)    return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public — login / setup */}
      <Route
        path="/login"
        element={<PublicOnlyRoute><Login /></PublicOnlyRoute>}
      />

      {/* Protected — everything inside Layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index                   element={<Dashboard />}    />
        <Route path="calendar"         element={<CalendarView />} />
        <Route path="upcoming"         element={<UpcomingList />} />
        <Route path="settings"         element={<Settings />}     />
        <Route path="friends/new"      element={<FriendForm />}   />
        <Route path="friends/:id"      element={<FriendDetail />} />
        <Route path="friends/:id/edit" element={<FriendForm />}   />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Toaster
              position="top-right"
              toastOptions={{ duration: 3500, style: { borderRadius: '8px', fontSize: '14px' } }}
            />
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}