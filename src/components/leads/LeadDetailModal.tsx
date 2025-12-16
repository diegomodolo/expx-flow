import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  User, Building2, Briefcase, Target, Monitor, ShoppingCart, 
  TrendingUp, Megaphone, CheckCircle, Shield, Settings, Save, X 
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadDetailModalProps {
  lead: Record<string, unknown> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

export const LeadDetailModal = ({ lead, open, onOpenChange, companyId }: LeadDetailModalProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("contato");

  useEffect(() => {
    if (lead) {
      setFormData({ ...lead });
    }
  }, [lead]);

  const handleChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!lead?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('lead_master_pool')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id as string);

      if (error) throw error;

      toast.success("Lead atualizado com sucesso");
      queryClient.invalidateQueries({ queryKey: ['lead-pool'] });
      queryClient.invalidateQueries({ queryKey: ['lead-pool-stats'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error("Erro ao atualizar lead");
    } finally {
      setIsSaving(false);
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 70) return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Alto ({score})</Badge>;
    if (score >= 40) return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Médio ({score})</Badge>;
    return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Baixo ({score})</Badge>;
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="text-xl">{formData.full_name as string || "Lead sem nome"}</span>
                <div className="flex items-center gap-2 mt-1">
                  {getScoreBadge(formData.global_score as number || 0)}
                  <Badge variant="outline">{formData.lead_status as string || "novo"}</Badge>
                </div>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="px-6">
            <TabsList className="w-full grid grid-cols-6 h-auto">
              <TabsTrigger value="contato" className="flex flex-col gap-1 py-2 text-xs">
                <User className="h-4 w-4" />
                Contato
              </TabsTrigger>
              <TabsTrigger value="empresa" className="flex flex-col gap-1 py-2 text-xs">
                <Building2 className="h-4 w-4" />
                Empresa
              </TabsTrigger>
              <TabsTrigger value="decisao" className="flex flex-col gap-1 py-2 text-xs">
                <Briefcase className="h-4 w-4" />
                Decisão
              </TabsTrigger>
              <TabsTrigger value="software" className="flex flex-col gap-1 py-2 text-xs">
                <Monitor className="h-4 w-4" />
                Software
              </TabsTrigger>
              <TabsTrigger value="compra" className="flex flex-col gap-1 py-2 text-xs">
                <ShoppingCart className="h-4 w-4" />
                Compra
              </TabsTrigger>
              <TabsTrigger value="marketing" className="flex flex-col gap-1 py-2 text-xs">
                <Megaphone className="h-4 w-4" />
                Marketing
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[calc(90vh-220px)] px-6 py-4">
            {/* 1. Dados do Contato */}
            <TabsContent value="contato" className="mt-0 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input value={formData.full_name as string || ""} onChange={(e) => handleChange("full_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.lead_status as string || "novo"} onValueChange={(v) => handleChange("lead_status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="novo">Novo</SelectItem>
                      <SelectItem value="qualificado">Qualificado</SelectItem>
                      <SelectItem value="em_contato">Em Contato</SelectItem>
                      <SelectItem value="negociacao">Negociação</SelectItem>
                      <SelectItem value="convertido">Convertido</SelectItem>
                      <SelectItem value="perdido">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Primeiro Nome</Label>
                  <Input value={formData.first_name as string || ""} onChange={(e) => handleChange("first_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Sobrenome</Label>
                  <Input value={formData.last_name as string || ""} onChange={(e) => handleChange("last_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={formData.email as string || ""} onChange={(e) => handleChange("email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Email</Label>
                  <Select value={formData.email_type as string || ""} onValueChange={(v) => handleChange("email_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corporativo">Corporativo</SelectItem>
                      <SelectItem value="generico">Genérico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={formData.phone as string || ""} onChange={(e) => handleChange("phone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input value={formData.whatsapp as string || ""} onChange={(e) => handleChange("whatsapp", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn</Label>
                  <Input value={formData.linkedin_profile as string || ""} onChange={(e) => handleChange("linkedin_profile", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Instagram</Label>
                  <Input value={formData.instagram as string || ""} onChange={(e) => handleChange("instagram", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Facebook ID</Label>
                  <Input value={formData.facebook_id as string || ""} onChange={(e) => handleChange("facebook_id", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Gênero</Label>
                  <Select value={formData.gender as string || ""} onValueChange={(v) => handleChange("gender", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m">Masculino</SelectItem>
                      <SelectItem value="f">Feminino</SelectItem>
                      <SelectItem value="o">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input type="date" value={formData.date_of_birth as string || ""} onChange={(e) => handleChange("date_of_birth", e.target.value)} />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Localização</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={formData.city as string || ""} onChange={(e) => handleChange("city", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input value={formData.state as string || ""} onChange={(e) => handleChange("state", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>País</Label>
                    <Input value={formData.country as string || ""} onChange={(e) => handleChange("country", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input value={formData.zip_code as string || ""} onChange={(e) => handleChange("zip_code", e.target.value)} />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 2. Dados da Empresa */}
            <TabsContent value="empresa" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Empresa</Label>
                  <Input value={formData.company_name as string || ""} onChange={(e) => handleChange("company_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nome Fantasia</Label>
                  <Input value={formData.company_trade_name as string || ""} onChange={(e) => handleChange("company_trade_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input value={formData.cnpj as string || ""} onChange={(e) => handleChange("cnpj", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>CNAE</Label>
                  <Input value={formData.cnae as string || ""} onChange={(e) => handleChange("cnae", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Segmento</Label>
                  <Input value={formData.company_segment as string || ""} onChange={(e) => handleChange("company_segment", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Subsegmento</Label>
                  <Input value={formData.company_subsegment as string || ""} onChange={(e) => handleChange("company_subsegment", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Porte</Label>
                  <Select value={formData.company_size as string || ""} onValueChange={(v) => handleChange("company_size", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ME">ME - Microempresa</SelectItem>
                      <SelectItem value="EPP">EPP - Pequeno Porte</SelectItem>
                      <SelectItem value="Media">Média Empresa</SelectItem>
                      <SelectItem value="Grande">Grande Empresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Cliente</Label>
                  <Select value={formData.client_type as string || ""} onValueChange={(v) => handleChange("client_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="B2B">B2B</SelectItem>
                      <SelectItem value="B2C">B2C</SelectItem>
                      <SelectItem value="B2B2C">B2B2C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Faturamento Mensal</Label>
                  <Input value={formData.monthly_revenue as string || ""} onChange={(e) => handleChange("monthly_revenue", e.target.value)} placeholder="Ex: R$ 50k - R$ 100k" />
                </div>
                <div className="space-y-2">
                  <Label>Faturamento Anual</Label>
                  <Input value={formData.annual_revenue as string || ""} onChange={(e) => handleChange("annual_revenue", e.target.value)} placeholder="Ex: R$ 600k - R$ 1.2M" />
                </div>
                <div className="space-y-2">
                  <Label>Nº de Funcionários</Label>
                  <Input value={formData.employee_count as string || ""} onChange={(e) => handleChange("employee_count", e.target.value)} placeholder="Ex: 11-50" />
                </div>
                <div className="space-y-2">
                  <Label>Anos no Mercado</Label>
                  <Input type="number" value={formData.years_in_market as number || ""} onChange={(e) => handleChange("years_in_market", parseInt(e.target.value) || null)} />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input value={formData.company_website as string || ""} onChange={(e) => handleChange("company_website", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn da Empresa</Label>
                  <Input value={formData.company_linkedin as string || ""} onChange={(e) => handleChange("company_linkedin", e.target.value)} />
                </div>
              </div>
            </TabsContent>

            {/* 3. Estrutura Organizacional / Decisão */}
            <TabsContent value="decisao" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input value={formData.job_title as string || ""} onChange={(e) => handleChange("job_title", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nível do Cargo</Label>
                  <Select value={formData.job_level as string || ""} onValueChange={(v) => handleChange("job_level", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="C-Level">C-Level</SelectItem>
                      <SelectItem value="Diretoria">Diretoria</SelectItem>
                      <SelectItem value="Gestão">Gestão</SelectItem>
                      <SelectItem value="Operacional">Operacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Input value={formData.department as string || ""} onChange={(e) => handleChange("department", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Papel na Compra</Label>
                  <Select value={formData.buying_role as string || ""} onValueChange={(v) => handleChange("buying_role", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Decisor">Decisor</SelectItem>
                      <SelectItem value="Influenciador">Influenciador</SelectItem>
                      <SelectItem value="Usuário">Usuário</SelectItem>
                      <SelectItem value="Financeiro">Financeiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Grau de Influência</Label>
                  <Select value={formData.influence_level as string || ""} onValueChange={(v) => handleChange("influence_level", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Decisores Envolvidos</Label>
                  <Input type="number" value={formData.decision_makers_count as number || ""} onChange={(e) => handleChange("decision_makers_count", parseInt(e.target.value) || null)} />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-4">
                <Switch checked={formData.is_decision_maker as boolean || false} onCheckedChange={(v) => handleChange("is_decision_maker", v)} />
                <Label>É decisor direto</Label>
              </div>
            </TabsContent>

            {/* 4. Stack Atual / Software */}
            <TabsContent value="software" className="mt-0 space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Switch checked={formData.uses_software as boolean || false} onCheckedChange={(v) => handleChange("uses_software", v)} />
                <Label>Usa software atualmente</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Software</Label>
                  <Input value={formData.software_type as string || ""} onChange={(e) => handleChange("software_type", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Software Atual</Label>
                  <Input value={formData.current_software as string || ""} onChange={(e) => handleChange("current_software", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Fornecedor Atual</Label>
                  <Input value={formData.current_vendor as string || ""} onChange={(e) => handleChange("current_vendor", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tempo de Uso</Label>
                  <Input value={formData.software_usage_time as string || ""} onChange={(e) => handleChange("software_usage_time", e.target.value)} placeholder="Ex: 2 anos" />
                </div>
                <div className="space-y-2">
                  <Label>Satisfação com Software</Label>
                  <Select value={formData.software_satisfaction as string || ""} onValueChange={(v) => handleChange("software_satisfaction", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Motivo de Troca</Label>
                  <Input value={formData.switch_reason as string || ""} onChange={(e) => handleChange("switch_reason", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Principal Dor</Label>
                <Textarea value={formData.main_pain_point as string || ""} onChange={(e) => handleChange("main_pain_point", e.target.value)} placeholder="Descreva o principal problema do lead com a solução atual..." />
              </div>
            </TabsContent>

            {/* 5. Potencial de Compra */}
            <TabsContent value="compra" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Usuários Estimados</Label>
                  <Input type="number" value={formData.estimated_users as number || ""} onChange={(e) => handleChange("estimated_users", parseInt(e.target.value) || null)} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Licença</Label>
                  <Select value={formData.license_type as string || ""} onValueChange={(v) => handleChange("license_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="por_usuario">Por Usuário</SelectItem>
                      <SelectItem value="por_modulo">Por Módulo</SelectItem>
                      <SelectItem value="flat">Flat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Faixa de Orçamento</Label>
                  <Input value={formData.budget_range as string || ""} onChange={(e) => handleChange("budget_range", e.target.value)} placeholder="Ex: R$ 5.000 - R$ 10.000" />
                </div>
                <div className="space-y-2">
                  <Label>Prazo para Compra</Label>
                  <Input value={formData.purchase_timeline as string || ""} onChange={(e) => handleChange("purchase_timeline", e.target.value)} placeholder="Ex: 1-3 meses" />
                </div>
                <div className="space-y-2">
                  <Label>Urgência</Label>
                  <Select value={formData.urgency_level as string || ""} onValueChange={(v) => handleChange("urgency_level", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Engajamento</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch checked={formData.visited_pricing as boolean || false} onCheckedChange={(v) => handleChange("visited_pricing", v)} />
                    <Label className="text-sm">Visitou Preços</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={formData.attended_webinar as boolean || false} onCheckedChange={(v) => handleChange("attended_webinar", v)} />
                    <Label className="text-sm">Participou Webinar</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={formData.requested_demo as boolean || false} onCheckedChange={(v) => handleChange("requested_demo", v)} />
                    <Label className="text-sm">Solicitou Demo</Label>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Métricas</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Score Global</p>
                    <p className="text-xl font-bold">{formData.global_score as number || 0}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Conversões</p>
                    <p className="text-xl font-bold">{formData.total_conversions as number || 0}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Valor Total</p>
                    <p className="text-xl font-bold">R$ {(formData.total_value as number || 0).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 6. Marketing e Compliance */}
            <TabsContent value="marketing" className="mt-0 space-y-6">
              <div>
                <h4 className="font-medium mb-4">Origem de Aquisição</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Canal de Aquisição</Label>
                    <Select value={formData.acquisition_channel as string || ""} onValueChange={(v) => handleChange("acquisition_channel", v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="organico">Orgânico</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="evento">Evento</SelectItem>
                        <SelectItem value="indicacao">Indicação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fonte Específica</Label>
                    <Input value={formData.specific_source as string || ""} onChange={(e) => handleChange("specific_source", e.target.value)} placeholder="Google, Meta, LinkedIn..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Campanha</Label>
                    <Input value={formData.campaign as string || ""} onChange={(e) => handleChange("campaign", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Conjunto / Público</Label>
                    <Input value={formData.ad_set as string || ""} onChange={(e) => handleChange("ad_set", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Criativo</Label>
                    <Input value={formData.creative as string || ""} onChange={(e) => handleChange("creative", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Palavra-chave</Label>
                    <Input value={formData.keyword as string || ""} onChange={(e) => handleChange("keyword", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Custo do Lead</Label>
                    <Input type="number" step="0.01" value={formData.lead_cost as number || ""} onChange={(e) => handleChange("lead_cost", parseFloat(e.target.value) || null)} />
                  </div>
                  <div className="space-y-2">
                    <Label>URL de Captura</Label>
                    <Input value={formData.capture_url as string || ""} onChange={(e) => handleChange("capture_url", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Captura</Label>
                    <Select value={formData.capture_type as string || ""} onValueChange={(v) => handleChange("capture_type", v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ebook">E-book</SelectItem>
                        <SelectItem value="webinar">Webinar</SelectItem>
                        <SelectItem value="oferta_direta">Oferta Direta</SelectItem>
                        <SelectItem value="diagnostico">Diagnóstico</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Qualidade e Validação</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch checked={formData.lead_validated as boolean || false} onCheckedChange={(v) => handleChange("lead_validated", v)} />
                    <Label className="text-sm">Lead Validado</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={formData.company_validated as boolean || false} onCheckedChange={(v) => handleChange("company_validated", v)} />
                    <Label className="text-sm">Empresa Validada</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={formData.email_verified as boolean || false} onCheckedChange={(v) => handleChange("email_verified", v)} />
                    <Label className="text-sm">Email Verificado</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={formData.phone_verified as boolean || false} onCheckedChange={(v) => handleChange("phone_verified", v)} />
                    <Label className="text-sm">Telefone Verificado</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={formData.data_enriched as boolean || false} onCheckedChange={(v) => handleChange("data_enriched", v)} />
                    <Label className="text-sm">Dados Enriquecidos</Label>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4 flex items-center gap-2"><Shield className="h-4 w-4" /> Compliance LGPD</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch checked={formData.lgpd_consent as boolean || false} onCheckedChange={(v) => handleChange("lgpd_consent", v)} />
                    <Label>Consentimento LGPD</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked={formData.partner_sharing_consent as boolean || false} onCheckedChange={(v) => handleChange("partner_sharing_consent", v)} />
                    <Label>Compartilhamento Parceiros</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Data do Consentimento</Label>
                    <Input type="date" value={formData.consent_date as string || ""} onChange={(e) => handleChange("consent_date", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fonte do Consentimento</Label>
                    <Input value={formData.consent_source as string || ""} onChange={(e) => handleChange("consent_source", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <Label>Finalidade dos Dados</Label>
                  <Input value={formData.data_purpose as string || ""} onChange={(e) => handleChange("data_purpose", e.target.value)} />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4 flex items-center gap-2"><Settings className="h-4 w-4" /> Campos Internos</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Classificação Interna</Label>
                    <Input value={formData.internal_classification as string || ""} onChange={(e) => handleChange("internal_classification", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tags (separadas por vírgula)</Label>
                    <Input 
                      value={Array.isArray(formData.tags) ? (formData.tags as string[]).join(", ") : ""} 
                      onChange={(e) => handleChange("tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))} 
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <Label>Observações Internas</Label>
                  <Textarea value={formData.internal_notes as string || ""} onChange={(e) => handleChange("internal_notes", e.target.value)} rows={3} />
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-between items-center p-6 pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            Criado em {formData.created_at ? format(new Date(formData.created_at as string), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
            {formData.updated_at && ` • Atualizado em ${format(new Date(formData.updated_at as string), "dd/MM/yyyy HH:mm", { locale: ptBR })}`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
