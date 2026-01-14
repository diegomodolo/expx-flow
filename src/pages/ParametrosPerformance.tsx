import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw } from "lucide-react";
import { useClientStatusRules } from "@/hooks/useClientStatusRules";
import { RuleCard } from "@/components/settings/RuleCard";
import { RuleEditorModal } from "@/components/settings/RuleEditorModal";
import { ClientStatusRule } from "@/hooks/useClientStatusRules";
import { DefaultBenchmarksSettings } from "@/components/settings/DefaultBenchmarksSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const ParametrosPerformance = () => {
  const {
    rules,
    loading,
    createRule,
    updateRule,
    deleteRule,
    reorderRules,
    restoreDefaults,
  } = useClientStatusRules();

  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<ClientStatusRule | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

  const handleEdit = (rule: ClientStatusRule) => {
    setSelectedRule(rule);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setSelectedRule(null);
    setEditorOpen(true);
  };

  const handleSave = async (ruleData: Partial<ClientStatusRule>) => {
    if (selectedRule) {
      await updateRule(selectedRule.id, ruleData);
    } else {
      await createRule(ruleData as any);
    }
    setEditorOpen(false);
    setSelectedRule(null);
  };

  const handleDeleteClick = (id: string) => {
    setRuleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (ruleToDelete) {
      await deleteRule(ruleToDelete);
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    
    const newOrder = [...rules];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index - 1];
    newOrder[index - 1] = temp;

    await reorderRules(
      newOrder.map((rule, idx) => ({
        id: rule.id,
        rule_order: idx + 1,
      }))
    );
  };

  const handleMoveDown = async (index: number) => {
    if (index === rules.length - 1) return;
    
    const newOrder = [...rules];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + 1];
    newOrder[index + 1] = temp;

    await reorderRules(
      newOrder.map((rule, idx) => ({
        id: rule.id,
        rule_order: idx + 1,
      }))
    );
  };

  const handleRestoreDefaults = async () => {
    await restoreDefaults();
    setRestoreDialogOpen(false);
  };

  const nextOrder = rules.length > 0 ? Math.max(...rules.map(r => r.rule_order)) + 1 : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Parâmetros de Performance</h1>
        <p className="text-muted-foreground mt-1">
          Configure os critérios de classificação de clientes e métricas padrão do sistema
        </p>
      </div>

      <Tabs defaultValue="status-rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="status-rules">Regras de Status</TabsTrigger>
          <TabsTrigger value="default-benchmarks">Métricas Padrão</TabsTrigger>
        </TabsList>

        <TabsContent value="status-rules" className="space-y-6">
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setRestoreDialogOpen(true)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar Padrão
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Regra
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando regras...
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-muted-foreground/20 rounded-lg bg-muted/5">
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhuma regra configurada
                </h3>
                <p className="text-muted-foreground mb-6">
                  Para começar a usar a classificação automática de clientes, você precisa criar regras de status. 
                  Recomendamos restaurar as regras padrão baseadas nas melhores práticas.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button 
                    size="lg"
                    onClick={() => setRestoreDialogOpen(true)}
                    className="gap-2"
                  >
                    <RotateCcw className="h-5 w-5" />
                    Restaurar Regras Padrão
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={handleCreate}
                    className="gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Criar Regra Manualmente
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Como funciona:</strong> As regras são avaliadas de cima para baixo. 
                  A primeira regra que atender às condições determina o status do cliente.
                  Use as setas para reordenar as regras conforme necessário.
                </p>
              </div>

              {rules.map((rule, index) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  index={index}
                  totalRules={rules.length}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="default-benchmarks">
          <DefaultBenchmarksSettings />
        </TabsContent>
      </Tabs>

      <RuleEditorModal
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setSelectedRule(null);
        }}
        rule={selectedRule}
        onSave={handleSave}
        nextOrder={nextOrder}
      />

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar Regras Padrão</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá deletar todas as regras personalizadas e restaurar as regras padrão do sistema.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreDefaults}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Regra</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta regra? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRuleToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ParametrosPerformance;
