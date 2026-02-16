import React, { useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Upload, X, GripVertical, Play, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PostType = 'feed' | 'stories' | 'reels';

export interface CreativeFile {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video';
  file?: File;
  localPreview?: string;
}

export interface CreativeData {
  post_type: PostType;
  caption: string;
  files: CreativeFile[];
}

interface CreativeTaskPanelProps {
  data: CreativeData;
  onChange: (data: CreativeData) => void;
  companyId?: string;
  taskId?: string;
  clientName?: string;
  clientAvatar?: string;
}

export function CreativeTaskPanel({ data, onChange, companyId, taskId, clientName, clientAvatar }: CreativeTaskPanelProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const isVideoType = data.post_type === 'stories' || data.post_type === 'reels';
  const acceptTypes = isVideoType ? 'video/*' : 'image/*';
  const maxFiles = isVideoType ? 1 : 10;

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    const remaining = maxFiles - data.files.length;
    const filesToAdd = selectedFiles.slice(0, remaining);

    const newFiles: CreativeFile[] = filesToAdd.map(file => ({
      id: crypto.randomUUID(),
      url: '',
      name: file.name,
      type: file.type.startsWith('video') ? 'video' : 'image',
      file,
      localPreview: URL.createObjectURL(file),
    }));

    onChange({ ...data, files: [...data.files, ...newFiles] });

    // Upload files to storage
    if (companyId) {
      setUploading(true);
      try {
        const uploadedFiles = await Promise.all(
          newFiles.map(async (f) => {
            if (!f.file) return f;
            const ext = f.name.split('.').pop();
            const path = `${companyId}/${taskId || 'new'}/${f.id}.${ext}`;
            const { error } = await supabase.storage
              .from('task-creatives')
              .upload(path, f.file, { upsert: true });

            if (error) {
              console.error('Upload error:', error);
              toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
              return f;
            }

            const { data: urlData } = supabase.storage.from('task-creatives').getPublicUrl(path);
            return { ...f, url: urlData.publicUrl, file: undefined, localPreview: undefined };
          })
        );

        onChange({
          ...data,
          files: [
            ...data.files,
            ...uploadedFiles,
          ],
        });
      } finally {
        setUploading(false);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [data, companyId, taskId, maxFiles, onChange, toast]);

  const removeFile = (id: string) => {
    const updated = data.files.filter(f => f.id !== id);
    onChange({ ...data, files: updated });
    if (currentSlide >= updated.length && updated.length > 0) {
      setCurrentSlide(updated.length - 1);
    } else if (updated.length === 0) {
      setCurrentSlide(0);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newFiles = [...data.files];
    const [moved] = newFiles.splice(draggedIndex, 1);
    newFiles.splice(index, 0, moved);
    onChange({ ...data, files: newFiles });
    setDraggedIndex(null);
    setDragOverIndex(null);
    setCurrentSlide(index);
  };

  const handlePostTypeChange = (type: PostType) => {
    // Clear files if switching between image/video types
    const wasVideo = data.post_type === 'stories' || data.post_type === 'reels';
    const isNowVideo = type === 'stories' || type === 'reels';
    const shouldClear = wasVideo !== isNowVideo;
    onChange({
      ...data,
      post_type: type,
      files: shouldClear ? [] : data.files,
    });
    setCurrentSlide(0);
  };

  const previewFile = data.files[currentSlide];
  const previewSrc = previewFile?.localPreview || previewFile?.url;

  // Aspect ratio based on post type
  const getAspectClass = () => {
    switch (data.post_type) {
      case 'stories':
      case 'reels':
        return 'aspect-[9/16]';
      default:
        return 'aspect-[4/5]';
    }
  };

  const isCarousel = data.post_type === 'feed' && data.files.length > 1;

  const goToPrevSlide = () => {
    setCurrentSlide(prev => Math.max(0, prev - 1));
  };

  const goToNextSlide = () => {
    setCurrentSlide(prev => Math.min(data.files.length - 1, prev + 1));
  };

  return (
    <div className="grid grid-cols-2 gap-6 mt-4">
      {/* Left: Instagram Preview */}
      <div className="flex flex-col items-center">
        <div className="w-full max-w-[360px] bg-background border border-border rounded-xl overflow-hidden shadow-lg">
          {/* Header */}
          <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 p-0.5">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                {clientAvatar ? (
                  <img src={clientAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-foreground">
                    {(clientName || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <span className="text-sm font-semibold text-foreground flex-1 truncate">
              {clientName || 'Seu Perfil'}
            </span>
            <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Media Area */}
          <div className={`relative bg-muted ${getAspectClass()} flex items-center justify-center overflow-hidden`}>
            {previewSrc ? (
              previewFile?.type === 'video' ? (
                <video
                  src={previewSrc}
                  className="w-full h-full object-cover"
                  controls={false}
                  muted
                  loop
                  autoPlay
                  playsInline
                />
              ) : (
                <img src={previewSrc} alt="" className="w-full h-full object-cover" />
              )
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <ImageIcon className="w-16 h-16 opacity-30" />
                <span className="text-sm">Adicione um arquivo</span>
              </div>
            )}

            {/* Carousel navigation arrows */}
            {isCarousel && (
              <>
                {currentSlide > 0 && (
                  <button
                    onClick={goToPrevSlide}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center shadow-md hover:bg-background transition-colors z-10"
                  >
                    <ChevronLeft className="w-4 h-4 text-foreground" />
                  </button>
                )}
                {currentSlide < data.files.length - 1 && (
                  <button
                    onClick={goToNextSlide}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center shadow-md hover:bg-background transition-colors z-10"
                  >
                    <ChevronRight className="w-4 h-4 text-foreground" />
                  </button>
                )}
              </>
            )}

            {/* Carousel dots */}
            {isCarousel && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {data.files.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === currentSlide ? 'bg-primary w-3' : 'bg-muted-foreground/50'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Carousel counter */}
            {isCarousel && (
              <div className="absolute top-3 right-3 bg-background/70 backdrop-blur-sm text-foreground text-xs font-medium px-2 py-1 rounded-full">
                {currentSlide + 1}/{data.files.length}
              </div>
            )}

            {/* Video play overlay */}
            {previewFile?.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center">
                  <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {data.post_type === 'feed' && (
            <>
              <div className="flex items-center px-3 py-2.5">
                <div className="flex items-center gap-4 flex-1">
                  <Heart className="w-6 h-6 text-foreground" />
                  <MessageCircle className="w-6 h-6 text-foreground" />
                  <Send className="w-6 h-6 text-foreground" />
                </div>
                <Bookmark className="w-6 h-6 text-foreground" />
              </div>

              {/* Likes */}
              <div className="px-3 pb-1">
                <span className="text-sm font-semibold text-foreground">♥ 0 curtidas</span>
              </div>

              {/* Caption Preview */}
              {data.caption && (
                <div className="px-3 pb-3">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{clientName || 'perfil'} </span>
                    {data.caption.length > 100 ? data.caption.substring(0, 100) + '...' : data.caption}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: Controls */}
      <div className="space-y-4">
        {/* Post Type */}
        <div>
          <Label className="text-sm font-semibold">Tipo do Post</Label>
          <Select value={data.post_type} onValueChange={(v) => handlePostTypeChange(v as PostType)}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="feed">Feed</SelectItem>
              <SelectItem value="stories">Stories</SelectItem>
              <SelectItem value="reels">Reels</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* File Upload */}
        <div>
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {uploading ? 'Enviando...' : 'Adicionar Arquivo'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isVideoType ? 'Vídeo' : `Imagem${data.post_type === 'feed' ? ' (até 10 para carrossel)' : ''}`}
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptTypes}
            multiple={!isVideoType}
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* File List (draggable for carousel) */}
        {data.files.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">
              Arquivos ({data.files.length})
              {data.files.length > 1 && <span className="text-xs text-muted-foreground ml-1">— arraste para reordenar</span>}
            </Label>
            <div className="space-y-1">
              {data.files.map((file, index) => (
                <div
                  key={file.id}
                  draggable={data.files.length > 1}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
                  onClick={() => setCurrentSlide(index)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-pointer transition-all text-sm
                    ${index === currentSlide ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}
                    ${dragOverIndex === index ? 'border-primary border-dashed' : ''}
                    ${draggedIndex === index ? 'opacity-50' : ''}
                  `}
                >
                  {data.files.length > 1 && (
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0 cursor-grab" />
                  )}
                  <div className="w-8 h-8 rounded bg-muted overflow-hidden shrink-0">
                    {file.type === 'video' ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ) : (
                      <img src={file.localPreview || file.url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <span className="flex-1 truncate text-foreground">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Caption */}
        <div>
          <Label className="text-sm font-semibold">Texto do Post</Label>
          <Textarea
            value={data.caption}
            onChange={(e) => onChange({ ...data, caption: e.target.value })}
            placeholder="Escreva a legenda do post..."
            className="mt-1.5 min-h-[120px] resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {data.caption.length} caracteres
          </p>
        </div>
      </div>
    </div>
  );
}
