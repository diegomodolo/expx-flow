import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@/hooks/useClients";
import { useSectors } from "@/hooks/useSectors";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Plus } from "lucide-react";

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (clientData: Omit<Client, "id" | "active_campaigns" | "avg_cpl">) => Promise<any>;
  client?: Client;
  title: string;
  readOnly?: boolean;
}

export function ClientDialog({ open, onOpenChange, onSubmit, client, title, readOnly = false }: ClientDialogProps) {
  const { sectors, createSector } = useSectors();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    sector: "",
    status: "green" as "green" | "yellow" | "red",
    avatar: "",
    last_access: new Date().toLocaleDateString('pt-BR'),
    monthly_budget: 0,
    target_audience: "",
    product_name: "",
    voice_tone: "",
    objectives: "",
    preferred_platforms: [] as string[],
    campaign_type: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showNewSectorInput, setShowNewSectorInput] = useState(false);
  const [newSectorName, setNewSectorName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const platforms = ["Google Ads", "Facebook Ads", "Instagram Ads", "LinkedIn Ads", "TikTok Ads", "Twitter Ads", "YouTube Ads"];
  const voiceTones = ["Profissional", "Casual", "Amigável", "Autoritativo", "Divertido", "Inspirador", "Educativo"];
  const campaignTypes = ["Awareness", "Conversão", "Lead Generation", "Retargeting", "Branding", "E-commerce"];

  // Update form data when client prop changes
  useEffect(() => {
    if (client) {
      const newFormData = {
        name: client.name || "",
        email: client.email || "",
        company: client.company || "",
        sector: client.sector || "",
        status: client.status || "green",
        avatar: client.avatar || "",
        last_access: client.last_access || new Date().toLocaleDateString('pt-BR'),
        monthly_budget: client.monthly_budget || 0,
        target_audience: client.target_audience || "",
        product_name: client.product_name || "",
        voice_tone: client.voice_tone || "",
        objectives: client.objectives || "",
        preferred_platforms: client.preferred_platforms || [],
        campaign_type: client.campaign_type || "",
        notes: client.notes || ""
      };
      setFormData(newFormData);
    } else {
      setFormData({
        name: "",
        email: "",
        company: "",
        sector: "",
        status: "green",
        avatar: "",
        last_access: new Date().toLocaleDateString('pt-BR'),
        monthly_budget: 0,
        target_audience: "",
        product_name: "",
        voice_tone: "",
        objectives: "",
        preferred_platforms: [],
        campaign_type: "",
        notes: ""
      });
    }
  }, [client, open, title]);

  
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit(formData);
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
        status: "green",
        avatar: "",
        last_access: new Date().toLocaleDateString('pt-BR'),
        monthly_budget: 0,
        target_audience: "",
        product_name: "",
        voice_tone: "",
        objectives: "",
        preferred_platforms: [],
        campaign_type: "",
        notes: ""
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          <p className="text-muted-foreground">
            {client ? "Edite as informações do cliente e configure suas preferências de tráfego" : "Adicione um novo cliente e configure suas preferências de tráfego"}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
                required
                disabled={readOnly}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="col-span-3"
                required
                disabled={readOnly}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="company" className="text-right">
                Empresa
              </Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="col-span-3"
                required
                disabled={readOnly}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sector" className="text-right">
                Setor
              </Label>
              <div className="col-span-3 space-y-2">
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select value={formData.status} onValueChange={(value: "green" | "yellow" | "red") => setFormData({ ...formData, status: value as "green" | "yellow" | "red" })} disabled={readOnly}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Excelente</SelectItem>
                  <SelectItem value="yellow">Atenção</SelectItem>
                  <SelectItem value="red">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Avatar Upload */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Foto</Label>
              <div className="col-span-3 space-y-2">
                {formData.avatar && (
                  <div className="relative w-20 h-20">
                    <img 
                      src={formData.avatar} 
                      alt="Avatar" 
                      className="w-20 h-20 rounded-full object-cover"
                    />
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
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || readOnly}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? "Enviando..." : "Upload"}
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

            {/* Monthly Budget */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="monthly_budget" className="text-right">
                Orçamento Mensal
              </Label>
              <Input
                id="monthly_budget"
                type="number"
                step="0.01"
                value={formData.monthly_budget}
                onChange={(e) => setFormData({ ...formData, monthly_budget: parseFloat(e.target.value) || 0 })}
                className="col-span-3"
                placeholder="0.00"
                disabled={readOnly}
              />
            </div>

            {/* Product Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product_name" className="text-right">
                Nome do Produto
              </Label>
              <Input
                id="product_name"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                className="col-span-3"
                placeholder="Ex: Aplicativo de delivery"
                disabled={readOnly}
              />
            </div>

            {/* Target Audience */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="target_audience" className="text-right">
                Público Alvo
              </Label>
              <Textarea
                id="target_audience"
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                className="col-span-3"
                placeholder="Ex: Mulheres de 25-45 anos, interessadas em tecnologia..."
                rows={3}
                disabled={readOnly}
              />
            </div>

            {/* Voice Tone */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="voice_tone" className="text-right">
                Tom de Voz
              </Label>
              <Select value={formData.voice_tone} onValueChange={(value) => setFormData({ ...formData, voice_tone: value })} disabled={readOnly}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione o tom de voz" />
                </SelectTrigger>
                <SelectContent>
                  {voiceTones.map((tone) => (
                    <SelectItem key={tone} value={tone}>{tone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campaign Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="campaign_type" className="text-right">
                Tipo de Campanha
              </Label>
              <Select value={formData.campaign_type} onValueChange={(value) => setFormData({ ...formData, campaign_type: value })} disabled={readOnly}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione o tipo de campanha" />
                </SelectTrigger>
                <SelectContent>
                  {campaignTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preferred Platforms */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right mt-2">
                Plataformas Preferidas
              </Label>
              <div className="col-span-3 space-y-2">
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

            {/* Objectives */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="objectives" className="text-right">
                Objetivos
              </Label>
              <Textarea
                id="objectives"
                value={formData.objectives}
                onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                className="col-span-3"
                placeholder="Ex: Aumentar conversões em 30%, reduzir CAC..."
                rows={3}
                disabled={readOnly}
              />
            </div>

            {/* Notes */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Observações
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="col-span-3"
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
      </DialogContent>
    </Dialog>
  );
}