import { Button } from "@/components/ui/button";
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
import { Team } from "@/hooks/useTeams";

interface DeleteSquadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (squadId: string) => Promise<void>;
  squad: Team | null;
}

export function DeleteSquadDialog({ open, onOpenChange, onConfirm, squad }: DeleteSquadDialogProps) {
  const handleConfirm = async () => {
    if (squad) {
      await onConfirm(squad.id);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Squad</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a squad "{squad?.name}"? 
            Esta ação não pode ser desfeita e todos os dados da squad serão perdidos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}