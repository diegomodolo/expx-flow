import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CarouselSlide {
  slide_number: number;
  headline: string;
  body_text: string;
  image_url?: string;
}

interface GeneratedCarousel {
  id: string;
  carousel_type: string;
  theme: string;
  slides: CarouselSlide[];
  caption: string;
  hashtags: string;
}

interface ContentPlan {
  id: string;
  name: string;
  created_at: string;
}

interface Props {
  carousel: GeneratedCarousel;
  clientId: string;
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SendCarouselToPlanModal({ 
  carousel, 
  clientId, 
  companyId, 
  open, 
  onOpenChange, 
  onSuccess 
}: Props) {
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [createNew, setCreateNew] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');

  useEffect(() => {
    if (open) {
      fetchPlans();
    }
  }, [open, clientId]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_plans')
        .select('id, name, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
      
      if (data && data.length > 0) {
        setSelectedPlan(data[0].id);
        setCreateNew(false);
      } else {
        setCreateNew(true);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (createNew && !newPlanName.trim()) {
      toast.error('Digite um nome para o planejamento');
      return;
    }

    setSending(true);
    try {
      let planId = selectedPlan;

      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      // Create new plan if needed
      if (createNew) {
        const now = new Date();
        const { data: newPlan, error: createError } = await supabase
          .from('content_plans')
          .insert({
            client_id: clientId,
            company_id: companyId,
            name: newPlanName.trim(),
            status: 'draft',
            user_id: userData.user.id,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
          })
          .select()
          .single();

        if (createError) throw createError;
        planId = newPlan.id;
      }

      // Get current max order
      const { data: existingPosts } = await supabase
        .from('content_plan_posts')
        .select('order_index')
        .eq('content_plan_id', planId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrder = (existingPosts?.[0]?.order_index ?? -1) + 1;

      // Add carousel post
      const fullCaption = carousel.hashtags 
        ? `${carousel.caption}\n\n${carousel.hashtags}` 
        : carousel.caption;

      const { data: createdPost, error: insertError } = await supabase
        .from('content_plan_posts')
        .insert({
          content_plan_id: planId,
          headline: carousel.theme || 'Carrossel',
          caption: fullCaption,
          post_type: 'carrossel',
          status: 'pending',
          order_index: nextOrder,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Add each slide
      if (createdPost) {
        const slidesData = carousel.slides.map((slide, idx) => ({
          post_id: createdPost.id,
          slide_number: slide.slide_number || idx + 1,
          headline: slide.headline,
          body_text: slide.body_text,
          image_url: slide.image_url,
        }));

        if (slidesData.length > 0) {
          const { error: slidesError } = await supabase
            .from('content_plan_slides')
            .insert(slidesData);

          if (slidesError) {
            console.error('Error inserting slides:', slidesError);
          }
        }
      }
      toast.success(createNew ? 'Planejamento criado e carrossel adicionado!' : 'Carrossel enviado para o planejamento!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending to plan:', error);
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
            Enviar para Planejamento
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {plans.length > 0 && (
              <div className="space-y-3">
                <Label>Selecione um planejamento existente</Label>
                <RadioGroup
                  value={createNew ? '' : selectedPlan}
                  onValueChange={(value) => {
                    setSelectedPlan(value);
                    setCreateNew(false);
                  }}
                >
                  {plans.map((plan) => (
                    <div key={plan.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={plan.id} id={plan.id} />
                      <Label htmlFor={plan.id} className="flex-1 cursor-pointer">
                        <span>{plan.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {format(new Date(plan.created_at), "dd/MM/yyyy", { locale: ptBR })}
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
                  Criar Novo Planejamento
                </Button>
              </div>

              {createNew && (
                <div className="space-y-2">
                  <Label>Nome do novo planejamento</Label>
                  <Input
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    placeholder="Ex: Planejamento Janeiro 2025"
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
