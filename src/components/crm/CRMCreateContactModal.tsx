import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCRMContacts, CRMContact } from "@/hooks/useCRMContacts";
import { Loader2, User, Mail, Phone, Building } from "lucide-react";

interface CRMCreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onContactCreated: (contact: CRMContact) => void;
}

export function CRMCreateContactModal({
  isOpen,
  onClose,
  workspaceId,
  onContactCreated,
}: CRMCreateContactModalProps) {
  const { createContact, isCreating } = useCRMContacts(workspaceId);
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    company_name: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      return;
    }

    if (!formData.email && !formData.phone) {
      return;
    }

    try {
      const contact = await createContact({
        workspace_id: workspaceId,
        full_name: formData.full_name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        company_name: formData.company_name.trim() || null,
        notes: formData.notes.trim() || null,
      });

      onContactCreated(contact);
      handleClose();
    } catch (error) {
      console.error("Error creating contact:", error);
    }
  };

  const handleClose = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      company_name: "",
      notes: "",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Lead</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Nome Completo *
            </Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Nome do contato"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Telefone
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_name" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Empresa
            </Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="Nome da empresa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas adicionais..."
              rows={3}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            * Preencha pelo menos Email ou Telefone
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isCreating || !formData.full_name.trim() || (!formData.email && !formData.phone)}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Lead"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
