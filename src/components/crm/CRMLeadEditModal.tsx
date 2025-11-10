import { useState, useEffect } from "react";
import { CRMLead, CRMStage, useCRMLeads } from "@/hooks/useCRMLeads";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Loader2, Mail, Phone, Building2, Globe, 
  Facebook as FacebookIcon, Instagram as InstagramIcon, MapPin,
  TrendingUp, Target, Hash, Save, X, Link as LinkIcon, 
  ExternalLink, Archive, Paperclip, AtSign, Send, Edit,
  Calendar, FileText, DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CRMTagManager } from "./CRMTagManager";
import { CRMAttachmentUploader } from "./CRMAttachmentUploader";
import { CRMLeadActivityTimeline } from "./CRMLeadActivityTimeline";
import { useCRMLeadLinks } from "@/hooks/useCRMLeadLinks";
import { useCRMBoards } from "@/hooks/useCRMBoards";
import { useCRMLeadActivities } from "@/hooks/useCRMLeadActivities";
import { cn } from "@/lib/utils";

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
  warm: { label: 'Morno', color: '#f59e0b', icon: '🌡️' },
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
  const { updateLead, isUpdatingLead, removeFromBoard, isRemovingFromBoard } = useCRMLeads(workspaceId, boardId);
  const { data: linkedLeads = [] } = useCRMLeadLinks(lead?.id || '');
  const { boards } = useCRMBoards({ workspaceId });
  const { addManualActivity, isAddingActivity } = useCRMLeadActivities(lead?.id || '');
  const [activeTab, setActiveTab] = useState<'activity' | 'notes' | 'details' | 'tracking'>('activity');
  const [isEditingField, setIsEditingField] = useState<string | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [quickNote, setQuickNote] = useState('');
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
      setIsEditingField(null);
      setQuickNote('');
    }
  }, [lead, isOpen]);

  if (!lead) return null;

  const currentStage = stages.find(s => s.id === lead.stage_id);
  const currentBoard = boards.find(b => b.id === boardId);

  const handleFieldUpdate = async (field: keyof typeof formData, value: any) => {
    const updates = { [field]: value };
    await updateLead({
      leadId: lead.id,
      originalLead: lead,
      updates: updates as Partial<CRMLead>,
    });
    setIsEditingField(null);
  };

  const handleQuickNoteSubmit = async () => {
    if (!quickNote.trim() || !lead) return;
    
    try {
      await addManualActivity({ leadId: lead.id, notes: quickNote });
      setQuickNote('');
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuickNoteSubmit();
    }
  };

  const handleRemoveFromBoard = async () => {
    await removeFromBoard(lead.id);
    setShowRemoveDialog(false);
    onClose();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col">
          {/* Header/Toolbar */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-border shrink-0">
            <h2 className="text-lg font-bold text-foreground">Detalhes do Lead</h2>
            <div className="flex gap-2">
              {!lead.is_archived && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowRemoveDialog(true)}
                >
                  <Archive className="w-4 h-4" />
                </Button>
              )}
              <Button 
                size="sm"
                variant="ghost"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Profile Header */}
              <div className="px-6 py-6 border-b border-border shrink-0">
                <div className="flex items-center gap-5">
                  <Avatar className="h-24 w-24 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {getInitials(lead.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {isEditingField === 'full_name' ? (
                        <Input
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          onBlur={() => handleFieldUpdate('full_name', formData.full_name)}
                          onKeyDown={(e) => e.key === 'Enter' && handleFieldUpdate('full_name', formData.full_name)}
                          className="text-2xl font-bold h-auto py-1"
                          autoFocus
                        />
                      ) : (
                        <h2 className="text-2xl font-bold text-foreground">{lead.full_name}</h2>
                      )}
                      {!isEditingField && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditingField('full_name')}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-base text-muted-foreground">
                      {lead.value ? `R$ ${lead.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Sem valor definido'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="px-6 shrink-0">
                <div className="flex border-b border-border gap-8">
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={cn(
                      "flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 transition-colors",
                      activeTab === 'activity'
                        ? "border-b-primary text-foreground font-bold"
                        : "border-b-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <p className="text-sm leading-normal tracking-[0.015em]">Atividade</p>
                  </button>
                  <button
                    onClick={() => setActiveTab('notes')}
                    className={cn(
                      "flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 transition-colors",
                      activeTab === 'notes'
                        ? "border-b-primary text-foreground font-bold"
                        : "border-b-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <p className="text-sm leading-normal tracking-[0.015em]">Notas</p>
                  </button>
                  <button
                    onClick={() => setActiveTab('details')}
                    className={cn(
                      "flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 transition-colors",
                      activeTab === 'details'
                        ? "border-b-primary text-foreground font-bold"
                        : "border-b-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <p className="text-sm leading-normal tracking-[0.015em]">Detalhes</p>
                  </button>
                  <button
                    onClick={() => setActiveTab('tracking')}
                    className={cn(
                      "flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 transition-colors",
                      activeTab === 'tracking'
                        ? "border-b-primary text-foreground font-bold"
                        : "border-b-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <p className="text-sm leading-normal tracking-[0.015em]">Rastreamento</p>
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {activeTab === 'activity' && (
                  <div className="space-y-6">
                    {/* Quick Note Composer */}
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0 mt-2">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          EU
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Textarea
                          value={quickNote}
                          onChange={(e) => setQuickNote(e.target.value)}
                          onKeyDown={handleKeyPress}
                          placeholder="Adicionar uma nota rápida... (Enter para enviar, Shift+Enter para quebra de linha)"
                          rows={3}
                          className="resize-none"
                        />
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                            >
                              <Paperclip className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                            >
                              <AtSign className="w-4 h-4" />
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            onClick={handleQuickNoteSubmit}
                            disabled={!quickNote.trim() || isAddingActivity}
                          >
                            {isAddingActivity ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Publicar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Activity Timeline */}
                    <div className="pt-4">
                      <CRMLeadActivityTimeline leadId={lead.id} leadName={lead.full_name} />
                    </div>
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="notes" className="mb-2 block">Observações Completas</Label>
                      {isEditingField === 'notes' ? (
                        <div className="space-y-2">
                          <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={15}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleFieldUpdate('notes', formData.notes)}
                              disabled={isUpdatingLead}
                            >
                              {isUpdatingLead ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4 mr-2" />
                              )}
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setFormData({ ...formData, notes: lead.notes || '' });
                                setIsEditingField(null);
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => setIsEditingField('notes')}
                          className="min-h-[300px] p-4 bg-muted rounded-md cursor-pointer hover:bg-muted/80 transition-colors"
                        >
                          {lead.notes ? (
                            <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground">Clique para adicionar observações detalhadas...</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Tags Section */}
                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-semibold mb-3">Tags</h3>
                      <CRMTagManager workspaceId={workspaceId} leadId={lead.id} />
                    </div>

                    {/* Attachments Section */}
                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-semibold mb-3">Anexos</h3>
                      <CRMAttachmentUploader leadId={lead.id} />
                    </div>
                  </div>
                )}

                {activeTab === 'details' && (
                  <div className="space-y-6">
                    {/* Sales Details */}
                    <div>
                      <h3 className="text-sm font-semibold mb-4">Informações de Venda</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Quantidade</Label>
                          {isEditingField === 'quantity' ? (
                            <Input
                              type="number"
                              value={formData.quantity}
                              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                              onBlur={() => handleFieldUpdate('quantity', parseInt(formData.quantity) || 1)}
                              autoFocus
                              min="1"
                            />
                          ) : (
                            <p 
                              onClick={() => setIsEditingField('quantity')}
                              className="text-base mt-1 cursor-pointer hover:text-primary"
                            >
                              {lead.quantity || 1}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Valor (R$)</Label>
                          {isEditingField === 'value' ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.value}
                              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                              onBlur={() => handleFieldUpdate('value', parseFloat(formData.value) || null)}
                              autoFocus
                            />
                          ) : (
                            <p 
                              onClick={() => setIsEditingField('value')}
                              className="text-base mt-1 cursor-pointer hover:text-primary text-green-600 font-medium"
                            >
                              {lead.value ? `R$ ${lead.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Clique para definir'}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Data de Início</Label>
                          {isEditingField === 'start_date' ? (
                            <Input
                              type="datetime-local"
                              value={formData.start_date}
                              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                              onBlur={() => handleFieldUpdate('start_date', formData.start_date || null)}
                              autoFocus
                            />
                          ) : (
                            <p 
                              onClick={() => setIsEditingField('start_date')}
                              className="text-base mt-1 cursor-pointer hover:text-primary"
                            >
                              {lead.start_date ? format(new Date(lead.start_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Clique para definir'}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Previsão de Fechamento</Label>
                          {isEditingField === 'expected_close_date' ? (
                            <Input
                              type="datetime-local"
                              value={formData.expected_close_date}
                              onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                              onBlur={() => handleFieldUpdate('expected_close_date', formData.expected_close_date || null)}
                              autoFocus
                            />
                          ) : (
                            <p 
                              onClick={() => setIsEditingField('expected_close_date')}
                              className="text-base mt-1 cursor-pointer hover:text-primary"
                            >
                              {lead.expected_close_date ? format(new Date(lead.expected_close_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Clique para definir'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Social Media */}
                    <div className="pt-6 border-t">
                      <h3 className="text-sm font-semibold mb-4">Redes Sociais</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <FacebookIcon className="w-4 h-4" />
                            Facebook
                          </Label>
                          {isEditingField === 'facebook' ? (
                            <Input
                              value={formData.facebook}
                              onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                              onBlur={() => handleFieldUpdate('facebook', formData.facebook || null)}
                              autoFocus
                            />
                          ) : lead.facebook ? (
                            <a 
                              href={lead.facebook.startsWith('http') ? lead.facebook : `https://facebook.com/${lead.facebook}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-base mt-1 text-primary hover:underline block"
                            >
                              {lead.facebook}
                            </a>
                          ) : (
                            <p 
                              onClick={() => setIsEditingField('facebook')}
                              className="text-base mt-1 text-muted-foreground cursor-pointer hover:text-primary"
                            >
                              Clique para adicionar
                            </p>
                          )}
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <InstagramIcon className="w-4 h-4" />
                            Instagram
                          </Label>
                          {isEditingField === 'instagram' ? (
                            <Input
                              value={formData.instagram}
                              onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                              onBlur={() => handleFieldUpdate('instagram', formData.instagram || null)}
                              autoFocus
                            />
                          ) : lead.instagram ? (
                            <a 
                              href={lead.instagram.startsWith('http') ? lead.instagram : `https://instagram.com/${lead.instagram.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-base mt-1 text-primary hover:underline block"
                            >
                              {lead.instagram}
                            </a>
                          ) : (
                            <p 
                              onClick={() => setIsEditingField('instagram')}
                              className="text-base mt-1 text-muted-foreground cursor-pointer hover:text-primary"
                            >
                              Clique para adicionar
                            </p>
                          )}
                        </div>

                        <div className="col-span-2">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Website
                          </Label>
                          {isEditingField === 'website' ? (
                            <Input
                              type="url"
                              value={formData.website}
                              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                              onBlur={() => handleFieldUpdate('website', formData.website || null)}
                              autoFocus
                            />
                          ) : lead.website ? (
                            <a 
                              href={lead.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-base mt-1 text-primary hover:underline block"
                            >
                              {lead.website}
                            </a>
                          ) : (
                            <p 
                              onClick={() => setIsEditingField('website')}
                              className="text-base mt-1 text-muted-foreground cursor-pointer hover:text-primary"
                            >
                              Clique para adicionar
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="pt-6 border-t">
                      <h3 className="text-sm font-semibold mb-4">Localização</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Cidade</Label>
                          {isEditingField === 'city' ? (
                            <Input
                              value={formData.city}
                              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                              onBlur={() => handleFieldUpdate('city', formData.city || null)}
                              autoFocus
                            />
                          ) : (
                            <p 
                              onClick={() => setIsEditingField('city')}
                              className="text-base mt-1 cursor-pointer hover:text-primary"
                            >
                              {lead.city || 'Clique para adicionar'}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Estado</Label>
                          {isEditingField === 'state' ? (
                            <Select 
                              value={formData.state} 
                              onValueChange={(value) => {
                                setFormData({ ...formData, state: value });
                                handleFieldUpdate('state', value);
                              }}
                            >
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
                            <p 
                              onClick={() => setIsEditingField('state')}
                              className="text-base mt-1 cursor-pointer hover:text-primary"
                            >
                              {lead.state || 'Clique para selecionar'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Linked Leads */}
                    {linkedLeads.length > 0 && (
                      <div className="pt-6 border-t">
                        <h3 className="text-sm font-semibold mb-4">Leads Vinculados ({linkedLeads.length})</h3>
                        <div className="space-y-3">
                          {linkedLeads.map((linkedLead) => (
                            <div 
                              key={linkedLead.id} 
                              className="p-4 border rounded-lg hover:bg-accent transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-base">{linkedLead.board_name}</p>
                                  <p className="text-sm text-muted-foreground">{linkedLead.stage_name}</p>
                                </div>
                                <Badge variant="outline" className="ml-2">
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  Vinculado
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'tracking' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold mb-4">Parâmetros UTM</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">UTM Source</Label>
                        {isEditingField === 'utm_source' ? (
                          <Input
                            value={formData.utm_source}
                            onChange={(e) => setFormData({ ...formData, utm_source: e.target.value })}
                            onBlur={() => handleFieldUpdate('utm_source', formData.utm_source || null)}
                            autoFocus
                          />
                        ) : (
                          <p 
                            onClick={() => setIsEditingField('utm_source')}
                            className="text-base mt-1 cursor-pointer hover:text-primary"
                          >
                            {lead.utm_source || 'Clique para adicionar'}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">UTM Media</Label>
                        {isEditingField === 'utm_media' ? (
                          <Input
                            value={formData.utm_media}
                            onChange={(e) => setFormData({ ...formData, utm_media: e.target.value })}
                            onBlur={() => handleFieldUpdate('utm_media', formData.utm_media || null)}
                            autoFocus
                          />
                        ) : (
                          <p 
                            onClick={() => setIsEditingField('utm_media')}
                            className="text-base mt-1 cursor-pointer hover:text-primary"
                          >
                            {lead.utm_media || 'Clique para adicionar'}
                          </p>
                        )}
                      </div>

                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">UTM Campaign</Label>
                        {isEditingField === 'utm_campaign' ? (
                          <Input
                            value={formData.utm_campaign}
                            onChange={(e) => setFormData({ ...formData, utm_campaign: e.target.value })}
                            onBlur={() => handleFieldUpdate('utm_campaign', formData.utm_campaign || null)}
                            autoFocus
                          />
                        ) : (
                          <p 
                            onClick={() => setIsEditingField('utm_campaign')}
                            className="text-base mt-1 cursor-pointer hover:text-primary"
                          >
                            {lead.utm_campaign || 'Clique para adicionar'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-80 border-l border-border bg-muted/30 p-6 space-y-8 overflow-y-auto shrink-0">
              {/* Contact Details */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Detalhes de Contato</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    {isEditingField === 'email' ? (
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        onBlur={() => handleFieldUpdate('email', formData.email || null)}
                        className="h-8"
                        autoFocus
                      />
                    ) : (
                      <span 
                        onClick={() => setIsEditingField('email')}
                        className="text-base cursor-pointer hover:text-primary"
                      >
                        {lead.email || 'Clique para adicionar'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                    {isEditingField === 'phone' ? (
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        onBlur={() => handleFieldUpdate('phone', formData.phone || null)}
                        className="h-8"
                        autoFocus
                      />
                    ) : (
                      <span 
                        onClick={() => setIsEditingField('phone')}
                        className="text-base cursor-pointer hover:text-primary"
                      >
                        {lead.phone || 'Clique para adicionar'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Company Info */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Informações da Empresa</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    {isEditingField === 'company_name' ? (
                      <Input
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        onBlur={() => handleFieldUpdate('company_name', formData.company_name || null)}
                        className="h-8"
                        autoFocus
                      />
                    ) : (
                      <span 
                        onClick={() => setIsEditingField('company_name')}
                        className="text-base cursor-pointer hover:text-primary"
                      >
                        {lead.company_name || 'Clique para adicionar'}
                      </span>
                    )}
                  </div>
                  {(lead.city || lead.state) && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-base">
                        {[lead.city, lead.state].filter(Boolean).join(' - ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Temperature */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Temperatura</h3>
                {isEditingField === 'temperature' ? (
                  <Select 
                    value={formData.temperature || ''} 
                    onValueChange={(value: 'cold' | 'warm' | 'hot') => {
                      setFormData({ ...formData, temperature: value });
                      handleFieldUpdate('temperature', value);
                    }}
                  >
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
                  <Badge 
                    onClick={() => setIsEditingField('temperature')}
                    style={{ backgroundColor: temperatureConfig[lead.temperature].color, color: '#fff' }}
                    className="cursor-pointer"
                  >
                    {temperatureConfig[lead.temperature].icon} {temperatureConfig[lead.temperature].label}
                  </Badge>
                ) : (
                  <p 
                    onClick={() => setIsEditingField('temperature')}
                    className="text-sm text-muted-foreground cursor-pointer hover:text-primary"
                  >
                    Clique para definir
                  </p>
                )}
              </div>

              {/* Current Stage */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Etapa do Funil</h3>
                {isEditingField === 'stage_id' ? (
                  <Select 
                    value={formData.stage_id} 
                    onValueChange={(value) => {
                      setFormData({ ...formData, stage_id: value });
                      handleFieldUpdate('stage_id', value);
                    }}
                  >
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
                  <Badge 
                    onClick={() => setIsEditingField('stage_id')}
                    className="cursor-pointer"
                    style={{ backgroundColor: `${currentStage?.color}40`, color: currentStage?.color }}
                  >
                    {currentStage?.name}
                  </Badge>
                )}
              </div>

              {/* Status */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Status</h3>
                {isEditingField === 'status' ? (
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => {
                      setFormData({ ...formData, status: value as CRMLead['status'] });
                      handleFieldUpdate('status', value);
                    }}
                  >
                    <SelectTrigger>
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
                  <Badge 
                    onClick={() => setIsEditingField('status')}
                    variant={statusConfig[lead.status].variant}
                    className="cursor-pointer"
                  >
                    {statusConfig[lead.status].label}
                  </Badge>
                )}
              </div>

              {/* Metadata */}
              <div className="pt-6 border-t">
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>Criado: {format(new Date(lead.created_at), "dd/MM/yy 'às' HH:mm")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>Atualizado: {format(new Date(lead.updated_at), "dd/MM/yy 'às' HH:mm")}</span>
                  </div>
                  {lead.external_id && (
                    <div className="flex items-center gap-2">
                      <Hash className="w-3 h-3" />
                      <span className="font-mono">{lead.external_id}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover lead do quadro?</AlertDialogTitle>
            <AlertDialogDescription>
              O lead será removido do quadro mas continuará na lista de leads. 
              Você pode restaurá-lo depois se necessário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveFromBoard}
              disabled={isRemovingFromBoard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemovingFromBoard ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Archive className="w-4 h-4 mr-2" />
              )}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
