import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { Client, ClientStatus } from "@/hooks/useClients";
import { useSectors } from "@/hooks/useSectors";
import { useFacebookIntegration } from "@/hooks/useFacebookIntegration";
import { useClients } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Plus, Check, ChevronsUpDown } from "lucide-react";
import { ClientBriefingTab } from "./ClientBriefingTab";

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (clientData: Omit<Client, "id" | "active_campaigns" | "avg_cpl" | "leads_generated">) => Promise<any>;
  client?: Client;
  title: string;
  readOnly?: boolean;
}

export function ClientDialog({ open, onOpenChange, onSubmit, client, title, readOnly = false }: ClientDialogProps) {
  const { sectors, createSector } = useSectors();
  const { adAccounts } = useFacebookIntegration();
  const { clients } = useClients();
  const { toast } = useToast();
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
        website_url: client.website_url || "",
        inactive_reason: client.inactive_reason || ""
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
      website_url: "",
      inactive_reason: ""
    };
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [adAccountOpen, setAdAccountOpen] = useState(false);
  const [showNewSectorInput, setShowNewSectorInput] = useState(false);
  const [newSectorName, setNewSectorName] = useState("");
  const [localClient, setLocalClient] = useState<Client | undefined>(client);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const platforms = ["Google Ads", "Facebook Ads", "Instagram Ads", "LinkedIn Ads", "TikTok Ads", "Twitter Ads", "YouTube Ads"];
  const voiceTones = ["Profissional", "Casual", "Amigável", "Autoritativo", "Divertido", "Inspirador", "Educativo"];
  const campaignTypes = ["Awareness", "Conversão", "Lead Generation", "Retargeting", "Branding", "E-commerce"];

  // Filtrar contas de anúncios disponíveis (não vinculadas a outros clientes ou vinculadas ao cliente atual)
  const availableAdAccounts = adAccounts.filter(account => {
    const isUsedByOtherClient = clients.some(c => 
      c.ad_account_id === account.id && c.id !== client?.id
    );
    return !isUsedByOtherClient;
  });

  // Simplificado: apenas sincroniza quando o client muda
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
        website_url: client.website_url || "",
        inactive_reason: client.inactive_reason || ""
      });
      setLocalClient(client);
    }
  }, [client?.id, open]);

  
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
      // Combinar formData com dados do localClient (incluindo briefing)
      const submitData = {
        ...formData,
        ai_briefing: localClient?.ai_briefing,
        briefing_generated_at: localClient?.briefing_generated_at,
      };
      
      await onSubmit(submitData);
      toast({
        title: "Sucesso",
        description: client ? "Cliente atualizado com sucesso!" : "Cliente criado com sucesso!",
      });
      onOpenChange(false);
      setFormData({
        name: "",
        email: "",
        company: "",
        sector: "",
        status: "excelente",
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
        website_url: "",
        inactive_reason: ""
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar cliente. Tente novamente.",
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
    // Atualizar formData para incluir dados do briefing
    setFormData(prev => ({
      ...prev,
      ai_briefing: updatedClient.ai_briefing,
      briefing_generated_at: updatedClient.briefing_generated_at,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          <p className="text-muted-foreground">
            {client ? "Edite as informações do cliente e configure suas preferências de tráfego" : "Adicione um novo cliente e configure suas preferências de tráfego"}
          </p>
        </DialogHeader>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Informações Gerais</TabsTrigger>
            <TabsTrigger value="briefing" disabled={!client}>Briefing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            <form onSubmit={handleSubmit}>
              <div className="space-y-6 py-4">
            {/* Row 1: Basic Info - 2 columns */}
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
            
            {/* Row 2: Company Info and Website - 2 columns */}
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

            {/* Row 3: Sector - Full width */}
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

            {/* Row 4: Status, Budget, Product - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

                {/* Motivo de Inatividade - aparece apenas quando status é "inativo" */}
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
            </div>

            {/* Row 5: Voice Tone, Campaign Type, Ad Account - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="ad_account_id">Conta de Anúncios</Label>
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
                        ? availableAdAccounts.find((account) => account.id === formData.ad_account_id)?.account_name + 
                          ` (${availableAdAccounts.find((account) => account.id === formData.ad_account_id)?.currency})`
                        : "Selecione a conta de anúncios..."
                      }
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Pesquisar conta de anúncios..." />
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
                              value={`${account.account_name} ${account.currency} ${account.id}`}
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
            </div>

            {/* Row 6: Avatar Upload - Full width */}
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

            {/* Row 7: Target Audience - Full width */}
            <div className="space-y-2">
              <Label htmlFor="target_audience">Público Alvo</Label>
              <Textarea
                id="target_audience"
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                placeholder="Ex: Mulheres de 25-45 anos, interessadas em tecnologia..."
                rows={3}
                disabled={readOnly}
              />
            </div>

            {/* Row 8: Preferred Platforms - Full width */}
            <div className="space-y-2">
              <Label>Plataformas Preferidas</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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

            {/* Row 9: Objectives - Full width */}
            <div className="space-y-2">
              <Label htmlFor="objectives">Objetivos</Label>
              <Textarea
                id="objectives"
                value={formData.objectives}
                onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                placeholder="Ex: Aumentar conversões em 30%, reduzir CAC..."
                rows={3}
                disabled={readOnly}
              />
            </div>

            {/* Row 10: Notes - Full width */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informações adicionais sobre o cliente..."
                rows={3}
                disabled={readOnly}
              />
            </div>
          </div>
          <DialogFooter>
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
      </TabsContent>

      <TabsContent value="briefing">
        <ClientBriefingTab 
          client={localClient} 
          formData={formData}
          onBriefingUpdate={handleBriefingUpdate}
        />
      </TabsContent>
    </Tabs>
  </DialogContent>
</Dialog>
  );
}