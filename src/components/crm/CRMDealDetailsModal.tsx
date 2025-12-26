import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Home,
  Users,
  Mail,
  GitBranch,
  History,
  Target,
  ListTodo,
  Trash2,
  Save,
  Search,
  Plus,
  Phone,
  Facebook,
  Send,
  MessageSquare,
  ArrowRight,
  Edit3,
  Clock,
  Briefcase,
} from "lucide-react";
import { CRMDeal, CRMStage } from "@/hooks/useCRMDeals";
import { CRMContact } from "@/hooks/useCRMContacts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface CRMDealDetailsModalProps {
  deal: CRMDeal | null;
  stages: CRMStage[];
  boards?: { id: string; name: string }[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateDeal?: (data: { id: string; [key: string]: unknown }) => Promise<unknown>;
  onViewContact?: (contact: CRMContact) => void;
  onDeleteDeal?: (dealId: string) => Promise<void>;
}

interface DealActivity {
  id: string;
  deal_id: string;
  contact_id: string | null;
  activity_type: string;
  notes: string | null;
  from_stage_id: string | null;
  to_stage_id: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown> | null;
  is_manual: boolean;
  created_at: string;
  created_by: string | null;
  user?: {
    full_name: string | null;
  } | null;
}

const menuItems = [
  { id: "principal", label: "Principal", icon: Home },
  { id: "equipe", label: "Equipe", icon: Users },
  { id: "emails", label: "E-mails", icon: Mail },
  { id: "fluxo", label: "Fluxo", icon: GitBranch },
  { id: "historico", label: "Histórico", icon: History },
  { id: "rastreio", label: "Rastreio", icon: Target },
  { id: "subtarefas", label: "Sub-Tarefas", icon: ListTodo },
  { id: "excluir", label: "Excluir", icon: Trash2 },
];

const statusOptions = [
  { value: "open", label: "Aberto", color: "bg-blue-500" },
  { value: "won", label: "Ganho", color: "bg-emerald-500" },
  { value: "lost", label: "Perdido", color: "bg-gray-500" },
];

const getActivityIcon = (type: string) => {
  switch (type) {
    case "stage_changed":
    case "stage_change":
      return ArrowRight;
    case "field_updated":
      return Edit3;
    case "note_added":
    case "manual_note":
      return MessageSquare;
    case "deal_created":
      return Plus;
    default:
      return Clock;
  }
};

const getActivityLabel = (activity: DealActivity, stages: CRMStage[]) => {
  switch (activity.activity_type) {
    case "stage_changed":
    case "stage_change": {
      const fromStage = stages.find(s => s.id === activity.from_stage_id);
      const toStage = stages.find(s => s.id === activity.to_stage_id);
      return `Movido de "${fromStage?.name || '?'}" para "${toStage?.name || '?'}"`;
    }
    case "field_updated":
      return `Campo alterado: ${activity.old_value} → ${activity.new_value}`;
    case "note_added":
    case "manual_note":
      return activity.notes;
    case "deal_created":
      return "Negócio criado";
    default:
      return activity.notes || activity.activity_type;
  }
};

