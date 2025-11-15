import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RefreshCw, Facebook } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { useFacebookCampaignSync } from "@/hooks/useFacebookCampaignSync";
import { useGoogleAdsCampaignSync } from "@/hooks/useGoogleAdsCampaignSync";
import { SyncPeriodDialog, SyncOptions } from "@/components/facebook/SyncPeriodDialog";
import { toast } from "sonner";

interface UnifiedSyncButtonProps {
  clientId: string;
  companyId: string;
  hasMetaAccount: boolean;
  hasGoogleAccount: boolean;
  onSyncComplete?: () => void;
}

export function UnifiedSyncButton({
  clientId,
  companyId,
  hasMetaAccount,
  hasGoogleAccount,
  onSyncComplete,
}: UnifiedSyncButtonProps) {
  const [showMetaPeriodDialog, setShowMetaPeriodDialog] = useState(false);
  const { syncing: metaSyncing, syncCampaigns: syncMeta } = useFacebookCampaignSync();
  const { syncing: googleSyncing, syncCampaigns: syncGoogle } = useGoogleAdsCampaignSync();

  const syncing = metaSyncing || googleSyncing;

  const handleMetaSync = async (options: SyncOptions) => {
    try {
      await syncMeta(clientId, options.period, { 
        campaigns: options.campaigns, 
        adsets: options.adsets, 
        ads: options.ads 
      });
      onSyncComplete?.();
      return null;
    } catch (error) {
      console.error("Error syncing Meta:", error);
      return null;
    }
  };

  const handleGoogleSync = async () => {
    try {
      await syncGoogle({
        clientId,
        companyId,
        period: 'last_30_days',
        syncCampaigns: true,
        syncAdGroups: false,
        syncAds: false,
      });
      onSyncComplete?.();
    } catch (error) {
      console.error("Error syncing Google:", error);
    }
  };

  const handleSyncBoth = async () => {
    const tasks = [];
    if (hasMetaAccount) {
      tasks.push(syncMeta(clientId, '30', { campaigns: true, adsets: false, ads: false }));
    }
    if (hasGoogleAccount) {
      tasks.push(syncGoogle({
        clientId,
        companyId,
        period: 'last_30_days',
        syncCampaigns: true,
        syncAdGroups: false,
        syncAds: false,
      }));
    }

    try {
      await Promise.all(tasks);
      toast.success("Sincronização de ambas as plataformas concluída!");
      onSyncComplete?.();
    } catch (error) {
      console.error("Error syncing both platforms:", error);
    }
  };
    if (hasGoogleAccount) {
      tasks.push(syncGoogle({
        clientId,
        companyId,
        period: 'last_30_days',
        syncCampaigns: true,
        syncAdGroups: false,
        syncAds: false,
      }));
    }

    try {
      await Promise.all(tasks);
      toast.success("Sincronização de ambas as plataformas concluída!");
      onSyncComplete?.();
    } catch (error) {
      console.error("Error syncing both platforms:", error);
    }
  };

  if (!hasMetaAccount && !hasGoogleAccount) {
    return (
      <Button disabled variant="outline">
        <RefreshCw className="mr-2 h-4 w-4" />
        Nenhuma conta conectada
      </Button>
    );
  }

  if (hasMetaAccount && !hasGoogleAccount) {
    return (
      <>
        <Button onClick={() => setShowMetaPeriodDialog(true)} disabled={syncing}>
          {syncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Facebook className="mr-2 h-4 w-4" />}
          Sincronizar Meta
        </Button>
        <SyncPeriodDialog open={showMetaPeriodDialog} onOpenChange={setShowMetaPeriodDialog} onConfirm={handleMetaSync} />
      </>
    );
  }

  if (!hasMetaAccount && hasGoogleAccount) {
    return (
      <Button onClick={handleGoogleSync} disabled={syncing}>
        {syncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <SiGoogle className="mr-2 h-4 w-4" />}
        Sincronizar Google
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button disabled={syncing}>
            {syncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sincronizar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Escolha a plataforma</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSyncBoth}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sincronizar Ambas
          </DropdownMenuItem>
          {hasMetaAccount && (
            <DropdownMenuItem onClick={() => setShowMetaPeriodDialog(true)}>
              <Facebook className="mr-2 h-4 w-4 text-[#1877F2]" />
              Meta Ads
            </DropdownMenuItem>
          )}
          {hasGoogleAccount && (
            <DropdownMenuItem onClick={handleGoogleSync}>
              <SiGoogle className="mr-2 h-4 w-4 text-[#4285F4]" />
              Google Ads
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <SyncPeriodDialog open={showMetaPeriodDialog} onOpenChange={setShowMetaPeriodDialog} onConfirm={handleMetaSync} />
    </>
  );
}
