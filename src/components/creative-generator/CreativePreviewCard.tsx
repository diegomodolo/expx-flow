import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Heart, 
  MessageCircle, 
  Send, 
  Bookmark, 
  MoreHorizontal,
  Download,
  Save,
  Calendar,
  RefreshCw,
  ThumbsUp,
  Share2,
  MessageSquare,
  Edit2,
  Check,
  X
} from "lucide-react";

interface CreativePreviewCardProps {
  imageUrl: string;
  caption: string;
  typeName: string;
  clientName: string;
  clientAvatar?: string;
  isRegenerating?: boolean;
  onCaptionChange: (newCaption: string) => void;
  onDownload: () => void;
  onSave: () => void;
  onSchedule: () => void;
  onRegenerate: () => void;
}

export function CreativePreviewCard({
  imageUrl,
  caption,
  typeName,
  clientName,
  clientAvatar,
  isRegenerating,
  onCaptionChange,
  onDownload,
  onSave,
  onSchedule,
  onRegenerate,
}: CreativePreviewCardProps) {
  const [activeTab, setActiveTab] = useState<"instagram" | "facebook">("instagram");
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState(caption);

  const handleSaveCaption = () => {
    onCaptionChange(editedCaption);
    setIsEditingCaption(false);
  };

  const handleCancelEdit = () => {
    setEditedCaption(caption);
    setIsEditingCaption(false);
  };

  // Update edited caption when prop changes
  React.useEffect(() => {
    setEditedCaption(caption);
  }, [caption]);

  return (
    <Card className="overflow-hidden">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "instagram" | "facebook")}>
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <Badge variant="secondary">{typeName}</Badge>
            <TabsList className="h-8">
              <TabsTrigger value="instagram" className="text-xs h-7 px-2 gap-1">
                <InstagramIcon className="w-3 h-3" />
                Instagram
              </TabsTrigger>
              <TabsTrigger value="facebook" className="text-xs h-7 px-2 gap-1">
                <FacebookIcon className="w-3 h-3" />
                Facebook
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Instagram Preview */}
        <TabsContent value="instagram" className="mt-0">
          <div className="bg-white dark:bg-zinc-900">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-[2px]">
                  <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
                    {clientAvatar ? (
                      <img src={clientAvatar} alt={clientName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-foreground">
                        {clientName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">{clientName}</span>
                  <span className="text-[10px] text-muted-foreground">Patrocinado</span>
                </div>
              </div>
              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
            </div>

            {/* Image */}
            <div className="aspect-square bg-muted relative">
              <img
                src={imageUrl}
                alt="Criativo gerado"
                className="w-full h-full object-cover"
              />
              {isRegenerating && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Heart className="w-6 h-6 text-foreground cursor-pointer hover:text-red-500 transition-colors" />
                  <MessageCircle className="w-6 h-6 text-foreground cursor-pointer" />
                  <Send className="w-6 h-6 text-foreground cursor-pointer" />
                </div>
                <Bookmark className="w-6 h-6 text-foreground cursor-pointer" />
              </div>

              {/* Caption with edit */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Legenda:</span>
                  {!isEditingCaption && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setIsEditingCaption(true)}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                  )}
                </div>
                
                {isEditingCaption ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedCaption}
                      onChange={(e) => setEditedCaption(e.target.value)}
                      rows={4}
                      className="text-sm resize-none"
                      placeholder="Digite a legenda..."
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={handleCancelEdit}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleSaveCaption}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-foreground">
                    <span className="font-semibold">{clientName}</span>{" "}
                    {caption || "Adicione uma legenda..."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Facebook Preview */}
        <TabsContent value="facebook" className="mt-0">
          <div className="bg-white dark:bg-zinc-900">
            {/* Header */}
            <div className="p-3 space-y-2 border-b">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden">
                  {clientAvatar ? (
                    <img src={clientAvatar} alt={clientName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-primary-foreground">
                      {clientName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">{clientName}</span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Patrocinado</span>
                    <span>·</span>
                    <span>🌐</span>
                  </div>
                </div>
              </div>

              {/* Caption with edit */}
              <div className="space-y-2">
                {isEditingCaption ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedCaption}
                      onChange={(e) => setEditedCaption(e.target.value)}
                      rows={4}
                      className="text-sm resize-none"
                      placeholder="Digite a legenda..."
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={handleCancelEdit}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleSaveCaption}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-foreground flex-1">
                      {caption || "Adicione uma legenda..."}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs shrink-0"
                      onClick={() => setIsEditingCaption(true)}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Image */}
            <div className="aspect-square bg-muted relative">
              <img
                src={imageUrl}
                alt="Criativo gerado"
                className="w-full h-full object-cover"
              />
              {isRegenerating && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>

            {/* Engagement Stats */}
            <div className="px-3 py-2 flex items-center justify-between text-xs text-muted-foreground border-b">
              <div className="flex items-center gap-1">
                <div className="flex -space-x-1">
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <ThumbsUp className="w-2.5 h-2.5 text-white" />
                  </div>
                  <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                    <Heart className="w-2.5 h-2.5 text-white fill-white" />
                  </div>
                </div>
                <span>1,2 mil</span>
              </div>
              <span>48 comentários · 12 compartilhamentos</span>
            </div>

            {/* Actions */}
            <div className="px-3 py-2 grid grid-cols-3 gap-1">
              <button className="flex items-center justify-center gap-2 py-2 hover:bg-muted rounded transition-colors">
                <ThumbsUp className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Curtir</span>
              </button>
              <button className="flex items-center justify-center gap-2 py-2 hover:bg-muted rounded transition-colors">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Comentar</span>
              </button>
              <button className="flex items-center justify-center gap-2 py-2 hover:bg-muted rounded transition-colors">
                <Share2 className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Enviar</span>
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <CardContent className="p-4 border-t bg-muted/30">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onDownload}>
            <Download className="w-4 h-4 mr-1" />
            Baixar
          </Button>
          <Button size="sm" variant="outline" onClick={onSave}>
            <Save className="w-4 h-4 mr-1" />
            Salvar
          </Button>
          <Button size="sm" variant="outline" onClick={onSchedule}>
            <Calendar className="w-4 h-4 mr-1" />
            Agendar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isRegenerating ? "animate-spin" : ""}`} />
            Nova Versão
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Instagram Icon Component
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

// Facebook Icon Component
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
