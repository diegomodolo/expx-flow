import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Plus, Clock, Layers, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ClientSearchCombobox } from "@/components/generators/ClientSearchCombobox";
import { useNavigate } from "react-router-dom";
import { useClients } from "@/hooks/useClients";

interface ScheduleWithClient {
  id: string;
  client_id: string;
  is_active: boolean;
  generation_time: string;
  carousels_per_day: number;
  last_generation_at: string | null;
  clients: { name: string; avatar: string | null } | null;
}

export default function ConfiguracaoFabricaCarrosseis() {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const { clients } = useClients();
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['carousel-schedules', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      const { data, error } = await supabase
        .from('carousel_generation_schedules')
        .select(`
          id,
          client_id,
          is_active,
          generation_time,
          carousels_per_day,
          last_generation_at,
          clients (name, avatar)
        `)
        .eq('company_id', activeCompany.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ScheduleWithClient[];
    },
    enabled: !!activeCompany?.company_id,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('carousel_generation_schedules')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carousel-schedules'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const createSchedule = useMutation({
    mutationFn: async (clientId: string) => {
      if (!activeCompany?.company_id) throw new Error('Empresa não selecionada');

      const { error } = await supabase
        .from('carousel_generation_schedules')
        .insert({
          client_id: clientId,
          company_id: activeCompany.company_id,
          is_active: true,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carousel-schedules'] });
      toast.success('Fábrica criada com sucesso!');
      setDialogOpen(false);
      setSelectedClientId(null);
    },
    onError: (error: any) => {
      toast.error('Erro ao criar: ' + error.message);
    },
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Configuração</h1>
            <p className="text-muted-foreground">Gerencie as fábricas de carrosseis</p>
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuração</h1>
          <p className="text-muted-foreground">Gerencie as fábricas de carrosseis</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Fábrica
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Fábrica</DialogTitle>
              <DialogDescription>
                Selecione um cliente para criar uma nova fábrica de carrosseis
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <ClientSearchCombobox
                clients={clients || []}
                value={selectedClientId}
                onValueChange={setSelectedClientId}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => selectedClientId && createSchedule.mutate(selectedClientId)}
                disabled={!selectedClientId || createSchedule.isPending}
              >
                {createSchedule.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Criar Fábrica
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {schedules && schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhuma fábrica configurada</h3>
            <p className="text-muted-foreground text-center mt-2 mb-4">
              Crie uma fábrica de carrosseis para um cliente
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Fábrica
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {schedules?.map((schedule) => (
            <Card key={schedule.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={schedule.clients?.avatar || undefined} />
                      <AvatarFallback>
                        {schedule.clients?.name ? getInitials(schedule.clients.name) : '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{schedule.clients?.name || 'Cliente'}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{schedule.generation_time}</span>
                        <span>•</span>
                        <span>{schedule.carousels_per_day} carrosseis/dia</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge variant={schedule.is_active ? "default" : "secondary"}>
                      {schedule.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                    <Switch
                      checked={schedule.is_active}
                      onCheckedChange={(checked) => toggleActive.mutate({ id: schedule.id, is_active: checked })}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/clientes/${schedule.client_id}/fabrica-carrosseis`)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configurar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
