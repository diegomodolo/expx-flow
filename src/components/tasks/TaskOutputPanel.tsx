import React, { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Send,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Link2,
  Loader2,
  Trash2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImageEditorModal } from "@/components/image-editor/ImageEditorModal";
import { useCompany } from "@/contexts/CompanyContext";

interface TaskOutputPanelProps {
  taskId: string | null;
  companyId?: string;
  clientId?: string;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

interface OutputMessage {
  id: string;
  task_id: string;
  company_id: string;
  user_id: string | null;
  author_name: string;
  author_avatar: string | null;
  content: string;
  attachments: Array<{
    name: string;
    url: string;
    type: string;
    size?: number;
  }>;
  created_at: string;
}

const IMAGE_URL_REGEX =
  /https?:\/\/[^\s"'<>)]+\.(?:png|jpg|jpeg|gif|webp|bmp|svg)(?:\?[^\s"'<>)]*)?/gi;

function extractImageUrls(text: string): string[] {
  if (!text) return [];
  const matches = text.match(IMAGE_URL_REGEX);
  return matches ? [...new Set(matches)] : [];
}

export function TaskOutputPanel({
  taskId,
  companyId,
  clientId,
  expanded,
  onToggleExpand,
}: TaskOutputPanelProps) {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<
    Array<{ name: string; url: string; type: string; size?: number }>
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Image editor modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorImageUrl, setEditorImageUrl] = useState<string | null>(null);

  const effectiveCompanyId = companyId || activeCompany?.company_id || "";

  const { data: outputs = [], isLoading } = useQuery({
    queryKey: ["task-outputs", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await (supabase
        .from("task_outputs" as unknown)
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true }) as unknown);
      if (error) throw error;
      return (data || []) as OutputMessage[];
    },
    enabled: !!taskId,
  });

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  }, []);

  // Auto-scroll to bottom when outputs load or change
  useEffect(() => {
    if (outputs.length > 0) {
      scrollToBottom();
    }
  }, [outputs, scrollToBottom]);

  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee-for-output", user?.id, companyId],
    queryFn: async () => {
      if (!user?.id || !companyId) return null;
      const { data } = await supabase
        .from("employees")
        .select("name, avatar")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .single();
      return data;
    },
    enabled: !!user?.id && !!companyId,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (
        !taskId ||
        !companyId ||
        (!content.trim() && attachments.length === 0)
      )
        return;
      const { error } = await (supabase.from("task_outputs" as unknown).insert({
        task_id: taskId,
        company_id: companyId,
        user_id: user?.id,
        author_name: currentEmployee?.name || "Usuário",
        author_avatar: currentEmployee?.avatar || null,
        content: content.trim(),
        attachments: attachments,
      }) as unknown);
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      setAttachments([]);
      queryClient.invalidateQueries({ queryKey: ["task-outputs", taskId] });
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (outputId: string) => {
      const { error } = await (supabase
        .from("task_outputs" as unknown)
        .delete()
        .eq("id", outputId) as unknown);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-outputs", taskId] });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !taskId || !user?.id) return;

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`O arquivo "${file.name}" excede o limite de 50MB`);
          continue;
        }

        const ext = file.name.split(".").pop();
        const path = `${user.id}/${taskId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("task-output-files")
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("task-output-files")
          .getPublicUrl(path);

        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            url: urlData.publicUrl,
            type: file.type,
            size: file.size,
          },
        ]);
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Erro ao fazer upload do arquivo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const handleImageClick = (imageUrl: string) => {
    setEditorImageUrl(imageUrl);
    setEditorOpen(true);
  };

  const handleEditorSave = (newImages: string[]) => {
    // Image was edited and saved, nothing else to do
    setEditorOpen(false);
    setEditorImageUrl(null);
  };

  // Scroll to bottom when an image finishes loading
  const handleImageLoad = () => {
    scrollToBottom();
  };

  if (!taskId) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4">
        Salve a tarefa para adicionar outputs
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Output / Resultado
          </h3>
          <p className="text-xs text-muted-foreground">
            Resultados e entregas desta tarefa
          </p>
        </div>
        {onToggleExpand && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onToggleExpand}
            title={expanded ? "Recolher" : "Expandir"}
          >
            {expanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 w-full">
        <div className="p-4 space-y-4 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : outputs.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhum output registrado ainda
            </div>
          ) : (
            outputs.map((output) => {
              const inlineImageUrls = extractImageUrls(output.content);

              return (
                <div key={output.id} className="group relative">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      {output.author_avatar && (
                        <AvatarImage src={output.author_avatar} />
                      )}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {output.author_name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {output.author_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(
                            new Date(output.created_at),
                            "dd/MM/yy HH:mm",
                            { locale: ptBR },
                          )}
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
                        <div className="mt-1 text-sm prose prose-sm dark:prose-invert max-w-none break-words overflow-hidden">
                          <ReactMarkdown>{output.content}</ReactMarkdown>
                        </div>
                      )}

                      {/* Inline detected image previews */}
                      {inlineImageUrls.length > 0 && (
                        <div
                          className="mt-2 grid gap-2"
                          style={{
                            gridTemplateColumns:
                              inlineImageUrls.length === 1
                                ? "1fr"
                                : "repeat(2, 1fr)",
                          }}
                        >
                          {inlineImageUrls.map((url, i) => (
                            <button
                              key={i}
                              onClick={() => handleImageClick(url)}
                              className="relative group/img rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors cursor-pointer"
                              title="Clique para editar no Editor de Imagens"
                            >
                              <img
                                src={url}
                                alt="Preview"
                                className="w-full h-auto max-h-48 object-cover"
                                loading="lazy"
                                onLoad={handleImageLoad}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/40 transition-colors flex items-center justify-center">
                                <span className="opacity-0 group-hover/img:opacity-100 transition-opacity text-white text-xs font-medium flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-full">
                                  <ImageIcon className="w-3.5 h-3.5" />
                                  Editar imagem
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Attachments */}
                      {output.attachments &&
                        (output.attachments as unknown[]).length > 0 && (
                          <div className="mt-2 space-y-1.5 overflow-hidden">
                            {(output.attachments as unknown[]).map((att, i) => {
                              const isImage =
                                att.type?.startsWith("image/") ||
                                /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(
                                  att.url || "",
                                );

                              if (isImage) {
                                return (
                                  <button
                                    key={i}
                                    onClick={() => handleImageClick(att.url)}
                                    className="relative group/img block w-full rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors cursor-pointer text-left"
                                    title="Clique para editar no Editor de Imagens"
                                  >
                                    <img
                                      src={att.url}
                                      alt={att.name}
                                      className="w-full h-auto max-h-48 object-cover"
                                      loading="lazy"
                                      onLoad={handleImageLoad}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/40 transition-colors flex items-center justify-center">
                                      <span className="opacity-0 group-hover/img:opacity-100 transition-opacity text-white text-xs font-medium flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-full">
                                        <ImageIcon className="w-3.5 h-3.5" />
                                        Editar imagem
                                      </span>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-xs text-white truncate">
                                      {att.name}
                                    </div>
                                  </button>
                                );
                              }

                              return (
                                <a
                                  key={i}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors text-sm"
                                >
                                  {getFileIcon(att.type || "")}
                                  <span className="truncate text-foreground">
                                    {att.name}
                                  </span>
                                  <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-auto" />
                                </a>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Pending Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-border space-y-1">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs bg-muted/40 rounded px-2 py-1"
            >
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
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
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
              aria-label="Fazer upload"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </Button>
          </div>
          <Button
            size="sm"
            onClick={() => sendMutation.mutate()}
            disabled={
              sendMutation.isPending ||
              (!content.trim() && attachments.length === 0)
            }
            className="gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Enviar
          </Button>
        </div>
      </div>

      {/* Image Editor Modal */}
      {editorImageUrl && effectiveCompanyId && (
        <ImageEditorModal
          open={editorOpen}
          onOpenChange={(open) => {
            setEditorOpen(open);
            if (!open) setEditorImageUrl(null);
          }}
          images={[editorImageUrl]}
          onSave={handleEditorSave}
          clientId={clientId || ""}
          companyId={effectiveCompanyId}
        />
      )}
    </div>
  );
}
