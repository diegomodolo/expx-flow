import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { YouTubeScript, ScriptMessage } from "@/hooks/useYouTubeScripts";
import { ThumbnailConfig } from "@/hooks/useYouTubeThumbnails";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  Copy,
  Check,
  Image,
  Pencil,
  RefreshCw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import { GenerateThumbnailModal } from "./GenerateThumbnailModal";
import { ImageEditorModal } from "@/components/image-editor/ImageEditorModal";
import { SlidesSection } from "./SlidesSection";
import { useScriptBuilderPanelSizes } from "@/hooks/useScriptBuilderPanelSizes";

interface YouTubeScriptBuilderProps {
  script: YouTubeScript;
  onClose: () => void;
  onUpdate: (updates: Partial<YouTubeScript>) => Promise<void>;
  onSendMessage: (message: string) => Promise<any>;
  onGenerateTitles: (style: string) => Promise<any>;
  fetchMessages: () => Promise<ScriptMessage[]>;
  onGenerateThumbnail: (
    scriptId: string,
    title: string,
    scriptContent: string,
    suggestedTitles: string[]
  ) => Promise<string | null>;
  generatingThumbnail: boolean;
  thumbnailConfig: ThumbnailConfig | null;
  clientId: string;
  companyId: string;
}

export function YouTubeScriptBuilder({
  script,
  onClose,
  onUpdate,
  onSendMessage,
  onGenerateTitles,
  fetchMessages,
  onGenerateThumbnail,
  generatingThumbnail,
  thumbnailConfig,
  clientId,
  companyId,
}: YouTubeScriptBuilderProps) {
  const [content, setContent] = useState(script.script_content);
  const [title, setTitle] = useState(script.title);
  const [thumbnailUrl, setThumbnailUrl] = useState(script.thumbnail_url || null);
  const [messages, setMessages] = useState<ScriptMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [showThumbnailModal, setShowThumbnailModal] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    sizes,
    isLoaded,
    setHorizontalSizes,
    setLeftColumnSizes,
    setRightColumnSizes,
  } = useScriptBuilderPanelSizes();

  useEffect(() => {
    loadMessages();
  }, [script.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    const msgs = await fetchMessages();
    setMessages(msgs);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        title,
        script_content: content,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || sending) return;

    const userMessage = chatInput;
    setChatInput("");
    setSending(true);

    // Optimistically add user message
    setMessages((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        script_id: script.id,
        role: "user",
        content: userMessage,
        created_at: new Date().toISOString(),
      },
    ]);

    try {
      const result = await onSendMessage(userMessage);
      if (result?.response) {
        setMessages((prev) => [
          ...prev.filter((m) => !m.id.startsWith("temp-")),
          {
            id: `temp-user-${Date.now()}`,
            script_id: script.id,
            role: "user",
            content: userMessage,
            created_at: new Date().toISOString(),
          },
          {
            id: `temp-assistant-${Date.now()}`,
            script_id: script.id,
            role: "assistant",
            content: result.response,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateTitles = async (style: string) => {
    setGeneratingTitles(true);
    try {
      await onGenerateTitles(style);
    } finally {
      setGeneratingTitles(false);
    }
  };

  const handleSelectTitle = (newTitle: string) => {
    setTitle(newTitle);
  };

  const handleGenerateThumbnail = async () => {
    setThumbnailError(null);
    setShowThumbnailModal(true);
    
    try {
      const imageUrl = await onGenerateThumbnail(
        script.id,
        title,
        content,
        script.suggested_titles
      );
      
      console.log('Thumbnail generated, URL:', imageUrl);
      
      if (imageUrl) {
        // Update local state with the new thumbnail
        setThumbnailUrl(imageUrl);
        // Close progress modal first
        setShowThumbnailModal(false);
        // Set the image to edit and open editor
        setImageToEdit(imageUrl);
        // Small delay to ensure state is set before opening modal
        setTimeout(() => {
          setShowImageEditor(true);
        }, 100);
      } else {
        setThumbnailError("Não foi possível gerar a thumbnail");
      }
    } catch (error: any) {
      console.error('Thumbnail generation error:', error);
      setThumbnailError(error.message || "Erro desconhecido");
    }
  };

  // Generate thumbnail silently (for slides) - returns URL without opening editor
  const handleGenerateThumbnailForSlides = async (): Promise<string | null> => {
    try {
      const imageUrl = await onGenerateThumbnail(
        script.id,
        title,
        content,
        script.suggested_titles
      );
      
      if (imageUrl) {
        setThumbnailUrl(imageUrl);
        return imageUrl;
      }
      return null;
    } catch (error: any) {
      console.error('Thumbnail generation error:', error);
      return null;
    }
  };

  const handleEditThumbnail = () => {
    if (thumbnailUrl) {
      setImageToEdit(thumbnailUrl);
      setShowImageEditor(true);
    }
  };

  const handleImageEditorSave = async (newImages: string[]) => {
    // Update the script with the new thumbnail URL
    if (newImages.length > 0) {
      const newUrl = newImages[0];
      await onUpdate({ thumbnail_url: newUrl });
      setThumbnailUrl(newUrl);
    }
    setShowImageEditor(false);
    setImageToEdit(null);
  };

  // Don't render until sizes are loaded to prevent flicker
  if (!isLoaded) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold border-none px-0 h-auto focus-visible:ring-0"
              placeholder="Título do roteiro"
            />
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">
                {script.video_duration_target
                  ? `${Math.round(script.video_duration_target / 60)} min`
                  : "Duração não definida"}
              </Badge>
              <Badge variant="outline">{script.status}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? "Copiado!" : "Copiar"}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleGenerateThumbnail}
            disabled={generatingThumbnail}
          >
            {generatingThumbnail ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Image className="h-4 w-4 mr-2" />
            )}
            Gerar Thumb
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      {/* Main Content with Resizable Panels */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full rounded-lg"
          onLayout={(sizes) => {
            if (sizes.length === 2) {
              setHorizontalSizes(sizes[0], sizes[1]);
            }
          }}
        >
          {/* Left Column - Script Editor and Slides */}
          <ResizablePanel defaultSize={sizes.leftColumn} minSize={30}>
            <ResizablePanelGroup
              direction="vertical"
              className="h-full"
              onLayout={(sizes) => {
                if (sizes.length === 2) {
                  setLeftColumnSizes(sizes[0], sizes[1]);
                }
              }}
            >
              {/* Script Editor */}
              <ResizablePanel defaultSize={sizes.scriptEditor} minSize={20}>
                <Card className="h-full flex flex-col overflow-hidden">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Roteiro</CardTitle>
                      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")}>
                        <TabsList className="h-8">
                          <TabsTrigger value="edit" className="text-xs">Editar</TabsTrigger>
                          <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden pb-4">
                    {activeTab === "edit" ? (
                      <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="h-full font-mono text-sm resize-none"
                        placeholder="Escreva seu roteiro aqui..."
                      />
                    ) : (
                      <ScrollArea className="h-full">
                        <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
                          <ReactMarkdown>{content}</ReactMarkdown>
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Slides Section */}
              <ResizablePanel defaultSize={sizes.slidesSection} minSize={20}>
                <div className="h-full pt-2">
                  <SlidesSection
                    scriptId={script.id}
                    scriptContent={content}
                    scriptTitle={title}
                    clientId={clientId}
                    companyId={companyId}
                    thumbnailUrl={thumbnailUrl}
                    onGenerateThumbnailFirst={handleGenerateThumbnailForSlides}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Column - Thumbnail, Chat & Titles */}
          <ResizablePanel defaultSize={sizes.rightColumn} minSize={25}>
            <div className="h-full pl-2">
              <ResizablePanelGroup
                direction="vertical"
                className="h-full"
                onLayout={(sizes) => {
                  if (sizes.length === 3) {
                    setRightColumnSizes(sizes[0], sizes[1], sizes[2]);
                  }
                }}
              >
                {/* Thumbnail Preview */}
                <ResizablePanel defaultSize={sizes.thumbnail} minSize={15}>
                  <Card className="h-full flex flex-col overflow-hidden">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Thumbnail</CardTitle>
                        <div className="flex gap-2">
                          {thumbnailUrl && (
                            <Button variant="ghost" size="sm" onClick={handleEditThumbnail}>
                              <Pencil className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleGenerateThumbnail}
                            disabled={generatingThumbnail}
                          >
                            {generatingThumbnail ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-1" />
                            )}
                            {thumbnailUrl ? "Regerar" : "Gerar"}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden pb-4">
                      {thumbnailUrl ? (
                        <div 
                          className="relative h-full bg-muted rounded-lg overflow-hidden cursor-pointer group"
                          onClick={handleEditThumbnail}
                        >
                          <img 
                            src={thumbnailUrl} 
                            alt="Thumbnail" 
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Pencil className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="h-full bg-muted rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={handleGenerateThumbnail}
                        >
                          <Image className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Clique para gerar thumbnail</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Chat */}
                <ResizablePanel defaultSize={sizes.chat} minSize={20}>
                  <Card className="h-full flex flex-col overflow-hidden mt-2">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <CardTitle className="text-base">Chat com IA</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden pb-4">
                      <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-4">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                                  msg.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
                                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                              </div>
                            </div>
                          ))}
                          {sending && (
                            <div className="flex justify-start">
                              <div className="bg-muted rounded-lg px-3 py-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>
                      <div className="flex gap-2 mt-4 pt-4 border-t flex-shrink-0">
                        <Input
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Peça ajustes no roteiro..."
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                          disabled={sending}
                        />
                        <Button size="icon" onClick={handleSendMessage} disabled={sending || !chatInput.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Titles */}
                <ResizablePanel defaultSize={sizes.titles} minSize={15}>
                  <Card className="h-full flex flex-col overflow-hidden mt-2">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Títulos Sugeridos</CardTitle>
                        <Select onValueChange={handleGenerateTitles} disabled={generatingTitles}>
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue placeholder={generatingTitles ? "Gerando..." : "Gerar"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mixed">Variados</SelectItem>
                            <SelectItem value="curiosity">Curiosidade</SelectItem>
                            <SelectItem value="urgency">Urgência</SelectItem>
                            <SelectItem value="benefit">Benefício</SelectItem>
                            <SelectItem value="provocative">Provocativo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden pb-4">
                      <ScrollArea className="h-full">
                        <div className="space-y-2 pr-4">
                          {script.suggested_titles.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Clique em "Gerar" para criar títulos
                            </p>
                          ) : (
                            script.suggested_titles.map((t, i) => (
                              <Button
                                key={i}
                                variant={t === title ? "secondary" : "ghost"}
                                className="w-full justify-start h-auto py-2 px-3 text-left"
                                onClick={() => handleSelectTitle(t)}
                              >
                                <span className="line-clamp-2 text-sm">{t}</span>
                              </Button>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Thumbnail Generation Modal */}
      <GenerateThumbnailModal
        open={showThumbnailModal}
        onOpenChange={setShowThumbnailModal}
        generating={generatingThumbnail}
        error={thumbnailError}
      />

      {/* Image Editor Modal */}
      {showImageEditor && imageToEdit && (
        <ImageEditorModal
          open={showImageEditor}
          onOpenChange={(open) => {
            setShowImageEditor(open);
            if (!open) setImageToEdit(null);
          }}
          images={[imageToEdit]}
          onSave={handleImageEditorSave}
          clientId={clientId}
          companyId={companyId}
        />
      )}
    </div>
  );
}
