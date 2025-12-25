import React, { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon, AlertCircle, Instagram } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReferenceSelectionDialog } from "@/components/clients/ReferenceSelectionDialog";
import { useCompany } from "@/contexts/CompanyContext";

export interface ReferenceItem {
  type: 'file' | 'url';
  file?: File;
  url?: string;
  name: string;
}

interface ReferenceUploaderProps {
  references: ReferenceItem[];
  onReferencesChange: (items: ReferenceItem[]) => void;
  clientId?: string;
}

export function ReferenceUploader({ references, onReferencesChange, clientId }: ReferenceUploaderProps) {
  const { toast } = useToast();
  const { activeCompany } = useCompany();
  const [showInstagramDialog, setShowInstagramDialog] = useState(false);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (references.length + files.length > 3) {
      toast({
        title: "Limite excedido",
        description: "Você pode adicionar no máximo 3 imagens de referência.",
        variant: "destructive",
      });
      return;
    }

    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      
      if (!isImage) {
        toast({
          title: "Arquivo inválido",
          description: `${file.name} não é uma imagem válida.`,
          variant: "destructive",
        });
        return false;
      }
      
      if (!isValidSize) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede o limite de 10MB.`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });

    if (validFiles.length > 0) {
      const newItems: ReferenceItem[] = validFiles.map(file => ({
        type: 'file',
        file,
        name: file.name
      }));
      onReferencesChange([...references, ...newItems]);
      toast({
        title: "Upload realizado",
        description: `${validFiles.length} imagem(ns) adicionada(s) com sucesso.`,
      });
    }
    
    // Reset input
    event.target.value = '';
  }, [references, onReferencesChange, toast]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    
    if (references.length + files.length > 3) {
      toast({
        title: "Limite excedido",
        description: "Você pode adicionar no máximo 3 imagens de referência.",
        variant: "destructive",
      });
      return;
    }

    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length > 0) {
      const newItems: ReferenceItem[] = validFiles.map(file => ({
        type: 'file',
        file,
        name: file.name
      }));
      onReferencesChange([...references, ...newItems]);
      toast({
        title: "Upload realizado",
        description: `${validFiles.length} imagem(ns) adicionada(s) com sucesso.`,
      });
    }
  }, [references, onReferencesChange, toast]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleInstagramSelect = (imageUrls: string[]) => {
    const availableSlots = 3 - references.length;
    const urlsToAdd = imageUrls.slice(0, availableSlots);
    
    const newItems: ReferenceItem[] = urlsToAdd.map((url, index) => ({
      type: 'url',
      url,
      name: `Instagram ${references.length + index + 1}`
    }));
    
    onReferencesChange([...references, ...newItems]);
    
    toast({
      title: "Referências importadas",
      description: `${newItems.length} imagem(ns) do Instagram adicionada(s).`,
    });
  };

  const removeReference = (index: number) => {
    const newReferences = references.filter((_, i) => i !== index);
    onReferencesChange(newReferences);
  };

  const getImagePreview = (item: ReferenceItem): string => {
    if (item.type === 'url' && item.url) {
      return item.url;
    }
    if (item.type === 'file' && item.file) {
      return URL.createObjectURL(item.file);
    }
    return '';
  };

  const getItemSize = (item: ReferenceItem): string => {
    if (item.type === 'file' && item.file) {
      return `${(item.file.size / 1024 / 1024).toFixed(1)} MB`;
    }
    return 'URL externa';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Imagens de Referência (Opcional)</h3>
        <p className="text-muted-foreground">
          Faça upload de até 3 imagens ou importe do Instagram do cliente (campanhas passadas, inspirações)
        </p>
      </div>

      {references.length < 3 && (
        <Card
          className={cn(
            "border-2 border-dashed transition-colors",
            "hover:border-primary/50 hover:bg-primary/5"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Adicionar Imagens de Referência</h4>
                <p className="text-sm text-muted-foreground">
                  Arraste e solte ou escolha uma das opções abaixo
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WEBP até 10MB cada
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Upload className="w-4 h-4 mr-2" />
                    Selecionar Arquivos
                  </label>
                </Button>
                
                {clientId && activeCompany?.company_id && (
                  <Button
                    variant="secondary"
                    onClick={() => setShowInstagramDialog(true)}
                  >
                    <Instagram className="w-4 h-4 mr-2" />
                    Buscar do Instagram
                  </Button>
                )}
              </div>
              
              <Badge variant="secondary">
                {references.length}/3 imagens
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {references.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Imagens Selecionadas</h4>
            <Badge variant="secondary">{references.length}/3</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {references.map((item, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative aspect-video">
                    <img
                      src={getImagePreview(item)}
                      alt={`Referência ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 w-6 h-6"
                      onClick={() => removeReference(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                    
                    {item.type === 'url' && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-xs">
                          <Instagram className="w-3 h-3 mr-1" />
                          Instagram
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium truncate">
                        {item.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getItemSize(item)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <h5 className="font-medium text-blue-900">Dicas para melhores resultados</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Use imagens de alta qualidade e bem iluminadas</li>
              <li>• Inclua referências que representem o estilo desejado</li>
              <li>• Combine referências de cores, layout e conceito</li>
              <li>• Evite imagens com muitos elementos visuais conflitantes</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Dialog para buscar do Instagram */}
      {clientId && activeCompany?.company_id && (
        <ReferenceSelectionDialog
          open={showInstagramDialog}
          onOpenChange={setShowInstagramDialog}
          clientId={clientId}
          companyId={activeCompany.company_id}
          onSelect={handleInstagramSelect}
          maxSelections={3 - references.length}
        />
      )}
    </div>
  );
}
