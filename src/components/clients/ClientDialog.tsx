import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { Client, ClientStatus } from "@/hooks/useClients";
import { useSectors } from "@/hooks/useSectors";
import { useFacebookIntegration } from "@/hooks/useFacebookIntegration";
import { useFacebookPages } from "@/hooks/useFacebookPages";
import { useGoogleAdsIntegration } from "@/hooks/useGoogleAdsIntegration";
import { useClients } from "@/hooks/useClients";
import { useTeams } from "@/hooks/useTeams";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Plus, Check, ChevronsUpDown, Instagram, Facebook, User, DollarSign, Link, Pencil, Package, FileText, Presentation, Users, Sparkles, Lightbulb, ImageIcon } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { ClientBriefingTab } from "./ClientBriefingTab";
import { ClientContactsTab } from "./ClientContactsTab";
import { ReferenceSelectionDialog } from "./ReferenceSelectionDialog";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCompany } from "@/contexts/CompanyContext";

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (clientData: Omit<Client, "id" | "active_campaigns" | "avg_cpl" | "leads_generated">) => Promise<any>;
  client?: Client;
  title: string;
  readOnly?: boolean;
}

type SectionType = 'cadastro' | 'financeiro' | 'integracoes' | 'copywriting' | 'produto' | 'apresentacao' | 'identidade_ia' | 'contatos' | 'briefing';

const sections: { id: SectionType; label: string; icon: React.ElementType; editOnly?: boolean }[] = [
  { id: 'cadastro', label: 'Cadastro', icon: User },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'integracoes', label: 'Contas & Integrações', icon: Link },
  { id: 'copywriting', label: 'Copywriting', icon: Pencil },
  { id: 'produto', label: 'Produto & Público', icon: Package },
  { id: 'apresentacao', label: 'Apresentação', icon: Presentation },
  { id: 'identidade_ia', label: 'Identidade Visual IA', icon: Sparkles },
  { id: 'contatos', label: 'Contatos', icon: Users, editOnly: true },
  { id: 'briefing', label: 'Briefing', icon: FileText, editOnly: true },
];

