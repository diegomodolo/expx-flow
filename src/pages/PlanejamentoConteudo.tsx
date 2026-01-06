import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { ContentPlanEditor } from "@/components/content-planner/ContentPlanEditor";
import { ContentPlanList } from "@/components/content-planner/ContentPlanList";
import { CreatePlanDialog } from "@/components/content-planner/CreatePlanDialog";
import { useContentPlans } from "@/hooks/useContentPlans";

export default function PlanejamentoConteudo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get("id");
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(planId);

  const { createPlan } = useContentPlans();

  useEffect(() => {
    if (planId) {
      setSelectedPlanId(planId);
    } else {
      setSelectedPlanId(null);
    }
  }, [planId]);

  const handleCreatePlan = async (data: {
    client_id: string;
    name: string;
    month: number;
    year: number;
  }) => {
    const result = await createPlan.mutateAsync(data);
    setSelectedPlanId(result.id);
    setShowCreateDialog(false);
    navigate(`/geradores/planejamento-conteudo?id=${result.id}`);
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    navigate(`/geradores/planejamento-conteudo?id=${planId}`);
  };

  const handleBackToList = () => {
    setSelectedPlanId(null);
    navigate("/geradores/planejamento-conteudo");
  };

  // Se tem um planejamento selecionado, mostra direto o editor
  if (selectedPlanId) {
    return (
      <DashboardLayout>
        <div className="-m-8 h-[calc(100vh-4rem)] overflow-hidden">
          <div className="h-full flex flex-col min-h-0">
            <ContentPlanEditor
              planId={selectedPlanId}
              onBack={handleBackToList}
            />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Se não tem planejamento, mostra a lista
  return (
    <DashboardLayout>
      <div className="-m-8 h-[calc(100vh-4rem)] overflow-hidden">
        <div className="h-full p-8 flex flex-col min-h-0">
          <ContentPlanList 
            onSelectPlan={handleSelectPlan} 
            onCreateNew={() => setShowCreateDialog(true)}
          />

          {/* Create Dialog */}
          <CreatePlanDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            onSubmit={handleCreatePlan}
            isLoading={createPlan.isPending}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
