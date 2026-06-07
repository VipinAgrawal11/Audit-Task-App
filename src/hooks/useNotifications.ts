import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { AppNotification } from '@/types';

/** Live notifications for the signed-in user. */
export function useNotifications() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) console.error('Failed to load notifications:', error.message);
    setItems((data ?? []) as AppNotification[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchItems();

    const channel = supabase
      .channel('notifications-stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => fetchItems(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchItems]);

  const unreadCount = items.filter((n) => !n.read_status).length;

  const markRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read_status: true }).eq('id', id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from('notifications')
      .update({ read_status: true })
      .eq('user_id', userId)
      .eq('read_status', false);
  }, [userId]);

  return { items, loading, unreadCount, markRead, markAllRead, refetch: fetchItems };
}
