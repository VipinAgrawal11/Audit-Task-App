import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { DataProvider } from '@/contexts/DataContext';
import { TaskUIProvider } from '@/contexts/TaskUIContext';
import { Layout } from '@/components/layout/Layout';
import { FullPageSpinner } from '@/components/ui/Misc';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Tasks } from '@/pages/Tasks';
import { Calendar } from '@/pages/Calendar';
import { Reports } from '@/pages/Reports';
import { Notifications } from '@/pages/Notifications';
import { Profile } from '@/pages/Profile';
import type { UserRole } from '@/types';
import type { ReactNode } from 'react';

/** Gate that requires an authenticated session (and optionally a role). */
function RequireAuth({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  // Wait for the profile to resolve before evaluating role-based routes.
  if (!profile) return <FullPageSpinner />;
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <DataProvider>
                  <TaskUIProvider>
                    <Layout />
                  </TaskUIProvider>
                </DataProvider>
              </RequireAuth>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route
              path="/reports"
              element={
                <RequireAuth roles={['partner', 'manager']}>
                  <Reports />
                </RequireAuth>
              }
            />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
