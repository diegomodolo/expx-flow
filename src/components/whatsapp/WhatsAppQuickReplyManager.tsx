import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Settings, Plus, Pencil, Trash2, FileText, Image, Video, Mic, File, Loader2, X } from 'lucide-react';
import { QuickReply, QuickReplyInput, useWhatsAppQuickReplies } from '@/hooks/useWhatsAppQuickReplies';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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

  const resetForm = () => {
    setFormData({
      shortCut: '',
      type: 'text',
      text: ''
    });
    setEditingReply(null);
    setIsFormOpen(false);
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
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingReply) {
        await updateQuickReply(formData);
      } else {
        await createQuickReply(formData);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving quick reply:', error);
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
                      <div className="space-y-2">
                        <Label htmlFor="file">URL do Arquivo *</Label>
                        <Input
                          id="file"
                          value={formData.file || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, file: e.target.value }))}
                          placeholder="https://exemplo.com/arquivo.pdf"
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          URL pública do arquivo ou Base64
                        </p>
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
                    </>
                  )}
                </div>

                <Separator />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreating || isUpdating}>
                    {(isCreating || isUpdating) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingReply ? 'Salvar' : 'Criar'}
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
