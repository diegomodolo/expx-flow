import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncOptions {
  campaigns: boolean;
  adSets: boolean;
  ads: boolean;
}

export const useFacebookCampaignSync = () => {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, clientName: '' });
  const { toast } = useToast();

  const syncCampaigns = async (
    clientId: string, 
    period: string = '30', 
    options: SyncOptions = { campaigns: true, adSets: true, ads: true }, 
    silent: boolean = false
  ) => {
    if (!clientId) return;

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-facebook-campaigns', {
        body: { clientId, period, syncOptions: options }
      });

      if (error) {
        console.error('Sync error:', error);
        throw new Error(error.message || 'Erro ao sincronizar campanhas');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao sincronizar campanhas');
      }

      console.log('Sync successful:', data);
      
      // Only show individual toast if not in silent mode (bulk sync)
      if (!silent) {
        const periodLabel = period === 'lifetime' ? 'máximo' : `${period} dias`;
        const syncTypes = [];
        if (options.campaigns) syncTypes.push('campanhas');
        if (options.adSets) syncTypes.push('conjuntos de anúncios');
        if (options.ads) syncTypes.push('criativos');
        const syncType = syncTypes.join(', ');
        
        toast({
          title: "Sincronização concluída",
          description: `${syncType} atualizados com sucesso! (${periodLabel})`,
        });
      }

      // Trigger a refresh of clients data
      window.dispatchEvent(new CustomEvent('clientsUpdated'));

      return data.data;
    } catch (error: any) {
      console.error('Error syncing campaigns:', error);
      toast({
        title: "Erro na sincronização",
        description: error.message || "Não foi possível sincronizar as campanhas.",
        variant: "destructive",
      });
      return null;
    } finally {
      setSyncing(false);
    }
  };

  const syncAllClients = async (period: string = '30') => {
    setSyncing(true);
    setProgress({ current: 0, total: 0, clientName: '' });
    
    try {
      // Get all clients with ad accounts
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, ad_account_id')
        .not('ad_account_id', 'is', null);

      if (error) throw error;

      const totalClients = clients?.length || 0;
      setProgress({ current: 0, total: totalClients, clientName: '' });

      let successCount = 0;
      for (let i = 0; i < (clients?.length || 0); i++) {
        const client = clients![i];
        setProgress({ current: i + 1, total: totalClients, clientName: client.name });
        
        const result = await syncCampaigns(client.id, period, { campaigns: true, adSets: true, ads: true }, true); // Full sync for all clients, silent mode
        if (result) successCount++;
      }

      const periodLabel = period === 'lifetime' ? 'máximo' : `${period} dias`;
      toast({
        title: "Sincronização concluída",
        description: `${successCount} de ${clients?.length || 0} clientes sincronizados com campanhas, conjuntos de anúncios e criativos (${periodLabel}).`,
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

  return {
    syncing,
    progress,
    syncCampaigns,
    syncAllClients,
  };
};