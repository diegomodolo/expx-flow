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

interface SendToPresentationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  imageUrl: string;
  caption: string;
  creativeType: string;
}

export function SendToPresentationDialog({
  open,
  onOpenChange,
  clientId,
  imageUrl,
  caption,
  creativeType,
}: SendToPresentationDialogProps) {
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

      await sendCreativeToPresentation(result.id);
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
      await sendCreativeToPresentation(selectedPresentationId);
    } finally {
      setIsSending(false);
    }
  };

  const sendCreativeToPresentation = async (presentationId: string) => {
    try {
      // Get the current max order_index for this presentation
      const { data: existingCreatives } = await supabase
        .from("presentation_creatives")
        .select("order_index")
        .eq("presentation_id", presentationId)
        .order("order_index", { ascending: false })
        .limit(1);

      const nextOrderIndex = existingCreatives && existingCreatives.length > 0
        ? existingCreatives[0].order_index + 1
        : 0;

      // Map creative type to presentation creative type
      const creativeTypeMap: Record<string, string> = {
        "feed_quadrado": "post_unico",
        "feed_vertical": "post_unico",
        "stories": "stories",
        "reels": "reels",
        "carrossel": "carrossel",
      };

      const mappedType = creativeTypeMap[creativeType] || "post_unico";

      // Create the creative in the presentation
      const { data: creative, error: creativeError } = await supabase
        .from("presentation_creatives")
        .insert({
          presentation_id: presentationId,
          creative_type: mappedType,
          order_index: nextOrderIndex,
          caption: caption,
          current_status: "pending",
        })
        .select()
        .single();

      if (creativeError) throw creativeError;

      // Add the media to the creative
      const { error: mediaError } = await supabase
        .from("creative_media")
        .insert({
          creative_id: creative.id,
          media_url: imageUrl,
          media_type: "image",
          order_index: 0,
        });

      if (mediaError) throw mediaError;

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["presentation", presentationId] });
      queryClient.invalidateQueries({ queryKey: ["presentations"] });

      toast({
        title: "Criativo enviado!",
        description: "O criativo foi adicionado à apresentação com sucesso.",
      });

      onOpenChange(false);
      setSelectedPresentationId("");
    } catch (error: any) {
      toast({
        title: "Erro ao enviar criativo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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
                      disabled={!selectedPresentationId || isSending}
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
                      disabled={!newPresentationName.trim() || isSending}
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
