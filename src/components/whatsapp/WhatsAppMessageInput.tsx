import { useState, KeyboardEvent, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Paperclip, Image, FileText, Film, Mic, X, Square, Trash2, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { QuickReply } from "@/hooks/useWhatsAppQuickReplies";
import { WhatsAppQuickReplyPicker } from "./WhatsAppQuickReplyPicker";

export interface MediaAttachment {
  file: File;
  type: "image" | "video" | "document" | "audio" | "ptt";
  preview?: string;
}

interface WhatsAppMessageInputProps {
  onSend: (message: string) => void;
  onSendMedia?: (media: MediaAttachment, caption: string) => void;
  isSending: boolean;
  quickReplies?: QuickReply[];
  quickRepliesLoading?: boolean;
}

export function WhatsAppMessageInput({ 
  onSend, 
  onSendMedia, 
  isSending,
  quickReplies = [],
  quickRepliesLoading = false
}: WhatsAppMessageInputProps) {
  const [message, setMessage] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplySearch, setQuickReplySearch] = useState("");
  const [attachment, setAttachment] = useState<MediaAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [acceptTypes, setAcceptTypes] = useState<string>("");
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioPreviewUrl]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Try to use webm/opus first (better compatibility), fallback to other formats
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : 'audio/ogg';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        
        const url = URL.createObjectURL(blob);
        setAudioPreviewUrl(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error: any) {
      console.error("[WhatsAppMessageInput] Recording error:", error);
      if (error.name === 'NotAllowedError') {
        toast.error("Permissão para microfone negada. Por favor, permita o acesso ao microfone.");
      } else {
        toast.error("Erro ao iniciar gravação: " + (error.message || "Erro desconhecido"));
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    setAudioBlob(null);
    setRecordingDuration(0);
    
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [isRecording, audioPreviewUrl]);

  const sendAudioMessage = useCallback(() => {
    if (!audioBlob || !onSendMedia) return;

    // Create file from blob
    const extension = audioBlob.type.includes('webm') ? 'webm' 
      : audioBlob.type.includes('mp4') ? 'm4a' 
      : audioBlob.type.includes('ogg') ? 'ogg' 
      : 'mp3';
    
    const file = new File([audioBlob], `audio_${Date.now()}.${extension}`, { type: audioBlob.type });
    
    const mediaAttachment: MediaAttachment = {
      file,
      type: "ptt", // Push-to-talk (voice message)
    };

    onSendMedia(mediaAttachment, "");
    
    // Clean up
    setAudioBlob(null);
    setRecordingDuration(0);
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }
  }, [audioBlob, audioPreviewUrl, onSendMedia]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
    setShowQuickReplies(false);
    setQuickReplySearch("");
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    
    // Check for "/" trigger for quick replies
    if (value.startsWith("/")) {
      setShowQuickReplies(true);
      setQuickReplySearch(value.slice(1)); // Remove the "/" prefix
    } else {
      setShowQuickReplies(false);
      setQuickReplySearch("");
    }
  };

  const handleQuickReplySelect = async (quickReply: QuickReply) => {
    setShowQuickReplies(false);
    setQuickReplySearch("");
    
    if (quickReply.type === "text") {
      // For text, insert the text directly
      setMessage(quickReply.text || "");
    } else {
      // For media types, we need to send the media directly
      if (quickReply.file && onSendMedia) {
        try {
          // Fetch the file from URL and create a File object
          const response = await fetch(quickReply.file);
          const blob = await response.blob();
          
          const extension = quickReply.docName?.split('.').pop() || 
            (quickReply.type === 'image' ? 'jpg' : 
             quickReply.type === 'video' ? 'mp4' : 
             quickReply.type === 'audio' || quickReply.type === 'ptt' ? 'mp3' : 'pdf');
          
          const fileName = quickReply.docName || `quick_reply.${extension}`;
          const file = new File([blob], fileName, { type: blob.type });
          
          const mediaType: MediaAttachment['type'] = 
            quickReply.type === 'myaudio' ? 'audio' : quickReply.type;
          
          onSendMedia({ file, type: mediaType }, quickReply.text || "");
        } catch (error) {
          console.error("Error loading quick reply media:", error);
          toast.error("Erro ao carregar mídia da resposta rápida");
        }
      } else {
        setMessage("");
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Close quick replies on Escape
    if (e.key === "Escape" && showQuickReplies) {
      e.preventDefault();
      setShowQuickReplies(false);
      setQuickReplySearch("");
      setMessage("");
      return;
    }
    
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
      case "audio": 
      case "ptt":
        return <Mic className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const showMicButton = !message.trim() && !attachment && !isRecording && !audioBlob;

  // Recording UI
  if (isRecording) {
    return (
      <div className="flex flex-col border-t bg-background">
        <div className="flex items-center gap-3 p-3">
          {/* Cancel button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={cancelRecording}
            className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-5 w-5" />
          </Button>

          {/* Recording indicator */}
          <div className="flex-1 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-medium text-destructive">Gravando</span>
            </div>
            <span className="text-sm text-muted-foreground font-mono">
              {formatDuration(recordingDuration)}
            </span>
            
            {/* Simple waveform animation */}
            <div className="flex items-center gap-0.5 h-6">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-destructive/60 rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 100}%`,
                    minHeight: '4px',
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Stop/Send button */}
          <Button
            size="icon"
            onClick={stopRecording}
            className="shrink-0"
          >
            <Square className="h-4 w-4 fill-current" />
          </Button>
        </div>
      </div>
    );
  }

  // Audio preview UI (after recording)
  if (audioBlob && audioPreviewUrl) {
    return (
      <div className="flex flex-col border-t bg-background">
        <div className="flex items-center gap-3 p-3">
          {/* Cancel/Delete button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={cancelRecording}
            className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-5 w-5" />
          </Button>

          {/* Audio player preview */}
          <div className="flex-1 flex items-center gap-3 bg-muted/50 rounded-full px-4 py-2">
            <Mic className="h-4 w-4 text-primary shrink-0" />
            <audio 
              src={audioPreviewUrl} 
              controls 
              className="flex-1 h-8"
              style={{ maxWidth: '100%' }}
            />
            <span className="text-xs text-muted-foreground font-mono shrink-0">
              {formatDuration(recordingDuration)}
            </span>
          </div>

          {/* Send button */}
          <Button
            size="icon"
            onClick={sendAudioMessage}
            disabled={isSending}
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

  return (
    <div className="flex flex-col border-t bg-background relative">
      {/* Quick replies dropdown */}
      {showQuickReplies && quickReplies.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-1 mx-3 z-50">
          <WhatsAppQuickReplyPicker
            quickReplies={quickReplies}
            isLoading={quickRepliesLoading}
            onSelect={handleQuickReplySelect}
            searchTerm={quickReplySearch}
            showAsPopover={false}
            onClose={() => {
              setShowQuickReplies(false);
              setQuickReplySearch("");
            }}
          />
        </div>
      )}

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

        {/* Quick replies button */}
        <WhatsAppQuickReplyPicker
          quickReplies={quickReplies}
          isLoading={quickRepliesLoading}
          onSelect={handleQuickReplySelect}
          showAsPopover={true}
        />

        <Textarea
          placeholder={attachment ? "Adicione uma legenda..." : "Digite / para respostas rápidas..."}
          value={message}
          onChange={(e) => handleMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[44px] max-h-32 resize-none"
          rows={1}
          disabled={isSending}
        />

        {/* Show mic button when no text, otherwise show send */}
        {showMicButton ? (
          <Button 
            size="icon" 
            onClick={startRecording}
            disabled={isSending}
            className="shrink-0"
            title="Gravar mensagem de voz"
          >
            <Mic className="h-4 w-4" />
          </Button>
        ) : (
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
        )}
      </div>
    </div>
  );
}
