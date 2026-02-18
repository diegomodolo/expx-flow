import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface CreateTopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string | null;
}

export function CreateTopicDialog({ open, onOpenChange, channelId }: CreateTopicDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleCreate = async () => {
    if (!title.trim() || !channelId || !user?.id) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('internal_messages')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: description.trim() || title.trim(),
          topic_title: title.trim(),
        });

      if (error) throw error;

      toast.success('Tópico criado!');
      queryClient.invalidateQueries({ queryKey: ['internal-messages', channelId] });
      setTitle('');
      setDescription('');
      onOpenChange(false);
    } catch (err) {
      console.error('Error creating topic:', err);
      toast.error('Erro ao criar tópico');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar um tópico</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="topic-title">Título do tópico</Label>
            <Input
              id="topic-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Alinhamento semanal, Ideia de campanha..."
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="topic-desc">Descrição (opcional)</Label>
            <Textarea
              id="topic-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o assunto do tópico..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim() || sending}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Criar tópico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
