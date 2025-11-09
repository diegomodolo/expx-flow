import { useState, useEffect } from "react";
import { CRMLead, CRMStage, useCRMLeads } from "@/hooks/useCRMLeads";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, Calendar, Mail, Phone, Building2, Globe, 
  Facebook as FacebookIcon, Instagram as InstagramIcon, MapPin,
  TrendingUp, Target, Hash, Save, X
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CRMTagManager } from "./CRMTagManager";
import { CRMAttachmentUploader } from "./CRMAttachmentUploader";

interface CRMLeadEditModalProps {
  lead: CRMLead | null;
  stages: CRMStage[];
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  boardId: string;
}

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const temperatureConfig = {
  cold: { label: 'Frio', color: '#3b82f6', icon: '❄️' },
  warm: { label: 'Morno', color: '#f59e0b', icon: '☀️' },
  hot: { label: 'Quente', color: '#ef4444', icon: '🔥' },
};

const statusConfig = {
  open: { label: 'Aberto', variant: 'default' as const },
  qualified: { label: 'Qualificado', variant: 'default' as const },
  unqualified: { label: 'Desqualificado', variant: 'secondary' as const },
  won: { label: 'Ganho', variant: 'default' as const },
  lost: { label: 'Perdido', variant: 'destructive' as const },
};

