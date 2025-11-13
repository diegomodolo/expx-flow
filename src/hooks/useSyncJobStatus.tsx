import { useState, useEffect } from 'react';
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

    let intervalId: NodeJS.Timeout;
    setLoading(true);

    const fetchJobStatus = async () => {
      const { data, error } = await supabase
        .from('sync_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('Error fetching sync job:', error);
        return;
      }

      setJob(data as unknown as SyncJob);
      setLoading(false);

      // Stop polling if job is completed or errored
      if (data.status === 'completed' || data.status === 'error') {
        clearInterval(intervalId);
      }
    };

    // Initial fetch
    fetchJobStatus();

    // Poll every 2 seconds
    intervalId = setInterval(fetchJobStatus, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [jobId]);

  const getProgressPercentage = () => {
    if (!job || !job.progress) return 0;

    const { campaigns, adsets, ads } = job.progress;
    
    const campaignsTotal = campaigns.total || 0;
    const adsetsTotal = adsets.total || 0;
    const adsTotal = ads.total || 0;
    
    const total = campaignsTotal + adsetsTotal + adsTotal;
    if (total === 0) return 0;

    const current = campaigns.current + adsets.current + ads.current;
    return Math.round((current / total) * 100);
  };

  return {
    job,
    loading,
    progressPercentage: getProgressPercentage(),
    isComplete: job?.status === 'completed',
    isError: job?.status === 'error',
    isProcessing: job?.status === 'processing' || job?.status === 'pending'
  };
};