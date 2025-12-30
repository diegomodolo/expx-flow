import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useContentPlans, ContentPlan, ContentPlanPost } from "@/hooks/useContentPlans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ContentPlanPostCard } from "./ContentPlanPostCard";
import { ContentPlanAIChat } from "./ContentPlanAIChat";
import { Loader2, Plus, Save, ArrowLeft, Sparkles, Send, Calendar } from "lucide-react";
import { toast } from "sonner";

interface ContentPlanEditorProps {
  planId: string;
  onBack: () => void;
}

const statusLabels = {
  rascunho: { label: "Rascunho", variant: "secondary" as const },
  em_revisao: { label: "Em Revisão", variant: "outline" as const },
  aprovado: { label: "Aprovado", variant: "default" as const },
};

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function ContentPlanEditor({ planId, onBack }: ContentPlanEditorProps) {
  const queryClient = useQueryClient();
  const { fetchPlanWithPosts, updatePlan, addPost, updatePost, deletePost, reorderPosts } = useContentPlans();
  
  const [planName, setPlanName] = useState("");
  const [planStatus, setPlanStatus] = useState<"rascunho" | "em_revisao" | "aprovado">("rascunho");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);

  const { data: plan, isLoading, refetch } = useQuery({
    queryKey: ["content-plan-detail", planId],
    queryFn: () => fetchPlanWithPosts(planId),
    enabled: !!planId,
  });

  useEffect(() => {
    if (plan) {
      setPlanName(plan.name);
      setPlanStatus(plan.status);
    }
  }, [plan]);

  const handleSavePlan = async () => {
    try {
      await updatePlan.mutateAsync({
        id: planId,
        name: planName,
        status: planStatus,
      });
      setHasUnsavedChanges(false);
      toast.success("Planejamento salvo!");
    } catch (error) {
      toast.error("Erro ao salvar planejamento");
    }
  };

  const handleAddPost = async () => {
    const maxOrder = plan?.posts?.reduce((max, p) => Math.max(max, p.order_index), -1) ?? -1;
    await addPost.mutateAsync({
      content_plan_id: planId,
      order_index: maxOrder + 1,
    });
    refetch();
  };

  const handleUpdatePost = useCallback(async (postId: string, data: Partial<ContentPlanPost>) => {
    await updatePost.mutateAsync({ id: postId, ...data });
  }, [updatePost]);

  const handleDeletePost = async (postId: string) => {
    await deletePost.mutateAsync(postId);
    refetch();
  };

  const handleInsertFromAI = (content: string, field: string) => {
    if (activePostId) {
      const fieldMap: Record<string, keyof ContentPlanPost> = {
        headline: "headline",
        subheadline: "subheadline",
        caption: "caption",
        objective: "objective",
      };
      const fieldKey = fieldMap[field];
      if (fieldKey) {
        handleUpdatePost(activePostId, { [fieldKey]: content });
        refetch();
        toast.success(`${field} inserido no post!`);
      }
    } else {
      toast.info("Selecione um post para inserir o conteúdo");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Planejamento não encontrado</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  const clientBriefing = (plan.clients as any)?.ai_briefing;

  return (
    <div className="h-full">
      <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
        {/* Left Panel - Editor */}
        <ResizablePanel defaultSize={65} minSize={50}>
          <div className="h-full flex flex-col overflow-hidden">
            {/* Editor Header */}
            <div className="flex-shrink-0 p-4 border-b bg-muted/30">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div>
                    <Input
                      value={planName}
                      onChange={(e) => {
                        setPlanName(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      className="text-lg font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                    />
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {monthNames[plan.month - 1]} {plan.year}
                      </span>
                      <span className="mx-1">•</span>
                      <span>{plan.clients?.name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={planStatus}
                    onValueChange={(v: typeof planStatus) => {
                      setPlanStatus(v);
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                      <SelectItem value="em_revisao">Em Revisão</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={handleSavePlan}
                    disabled={!hasUnsavedChanges || updatePlan.isPending}
                    className="gap-2"
                  >
                    {updatePlan.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Salvar
                  </Button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <Button onClick={handleAddPost} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Post
                </Button>
                <Badge variant="outline" className="ml-auto">
                  {plan.posts?.length || 0} posts
                </Badge>
              </div>
            </div>

            {/* Posts List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {plan.posts && plan.posts.length > 0 ? (
                plan.posts.map((post, index) => (
                  <ContentPlanPostCard
                    key={post.id}
                    post={post}
                    index={index}
                    isActive={activePostId === post.id}
                    onSelect={() => setActivePostId(post.id)}
                    onUpdate={(data) => handleUpdatePost(post.id, data)}
                    onDelete={() => handleDeletePost(post.id)}
                    onRefetch={refetch}
                    clientBriefing={clientBriefing}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Sparkles className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    Nenhum post ainda
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Comece adicionando seu primeiro post ao planejamento
                  </p>
                  <Button onClick={handleAddPost} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Adicionar Post
                  </Button>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - AI Chat */}
        <ResizablePanel defaultSize={35} minSize={25}>
          <ContentPlanAIChat
            clientId={plan.client_id}
            clientName={plan.clients?.name || ""}
            clientBriefing={clientBriefing}
            onInsertContent={handleInsertFromAI}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
