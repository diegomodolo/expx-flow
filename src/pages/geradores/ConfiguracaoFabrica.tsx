import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCompany } from "@/contexts/CompanyContext";
import { useClients } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2, Factory, Zap, Settings2, Save, X } from "lucide-react";
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

interface EditingState {
  id: string;
  is_active: boolean;
  ads_per_day: number;
  generation_time: string;
}

export default function ConfiguracaoFabrica() {
  const { activeCompany } = useCompany();
  const { clients } = useClients();
  const [schedules, setSchedules] = useState<ScheduleWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [configClientId, setConfigClientId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);

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

  const startEditing = (schedule: ScheduleWithClient) => {
    setEditingRow({
      id: schedule.id,
      is_active: schedule.is_active,
      ads_per_day: schedule.ads_per_day,
      generation_time: schedule.generation_time,
    });
  };

  const cancelEditing = () => {
    setEditingRow(null);
  };

  const saveEditing = async () => {
    if (!editingRow) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ad_generation_schedules')
        .update({
          is_active: editingRow.is_active,
          ads_per_day: editingRow.ads_per_day,
          generation_time: editingRow.generation_time,
        })
        .eq('id', editingRow.id);

      if (error) throw error;

      toast.success("Configuração atualizada");
      setEditingRow(null);
      loadSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickToggle = async (scheduleId: string, newValue: boolean) => {
    try {
      const { error } = await supabase
        .from('ad_generation_schedules')
        .update({ is_active: newValue })
        .eq('id', scheduleId);

      if (error) throw error;

      setSchedules(prev => prev.map(s => 
        s.id === scheduleId ? { ...s, is_active: newValue } : s
      ));
      toast.success(newValue ? "Fábrica ativada" : "Fábrica desativada");
    } catch (error) {
      console.error('Error toggling schedule:', error);
      toast.error("Erro ao atualizar status");
    }
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
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => {
                const isEditing = editingRow?.id === schedule.id;
                
                return (
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
                      {isEditing ? (
                        <Switch
                          checked={editingRow.is_active}
                          onCheckedChange={(checked) => 
                            setEditingRow(prev => prev ? { ...prev, is_active: checked } : null)
                          }
                        />
                      ) : (
                        <Switch
                          checked={schedule.is_active}
                          onCheckedChange={(checked) => handleQuickToggle(schedule.id, checked)}
                        />
                      )}
                    </TableCell>
                    
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Input
                          type="time"
                          value={editingRow.generation_time}
                          onChange={(e) => 
                            setEditingRow(prev => prev ? { ...prev, generation_time: e.target.value } : null)
                          }
                          className="w-24 mx-auto text-center"
                        />
                      ) : (
                        <span className="text-body-medium">{schedule.generation_time}</span>
                      )}
                    </TableCell>
                    
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={editingRow.ads_per_day}
                          onChange={(e) => 
                            setEditingRow(prev => prev ? { ...prev, ads_per_day: parseInt(e.target.value) || 1 } : null)
                          }
                          className="w-16 mx-auto text-center"
                        />
                      ) : (
                        <span className="text-body-medium">{schedule.ads_per_day}</span>
                      )}
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
                      <div className="flex items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={cancelEditing}
                              className="h-8 w-8"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={saveEditing}
                              disabled={saving}
                              className="h-8 w-8 text-success hover:text-success"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setConfigClientId(schedule.client_id)}
                            className="h-8 w-8"
                            title="Configurações avançadas"
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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
