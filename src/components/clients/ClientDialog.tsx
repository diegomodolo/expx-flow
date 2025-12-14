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
import { Upload, X, Plus, Check, ChevronsUpDown, Instagram, Facebook, User, DollarSign, Link, Pencil, Package, FileText } from "lucide-react";
import { ClientBriefingTab } from "./ClientBriefingTab";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (clientData: Omit<Client, "id" | "active_campaigns" | "avg_cpl" | "leads_generated">) => Promise<any>;
  client?: Client;
  title: string;
  readOnly?: boolean;
}

type SectionType = 'cadastro' | 'financeiro' | 'integracoes' | 'copywriting' | 'produto' | 'briefing';

const sections: { id: SectionType; label: string; icon: React.ElementType; editOnly?: boolean }[] = [
  { id: 'cadastro', label: 'Cadastro', icon: User },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'integracoes', label: 'Contas & Integrações', icon: Link },
  { id: 'copywriting', label: 'Copywriting', icon: Pencil },
  { id: 'produto', label: 'Produto & Público', icon: Package },
  { id: 'briefing', label: 'Briefing', icon: FileText, editOnly: true },
];

export function ClientDialog({ open, onOpenChange, onSubmit, client, title, readOnly = false }: ClientDialogProps) {
  const { sectors, createSector } = useSectors();
  const { adAccounts } = useFacebookIntegration();
  const { pages: facebookPages, instagramAccounts } = useFacebookPages();
  const { adAccounts: googleAdAccounts } = useGoogleAdsIntegration();
  const { clients } = useClients();
  const { teams } = useTeams();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<SectionType>('cadastro');
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
        payment_type: (client.payment_type || "prepaid") as 'prepaid' | 'postpaid'
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
      payment_type: "prepaid" as 'prepaid' | 'postpaid'
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

  const platforms = ["Google Ads", "Meta Ads", "Instagram Ads", "LinkedIn Ads", "TikTok Ads", "Twitter Ads", "YouTube Ads"];
  const voiceTones = ["Profissional", "Casual", "Amigável", "Autoritativo", "Divertido", "Inspirador", "Educativo"];
  const campaignTypes = ["Awareness", "Conversão", "Lead Generation", "Retargeting", "Branding", "E-commerce"];

  const availableAdAccounts = adAccounts.filter(account => {
    const isUsedByOtherClient = clients.some(c => 
      c.ad_account_id === account.id && c.id !== client?.id
    );
    return !isUsedByOtherClient;
  });

  useEffect(() => {
    if (client && open) {
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
        payment_type: client.payment_type || "prepaid"
      });
      setLocalClient(client);
      
      const rechargeDay = client.facebook_ad_accounts?.recharge_day;
      setRechargeDayValue(rechargeDay ? rechargeDay.toString() : "none");
    }
  }, [client?.id, open]);

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
              <div className="flex items-center gap-4">
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
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        );

      case 'financeiro':
        return (
          <div className="space-y-6">
            {/* Orçamento Mensal */}
            <div className="space-y-2">
              <Label htmlFor="monthly_budget">Orçamento Mensal</Label>
              <Input
                id="monthly_budget"
                type="number"
                step="0.01"
                value={formData.monthly_budget}
                onChange={(e) => setFormData({ ...formData, monthly_budget: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                disabled={readOnly}
              />
            </div>

            {/* Tipo de Pagamento */}
            <div className="space-y-2">
              <Label htmlFor="payment_type">Tipo de Pagamento</Label>
              <Select
                value={formData.payment_type}
                onValueChange={(value: 'prepaid' | 'postpaid') =>
                  setFormData({ ...formData, payment_type: value })
                }
                disabled={readOnly}
              >
                <SelectTrigger id="payment_type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prepaid">💰 Pré-pago (com saldo)</SelectItem>
                  <SelectItem value="postpaid">💳 Pós-pago (cartão)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Pré-pago: conta com saldo limitado. Pós-pago: cartão de crédito sem limite.
              </p>
            </div>

            {/* Dia de Recarga */}
            <div className="space-y-2">
              <Label htmlFor="recharge_day">Dia de Recarga do Saldo (Opcional)</Label>
              <Select
                value={rechargeDayValue}
                onValueChange={(value) => setRechargeDayValue(value)}
                disabled={readOnly}
              >
                <SelectTrigger id="recharge_day">
                  <SelectValue placeholder="Selecione o dia de recarga" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não configurado (usar final do mês)</SelectItem>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      Dia {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O dia do mês em que o cliente recarrega o saldo da conta de anúncios.
                Usado para calcular se o saldo atual é suficiente até o próximo dia de recarga.
              </p>
            </div>
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
      </DialogContent>
    </Dialog>
  );
}
