import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/contexts/CompanyContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Paperclip, X, FileText, Image as ImageIcon, Link2, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface TaskOutputPanelProps {
  taskId: string | null;
  companyId?: string;
}

interface OutputMessage {
  id: string;
  task_id: string;
  company_id: string;
  user_id: string | null;
  author_name: string;
  author_avatar: string | null;
  content: string;
  attachments: Array<{ name: string; url: string; type: string; size?: number }>;
  created_at: string;
}

export function TaskOutputPanel({ taskId, companyId }: TaskOutputPanelProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Array<{ name: string; url: string; type: string; size?: number }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: outputs = [], isLoading } = useQuery({
    queryKey: ['task-outputs', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await (supabase
        .from('task_outputs' as any)
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true }) as any);
      if (error) throw error;
      return (data || []) as OutputMessage[];
    },
    enabled: !!taskId,
  });

  const { data: currentEmployee } = useQuery({
    queryKey: ['current-employee-for-output', user?.id, companyId],
    queryFn: async () => {
      if (!user?.id || !companyId) return null;
      const { data } = await supabase
        .from('employees')
        .select('name, avatar')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .single();
      return data;
    },
    enabled: !!user?.id && !!companyId,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!taskId || !companyId || (!content.trim() && attachments.length === 0)) return;
      const { error } = await (supabase
        .from('task_outputs' as any)
        .insert({
          task_id: taskId,
          company_id: companyId,
          user_id: user?.id,
          author_name: currentEmployee?.name || 'Usuário',
          author_avatar: currentEmployee?.avatar || null,
          content: content.trim(),
          attachments: attachments,
        }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setContent('');
      setAttachments([]);
      queryClient.invalidateQueries({ queryKey: ['task-outputs', taskId] });
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (outputId: string) => {
      const { error } = await (supabase
        .from('task_outputs' as any)
        .delete()
        .eq('id', outputId) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-outputs', taskId] });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !taskId || !user?.id) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${taskId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('task-output-files')
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('task-output-files')
          .getPublicUrl(path);

        setAttachments(prev => [...prev, {
          name: file.name,
          url: urlData.publicUrl,
          type: file.type,
          size: file.size,
        }]);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  if (!taskId) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4">
        Salve a tarefa para adicionar outputs
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Output / Resultado</h3>
        <p className="text-xs text-muted-foreground">Resultados e entregas desta tarefa</p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef as any}>
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : outputs.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhum output registrado ainda
            </div>
          ) : (
            outputs.map((output) => (
              <div key={output.id} className="group relative">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    {output.author_avatar && <AvatarImage src={output.author_avatar} />}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {output.author_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{output.author_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(output.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                      {output.user_id === user?.id && (
                        <button
                          onClick={() => deleteMutation.mutate(output.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      )}
                    </div>
                    {output.content && (
                      <div className="mt-1 text-sm prose prose-sm dark:prose-invert max-w-none break-words">
                        <ReactMarkdown>{output.content}</ReactMarkdown>
                      </div>
                    )}
                    {/* Attachments */}
                    {output.attachments && (output.attachments as any[]).length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {(output.attachments as any[]).map((att, i) => (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors text-sm"
                          >
                            {att.type?.startsWith('image/') ? (
                              <img src={att.url} alt={att.name} className="w-16 h-16 object-cover rounded" />
                            ) : (
                              getFileIcon(att.type || '')
                            )}
                            <span className="truncate text-foreground">{att.name}</span>
                            <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-auto" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Pending Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-border space-y-1">
          {attachments.map((att, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-muted/40 rounded px-2 py-1">
              {getFileIcon(att.type)}
              <span className="truncate flex-1">{att.name}</span>
              <button onClick={() => removeAttachment(i)}>
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Adicionar resultado ou entrega..."
            className="min-h-[60px] max-h-[120px] text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                sendMutation.mutate();
              }
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </Button>
          </div>
          <Button
            size="sm"
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending || (!content.trim() && attachments.length === 0)}
            className="gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
