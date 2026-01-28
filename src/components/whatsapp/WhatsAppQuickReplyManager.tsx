import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Settings, Plus, Pencil, Trash2, FileText, Image, Video, Mic, File, Loader2, X, Upload, Link } from 'lucide-react';
import { QuickReply, QuickReplyInput, useWhatsAppQuickReplies } from '@/hooks/useWhatsAppQuickReplies';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WhatsAppVoiceRecorder } from './WhatsAppVoiceRecorder';

interface WhatsAppQuickReplyManagerProps {
  instanceId: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const getTypeIcon = (type: QuickReply['type']) => {
  switch (type) {
    case 'text':
      return <FileText className="h-4 w-4" />;
    case 'image':
      return <Image className="h-4 w-4" />;
    case 'video':
      return <Video className="h-4 w-4" />;
    case 'audio':
    case 'myaudio':
    case 'ptt':
      return <Mic className="h-4 w-4" />;
    case 'document':
      return <File className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getTypeLabel = (type: QuickReply['type']) => {
  switch (type) {
    case 'text': return 'Texto';
    case 'image': return 'Imagem';
    case 'video': return 'Vídeo';
    case 'audio': return 'Áudio';
    case 'myaudio': return 'Meu Áudio';
    case 'ptt': return 'Mensagem de Voz';
    case 'document': return 'Documento';
    default: return type;
  }
};

export const WhatsAppQuickReplyManager: React.FC<WhatsAppQuickReplyManagerProps> = ({
  instanceId,
  open: controlledOpen,
  onOpenChange
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Support both controlled and uncontrolled modes
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [mediaMode, setMediaMode] = useState<'upload' | 'url' | 'record'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    quickReplies,
    isLoading,
    createQuickReply,
    updateQuickReply,
    deleteQuickReply,
    isCreating,
    isUpdating,
    isDeleting
  } = useWhatsAppQuickReplies(instanceId);

  const [formData, setFormData] = useState<QuickReplyInput>({
    shortCut: '',
    type: 'text',
    text: ''
  });

  const getAcceptedFileTypes = (type: QuickReply['type']): string => {
    switch (type) {
      case 'image': return 'image/jpeg,image/png,image/gif,image/webp';
      case 'video': return 'video/mp4,video/quicktime,video/webm';
      case 'audio':
      case 'ptt':
        return 'audio/mpeg,audio/ogg,audio/wav,audio/mp4,audio/webm';
      case 'document': return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip';
      default: return '*/*';
    }
  };

  const uploadFileToStorage = async (file: File): Promise<string | null> => {
    try {
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${instanceId}/${timestamp}_${sanitizedName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('whatsapp-quick-replies')
        .upload(filePath, file, {
          cacheControl: '31536000',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Erro ao fazer upload do arquivo');
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('whatsapp-quick-replies')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Erro ao fazer upload do arquivo');
      return null;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-set docName for documents
      if (formData.type === 'document' && !formData.docName) {
        setFormData(prev => ({ ...prev, docName: file.name }));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      shortCut: '',
      type: 'text',
      text: ''
    });
    setEditingReply(null);
    setIsFormOpen(false);
    setSelectedFile(null);
    setRecordedBlob(null);
    setRecordedDuration(0);
    setMediaMode('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRecordingComplete = (blob: Blob, duration: number) => {
    setRecordedBlob(blob);
    setRecordedDuration(duration);
  };

  const uploadBlobToStorage = async (blob: Blob, fileName: string): Promise<string | null> => {
    try {
      const timestamp = Date.now();
      const filePath = `${instanceId}/${timestamp}_${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('whatsapp-quick-replies')
        .upload(filePath, blob, {
          cacheControl: '31536000',
          upsert: true,
          contentType: blob.type,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Erro ao fazer upload do arquivo');
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('whatsapp-quick-replies')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Erro ao fazer upload do arquivo');
      return null;
    }
  };

  const handleEdit = (reply: QuickReply) => {
    setEditingReply(reply);
    setFormData({
      id: reply.id,
      shortCut: reply.shortCut,
      type: reply.type,
      text: reply.text || '',
      file: reply.file || '',
      docName: reply.docName || ''
    });
    // If editing a media reply with existing URL, default to URL mode
    if (reply.file && reply.type !== 'text') {
      setMediaMode('url');
    } else {
      setMediaMode('upload');
    }
    setSelectedFile(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let fileUrl = formData.file;

      // Upload recorded audio
      if (recordedBlob && mediaMode === 'record') {
        setIsUploading(true);
        const uploadedUrl = await uploadBlobToStorage(recordedBlob, 'voice_message.webm');
        if (!uploadedUrl) {
          setIsUploading(false);
          return;
        }
        fileUrl = uploadedUrl;
        setIsUploading(false);
      }
      // Upload file if selected
      else if (selectedFile && mediaMode === 'upload') {
        setIsUploading(true);
        const uploadedUrl = await uploadFileToStorage(selectedFile);
        if (!uploadedUrl) {
          setIsUploading(false);
          return;
        }
        fileUrl = uploadedUrl;
        setIsUploading(false);
      }

      const dataToSave = {
        ...formData,
        file: fileUrl
      };

      if (editingReply) {
        await updateQuickReply(dataToSave);
      } else {
        await createQuickReply(dataToSave);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving quick reply:', error);
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    
    try {
      await deleteQuickReply(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting quick reply:', error);
    }
  };

  const isMediaType = formData.type !== 'text';

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Gerenciar Respostas Rápidas</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!isFormOpen ? (
              <>
                <div className="flex justify-end">
                  <Button onClick={() => setIsFormOpen(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Resposta
                  </Button>
                </div>

                <ScrollArea className="h-[400px] pr-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : quickReplies.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma resposta rápida cadastrada</p>
                      <p className="text-sm">Clique em "Nova Resposta" para criar</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {quickReplies.map((reply) => (
                        <div
                          key={reply.id}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-shrink-0 mt-1 text-muted-foreground">
                            {getTypeIcon(reply.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">/{reply.shortCut}</span>
                              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {getTypeLabel(reply.type)}
                              </span>
                              {reply.onWhatsApp && (
                                <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                                  WhatsApp
                                </span>
                              )}
                            </div>
                            {reply.text && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {reply.text}
                              </p>
                            )}
                            {reply.docName && (
                              <p className="text-xs text-muted-foreground mt-1">
                                📎 {reply.docName}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0 flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(reply)}
                              disabled={reply.onWhatsApp}
                              title={reply.onWhatsApp ? 'Não é possível editar templates do WhatsApp' : 'Editar'}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(reply.id)}
                              disabled={reply.onWhatsApp}
                              title={reply.onWhatsApp ? 'Não é possível excluir templates do WhatsApp' : 'Excluir'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    {editingReply ? 'Editar Resposta Rápida' : 'Nova Resposta Rápida'}
                  </h3>
                  <Button type="button" variant="ghost" size="icon" onClick={resetForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <Separator />

                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shortCut">Atalho *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">/</span>
                        <Input
                          id="shortCut"
                          value={formData.shortCut}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            shortCut: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') 
                          }))}
                          placeholder="saudacao"
                          className="pl-7"
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Use apenas letras, números e underscore
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">Tipo *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: QuickReply['type']) => 
                          setFormData(prev => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Texto</SelectItem>
                          <SelectItem value="image">Imagem</SelectItem>
                          <SelectItem value="video">Vídeo</SelectItem>
                          <SelectItem value="audio">Áudio</SelectItem>
                          <SelectItem value="ptt">Mensagem de Voz</SelectItem>
                          <SelectItem value="document">Documento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.type === 'text' ? (
                    <div className="space-y-2">
                      <Label htmlFor="text">Mensagem *</Label>
                      <Textarea
                        id="text"
                        value={formData.text || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                        placeholder="Digite a mensagem..."
                        rows={4}
                        required
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <Label>Arquivo *</Label>
                        
                        {/* Show record option for audio types */}
                        {(formData.type === 'audio' || formData.type === 'ptt') ? (
                          <Tabs value={mediaMode} onValueChange={(v) => setMediaMode(v as 'upload' | 'url' | 'record')} className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="record" className="flex items-center gap-2">
                                <Mic className="h-4 w-4" />
                                Gravar
                              </TabsTrigger>
                              <TabsTrigger value="upload" className="flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                Upload
                              </TabsTrigger>
                              <TabsTrigger value="url" className="flex items-center gap-2">
                                <Link className="h-4 w-4" />
                                URL
                              </TabsTrigger>
                            </TabsList>
                          </Tabs>
                        ) : (
                          <Tabs value={mediaMode === 'record' ? 'upload' : mediaMode} onValueChange={(v) => setMediaMode(v as 'upload' | 'url')} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="upload" className="flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                Upload
                              </TabsTrigger>
                              <TabsTrigger value="url" className="flex items-center gap-2">
                                <Link className="h-4 w-4" />
                                URL
                              </TabsTrigger>
                            </TabsList>
                          </Tabs>
                        )}

                        {/* Record mode - only for audio types */}
                        {mediaMode === 'record' && (formData.type === 'audio' || formData.type === 'ptt') && (
                          <WhatsAppVoiceRecorder
                            onRecordingComplete={handleRecordingComplete}
                            onCancel={() => {
                              setRecordedBlob(null);
                              setRecordedDuration(0);
                            }}
                            isUploading={isUploading}
                          />
                        )}

                        {/* Upload mode */}
                        {mediaMode === 'upload' && (
                          <div className="space-y-2">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept={getAcceptedFileTypes(formData.type)}
                              onChange={handleFileSelect}
                              className="hidden"
                              id="file-upload"
                            />
                            
                            <div 
                              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              {selectedFile ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-center gap-2 text-primary">
                                    {getTypeIcon(formData.type)}
                                    <span className="font-medium">{selectedFile.name}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedFile(null);
                                      if (fileInputRef.current) {
                                        fileInputRef.current.value = '';
                                      }
                                    }}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Remover
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground">
                                    Clique para selecionar um arquivo
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formData.type === 'image' && 'JPG, PNG, GIF, WebP (máx. 50MB)'}
                                    {formData.type === 'video' && 'MP4, MOV, WebM (máx. 50MB)'}
                                    {(formData.type === 'audio' || formData.type === 'ptt') && 'MP3, OGG, WAV (máx. 50MB)'}
                                    {formData.type === 'document' && 'PDF, DOC, XLS, PPT, TXT, ZIP (máx. 50MB)'}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* URL mode */}
                        {mediaMode === 'url' && (
                          <div className="space-y-2">
                            <Input
                              id="file"
                              value={formData.file || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, file: e.target.value }))}
                              placeholder="https://exemplo.com/arquivo.pdf"
                              required={mediaMode === 'url'}
                            />
                            <p className="text-xs text-muted-foreground">
                              URL pública do arquivo
                            </p>
                          </div>
                        )}
                      </div>

                      {formData.type === 'document' && (
                        <div className="space-y-2">
                          <Label htmlFor="docName">Nome do Arquivo</Label>
                          <Input
                            id="docName"
                            value={formData.docName || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, docName: e.target.value }))}
                            placeholder="documento.pdf"
                          />
                        </div>
                      )}

                      {/* Hide caption for voice messages in record mode */}
                      {!(mediaMode === 'record' && formData.type === 'ptt') && (
                        <div className="space-y-2">
                          <Label htmlFor="caption">Legenda (opcional)</Label>
                          <Textarea
                            id="caption"
                            value={formData.text || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                            placeholder="Legenda da mídia..."
                            rows={2}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                <Separator />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm} disabled={isUploading}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={
                      isCreating || 
                      isUpdating || 
                      isUploading || 
                      (formData.type !== 'text' && (
                        (mediaMode === 'upload' && !selectedFile && !formData.file) ||
                        (mediaMode === 'record' && !recordedBlob && !formData.file) ||
                        (mediaMode === 'url' && !formData.file)
                      ))
                    }
                  >
                    {(isCreating || isUpdating || isUploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {isUploading ? 'Enviando...' : editingReply ? 'Salvar' : 'Criar'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir resposta rápida?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A resposta rápida será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
