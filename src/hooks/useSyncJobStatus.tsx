import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SyncJobProgress {
  campaigns: { current: number; total: number };
  adsets: { current: number; total: number };
  ads: { current: number; total: number };
  current_entity: string;
}

export interface SyncJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: SyncJobProgress;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export const useSyncJobStatus = (jobId: string | null) => {
  const [job, setJob] = useState<SyncJob | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }

    setLoading(true);

    // Initial fetch
    const fetchJobStatus = async () => {
      const { data, error } = await supabase
        .from('sync_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('Error fetching sync job:', error);
        setLoading(false);
        return;
      }

      setJob(data as unknown as SyncJob);
      setLoading(false);
    };

    fetchJobStatus();

    // Subscribe to realtime updates for instant progress feedback
    const channel = supabase
      .channel(`sync-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sync_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          console.log('[useSyncJobStatus] Realtime update received:', payload.new?.status);
          setJob(payload.new as unknown as SyncJob);
        }
      )
      .subscribe((status) => {
        console.log('[useSyncJobStatus] Realtime subscription status:', status);
      });

    // Cleanup subscription on unmount or jobId change
    return () => {
      console.log('[useSyncJobStatus] Cleaning up realtime subscription for job:', jobId);
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const getProgressPercentage = useCallback(() => {
    if (!job || !job.progress) return 0;

    const { campaigns, adsets, ads } = job.progress;
    
    const campaignsTotal = campaigns?.total || 0;
    const adsetsTotal = adsets?.total || 0;
    const adsTotal = ads?.total || 0;
    
    const total = campaignsTotal + adsetsTotal + adsTotal;
    if (total === 0) return 0;

    const campaignsCurrent = campaigns?.current || 0;
    const adsetsCurrent = adsets?.current || 0;
    const adsCurrent = ads?.current || 0;

    const current = campaignsCurrent + adsetsCurrent + adsCurrent;
    return Math.round((current / total) * 100);
  }, [job]);

  return {
    job,
    loading,
    progressPercentage: getProgressPercentage(),
    isComplete: job?.status === 'completed',
    isError: job?.status === 'error',
    isProcessing: job?.status === 'processing' || job?.status === 'pending',
    currentEntity: job?.progress?.current_entity || ''
  };
};