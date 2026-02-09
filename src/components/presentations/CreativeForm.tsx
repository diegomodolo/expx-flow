import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Upload, Loader2, X, GripVertical } from "lucide-react";
import { useCreatives } from "@/hooks/useCreatives";
import { usePresentationDetails, PresentationCreative, CreativeMedia } from "@/hooks/usePresentations";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ReelsCoverSection } from "@/components/shared/ReelsCoverSection";
import { useCompany } from "@/contexts/CompanyContext";

interface CreativeFormProps {
  presentationId: string;
  editingId: string | null;
  onClose: () => void;
}

const CREATIVE_TYPES = [
  { value: "post_unico", label: "Post Único" },
  { value: "carrossel", label: "Carrossel" },
  { value: "reels", label: "Reels" },
  { value: "stories", label: "Stories" },
];

interface SceneItem {
  scene: string;
  text: string;
}

export function CreativeForm({ presentationId, editingId, onClose }: CreativeFormProps) {
  const { toast } = useToast();
  const { createCreative, updateCreative } = useCreatives(presentationId);
  const { data: presentation } = usePresentationDetails(presentationId);
  const { activeCompany } = useCompany();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<{ file?: File; url: string; type: 'image' | 'video'; headline?: string; subheadline?: string }[]>([]);
  const [existingMedia, setExistingMedia] = useState<CreativeMedia[]>([]);
  
  const [formData, setFormData] = useState({
    creative_type: "post_unico" as PresentationCreative['creative_type'],
    scheduled_date: "",
    scheduled_time: "",
    objective: "",
    headline: "",
    subheadline: "",
    caption: "",
    hashtags: "",
    script: [] as SceneItem[],
    reels_cover_url: null as string | null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing creative data if editing
  // Track the original status for resetting on edit
  const [originalStatus, setOriginalStatus] = useState<string | null>(null);

  useEffect(() => {
    if (editingId && presentation?.creatives) {
      const creative = presentation.creatives.find(c => c.id === editingId);
      if (creative) {
        setFormData({
          creative_type: creative.creative_type,
          scheduled_date: creative.scheduled_date || "",
          scheduled_time: creative.scheduled_time?.slice(0, 5) || "",
          objective: creative.objective || "",
          headline: creative.headline || "",
          subheadline: creative.subheadline || "",
          caption: creative.caption || "",
          hashtags: creative.hashtags || "",
          script: creative.script || [],
          reels_cover_url: creative.reels_cover_url || null,
        });
        setExistingMedia(creative.creative_media || []);
        setOriginalStatus(creative.current_status || null);
      }
    }
  }, [editingId, presentation]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newMediaFiles = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' as const : 'image' as const,
    }));

    setMediaFiles(prev => [...prev, ...newMediaFiles]);
  };

  const removeMediaFile = (index: number) => {
    setMediaFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].url.startsWith('blob:')) {
        URL.revokeObjectURL(newFiles[index].url);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const removeExistingMedia = async (mediaId: string) => {
    setExistingMedia(prev => prev.filter(m => m.id !== mediaId));
    // Mark for deletion on save
  };

  const addScene = () => {
    setFormData(prev => ({
      ...prev,
      script: [...prev.script, { scene: `Cena ${prev.script.length + 1}`, text: "" }],
    }));
  };

  const updateScene = (index: number, field: 'scene' | 'text', value: string) => {
    setFormData(prev => ({
      ...prev,
      script: prev.script.map((s, i) => i === index ? { ...s, [field]: value } : s),
    }));
  };

  const removeScene = (index: number) => {
    setFormData(prev => ({
      ...prev,
      script: prev.script.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Calculate order_index
      const existingCreatives = presentation?.creatives || [];
      const orderIndex = editingId 
        ? existingCreatives.find(c => c.id === editingId)?.order_index || 0
        : existingCreatives.length;

      const creativeData = {
        presentation_id: presentationId,
        creative_type: formData.creative_type,
        order_index: orderIndex,
        scheduled_date: formData.scheduled_date || null,
        scheduled_time: formData.scheduled_time ? `${formData.scheduled_time}:00` : null,
        objective: formData.objective || null,
        headline: formData.headline || null,
        subheadline: formData.subheadline || null,
        caption: formData.caption || null,
        hashtags: formData.hashtags || null,
        script: formData.script,
        reels_cover_url: formData.reels_cover_url || null,
      };

      let creativeId: string;

      if (editingId) {
        // If editing a rejected creative, reset status to pending
        const updatePayload = originalStatus === 'rejected' 
          ? { id: editingId, ...creativeData, current_status: 'pending' as const }
          : { id: editingId, ...creativeData };
        await updateCreative.mutateAsync(updatePayload);
        creativeId = editingId;
      } else {
        const result = await createCreative.mutateAsync(creativeData);
        creativeId = result.id;
      }

      // Upload new media files
      if (mediaFiles.length > 0) {
        setUploadingMedia(true);
        
        for (let i = 0; i < mediaFiles.length; i++) {
          const mediaFile = mediaFiles[i];
          if (mediaFile.file) {
            // Upload file to storage
            const fileExt = mediaFile.file.name.split('.').pop()?.toLowerCase();
            const fileName = `${crypto.randomUUID()}.${fileExt}`;
            const filePath = `${presentationId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('presentation-media')
              .upload(filePath, mediaFile.file, {
                contentType: mediaFile.file.type,
              });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from('presentation-media')
              .getPublicUrl(filePath);

            // Add media record to database
            const { error: mediaError } = await supabase
              .from('creative_media')
              .insert({
                creative_id: creativeId,
                media_url: publicUrl,
                media_type: mediaFile.type,
                order_index: existingMedia.length + i,
                slide_headline: mediaFile.headline || null,
                slide_subheadline: mediaFile.subheadline || null,
              });

            if (mediaError) throw mediaError;
          }
        }
      }

      toast({
        title: editingId ? "Criativo atualizado" : "Criativo criado",
        description: "As alterações foram salvas com sucesso.",
      });
      
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setUploadingMedia(false);
    }
  };

  const isReels = formData.creative_type === 'reels';
  const isCarrossel = formData.creative_type === 'carrossel';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <h3 className="text-lg font-semibold">
          {editingId ? "Editar Criativo" : "Novo Criativo"}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tipo de Criativo</Label>
          <Select 
            value={formData.creative_type} 
            onValueChange={(v) => setFormData(prev => ({ ...prev, creative_type: v as any }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CREATIVE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Data</Label>
            <Input
              type="date"
              value={formData.scheduled_date}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
            />
          </div>
          <div>
            <Label>Hora</Label>
            <Input
              type="time"
              value={formData.scheduled_time}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div>
        <Label>Objetivo</Label>
        <Textarea
          value={formData.objective}
          onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))}
          placeholder="Descreva o objetivo deste criativo..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Headline</Label>
          <Input
            value={formData.headline}
            onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
            placeholder="Título principal"
          />
        </div>
        <div>
          <Label>Subheadline</Label>
          <Input
            value={formData.subheadline}
            onChange={(e) => setFormData(prev => ({ ...prev, subheadline: e.target.value }))}
            placeholder="Subtítulo"
          />
        </div>
      </div>

      {/* Media Upload */}
      <div>
        <Label className="mb-2 block">Mídias</Label>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,video/*"
          multiple={isCarrossel}
          className="hidden"
        />
        
        <div className="grid grid-cols-4 gap-3">
          {existingMedia.map((media) => (
            <div key={media.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
              {media.media_type === 'image' ? (
                <img src={media.media_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <video src={media.media_url} className="w-full h-full object-cover" />
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeExistingMedia(media.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}

          {mediaFiles.map((media, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
              {media.type === 'image' ? (
                <img src={media.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <video src={media.url} className="w-full h-full object-cover" />
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeMediaFile(index)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}

          <Button
            variant="outline"
            className="aspect-square flex flex-col gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-6 h-6" />
            <span className="text-xs">Upload</span>
          </Button>
        </div>
      </div>

      <div>
        <Label>Legenda</Label>
        <Textarea
          value={formData.caption}
          onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
          placeholder="Escreva a legenda do post..."
          rows={4}
        />
      </div>

      <div>
        <Label>Hashtags</Label>
        <Input
          value={formData.hashtags}
          onChange={(e) => setFormData(prev => ({ ...prev, hashtags: e.target.value }))}
          placeholder="#hashtag1 #hashtag2 #hashtag3"
        />
      </div>

      {/* Script for Reels */}
      {isReels && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Roteiro</CardTitle>
                <Button variant="outline" size="sm" onClick={addScene} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Cena
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.script.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma cena adicionada. Clique em "Adicionar Cena" para começar.
                </p>
              ) : (
                formData.script.map((scene, index) => (
                  <div key={index} className="flex gap-3 items-start p-3 bg-muted/50 rounded-lg">
                    <GripVertical className="w-4 h-4 mt-2 text-muted-foreground cursor-grab" />
                    <div className="flex-1 space-y-2">
                      <Input
                        value={scene.scene}
                        onChange={(e) => updateScene(index, 'scene', e.target.value)}
                        placeholder="Nome da cena"
                        className="font-medium"
                      />
                      <Textarea
                        value={scene.text}
                        onChange={(e) => updateScene(index, 'text', e.target.value)}
                        placeholder="Descrição/Texto da cena..."
                        rows={2}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeScene(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Reels Cover */}
          <ReelsCoverSection
            coverUrl={formData.reels_cover_url}
            onCoverChange={(url) => setFormData(prev => ({ ...prev, reels_cover_url: url }))}
            clientId={presentation?.client_id}
            companyId={activeCompany?.company_id}
            headline={formData.headline}
            subheadline={formData.subheadline}
            objective={formData.objective}
            script={formData.script.map(s => `${s.scene}: ${s.text}`).join('\n')}
            uploadBucket="presentation-media"
            uploadFolder={`${presentationId}/covers`}
          />
        </>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {uploadingMedia ? "Enviando mídias..." : "Salvando..."}
            </>
          ) : (
            editingId ? "Salvar Alterações" : "Criar Criativo"
          )}
        </Button>
      </div>
    </div>
  );
}
