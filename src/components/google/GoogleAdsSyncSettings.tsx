import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompany } from "@/contexts/CompanyContext";
import { useGoogleAdsCampaignSync } from "@/hooks/useGoogleAdsCampaignSync";
import { Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";

export function GoogleAdsSyncSettings() {
  const { activeCompany } = useCompany();
  const { syncing, progress, syncAllClients } = useGoogleAdsCampaignSync();
  const [period, setPeriod] = useState<string>('last_30_days');
  const [syncCampaigns, setSyncCampaigns] = useState(true);
  const [syncAdGroups, setSyncAdGroups] = useState(false);
  const [syncAds, setSyncAds] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);

  const handleSyncAll = async () => {
    if (!activeCompany) {
      toast.error("Nenhuma empresa ativa");
      return;
    }

    await syncAllClients(activeCompany.id, {
      period,
      syncCampaigns,
      syncAdGroups,
      syncAds,
      includeInactive,
      excludeInactiveClients: true,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sincronização do Google Ads</CardTitle>
          <CardDescription>
            Configure como as campanhas do Google Ads são sincronizadas com o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="period">Período de Sincronização</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger id="period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
                  <SelectItem value="last_14_days">Últimos 14 dias</SelectItem>
                  <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
                  <SelectItem value="last_90_days">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Define o período de métricas que será sincronizado
              </p>
            </div>

            <div className="space-y-3">
              <Label>O que sincronizar</Label>
              
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="sync-campaigns">Campanhas</Label>
                  <p className="text-sm text-muted-foreground">
                    Sincronizar informações das campanhas
                  </p>
                </div>
                <Switch
                  id="sync-campaigns"
                  checked={syncCampaigns}
                  onCheckedChange={setSyncCampaigns}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="sync-adgroups">Grupos de Anúncios</Label>
                  <p className="text-sm text-muted-foreground">
                    Sincronizar grupos de anúncios das campanhas
                  </p>
                </div>
                <Switch
                  id="sync-adgroups"
                  checked={syncAdGroups}
                  onCheckedChange={setSyncAdGroups}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="sync-ads">Anúncios</Label>
                  <p className="text-sm text-muted-foreground">
                    Sincronizar anúncios individuais (mais demorado)
                  </p>
                </div>
                <Switch
                  id="sync-ads"
                  checked={syncAds}
                  onCheckedChange={setSyncAds}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="include-inactive">Incluir Inativos</Label>
                  <p className="text-sm text-muted-foreground">
                    Sincronizar também campanhas pausadas/removidas
                  </p>
                </div>
                <Switch
                  id="include-inactive"
                  checked={includeInactive}
                  onCheckedChange={setIncludeInactive}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <Button
              onClick={handleSyncAll}
              disabled={syncing}
              className="w-full"
              size="lg"
            >
              {syncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sincronizando... {progress.current}/{progress.total}
                  {progress.clientName && ` - ${progress.clientName}`}
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Sincronizar Todos os Clientes Agora
                </>
              )}
            </Button>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Esta ação irá sincronizar todos os clientes que possuem Google Ads configurado
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
