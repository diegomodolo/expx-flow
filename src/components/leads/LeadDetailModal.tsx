import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  User, Building2, Briefcase, Monitor, ShoppingCart, 
  Megaphone, TrendingUp, Shield, Save, Loader2 
} from "lucide-react";

interface LeadDetailModalProps {
  lead: Record<string, unknown> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

type SectionType = 'contato' | 'empresa' | 'decisao' | 'software' | 'compra' | 'marketing' | 'comportamento' | 'lgpd';

const sections: { id: SectionType; label: string; icon: React.ElementType }[] = [
  { id: 'contato', label: 'Contato', icon: User },
  { id: 'empresa', label: 'Empresa', icon: Building2 },
  { id: 'decisao', label: 'Decisão', icon: Briefcase },
  { id: 'software', label: 'Software', icon: Monitor },
  { id: 'compra', label: 'Compra', icon: ShoppingCart },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'comportamento', label: 'Comportamento', icon: TrendingUp },
  { id: 'lgpd', label: 'LGPD', icon: Shield },
];

export const LeadDetailModal = ({ lead, open, onOpenChange, companyId }: LeadDetailModalProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionType>("contato");

  useEffect(() => {
    if (lead) {
      setFormData({ ...lead });
    }
  }, [lead]);

  useEffect(() => {
    if (open) {
      setActiveSection('contato');
    }
  }, [open]);

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

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'contato':
        return (
          <div className="space-y-6">
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
          </div>
        );

      case 'empresa':
        return (
          <div className="space-y-4">
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
          </div>
        );

      case 'decisao':
        return (
          <div className="space-y-4">
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
                    <SelectItem value="alto">Alto</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="baixo">Baixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tem Autonomia de Orçamento?</Label>
                <Select value={formData.has_budget_authority as string || ""} onValueChange={(v) => handleChange("has_budget_authority", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Comitê de Compra</Label>
                <Textarea value={formData.buying_committee as string || ""} onChange={(e) => handleChange("buying_committee", e.target.value)} placeholder="Descreva as pessoas envolvidas na decisão" />
              </div>
            </div>
          </div>
        );

      case 'software':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CRM Atual</Label>
                <Input value={formData.current_crm as string || ""} onChange={(e) => handleChange("current_crm", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>ERP Atual</Label>
                <Input value={formData.current_erp as string || ""} onChange={(e) => handleChange("current_erp", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Automação de Marketing</Label>
                <Input value={formData.marketing_automation as string || ""} onChange={(e) => handleChange("marketing_automation", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>E-commerce</Label>
                <Input value={formData.ecommerce_platform as string || ""} onChange={(e) => handleChange("ecommerce_platform", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Gestor de Anúncios</Label>
                <Input value={formData.ad_management as string || ""} onChange={(e) => handleChange("ad_management", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Analytics</Label>
                <Input value={formData.analytics_tools as string || ""} onChange={(e) => handleChange("analytics_tools", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Outras Ferramentas</Label>
                <Textarea value={formData.other_tools as string || ""} onChange={(e) => handleChange("other_tools", e.target.value)} placeholder="Liste outras ferramentas utilizadas" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Satisfação com Stack Atual</Label>
                <Select value={formData.stack_satisfaction as string || ""} onValueChange={(v) => handleChange("stack_satisfaction", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="muito_satisfeito">Muito Satisfeito</SelectItem>
                    <SelectItem value="satisfeito">Satisfeito</SelectItem>
                    <SelectItem value="neutro">Neutro</SelectItem>
                    <SelectItem value="insatisfeito">Insatisfeito</SelectItem>
                    <SelectItem value="muito_insatisfeito">Muito Insatisfeito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 'compra':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Orçamento Disponível</Label>
                <Input value={formData.budget_range as string || ""} onChange={(e) => handleChange("budget_range", e.target.value)} placeholder="Ex: R$ 5k - R$ 10k/mês" />
              </div>
              <div className="space-y-2">
                <Label>Urgência de Compra</Label>
                <Select value={formData.purchase_urgency as string || ""} onValueChange={(v) => handleChange("purchase_urgency", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imediata">Imediata</SelectItem>
                    <SelectItem value="30_dias">30 dias</SelectItem>
                    <SelectItem value="90_dias">90 dias</SelectItem>
                    <SelectItem value="6_meses">6 meses</SelectItem>
                    <SelectItem value="indefinido">Indefinido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ciclo de Compra</Label>
                <Select value={formData.purchase_cycle as string || ""} onValueChange={(v) => handleChange("purchase_cycle", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                    <SelectItem value="unica">Compra Única</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Já comprou da empresa?</Label>
                <Select value={formData.previous_customer as string || ""} onValueChange={(v) => handleChange("previous_customer", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Interesse em Produtos/Serviços</Label>
                <Textarea value={formData.product_interest as string || ""} onChange={(e) => handleChange("product_interest", e.target.value)} placeholder="Descreva os produtos/serviços de interesse" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Principais Objeções</Label>
                <Textarea value={formData.main_objections as string || ""} onChange={(e) => handleChange("main_objections", e.target.value)} placeholder="Liste as principais objeções identificadas" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Concorrentes Avaliados</Label>
                <Textarea value={formData.competitors_evaluated as string || ""} onChange={(e) => handleChange("competitors_evaluated", e.target.value)} placeholder="Quais concorrentes o lead está avaliando" />
              </div>
            </div>
          </div>
        );

      case 'marketing':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origem (UTM Source)</Label>
                <Input value={formData.utm_source as string || ""} onChange={(e) => handleChange("utm_source", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mídia (UTM Medium)</Label>
                <Input value={formData.utm_medium as string || ""} onChange={(e) => handleChange("utm_medium", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Campanha (UTM Campaign)</Label>
                <Input value={formData.utm_campaign as string || ""} onChange={(e) => handleChange("utm_campaign", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Termo (UTM Term)</Label>
                <Input value={formData.utm_term as string || ""} onChange={(e) => handleChange("utm_term", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Conteúdo (UTM Content)</Label>
                <Input value={formData.utm_content as string || ""} onChange={(e) => handleChange("utm_content", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Referência</Label>
                <Input value={formData.referral_source as string || ""} onChange={(e) => handleChange("referral_source", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Landing Page</Label>
                <Input value={formData.landing_page as string || ""} onChange={(e) => handleChange("landing_page", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Formulário de Origem</Label>
                <Input value={formData.form_name as string || ""} onChange={(e) => handleChange("form_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>GCLID (Google)</Label>
                <Input value={formData.gclid as string || ""} onChange={(e) => handleChange("gclid", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>FBCLID (Facebook)</Label>
                <Input value={formData.fbclid as string || ""} onChange={(e) => handleChange("fbclid", e.target.value)} />
              </div>
            </div>
          </div>
        );

      case 'comportamento':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lead Score</Label>
                <Input type="number" value={formData.global_score as number || 0} onChange={(e) => handleChange("global_score", parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Temperatura</Label>
                <Select value={formData.temperature as string || ""} onValueChange={(v) => handleChange("temperature", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quente">Quente</SelectItem>
                    <SelectItem value="morno">Morno</SelectItem>
                    <SelectItem value="frio">Frio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nº de Interações</Label>
                <Input type="number" value={formData.interaction_count as number || 0} onChange={(e) => handleChange("interaction_count", parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Última Interação</Label>
                <Input type="date" value={formData.last_interaction_at as string || ""} onChange={(e) => handleChange("last_interaction_at", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nº de Visitas ao Site</Label>
                <Input type="number" value={formData.website_visits as number || 0} onChange={(e) => handleChange("website_visits", parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Nº de Emails Abertos</Label>
                <Input type="number" value={formData.emails_opened as number || 0} onChange={(e) => handleChange("emails_opened", parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Nº de Emails Clicados</Label>
                <Input type="number" value={formData.emails_clicked as number || 0} onChange={(e) => handleChange("emails_clicked", parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Nº de Downloads</Label>
                <Input type="number" value={formData.downloads_count as number || 0} onChange={(e) => handleChange("downloads_count", parseInt(e.target.value) || 0)} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Conteúdos Baixados</Label>
                <Textarea value={formData.content_consumed as string || ""} onChange={(e) => handleChange("content_consumed", e.target.value)} placeholder="Liste os materiais baixados" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Páginas Visitadas</Label>
                <Textarea value={formData.pages_visited as string || ""} onChange={(e) => handleChange("pages_visited", e.target.value)} placeholder="Principais páginas visitadas" />
              </div>
            </div>
          </div>
        );

      case 'lgpd':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Consentimento para Marketing</Label>
                <Select value={formData.consent_marketing as string || ""} onValueChange={(v) => handleChange("consent_marketing", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Consentimento para Processamento</Label>
                <Select value={formData.consent_data_processing as string || ""} onValueChange={(v) => handleChange("consent_data_processing", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data do Consentimento</Label>
                <Input type="datetime-local" value={formData.consent_date as string || ""} onChange={(e) => handleChange("consent_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>IP do Consentimento</Label>
                <Input value={formData.consent_ip as string || ""} onChange={(e) => handleChange("consent_ip", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>URL do Consentimento</Label>
                <Input value={formData.consent_url as string || ""} onChange={(e) => handleChange("consent_url", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Versão da Política</Label>
                <Input value={formData.consent_version as string || ""} onChange={(e) => handleChange("consent_version", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Opt-out Solicitado</Label>
                <Select value={formData.data_deletion_requested as string || ""} onValueChange={(v) => handleChange("data_deletion_requested", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data do Opt-out</Label>
                <Input type="datetime-local" value={formData.data_deletion_date as string || ""} onChange={(e) => handleChange("data_deletion_date", e.target.value)} />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1000px] h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-3">
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
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Menu */}
          <div className="w-48 border-r bg-muted/30 p-3 flex flex-col gap-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                    activeSection === section.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <ScrollArea className="flex-1" key={activeSection}>
            <div className="p-6">
              {renderSectionContent()}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
