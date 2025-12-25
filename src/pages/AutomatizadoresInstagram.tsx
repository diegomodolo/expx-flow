import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Instagram, Plus, ArrowLeft, Loader2, Settings, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`
}));

export default function AutomatizadoresInstagram() {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [briefing, setBriefing] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [selectedHours, setSelectedHours] = useState<number[]>([12, 18]);

  // Fetch all instagram automations for this company
  const { data: automations, isLoading } = useQuery({
    queryKey: ['instagram-automations', activeCompany?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_auto_post_configs')
        .select(`
          *,
          instagram_accounts!instagram_auto_post_configs_instagram_account_id_fkey (
            id,
            username,
            profile_picture_url
          )
        `)
        .eq('company_id', activeCompany?.company_id!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany?.company_id
  });

  // Fetch all instagram accounts for this company
  const { data: instagramAccounts } = useQuery({
    queryKey: ['company-instagram-accounts', activeCompany?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_accounts')
        .select('*')
        .eq('company_id', activeCompany?.company_id!);

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany?.company_id
  });

  const createAutomationMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('instagram_auto_post_configs')
        .insert({
          name,
          instagram_account_id: selectedAccount,
          post_briefing: briefing,
          scheduled_days: selectedDays,
          scheduled_hours: selectedHours,
          company_id: activeCompany?.company_id!,
          created_by: user?.id!,
          is_enabled: true
        })
        .select()
        .single();

      if (error) throw error;

      // Generate first post
      await supabase.functions.invoke('generate-instagram-auto-post', {
        body: {
          configId: data.id,
          companyId: activeCompany?.company_id
        }
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['instagram-automations'] });
      toast({
        title: 'Automação criada!',
        description: 'Gerando o primeiro post...',
      });
      setIsCreateOpen(false);
      resetForm();
      navigate(`/automatizadores/instagram/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar automação',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const resetForm = () => {
    setName("");
    setSelectedAccount("");
    setBriefing("");
    setSelectedDays([1, 2, 3, 4, 5]);
    setSelectedHours([12, 18]);
  };

  const handleDayToggle = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleHourToggle = (hour: number) => {
    setSelectedHours(prev => 
      prev.includes(hour) 
        ? prev.filter(h => h !== hour)
        : [...prev, hour].sort((a, b) => a - b)
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/automatizadores')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Instagram className="w-6 h-6" />
                Automatizadores Instagram
              </h1>
              <p className="text-muted-foreground">Gerencie suas automações de postagens no Instagram</p>
            </div>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Automação
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : automations && automations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {automations.map((automation: any) => (
              <Card
                key={automation.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/automatizadores/instagram/${automation.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {automation.instagram_accounts?.profile_picture_url ? (
                        <img
                          src={automation.instagram_accounts.profile_picture_url}
                          alt=""
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <Instagram className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base">
                          {automation.name || `@${automation.instagram_accounts?.username}`}
                        </CardTitle>
                        {automation.name && automation.instagram_accounts?.username && (
                          <p className="text-sm text-muted-foreground">
                            @{automation.instagram_accounts.username}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={automation.is_enabled ? "default" : "secondary"}>
                      {automation.is_enabled ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {automation.post_briefing}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {automation.scheduled_days?.length || 0} dias
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {automation.scheduled_hours?.length || 0} horários
                    </div>
                  </div>
                  {automation.last_post_at && (
                    <p className="text-xs text-muted-foreground">
                      Último post: {format(new Date(automation.last_post_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Instagram className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Nenhuma automação criada</h3>
              <p className="text-muted-foreground text-center mb-4">
                Crie sua primeira automação para começar a postar automaticamente no Instagram
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Automação
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Automação Instagram</DialogTitle>
              <DialogDescription>
                Configure uma nova automação de postagens no Instagram
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Name */}
              <div className="space-y-2">
                <Label>Nome da Automação</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Promoções Loja X"
                />
              </div>

              {/* Instagram Account */}
              <div className="space-y-2">
                <Label>Conta do Instagram</Label>
                {instagramAccounts && instagramAccounts.length > 0 ? (
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {instagramAccounts.map((account: any) => (
                        <SelectItem key={account.id} value={account.id}>
                          @{account.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma conta do Instagram vinculada. Vincule uma conta em Configurações.
                  </p>
                )}
              </div>

              {/* Briefing */}
              <div className="space-y-2">
                <Label>Briefing das Postagens</Label>
                <Textarea
                  value={briefing}
                  onChange={(e) => setBriefing(e.target.value)}
                  placeholder="Descreva o tipo de conteúdo desejado. Ex: Posts promocionais sobre delivery de pizza..."
                  className="min-h-[100px]"
                />
              </div>

              {/* Days */}
              <div className="space-y-2">
                <Label>Dias da Semana</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleDayToggle(day.value)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        selectedDays.includes(day.value)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hours */}
              <div className="space-y-2">
                <Label>Horários de Publicação</Label>
                <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-2 border rounded-md">
                  {HOURS.map(hour => (
                    <button
                      key={hour.value}
                      type="button"
                      onClick={() => handleHourToggle(hour.value)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        selectedHours.includes(hour.value)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {hour.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createAutomationMutation.mutate()}
                disabled={
                  createAutomationMutation.isPending ||
                  !name.trim() ||
                  !selectedAccount ||
                  !briefing.trim() ||
                  selectedDays.length === 0 ||
                  selectedHours.length === 0
                }
              >
                {createAutomationMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Automação"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
