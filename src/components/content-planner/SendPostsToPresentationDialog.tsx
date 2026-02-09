import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePresentations, ContentPresentation } from "@/hooks/usePresentations";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Presentation, Plus, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContentPlanPost } from "@/hooks/useContentPlans";

interface SlideToSend {
  id: string;
  image_url: string | null;
  headline: string | null;
  content: string | null;
  order_index: number;
}

interface PostToSend {
  id: string;
  image_url?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  caption?: string | null;
  post_type: string;
  slides?: SlideToSend[];
  reels_uploaded_video_url?: string | null;
  reels_cover_url?: string | null;
}

interface SendPostsToPresentationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  posts: PostToSend[];
}

export function SendPostsToPresentationDialog({
  open,
  onOpenChange,
  clientId,
  posts,
}: SendPostsToPresentationDialogProps) {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { presentations, isLoading, createPresentation } = usePresentations(clientId);
  
  const [selectedPresentationId, setSelectedPresentationId] = useState<string>("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newPresentationName, setNewPresentationName] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Filter presentations that are not published (draft or ready)
  const availablePresentations = presentations.filter(
    (p) => p.status === "draft" || p.status === "ready"
  );

  const handleCreateAndSend = async () => {
    if (!newPresentationName.trim() || !user || !activeCompany) return;

    setIsSending(true);
    try {
      const now = new Date();
      const result = await createPresentation.mutateAsync({
        client_id: clientId,
        company_id: activeCompany.company_id,
        user_id: user.id,
        name: newPresentationName.trim(),
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        primary_color: "#3B82F6",
        secondary_color: "#1E40AF",
        status: "draft",
      });

      await sendPostsToPresentation(result.id);
      setNewPresentationName("");
      setShowNewForm(false);
    } catch (error: any) {
      toast({
        title: "Erro ao criar apresentação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendToExisting = async () => {
    if (!selectedPresentationId) return;
    setIsSending(true);
    try {
      await sendPostsToPresentation(selectedPresentationId);
    } finally {
      setIsSending(false);
    }
  };

  const sendPostsToPresentation = async (presentationId: string) => {
    try {
      // Get the current max order_index for this presentation
      const { data: existingCreatives } = await supabase
        .from("presentation_creatives")
        .select("order_index")
        .eq("presentation_id", presentationId)
        .order("order_index", { ascending: false })
        .limit(1);

      let nextOrderIndex = existingCreatives && existingCreatives.length > 0
        ? existingCreatives[0].order_index + 1
        : 0;

      // Map post type to presentation creative type
      const postTypeMap: Record<string, string> = {
        "estatico": "post_unico",
        "carrossel": "carrossel",
        "reels": "reels",
      };

      let successCount = 0;

      for (const post of posts) {
        const mappedType = postTypeMap[post.post_type] || "post_unico";

        // Handle each post type differently
        if (post.post_type === "estatico") {
          // Skip static posts without images
          if (!post.image_url) continue;

          // Create the creative in the presentation
          const { data: creative, error: creativeError } = await supabase
            .from("presentation_creatives")
            .insert({
              presentation_id: presentationId,
              creative_type: mappedType,
              order_index: nextOrderIndex,
              caption: post.caption || "",
              current_status: "pending",
            })
            .select()
            .single();

          if (creativeError) {
            console.error("Error creating creative:", creativeError);
            continue;
          }

          // Add the media to the creative
          const { error: mediaError } = await supabase
            .from("creative_media")
            .insert({
              creative_id: creative.id,
              media_url: post.image_url,
              media_type: "image",
              order_index: 0,
            });

          if (mediaError) {
            console.error("Error adding media:", mediaError);
            continue;
          }

          successCount++;
          nextOrderIndex++;

        } else if (post.post_type === "carrossel") {
          // Filter slides with images
          const slidesWithImages = post.slides?.filter(s => s.image_url) || [];
          if (slidesWithImages.length === 0) continue;

          // Create the creative in the presentation
          const { data: creative, error: creativeError } = await supabase
            .from("presentation_creatives")
            .insert({
              presentation_id: presentationId,
              creative_type: "carrossel",
              order_index: nextOrderIndex,
              caption: post.caption || "",
              current_status: "pending",
            })
            .select()
            .single();

          if (creativeError) {
            console.error("Error creating creative:", creativeError);
            continue;
          }

          // Add ALL slide images as creative_media
          for (let i = 0; i < slidesWithImages.length; i++) {
            const slide = slidesWithImages[i];
            await supabase.from("creative_media").insert({
              creative_id: creative.id,
              media_url: slide.image_url,
              media_type: "image",
              order_index: i,
            });
          }

          successCount++;
          nextOrderIndex++;

        } else if (post.post_type === "reels") {
          // Reels can have video or image (thumbnail)
          const mediaUrl = post.reels_uploaded_video_url || post.image_url;
          if (!mediaUrl) continue;

          // Create the creative in the presentation
          const { data: creative, error: creativeError } = await supabase
            .from("presentation_creatives")
            .insert({
              presentation_id: presentationId,
              creative_type: "reels",
              order_index: nextOrderIndex,
              caption: post.caption || "",
              current_status: "pending",
              reels_cover_url: post.reels_cover_url || null,
            })
            .select()
            .single();

          if (creativeError) {
            console.error("Error creating creative:", creativeError);
            continue;
          }

          // Add the media (video or image)
          const { error: mediaError } = await supabase
            .from("creative_media")
            .insert({
              creative_id: creative.id,
              media_url: mediaUrl,
              media_type: post.reels_uploaded_video_url ? "video" : "image",
              order_index: 0,
            });

          if (mediaError) {
            console.error("Error adding media:", mediaError);
            continue;
          }

          successCount++;
          nextOrderIndex++;
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["presentation", presentationId] });
      queryClient.invalidateQueries({ queryKey: ["presentations"] });

      toast({
        title: "Posts enviados!",
        description: `${successCount} post(s) adicionado(s) à apresentação com sucesso.`,
      });

      onOpenChange(false);
      setSelectedPresentationId("");
    } catch (error: any) {
      toast({
        title: "Erro ao enviar posts",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Filter posts that have valid media based on type
  const postsWithMedia = posts.filter(p => {
    if (p.post_type === 'estatico') {
      return !!p.image_url;
    }
    if (p.post_type === 'carrossel') {
      return p.slides?.some(s => s.image_url) ?? false;
    }
    if (p.post_type === 'reels') {
      return !!p.reels_uploaded_video_url || !!p.image_url;
    }
    return false;
  });
  const postsWithoutMedia = posts.length - postsWithMedia.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Presentation className="w-5 h-5" />
            Enviar para Apresentação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {postsWithMedia.length === 1 ? (
              <span>1 post será enviado</span>
            ) : (
              <span>{postsWithMedia.length} posts serão enviados</span>
            )}
            {postsWithoutMedia > 0 && (
              <span className="text-amber-600 ml-1">
                ({postsWithoutMedia} sem mídia serão ignorados)
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {availablePresentations.length > 0 && !showNewForm && (
                <div className="space-y-3">
                  <Label>Selecione uma apresentação existente:</Label>
                  <ScrollArea className="h-48 rounded-md border p-2">
                    <RadioGroup
                      value={selectedPresentationId}
                      onValueChange={setSelectedPresentationId}
                      className="space-y-2"
                    >
                      {availablePresentations.map((presentation) => (
                        <div
                          key={presentation.id}
                          className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                            selectedPresentationId === presentation.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted"
                          }`}
                          onClick={() => setSelectedPresentationId(presentation.id)}
                        >
                          <RadioGroupItem value={presentation.id} id={presentation.id} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{presentation.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(presentation.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              {" · "}
                              <span className={`${
                                presentation.status === "draft" ? "text-yellow-600" : "text-green-600"
                              }`}>
                                {presentation.status === "draft" ? "Rascunho" : "Pronta"}
                              </span>
                            </p>
                          </div>
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        </div>
                      ))}
                    </RadioGroup>
                  </ScrollArea>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowNewForm(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Apresentação
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleSendToExisting}
                      disabled={!selectedPresentationId || isSending || postsWithMedia.length === 0}
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Enviar
                    </Button>
                  </div>
                </div>
              )}

              {(availablePresentations.length === 0 || showNewForm) && (
                <div className="space-y-4">
                  {availablePresentations.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Nenhuma apresentação disponível para este cliente.
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="presentation-name">Nome da nova apresentação:</Label>
                    <Input
                      id="presentation-name"
                      value={newPresentationName}
                      onChange={(e) => setNewPresentationName(e.target.value)}
                      placeholder="Ex: Campanha Janeiro 2025"
                    />
                  </div>

                  <div className="flex gap-2">
                    {availablePresentations.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setShowNewForm(false)}
                      >
                        Voltar
                      </Button>
                    )}
                    <Button
                      className="flex-1"
                      onClick={handleCreateAndSend}
                      disabled={!newPresentationName.trim() || isSending || postsWithMedia.length === 0}
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Criar e Enviar
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
