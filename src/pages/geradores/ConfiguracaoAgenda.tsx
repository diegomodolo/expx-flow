import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useAdGenerationQueue } from "@/hooks/useAdGenerationQueue";
import { useClients } from "@/hooks/useClients";
import { toast } from "sonner";
import { Clock, Sparkles, Copy, Lightbulb, RefreshCw, Zap, Factory } from "lucide-react";
import { ClientFactoryCard } from "@/components/ad-factory/ClientFactoryCard";
import { supabase } from "@/integrations/supabase/client";

export default function ConfiguracaoAgenda() {
  const { clients } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const { schedule, isLoading, updateSchedule, fetchSchedule } = useAdGenerationQueue(selectedClientId);
  const [adsCount, setAdsCount] = useState<Record<string, number>>({});
  const [clientSchedules, setClientSchedules] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    generation_time: "09:00",
    ads_per_day: 5,
    clone_percentage: 40,
    concept_percentage: 30,
    iteration_percentage: 30,
    is_active: true,
    autopilot_enabled: false,
    autopilot_min_quality_score: 7.5,
  });

  // Fetch ads count and schedules for all clients
  useEffect(() => {
    async function fetchClientsData() {
      if (!clients || clients.length === 0) return;

      // Fetch ads count
      const { data: adsData } = await supabase
        .from("ad_generation_queue")
        .select("client_id");

      if (adsData) {
        const counts: Record<string, number> = {};
        adsData.forEach((item) => {
          counts[item.client_id] = (counts[item.client_id] || 0) + 1;
        });
        setAdsCount(counts);
      }

      // Fetch schedules status
      const { data: schedulesData } = await supabase
        .from("ad_generation_schedules")
        .select("client_id, is_active");

      if (schedulesData) {
        const schedules: Record<string, boolean> = {};
        schedulesData.forEach((item) => {
          schedules[item.client_id] = item.is_active ?? false;
        });
        setClientSchedules(schedules);
      }
    }

    fetchClientsData();
  }, [clients]);

  useEffect(() => {
    if (schedule) {
      setFormData({
        generation_time: schedule.generation_time || "09:00",
        ads_per_day: schedule.ads_per_day || 5,
        clone_percentage: schedule.clone_percentage || 40,
        concept_percentage: schedule.concept_percentage || 30,
        iteration_percentage: schedule.iteration_percentage || 30,
        is_active: schedule.is_active ?? true,
        autopilot_enabled: schedule.autopilot_enabled ?? false,
        autopilot_min_quality_score: schedule.autopilot_min_quality_score ?? 7.5,
      });
    }
  }, [schedule]);

  useEffect(() => {
    if (selectedClientId) {
      fetchSchedule();
    }
  }, [selectedClientId, fetchSchedule]);

  const handlePercentageChange = (type: 'clone' | 'concept' | 'iteration', value: number[]) => {
    const newValue = value[0];
    const otherTypes = ['clone', 'concept', 'iteration'].filter(t => t !== type) as Array<'clone' | 'concept' | 'iteration'>;
    const remaining = 100 - newValue;
    
    const getPercentage = (t: 'clone' | 'concept' | 'iteration') => formData[`${t}_percentage` as keyof typeof formData] as number;
    const currentOtherTotal = otherTypes.reduce((sum, t) => sum + getPercentage(t), 0);
    
    if (currentOtherTotal === 0) {
      setFormData(prev => ({
        ...prev,
        [`${type}_percentage`]: newValue,
        [`${otherTypes[0]}_percentage`]: Math.floor(remaining / 2),
        [`${otherTypes[1]}_percentage`]: Math.ceil(remaining / 2),
      }));
    } else {
      const ratio = remaining / currentOtherTotal;
      setFormData(prev => ({
        ...prev,
        [`${type}_percentage`]: newValue,
        [`${otherTypes[0]}_percentage`]: Math.round((prev[`${otherTypes[0]}_percentage` as keyof typeof formData] as number) * ratio),
        [`${otherTypes[1]}_percentage`]: remaining - Math.round((prev[`${otherTypes[0]}_percentage` as keyof typeof formData] as number) * ratio),
      }));
    }
  };

  const handleSave = async () => {
    if (!selectedClientId) {
      toast.error("Selecione um cliente");
      return;
    }

    const total = formData.clone_percentage + formData.concept_percentage + formData.iteration_percentage;
    if (total !== 100) {
      toast.error("As porcentagens devem somar 100%");
      return;
    }

    await updateSchedule(formData);
    toast.success("Configurações salvas com sucesso!");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Factory className="h-8 w-8 text-primary" />
            Configuração da Fábrica de Ads
          </h1>
          <p className="text-muted-foreground mt-1">Configure a geração automática de anúncios para cada cliente</p>
        </div>
      </div>

      {/* Client selection grid */}
      <div>
        <h2 className="text-lg font-medium mb-4">Selecione um cliente</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clients?.map((client) => (
            <ClientFactoryCard
              key={client.id}
              client={client}
              adsGenerated={adsCount[client.id] || 0}
              isActive={clientSchedules[client.id] ?? false}
              isSelected={selectedClientId === client.id}
              onClick={() => setSelectedClientId(client.id)}
            />
          ))}
        </div>
      </div>

      {selectedClientId && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Agendamento
                </CardTitle>
                <CardDescription>Configure quando e quantos anúncios serão gerados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Geração automática ativa</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="generation_time">Horário de geração</Label>
                  <Input
                    id="generation_time"
                    type="time"
                    value={formData.generation_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, generation_time: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ads_per_day">Anúncios por dia: {formData.ads_per_day}</Label>
                  <Slider
                    id="ads_per_day"
                    min={1}
                    max={5}
                    step={1}
                    value={[formData.ads_per_day]}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, ads_per_day: value[0] }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Distribuição de Tipos
                </CardTitle>
                <CardDescription>Defina a proporção de cada tipo de anúncio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Copy className="h-4 w-4 text-blue-500" />
                    <Label>Clone (inspiração em concorrentes): {formData.clone_percentage}%</Label>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[formData.clone_percentage]}
                    onValueChange={(value) => handlePercentageChange('clone', value)}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    <Label>Conceito (novas ideias): {formData.concept_percentage}%</Label>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[formData.concept_percentage]}
                    onValueChange={(value) => handlePercentageChange('concept', value)}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-green-500" />
                    <Label>Iteração (melhorar winners): {formData.iteration_percentage}%</Label>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[formData.iteration_percentage]}
                    onValueChange={(value) => handlePercentageChange('iteration', value)}
                  />
                </div>

                <div className="text-sm text-muted-foreground text-center pt-2 border-t">
                  Total: {formData.clone_percentage + formData.concept_percentage + formData.iteration_percentage}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Modo Autopilot
              </CardTitle>
              <CardDescription>
                Quando ativado, anúncios com alta qualidade são publicados automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="autopilot">Ativar autopilot</Label>
                <Switch
                  id="autopilot"
                  checked={formData.autopilot_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autopilot_enabled: checked }))}
                />
              </div>

              {formData.autopilot_enabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Score mínimo para autopublicação: {formData.autopilot_min_quality_score.toFixed(1)}</Label>
                    <Slider
                      min={0}
                      max={10}
                      step={0.1}
                      value={[formData.autopilot_min_quality_score]}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, autopilot_min_quality_score: value[0] }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Anúncios com nota igual ou maior serão publicados automaticamente no destino configurado
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isLoading} size="lg">
              Salvar Configurações
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
