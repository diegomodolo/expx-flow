import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Phone,
  Building2,
  Globe,
  DollarSign,
  Calendar,
  User,
  MessageSquare,
  History,
  Edit,
  Save,
  X,
  ExternalLink,
} from "lucide-react";
import { CRMDeal, CRMStage } from "@/hooks/useCRMDeals";
import { CRMContact } from "@/hooks/useCRMContacts";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CRMDealDetailsModalProps {
  deal: CRMDeal | null;
  stages: CRMStage[];
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdateDeal?: (data: { id: string; [key: string]: any }) => Promise<any>;
  onViewContact?: (contact: CRMContact) => void;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case "open":
      return {
        label: "Aberto",
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      };
    case "won":
      return {
        label: "Ganho",
        color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
      };
    case "lost":
      return {
        label: "Perdido",
        color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
      };
    default:
      return {
        label: "Aberto",
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      };
  }
};

const getTemperatureConfig = (temperature: string | null | undefined) => {
  switch (temperature) {
    case "hot":
      return { label: "Quente", emoji: "🔥", color: "text-red-500" };
    case "warm":
      return { label: "Morno", emoji: "🌡️", color: "text-orange-500" };
    case "cold":
      return { label: "Frio", emoji: "❄️", color: "text-blue-500" };
    default:
      return null;
  }
};

export function CRMDealDetailsModal({
  deal,
  stages,
  isOpen,
  onClose,
  onUpdateDeal,
  onViewContact,
}: CRMDealDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<{
    title: string;
    value: string;
    notes: string;
    status: string;
    temperature: string;
    expected_close_date: string;
  }>({
    title: "",
    value: "",
    notes: "",
    status: "",
    temperature: "",
    expected_close_date: "",
  });

  if (!deal) return null;

  const contact = deal.contact;
  const currentStage = stages.find((s) => s.id === deal.stage_id);
  const statusConfig = getStatusConfig(deal.status);
  const temperatureConfig = getTemperatureConfig(deal.temperature);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleStartEdit = () => {
    setEditData({
      title: deal.title || "",
      value: deal.value?.toString() || "",
      notes: deal.notes || "",
      status: deal.status || "open",
      temperature: deal.temperature || "",
      expected_close_date: deal.expected_close_date?.split("T")[0] || "",
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (onUpdateDeal) {
      await onUpdateDeal({
        id: deal.id,
        title: editData.title,
        value: editData.value ? parseFloat(editData.value) : null,
        notes: editData.notes || null,
        status: editData.status as "open" | "won" | "lost",
        temperature: editData.temperature as "cold" | "warm" | "hot" | null || null,
        expected_close_date: editData.expected_close_date || null,
      });
    }
    setIsEditing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(deal.title)}
                </AvatarFallback>
              </Avatar>
              <div>
                {isEditing ? (
                  <Input
                    value={editData.title}
                    onChange={(e) =>
                      setEditData({ ...editData, title: e.target.value })
                    }
                    className="font-semibold"
                  />
                ) : (
                  <span>{deal.title}</span>
                )}
              </div>
            </DialogTitle>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="w-4 h-4 mr-1" />
                    Salvar
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={handleStartEdit}>
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList>
            <TabsTrigger value="details">
              <User className="w-4 h-4 mr-2" />
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="contact">
              <MessageSquare className="w-4 h-4 mr-2" />
              Contato
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-4">
            {/* Status and Stage */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Status</Label>
                {isEditing ? (
                  <Select
                    value={editData.status}
                    onValueChange={(v) => setEditData({ ...editData, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aberto</SelectItem>
                      <SelectItem value="won">Ganho</SelectItem>
                      <SelectItem value="lost">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={cn("text-sm", statusConfig.color)}>
                    {statusConfig.label}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Etapa Atual</Label>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: currentStage?.color || "#888" }}
                  />
                  <span className="font-medium">{currentStage?.name || "—"}</span>
                </div>
              </div>
            </div>

            {/* Value and Temperature */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Valor</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.value}
                    onChange={(e) =>
                      setEditData({ ...editData, value: e.target.value })
                    }
                    placeholder="0.00"
                  />
                ) : (
                  <div className="flex items-center gap-1 text-lg font-semibold text-green-600 dark:text-green-400">
                    <DollarSign className="w-5 h-5" />
                    {deal.value
                      ? `R$ ${deal.value.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}`
                      : "—"}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Temperatura</Label>
                {isEditing ? (
                  <Select
                    value={editData.temperature}
                    onValueChange={(v) =>
                      setEditData({ ...editData, temperature: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cold">❄️ Frio</SelectItem>
                      <SelectItem value="warm">🌡️ Morno</SelectItem>
                      <SelectItem value="hot">🔥 Quente</SelectItem>
                    </SelectContent>
                  </Select>
                ) : temperatureConfig ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{temperatureConfig.emoji}</span>
                    <span className={temperatureConfig.color}>
                      {temperatureConfig.label}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Criado em</Label>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {format(new Date(deal.created_at), "dd/MM/yyyy HH:mm", {
                    locale: ptBR,
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Previsão de Fechamento</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editData.expected_close_date}
                    onChange={(e) =>
                      setEditData({ ...editData, expected_close_date: e.target.value })
                    }
                  />
                ) : deal.expected_close_date ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {format(new Date(deal.expected_close_date), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Observações</Label>
              {isEditing ? (
                <Textarea
                  value={editData.notes}
                  onChange={(e) =>
                    setEditData({ ...editData, notes: e.target.value })
                  }
                  rows={4}
                  placeholder="Adicione observações sobre o negócio..."
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {deal.notes || "Nenhuma observação"}
                </p>
              )}
            </div>

            {/* Disqualification reason */}
            {deal.status === "lost" && deal.disqualification_reason && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Motivo da Perda</Label>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {deal.disqualification_reason}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="contact" className="space-y-6 mt-4">
            {contact ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {getInitials(contact.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{contact.full_name}</p>
                      {contact.company_name && (
                        <p className="text-sm text-muted-foreground">
                          {contact.company_name}
                        </p>
                      )}
                    </div>
                  </div>
                  {onViewContact && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewContact(contact)}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Ver Contato
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {contact.email && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Email</Label>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-primary hover:underline"
                        >
                          {contact.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {contact.phone && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Telefone</Label>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <a
                          href={`tel:${contact.phone}`}
                          className="text-primary hover:underline"
                        >
                          {contact.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {contact.company_name && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Empresa</Label>
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {contact.company_name}
                      </div>
                    </div>
                  )}

                  {contact.website && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Website</Label>
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <a
                          href={contact.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {contact.website}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {(contact.city || contact.state) && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Localização</Label>
                    <p className="text-sm">
                      {[contact.city, contact.state].filter(Boolean).join(", ")}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Nenhum contato associado</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Histórico de atividades em breve</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
