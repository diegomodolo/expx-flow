import React, { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferenceUploaderProps {
  references: File[];
  onReferencesChange: (files: File[]) => void;
}

export function ReferenceUploader({ references, onReferencesChange }: ReferenceUploaderProps) {
  const { toast } = useToast();

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (references.length + files.length > 3) {
      toast({
        title: "Limite excedido",
        description: "Você pode fazer upload de no máximo 3 imagens de referência.",
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
      onReferencesChange([...references, ...validFiles]);
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
        description: "Você pode fazer upload de no máximo 3 imagens de referência.",
        variant: "destructive",
      });
      return;
    }

    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length > 0) {
      onReferencesChange([...references, ...validFiles]);
      toast({
        title: "Upload realizado",
        description: `${validFiles.length} imagem(ns) adicionada(s) com sucesso.`,
      });
    }
  }, [references, onReferencesChange, toast]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const removeReference = (index: number) => {
    const newReferences = references.filter((_, i) => i !== index);
    onReferencesChange(newReferences);
  };

  const getImagePreview = (file: File): string => {
    return URL.createObjectURL(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Imagens de Referência (Opcional)</h3>
        <p className="text-muted-foreground">
          Faça upload de até 3 imagens que podem inspirar seu criativo (campanhas passadas, concorrentes, inspirações)
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
                  Arraste e solte ou clique para selecionar imagens
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WEBP até 10MB cada
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    Selecionar Arquivos
                  </label>
                </Button>
                <Badge variant="secondary">
                  {references.length}/3 imagens
                </Badge>
              </div>
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
            {references.map((file, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative aspect-video">
                    <img
                      src={getImagePreview(file)}
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
                  </div>
                  
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium truncate">
                        {file.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
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
    </div>
  );
}