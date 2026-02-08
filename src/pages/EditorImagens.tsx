import React, { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ImagePlus, Upload, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ImageEditorModal } from "@/components/image-editor/ImageEditorModal";
import { useCompany } from "@/contexts/CompanyContext";

export default function EditorImagens() {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Cria URL temporária instantaneamente (não bloqueia)
      const objectUrl = URL.createObjectURL(file);
      setSelectedImages([objectUrl]);
      // Abre o modal IMEDIATAMENTE
      setIsEditorOpen(true);
    }
  };

  const handleCreateNew = () => {
    // Imagem transparente 1080x1080 como base
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, 1080, 1080);
    }
    const blankImage = canvas.toDataURL('image/png');
    setSelectedImages([blankImage]);
    setIsEditorOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/geradores')}
            className="flex items-center gap-2 mb-4"
          >
            <Home className="w-4 h-4" />
            Voltar para Geradores
          </Button>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ImagePlus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Editor de Imagens</h1>
              <p className="text-muted-foreground">
                Crie e edite imagens com ferramentas avançadas e IA
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-2xl">
          {/* Criar do zero */}
          <div 
            onClick={handleCreateNew}
            className="group cursor-pointer rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 p-8 transition-all hover:bg-muted/30"
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <ImagePlus className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Criar do Zero</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Comece com um canvas em branco e use IA para gerar
                </p>
              </div>
            </div>
          </div>

          {/* Upload de imagem */}
          <label className="group cursor-pointer rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 p-8 transition-all hover:bg-muted/30">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Editar Imagem</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Faça upload de uma imagem existente para editar
                </p>
              </div>
            </div>
          </label>
        </div>

        {/* Modal do Editor */}
        {activeCompany && (
          <ImageEditorModal
            open={isEditorOpen}
            onOpenChange={setIsEditorOpen}
            images={selectedImages}
            clientId=""
            companyId={activeCompany.company_id}
            onSave={(newImages) => {
              console.log("Imagens salvas:", newImages);
              setIsEditorOpen(false);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
