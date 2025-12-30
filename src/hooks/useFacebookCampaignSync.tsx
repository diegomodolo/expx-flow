import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SyncOptions } from '@/components/facebook/SyncPeriodDialog';

export const useFacebookCampaignSync = () => {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, clientName: '' });
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const { toast } = useToast();

  const syncCampaigns = async (
    clientId: string, 
    period: string = '30', 
    options?: { campaigns?: boolean; adsets?: boolean; ads?: boolean }, 
    silent: boolean = false, 
    includeInactive: boolean = false
  ): Promise<string | null> => {
    if (!clientId) return null;

    try {
      const { data, error } = await supabase.functions.invoke('sync-facebook-campaigns', {
        body: { 
          clientId, 
          period, 
          syncCampaigns: options?.campaigns !== false,
          syncAdSets: options?.adsets !== false, 
          syncAds: options?.ads !== false,
          includeInactive
        }
      });

      if (error) {
        console.error('Sync error:', error);
        throw new Error(error.message || 'Erro ao iniciar sincronização');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao iniciar sincronização');
      }

      const jobId = data.job_id;
      setCurrentJobId(jobId);

      if (!silent) {
        toast({
          title: "Sincronização iniciada",
          description: "Processando dados em background...",
        });
      }

      return jobId;
    } catch (error: any) {
      console.error('Error syncing campaigns:', error);
      toast({
        title: "Erro ao iniciar sincronização",
        description: error.message || "Não foi possível iniciar a sincronização.",
        variant: "destructive",
      });
      return null;
    }
  };

  const syncAllClients = async (options: SyncOptions) => {
    setSyncing(true);
    setProgress({ current: 0, total: 0, clientName: '' });
    
    try {
      // Get all clients with ad accounts
      let query = supabase
        .from('clients')
        .select('id, name, ad_account_id, status')
        .not('ad_account_id', 'is', null)
        .eq('is_canceled', false);

      // Exclude inactive clients if not requested to include them
      if (!options.includeInactive) {
        // Exclude clients that are red status WITH inactive_reason (considered inactive)
        query = query.or(`status.neq.red,inactive_reason.is.null,inactive_reason.eq.`);
      }

      const { data: clients, error } = await query;

      if (error) throw error;

      const totalClients = clients?.length || 0;
      setProgress({ current: 0, total: totalClients, clientName: '' });

      let successCount = 0;
      for (let i = 0; i < (clients?.length || 0); i++) {
        const client = clients![i];
        setProgress({ current: i + 1, total: totalClients, clientName: client.name });
        
        const result = await syncCampaigns(client.id, options.period, {
          campaigns: options.campaigns,
          adsets: options.adsets,
          ads: options.ads
        }, true, options.includeInactive); // silent mode for bulk sync, pass includeInactive
        if (result) successCount++;
      }

      const periodLabel = options.period === 'lifetime' ? 'máximo' : `${options.period} dias`;
      const syncTypes = [];
      if (options.campaigns) syncTypes.push('campanhas');
      if (options.adsets) syncTypes.push('conjuntos de anúncios');
      if (options.ads) syncTypes.push('criativos');
      const syncType = syncTypes.join(', ') || 'campanhas';
      
      toast({
        title: "Sincronização concluída",
        description: `${successCount} de ${clients?.length || 0} clientes sincronizados (${syncType}, ${periodLabel}).`,
      });

    } catch (error: any) {
      console.error('Error syncing all clients:', error);
      toast({
        title: "Erro na sincronização",
        description: error.message || "Erro ao sincronizar todos os clientes.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
      setProgress({ current: 0, total: 0, clientName: '' });
    }
  };

  const handleJobComplete = (jobId: string, success: boolean, errorMessage?: string) => {
    if (success) {
      toast({
        title: "✅ Sincronização concluída",
        description: "Dados atualizados com sucesso!",
      });
      window.dispatchEvent(new CustomEvent('clientsUpdated'));
    } else {
      toast({
        title: "❌ Erro na sincronização",
        description: errorMessage || "Ocorreu um erro durante a sincronização.",
        variant: "destructive",
      });
    }
    
    setSyncing(false);
    if (currentJobId === jobId) {
      setCurrentJobId(null);
    }
  };

  const syncAllClientsWrapper = async (options: SyncOptions): Promise<string | null> => {
    await syncAllClients(options);
    return null; // TODO: Implement job tracking for bulk sync
  };

  return {
    syncing,
    progress,
    currentJobId,
    syncCampaigns,
    syncAllClients: syncAllClientsWrapper,
    handleJobComplete,
    clearJobId: () => setCurrentJobId(null)
  };
};