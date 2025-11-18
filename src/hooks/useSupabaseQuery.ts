import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { checkSessionHealth } from '@/lib/sessionValidator';

// Generic hook for Supabase queries with React Query integration
export function useSupabaseQuery<T = any>(
  key: string[],
  queryFn: () => Promise<{ data: T; error: any }>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
  }
) {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      // Check session health before query
      const health = await checkSessionHealth();
      
      if (!health.isValid) {
        console.error('[useSupabaseQuery] Cannot query with invalid session');
        throw new Error('Session expired. Please sign in again.');
      }
      
      const result = await queryFn();
      
      // Detect 401 errors (expired token)
      if (result.error?.message?.includes('JWT') || 
          result.error?.message?.includes('expired') ||
          result.error?.code === 'PGRST301') {
        console.error('[useSupabaseQuery] Token expired during query');
        throw new Error('Your session has expired. Please sign in again.');
      }
      
      if (result.error) {
        throw new Error(result.error.message || 'Database query failed');
      }
      
      return result.data;
    },
    enabled: options?.enabled,
    staleTime: options?.staleTime || 5 * 60 * 1000, // 5 minutes
    gcTime: options?.gcTime || 10 * 60 * 1000, // 10 minutes
  });
}

// Generic mutation hook with toast notifications
export function useSupabaseMutation<TVariables = any, TData = any>(
  mutationFn: (variables: TVariables) => Promise<{ data: TData; error: any }>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    invalidateQueries?: string[][];
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const result = await mutationFn(variables);
      if (result.error) {
        throw new Error(result.error.message || 'Database mutation failed');
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      if (options?.successMessage) {
        toast({
          title: "Success",
          description: options.successMessage,
        });
      }
      
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
      
      options?.onSuccess?.(data, variables);
    },
    onError: (error: Error, variables) => {
      const errorMessage = options?.errorMessage || error.message;
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      options?.onError?.(error, variables);
    },
  });
}

// Real-time subscription hook
export function useSupabaseSubscription<T = any>(
  channel: string,
  table: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  filter?: string,
  callback?: (payload: T) => void
) {
  const queryClient = useQueryClient();

  return {
    subscribe: () => {
      const subscription = supabase
        .channel(channel)
        .on(
          'postgres_changes' as any,
          {
            event,
            schema: 'public',
            table,
            filter,
          },
          (payload) => {
            console.log('Real-time update:', payload);
            
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: [table] });
            
            callback?.(payload as T);
          }
        )
        .subscribe();

      return subscription;
    },
    unsubscribe: (subscription: any) => {
      supabase.removeChannel(subscription);
    },
  };
}