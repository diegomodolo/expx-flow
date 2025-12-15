import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Plus, Trash2, Send, Loader2, Phone, User, Briefcase } from "lucide-react";

interface Recipient {
  id: string;
  name: string;
  phone: string;
  role: string | null;
  receive_alerts: boolean;
  receive_reports: boolean;
}

interface WhatsAppRecipientsListProps {
  recipients: Recipient[];
  onAdd: (data: Omit<Recipient, "id">) => void;
  onUpdate: (data: Partial<Recipient> & { id: string }) => void;
  onDelete: (id: string) => void;
  onSendTest: (phone: string) => void;
  isAdding: boolean;
  isSendingTest: boolean;
  isConnected: boolean;
}

export function WhatsAppRecipientsList({
  recipients,
  onAdd,
  onUpdate,
  onDelete,
  onSendTest,
  isAdding,
  isSendingTest,
  isConnected,
}: WhatsAppRecipientsListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    role: "",
    receive_alerts: true,
    receive_reports: true,
  });

  const handleAdd = () => {
    onAdd({
      ...formData,
      role: formData.role || null,
      client_id: null,
    } as any);
    setFormData({ name: "", phone: "", role: "", receive_alerts: true, receive_reports: true });
    setIsDialogOpen(false);
  };

  const handleSendTest = (phone: string) => {
    setSendingTo(phone);
    onSendTest(phone);
  };

  const formatPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    if (clean.length === 13 && clean.startsWith("55")) {
      return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
    }
    return phone;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-600/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Destinatários</CardTitle>
              <CardDescription>Números que receberão as notificações</CardDescription>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!isConnected}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Destinatário</DialogTitle>
                <DialogDescription>
                  Adicione um número para receber notificações via WhatsApp
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="João Silva"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="11999999999"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Apenas números, com DDD (ex: 11999999999)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Cargo/Função</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="role"
                      placeholder="Gestor de Tráfego"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Receber Alertas</p>
                    <p className="text-xs text-muted-foreground">CPA alto, saldo baixo, etc</p>
                  </div>
                  <Switch
                    checked={formData.receive_alerts}
                    onCheckedChange={(checked) => setFormData({ ...formData, receive_alerts: checked })}
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Receber Relatórios</p>
                    <p className="text-xs text-muted-foreground">Resumos e atualizações</p>
                  </div>
                  <Switch
                    checked={formData.receive_reports}
                    onCheckedChange={(checked) => setFormData({ ...formData, receive_reports: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={!formData.name || !formData.phone || isAdding}
                >
                  {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!isConnected && (
          <div className="p-3 rounded-lg bg-google-yellow-50 dark:bg-google-yellow-600/10 border border-google-yellow-200 dark:border-google-yellow-600/30 mb-4">
            <p className="text-sm text-google-yellow-700 dark:text-google-yellow-400">
              Configure e conecte sua instância Z-API primeiro para gerenciar destinatários.
            </p>
          </div>
        )}

        {recipients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum destinatário cadastrado</p>
            <p className="text-xs">Adicione números para receber notificações</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recipients.map((recipient) => (
              <div
                key={recipient.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{recipient.name}</p>
                    <p className="text-xs text-muted-foreground">{formatPhone(recipient.phone)}</p>
                    {recipient.role && (
                      <p className="text-xs text-muted-foreground">{recipient.role}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {recipient.receive_alerts && (
                      <Badge variant="secondary" className="text-xs">Alertas</Badge>
                    )}
                    {recipient.receive_reports && (
                      <Badge variant="secondary" className="text-xs">Relatórios</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSendTest(recipient.phone)}
                    disabled={isSendingTest || !isConnected}
                    title="Enviar mensagem de teste"
                  >
                    {isSendingTest && sendingTo === recipient.phone ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(recipient.id)}
                    className="text-destructive hover:text-destructive"
                    title="Remover destinatário"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Destinatário</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover este destinatário? Ele não receberá mais notificações.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteId) onDelete(deleteId);
                  setDeleteId(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}