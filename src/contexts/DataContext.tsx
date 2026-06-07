import { createContext, useContext, type ReactNode } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useUsers } from '@/hooks/useUsers';
import { useNotifications } from '@/hooks/useNotifications';

type TasksApi = ReturnType<typeof useTasks>;
type UsersApi = ReturnType<typeof useUsers>;
type NotificationsApi = ReturnType<typeof useNotifications>;

interface DataState {
  tasks: TasksApi;
  users: UsersApi;
  notifications: NotificationsApi;
}

const DataContext = createContext<DataState | undefined>(undefined);

/**
 * Mounted once inside the authenticated area so each table has a single
 * realtime subscription shared by every page.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const tasks = useTasks();
  const users = useUsers();
  const notifications = useNotifications();

  return (
    <DataContext.Provider value={{ tasks, users, notifications }}>
      {children}
    </DataContext.Provider>
  );
}

function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('Data hooks must be used within a DataProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTasksData = () => useData().tasks;
// eslint-disable-next-line react-refresh/only-export-components
export const useUsersData = () => useData().users;
// eslint-disable-next-line react-refresh/only-export-components
export const useNotificationsData = () => useData().notifications;
