import { MetaAudience } from "@/hooks/useMetaAudiences";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Card, CardContent } from "@/components/ui/card";
import { MoreVertical, Eye, Upload, Trash2, Users, Loader2, Search, X } from "lucide-react";
import { useState, useMemo } from "react";

interface AudiencesListProps {
  audiences: MetaAudience[];
  loading: boolean;
  onViewDetails: (audience: MetaAudience) => void;
  onUploadLeads: (audience: MetaAudience) => void;
  onDelete: (audienceId: string) => void;
}

const SUBTYPE_OPTIONS = [
  { value: "all", label: "Todos os tipos" },
  { value: "CUSTOM", label: "Personalizado" },
  { value: "WEBSITE", label: "Website" },
  { value: "APP", label: "App" },
  { value: "OFFLINE_CONVERSION", label: "Conversão Offline" },
  { value: "VIDEO", label: "Vídeo" },
  { value: "LOOKALIKE", label: "Lookalike" },
  { value: "ENGAGEMENT", label: "Engajamento" },
];

export function AudiencesList({
  audiences,
  loading,
  onViewDetails,
  onUploadLeads,
  onDelete,
}: AudiencesListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [audienceToDelete, setAudienceToDelete] = useState<MetaAudience | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [subtypeFilter, setSubtypeFilter] = useState("all");

  const handleDeleteClick = (audience: MetaAudience) => {
    setAudienceToDelete(audience);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (audienceToDelete) {
      onDelete(audienceToDelete.id);
    }
    setDeleteDialogOpen(false);
    setAudienceToDelete(null);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSubtypeFilter("all");
  };

  const hasActiveFilters = searchTerm !== "" || subtypeFilter !== "all";

  const filteredAudiences = useMemo(() => {
    return audiences.filter((audience) => {
      const matchesSearch = 
        audience.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        audience.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSubtype = subtypeFilter === "all" || audience.subtype === subtypeFilter;

      return matchesSearch && matchesSubtype;
    });
  }, [audiences, searchTerm, subtypeFilter]);

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getSubtypeBadge = (subtype?: string) => {
    const subtypeLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      CUSTOM: { label: "Personalizado", variant: "default" },
      WEBSITE: { label: "Website", variant: "secondary" },
      APP: { label: "App", variant: "secondary" },
      OFFLINE_CONVERSION: { label: "Conversão Offline", variant: "outline" },
      CLAIM: { label: "Claim", variant: "outline" },
      PARTNER: { label: "Parceiro", variant: "outline" },
      MANAGED: { label: "Gerenciado", variant: "outline" },
      VIDEO: { label: "Vídeo", variant: "secondary" },
      LOOKALIKE: { label: "Lookalike", variant: "default" },
      ENGAGEMENT: { label: "Engajamento", variant: "secondary" },
    };

    const config = subtypeLabels[subtype || "CUSTOM"] || { label: subtype || "Desconhecido", variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading && audiences.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Carregando públicos...</p>
        </CardContent>
      </Card>
    );
  }

  if (audiences.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
          <Users className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhum público encontrado</p>
          <p className="text-sm">Crie seu primeiro público personalizado para começar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={subtypeFilter} onValueChange={setSubtypeFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Tipo de público" />
          </SelectTrigger>
          <SelectContent>
            {SUBTYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      {/* Contador de resultados */}
      <div className="text-sm text-muted-foreground mb-2">
        {filteredAudiences.length} de {audiences.length} público(s)
      </div>

      {/* Tabela */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Nome</TableHead>
              <TableHead className="w-[20%]">Tipo</TableHead>
              <TableHead className="w-[15%] text-right">Tamanho</TableHead>
              <TableHead className="w-[15%]">Status</TableHead>
              <TableHead className="w-[10%] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAudiences.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum público encontrado com os filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              filteredAudiences.map((audience) => (
                <TableRow key={audience.id} className="group">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-[300px]" title={audience.name}>
                        {audience.name}
                      </span>
                      {audience.description && (
                        <span className="text-xs text-muted-foreground truncate max-w-[300px]" title={audience.description}>
                          {audience.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getSubtypeBadge(audience.subtype)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCount(audience.approximate_count)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={audience.operation_status?.code === 200 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {audience.operation_status?.code === 200 ? "Ativo" : "Pendente"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => onViewDetails(audience)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onUploadLeads(audience)}>
                          <Upload className="h-4 w-4 mr-2" />
                          Adicionar Leads
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(audience)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir Público
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Público</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o público "{audienceToDelete?.name}"?
              Esta ação não pode ser desfeita e o público será removido permanentemente do Meta Ads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}