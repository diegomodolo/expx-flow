import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UnifiedCreative } from "@/hooks/useAllCreatives";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Calendar, Instagram, Facebook } from "lucide-react";

interface Props {
  creative: UnifiedCreative;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SendToScheduleModal({ creative, open, onOpenChange, onSuccess }: Props) {
  const [scheduling, setScheduling] = useState(false);
  const [platforms, setPlatforms] = useState<('instagram' | 'facebook')[]>(['instagram']);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('10:00');

  const togglePlatform = (platform: 'instagram' | 'facebook') => {
    setPlatforms(prev => {
      if (prev.includes(platform)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(p => p !== platform);
      }
      return [...prev, platform];
    });
  };

  const handleSchedule = async () => {
    if (!scheduleDate || !scheduleTime) {
      toast.error('Selecione data e hora');
      return;
    }

    setScheduling(true);
    try {
      // Get client data
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('facebook_page_id, instagram_account_id, company_id')
        .eq('id', creative.client_id)
        .single();

      if (clientError || !client) {
        throw new Error('Cliente não encontrado');
      }

      // Validate accounts for selected platforms
      for (const platform of platforms) {
        const accountId = platform === 'instagram' ? client.instagram_account_id : client.facebook_page_id;
        if (!accountId) {
          throw new Error(`Configure uma conta do ${platform === 'instagram' ? 'Instagram' : 'Facebook'} no cliente`);
        }
      }

      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      // Create scheduled post
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();

      const { error: postError } = await supabase
        .from('scheduled_posts')
        .insert({
          client_id: creative.client_id,
          company_id: client.company_id,
          caption: creative.caption || '',
          media_urls: creative.image_url ? [creative.image_url] : [],
          content_type: creative.video_url ? 'video' : 'image',
          platforms: platforms,
          scheduled_at: scheduledAt,
          status: 'scheduled',
          created_by: userData.user.id,
          facebook_page_id: platforms.includes('facebook') ? client.facebook_page_id : null,
          instagram_account_id: platforms.includes('instagram') ? client.instagram_account_id : null,
        });

      if (postError) throw postError;

      toast.success('Publicação agendada com sucesso!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error scheduling:', error);
      toast.error('Erro ao agendar: ' + error.message);
    } finally {
      setScheduling(false);
    }
  };

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agendar Publicação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Plataformas</Label>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={platforms.includes('instagram')}
                  onCheckedChange={() => togglePlatform('instagram')}
                />
                <div className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={platforms.includes('facebook')}
                  onCheckedChange={() => togglePlatform('facebook')}
                />
                <div className="flex items-center gap-2">
                  <Facebook className="h-4 w-4" />
                  Facebook
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={getMinDate()}
              />
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
          </div>

          {/* Preview */}
          {creative.image_url && (
            <div className="rounded-lg overflow-hidden border">
              <img
                src={creative.image_url}
                alt="Preview"
                className="w-full h-32 object-cover"
              />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSchedule} disabled={scheduling} className="flex-1">
              {scheduling ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4 mr-2" />
              )}
              Agendar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
