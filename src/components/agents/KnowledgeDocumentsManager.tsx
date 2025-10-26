import React, { useRef } from 'react';
import { FileText, Upload, Trash2, File } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAgentKnowledge } from '@/hooks/useAgentKnowledge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface KnowledgeDocumentsManagerProps {
  agentId: string;
}

export function KnowledgeDocumentsManager({ agentId }: KnowledgeDocumentsManagerProps) {
  const { documents, loading, uploading, uploadDocument, deleteDocument } = useAgentKnowledge(agentId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadDocument(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const totalSize = documents.reduce((sum, doc) => sum + doc.file_size, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Biblioteca de Conhecimento
            </CardTitle>
            <CardDescription>
              Documentos que o agente pode consultar para responder perguntas
            </CardDescription>
          </div>
          <Badge variant="outline">
            {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Tamanho total: {formatFileSize(totalSize)}
          </div>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            size="sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Carregando...' : 'Adicionar Documento'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <Separator />

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando documentos...
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <File className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum documento adicionado ainda</p>
            <p className="text-sm mt-1">
              Adicione arquivos TXT ou PDF (máx. 20MB cada)
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{doc.file_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(doc.file_size)} • {doc.file_type.toUpperCase()}
                    </p>
                  </div>
                  {doc.content_text && (
                    <Badge variant="secondary" className="text-xs">
                      Processado
                    </Badge>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="flex-shrink-0">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover documento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O documento "{doc.file_name}" será
                        removido permanentemente da biblioteca de conhecimento.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteDocument(doc.id, doc.storage_path)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground mt-4 p-3 rounded-lg bg-muted/50">
          <p className="font-medium mb-1">💡 Dica:</p>
          <p>
            O agente usará automaticamente o conteúdo destes documentos para responder
            perguntas mais precisas e contextualizadas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
