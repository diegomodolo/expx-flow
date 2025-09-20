import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface EvidenceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName: string;
}

export function EvidenceViewerModal({ isOpen, onClose, imageUrl, fileName }: EvidenceViewerModalProps) {
  const [imageError, setImageError] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-medium truncate">
              {fileName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto p-4 pt-0">
          {!imageError ? (
            <img
              src={imageUrl}
              alt="Evidência"
              className="w-full h-auto rounded-lg shadow-lg"
              onError={() => setImageError(true)}
              style={{ maxHeight: 'calc(90vh - 120px)', objectFit: 'contain' }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-lg">
              <X className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Não foi possível carregar a imagem</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Fazer Download
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}