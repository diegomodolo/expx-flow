import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Presentation } from "lucide-react";
import { usePresentations } from "@/hooks/usePresentations";
import { PresentationList } from "@/components/presentations/PresentationList";
import { PresentationWizard } from "@/components/presentations/PresentationWizard";

export default function GeradorApresentacoes() {
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { presentations, isLoading } = usePresentations();

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowWizard(true);
  };

  const handleCloseWizard = () => {
    setShowWizard(false);
    setEditingId(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/geradores")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-teal-500/20 to-teal-500/5">
              <Presentation className="w-8 h-8 text-teal-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Gerador de Apresentações
              </h1>
              <p className="text-muted-foreground mt-1">
                Crie apresentações profissionais de conteúdo para aprovação dos clientes
              </p>
            </div>
          </div>
          <Button onClick={() => setShowWizard(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Apresentação
          </Button>
        </div>

        <PresentationList 
          presentations={presentations}
          isLoading={isLoading}
          onEdit={handleEdit}
        />

        <PresentationWizard
          open={showWizard}
          onClose={handleCloseWizard}
          editingId={editingId}
        />
      </div>
    </DashboardLayout>
  );
}
