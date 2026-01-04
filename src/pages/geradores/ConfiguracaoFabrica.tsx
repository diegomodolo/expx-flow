import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCompany } from "@/contexts/CompanyContext";
import { useClients } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2, Factory, Zap, Clock, Sparkles, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientSearchCombobox } from "@/components/generators/ClientSearchCombobox";
import { ClienteConfiguracaoFabrica } from "@/components/generators/ClienteConfiguracaoFabrica";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ScheduleWithClient {
  id: string;
  client_id: string;
  is_active: boolean;
  ads_per_day: number;
  autopilot_enabled: boolean;
  generation_time: string;
  client_name?: string;
  client_company?: string;
  client_avatar?: string | null;
  client_sector?: string | null;
  ads_generated?: number;
}

export default function ConfiguracaoFabrica() {
  const { activeCompany } = useCompany();
  const { clients } = useClients();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<ScheduleWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [configClientId, setConfigClientId] = useState<string | null>(null);

  const loadSchedules = async () => {
    if (!activeCompany?.company_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ad_generation_schedules')
        .select('id, client_id, is_active, ads_per_day, autopilot_enabled, generation_time')
        .eq('company_id', activeCompany.company_id);

      if (error) throw error;

      // Get ads generated count for each client
      const clientIds = (data || []).map(s => s.client_id);
      const { data: adsData } = await supabase
        .from('ad_generation_queue')
        .select('client_id')
        .in('client_id', clientIds);

      const adsCountByClient: Record<string, number> = {};
      (adsData || []).forEach(ad => {
        adsCountByClient[ad.client_id] = (adsCountByClient[ad.client_id] || 0) + 1;
      });

      // Map client names to schedules
      const schedulesWithClients = (data || []).map(schedule => {
        const client = clients.find(c => c.id === schedule.client_id);
        return {
          ...schedule,
          client_name: client?.name || 'Cliente não encontrado',
          client_company: client?.company || '',
          client_avatar: client?.avatar,
          client_sector: client?.sector,
          ads_generated: adsCountByClient[schedule.client_id] || 0,
        };
      });

      setSchedules(schedulesWithClients);
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompany?.company_id && clients.length > 0) {
      loadSchedules();
    }
  }, [activeCompany?.company_id, clients]);

  const clientsWithSchedule = schedules.map(s => s.client_id);
  const availableClients = clients.filter(c => !clientsWithSchedule.includes(c.id));

  const handleCreateFactory = () => {
    if (selectedClientId) {
      setConfigClientId(selectedClientId);
      setCreateDialogOpen(false);
      setSelectedClientId("");
    }
  };

  const handleConfigSaved = () => {
    loadSchedules();
    setConfigClientId(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (configClientId) {
    const client = clients.find(c => c.id === configClientId);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => setConfigClientId(null)}
            className="gap-2"
          >
            Voltar para Lista
          </Button>
          <div>
            <h1 className="text-headline-small font-medium text-foreground">Configurar Fábrica</h1>
            <p className="text-body-medium text-muted-foreground">{client?.name}</p>
          </div>
        </div>
        <ClienteConfiguracaoFabrica 
          clientId={configClientId} 
          onSave={handleConfigSaved}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Google Style */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-small font-medium text-foreground">Configuração da Fábrica</h1>
          <p className="text-body-medium text-muted-foreground">Gerencie as fábricas de anúncios por cliente</p>
        </div>
        <Button 
          onClick={() => setCreateDialogOpen(true)} 
          disabled={availableClients.length === 0}
          className="gap-2"
        >
            <Plus className="h-4 w-4" />
            Nova Fábrica
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : schedules.length === 0 ? (
          <Card className="border-dashed">
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Factory className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-title-large font-medium text-foreground mb-2">Nenhuma fábrica configurada</h3>
              <p className="text-body-medium text-muted-foreground mb-6 text-center max-w-md">
                Crie uma fábrica de anúncios para começar a gerar anúncios automaticamente para seus clientes
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar primeira fábrica
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {schedules.map((schedule) => (
              <Card 
                key={schedule.id} 
                className={cn(
                  "relative overflow-hidden cursor-pointer transition-all duration-200",
                  "border hover:border-primary/50 hover:shadow-google-1"
                )}
                onClick={() => setConfigClientId(schedule.client_id)}
              >
                {/* Status indicator bar */}
                <div
                  className={cn(
                    "absolute top-0 left-0 right-0 h-1",
                    schedule.is_active ? "bg-success" : "bg-muted-foreground/30"
                  )}
                />

                <div className="p-4 pt-5">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <Avatar className="h-12 w-12 ring-2 ring-border">
                      <AvatarImage src={schedule.client_avatar || ""} alt={schedule.client_name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium text-body-medium">
                        {getInitials(schedule.client_name || '')}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-title-medium font-medium text-foreground truncate">
                        {schedule.client_name}
                      </h3>
                      {schedule.client_sector && (
                        <p className="text-body-small text-muted-foreground truncate">
                          {schedule.client_sector}
                        </p>
                      )}
                    </div>

                    {/* Status badge */}
                    <Badge
                      variant={schedule.is_active ? "default" : "secondary"}
                      className={cn(
                        "shrink-0 text-label-small px-2 py-0.5",
                        schedule.is_active && "bg-success hover:bg-success/90"
                      )}
                    >
                      {schedule.is_active ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Ativa
                        </>
                      ) : (
                        "Inativa"
                      )}
                    </Badge>
                  </div>

                  {/* Stats row */}
                  <div className="mt-4 pt-3 border-t flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-label-small text-muted-foreground">Anúncios gerados</p>
                        <p className="text-title-medium font-semibold text-foreground">
                          {schedule.ads_generated}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-body-small text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{schedule.generation_time}</span>
                      </div>
                      {schedule.autopilot_enabled && (
                        <div className="flex items-center gap-1 text-warning">
                          <Zap className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ads per day info */}
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-body-small text-muted-foreground">
                      {schedule.ads_per_day} anúncios por dia
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog para criar nova fábrica */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-title-large">Nova Fábrica de Anúncios</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-label-large font-medium mb-2 block">Selecione o cliente</label>
                <ClientSearchCombobox
                  clients={availableClients}
                  value={selectedClientId}
                  onValueChange={setSelectedClientId}
                  showCompany
                  placeholder="Buscar cliente..."
                />
              </div>
              {availableClients.length === 0 && (
                <p className="text-body-small text-muted-foreground">
                  Todos os clientes já possuem fábricas configuradas.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateFactory} disabled={!selectedClientId}>
                  Criar Fábrica
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}
