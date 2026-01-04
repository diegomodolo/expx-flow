import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCompany } from "@/contexts/CompanyContext";
import { useClients } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2, Factory, Zap, Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientSearchCombobox } from "@/components/generators/ClientSearchCombobox";
import { ClienteConfiguracaoFabrica } from "@/components/generators/ClienteConfiguracaoFabrica";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const [schedules, setSchedules] = useState<ScheduleWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [configClientId, setConfigClientId] = useState<string | null>(null);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const loadSchedules = async () => {
    if (!activeCompany?.company_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ad_generation_schedules')
        .select('id, client_id, is_active, ads_per_day, autopilot_enabled, generation_time')
        .eq('company_id', activeCompany.company_id);

      if (error) throw error;

      const clientIds = (data || []).map(s => s.client_id);
      const { data: adsData } = await supabase
        .from('ad_generation_queue')
        .select('client_id')
        .in('client_id', clientIds);

      const adsCountByClient: Record<string, number> = {};
      (adsData || []).forEach(ad => {
        adsCountByClient[ad.client_id] = (adsCountByClient[ad.client_id] || 0) + 1;
      });

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

  const updateScheduleField = async (scheduleId: string, field: string, value: any) => {
    // Clear existing timer for this field
    const timerKey = `${scheduleId}-${field}`;
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]);
    }

    // Update local state immediately
    setSchedules(prev => prev.map(s => 
      s.id === scheduleId ? { ...s, [field]: value } : s
    ));

    // Debounce the API call
    debounceTimers.current[timerKey] = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('ad_generation_schedules')
          .update({ [field]: value })
          .eq('id', scheduleId);

        if (error) throw error;
        toast.success("Configuração salva");
      } catch (error) {
        console.error('Error updating schedule:', error);
        toast.error("Erro ao salvar");
        loadSchedules(); // Reload to revert
      }
    }, 800);
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
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Cliente</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Horário</TableHead>
                <TableHead className="text-center">Anúncios/dia</TableHead>
                <TableHead className="text-center">Gerados</TableHead>
                <TableHead className="text-center">Autopilot</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={schedule.client_avatar || ""} alt={schedule.client_name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-body-small">
                          {getInitials(schedule.client_name || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-body-medium font-medium text-foreground truncate">
                          {schedule.client_name}
                        </p>
                        {schedule.client_sector && (
                          <p className="text-body-small text-muted-foreground truncate">
                            {schedule.client_sector}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <Switch
                      checked={schedule.is_active}
                      onCheckedChange={(checked) => updateScheduleField(schedule.id, 'is_active', checked)}
                    />
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <Input
                      type="time"
                      value={schedule.generation_time}
                      onChange={(e) => updateScheduleField(schedule.id, 'generation_time', e.target.value)}
                      className="w-28 mx-auto text-center"
                    />
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={schedule.ads_per_day}
                      onChange={(e) => updateScheduleField(schedule.id, 'ads_per_day', parseInt(e.target.value) || 1)}
                      className="w-20 mx-auto text-center"
                    />
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <span className="text-body-medium font-medium">{schedule.ads_generated}</span>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    {schedule.autopilot_enabled && (
                      <Zap className="h-4 w-4 text-warning mx-auto" />
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfigClientId(schedule.client_id)}
                      className="h-8 w-8"
                      title="Configurações avançadas"
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

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
