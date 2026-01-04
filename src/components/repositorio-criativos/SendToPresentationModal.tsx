import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UnifiedCreative } from "@/hooks/useAllCreatives";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Presentation {
  id: string;
  name: string;
  created_at: string;
}

interface Props {
  creative: UnifiedCreative;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SendToPresentationModal({ creative, open, onOpenChange, onSuccess }: Props) {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedPresentation, setSelectedPresentation] = useState<string>('');
  const [createNew, setCreateNew] = useState(false);
  const [newPresentationName, setNewPresentationName] = useState('');

  useEffect(() => {
    if (open) {
      fetchPresentations();
    }
  }, [open, creative.client_id]);

  const fetchPresentations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_presentations')
        .select('id, name, created_at')
        .eq('client_id', creative.client_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPresentations(data || []);
      
      if (data && data.length > 0) {
        setSelectedPresentation(data[0].id);
        setCreateNew(false);
      } else {
        setCreateNew(true);
      }
    } catch (error) {
      console.error('Error fetching presentations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (createNew && !newPresentationName.trim()) {
      toast.error('Digite um nome para a apresentação');
      return;
    }

    setSending(true);
    try {
      let presentationId = selectedPresentation;

      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      // Get client company_id
      const { data: clientData } = await supabase
        .from('clients')
        .select('company_id')
        .eq('id', creative.client_id)
        .single();

      if (!clientData) throw new Error('Cliente não encontrado');

      // Create new presentation if needed
      if (createNew) {
        const now = new Date();
        const { data: newPresentation, error: createError } = await supabase
          .from('content_presentations')
          .insert({
            client_id: creative.client_id,
            company_id: clientData.company_id,
            name: newPresentationName.trim(),
            status: 'draft',
            user_id: userData.user.id,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
          })
          .select()
          .single();

        if (createError) throw createError;
        presentationId = newPresentation.id;
      }

      // Get current max order
      const { data: existingCreatives } = await supabase
        .from('presentation_creatives')
        .select('order_index')
        .eq('presentation_id', presentationId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrder = (existingCreatives?.[0]?.order_index ?? -1) + 1;

      // Add creative to presentation
      const { data: createdCreative, error: insertError } = await supabase
        .from('presentation_creatives')
        .insert({
          presentation_id: presentationId,
          headline: creative.title || creative.theme || 'Criativo',
          caption: creative.caption,
          creative_type: creative.creative_type || 'post',
          current_status: 'pending',
          order_index: nextOrder,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Add media if exists
      if ((creative.image_url || creative.video_url) && createdCreative) {
        await supabase
          .from('creative_media')
          .insert({
            creative_id: createdCreative.id,
            media_type: creative.video_url ? 'video' : 'image',
            media_url: creative.image_url || creative.video_url,
            order_index: 0,
          });
      }

      toast.success(createNew ? 'Apresentação criada e criativo adicionado!' : 'Criativo enviado para a apresentação!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending to presentation:', error);
      toast.error('Erro ao enviar: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Enviar para Apresentação
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {presentations.length > 0 && (
              <div className="space-y-3">
                <Label>Selecione uma apresentação existente</Label>
                <RadioGroup
                  value={createNew ? '' : selectedPresentation}
                  onValueChange={(value) => {
                    setSelectedPresentation(value);
                    setCreateNew(false);
                  }}
                >
                  {presentations.map((presentation) => (
                    <div key={presentation.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={presentation.id} id={presentation.id} />
                      <Label htmlFor={presentation.id} className="flex-1 cursor-pointer">
                        <span>{presentation.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {format(new Date(presentation.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant={createNew ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCreateNew(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Criar Nova Apresentação
                </Button>
              </div>

              {createNew && (
                <div className="space-y-2">
                  <Label>Nome da nova apresentação</Label>
                  <Input
                    value={newPresentationName}
                    onChange={(e) => setNewPresentationName(e.target.value)}
                    placeholder="Ex: Criativos Janeiro 2025"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSend} disabled={sending} className="flex-1">
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                {createNew ? 'Criar e Enviar' : 'Enviar'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
