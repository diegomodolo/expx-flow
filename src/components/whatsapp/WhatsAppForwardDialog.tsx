import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  MessageSquare,
  Mic,
  Image,
  FileText,
  Video,
  Forward,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WhatsAppForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: {
    content: string;
    message_type: string;
    media_url?: string | null;
  } | null;
  conversations: Array<{
    id: string;
    phone: string;
    contact_name: string | null;
    profile_pic_url?: string | null;
  }>;
  onForward: (conversationIds: string[]) => void;
  isForwarding: boolean;
}

const MAX_SELECTIONS = 5;

function getMessageIcon(type: string) {
  switch (type) {
    case "audio":
      return <Mic className="h-4 w-4 text-muted-foreground" />;
    case "image":
      return <Image className="h-4 w-4 text-muted-foreground" />;
    case "document":
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    case "video":
      return <Video className="h-4 w-4 text-muted-foreground" />;
    default:
      return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatPhone(phone: string) {
  if (phone.length >= 12) {
    return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
  }
  return phone;
}

function getInitial(name: string | null, phone: string): string {
  if (name && name.trim().length > 0) {
    return name.trim()[0].toUpperCase();
  }
  return phone[0] || "?";
}

export function WhatsAppForwardDialog({
  open,
  onOpenChange,
  message,
  conversations,
  onForward,
  isForwarding,
}: WhatsAppForwardDialogProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelected(new Set());
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const term = search.toLowerCase();
    return conversations.filter(
      (c) =>
        (c.contact_name && c.contact_name.toLowerCase().includes(term)) ||
        c.phone.includes(term),
    );
  }, [conversations, search]);

  function toggleSelection(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_SELECTIONS) {
          toast.error("Máximo de 5 conversas");
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  }

  const truncatedContent =
    message?.content && message.content.length > 100
      ? message.content.slice(0, 100) + "..."
      : message?.content || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Forward className="h-5 w-5" />
            Encaminhar mensagem
          </DialogTitle>
        </DialogHeader>

        {message && (
          <div className="flex items-start gap-2 rounded-md border bg-muted/50 p-3">
            {getMessageIcon(message.message_type)}
            <p className="text-sm text-muted-foreground line-clamp-2">
              {truncatedContent}
            </p>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma conversa encontrada
            </p>
          ) : (
            filtered.map((conversation) => {
              const isSelected = selected.has(conversation.id);
              const displayName =
                conversation.contact_name || formatPhone(conversation.phone);
              const initial = getInitial(
                conversation.contact_name,
                conversation.phone,
              );

              return (
                <label
                  key={conversation.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted",
                    isSelected && "bg-muted",
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatPhone(conversation.phone)}
                    </p>
                  </div>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(conversation.id)}
                  />
                </label>
              );
            })
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {selected.size} de {MAX_SELECTIONS} selecionadas
        </p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={selected.size === 0 || isForwarding}
            onClick={() => onForward(Array.from(selected))}
          >
            {isForwarding ? "Encaminhando..." : "Encaminhar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
