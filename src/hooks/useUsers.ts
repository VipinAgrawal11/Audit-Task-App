import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppUser } from '@/types';

/** Loads the staff directory. Used to resolve names and populate assignee pickers. */
export function useUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from('users')
      .select('*')
      .order('role', { ascending: true })
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error('Failed to load users:', error.message);
        setUsers((data ?? []) as AppUser[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const byId = useMemo(() => {
    const map = new Map<string, AppUser>();
    for (const u of users) map.set(u.id, u);
    return map;
  }, [users]);

  const employees = useMemo(() => users.filter((u) => u.role === 'employee'), [users]);

  return { users, employees, byId, loading };
}
