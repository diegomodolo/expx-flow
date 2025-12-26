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
  Paperclip,
  Send,
} from "lucide-react";
import { CRMDeal, CRMStage } from "@/hooks/useCRMDeals";
import { CRMContact } from "@/hooks/useCRMContacts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

export function CRMDealDetailsModal({
  deal,
  stages,
  boards = [],
  isOpen,
  onClose,
  onUpdateDeal,
  onDeleteDeal,
}: CRMDealDetailsModalProps) {
  const [activeSection, setActiveSection] = useState("principal");
  const [isSaving, setIsSaving] = useState(false);
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

  // Load deal data into form when deal changes
  useEffect(() => {
    if (deal) {
      const startDate = deal.start_date ? new Date(deal.start_date) : null;
      const closeDate = deal.expected_close_date ? new Date(deal.expected_close_date) : null;
      
      // Find board_id from stage
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

  const contact = deal.contact;

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
      // Parse dates
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

      // Parse value
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

  // Filter stages by selected board
  const filteredStages = formData.board_id 
    ? stages.filter(s => s.board_id === formData.board_id)
    : stages;

  const currentStatus = statusOptions.find(s => s.value === formData.status);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1200px] h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="flex h-full">
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
                  Criada por em {format(new Date(deal.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel - Form */}
              <ScrollArea className="flex-1 min-w-0" key={activeSection}>
                <div className="p-6 space-y-6">
                  {activeSection === "principal" && (
                    <>
                      {/* Row 1: ID + Title */}
                      <div className="grid grid-cols-[120px_1fr] gap-4">
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
                            value={formData.responsible_id} 
                            onValueChange={(v) => setFormData({ ...formData, responsible_id: v })}
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
                          <div className="flex items-center gap-6">
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
                      </div>

                      {/* Workflow */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Fluxo</Label>
                        <Select 
                          value={formData.workflow_id} 
                          onValueChange={(v) => setFormData({ ...formData, workflow_id: v })}
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
                          rows={6}
                          className="resize-none"
                        />
                      </div>
                    </>
                  )}

                  {activeSection === "historico" && (
                    <div className="text-center py-12 text-muted-foreground">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Histórico de atividades</p>
                      <p className="text-sm">Em breve</p>
                    </div>
                  )}

                  {activeSection !== "principal" && activeSection !== "historico" && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>Seção em desenvolvimento</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Right Panel - Status + Activity */}
              <div className="w-80 border-l bg-card flex flex-col shrink-0">
                {/* Status Section */}
                <div className="p-4 border-b space-y-4">
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

                  {/* Quick Note */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <span className="font-bold">B</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <span className="italic">I</span>
                    </Button>
                  </div>
                </div>

                {/* Attachments */}
                <div className="p-4 border-b space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Paperclip className="w-4 h-4" />
                    <span>Anexar Arquivo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select defaultValue="private">
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Privado</SelectItem>
                        <SelectItem value="public">Público</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="icon" className="bg-emerald-500 hover:bg-emerald-600 shrink-0">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Activity Feed */}
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    <div className="flex gap-3">
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarFallback className="bg-orange-500 text-white text-sm">
                          {getInitials(deal.title)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-sm">
                        <p className="font-medium">{deal.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(deal.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          Negócio criado
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                {/* Save Button */}
                <div className="p-4 border-t mt-auto">
                  <Button 
                    className="w-full" 
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
