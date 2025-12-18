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
import { Loader2 } from "lucide-react";

interface CampaignRenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: {
    id: string;
    name: string;
  };
  onRename: (newName: string) => Promise<void>;
  loading: boolean;
}

export function CampaignRenameModal({
  isOpen,
  onClose,
  campaign,
  onRename,
  loading
}: CampaignRenameModalProps) {
  const [newName, setNewName] = useState(campaign.name);

  useEffect(() => {
    if (isOpen) {
      setNewName(campaign.name);
    }
  }, [isOpen, campaign.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && newName !== campaign.name) {
      await onRename(newName.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Renomear Campanha</DialogTitle>
          <DialogDescription>
            Digite o novo nome para a campanha. A alteração será aplicada no Meta Ads.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Nome da Campanha</Label>
              <Input
                id="campaign-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome da campanha"
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !newName.trim() || newName === campaign.name}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
