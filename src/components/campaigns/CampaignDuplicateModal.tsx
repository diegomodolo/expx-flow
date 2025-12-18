import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CampaignDuplicateModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: {
    id: string;
    name: string;
  };
  onDuplicate: (newName: string) => Promise<void>;
  loading: boolean;
}

export function CampaignDuplicateModal({
  isOpen,
  onClose,
  campaign,
  onDuplicate,
  loading
}: CampaignDuplicateModalProps) {
  const [newName, setNewName] = useState(`${campaign.name} - Cópia`);

  useEffect(() => {
    if (isOpen) {
      setNewName(`${campaign.name} - Cópia`);
    }
  }, [isOpen, campaign.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      await onDuplicate(newName.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Duplicar Campanha</DialogTitle>
          <DialogDescription>
            Uma cópia da campanha será criada no Meta Ads com todas as configurações.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duplicate-name">Nome da Nova Campanha</Label>
              <Input
                id="duplicate-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome da nova campanha"
                disabled={loading}
              />
            </div>

            <Alert variant="default" className="bg-muted/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                A campanha duplicada incluirá todos os conjuntos de anúncios e anúncios da campanha original.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !newName.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Duplicando...
                </>
              ) : (
                'Duplicar Campanha'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
