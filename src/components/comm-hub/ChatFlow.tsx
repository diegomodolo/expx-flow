import {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  useCallback,
  useMemo,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Send,
  Hash,
  Users,
  Plus,
  Paperclip,
  MessageSquarePlus,
  BarChart3,
  X,
  FileIcon,
  Loader2,
} from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { NotificationBell } from "./NotificationBell";
import { CreateTopicDialog } from "./CreateTopicDialog";
import { CreatePollDialog } from "./CreatePollDialog";
import { EmojiGifPicker } from "./EmojiGifPicker";
import { SlashCommandMenu, SlashCommand } from "./SlashCommandMenu";
import { MentionMenu } from "./MentionMenu";
import { HandRaiseButton } from "./HandRaiseButton";
import { FocusModeToggle } from "./FocusModeToggle";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import type { InternalChannel, InternalMessage } from "@/hooks/useInternalChat";
import { useAuth } from "@/hooks/useAuth";

interface ChatFlowProps {
  channel: InternalChannel | null;
  messages: InternalMessage[];
  loading?: boolean;
  onSendMessage: (content: string, threadParentId?: string) => void;
  sendingMessage?: boolean;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
}

export function ChatFlow({
  channel,
  messages,
  loading,
  onSendMessage,
  sendingMessage,
  focusMode,
  onToggleFocusMode,
}: ChatFlowProps) {
  const [inputValue, setInputValue] = useState("");
  const [plusOpen, setPlusOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<InternalMessage | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [mentionMenuOpen, setMentionMenuOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if ((!trimmed && !pendingFile) || sendingMessage || uploadingFile) return;

    if (pendingFile) {
      await handleUploadAndSend(trimmed);
      return;
    }

    onSendMessage(trimmed, replyingTo?.id);
    setInputValue("");
    setReplyingTo(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 20MB)");
      return;
    }
    setPendingFile(file);
    setPlusOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleUploadAndSend = async (text: string) => {
    if (!pendingFile || !user?.id || !channel) return;
    setUploadingFile(true);
    try {
      const ext = pendingFile.name.split(".").pop();
      const filePath = `${user.id}/${channel.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("internal-chat-files")
        .upload(filePath, pendingFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("internal-chat-files")
        .getPublicUrl(filePath);

      const insertData: unknown = {
        channel_id: channel.id,
        user_id: user.id,
        content: text || `📎 ${pendingFile.name}`,
        file_url: urlData.publicUrl,
        file_name: pendingFile.name,
        file_type: pendingFile.type,
      };

      if (replyingTo) {
        insertData.thread_parent_id = replyingTo.id;
      }

      const { error } = await supabase
        .from("internal_messages")
        .insert(insertData);

      if (error) throw error;

      setPendingFile(null);
      setInputValue("");
      setReplyingTo(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploadingFile(false);
    }
  };

  // Slash command and @mention input detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setInputValue(val);

    // Detect slash commands at the start of input
    if (val.startsWith("/")) {
      setSlashMenuOpen(true);
      setSlashQuery(val.slice(1));
    } else {
      setSlashMenuOpen(false);
      setSlashQuery("");
    }

    // Detect @mention: find last @ before cursor
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtIndex >= 0) {
      const charBefore = lastAtIndex > 0 ? val[lastAtIndex - 1] : " ";
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Only trigger if @ is at start or preceded by whitespace, and no space in query
      if (
        (charBefore === " " || charBefore === "\n" || lastAtIndex === 0) &&
        !/\s/.test(textAfterAt)
      ) {
        setMentionMenuOpen(true);
        setMentionQuery(textAfterAt);
        setMentionStartPos(lastAtIndex);
        return;
      }
    }
    setMentionMenuOpen(false);
    setMentionQuery("");
    setMentionStartPos(null);
  };

  const handleMentionSelect = (mentionUser: {
    user_id: string;
    full_name: string;
  }) => {
    if (mentionStartPos === null) return;
    const before = inputValue.slice(0, mentionStartPos);
    const cursorPos = inputRef.current?.selectionStart || inputValue.length;
    const after = inputValue.slice(cursorPos);
    const newValue = `${before}@${mentionUser.full_name} ${after}`;
    setInputValue(newValue);
    setMentionMenuOpen(false);
    setMentionQuery("");
    setMentionStartPos(null);
    setTimeout(() => {
      const newPos = before.length + mentionUser.full_name.length + 2; // +2 for @ and space
      inputRef.current?.setSelectionRange(newPos, newPos);
      inputRef.current?.focus();
    }, 0);
  };

  const handleSlashSelect = (cmd: SlashCommand) => {
    setSlashMenuOpen(false);
    setInputValue("");
    switch (cmd.id) {
      case "tarefa":
        // Create a task message placeholder
        setInputValue("");
        toast.info(
          "Use o menu + para criar tarefas, ou envie uma mensagem e converta-a em tarefa.",
        );
        break;
      case "enquete":
        setPollDialogOpen(true);
        break;
      case "topico":
        setTopicDialogOpen(true);
        break;
      case "arquivo":
        fileInputRef.current?.click();
        break;
      case "mao":
        // Will be handled by the HandRaiseButton but also available via slash
        toast.info("Use o botão ✋ no header do canal para levantar a mão.");
        break;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Let SlashCommandMenu or MentionMenu handle arrow keys/enter/tab when open
    if (slashMenuOpen || mentionMenuOpen) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape" && replyingTo) {
      setReplyingTo(null);
    }
  };

  const handleReplyInThread = useCallback((message: InternalMessage) => {
    setReplyingTo(message);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleConvertToTask = useCallback(
    async (message: InternalMessage) => {
      if (!user?.id || !activeCompany?.company_id) {
        toast.error("Erro ao criar tarefa");
        return;
      }

      try {
        const title =
          message.content.length > 80
            ? message.content.slice(0, 77) + "..."
            : message.content;

        const { error } = await (supabase.from("tasks") as unknown).insert({
          title,
          description: `Criado a partir de mensagem no canal de chat.\n\nMensagem original de ${message.user_name}:\n"${message.content}"`,
          company_id: activeCompany.company_id,
          user_id: user.id,
          team_id: activeCompany.company_id,
          responsible_name: message.user_name || "Não atribuído",
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          status: "todo",
          task_state: "backlog",
          origin: "chat",
        });

        if (error) throw error;

        toast.success("✅ Tarefa criada com sucesso!", {
          description: title,
        });
      } catch (err) {
        console.error("Error creating task:", err);
        toast.error("Erro ao criar tarefa");
      }
    },
    [user?.id, activeCompany?.company_id],
  );

  const queryClient = useQueryClient();

  const handleDeleteMessage = useCallback(
    async (message: InternalMessage) => {
      if (!user?.id || message.user_id !== user.id) return;

      queryClient.setQueryData(
        ["internal-messages", channel?.id],
        (old: InternalMessage[] | undefined) =>
          old?.filter((m) => m.id !== message.id) ?? [],
      );

      try {
        const { error } = await supabase
          .from("internal_messages")
          .delete()
          .eq("id", message.id)
          .eq("user_id", user.id);

        if (error) throw error;
        toast.success("Mensagem apagada");
      } catch (err) {
        console.error("Error deleting message:", err);
        queryClient.invalidateQueries({
          queryKey: ["internal-messages", channel?.id],
        });
        toast.error("Erro ao apagar mensagem");
      }
    },
    [user?.id, channel?.id, queryClient],
  );

  const handleTogglePin = useCallback(
    async (message: InternalMessage) => {
      try {
        const { error } = await supabase
          .from("internal_messages")
          .update({ is_pinned: !message.is_pinned })
          .eq("id", message.id);

        if (error) throw error;
        queryClient.invalidateQueries({
          queryKey: ["internal-messages", channel?.id],
        });
        toast.success(
          message.is_pinned ? "Mensagem desafixada" : "Mensagem fixada",
        );
      } catch (err) {
        console.error("Error toggling pin:", err);
        toast.error("Erro ao fixar mensagem");
      }
    },
    [channel?.id, queryClient],
  );

  // Group messages: parent messages with their replies nested
  const groupedMessages = useMemo(() => {
    const parents: InternalMessage[] = [];
    const repliesByParent = new Map<string, InternalMessage[]>();

    for (const msg of messages) {
      if (msg.thread_parent_id) {
        const existing = repliesByParent.get(msg.thread_parent_id) || [];
        existing.push(msg);
        repliesByParent.set(msg.thread_parent_id, existing);
      } else {
        parents.push(msg);
      }
    }

    return parents.map((p) => ({
      parent: p,
      replies: repliesByParent.get(p.id) || [],
    }));
  }, [messages]);

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background/50 backdrop-blur-sm">
        <div className="text-center text-muted-foreground">
          <Hash className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-body-md">Selecione um canal para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background/50 backdrop-blur-sm min-w-0 h-full">
      {/* Channel Header */}
      <div className="h-14 border-b border-border flex items-center px-4 gap-3 shrink-0">
        <Hash className="w-5 h-5 text-primary" />
        <div className="flex-1">
          <h3 className="text-title-md text-foreground">{channel.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <HandRaiseButton channelId={channel.id} />
          {onToggleFocusMode && (
            <FocusModeToggle
              active={!!focusMode}
              onToggle={onToggleFocusMode}
            />
          )}
          <NotificationBell />
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto py-4 transition-all duration-300",
          focusMode && "opacity-20 blur-sm pointer-events-none",
        )}
      >
        {loading ? (
          <div className="space-y-4 px-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : groupedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-body-md text-muted-foreground">
              Nenhuma mensagem ainda
            </p>
            <p className="text-body-sm text-muted-foreground/70 mt-1">
              Seja o primeiro a enviar uma mensagem neste canal!
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {groupedMessages.map(({ parent, replies }) => (
              <div key={parent.id}>
                <MessageBubble
                  message={parent}
                  isOwnMessage={parent.user_id === user?.id}
                  onReplyInThread={handleReplyInThread}
                  onConvertToTask={handleConvertToTask}
                  onDeleteMessage={handleDeleteMessage}
                  onTogglePin={handleTogglePin}
                />
                {/* Inline thread replies */}
                {replies.length > 0 && (
                  <div className="ml-11 border-l-2 border-primary/20 pl-3 space-y-0.5">
                    {replies.map((reply) => (
                      <MessageBubble
                        key={reply.id}
                        message={reply}
                        isOwnMessage={reply.user_id === user?.id}
                        onReplyInThread={() => handleReplyInThread(parent)}
                        onConvertToTask={handleConvertToTask}
                        onDeleteMessage={handleDeleteMessage}
                        onTogglePin={handleTogglePin}
                        isThreadReply
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv"
      />

      {/* Message Input */}
      <div className="border-t border-border shrink-0">
        {/* Reply indicator bar */}
        {replyingTo && (
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/60 border-b border-border">
            <span className="text-xs text-muted-foreground">
              Respondendo para{" "}
              <span className="font-semibold text-primary">
                {replyingTo.user_name}
              </span>
            </span>
            <span className="text-xs text-muted-foreground/60 truncate flex-1 max-w-[300px]">
              — {replyingTo.content}
            </span>
            <Button
              aria-label="Fechar"
              size="icon"
              variant="ghost"
              className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setReplyingTo(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Pending file preview */}
        {pendingFile && (
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/60 border-b border-border">
            <FileIcon className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs text-foreground truncate flex-1">
              {pendingFile.name}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              {(pendingFile.size / 1024).toFixed(0)}KB
            </span>
            <Button
              aria-label="Fechar"
              size="icon"
              variant="ghost"
              className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setPendingFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        <div className="flex items-end gap-2 p-4">
          <Popover open={plusOpen} onOpenChange={setPlusOpen}>
            <PopoverTrigger asChild>
              <Button
                aria-label="Adicionar"
                size="icon"
                variant="ghost"
                className="rounded-xl shrink-0 h-10 w-10 text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-52 p-1.5">
              <button
                onClick={() => {
                  setPlusOpen(false);
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors"
              >
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                Enviar um arquivo
              </button>
              <button
                onClick={() => {
                  setPlusOpen(false);
                  setTopicDialogOpen(true);
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors"
              >
                <MessageSquarePlus className="w-4 h-4 text-muted-foreground" />
                Criar um tópico
              </button>
              <button
                onClick={() => {
                  setPlusOpen(false);
                  setPollDialogOpen(true);
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors"
              >
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                Criar uma enquete
              </button>
            </PopoverContent>
          </Popover>

          <div className="relative flex-1">
            <SlashCommandMenu
              query={slashQuery}
              onSelect={handleSlashSelect}
              onClose={() => setSlashMenuOpen(false)}
              visible={slashMenuOpen}
            />
            <MentionMenu
              query={mentionQuery}
              visible={mentionMenuOpen}
              onSelect={handleMentionSelect}
              onClose={() => {
                setMentionMenuOpen(false);
                setMentionStartPos(null);
              }}
            />
            <Textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                replyingTo
                  ? `Responder para ${replyingTo.user_name}...`
                  : `Mensagem em #${channel.name}... (digite / para comandos)`
              }
              className="min-h-[40px] max-h-[120px] resize-none rounded-xl bg-muted/50 border-border focus-visible:ring-primary"
              rows={1}
            />
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <EmojiGifPicker
              onEmojiSelect={(emoji) => setInputValue((prev) => prev + emoji)}
              onGifSelect={() => {}}
            />
            <Button
              aria-label="Enviar"
              size="icon"
              onClick={handleSend}
              disabled={
                (!inputValue.trim() && !pendingFile) ||
                sendingMessage ||
                uploadingFile
              }
              className="rounded-xl h-10 w-10"
            >
              {uploadingFile ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <CreateTopicDialog
        open={topicDialogOpen}
        onOpenChange={setTopicDialogOpen}
        channelId={channel.id}
      />

      <CreatePollDialog
        open={pollDialogOpen}
        onOpenChange={setPollDialogOpen}
        channelId={channel.id}
      />
    </div>
  );
}
