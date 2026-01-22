import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

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

interface ClientSyncResult {
  client_id: string;
  client_name: string;
  status: 'success' | 'error';
  error_code?: string;
  error_message?: string;
  action_required?: 'internal' | 'client' | 'none';
  campaigns_synced?: number;
  ad_groups_synced?: number;
  ads_synced?: number;
}

// Classificador de erros do Google Ads
function classifyGoogleAdsError(errorMessage: string): {
  code: string;
  userFriendlyMessage: string;
  actionRequired: 'internal' | 'client' | 'none';
} {
  if (errorMessage.includes('USER_PERMISSION_DENIED')) {
    return {
      code: 'USER_PERMISSION_DENIED',
      userFriendlyMessage: 'Conta MCC não tem permissão para acessar este cliente. O cliente precisa conceder acesso à conta MCC no Google Ads.',
      actionRequired: 'client',
    };
  }
  if (errorMessage.includes('CUSTOMER_NOT_ENABLED')) {
    return {
      code: 'CUSTOMER_NOT_ENABLED',
      userFriendlyMessage: 'Conta do Google Ads está desativada ou pausada. O cliente precisa reativar a conta.',
      actionRequired: 'client',
    };
  }
  if (errorMessage.includes('OAUTH_TOKEN_REVOKED') || errorMessage.includes('invalid_grant')) {
    return {
      code: 'OAUTH_TOKEN_REVOKED',
      userFriendlyMessage: 'Token de acesso revogado. Reconecte o Google Ads nas configurações.',
      actionRequired: 'internal',
    };
  }
  if (errorMessage.includes('Token refresh failed')) {
    return {
      code: 'TOKEN_REFRESH_FAILED',
      userFriendlyMessage: 'Falha ao renovar credenciais. Reconecte o Google Ads.',
      actionRequired: 'internal',
    };
  }
  if (errorMessage.includes('Client does not have a Google Ads account configured')) {
    return {
      code: 'NO_GOOGLE_ACCOUNT',
      userFriendlyMessage: 'Cliente não tem conta Google Ads configurada.',
      actionRequired: 'internal',
    };
  }
  if (errorMessage.includes('Google Ads integration is not active')) {
    return {
      code: 'INTEGRATION_INACTIVE',
      userFriendlyMessage: 'Integração do Google Ads não está ativa.',
      actionRequired: 'internal',
    };
  }
  if (errorMessage.includes('Google Ads account not found')) {
    return {
      code: 'ACCOUNT_NOT_FOUND',
      userFriendlyMessage: 'Conta do Google Ads não encontrada.',
      actionRequired: 'internal',
    };
  }
  return {
    code: 'UNKNOWN',
    userFriendlyMessage: errorMessage,
    actionRequired: 'internal',
  };
}

export function useGoogleAdsCampaignSync() {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    clientName?: string;
  }>({ current: 0, total: 0 });

  const syncCampaigns = async (options: SyncOptions): Promise<{
    success: boolean;
    synced?: { campaigns: number; adGroups: number; ads: number };
    error?: string;
    errorCode?: string;
    actionRequired?: 'internal' | 'client' | 'none';
  }> => {
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

      return {
        success: true,
        synced: data.synced,
      };
    } catch (error: any) {
      console.error("Error syncing Google Ads campaigns:", error);
      
      const classification = classifyGoogleAdsError(error.message || '');
      
      if (!silent) {
        toast.error(`Erro ao sincronizar: ${classification.userFriendlyMessage}`, { id: "google-sync" });
      }
      
      return {
        success: false,
        error: classification.userFriendlyMessage,
        errorCode: classification.code,
        actionRequired: classification.actionRequired,
      };
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
    const startedAt = new Date().toISOString();
    const clientResults: ClientSyncResult[] = [];
    
    try {
      setSyncing(true);
      setProgress({ current: 0, total: 0 });

      console.log('[syncAllClients] Starting sync for company:', companyId);
      console.log('[syncAllClients] Options:', options);

      // Get all clients with Google Ads accounts
      let query = supabase
        .from('clients')
        .select('id, name, google_account_id')
        .eq('company_id', companyId)
        .not('google_account_id', 'is', null);

      if (options.excludeInactiveClients) {
        // Use 'red' which is the database enum value for inactive clients
        query = query.neq('status', 'red');
      }

      const { data: clients, error } = await query;

      console.log('[syncAllClients] Query result:', { clients, error, count: clients?.length });

      if (error) throw error;

      if (!clients || clients.length === 0) {
        console.warn('[syncAllClients] No clients found with Google Ads configured for company:', companyId);
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

        const result = await syncCampaigns({
          clientId: client.id,
          companyId,
          ...options,
          silent: true,
        });

        if (result.success) {
          successCount++;
          clientResults.push({
            client_id: client.id,
            client_name: client.name,
            status: 'success',
            campaigns_synced: result.synced?.campaigns || 0,
            ad_groups_synced: result.synced?.adGroups || 0,
            ads_synced: result.synced?.ads || 0,
          });
        } else {
          console.error(`Failed to sync client ${client.name}:`, result.error);
          errorCount++;
          clientResults.push({
            client_id: client.id,
            client_name: client.name,
            status: 'error',
            error_code: result.errorCode,
            error_message: result.error,
            action_required: result.actionRequired,
          });
        }
      }

      // Determinar status geral
      let overallStatus: 'completed' | 'partial' | 'failed' = 'completed';
      if (errorCount > 0 && successCount > 0) {
        overallStatus = 'partial';
      } else if (errorCount > 0 && successCount === 0) {
        overallStatus = 'failed';
      }

      // Registrar no histórico de execuções
      const completedAt = new Date().toISOString();
      const { error: logError } = await supabase
        .from('google_ads_sync_execution_logs')
        .insert([{
          company_id: companyId,
          schedule_id: null, // null = sincronização manual
          status: overallStatus,
          clients_processed: successCount,
          clients_total: clients.length,
          sync_options: {
            period: options.period || 'last_30_days',
            campaigns: options.syncCampaigns ?? true,
            adGroups: options.syncAdGroups ?? false,
            ads: options.syncAds ?? false,
            includeInactive: options.includeInactive ?? false,
          } as Json,
          execution_details: {
            trigger: 'manual',
            clients: clientResults.map(c => ({ ...c })),
          } as Json,
          error_message: errorCount > 0 ? `${errorCount} cliente(s) com erro` : null,
          started_at: startedAt,
          completed_at: completedAt,
        }]);

      if (logError) {
        console.error('[syncAllClients] Error creating execution log:', logError);
      } else {
        console.log('[syncAllClients] Execution log created successfully');
      }

      toast.success(
        `Sincronização concluída! ${successCount} clientes sincronizados${errorCount > 0 ? `, ${errorCount} com erro` : ''}`
      );
    } catch (error: any) {
      console.error("Error syncing all clients:", error);
      
      // Registrar falha no histórico
      await supabase
        .from('google_ads_sync_execution_logs')
        .insert([{
          company_id: companyId,
          schedule_id: null,
          status: 'failed',
          clients_processed: 0,
          clients_total: 0,
          sync_options: {
            period: options.period || 'last_30_days',
            campaigns: options.syncCampaigns ?? true,
            adGroups: options.syncAdGroups ?? false,
            ads: options.syncAds ?? false,
            includeInactive: options.includeInactive ?? false,
          } as Json,
          execution_details: {
            trigger: 'manual',
            clients: clientResults.map(c => ({ ...c })),
          } as Json,
          error_message: error.message,
          started_at: startedAt,
          completed_at: new Date().toISOString(),
        }]);
      
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
