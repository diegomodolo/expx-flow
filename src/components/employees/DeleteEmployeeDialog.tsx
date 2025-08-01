import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Employee } from "@/hooks/useEmployees";
import { AlertTriangle } from "lucide-react";

interface DeleteEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => Promise<void>;
  employee: Employee | null;
}

export function DeleteEmployeeDialog({ open, onOpenChange, onConfirm, employee }: DeleteEmployeeDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!employee) return;
    
    setLoading(true);
    try {
      await onConfirm(employee.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao deletar colaborador:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-600">
            Tem certeza que deseja excluir o colaborador{" "}
            <span className="font-semibold text-gray-900">
              {employee?.name}
            </span>?
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Todos os dados relacionados a este colaborador serão removidos permanentemente.
          </p>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}