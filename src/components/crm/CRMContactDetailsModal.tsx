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
import { Card, CardContent } from "@/components/ui/card";
import {
  Mail,
  Phone,
  Building2,
  Globe,
  MapPin,
  Calendar,
  User,
  Briefcase,
  History,
  Edit,
  Save,
  X,
  Plus,
  DollarSign,
  Instagram,
  Facebook,
} from "lucide-react";
import { CRMContact } from "@/hooks/useCRMContacts";
import { CRMDeal } from "@/hooks/useCRMDeals";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CRMContactDetailsModalProps {
  contact: CRMContact | null;
  deals?: CRMDeal[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateContact?: (data: { id: string; [key: string]: unknown }) => Promise<void>;
  onViewDeal?: (deal: CRMDeal) => void;
  onCreateDeal?: (contactId: string) => void;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case "open":
      return { label: "Aberto", color: "bg-blue-500" };
    case "won":
      return { label: "Ganho", color: "bg-emerald-500" };
    case "lost":
      return { label: "Perdido", color: "bg-gray-500" };
    default:
      return { label: "Aberto", color: "bg-blue-500" };
  }
};

export function CRMContactDetailsModal({
  contact,
  deals = [],
  isOpen,
  onClose,
  onUpdateContact,
  onViewDeal,
  onCreateDeal,
}: CRMContactDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<{
    full_name: string;
    email: string;
    phone: string;
    company_name: string;
    website: string;
    city: string;
    state: string;
    notes: string;
  }>({
    full_name: "",
    email: "",
    phone: "",
    company_name: "",
    website: "",
    city: "",
    state: "",
    notes: "",
  });

  if (!contact) return null;

  // Filter deals for this contact
  const contactDeals = deals.filter((d) => d.contact_id === contact.id);
  const openDeals = contactDeals.filter((d) => d.status === "open");
  const wonDeals = contactDeals.filter((d) => d.status === "won");
  const lostDeals = contactDeals.filter((d) => d.status === "lost");
  const totalValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);

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
      full_name: contact.full_name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      company_name: contact.company_name || "",
      website: contact.website || "",
      city: contact.city || "",
      state: contact.state || "",
      notes: contact.notes || "",
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (onUpdateContact) {
      await onUpdateContact({
        id: contact.id,
        ...editData,
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
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {getInitials(contact.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                {isEditing ? (
                  <Input
                    value={editData.full_name}
                    onChange={(e) =>
                      setEditData({ ...editData, full_name: e.target.value })
                    }
                    className="font-semibold"
                  />
                ) : (
                  <>
                    <span className="block">{contact.full_name}</span>
                    {contact.company_name && (
                      <span className="text-sm font-normal text-muted-foreground">
                        {contact.company_name}
                      </span>
                    )}
                  </>
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

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-primary">{contactDeals.length}</p>
            <p className="text-xs text-muted-foreground">Total Negócios</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-blue-500">{openDeals.length}</p>
            <p className="text-xs text-muted-foreground">Em Aberto</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-emerald-500">{wonDeals.length}</p>
            <p className="text-xs text-muted-foreground">Ganhos</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-lg font-bold text-green-600">
              R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground">Valor Total</p>
          </div>
        </div>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList>
            <TabsTrigger value="info">
              <User className="w-4 h-4 mr-2" />
              Informações
            </TabsTrigger>
            <TabsTrigger value="deals">
              <Briefcase className="w-4 h-4 mr-2" />
              Negócios ({contactDeals.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-4">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Email</Label>
                {isEditing ? (
                  <Input
                    value={editData.email}
                    onChange={(e) =>
                      setEditData({ ...editData, email: e.target.value })
                    }
                    type="email"
                    placeholder="email@exemplo.com"
                  />
                ) : contact.email ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-primary hover:underline"
                    >
                      {contact.email}
                    </a>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Telefone</Label>
                {isEditing ? (
                  <Input
                    value={editData.phone}
                    onChange={(e) =>
                      setEditData({ ...editData, phone: e.target.value })
                    }
                    placeholder="(00) 00000-0000"
                  />
                ) : contact.phone ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-primary hover:underline"
                    >
                      {contact.phone}
                    </a>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Empresa</Label>
                {isEditing ? (
                  <Input
                    value={editData.company_name}
                    onChange={(e) =>
                      setEditData({ ...editData, company_name: e.target.value })
                    }
                    placeholder="Nome da empresa"
                  />
                ) : contact.company_name ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    {contact.company_name}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Website</Label>
                {isEditing ? (
                  <Input
                    value={editData.website}
                    onChange={(e) =>
                      setEditData({ ...editData, website: e.target.value })
                    }
                    placeholder="https://..."
                  />
                ) : contact.website ? (
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
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Cidade</Label>
                {isEditing ? (
                  <Input
                    value={editData.city}
                    onChange={(e) =>
                      setEditData({ ...editData, city: e.target.value })
                    }
                    placeholder="Cidade"
                  />
                ) : contact.city ? (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {contact.city}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Estado</Label>
                {isEditing ? (
                  <Input
                    value={editData.state}
                    onChange={(e) =>
                      setEditData({ ...editData, state: e.target.value })
                    }
                    placeholder="Estado"
                  />
                ) : contact.state ? (
                  <span className="text-sm">{contact.state}</span>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>
            </div>

            {/* Social */}
            {(contact.instagram || contact.facebook) && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Redes Sociais</Label>
                <div className="flex items-center gap-4">
                  {contact.instagram && (
                    <a
                      href={`https://instagram.com/${contact.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Instagram className="w-4 h-4" />
                      @{contact.instagram}
                    </a>
                  )}
                  {contact.facebook && (
                    <a
                      href={contact.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Facebook className="w-4 h-4" />
                      Facebook
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Observações</Label>
              {isEditing ? (
                <Textarea
                  value={editData.notes}
                  onChange={(e) =>
                    setEditData({ ...editData, notes: e.target.value })
                  }
                  rows={4}
                  placeholder="Adicione observações sobre o contato..."
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {contact.notes || "Nenhuma observação"}
                </p>
              )}
            </div>

            {/* Meta */}
            <div className="pt-4 border-t border-border text-xs text-muted-foreground">
              <p>
                Criado em{" "}
                {format(new Date(contact.created_at), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="deals" className="space-y-4 mt-4">
            {onCreateDeal && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onCreateDeal(contact.id)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Novo Negócio
              </Button>
            )}

            {contactDeals.length > 0 ? (
              <div className="space-y-3">
                {contactDeals.map((deal) => {
                  const statusConfig = getStatusConfig(deal.status);
                  return (
                    <Card
                      key={deal.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => onViewDeal?.(deal)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full",
                                statusConfig.color
                              )}
                            />
                            <div>
                              <p className="font-medium">{deal.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(deal.created_at), "dd/MM/yyyy", {
                                  locale: ptBR,
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {deal.value && (
                              <p className="font-semibold text-green-600 dark:text-green-400">
                                R${" "}
                                {deal.value.toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                })}
                              </p>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {statusConfig.label}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Nenhum negócio com este contato</p>
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
