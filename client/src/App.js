/**
 * client/src/App.js
 * Root component. All routes, auth guards, and admin routes.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { checkSetupNeeded } from './services/api';

import { ThemeProvider }       from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import Layout        from './components/Layout';
import AdminLayout   from './components/AdminLayout';
import Dashboard     from './pages/Dashboard';
import FriendDetail  from './pages/FriendDetail';
import FriendForm    from './pages/FriendForm';
import CalendarView  from './pages/CalendarView';
import UpcomingList  from './pages/UpcomingList';
import Settings      from './pages/Settings';
import Login         from './pages/Login';
import Spinner       from './components/Spinner';

// Admin pages
import AdminDashboard  from './pages/admin/AdminDashboard';
import UserManagement  from './pages/admin/UserManagement';
import ActivityLog     from './pages/admin/ActivityLog';


const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1, refetchOnWindowFocus: false },
  },
});

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)               return <Spinner />;
  if (!user)                 return <Navigate to="/login"  replace />;
  if (user.role !== 'admin') return <Navigate to="/"       replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(null);
  const [checkError, setCheckError] = useState(null);

  useEffect(() => {
    checkSetupNeeded()
    .then(res => setNeedsSetup(res.needsSetup))
    .catch((err) => setCheckError(err.message || 'Could not reach the server'));
  }, []);

  if (loading || (needsSetup === null && !checkError)) return <Spinner />;

  // Don't silently fall back to "login mode" on a failed check — that hides
  // real problems (API down, DB not connected) behind an ordinary sign-in form.
  if (checkError) {
    return (
      <div style={{ maxWidth: 440, margin: '4rem auto', textAlign: 'center', padding: '0 1.5rem' }}>
        <h2>Can't reach the server</h2>
        <p>{checkError}</p>
        <p>Make sure the API server is running and connected to MongoDB, then reload this page.</p>
      </div>
    );
  }

  // Always show login/setup page if setup is needed
  if (needsSetup) return children;

  // Otherwise redirect logged-in users away
  if (user)    return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />

      {/* Protected — main app */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index                   element={<Dashboard />}    />
        <Route path="calendar"         element={<CalendarView />} />
        <Route path="upcoming"         element={<UpcomingList />} />
        <Route path="settings"         element={<Settings />}     />
        <Route path="friends/new"      element={<FriendForm />}   />
        <Route path="friends/:id"      element={<FriendDetail />} />
        <Route path="friends/:id/edit" element={<FriendForm />}   />
      </Route>

      {/* Admin — separate layout */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index        element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="logs"  element={<ActivityLog />}    />
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
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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