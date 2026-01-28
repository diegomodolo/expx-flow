import { useState, KeyboardEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Paperclip, Image, FileText, Film, Mic, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface MediaAttachment {
  file: File;
  type: "image" | "video" | "document" | "audio";
  preview?: string;
}

interface WhatsAppMessageInputProps {
  onSend: (message: string) => void;
  onSendMedia?: (media: MediaAttachment, caption: string) => void;
  isSending: boolean;
}

export function WhatsAppMessageInput({ onSend, onSendMedia, isSending }: WhatsAppMessageInputProps) {
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<MediaAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [acceptTypes, setAcceptTypes] = useState<string>("");

  const handleSend = () => {
    const trimmed = message.trim();
    
    if (attachment && onSendMedia) {
      onSendMedia(attachment, trimmed);
      setAttachment(null);
      setMessage("");
      return;
    }

    if (!trimmed || isSending) return;
    
    onSend(trimmed);
    setMessage("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openFilePicker = (type: "image" | "video" | "document" | "audio") => {
    const acceptMap: Record<string, string> = {
      image: "image/jpeg,image/png,image/gif,image/webp",
      video: "video/mp4,video/webm",
      document: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip",
      audio: "audio/mpeg,audio/ogg,audio/wav,audio/mp3",
    };
    setAcceptTypes(acceptMap[type]);
    
    // Slight delay to ensure acceptTypes is set
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let type: MediaAttachment["type"] = "document";
    if (file.type.startsWith("image/")) type = "image";
    else if (file.type.startsWith("video/")) type = "video";
    else if (file.type.startsWith("audio/")) type = "audio";

    const newAttachment: MediaAttachment = { file, type };

    // Generate preview for images
    if (type === "image") {
      const reader = new FileReader();
      reader.onload = () => {
        newAttachment.preview = reader.result as string;
        setAttachment({ ...newAttachment });
      };
      reader.readAsDataURL(file);
    } else {
      setAttachment(newAttachment);
    }

    // Reset input
    e.target.value = "";
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getAttachmentIcon = () => {
    if (!attachment) return null;
    switch (attachment.type) {
      case "image": return <Image className="h-4 w-4" />;
      case "video": return <Film className="h-4 w-4" />;
      case "audio": return <Mic className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col border-t bg-background">
      {/* Attachment preview */}
      {attachment && (
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            {attachment.type === "image" && attachment.preview ? (
              <img 
                src={attachment.preview} 
                alt="Preview" 
                className="h-16 w-16 rounded object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded bg-muted flex items-center justify-center">
                {getAttachmentIcon()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.file.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={removeAttachment}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 p-3">
        <input
          type="file"
          ref={fileInputRef}
          accept={acceptTypes}
          onChange={handleFileSelect}
          className="hidden"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={isSending}
              className="shrink-0"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top">
            <DropdownMenuItem onClick={() => openFilePicker("image")}>
              <Image className="h-4 w-4 mr-2" />
              Imagem
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openFilePicker("video")}>
              <Film className="h-4 w-4 mr-2" />
              Vídeo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openFilePicker("document")}>
              <FileText className="h-4 w-4 mr-2" />
              Documento
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openFilePicker("audio")}>
              <Mic className="h-4 w-4 mr-2" />
              Áudio
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Textarea
          placeholder={attachment ? "Adicione uma legenda..." : "Digite uma mensagem..."}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[44px] max-h-32 resize-none"
          rows={1}
          disabled={isSending}
        />
        <Button 
          size="icon" 
          onClick={handleSend} 
          disabled={(!message.trim() && !attachment) || isSending}
          className="shrink-0"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
