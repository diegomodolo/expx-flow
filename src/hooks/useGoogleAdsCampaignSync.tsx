import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SyncOptions {
  clientId: string;
  companyId: string;
  period?: string;
  syncCampaigns?: boolean;
  syncAdGroups?: boolean;
  syncAds?: boolean;
  includeInactive?: boolean;
  silent?: boolean;
}

export function useGoogleAdsCampaignSync() {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    clientName?: string;
  }>({ current: 0, total: 0 });

  const syncCampaigns = async (options: SyncOptions) => {
    const {
      clientId,
      companyId,
      period = 'last_30_days',
      syncCampaigns = true,
      syncAdGroups = false,
      syncAds = false,
      includeInactive = false,
      silent = false,
    } = options;

    try {
      setSyncing(true);

      if (!silent) {
        toast.loading("Sincronizando campanhas do Google Ads...", { id: "google-sync" });
      }

      const { data, error } = await supabase.functions.invoke('sync-google-ads-campaigns', {
        body: {
          clientId,
          companyId,
          period,
          syncCampaigns,
          syncAdGroups,
          syncAds,
          includeInactive,
          silent,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      if (!silent) {
        toast.success(
          `Sincronizado: ${data.synced.campaigns} campanhas, ${data.synced.adGroups} grupos de anúncios, ${data.synced.ads} anúncios`,
          { id: "google-sync" }
        );
      }

      // Dispatch event for other components to refresh
      window.dispatchEvent(new CustomEvent('clientsUpdated'));

      return data;
    } catch (error: any) {
      console.error("Error syncing Google Ads campaigns:", error);
      if (!silent) {
        toast.error(`Erro ao sincronizar: ${error.message}`, { id: "google-sync" });
      }
      throw error;
    } finally {
      setSyncing(false);
    }
  };

  const syncAllClients = async (
    companyId: string,
    options: {
      period?: string;
      syncCampaigns?: boolean;
      syncAdGroups?: boolean;
      syncAds?: boolean;
      includeInactive?: boolean;
      excludeInactiveClients?: boolean;
    } = {}
  ) => {
    try {
      setSyncing(true);
      setProgress({ current: 0, total: 0 });

      // Get all clients with Google Ads accounts
      let query = supabase
        .from('clients')
        .select('id, name, google_account_id')
        .eq('company_id', companyId)
        .not('google_account_id', 'is', null);

      if (options.excludeInactiveClients) {
        query = query.neq('status', 'inativo' as any);
      }

      const { data: clients, error } = await query;

      if (error) throw error;

      if (!clients || clients.length === 0) {
        toast.info("Nenhum cliente com Google Ads configurado");
        return;
      }

      setProgress({ current: 0, total: clients.length });
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        setProgress({
          current: i + 1,
          total: clients.length,
          clientName: client.name,
        });

        try {
          await syncCampaigns({
            clientId: client.id,
            companyId,
            ...options,
            silent: true,
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to sync client ${client.name}:`, error);
          errorCount++;
        }
      }

      toast.success(
        `Sincronização concluída! ${successCount} clientes sincronizados${errorCount > 0 ? `, ${errorCount} com erro` : ''}`
      );
    } catch (error: any) {
      console.error("Error syncing all clients:", error);
      toast.error(`Erro ao sincronizar clientes: ${error.message}`);
    } finally {
      setSyncing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return {
    syncing,
    progress,
    syncCampaigns,
    syncAllClients,
  };
}
