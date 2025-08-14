import React, { useState } from "react";
import { useContentGenerations } from "@/hooks/useContentGenerations";
import { ContentHistoryCard } from "./ContentHistoryCard";
import { ContentPreviewModal } from "./ContentPreviewModal";
import { useClients } from "@/hooks/useClients";
import { contentTypes } from "./ContentTypes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, RefreshCw } from "lucide-react";

export function SavedContentsList() {
  const { generations, loading, fetchGenerations } = useContentGenerations();
  const { clients } = useClients();
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [filters, setFilters] = useState({
    client: '',
    contentType: '',
    status: '',
    search: ''
  });

  const handlePreview = (content: any) => {
    setSelectedContent(content);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setSelectedContent(null);
  };

  const filteredGenerations = generations.filter(gen => {
    if (filters.client && gen.client_id !== filters.client) return false;
    if (filters.contentType && gen.content_type !== filters.contentType) return false;
    if (filters.status && gen.status !== filters.status) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const contentTypeTitle = contentTypes.find(ct => ct.id === gen.content_type)?.title || '';
      return (
        gen.generated_content.toLowerCase().includes(searchLower) ||
        gen.theme.toLowerCase().includes(searchLower) ||
        contentTypeTitle.toLowerCase().includes(searchLower) ||
        gen.clients?.name.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const uniqueContentTypes = Array.from(new Set(generations.map(g => g.content_type)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando conteúdos...</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card rounded-lg border">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conteúdos..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="flex-1"
            />
          </div>
          
          <div className="flex gap-2">
            <Select
              value={filters.client}
              onValueChange={(value) => setFilters(prev => ({ ...prev, client: value }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os clientes</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.contentType}
              onValueChange={(value) => setFilters(prev => ({ ...prev, contentType: value }))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo de conteúdo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os tipos</SelectItem>
                {uniqueContentTypes.map(type => {
                  const contentType = contentTypes.find(ct => ct.id === type);
                  return (
                    <SelectItem key={type} value={type}>
                      {contentType?.title || type}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="used">Usado</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={fetchGenerations}
              title="Atualizar lista"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Lista de conteúdos */}
        {filteredGenerations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Filter className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Nenhum conteúdo encontrado</h3>
            <p className="text-muted-foreground">
              {generations.length === 0 
                ? "Você ainda não gerou nenhum conteúdo. Clique na aba 'Gerar Novo' para começar."
                : "Nenhum conteúdo corresponde aos filtros aplicados. Tente ajustar os filtros."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredGenerations.map((generation) => (
              <ContentHistoryCard
                key={generation.id}
                generation={generation}
                onPreview={handlePreview}
              />
            ))}
          </div>
        )}
      </div>

      {selectedContent && (
        <ContentPreviewModal
          isOpen={isPreviewOpen}
          onClose={handleClosePreview}
          generation={selectedContent}
        />
      )}
    </>
  );
}