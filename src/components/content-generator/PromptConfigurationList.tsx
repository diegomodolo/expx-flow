import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Settings } from "lucide-react";
import { useContentPrompts } from "@/hooks/useContentPrompts";
import { PromptEditModal } from "./PromptEditModal";

export function PromptConfigurationList() {
  const { getAllPromptsWithStatus, loading } = useContentPrompts();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const allPrompts = getAllPromptsWithStatus();
  
  const filteredPrompts = allPrompts.filter(content =>
    content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    content.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedPrompts = filteredPrompts.reduce((acc, content) => {
    if (!acc[content.category]) {
      acc[content.category] = [];
    }
    acc[content.category].push(content);
    return acc;
  }, {} as Record<string, typeof allPrompts>);

  const handleEditPrompt = (content: any) => {
    setSelectedContent(content);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedContent(null);
  };

  const customizedCount = allPrompts.filter(p => p.isCustomized).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando configurações...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header com estatísticas */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Configuração de Prompts</h2>
            <p className="text-sm text-muted-foreground">
              {customizedCount} de {allPrompts.length} prompts personalizados
            </p>
          </div>
        </div>

        {/* Barra de pesquisa */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nome ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Lista de prompts por categoria */}
        {Object.entries(groupedPrompts).map(([category, items]) => (
          <div key={category} className="space-y-4">
            <h3 className="text-md font-medium text-foreground flex items-center gap-2">
              <span className="text-lg">{category.split(' ')[0]}</span>
              <span>{category.split(' ').slice(1).join(' ')}</span>
              <Badge variant="secondary" className="text-xs">
                {items.length}
              </Badge>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((content) => (
                <Card key={content.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                          <span className="text-lg">{content.icon}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">
                              {content.title}
                            </h4>
                            {content.isCustomized && (
                              <Badge variant="default" className="text-xs flex-shrink-0">
                                Customizado
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground text-clamp-2">
                            {content.description}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPrompt(content)}
                        className="w-full"
                      >
                        <Settings className="w-3 h-3 mr-2" />
                        Editar Prompt
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {filteredPrompts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              Nenhum prompt encontrado para "{searchTerm}"
            </div>
          </div>
        )}
      </div>

      {selectedContent && (
        <PromptEditModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          contentType={selectedContent}
        />
      )}
    </>
  );
}