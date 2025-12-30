import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, FileText, History, Sparkles } from "lucide-react";
import { ContentPlanEditor } from "@/components/content-planner/ContentPlanEditor";
import { ContentPlanList } from "@/components/content-planner/ContentPlanList";
import { CreatePlanDialog } from "@/components/content-planner/CreatePlanDialog";
import { useContentPlans } from "@/hooks/useContentPlans";

export default function PlanejamentoConteudo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get("id");
  
  const [activeTab, setActiveTab] = useState(planId ? "editor" : "lista");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(planId);

  const { createPlan } = useContentPlans();

  useEffect(() => {
    if (planId) {
      setSelectedPlanId(planId);
      setActiveTab("editor");
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
    setActiveTab("editor");
    setShowCreateDialog(false);
    navigate(`/geradores/planejamento-conteudo?id=${result.id}`);
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setActiveTab("editor");
    navigate(`/geradores/planejamento-conteudo?id=${planId}`);
  };

  const handleBackToList = () => {
    setSelectedPlanId(null);
    setActiveTab("lista");
    navigate("/geradores/planejamento-conteudo");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/geradores")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5">
                <FileText className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Planejador de Conteúdo
                </h1>
                <p className="text-muted-foreground text-sm">
                  Planeje suas postagens mensais com ajuda da IA
                </p>
              </div>
            </div>
          </div>

          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Planejamento
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="lista" className="gap-2">
              <History className="w-4 h-4" />
              Planejamentos
            </TabsTrigger>
            <TabsTrigger value="editor" className="gap-2" disabled={!selectedPlanId}>
              <Sparkles className="w-4 h-4" />
              Editor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="mt-6">
            <ContentPlanList onSelectPlan={handleSelectPlan} />
          </TabsContent>

          <TabsContent value="editor" className="mt-6">
            {selectedPlanId ? (
              <ContentPlanEditor
                planId={selectedPlanId}
                onBack={handleBackToList}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  Nenhum planejamento selecionado
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Selecione um planejamento existente ou crie um novo
                </p>
                <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Criar Planejamento
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Dialog */}
        <CreatePlanDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSubmit={handleCreatePlan}
          isLoading={createPlan.isPending}
        />
      </div>
    </DashboardLayout>
  );
}