export function CRMDealDetailsModal({
  deal,
  stages,
  boards = [],
  isOpen,
  onClose,
  onUpdateDeal,
  onDeleteDeal,
}: CRMDealDetailsModalProps) {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("principal");
  const [isSaving, setIsSaving] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    start_date: "",
    start_time: "",
    expected_close_date: "",
    expected_close_time: "",
    quantity: "1",
    value: "",
    responsible_id: "",
    board_id: "",
    stage_id: "",
    status: "open",
    notes: "",
    tags: [] as string[],
    workflow_id: "",
  });

  const contact = deal?.contact;
  const contactId = contact?.id;

  // Fetch activities for the contact (not just deal) - shows history across all deals
  const { data: activities = [], refetch: refetchActivities } = useQuery({
    queryKey: ["crm-activities", contactId, deal?.id],
    queryFn: async () => {
      if (!deal) return [];
      
      // Get activities for this contact (across all deals) or this specific deal
      const { data, error } = await supabase
        .from("crm_deal_activities")
        .select("*")
        .or(contactId ? `contact_id.eq.${contactId},deal_id.eq.${deal.id}` : `deal_id.eq.${deal.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user names for created_by
      const userIds = [...new Set(data.map(a => a.created_by).filter(Boolean))];
      let usersMap: Record<string, { full_name: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        
        if (profiles) {
          usersMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = { full_name: p.full_name };
            return acc;
          }, {} as Record<string, { full_name: string | null }>);
        }
      }

      return data.map(a => ({
        ...a,
        user: a.created_by ? usersMap[a.created_by] || null : null,
      })) as DealActivity[];
    },
    enabled: isOpen && !!deal,
  });

  // Fetch other deals for this contact
  const { data: otherDeals = [] } = useQuery({
    queryKey: ["crm-contact-deals", contactId],
    queryFn: async () => {
      if (!contactId || !deal) return [];
      
      const { data, error } = await supabase
        .from("crm_deals")
        .select("id, title, status, created_at, stage_id")
        .eq("contact_id", contactId)
        .neq("id", deal.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!contactId && !!deal,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("crm_deal_activities")
        .insert({
          deal_id: deal!.id,
          contact_id: contactId || null,
          activity_type: "manual_note",
          notes: note,
          is_manual: true,
          created_by: userData.user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewNote("");
      refetchActivities();
      toast.success("Nota adicionada");
    },
    onError: () => {
      toast.error("Erro ao adicionar nota");
    },
  });

  // Load deal data into form when deal changes
  useEffect(() => {
    if (deal) {
      const startDate = deal.start_date ? new Date(deal.start_date) : null;
      const closeDate = deal.expected_close_date ? new Date(deal.expected_close_date) : null;
      
      const currentStage = stages.find(s => s.id === deal.stage_id);
      
      setFormData({
        title: deal.title || "",
        start_date: startDate ? format(startDate, "dd/MM/yyyy") : "",
        start_time: startDate ? format(startDate, "HH:mm") : "",
        expected_close_date: closeDate ? format(closeDate, "dd/MM/yyyy") : "",
        expected_close_time: closeDate ? format(closeDate, "HH:mm") : "",
        quantity: deal.quantity?.toString() || "1",
        value: deal.value ? deal.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "",
        responsible_id: deal.responsible_id || "",
        board_id: currentStage?.board_id || "",
        stage_id: deal.stage_id || "",
        status: deal.status || "open",
        notes: deal.notes || "",
        tags: [],
        workflow_id: deal.workflow_id || "",
      });
    }
  }, [deal, stages]);

  if (!deal) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSave = async () => {
    if (!onUpdateDeal) return;
    
    setIsSaving(true);
    try {
      let startDateTime: string | null = null;
      let closeDateTime: string | null = null;

      if (formData.start_date) {
        const [day, month, year] = formData.start_date.split("/");
        const time = formData.start_time || "00:00";
        startDateTime = new Date(`${year}-${month}-${day}T${time}:00`).toISOString();
      }

      if (formData.expected_close_date) {
        const [day, month, year] = formData.expected_close_date.split("/");
        const time = formData.expected_close_time || "00:00";
        closeDateTime = new Date(`${year}-${month}-${day}T${time}:00`).toISOString();
      }

      const valueStr = formData.value.replace(/\./g, "").replace(",", ".");
      const value = valueStr ? parseFloat(valueStr) : null;

      await onUpdateDeal({
        id: deal.id,
        title: formData.title,
        start_date: startDateTime,
        expected_close_date: closeDateTime,
        quantity: parseInt(formData.quantity) || 1,
        value,
        responsible_id: formData.responsible_id || null,
        stage_id: formData.stage_id,
        status: formData.status as "open" | "won" | "lost",
        notes: formData.notes || null,
        workflow_id: formData.workflow_id || null,
      });
      
      // Log field changes
      await supabase.from("crm_deal_activities").insert({
        deal_id: deal.id,
        contact_id: contactId || null,
        activity_type: "field_updated",
        notes: "Dados do negócio atualizados",
        is_manual: false,
      });

      refetchActivities();
      toast.success("Negócio salvo com sucesso");
    } catch (error) {
      console.error("Error saving deal:", error);
      toast.error("Erro ao salvar negócio");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDeleteDeal) return;
    
    if (confirm("Tem certeza que deseja excluir este negócio?")) {
      try {
        await onDeleteDeal(deal.id);
        onClose();
        toast.success("Negócio excluído");
      } catch (error) {
        console.error("Error deleting deal:", error);
        toast.error("Erro ao excluir negócio");
      }
    }
  };

  const handleSendNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate(newNote.trim());
  };

  const filteredStages = formData.board_id 
    ? stages.filter(s => s.board_id === formData.board_id)
    : stages;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-[1400px] max-h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="flex h-[85vh]">
          {/* Sidebar Menu */}
          <div className="w-20 bg-card border-r flex flex-col items-center py-4 shrink-0">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              const isDelete = item.id === "excluir";
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (isDelete) {
                      handleDelete();
                    } else {
                      setActiveSection(item.id);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center w-full py-3 px-2 text-xs transition-colors",
                    isActive && !isDelete && "bg-primary/10 text-primary border-l-2 border-primary",
                    !isActive && !isDelete && "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    isDelete && "text-destructive hover:bg-destructive/10 mt-auto"
                  )}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 border-b bg-card shrink-0">
              <Avatar className="w-14 h-14 shrink-0">
                <AvatarFallback className="bg-orange-500 text-white text-lg">
                  {getInitials(deal.title)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold truncate">{deal.title}</h2>
                <p className="text-sm text-muted-foreground">
                  Criado em {format(new Date(deal.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>
              {otherDeals.length > 0 && (
                <Badge variant="secondary" className="shrink-0">
                  <Briefcase className="w-3 h-3 mr-1" />
                  +{otherDeals.length} negócio(s) anterior(es)
                </Badge>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel - Form */}
              <ScrollArea className="flex-1 min-w-0" key={activeSection}>
                <div className="p-6 space-y-6">
                  {activeSection === "principal" && (
                    <>
                      {/* Row 1: ID + Title */}
                      <div className="grid grid-cols-[140px_1fr] gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">ID</Label>
                          <Input 
                            value={deal.id.slice(0, 8).toUpperCase()} 
                            disabled 
                            className="bg-muted/50 font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Título</Label>
                          <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Título do negócio"
                          />
                        </div>
                      </div>

                      {/* Row 2: Start Date/Time + Close Date/Time */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Início</Label>
                          <div className="flex gap-2">
                            <Input
                              value={formData.start_date}
                              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                              placeholder="dd/mm/aaaa"
                              className="flex-1"
                            />
                            <Input
                              value={formData.start_time}
                              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                              placeholder="HH:mm"
                              className="w-24"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Previsão de Fechamento</Label>
                          <div className="flex gap-2">
                            <Input
                              value={formData.expected_close_date}
                              onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                              placeholder="dd/mm/aaaa"
                              className="flex-1"
                            />
                            <Input
                              value={formData.expected_close_time}
                              onChange={(e) => setFormData({ ...formData, expected_close_time: e.target.value })}
                              placeholder="HH:mm"
                              className="w-24"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Row 3: Quantity + Value */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Quantidade</Label>
                          <Input
                            type="number"
                            min="1"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Valor</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                            <Input
                              value={formData.value}
                              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                              placeholder="0,00"
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Row 4: Responsible + Board + Stage */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Responsável</Label>
                          <Select 
                            value={formData.responsible_id || "none"} 
                            onValueChange={(v) => setFormData({ ...formData, responsible_id: v === "none" ? "" : v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem responsável</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Funil</Label>
                          <Select 
                            value={formData.board_id} 
                            onValueChange={(v) => setFormData({ ...formData, board_id: v, stage_id: "" })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {boards.map((board) => (
                                <SelectItem key={board.id} value={board.id}>
                                  {board.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Etapa</Label>
                          <Select 
                            value={formData.stage_id} 
                            onValueChange={(v) => setFormData({ ...formData, stage_id: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredStages.map((stage) => (
                                <SelectItem key={stage.id} value={stage.id}>
                                  <div className="flex items-center gap-2">
                                    <span 
                                      className="w-2 h-2 rounded-full" 
                                      style={{ backgroundColor: stage.color }}
                                    />
                                    {stage.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Lead Info Section */}
                      <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">Informações do Lead</h3>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Search className="w-4 h-4 mr-1" />
                              Buscar Lead
                            </Button>
                            <Button variant="outline" size="sm">
                              <Plus className="w-4 h-4 mr-1" />
                              Criar Novo Lead
                            </Button>
                          </div>
                        </div>
                        
                        {contact ? (
                          <div className="flex items-center gap-6 flex-wrap">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-secondary text-secondary-foreground">
                                  {getInitials(contact.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{contact.full_name}</p>
                                <p className="text-sm text-muted-foreground">{contact.email}</p>
                              </div>
                            </div>
                            {contact.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                {contact.phone}
                              </div>
                            )}
                            {contact.utm_source && (
                              <div className="flex items-center gap-2 text-sm">
                                <Facebook className="w-4 h-4 text-muted-foreground" />
                                {contact.utm_source}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhum lead vinculado</p>
                        )}

                        {/* Other Deals */}
                        {otherDeals.length > 0 && (
                          <div className="border-t pt-3 mt-3">
                            <p className="text-xs text-muted-foreground mb-2">
                              Este lead possui outros {otherDeals.length} negócio(s):
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {otherDeals.map((d) => {
                                const stage = stages.find(s => s.id === d.stage_id);
                                return (
                                  <Badge key={d.id} variant="outline" className="text-xs">
                                    <span 
                                      className="w-2 h-2 rounded-full mr-1" 
                                      style={{ backgroundColor: stage?.color || "#888" }}
                                    />
                                    {d.title} ({d.status === "won" ? "Ganho" : d.status === "lost" ? "Perdido" : "Aberto"})
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Workflow */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Fluxo</Label>
                        <Select 
                          value={formData.workflow_id || "none"} 
                          onValueChange={(v) => setFormData({ ...formData, workflow_id: v === "none" ? "" : v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem fluxo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Tags */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Tags</Label>
                        <div className="flex items-center gap-2 p-2 border rounded-md min-h-[40px]">
                          <span className="text-muted-foreground text-sm">Selecione...</span>
                          <Button variant="ghost" size="icon" className="ml-auto h-6 w-6">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Descrição</Label>
                        <Textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Adicione uma descrição..."
                          rows={4}
                          className="resize-none"
                        />
                      </div>

                      {/* Save Button */}
                      <Button 
                        className="w-full" 
                        onClick={handleSave}
                        disabled={isSaving}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </>
                  )}

                  {activeSection === "historico" && (
                    <div className="space-y-4">
                      <h3 className="font-medium">Histórico Completo</h3>
                      <p className="text-sm text-muted-foreground">
                        Visualize o histórico detalhado deste negócio e do lead associado.
                      </p>
                      
                      {activities.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>Nenhuma atividade registrada</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {activities.map((activity) => {
                            const Icon = getActivityIcon(activity.activity_type);
                            const isDifferentDeal = activity.deal_id !== deal.id;
                            
                            return (
                              <div 
                                key={activity.id} 
                                className={cn(
                                  "flex gap-3 p-3 rounded-lg",
                                  isDifferentDeal ? "bg-muted/50 border border-dashed" : "bg-muted/30"
                                )}
                              >
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                  activity.is_manual ? "bg-primary/10 text-primary" : "bg-muted"
                                )}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm">{getActivityLabel(activity, stages)}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(activity.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                    </span>
                                    {activity.user?.full_name && (
                                      <span className="text-xs text-muted-foreground">
                                        • {activity.user.full_name}
                                      </span>
                                    )}
                                    {isDifferentDeal && (
                                      <Badge variant="outline" className="text-xs">
                                        Outro negócio
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {activeSection !== "principal" && activeSection !== "historico" && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>Seção em desenvolvimento</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Right Panel - Status + Note Input + Activity Feed */}
              <div className="w-96 border-l bg-card flex flex-col shrink-0">
                {/* Status Section */}
                <div className="p-4 border-b space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Situação</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(v) => setFormData({ ...formData, status: v })}
                    >
                      <SelectTrigger className={cn(
                        "font-medium",
                        formData.status === "open" && "bg-blue-500 text-white border-blue-500",
                        formData.status === "won" && "bg-emerald-500 text-white border-emerald-500",
                        formData.status === "lost" && "bg-gray-500 text-white border-gray-500"
                      )}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            <div className="flex items-center gap-2">
                              <span className={cn("w-2 h-2 rounded-full", status.color)} />
                              {status.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Note Input */}
                <div className="p-4 border-b space-y-3">
                  <Label className="text-xs text-muted-foreground">Adicionar ao Histórico</Label>
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Digite uma nota ou observação..."
                    rows={3}
                    className="resize-none"
                  />
                  <Button 
                    onClick={handleSendNote}
                    disabled={!newNote.trim() || addNoteMutation.isPending}
                    className="w-full bg-emerald-500 hover:bg-emerald-600"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {addNoteMutation.isPending ? "Enviando..." : "Enviar"}
                  </Button>
                </div>

                {/* Activity Feed */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="p-3 border-b">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Histórico do Lead
                    </h4>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-3">
                      {activities.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhuma atividade registrada
                        </p>
                      ) : (
                        activities.map((activity) => {
                          const Icon = getActivityIcon(activity.activity_type);
                          const isDifferentDeal = activity.deal_id !== deal.id;
                          
                          return (
                            <div key={activity.id} className="flex gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                activity.is_manual ? "bg-primary/10 text-primary" : "bg-muted"
                              )}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm line-clamp-3">
                                  {getActivityLabel(activity, stages)}
                                </p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(activity.created_at), "dd/MM/yy HH:mm")}
                                  </span>
                                  {activity.user?.full_name && (
                                    <span className="text-xs font-medium text-muted-foreground">
                                      • {activity.user.full_name}
                                    </span>
                                  )}
                                  {isDifferentDeal && (
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                                      Outro negócio
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
