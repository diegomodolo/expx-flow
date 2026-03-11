import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle2, Circle, Clock, LinkIcon, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { InternalMessage } from '@/hooks/useInternalChat';

interface ReplyToTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: InternalMessage;
}

const statusConfig: Record<string, { label: string; icon: typeof Circle; className: string }> = {
  todo: { label: 'A Fazer', icon: Circle, className: 'bg-muted text-muted-foreground' },
  progress: { label: 'Em Andamento', icon: Clock, className: 'bg-primary/10 text-primary' },
  review: { label: 'Revisão', icon: Clock, className: 'bg-warning/10 text-warning' },
  done: { label: 'Concluído', icon: CheckCircle2, className: 'bg-success/10 text-success' },
};

export function ReplyToTaskDialog({ open, onOpenChange, message }: ReplyToTaskDialogProps) {
  const [search, setSearch] = useState('');
  const [linking, setLinking] = useState(false);
  const { activeCompany } = useCompany();
  const { user } = useAuth();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks-search', activeCompany?.company_id, search],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];
      let query = supabase
        .from('tasks')
        .select('id, title, status, responsible_name')
        .eq('company_id', activeCompany.company_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!activeCompany?.company_id,
  });

  const handleLinkToTask = useCallback(async (taskId: string) => {
    if (!user?.id || !activeCompany?.company_id || !message.channel_id) return;
    setLinking(true);
    try {
      // Insert comment linking message to task
      const { error } = await supabase
        .from('task_chat_comments' as unknown)
        .insert({
          task_id: taskId,
          message_id: message.id,
          channel_id: message.channel_id,
          user_id: user.id,
          content: message.content,
          company_id: activeCompany.company_id,
        });

      if (error) throw error;

      // Also add to task_history
      const { error: histError } = await supabase
        .from('task_history')
        .insert({
          task_id: taskId,
          company_id: activeCompany.company_id,
          user_id: user.id,
          user_name: user.user_metadata?.full_name || 'Usuário',
          history_type: 'comment',
          description: `💬 Mensagem vinculada do chat: "${message.content.slice(0, 100)}${message.content.length > 100 ? '...' : ''}"`,
        });

      if (histError) console.warn('History insert error:', histError);

      toast.success('Mensagem vinculada à tarefa!');
      onOpenChange(false);
    } catch (err) {
      console.error('Link error:', err);
      toast.error('Erro ao vincular mensagem');
    } finally {
      setLinking(false);
    }
  }, [user, activeCompany, message, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-primary" />
            Vincular à Tarefa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="text-xs text-muted-foreground px-1 truncate">
            Mensagem: "{message.content.slice(0, 60)}{message.content.length > 60 ? '...' : ''}"
          </div>

          <ScrollArea className="h-[280px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhuma tarefa encontrada
              </div>
            ) : (
              <div className="space-y-1">
                {tasks.map(task => {
                  const status = statusConfig[task.status] || statusConfig.todo;
                  const StatusIcon = status.icon;
                  return (
                    <button
                      key={task.id}
                      onClick={() => handleLinkToTask(task.id)}
                      disabled={linking}
                      className={cn(
                        'w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left',
                        'hover:bg-accent transition-colors',
                        'disabled:opacity-50'
                      )}
                    >
                      <StatusIcon className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', status.className)}>
                            {status.label}
                          </Badge>
                          {task.responsible_name && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              {task.responsible_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
