import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/contexts/CompanyContext";
import { useClients } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Plus, Loader2, Factory, Zap, Clock, ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientSearchCombobox } from "@/components/generators/ClientSearchCombobox";
import { ClienteConfiguracaoFabrica } from "@/components/generators/ClienteConfiguracaoFabrica";
import { useNavigate } from "react-router-dom";

interface ScheduleWithClient {
  id: string;
  client_id: string;
  is_active: boolean;
  ads_per_day: number;
  autopilot_enabled: boolean;
  generation_time: string;
  client_name?: string;
  client_company?: string;
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

      // Map client names to schedules
      const schedulesWithClients = (data || []).map(schedule => {
        const client = clients.find(c => c.id === schedule.client_id);
        return {
          ...schedule,
          client_name: client?.name || 'Cliente não encontrado',
          client_company: client?.company || '',
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

  if (configClientId) {
    const client = clients.find(c => c.id === configClientId);
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setConfigClientId(null)}>
              ← Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Configurar Fábrica</h1>
              <p className="text-muted-foreground">{client?.name}</p>
            </div>
          </div>
          <ClienteConfiguracaoFabrica 
            clientId={configClientId} 
            onSave={handleConfigSaved}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Configuração da Fábrica</h1>
            <p className="text-muted-foreground">Gerencie as fábricas de anúncios por cliente</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} disabled={availableClients.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Fábrica
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : schedules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Factory className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma fábrica configurada</h3>
              <p className="text-muted-foreground mb-4">
                Crie uma fábrica de anúncios para começar a gerar anúncios automaticamente
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira fábrica
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {schedules.map((schedule) => (
              <Card 
                key={schedule.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setConfigClientId(schedule.client_id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{schedule.client_name}</CardTitle>
                      <CardDescription>{schedule.client_company}</CardDescription>
                    </div>
                    <Badge variant={schedule.is_active ? "default" : "secondary"}>
                      {schedule.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {schedule.generation_time}
                    </div>
                    <div className="flex items-center gap-1">
                      <Settings className="h-4 w-4" />
                      {schedule.ads_per_day} anúncios/dia
                    </div>
                    {schedule.autopilot_enabled && (
                      <div className="flex items-center gap-1 text-yellow-600">
                        <Zap className="h-4 w-4" />
                        Autopilot
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button variant="ghost" size="sm">
                      Configurar <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog para criar nova fábrica */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Fábrica de Anúncios</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Selecione o cliente</label>
                <ClientSearchCombobox
                  clients={availableClients}
                  value={selectedClientId}
                  onValueChange={setSelectedClientId}
                  showCompany
                  placeholder="Buscar cliente..."
                />
              </div>
              {availableClients.length === 0 && (
                <p className="text-sm text-muted-foreground">
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
    </DashboardLayout>
  );
}
