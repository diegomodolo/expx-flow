import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useFacebookCampaignSync = () => {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const syncCampaigns = async (clientId: string) => {
    if (!clientId) return;

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-facebook-campaigns', {
        body: { clientId }
      });

      if (error) {
        console.error('Sync error:', error);
        throw new Error(error.message || 'Erro ao sincronizar campanhas');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao sincronizar campanhas');
      }

      console.log('Sync successful:', data);
      
      toast({
        title: "Campanhas sincronizadas",
        description: "Dados das campanhas atualizados com sucesso!",
      });

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

  const syncAllClients = async () => {
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
        const result = await syncCampaigns(client.id);
        if (result) successCount++;
      }

      toast({
        title: "Sincronização concluída",
        description: `${successCount} de ${clients?.length || 0} clientes sincronizados.`,
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