export function CRMLeadEditModal({ lead, stages, isOpen, onClose, workspaceId, boardId }: CRMLeadEditModalProps) {
  const { updateLead, isUpdatingLead } = useCRMLeads(workspaceId, boardId);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    company_name: '',
    facebook: '',
    instagram: '',
    website: '',
    city: '',
    state: '',
    utm_source: '',
    utm_media: '',
    utm_campaign: '',
    temperature: '' as 'cold' | 'warm' | 'hot' | '',
    start_date: '',
    expected_close_date: '',
    quantity: '1',
    value: '',
    notes: '',
    status: 'open' as CRMLead['status'],
    stage_id: '',
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        full_name: lead.full_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        company_name: lead.company_name || '',
        facebook: lead.facebook || '',
        instagram: lead.instagram || '',
        website: lead.website || '',
        city: lead.city || '',
        state: lead.state || '',
        utm_source: lead.utm_source || '',
        utm_media: lead.utm_media || '',
        utm_campaign: lead.utm_campaign || '',
        temperature: lead.temperature || '' as 'cold' | 'warm' | 'hot' | '',
        start_date: lead.start_date ? lead.start_date.substring(0, 16) : '',
        expected_close_date: lead.expected_close_date ? lead.expected_close_date.substring(0, 16) : '',
        quantity: String(lead.quantity || 1),
        value: lead.value ? String(lead.value) : '',
        notes: lead.notes || '',
        status: lead.status,
        stage_id: lead.stage_id,
      });
      setIsEditing(false);
    }
  }, [lead]);

  if (!lead) return null;

  const currentStage = stages.find(s => s.id === lead.stage_id);

  const handleSave = async () => {
    if (!formData.full_name.trim()) {
      alert("Nome é obrigatório");
      return;
    }

    if (!formData.email && !formData.phone) {
      alert("Email ou telefone é obrigatório");
      return;
    }

    await updateLead({
      leadId: lead.id,
      updates: {
        full_name: formData.full_name.trim(),
        email: formData.email || null,
        phone: formData.phone || null,
        company_name: formData.company_name || null,
        facebook: formData.facebook || null,
        instagram: formData.instagram || null,
        website: formData.website || null,
        city: formData.city || null,
        state: formData.state || null,
        utm_source: formData.utm_source || null,
        utm_media: formData.utm_media || null,
        utm_campaign: formData.utm_campaign || null,
        temperature: formData.temperature || null as 'cold' | 'warm' | 'hot' | null,
        start_date: formData.start_date || null,
        expected_close_date: formData.expected_close_date || null,
        quantity: parseInt(formData.quantity) || 1,
        value: formData.value ? parseFloat(formData.value) : null,
        notes: formData.notes || null,
        status: formData.status,
        stage_id: formData.stage_id,
      },
    });
    
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset to original values
    setFormData({
      full_name: lead.full_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company_name: lead.company_name || '',
      facebook: lead.facebook || '',
      instagram: lead.instagram || '',
      website: lead.website || '',
      city: lead.city || '',
      state: lead.state || '',
      utm_source: lead.utm_source || '',
      utm_media: lead.utm_media || '',
      utm_campaign: lead.utm_campaign || '',
      temperature: lead.temperature || '' as 'cold' | 'warm' | 'hot' | '',
      start_date: lead.start_date ? lead.start_date.substring(0, 16) : '',
      expected_close_date: lead.expected_close_date ? lead.expected_close_date.substring(0, 16) : '',
      quantity: String(lead.quantity || 1),
      value: lead.value ? String(lead.value) : '',
      notes: lead.notes || '',
      status: lead.status,
      stage_id: lead.stage_id,
    });
    setIsEditing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="text-2xl font-bold h-auto py-1 px-2"
                />
              ) : (
                <DialogTitle className="text-2xl">{lead.full_name}</DialogTitle>
              )}
              <div className="flex items-center gap-2 mt-2">
                {lead.external_id && (
                  <Badge variant="outline" className="text-xs">
                    <Hash className="w-3 h-3 mr-1" />
                    {lead.external_id}
                  </Badge>
                )}
                {isEditing ? (
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as CRMLead['status'] })}>
                    <SelectTrigger className="w-40 h-7">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={statusConfig[lead.status].variant}>
                    {statusConfig[lead.status].label}
                  </Badge>
                )}
              </div>
            </div>
            
            {!isEditing && (
              <Button size="sm" onClick={() => setIsEditing(true)}>
                Editar
              </Button>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="contact">Contato</TabsTrigger>
            <TabsTrigger value="tracking">Rastreamento</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
            <TabsTrigger value="attachments">Anexos</TabsTrigger>
            <TabsTrigger value="notes">Observações</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  Estágio Atual
                </Label>
                {isEditing ? (
                  <Select value={formData.stage_id} onValueChange={(value) => setFormData({ ...formData, stage_id: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge style={{ backgroundColor: currentStage?.color, color: '#fff' }}>
                    {currentStage?.name}
                  </Badge>
                )}
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4" />
                  Temperatura
                </Label>
                {isEditing ? (
                  <Select value={formData.temperature} onValueChange={(value: 'cold' | 'warm' | 'hot') => setFormData({ ...formData, temperature: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(temperatureConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.icon} {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : lead.temperature ? (
                  <Badge style={{ backgroundColor: temperatureConfig[lead.temperature].color, color: '#fff' }}>
                    {temperatureConfig[lead.temperature].icon} {temperatureConfig[lead.temperature].label}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Não definida</span>
                )}
              </div>

              <div>
                <Label htmlFor="start_date">Data de Início</Label>
                {isEditing ? (
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                ) : lead.start_date ? (
                  <p className="text-sm mt-1">{format(new Date(lead.start_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>

              <div>
                <Label htmlFor="expected_close_date">Previsão de Fechamento</Label>
                {isEditing ? (
                  <Input
                    id="expected_close_date"
                    type="datetime-local"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                  />
                ) : lead.expected_close_date ? (
                  <p className="text-sm mt-1">{format(new Date(lead.expected_close_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>

              <div>
                <Label htmlFor="quantity">Quantidade</Label>
                {isEditing ? (
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                ) : (
                  <p className="text-sm mt-1">{lead.quantity || 1}</p>
                )}
              </div>

              <div>
                <Label htmlFor="value">Valor (R$)</Label>
                {isEditing ? (
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  />
                ) : lead.value ? (
                  <p className="text-sm mt-1 text-green-600 font-medium">
                    R$ {lead.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </div>

            <div className="pt-4 border-t grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Criado: {format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Atualizado: {format(new Date(lead.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                ) : (
                  <p className="text-sm">{lead.email || '—'}</p>
                )}
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4" />
                  Telefone
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                ) : (
                  <p className="text-sm">{lead.phone || '—'}</p>
                )}
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4" />
                  Empresa
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  />
                ) : (
                  <p className="text-sm">{lead.company_name || '—'}</p>
                )}
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <FacebookIcon className="w-4 h-4" />
                  Facebook
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                  />
                ) : lead.facebook ? (
                  <a href={lead.facebook.startsWith('http') ? lead.facebook : `https://facebook.com/${lead.facebook}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    {lead.facebook}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <InstagramIcon className="w-4 h-4" />
                  Instagram
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  />
                ) : lead.instagram ? (
                  <a href={lead.instagram.startsWith('http') ? lead.instagram : `https://instagram.com/${lead.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    {lead.instagram}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4" />
                  Website
                </Label>
                {isEditing ? (
                  <Input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                ) : lead.website ? (
                  <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    {lead.website}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4" />
                  Cidade
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                ) : (
                  <p className="text-sm">{lead.city || '—'}</p>
                )}
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4" />
                  Estado
                </Label>
                {isEditing ? (
                  <Select value={formData.state} onValueChange={(value) => setFormData({ ...formData, state: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {brazilianStates.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">{lead.state || '—'}</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="utm_source">UTM Source</Label>
                {isEditing ? (
                  <Input
                    id="utm_source"
                    value={formData.utm_source}
                    onChange={(e) => setFormData({ ...formData, utm_source: e.target.value })}
                  />
                ) : (
                  <p className="text-sm mt-1">{lead.utm_source || '—'}</p>
                )}
              </div>

              <div>
                <Label htmlFor="utm_media">UTM Media</Label>
                {isEditing ? (
                  <Input
                    id="utm_media"
                    value={formData.utm_media}
                    onChange={(e) => setFormData({ ...formData, utm_media: e.target.value })}
                  />
                ) : (
                  <p className="text-sm mt-1">{lead.utm_media || '—'}</p>
                )}
              </div>

              <div className="col-span-2">
                <Label htmlFor="utm_campaign">UTM Campaign</Label>
                {isEditing ? (
                  <Input
                    id="utm_campaign"
                    value={formData.utm_campaign}
                    onChange={(e) => setFormData({ ...formData, utm_campaign: e.target.value })}
                  />
                ) : (
                  <p className="text-sm mt-1">{lead.utm_campaign || '—'}</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tags" className="mt-4">
            <CRMTagManager workspaceId={workspaceId} leadId={lead.id} />
          </TabsContent>

          <TabsContent value="attachments" className="mt-4">
            <CRMAttachmentUploader leadId={lead.id} />
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="notes">Observações</Label>
              {isEditing ? (
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={10}
                  className="mt-2"
                />
              ) : (
                <div className="mt-2 p-4 bg-muted rounded-md min-h-[100px]">
                  {lead.notes ? (
                    <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma observação</p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {isEditing && (
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isUpdatingLead}>
              {isUpdatingLead ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
