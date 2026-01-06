import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useContentPlans, ContentPlan, ContentPlanPost } from "@/hooks/useContentPlans";
import { supabase } from "@/integrations/supabase/client";
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
import { ContentPlanPostCard, ContentPlanPostCardRef } from "./ContentPlanPostCard";
import { ContentPlanAIChat } from "./ContentPlanAIChat";
import { ImportCreativesModal } from "./ImportCreativesModal";
import { SendPostsToPresentationDialog } from "./SendPostsToPresentationDialog";
import { Loader2, Plus, Save, ArrowLeft, Sparkles, Send, Calendar, Download, Link2, Copy, Check, ExternalLink, SpellCheck, AlertTriangle, Presentation } from "lucide-react";
import { toast } from "sonner";

export interface PortugueseValidationErrors {
  [postId: string]: {
    [field: string]: string | undefined;
  };
}

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
  const [hasUnsavedPlanChanges, setHasUnsavedPlanChanges] = useState(false);
  const [postsWithChanges, setPostsWithChanges] = useState<Set<string>>(new Set());
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isValidatingPortuguese, setIsValidatingPortuguese] = useState(false);
  const [validationErrors, setValidationErrors] = useState<PortugueseValidationErrors>({});
  const [totalValidationErrors, setTotalValidationErrors] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showSendAllToPresentationDialog, setShowSendAllToPresentationDialog] = useState(false);

  // Refs for all post cards to collect pending changes
  const postCardRefs = useRef<Map<string, ContentPlanPostCardRef>>(new Map());

  // Check if there are any unsaved changes (plan or posts)
  const hasUnsavedChanges = hasUnsavedPlanChanges || postsWithChanges.size > 0;

  const { data: plan, isLoading, refetch } = useQuery({
    queryKey: ["content-plan-detail", planId],
    queryFn: () => fetchPlanWithPosts(planId),
    enabled: !!planId,
  });

  // Check if client has creative factory configured
  const { data: hasCreativeFactory } = useQuery({
    queryKey: ["creative-factory-check", plan?.client_id],
    queryFn: async () => {
      if (!plan?.client_id) return false;
      const { data } = await supabase
        .from("creative_generation_schedules")
        .select("id")
        .eq("client_id", plan.client_id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!plan?.client_id,
  });

  useEffect(() => {
    if (plan) {
      setPlanName(plan.name);
      setPlanStatus(plan.status);
    }
  }, [plan]);

  // Track changes per post
  const handlePostHasChangesChange = useCallback((postId: string, hasChanges: boolean) => {
    setPostsWithChanges(prev => {
      const newSet = new Set(prev);
      if (hasChanges) {
        newSet.add(postId);
      } else {
        newSet.delete(postId);
      }
      return newSet;
    });
  }, []);

  const handleSavePlan = async () => {
    setIsSaving(true);
    try {
      // Save plan metadata if changed
      if (hasUnsavedPlanChanges) {
        await updatePlan.mutateAsync({
          id: planId,
          name: planName,
          status: planStatus,
        });
      }

      // Save all posts with pending changes
      const savePromises: Promise<void>[] = [];
      postCardRefs.current.forEach((ref, postId) => {
        const pendingChanges = ref.getPendingChanges();
        if (pendingChanges) {
          savePromises.push(
            updatePost.mutateAsync({ id: pendingChanges.postId, ...pendingChanges.data })
              .then(() => ref.resetChanges())
          );
        }
      });

      if (savePromises.length > 0) {
        await Promise.all(savePromises);
      }

      setHasUnsavedPlanChanges(false);
      setPostsWithChanges(new Set());
      toast.success("Planejamento salvo!");
    } catch (error) {
      toast.error("Erro ao salvar planejamento");
    } finally {
      setIsSaving(false);
    }
  };

  const generatePublicLink = async () => {
    if (!plan) return;
    
    setIsGeneratingLink(true);
    try {
      // Generate a token if it doesn't exist
      let token = (plan as any).public_token;
      
      if (!token) {
        token = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
        
        const { error } = await supabase
          .from("content_plans")
          .update({ 
            public_token: token,
            public_shared_at: new Date().toISOString()
          })
          .eq("id", planId);
        
        if (error) throw error;
        refetch();
      }
      
      const publicUrl = `${window.location.origin}/content-review?token=${token}`;
      await navigator.clipboard.writeText(publicUrl);
      setLinkCopied(true);
      toast.success("Link copiado para a área de transferência!");
      
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (error) {
      console.error("Error generating link:", error);
      toast.error("Erro ao gerar link");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const openPublicLink = () => {
    const token = (plan as any)?.public_token;
    if (token) {
      window.open(`${window.location.origin}/content-review?token=${token}`, '_blank');
    }
  };

  const handleValidatePortuguese = async () => {
    if (!plan?.posts || plan.posts.length === 0) {
      toast.info("Não há posts para validar");
      return;
    }

    setIsValidatingPortuguese(true);
    setValidationErrors({});
    setTotalValidationErrors(0);

    try {
      const postsData = plan.posts.map(post => ({
        postId: post.id,
        objective: post.objective,
        headline: post.headline,
        subheadline: post.subheadline,
        caption: post.caption,
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-portuguese`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ posts: postsData }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao validar");
      }

      const data = await response.json();
      
      // Transform results into error map
      const errorsMap: PortugueseValidationErrors = {};
      data.results?.forEach((result: any) => {
        const postErrors: { [field: string]: string | undefined } = {};
        result.errors?.forEach((err: any) => {
          if (err.hasError) {
            postErrors[err.field] = err.errorDetails;
          }
        });
        if (Object.keys(postErrors).length > 0) {
          errorsMap[result.postId] = postErrors;
        }
      });

      setValidationErrors(errorsMap);
      setTotalValidationErrors(data.totalErrors || 0);

      if (data.totalErrors === 0) {
        toast.success("Nenhum erro de português encontrado!");
      } else {
        toast.warning(`${data.totalErrors} erro(s) de português encontrado(s)`);
      }
    } catch (error) {
      console.error("Error validating:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao validar português");
    } finally {
      setIsValidatingPortuguese(false);
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

  const handleImportCreatives = async (creatives: { image_url: string; caption: string }[]) => {
    const maxOrder = plan?.posts?.reduce((max, p) => Math.max(max, p.order_index), -1) ?? -1;
    
    // First, analyze all captions with AI to generate metadata
    let aiResults: { objective: string; headline: string; subheadline: string }[] = [];
    
    const captions = creatives.map(c => c.caption);
    const hasAnyCaptions = captions.some(c => c && c.trim() !== "");
    
    if (hasAnyCaptions) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-creative-caption`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ captions }),
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          aiResults = data.results || [];
        }
      } catch (error) {
        console.error("Error analyzing captions:", error);
      }
    }
    
    // Create posts
    for (let i = 0; i < creatives.length; i++) {
      await addPost.mutateAsync({
        content_plan_id: planId,
        order_index: maxOrder + 1 + i,
      });
    }
    
    // Refetch to get the new post IDs
    const updatedPlan = await refetch();
    const newPosts = updatedPlan.data?.posts?.slice(-creatives.length) || [];
    
    // Update each post with the creative data and AI-generated metadata
    for (let i = 0; i < newPosts.length && i < creatives.length; i++) {
      const post = newPosts[i];
      const creative = creatives[i];
      const aiData = aiResults[i] || { objective: "", headline: "", subheadline: "" };
      
      await updatePost.mutateAsync({
        id: post.id,
        image_url: creative.image_url,
        caption: creative.caption,
        objective: aiData.objective,
        headline: aiData.headline,
        subheadline: aiData.subheadline,
      });
    }
    
    refetch();
    toast.success(`${creatives.length} criativo(s) importado(s) com sucesso!`);
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
                        setHasUnsavedPlanChanges(true);
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
                      setHasUnsavedPlanChanges(true);
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
                    disabled={!hasUnsavedChanges || isSaving}
                    className="gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Salvar
                    {postsWithChanges.size > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {postsWithChanges.size}
                      </Badge>
                    )}
                  </Button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={handleAddPost} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Post
                </Button>
                <Button 
                  onClick={() => setShowImportModal(true)} 
                  size="sm" 
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Importar da Fábrica
                </Button>
                
                {/* Validate Portuguese Button */}
                <Button
                  onClick={handleValidatePortuguese}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  disabled={isValidatingPortuguese || !plan.posts?.length}
                >
                  {isValidatingPortuguese ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <SpellCheck className="w-4 h-4" />
                  )}
                  Validar Português
                </Button>

                {/* Send All Approved to Presentation */}
                {plan.posts?.some(p => p.review_status === "approved") && (
                  <Button
                    onClick={() => setShowSendAllToPresentationDialog(true)}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <Presentation className="w-4 h-4" />
                    Enviar Aprovados
                  </Button>
                )}

                {/* Validation Errors Badge */}
                {totalValidationErrors > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {totalValidationErrors} erro(s)
                  </Badge>
                )}

                {/* Public Review Link - Only show when in review */}
                {planStatus === "em_revisao" && (
                  <div className="flex items-center gap-1 ml-auto">
                    <Button
                      onClick={generatePublicLink}
                      size="sm"
                      variant="secondary"
                      className="gap-2"
                      disabled={isGeneratingLink}
                    >
                      {isGeneratingLink ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : linkCopied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {linkCopied ? "Copiado!" : "Copiar Link"}
                    </Button>
                    {(plan as any).public_token && (
                      <Button
                        onClick={openPublicLink}
                        size="sm"
                        variant="ghost"
                        className="gap-1 px-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}

                {plan.status !== "em_revisao" && totalValidationErrors === 0 && (
                  <Badge variant="outline" className="ml-auto">
                    {plan.posts?.length || 0} posts
                  </Badge>
                )}
              </div>
            </div>

            {/* Posts List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {plan.posts && plan.posts.length > 0 ? (
                plan.posts.map((post, index) => (
                  <ContentPlanPostCard
                    key={post.id}
                    ref={(el) => {
                      if (el) {
                        postCardRefs.current.set(post.id, el);
                      } else {
                        postCardRefs.current.delete(post.id);
                      }
                    }}
                    post={post}
                    index={index}
                    isActive={activePostId === post.id}
                    onSelect={() => setActivePostId(post.id)}
                    onUpdate={(data) => handleUpdatePost(post.id, data)}
                    onDelete={() => handleDeletePost(post.id)}
                    onRefetch={refetch}
                    clientBriefing={clientBriefing}
                    validationErrors={validationErrors[post.id]}
                    onHasChangesChange={handlePostHasChangesChange}
                    clientId={plan.client_id}
                    hasCreativeFactory={hasCreativeFactory || false}
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
            contentPlanId={plan.id}
            onInsertContent={handleInsertFromAI}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      <ImportCreativesModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        clientId={plan.client_id}
        onImport={handleImportCreatives}
      />

      <SendPostsToPresentationDialog
        open={showSendAllToPresentationDialog}
        onOpenChange={setShowSendAllToPresentationDialog}
        clientId={plan.client_id}
        posts={plan.posts?.filter(p => p.review_status === "approved").map(p => ({
          id: p.id,
          image_url: p.image_url,
          headline: p.headline,
          subheadline: p.subheadline,
          caption: p.caption,
          post_type: p.post_type,
        })) || []}
      />
    </div>
  );
}
