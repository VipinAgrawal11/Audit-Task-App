import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { TaskComment } from '@/types';

/** Live remark history for a single task. */
export function useComments(taskId: string | null) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    if (!taskId) return;
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (error) console.error('Failed to load comments:', error.message);
    setComments((data ?? []) as TaskComment[]);
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    fetchComments();

    const channel = supabase
      .channel(`comments-${taskId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_comments', filter: `task_id=eq.${taskId}` },
        () => fetchComments(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, fetchComments]);

  const addComment = useCallback(
    async (userId: string, comment: string) => {
      if (!taskId || !comment.trim()) return;
      const { error } = await supabase
        .from('task_comments')
        .insert({ task_id: taskId, user_id: userId, comment: comment.trim() });
      if (error) throw new Error(error.message);
    },
    [taskId],
  );

  return { comments, loading, addComment };
}
