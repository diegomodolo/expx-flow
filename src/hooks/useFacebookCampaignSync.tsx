import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useFacebookCampaignSync = () => {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const syncCampaigns = async (clientId: string, period: string = '30', fullSync: boolean = false) => {
    if (!clientId) return;

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-facebook-campaigns', {
        body: { clientId, period, fullSync }
      });

      if (error) {
        console.error('Sync error:', error);
        throw new Error(error.message || 'Erro ao sincronizar campanhas');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao sincronizar campanhas');
      }

      console.log('Sync successful:', data);
      
      const periodLabel = period === 'lifetime' ? 'máximo' : `${period} dias`;
      const syncType = fullSync ? 'campanhas, conjuntos de anúncios e criativos' : 'campanhas';
      toast({
        title: "Sincronização concluída",
        description: `${syncType} atualizados com sucesso! (${periodLabel})`,
      });

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
    try {
      // Get all clients with ad accounts
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, ad_account_id')
        .not('ad_account_id', 'is', null);

      if (error) throw error;

      let successCount = 0;
      for (const client of clients || []) {
        const result = await syncCampaigns(client.id, period, false); // Always campaigns only for bulk sync
        if (result) successCount++;
      }

      const periodLabel = period === 'lifetime' ? 'máximo' : `${period} dias`;
      toast({
        title: "Sincronização concluída",
        description: `${successCount} de ${clients?.length || 0} clientes sincronizados (${periodLabel}).`,
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
    }
  };

  return {
    syncing,
    syncCampaigns,
    syncAllClients,
  };
};