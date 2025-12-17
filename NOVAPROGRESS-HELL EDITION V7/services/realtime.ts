/* RESPONSIVE NOTES: Handles realtime subscriptions for tasks per temple. */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Task, TempleType } from '../types';

export const useRealtimeTasks = (templeId: TempleType) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Load
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('temple_id', templeId)
        .order('created_at', { ascending: false }); // Newest first

      if (error) {
        console.error('Error fetching tasks:', error);
      } else if (data) {
        setTasks(data as Task[]);
      }
      setLoading(false);
    };

    fetchTasks();

    // 2. Realtime Subscription
    const channel = supabase
      .channel(`temple_tasks_${templeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `temple_id=eq.${templeId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks((prev) => [payload.new as Task, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks((prev) =>
              prev.map((t) => (t.id === payload.new.id ? (payload.new as Task) : t))
            );
          } else if (payload.eventType === 'DELETE') {
            setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [templeId]);

  return { tasks, loading };
};
