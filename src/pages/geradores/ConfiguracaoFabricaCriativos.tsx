import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, ExternalLink, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ClientSearchCombobox } from "@/components/generators/ClientSearchCombobox";

interface Schedule {
  id: string;
  client_id: string;
  is_active: boolean;
  generation_time: string;
  creatives_per_day: number;
  last_generation_at: string | null;
  clients?: {
    name: string;
    company: string;
    avatar: string | null;
  };
}

export default function ConfiguracaoFabricaCriativos() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, { time: string; qty: number }>>({});

  const { data: clients } = useQuery({
    queryKey: ["clients-for-creative-factory", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("clients")
        .select("id, name, company")
        .eq("company_id", companyId)
        .eq("is_canceled", false)
        .order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: schedules, isLoading, refetch } = useQuery({
    queryKey: ["creative-schedules", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data } = await supabase
        .from("creative_generation_schedules")
        .select(`
          id,
          client_id,
          is_active,
          generation_time,
          creatives_per_day,
          last_generation_at,
          clients (name, company, avatar)
        `)
        .eq("company_id", companyId)
        .order("clients(name)");

      return (data || []) as unknown as Schedule[];
    },
    enabled: !!companyId,
  });

  // Sincroniza valores locais quando os dados são carregados
  useEffect(() => {
    if (schedules) {
      const values: Record<string, { time: string; qty: number }> = {};
      schedules.forEach(s => {
        values[s.id] = {
          time: s.generation_time,
          qty: s.creatives_per_day,
        };
      });
      setLocalValues(values);
    }
  }, [schedules]);

  const handleToggleActive = async (id: string, currentValue: boolean) => {
    const { error } = await supabase
      .from("creative_generation_schedules")
      .update({ is_active: !currentValue, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      queryClient.invalidateQueries({ queryKey: ["creative-schedules"] });
      toast.success(!currentValue ? "Fábrica ativada" : "Fábrica desativada");
    }
  };

  const handleLocalChange = (id: string, field: "time" | "qty", value: string | number) => {
    setLocalValues(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSaveField = async (id: string, field: "generation_time" | "creatives_per_day") => {
    const value = field === "generation_time" 
      ? localValues[id]?.time 
      : localValues[id]?.qty;

    const { error } = await supabase
      .from("creative_generation_schedules")
      .update({ 
        [field]: value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao salvar");
    } else {
      queryClient.invalidateQueries({ queryKey: ["creative-schedules"] });
      toast.success("Configuração salva");
    }
  };

  const handleCreateNewFabrica = async () => {
    if (!selectedClientId || !companyId) return;

    // Verifica se já existe
    const { data: existing } = await supabase
      .from("creative_generation_schedules")
      .select("id")
      .eq("client_id", selectedClientId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (existing) {
      toast.error("Já existe uma fábrica configurada para este cliente");
      return;
    }

    const { error } = await supabase
      .from("creative_generation_schedules")
      .insert({
        client_id: selectedClientId,
        company_id: companyId,
        is_active: false,
        generation_time: "09:00",
        creatives_per_day: 3,
      });

    if (error) {
      toast.error("Erro ao criar fábrica");
    } else {
      queryClient.invalidateQueries({ queryKey: ["creative-schedules"] });
      toast.success("Fábrica criada com sucesso");
      setShowNewDialog(false);
      setSelectedClientId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as fábricas de criativos</p>
        </div>
        <Card>
          <CardContent className="p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b last:border-0">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-4 w-48 flex-1" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as fábricas de criativos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Fábrica
          </Button>
        </div>
      </div>

      {schedules?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Nenhuma fábrica de criativos configurada</p>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Fábrica
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fábricas Configuradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-[1fr,100px,100px,80px,60px] gap-4 py-2 px-3 text-sm font-medium text-muted-foreground border-b">
                <span>Cliente</span>
                <span>Horário</span>
                <span>Qtd/Dia</span>
                <span>Status</span>
                <span></span>
              </div>

              {/* Rows */}
              {schedules?.map((schedule) => (
                <div 
                  key={schedule.id} 
                  className="grid grid-cols-[1fr,100px,100px,80px,60px] gap-4 py-3 px-3 items-center hover:bg-muted/50 rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={schedule.clients?.avatar || undefined} alt={schedule.clients?.name} />
                      <AvatarFallback className="text-xs">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{schedule.clients?.name}</p>
                      <p className="text-xs text-muted-foreground">{schedule.clients?.company}</p>
                    </div>
                  </div>

                  <Input
                    type="time"
                    value={localValues[schedule.id]?.time || schedule.generation_time}
                    onChange={(e) => handleLocalChange(schedule.id, "time", e.target.value)}
                    onBlur={() => handleSaveField(schedule.id, "generation_time")}
                    className="h-8 text-sm"
                  />

                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={localValues[schedule.id]?.qty || schedule.creatives_per_day}
                    onChange={(e) => handleLocalChange(schedule.id, "qty", parseInt(e.target.value) || 1)}
                    onBlur={() => handleSaveField(schedule.id, "creatives_per_day")}
                    className="h-8 text-sm"
                  />

                  <Switch
                    checked={schedule.is_active}
                    onCheckedChange={() => handleToggleActive(schedule.id, schedule.is_active)}
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/clientes/${schedule.client_id}/fabrica-criativos`)}
                    title="Configuração avançada"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Fábrica de Criativos</DialogTitle>
            <DialogDescription>
              Selecione o cliente para criar uma nova fábrica de criativos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ClientSearchCombobox
              clients={clients || []}
              value={selectedClientId || ""}
              onValueChange={setSelectedClientId}
              showCompany
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateNewFabrica} disabled={!selectedClientId}>
                Criar Fábrica
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
