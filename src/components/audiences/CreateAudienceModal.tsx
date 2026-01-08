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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, ExternalLink } from "lucide-react";

interface CreateAudienceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, description?: string) => Promise<void>;
  loading: boolean;
  adAccountId?: string;
}

export function CreateAudienceModal({
  open,
  onOpenChange,
  onSubmit,
  loading,
  adAccountId,
}: CreateAudienceModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tosError, setTosError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setTosError(false);
    
    try {
      await onSubmit(name.trim(), description.trim() || undefined);
      setName("");
      setDescription("");
    } catch (error: any) {
      if (error?.type === 'TOS_NOT_ACCEPTED') {
        setTosError(true);
      }
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName("");
      setDescription("");
      setTosError(false);
    }
    onOpenChange(open);
  };

  // Build TOS URL with ad account if available
  const tosUrl = adAccountId 
    ? `https://business.facebook.com/ads/manage/customaudiences/tos/?act=${adAccountId.replace('act_', '')}`
    : 'https://business.facebook.com/ads/manage/customaudiences/tos/';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Público</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {tosError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Termos de Serviço não aceitos</AlertTitle>
                <AlertDescription className="mt-2">
                  <p className="mb-3">
                    Para criar públicos personalizados, você precisa aceitar os Termos de Serviço de Públicos Personalizados do Meta.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => window.open(tosUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Aceitar Termos de Serviço
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Público *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Clientes VIP 2024"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o propósito deste público..."
                rows={3}
                disabled={loading}
              />
            </div>
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              <p className="font-medium mb-1">Informação</p>
              <p>
                O público será criado como "Personalizado" com dados fornecidos pelo usuário.
                Após criar, você poderá adicionar leads via upload de CSV ou manualmente.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Público
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}