export function ClientDialog({ open, onOpenChange, onSubmit, client, title, readOnly = false }: ClientDialogProps) {
  const { sectors, createSector } = useSectors();
  const { adAccounts } = useFacebookIntegration();
  const { pages: facebookPages, instagramAccounts } = useFacebookPages();
  const { adAccounts: googleAdAccounts } = useGoogleAdsIntegration();
  const { clients } = useClients();
  const { teams } = useTeams();
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<SectionType>('cadastro');
  const [referenceDialogOpen, setReferenceDialogOpen] = useState(false);
  const [formData, setFormData] = useState(() => {
    if (client) {
      return {
        name: client.name || "",
        email: client.email || "",
        company: client.company || "",
        sector: client.sector || "",
        status: client.status || ("excelente" as ClientStatus),
        avatar: client.avatar || "",
        monthly_budget: client.monthly_budget || 0,
        target_audience: client.target_audience || "",
        product_name: client.product_name || "",
        voice_tone: client.voice_tone || "",
        objectives: client.objectives || "",
        preferred_platforms: client.preferred_platforms || [],
        campaign_type: client.campaign_type || "",
        notes: client.notes || "",
        ad_account_id: client.ad_account_id || "",
        google_account_id: client.google_account_id || "",
        facebook_page_id: client.facebook_page_id || "",
        instagram_account_id: client.instagram_account_id || "",
        website_url: client.website_url || "",
        inactive_reason: client.inactive_reason || "",
        team_id: client.team_id || "none",
        payment_type: (client.payment_type || "prepaid") as 'prepaid' | 'postpaid',
        presentation_logo: (client as any).presentation_logo || "",
        presentation_bg_image: (client as any).presentation_bg_image || "",
        presentation_overlay_color: (client as any).presentation_overlay_color || "#1a73e8",
        presentation_overlay_opacity: (client as any).presentation_overlay_opacity ?? 0.7,
        ai_reference_image_1: (client as any).ai_reference_image_1 || "",
        ai_reference_image_2: (client as any).ai_reference_image_2 || "",
        ai_reference_image_3: (client as any).ai_reference_image_3 || "",
        // Platform-specific financial fields
        meta_monthly_budget: client.meta_monthly_budget || 0,
        meta_payment_type: client.meta_payment_type || "prepaid",
        meta_recharge_day: client.meta_recharge_day,
        google_monthly_budget: client.google_monthly_budget || 0,
        google_payment_type: client.google_payment_type || "prepaid",
        google_recharge_day: client.google_recharge_day,
        linkedin_monthly_budget: client.linkedin_monthly_budget || 0,
        linkedin_payment_type: client.linkedin_payment_type || "prepaid",
        linkedin_recharge_day: client.linkedin_recharge_day,
        tiktok_monthly_budget: client.tiktok_monthly_budget || 0,
        tiktok_payment_type: client.tiktok_payment_type || "prepaid",
        tiktok_recharge_day: client.tiktok_recharge_day,
        twitter_monthly_budget: client.twitter_monthly_budget || 0,
        twitter_payment_type: client.twitter_payment_type || "prepaid",
        twitter_recharge_day: client.twitter_recharge_day,
      };
    }
    return {
      name: "",
      email: "",
      company: "",
      sector: "",
      status: "excelente" as ClientStatus,
      avatar: "",
      monthly_budget: 0,
      target_audience: "",
      product_name: "",
      voice_tone: "",
      objectives: "",
      preferred_platforms: [] as string[],
      campaign_type: "",
      notes: "",
      ad_account_id: "",
      google_account_id: "",
      facebook_page_id: "",
      instagram_account_id: "",
      website_url: "",
      inactive_reason: "",
      team_id: "none",
      payment_type: "prepaid" as 'prepaid' | 'postpaid',
      presentation_logo: "",
      presentation_bg_image: "",
      presentation_overlay_color: "#1a73e8",
      presentation_overlay_opacity: 0.7,
      ai_reference_image_1: "",
      ai_reference_image_2: "",
      ai_reference_image_3: "",
      // Platform-specific financial fields
      meta_monthly_budget: 0,
      meta_payment_type: "prepaid",
      meta_recharge_day: undefined as number | undefined,
      google_monthly_budget: 0,
      google_payment_type: "prepaid",
      google_recharge_day: undefined as number | undefined,
      linkedin_monthly_budget: 0,
      linkedin_payment_type: "prepaid",
      linkedin_recharge_day: undefined as number | undefined,
      tiktok_monthly_budget: 0,
      tiktok_payment_type: "prepaid",
      tiktok_recharge_day: undefined as number | undefined,
      twitter_monthly_budget: 0,
      twitter_payment_type: "prepaid",
      twitter_recharge_day: undefined as number | undefined,
    };
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [adAccountOpen, setAdAccountOpen] = useState(false);
  const [googleAccountOpen, setGoogleAccountOpen] = useState(false);
  const [facebookPageOpen, setFacebookPageOpen] = useState(false);
  const [instagramAccountOpen, setInstagramAccountOpen] = useState(false);
  const [showNewSectorInput, setShowNewSectorInput] = useState(false);
  const [newSectorName, setNewSectorName] = useState("");
  const [localClient, setLocalClient] = useState<Client | undefined>(client);
  const [rechargeDayValue, setRechargeDayValue] = useState<string>("none");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const presentationLogoInputRef = useRef<HTMLInputElement>(null);
  const presentationBgInputRef = useRef<HTMLInputElement>(null);
  const aiRefImage1InputRef = useRef<HTMLInputElement>(null);
  const aiRefImage2InputRef = useRef<HTMLInputElement>(null);
  const aiRefImage3InputRef = useRef<HTMLInputElement>(null);
  const [uploadingPresentationLogo, setUploadingPresentationLogo] = useState(false);
  const [uploadingPresentationBg, setUploadingPresentationBg] = useState(false);
  const [uploadingAiRefImage, setUploadingAiRefImage] = useState<1 | 2 | 3 | null>(null);

  const platforms = ["Google Ads", "Meta Ads", "LinkedIn Ads", "TikTok Ads", "Twitter Ads"];
  const voiceTones = ["Profissional", "Casual", "Amigável", "Autoritativo", "Divertido", "Inspirador", "Educativo"];
  const campaignTypes = ["Awareness", "Conversão", "Lead Generation", "Retargeting", "Branding", "E-commerce"];

  const availableAdAccounts = adAccounts.filter(account => {
    const isUsedByOtherClient = clients.some(c => 
      c.ad_account_id === account.id && c.id !== client?.id
    );
    return !isUsedByOtherClient;
  });

  useEffect(() => {
    if (open && client) {
      setFormData({
        name: client.name || "",
        email: client.email || "",
        company: client.company || "",
        sector: client.sector || "",
        status: client.status || "excelente",
        avatar: client.avatar || "",
        monthly_budget: client.monthly_budget || 0,
        target_audience: client.target_audience || "",
        product_name: client.product_name || "",
        voice_tone: client.voice_tone || "",
        objectives: client.objectives || "",
        preferred_platforms: client.preferred_platforms || [],
        campaign_type: client.campaign_type || "",
        notes: client.notes || "",
        ad_account_id: client.ad_account_id || "",
        google_account_id: client.google_account_id || "",
        facebook_page_id: client.facebook_page_id || "",
        instagram_account_id: client.instagram_account_id || "",
        website_url: client.website_url || "",
        inactive_reason: client.inactive_reason || "",
        team_id: client.team_id || "none",
        payment_type: client.payment_type || "prepaid",
        presentation_logo: (client as any).presentation_logo || "",
        presentation_bg_image: (client as any).presentation_bg_image || "",
        presentation_overlay_color: (client as any).presentation_overlay_color || "#1a73e8",
        presentation_overlay_opacity: (client as any).presentation_overlay_opacity ?? 0.7,
        ai_reference_image_1: (client as any).ai_reference_image_1 || "",
        ai_reference_image_2: (client as any).ai_reference_image_2 || "",
        ai_reference_image_3: (client as any).ai_reference_image_3 || "",
        // Platform-specific financial fields
        meta_monthly_budget: client.meta_monthly_budget || 0,
        meta_payment_type: client.meta_payment_type || "prepaid",
        meta_recharge_day: client.meta_recharge_day,
        google_monthly_budget: client.google_monthly_budget || 0,
        google_payment_type: client.google_payment_type || "prepaid",
        google_recharge_day: client.google_recharge_day,
        linkedin_monthly_budget: client.linkedin_monthly_budget || 0,
        linkedin_payment_type: client.linkedin_payment_type || "prepaid",
        linkedin_recharge_day: client.linkedin_recharge_day,
        tiktok_monthly_budget: client.tiktok_monthly_budget || 0,
        tiktok_payment_type: client.tiktok_payment_type || "prepaid",
        tiktok_recharge_day: client.tiktok_recharge_day,
        twitter_monthly_budget: client.twitter_monthly_budget || 0,
        twitter_payment_type: client.twitter_payment_type || "prepaid",
        twitter_recharge_day: client.twitter_recharge_day,
      });
      setLocalClient(client);
      
      const rechargeDay = client.facebook_ad_accounts?.recharge_day;
      setRechargeDayValue(rechargeDay ? rechargeDay.toString() : "none");
    } else if (open && !client) {
      // Reset form for new client
      setFormData({
        name: "",
        email: "",
        company: "",
        sector: "",
        status: "excelente" as ClientStatus,
        avatar: "",
        monthly_budget: 0,
        target_audience: "",
        product_name: "",
        voice_tone: "",
        objectives: "",
        preferred_platforms: [],
        campaign_type: "",
        notes: "",
        ad_account_id: "",
        google_account_id: "",
        facebook_page_id: "",
        instagram_account_id: "",
        website_url: "",
        inactive_reason: "",
        team_id: "none",
        payment_type: "prepaid" as 'prepaid' | 'postpaid',
        presentation_logo: "",
        presentation_bg_image: "",
        presentation_overlay_color: "#1a73e8",
        presentation_overlay_opacity: 0.7,
        ai_reference_image_1: "",
        ai_reference_image_2: "",
        ai_reference_image_3: "",
        // Platform-specific financial fields
        meta_monthly_budget: 0,
        meta_payment_type: "prepaid",
        meta_recharge_day: undefined,
        google_monthly_budget: 0,
        google_payment_type: "prepaid",
        google_recharge_day: undefined,
        linkedin_monthly_budget: 0,
        linkedin_payment_type: "prepaid",
        linkedin_recharge_day: undefined,
        tiktok_monthly_budget: 0,
        tiktok_payment_type: "prepaid",
        tiktok_recharge_day: undefined,
        twitter_monthly_budget: 0,
        twitter_payment_type: "prepaid",
        twitter_recharge_day: undefined,
      });
      setLocalClient(undefined);
      setRechargeDayValue("none");
    }
  }, [open, client]);

  useEffect(() => {
    if (open) {
      setActiveSection('cadastro');
    }
  }, [open]);
  
  const handleCreateSector = async () => {
    if (!newSectorName.trim()) return;
    
    const newSector = await createSector(newSectorName.trim());
    
    if (newSector) {
      setFormData({ ...formData, sector: newSector.name });
      setNewSectorName("");
      setShowNewSectorInput(false);
      toast({
        title: "Setor criado",
        description: `O setor "${newSector.name}" foi criado com sucesso!`,
      });
    } else {
      toast({
        title: "Erro ao criar setor",
        description: "Já existe um setor com esse nome nesta empresa ou ocorreu um erro.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        team_id: formData.team_id === 'none' ? null : formData.team_id,
        ai_briefing: localClient?.ai_briefing,
        briefing_generated_at: localClient?.briefing_generated_at,
      };
      
      await onSubmit(submitData);
      
      if (client?.facebook_ad_accounts?.id) {
        const { error: accountError } = await supabase
          .from('facebook_ad_accounts')
          .update({
            recharge_day: rechargeDayValue === "none" ? null : parseInt(rechargeDayValue)
          })
          .eq('id', client.facebook_ad_accounts.id);
        
        if (accountError) {
          console.error('Erro ao atualizar dia de recarga:', accountError);
          toast({
            title: "Aviso",
            description: "Cliente salvo, mas houve um erro ao atualizar o dia de recarga.",
            variant: "destructive",
          });
        }
      }
      
      toast({
        title: "Sucesso",
        description: client ? "Cliente atualizado com sucesso!" : "Cliente criado com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar cliente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('client-avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('client-avatars')
        .getPublicUrl(fileName);

      setFormData({ ...formData, avatar: publicUrl });
      toast({
        title: "Sucesso",
        description: "Foto enviada com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao enviar foto. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePresentationLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingPresentationLogo(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `presentation-logo-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('client-avatars')
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('client-avatars')
        .getPublicUrl(fileName);

      setFormData({ ...formData, presentation_logo: publicUrl });
      toast({
        title: "Sucesso",
        description: "Logo da apresentação enviada com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao enviar logo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploadingPresentationLogo(false);
    }
  };

  const handlePresentationBgUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingPresentationBg(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `presentation-bg-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('client-avatars')
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('client-avatars')
        .getPublicUrl(fileName);

      setFormData({ ...formData, presentation_bg_image: publicUrl });
      toast({
        title: "Sucesso",
        description: "Imagem de fundo enviada com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao enviar imagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploadingPresentationBg(false);
    }
  };

  const handleAiReferenceImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, imageNumber: 1 | 2 | 3) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAiRefImage(imageNumber);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `ai-reference-${imageNumber}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('client-avatars')
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('client-avatars')
        .getPublicUrl(fileName);

      const fieldName = `ai_reference_image_${imageNumber}` as 'ai_reference_image_1' | 'ai_reference_image_2' | 'ai_reference_image_3';
      setFormData({ ...formData, [fieldName]: publicUrl });
      toast({
        title: "Sucesso",
        description: `Imagem de referência ${imageNumber} enviada com sucesso!`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao enviar imagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploadingAiRefImage(null);
    }
  };

  const handlePlatformChange = (platform: string, checked: boolean) => {
    if (checked) {
      setFormData({ 
        ...formData, 
        preferred_platforms: [...formData.preferred_platforms, platform] 
      });
    } else {
      setFormData({ 
        ...formData, 
        preferred_platforms: formData.preferred_platforms.filter(p => p !== platform) 
      });
    }
  };

  const handleBriefingUpdate = (updatedClient: Client) => {
    setLocalClient(updatedClient);
    setFormData(prev => ({
      ...prev,
      ai_briefing: updatedClient.ai_briefing,
      briefing_generated_at: updatedClient.briefing_generated_at,
    }));
  };

  const filteredSections = sections.filter(s => !s.editOnly || client);

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'cadastro':
        return (
          <div className="space-y-6">
            {/* Nome e Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={readOnly}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={readOnly}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
            
            {/* Empresa e Website */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Empresa *</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  required
                  disabled={readOnly}
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website_url">Website</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  disabled={readOnly}
                  placeholder="https://www.empresa.com"
                />
              </div>
            </div>

            {/* Setor */}
            <div className="space-y-2">
              <Label htmlFor="sector">Setor *</Label>
              <div className="space-y-2">
                {!showNewSectorInput ? (
                  <div className="flex gap-2">
                    <Select 
                      value={formData.sector} 
                      onValueChange={(value) => {
                        if (value === "new") {
                          setShowNewSectorInput(true);
                        } else {
                          setFormData({ ...formData, sector: value });
                        }
                      }}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione um setor" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectors.map((sector) => (
                          <SelectItem key={sector.id} value={sector.name}>
                            {sector.name}
                          </SelectItem>
                        ))}
                        {!readOnly && (
                          <SelectItem value="new">
                            <div className="flex items-center gap-2">
                              <Plus className="w-4 h-4" />
                              Criar novo setor
                            </div>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome do novo setor"
                      value={newSectorName}
                      onChange={(e) => setNewSectorName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateSector();
                        }
                        if (e.key === "Escape") {
                          setShowNewSectorInput(false);
                          setNewSectorName("");
                        }
                      }}
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      size="sm" 
                      onClick={handleCreateSector}
                      disabled={!newSectorName.trim()}
                    >
                      Criar
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setShowNewSectorInput(false);
                        setNewSectorName("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Status e Squad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: ClientStatus) => setFormData({ ...formData, status: value })} disabled={readOnly}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excelente">Excelente</SelectItem>
                    <SelectItem value="atencao">Atenção</SelectItem>
                    <SelectItem value="emergencial">Emergencial</SelectItem>
                    <SelectItem value="sem_fundos">Sem Fundos</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="team">Squad</Label>
                <Select
                  value={formData.team_id}
                  onValueChange={(value) => setFormData({ ...formData, team_id: value })}
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a squad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma squad</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: team.color }}
                          />
                          {team.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Motivo de Inatividade */}
            {formData.status === 'inativo' && (
              <div className="space-y-2">
                <Label htmlFor="inactive_reason">Motivo da Inatividade</Label>
                <Textarea
                  id="inactive_reason"
                  value={formData.inactive_reason || ""}
                  onChange={(e) => setFormData({ ...formData, inactive_reason: e.target.value })}
                  placeholder="Descreva o motivo da inatividade..."
                  disabled={readOnly}
                  rows={3}
                />
              </div>
            )}

            {/* Avatar Upload */}
            <div className="space-y-2">
              <Label>Foto do Cliente</Label>
              <div className="flex items-center gap-4 flex-wrap">
                {formData.avatar && (
                  <div className="relative">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={formData.avatar} alt="Avatar" />
                      <AvatarFallback>{formData.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                        onClick={() => setFormData({ ...formData, avatar: "" })}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || readOnly}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? "Enviando..." : "Upload de Foto"}
                </Button>
                {/* Botão para buscar do Instagram */}
                {(() => {
                  const selectedInstagram = instagramAccounts.find(acc => acc.id === formData.instagram_account_id);
                  if (selectedInstagram?.profile_picture_url && !readOnly) {
                    return (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setFormData({ ...formData, avatar: selectedInstagram.profile_picture_url || "" });
                          toast({
                            title: "Foto atualizada",
                            description: "Foto do perfil do Instagram aplicada com sucesso!",
                          });
                        }}
                        className="flex items-center gap-2"
                      >
                        <Instagram className="w-4 h-4" />
                        Buscar do Instagram
                      </Button>
                    );
                  }
                  return null;
                })()}
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              {formData.instagram_account_id && !instagramAccounts.find(acc => acc.id === formData.instagram_account_id)?.profile_picture_url && (
                <p className="text-xs text-muted-foreground">
                  Configure uma conta do Instagram em "Contas & Integrações" para importar a foto do perfil.
                </p>
              )}
            </div>
          </div>
        );

      case 'financeiro':
        const platformFinancialConfig = [
          { 
            key: 'meta', 
            name: 'Meta Ads', 
            platformCheck: 'Meta Ads',
            icon: <Facebook className="w-5 h-5 text-blue-600" />,
            color: 'border-blue-200 bg-blue-50/50'
          },
          { 
            key: 'google', 
            name: 'Google Ads', 
            platformCheck: 'Google Ads',
            icon: <div className="w-5 h-5 flex items-center justify-center text-xs font-bold text-red-500">G</div>,
            color: 'border-red-200 bg-red-50/50'
          },
          { 
            key: 'linkedin', 
            name: 'LinkedIn Ads', 
            platformCheck: 'LinkedIn Ads',
            icon: <div className="w-5 h-5 flex items-center justify-center text-xs font-bold text-blue-700">in</div>,
            color: 'border-blue-300 bg-blue-50/50'
          },
          { 
            key: 'tiktok', 
            name: 'TikTok Ads', 
            platformCheck: 'TikTok Ads',
            icon: <div className="w-5 h-5 flex items-center justify-center text-xs font-bold text-black">♪</div>,
            color: 'border-gray-300 bg-gray-50/50'
          },
          { 
            key: 'twitter', 
            name: 'Twitter/X Ads', 
            platformCheck: 'Twitter Ads',
            icon: <div className="w-5 h-5 flex items-center justify-center text-xs font-bold text-black">𝕏</div>,
            color: 'border-gray-300 bg-gray-50/50'
          },
        ];

        const enabledPlatforms = platformFinancialConfig.filter(p => 
          formData.preferred_platforms.includes(p.platformCheck)
        );

        return (
          <div className="space-y-6">
            {enabledPlatforms.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <DollarSign className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground font-medium">
                  Nenhuma plataforma selecionada
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Selecione pelo menos uma plataforma em "Contas & Integrações" para configurar orçamentos.
                </p>
              </div>
            ) : (
              enabledPlatforms.map((platform) => {
                const budgetKey = `${platform.key}_monthly_budget` as keyof typeof formData;
                const paymentKey = `${platform.key}_payment_type` as keyof typeof formData;
                const rechargeKey = `${platform.key}_recharge_day` as keyof typeof formData;
                
                return (
                  <div key={platform.key} className={cn("border rounded-lg p-4 space-y-4", platform.color)}>
                    <div className="flex items-center gap-2">
                      {platform.icon}
                      <h3 className="font-semibold">{platform.name}</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Orçamento Mensal */}
                      <div className="space-y-2">
                        <Label>Orçamento Mensal</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={(formData[budgetKey] as number) || 0}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            [budgetKey]: parseFloat(e.target.value) || 0 
                          })}
                          placeholder="0.00"
                          disabled={readOnly}
                        />
                      </div>
                      
                      {/* Tipo de Pagamento */}
                      <div className="space-y-2">
                        <Label>Tipo de Pagamento</Label>
                        <Select
                          value={(formData[paymentKey] as string) || 'prepaid'}
                          onValueChange={(value: 'prepaid' | 'postpaid') =>
                            setFormData({ ...formData, [paymentKey]: value })
                          }
                          disabled={readOnly}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="prepaid">💰 Pré-pago</SelectItem>
                            <SelectItem value="postpaid">💳 Pós-pago</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Dia de Recarga */}
                      <div className="space-y-2">
                        <Label>Dia de Recarga</Label>
                        <Select
                          value={(formData[rechargeKey] as number)?.toString() || 'none'}
                          onValueChange={(value) => setFormData({ 
                            ...formData, 
                            [rechargeKey]: value === 'none' ? undefined : parseInt(value)
                          })}
                          disabled={readOnly}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Final do mês</SelectItem>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                              <SelectItem key={day} value={day.toString()}>
                                Dia {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {enabledPlatforms.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Configure orçamento, tipo de pagamento e dia de recarga para cada plataforma habilitada.
              </p>
            )}
          </div>
        );

      case 'integracoes':
        return (
          <div className="space-y-6">
            {/* Plataformas Preferidas */}
            <div className="space-y-2">
              <Label>Plataformas Preferidas</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {platforms.map((platform) => (
                  <div key={platform} className="flex items-center space-x-2">
                    <Checkbox
                      id={platform}
                      checked={formData.preferred_platforms.includes(platform)}
                      onCheckedChange={(checked) => handlePlatformChange(platform, checked as boolean)}
                      disabled={readOnly}
                    />
                    <Label htmlFor={platform} className="text-sm font-normal">
                      {platform}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Meta Ads Account */}
            {formData.preferred_platforms.includes("Meta Ads") && (
              <div className="space-y-2">
                <Label htmlFor="ad_account">Conta de Anúncio (Meta Ads)</Label>
                <Popover open={adAccountOpen} onOpenChange={setAdAccountOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={adAccountOpen}
                      className="w-full justify-between"
                      disabled={readOnly}
                    >
                      {formData.ad_account_id
                        ? availableAdAccounts.find((account) => account.id === formData.ad_account_id)?.account_name
                        : "Selecione a conta Meta Ads"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Buscar conta..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              setFormData({ ...formData, ad_account_id: "" });
                              setAdAccountOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${!formData.ad_account_id ? "opacity-100" : "opacity-0"}`}
                            />
                            Nenhuma conta selecionada
                          </CommandItem>
                          {availableAdAccounts.map((account) => (
                            <CommandItem
                              key={account.id}
                              value={account.account_name}
                              onSelect={() => {
                                setFormData({ ...formData, ad_account_id: account.id });
                                setAdAccountOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${formData.ad_account_id === account.id ? "opacity-100" : "opacity-0"}`}
                              />
                              {account.account_name} ({account.currency})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Google Ads Account */}
            {formData.preferred_platforms.includes("Google Ads") && (
              <div className="space-y-2">
                <Label htmlFor="google_account">Conta de Anúncio (Google Ads)</Label>
                <Popover open={googleAccountOpen} onOpenChange={setGoogleAccountOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={googleAccountOpen}
                      className="w-full justify-between"
                      disabled={readOnly}
                    >
                      {formData.google_account_id
                        ? googleAdAccounts.find((account) => account.id === formData.google_account_id)?.account_name
                        : "Selecione a conta Google Ads"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Buscar conta..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              setFormData({ ...formData, google_account_id: "" });
                              setGoogleAccountOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${!formData.google_account_id ? "opacity-100" : "opacity-0"}`}
                            />
                            Nenhuma conta selecionada
                          </CommandItem>
                          {googleAdAccounts.map((account) => (
                            <CommandItem
                              key={account.id}
                              value={account.account_name}
                              onSelect={() => {
                                setFormData({ ...formData, google_account_id: account.id });
                                setGoogleAccountOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${formData.google_account_id === account.id ? "opacity-100" : "opacity-0"}`}
                              />
                              {account.account_name} ({account.currency || 'N/A'})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Facebook Page */}
            <div className="space-y-2">
              <Label htmlFor="facebook_page">Página do Facebook</Label>
              <Popover open={facebookPageOpen} onOpenChange={setFacebookPageOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={facebookPageOpen}
                    className="w-full justify-between"
                    disabled={readOnly}
                  >
                    <div className="flex items-center gap-2">
                      <Facebook className="w-4 h-4 text-blue-600" />
                      {formData.facebook_page_id
                        ? facebookPages.find((page) => page.id === formData.facebook_page_id)?.page_name
                        : "Selecione uma página"}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Buscar página..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma página encontrada.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            setFormData({ ...formData, facebook_page_id: "" });
                            setFacebookPageOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${!formData.facebook_page_id ? "opacity-100" : "opacity-0"}`}
                          />
                          Nenhuma página selecionada
                        </CommandItem>
                        {facebookPages.map((page) => (
                          <CommandItem
                            key={page.id}
                            value={page.page_name}
                            onSelect={() => {
                              setFormData({ ...formData, facebook_page_id: page.id });
                              setFacebookPageOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${formData.facebook_page_id === page.id ? "opacity-100" : "opacity-0"}`}
                            />
                            <Facebook className="mr-2 h-4 w-4 text-blue-600" />
                            {page.page_name}
                            {page.page_category && (
                              <span className="ml-1 text-muted-foreground text-xs">
                                ({page.page_category})
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Instagram Account */}
            <div className="space-y-2">
              <Label htmlFor="instagram_account">Conta do Instagram</Label>
              <Popover open={instagramAccountOpen} onOpenChange={setInstagramAccountOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={instagramAccountOpen}
                    className="w-full justify-between"
                    disabled={readOnly}
                  >
                    <div className="flex items-center gap-2">
                      <Instagram className="w-4 h-4 text-pink-600" />
                      {formData.instagram_account_id
                        ? `@${instagramAccounts.find((acc) => acc.id === formData.instagram_account_id)?.username}`
                        : "Selecione uma conta"}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Buscar conta..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            setFormData({ ...formData, instagram_account_id: "" });
                            setInstagramAccountOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${!formData.instagram_account_id ? "opacity-100" : "opacity-0"}`}
                          />
                          Nenhuma conta selecionada
                        </CommandItem>
                        {instagramAccounts.map((account) => (
                          <CommandItem
                            key={account.id}
                            value={account.username}
                            onSelect={() => {
                              setFormData({ ...formData, instagram_account_id: account.id });
                              setInstagramAccountOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${formData.instagram_account_id === account.id ? "opacity-100" : "opacity-0"}`}
                            />
                            <Instagram className="mr-2 h-4 w-4 text-pink-600" />
                            @{account.username}
                            <span className="ml-1 text-muted-foreground text-xs">
                              ({account.followers_count.toLocaleString()} seguidores)
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        );

      case 'copywriting':
        return (
          <div className="space-y-6">
            {/* Tom de Voz e Tipo de Campanha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="voice_tone">Tom de Voz</Label>
                <Select value={formData.voice_tone} onValueChange={(value) => setFormData({ ...formData, voice_tone: value })} disabled={readOnly}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tom de voz" />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceTones.map((tone) => (
                      <SelectItem key={tone} value={tone}>{tone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign_type">Tipo de Campanha</Label>
                <Select value={formData.campaign_type} onValueChange={(value) => setFormData({ ...formData, campaign_type: value })} disabled={readOnly}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de campanha" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaignTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Objetivos */}
            <div className="space-y-2">
              <Label htmlFor="objectives">Objetivos</Label>
              <Textarea
                id="objectives"
                value={formData.objectives}
                onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                placeholder="Ex: Aumentar conversões em 30%, reduzir CAC..."
                rows={4}
                disabled={readOnly}
              />
            </div>
          </div>
        );

      case 'produto':
        return (
          <div className="space-y-6">
            {/* Nome do Produto */}
            <div className="space-y-2">
              <Label htmlFor="product_name">Nome do Produto</Label>
              <Input
                id="product_name"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                placeholder="Ex: Aplicativo de delivery"
                disabled={readOnly}
              />
            </div>

            {/* Público Alvo */}
            <div className="space-y-2">
              <Label htmlFor="target_audience">Público Alvo</Label>
              <Textarea
                id="target_audience"
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                placeholder="Ex: Mulheres de 25-45 anos, interessadas em tecnologia..."
                rows={4}
                disabled={readOnly}
              />
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informações adicionais sobre o cliente..."
                rows={4}
                disabled={readOnly}
              />
            </div>
          </div>
        );

      case 'apresentacao':
        return (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground mb-4">
              Configure a aparência visual das apresentações de conteúdo deste cliente.
            </p>

            {/* Preview da Capa */}
            <div className="space-y-2">
              <Label>Prévia da Capa</Label>
              <div 
                className="relative w-full aspect-video rounded-lg overflow-hidden border"
                style={{ 
                  backgroundImage: formData.presentation_bg_image ? `url(${formData.presentation_bg_image})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundColor: !formData.presentation_bg_image ? formData.presentation_overlay_color : undefined
                }}
              >
                {/* Overlay */}
                {formData.presentation_bg_image && (
                  <div 
                    className="absolute inset-0"
                    style={{ 
                      backgroundColor: formData.presentation_overlay_color,
                      opacity: formData.presentation_overlay_opacity
                    }}
                  />
                )}
                {/* Conteúdo */}
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-6">
                  {formData.presentation_logo ? (
                    <img 
                      src={formData.presentation_logo} 
                      alt="Logo" 
                      className="max-h-20 max-w-[200px] object-contain mb-4"
                    />
                  ) : formData.avatar ? (
                    <img 
                      src={formData.avatar} 
                      alt="Avatar" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-white/30 mb-4"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-white/20 mb-4" />
                  )}
                  <h3 className="text-lg font-bold text-white text-center">Planejamento de Conteúdo</h3>
                  <p className="text-sm text-white/80">{formData.company || formData.name || "Nome do Cliente"}</p>
                  <p className="text-xs text-white/60 mt-1">Dezembro de 2024</p>
                </div>
              </div>
            </div>

            {/* Logo da Apresentação */}
            <div className="space-y-2">
              <Label>Logo da Apresentação</Label>
              <p className="text-xs text-muted-foreground">
                Uma logo grande (preferencialmente PNG transparente) que aparecerá na capa das apresentações.
              </p>
              <div className="flex items-center gap-4">
                {formData.presentation_logo && (
                  <div className="relative bg-muted rounded-lg p-2">
                    <img 
                      src={formData.presentation_logo} 
                      alt="Logo" 
                      className="h-16 object-contain"
                    />
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                        onClick={() => setFormData({ ...formData, presentation_logo: "" })}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => presentationLogoInputRef.current?.click()}
                  disabled={uploadingPresentationLogo || readOnly}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingPresentationLogo ? "Enviando..." : "Upload de Logo"}
                </Button>
                <Input
                  ref={presentationLogoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePresentationLogoUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Imagem de Fundo */}
            <div className="space-y-2">
              <Label>Imagem de Fundo</Label>
              <p className="text-xs text-muted-foreground">
                Uma imagem que será usada como fundo da capa da apresentação.
              </p>
              <div className="flex items-center gap-4">
                {formData.presentation_bg_image && (
                  <div className="relative">
                    <img 
                      src={formData.presentation_bg_image} 
                      alt="Background" 
                      className="h-20 w-32 object-cover rounded-lg"
                    />
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                        onClick={() => setFormData({ ...formData, presentation_bg_image: "" })}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => presentationBgInputRef.current?.click()}
                  disabled={uploadingPresentationBg || readOnly}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingPresentationBg ? "Enviando..." : "Upload de Imagem"}
                </Button>
                <Input
                  ref={presentationBgInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePresentationBgUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Cor do Overlay */}
            <div className="space-y-2">
              <Label htmlFor="overlay_color">Cor do Overlay</Label>
              <p className="text-xs text-muted-foreground">
                Cor que será sobreposta à imagem de fundo (ou cor de fundo se não houver imagem).
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="overlay_color"
                  value={formData.presentation_overlay_color}
                  onChange={(e) => setFormData({ ...formData, presentation_overlay_color: e.target.value })}
                  disabled={readOnly}
                  className="w-12 h-10 rounded cursor-pointer border"
                />
                <Input
                  value={formData.presentation_overlay_color}
                  onChange={(e) => setFormData({ ...formData, presentation_overlay_color: e.target.value })}
                  placeholder="#1a73e8"
                  className="w-32"
                  disabled={readOnly}
                />
              </div>
            </div>

            {/* Opacidade do Overlay */}
            <div className="space-y-2">
              <Label htmlFor="overlay_opacity">
                Opacidade do Overlay: {Math.round(formData.presentation_overlay_opacity * 100)}%
              </Label>
              <p className="text-xs text-muted-foreground">
                Quanto da cor do overlay será visível sobre a imagem de fundo.
              </p>
              <Slider
                value={[formData.presentation_overlay_opacity]}
                onValueChange={(value) => setFormData({ ...formData, presentation_overlay_opacity: value[0] })}
                min={0}
                max={1}
                step={0.05}
                disabled={readOnly}
                className="w-full max-w-xs"
              />
            </div>
          </div>
        );

      case 'identidade_ia':
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 border">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Imagens de Referência para IA</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Faça upload de até 3 imagens que servirão como inspiração para a IA gerar criativos 
                    seguindo o padrão visual da sua marca (cores, fontes, estilo).
                  </p>
                </div>
              </div>
            </div>

            {/* Grid de 3 imagens de referência */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Imagem 1 */}
              <div className="space-y-2">
                <Label>Referência 1</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center min-h-[180px] flex flex-col items-center justify-center bg-muted/30">
                  {formData.ai_reference_image_1 ? (
                    <div className="relative w-full">
                      <img 
                        src={formData.ai_reference_image_1} 
                        alt="Referência 1" 
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                          onClick={() => setFormData({ ...formData, ai_reference_image_1: "" })}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => aiRefImage1InputRef.current?.click()}
                        disabled={uploadingAiRefImage === 1 || readOnly}
                      >
                        {uploadingAiRefImage === 1 ? "Enviando..." : "Upload"}
                      </Button>
                    </>
                  )}
                  <Input
                    ref={aiRefImage1InputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleAiReferenceImageUpload(e, 1)}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Imagem 2 */}
              <div className="space-y-2">
                <Label>Referência 2</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center min-h-[180px] flex flex-col items-center justify-center bg-muted/30">
                  {formData.ai_reference_image_2 ? (
                    <div className="relative w-full">
                      <img 
                        src={formData.ai_reference_image_2} 
                        alt="Referência 2" 
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                          onClick={() => setFormData({ ...formData, ai_reference_image_2: "" })}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => aiRefImage2InputRef.current?.click()}
                        disabled={uploadingAiRefImage === 2 || readOnly}
                      >
                        {uploadingAiRefImage === 2 ? "Enviando..." : "Upload"}
                      </Button>
                    </>
                  )}
                  <Input
                    ref={aiRefImage2InputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleAiReferenceImageUpload(e, 2)}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Imagem 3 */}
              <div className="space-y-2">
                <Label>Referência 3</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center min-h-[180px] flex flex-col items-center justify-center bg-muted/30">
                  {formData.ai_reference_image_3 ? (
                    <div className="relative w-full">
                      <img 
                        src={formData.ai_reference_image_3} 
                        alt="Referência 3" 
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                          onClick={() => setFormData({ ...formData, ai_reference_image_3: "" })}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => aiRefImage3InputRef.current?.click()}
                        disabled={uploadingAiRefImage === 3 || readOnly}
                      >
                        {uploadingAiRefImage === 3 ? "Enviando..." : "Upload"}
                      </Button>
                    </>
                  )}
                  <Input
                    ref={aiRefImage3InputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleAiReferenceImageUpload(e, 3)}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Botão de importar do Meta/Instagram */}
            {client && (client.ad_account_id || client.instagram_account_id) && !readOnly && (
              <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white dark:bg-background shadow-sm">
                      <ImageIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Importar imagens existentes</p>
                      <p className="text-xs text-muted-foreground">
                        Selecione imagens dos seus anúncios{client.instagram_account_id ? ' ou posts do Instagram' : ''}.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReferenceDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Selecionar
                  </Button>
                </div>
              </div>
            )}

            {/* Dicas */}
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">💡 Dicas para melhores resultados:</p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>Use imagens com as cores e fontes características da marca</li>
                <li>Inclua exemplos de campanhas anteriores que tiveram bom resultado</li>
                <li>Prefira imagens em alta qualidade e com boa iluminação</li>
                <li>Evite imagens com muito texto sobreposto</li>
              </ul>
            </div>
          </div>
        );

      case 'contatos':
        return (
          <ClientContactsTab 
            clientId={client?.id}
            readOnly={readOnly}
          />
        );

      case 'briefing':
        return (
          <ClientBriefingTab 
            client={localClient} 
            formData={formData}
            onBriefingUpdate={handleBriefingUpdate}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] max-h-[85vh] p-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[85vh]">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
            <p className="text-muted-foreground">
              {client ? "Edite as informações do cliente e configure suas preferências de tráfego" : "Adicione um novo cliente e configure suas preferências de tráfego"}
            </p>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Menu */}
            <div className="w-56 border-r bg-muted/30 flex-shrink-0">
              <ScrollArea className="h-full">
                <nav className="p-3 space-y-1">
                  {filteredSections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setActiveSection(section.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {section.label}
                      </button>
                    );
                  })}
                </nav>
              </ScrollArea>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-6">
                  {renderSectionContent()}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {readOnly ? "Fechar" : "Cancelar"}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : client ? "Atualizar" : "Criar"}
              </Button>
            )}
          </DialogFooter>
        </form>

        {/* Reference Selection Dialog */}
        {client && activeCompany && (
          <ReferenceSelectionDialog
            open={referenceDialogOpen}
            onOpenChange={setReferenceDialogOpen}
            clientId={client.id}
            companyId={activeCompany.company_id}
            onSelect={(images) => {
              // Fill in the reference images
              const newFormData = { ...formData };
              if (images[0]) newFormData.ai_reference_image_1 = images[0];
              if (images[1]) newFormData.ai_reference_image_2 = images[1];
              if (images[2]) newFormData.ai_reference_image_3 = images[2];
              setFormData(newFormData);
              toast({
                title: "Imagens importadas",
                description: `${images.length} imagem(ns) de referência adicionada(s).`,
              });
            }}
            maxSelections={3}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
