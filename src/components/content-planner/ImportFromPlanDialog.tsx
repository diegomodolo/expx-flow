import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useContentPlans, ContentPlan, ContentPlanPost } from "@/hooks/useContentPlans";
import { Loader2, FileText, Image, Layers, Film, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ImportFromPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onImport: (posts: ContentPlanPost[]) => void;
}

const postTypeConfig = {
  estatico: { label: "Estático", icon: Image, color: "bg-blue-100 text-blue-700" },
  carrossel: { label: "Carrossel", icon: Layers, color: "bg-purple-100 text-purple-700" },
  reels: { label: "Reels", icon: Film, color: "bg-pink-100 text-pink-700" },
};

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function ImportFromPlanDialog({
  open,
  onOpenChange,
  clientId,
  onImport,
}: ImportFromPlanDialogProps) {
  const { plans, isLoading, fetchPlanWithPosts } = useContentPlans(clientId);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [planPosts, setPlanPosts] = useState<ContentPlanPost[]>([]);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [loadingPosts, setLoadingPosts] = useState(false);

  const handleSelectPlan = async (planId: string) => {
    setSelectedPlanId(planId);
    setSelectedPostIds(new Set());
    setLoadingPosts(true);
    
    try {
      const plan = await fetchPlanWithPosts(planId);
      // Include all post types: estatico, carrossel, and reels
      const allPosts = plan.posts || [];
      setPlanPosts(allPosts);
    } catch (error) {
      console.error("Error loading plan posts:", error);
      setPlanPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleTogglePost = (postId: string) => {
    const newSelected = new Set(selectedPostIds);
    if (newSelected.has(postId)) {
      newSelected.delete(postId);
    } else {
      newSelected.add(postId);
    }
    setSelectedPostIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPostIds.size === planPosts.length) {
      setSelectedPostIds(new Set());
    } else {
      setSelectedPostIds(new Set(planPosts.map((p) => p.id)));
    }
  };

  const handleImport = () => {
    const selectedPosts = planPosts.filter((p) => selectedPostIds.has(p.id));
    onImport(selectedPosts);
    onOpenChange(false);
    // Reset state
    setSelectedPlanId(null);
    setPlanPosts([]);
    setSelectedPostIds(new Set());
  };

  const handleBack = () => {
    setSelectedPlanId(null);
    setPlanPosts([]);
    setSelectedPostIds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {selectedPlanId ? "Selecionar Posts" : "Importar do Planejamento"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !selectedPlanId ? (
          // Plan Selection
          <ScrollArea className="max-h-[400px]">
            {plans && plans.length > 0 ? (
              <div className="space-y-2">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <FileText className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {plan.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {monthNames[plan.month - 1]} {plan.year}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {plan.status === "rascunho" ? "Rascunho" : 
                       plan.status === "em_revisao" ? "Em Revisão" : "Aprovado"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum planejamento encontrado para este cliente</p>
              </div>
            )}
          </ScrollArea>
        ) : (
          // Post Selection
          <>
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                ← Voltar
              </Button>
              {planPosts.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedPostIds.size === planPosts.length
                    ? "Desmarcar todos"
                    : "Selecionar todos"}
                </Button>
              )}
            </div>

            {loadingPosts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : planPosts.length > 0 ? (
              <ScrollArea className="max-h-[350px]">
                <div className="space-y-2">
                  {planPosts.map((post, index) => {
                    const typeConfig = postTypeConfig[post.post_type];
                    const TypeIcon = typeConfig.icon;
                    
                    return (
                      <div
                        key={post.id}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleTogglePost(post.id)}
                      >
                        <Checkbox
                          checked={selectedPostIds.has(post.id)}
                          onCheckedChange={() => handleTogglePost(post.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={typeConfig.color}>
                              <TypeIcon className="w-3 h-3 mr-1" />
                              {typeConfig.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Post {index + 1}
                            </span>
                          </div>
                          {post.headline && (
                            <p className="font-medium text-foreground line-clamp-1">
                              {post.headline}
                            </p>
                          )}
                          {post.objective && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {post.objective}
                            </p>
                          )}
                          {post.scheduled_date && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(post.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum post encontrado neste planejamento</p>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {selectedPlanId && (
            <Button
              onClick={handleImport}
              disabled={selectedPostIds.size === 0}
            >
              Importar {selectedPostIds.size > 0 ? `(${selectedPostIds.size})` : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
