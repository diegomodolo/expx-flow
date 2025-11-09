import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, File, Trash2, Download, Paperclip } from "lucide-react";
import { useCRMAttachments } from "@/hooks/useCRMAttachments";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface CRMAttachmentUploaderProps {
  leadId: string;
}

export function CRMAttachmentUploader({ leadId }: CRMAttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { attachments, uploadAttachment, isUploading, deleteAttachment } = useCRMAttachments(leadId);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert("Arquivo muito grande. Tamanho máximo: 10MB");
      return;
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'image/jpg',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Tipo de arquivo não permitido. Permitidos: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG");
      return;
    }

    await uploadAttachment(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="w-4 h-4" />;
    if (fileType.startsWith('image/')) return <File className="w-4 h-4 text-blue-500" />;
    if (fileType.includes('pdf')) return <File className="w-4 h-4 text-red-500" />;
    if (fileType.includes('sheet') || fileType.includes('excel')) return <File className="w-4 h-4 text-green-500" />;
    if (fileType.includes('word') || fileType.includes('document')) return <File className="w-4 h-4 text-blue-600" />;
    return <File className="w-4 h-4" />;
  };

  const handleDownload = (url: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Paperclip className="w-4 h-4" />
          Anexos
        </Label>
        
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="w-4 h-4 mr-1" />
            {isUploading ? 'Enviando...' : 'Enviar Arquivo'}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum anexo adicionado</p>
        ) : (
          attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getFileIcon(attachment.file_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)} • {format(new Date(attachment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(attachment.file_url, attachment.file_name)}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteId(attachment.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover anexo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O arquivo será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteId) {
                  await deleteAttachment(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
