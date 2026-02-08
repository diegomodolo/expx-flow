import { useState } from "react";
import { YouTubeSlide } from "@/hooks/useYouTubeSlides";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Trash2,
  GripVertical,
  Check,
  X,
  Pencil,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SlideStructureEditorProps {
  slides: YouTubeSlide[];
  onUpdateSlide: (slideId: string, updates: Partial<YouTubeSlide>) => Promise<boolean>;
  onDeleteSlide: (slideId: string) => Promise<boolean>;
  onReorderSlide: (slideId: string, newOrder: number) => Promise<boolean>;
}

export function SlideStructureEditor({
  slides,
  onUpdateSlide,
  onDeleteSlide,
  onReorderSlide,
}: SlideStructureEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    content: string;
    visual_suggestion: string;
  }>({ title: "", content: "", visual_suggestion: "" });

  const startEditing = (slide: YouTubeSlide) => {
    setEditingId(slide.id);
    setEditForm({
      title: slide.title,
      content: slide.content || "",
      visual_suggestion: slide.visual_suggestion || "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ title: "", content: "", visual_suggestion: "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    
    const success = await onUpdateSlide(editingId, {
      title: editForm.title,
      content: editForm.content,
      visual_suggestion: editForm.visual_suggestion,
    });
    
    if (success) {
      setEditingId(null);
    }
  };

  const moveSlide = async (slide: YouTubeSlide, direction: "up" | "down") => {
    const currentIndex = slides.findIndex(s => s.id === slide.id);
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= slides.length) return;
    
    // Swap orders
    const otherSlide = slides[newIndex];
    await onReorderSlide(slide.id, otherSlide.slide_order);
    await onReorderSlide(otherSlide.id, slide.slide_order);
  };

  const getStatusBadge = (status: YouTubeSlide["status"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-primary text-primary-foreground">Pronto</Badge>;
      case "generating":
        return <Badge variant="secondary">Gerando...</Badge>;
      case "error":
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="outline">Rascunho</Badge>;
    }
  };

  if (slides.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum slide para editar</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 pr-4">
        {slides.map((slide, index) => (
          <Card
            key={slide.id}
            className={cn(
              "transition-colors",
              editingId === slide.id && "ring-2 ring-primary"
            )}
          >
            <CardContent className="p-3">
              {editingId === slide.id ? (
                // Edit mode
                <div className="space-y-3">
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Título do slide"
                    className="font-medium"
                  />
                  <Textarea
                    value={editForm.content}
                    onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Conteúdo (bullets)"
                    rows={3}
                    className="text-sm"
                  />
                  <Textarea
                    value={editForm.visual_suggestion}
                    onChange={(e) => setEditForm(prev => ({ ...prev, visual_suggestion: e.target.value }))}
                    placeholder="Sugestão visual para a imagem"
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={cancelEditing}>
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={saveEdit}>
                      <Check className="h-4 w-4 mr-1" />
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="flex items-start gap-3">
                  {/* Order controls */}
                  <div className="flex flex-col items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveSlide(slide, "up")}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium text-muted-foreground">
                      {slide.slide_order}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveSlide(slide, "down")}
                      disabled={index === slides.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{slide.title}</h4>
                      {getStatusBadge(slide.status)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {slide.content || "Sem conteúdo definido"}
                    </p>
                    {slide.visual_suggestion && (
                      <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                        Visual: {slide.visual_suggestion}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEditing(slide)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDeleteSlide(slide.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
