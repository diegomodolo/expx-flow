import { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { usePDFKnowledge } from '@/hooks/usePDFKnowledge';
import { 
  FileText, 
  ChevronDown, 
  Upload, 
  Loader2, 
  Trash2,
  File,
  CheckCircle2,
  Clock,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface PDFKnowledgeCardProps {
  configId: string;
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PDFKnowledgeCard({ 
  configId, 
  companyId,
  open,
  onOpenChange
}: PDFKnowledgeCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewingFile, setViewingFile] = useState<{ id: string; name: string; content: string } | null>(null);
  const [editingContent, setEditingContent] = useState('');
  
  const {
    files,
    isLoading,
    totalFiles,
    processedFiles,
    uploadFile,
    isUploading,
    updateContent,
    isUpdatingContent,
    deleteFile,
    isDeleting
  } = usePDFKnowledge(configId, companyId);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const pdfFile = droppedFiles.find(f => f.name.toLowerCase().endsWith('.pdf'));
    
    if (pdfFile) {
      uploadFile(pdfFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      uploadFile(selectedFile);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleViewContent = (file: typeof files[0]) => {
    setViewingFile({
      id: file.id,
      name: file.file_name,
      content: file.content_text || ''
    });
    setEditingContent(file.content_text || '');
  };

  const handleSaveContent = () => {
    if (viewingFile) {
      updateContent({ fileId: viewingFile.id, contentText: editingContent });
      setViewingFile(null);
    }
  };

  return (
    <>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="w-5 h-5 text-red-600" />
                    Arquivos PDF como Base
                    <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
                  </CardTitle>
                  <CardDescription>
                    {totalFiles > 0 ? `${totalFiles} arquivo(s) anexado(s)` : 'Anexe PDFs para usar como referência'}
                  </CardDescription>
                </div>
                {totalFiles > 0 && (
                  <Badge variant="secondary" onClick={(e) => e.stopPropagation()}>
                    {processedFiles}/{totalFiles} processado{processedFiles !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Upload Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                  isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                  isUploading && "opacity-50 pointer-events-none"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Enviando arquivo...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Arraste um PDF aqui ou{' '}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-primary hover:underline"
                      >
                        clique para selecionar
                      </button>
                    </p>
                    <p className="text-xs text-muted-foreground">Máximo 10MB por arquivo</p>
                  </div>
                )}
              </div>

              {/* File List */}
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : files.length > 0 ? (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div 
                      key={file.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      <File className="w-8 h-8 text-red-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.file_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.file_size)}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(file.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          {file.processing_status === 'completed' ? (
                            <Badge variant="secondary" className="text-xs h-5">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Processado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs h-5">
                              <Clock className="w-3 h-3 mr-1" />
                              Pendente
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewContent(file)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={isDeleting}
                          onClick={() => deleteFile(file.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum PDF anexado ainda.
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                💡 Após o upload, clique no ícone de olho para adicionar ou editar o texto extraído do PDF.
                O conteúdo será usado pela IA para gerar posts mais relevantes.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* View/Edit Content Dialog */}
      <Dialog open={!!viewingFile} onOpenChange={(open) => !open && setViewingFile(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Conteúdo do PDF</DialogTitle>
            <DialogDescription>{viewingFile?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder="Cole ou digite aqui o conteúdo extraído do PDF. Este texto será usado como base de conhecimento para a IA gerar posts."
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setViewingFile(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveContent} disabled={isUpdatingContent}>
                {isUpdatingContent && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Conteúdo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
