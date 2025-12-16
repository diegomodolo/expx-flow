import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Filter, Plus, Trash2, Edit, Star, StarOff, Eye, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { LeadFilterBuilderModal } from "./LeadFilterBuilderModal";
import { LeadFilterResultsView } from "./LeadFilterResultsView";
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

interface LeadSavedFiltersTabProps {
  companyId: string;
}

interface FilterConfig {
  conditions: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
  logic: 'AND' | 'OR';
}

interface SavedFilter {
  id: string;
  name: string;
  description: string | null;
  filter_config: FilterConfig;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export const LeadSavedFiltersTab = ({ companyId }: LeadSavedFiltersTabProps) => {
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<SavedFilter | null>(null);
  const [viewingFilter, setViewingFilter] = useState<SavedFilter | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterToDelete, setFilterToDelete] = useState<string | null>(null);

  const { data: filters, isLoading } = useQuery({
    queryKey: ['lead-saved-filters', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('lead_saved_filters')
        .select('*')
        .eq('company_id', companyId)
        .order('is_favorite', { ascending: false })
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        filter_config: d.filter_config as unknown as FilterConfig
      })) as SavedFilter[];
    },
    enabled: !!companyId
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('lead_saved_filters')
        .update({ is_favorite: isFavorite })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-saved-filters'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lead_saved_filters')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-saved-filters'] });
      toast.success("Filtro excluído com sucesso");
      setDeleteDialogOpen(false);
      setFilterToDelete(null);
    },
    onError: () => {
      toast.error("Erro ao excluir filtro");
    }
  });

  const handleEdit = (filter: SavedFilter) => {
    setEditingFilter(filter);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setFilterToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleView = (filter: SavedFilter) => {
    setViewingFilter(filter);
  };

  const getConditionsCount = (filter: SavedFilter) => {
    return filter.filter_config?.conditions?.length || 0;
  };

  // If viewing a filter, show results
  if (viewingFilter) {
    return (
      <LeadFilterResultsView 
        filter={viewingFilter} 
        onBack={() => setViewingFilter(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros Salvos
            </CardTitle>
            <CardDescription>
              Crie e gerencie filtros para análise de leads agregados
            </CardDescription>
          </div>
          <Button onClick={() => { setEditingFilter(null); setIsModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Filtro
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filters && filters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filters.map((filter) => (
                <Card key={filter.id} className="relative">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{filter.name}</h3>
                            {filter.is_favorite && (
                              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                            )}
                          </div>
                          {filter.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {filter.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Filter info */}
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {getConditionsCount(filter)} condição(ões)
                        </Badge>
                        <Badge variant="outline">
                          {filter.filter_config?.logic || 'AND'}
                        </Badge>
                      </div>

                      {/* Date */}
                      <p className="text-xs text-muted-foreground">
                        Atualizado em {format(new Date(filter.updated_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleView(filter)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Resultados
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFavoriteMutation.mutate({ 
                            id: filter.id, 
                            isFavorite: !filter.is_favorite 
                          })}
                        >
                          {filter.is_favorite ? (
                            <StarOff className="h-4 w-4" />
                          ) : (
                            <Star className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(filter)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(filter.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum filtro salvo</p>
              <p className="text-sm mt-1">Crie filtros para analisar leads de forma agregada</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Filtro
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <LeadFilterBuilderModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        filter={editingFilter}
        companyId={companyId || ""}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir filtro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este filtro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => filterToDelete && deleteMutation.mutate(filterToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
