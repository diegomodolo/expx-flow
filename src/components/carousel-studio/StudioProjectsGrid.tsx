import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreVertical,
  Layers,
  Search,
  ChevronLeft,
  ChevronRight,
  Instagram,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { ClientSearchCombobox } from "@/components/generators/ClientSearchCombobox";
import { useClients } from "@/hooks/useClients";
import {
  useCarouselStudioProjects,
  useDeleteStudioProject,
} from "@/hooks/useCarouselStudioProject";
import { StudioProject } from "@/components/carousel-studio/types";

interface StudioProjectsGridProps {
  companyId: string | undefined;
  onCreateNew: () => void;
}

function EmptyState({
  hasFilter,
  onCreateNew,
}: {
  hasFilter: boolean;
  onCreateNew: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
      <Layers className="w-12 h-12 opacity-20" />
      {hasFilter ? (
        <p className="text-sm">Nenhum projeto encontrado para esses filtros.</p>
      ) : (
        <>
          <p className="text-sm">Nenhum projeto no Editor Visual ainda.</p>
          <Button variant="outline" size="sm" onClick={onCreateNew}>
            Criar no Editor Visual
          </Button>
        </>
      )}
    </div>
  );
}

interface ProjectCardProps {
  project: StudioProject;
  onOpen: () => void;
  onDelete: () => void;
}

function ProjectCard({ project, onOpen, onDelete }: ProjectCardProps) {
  const clientName =
    (project.clients as { id: string; name: string } | null)?.name ?? null;

  // Fallback de thumbnail: thumbnail_url → primeiro slide exportado → bg do primeiro slide
  const slides =
    (project.carousel_studio_slides as Array<{
      slide_number: number;
      exported_image_url: string | null;
      bg_image_url: string | null;
    }> | null) ?? [];
  const firstSlide = [...slides].sort(
    (a, b) => a.slide_number - b.slide_number,
  )[0];
  const thumbSrc =
    project.thumbnail_url ??
    firstSlide?.exported_image_url ??
    firstSlide?.bg_image_url ??
    null;

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header estilo Instagram: ícone + nome do cliente + menu */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Instagram className="w-4 h-4 text-white" />
        </div>
        <span className="flex-1 text-sm font-semibold truncate">
          {clientName ?? "Sem cliente"}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpen}>Abrir editor</DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Imagem — aspect 4:5 */}
      <div
        className="relative w-full bg-muted cursor-pointer overflow-hidden"
        style={{ aspectRatio: "4/5" }}
        onClick={onOpen}
      >
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={project.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Layers className="w-10 h-10 opacity-30" />
            <span className="text-xs opacity-50">Rascunho</span>
          </div>
        )}
        {/* Badge slides count */}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
          <span>1/{project.slides_count}</span>
          <span className="text-[10px]">▶</span>
        </div>
      </div>

      {/* Rodapé estilo Instagram */}
      <div className="px-3 py-2 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Heart className="w-5 h-5" />
            <MessageCircle className="w-5 h-5" />
            <Send className="w-5 h-5" />
          </div>
          <Bookmark className="w-5 h-5 text-muted-foreground" />
        </div>
        {/* Título e info do carrossel */}
        <p className="text-xs font-semibold text-foreground truncate">
          {project.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {project.slides_count} slides
        </p>
      </div>
    </div>
  );
}

const PAGE_SIZE = 15;

export function StudioProjectsGrid({
  companyId,
  onCreateNew,
}: StudioProjectsGridProps) {
  const navigate = useNavigate();
  const { clients } = useClients();
  const deleteMutation = useDeleteStudioProject();

  const [nameFilter, setNameFilter] = useState("");
  const [debouncedName, setDebouncedName] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<StudioProject | null>(null);

  // Debounce do filtro de nome (300ms) para não disparar query a cada tecla
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(nameFilter);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [nameFilter]);

  // Resetar página ao mudar filtro de cliente
  const handleClientFilter = (value: string) => {
    setClientFilter(value);
    setPage(0);
  };

  const { data } = useCarouselStudioProjects(companyId, {
    page,
    nameFilter: debouncedName,
    clientId: clientFilter,
  });

  const projects = data?.projects ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const clientsForCombobox = useMemo(
    () => clients.map((c) => ({ id: c.id, name: c.name })),
    [clients],
  );

  const handleDelete = async () => {
    if (!deleteTarget || !companyId) return;
    try {
      await deleteMutation.mutateAsync({
        projectId: deleteTarget.id,
        companyId,
      });
      toast.success("Carrossel excluído");
    } catch {
      toast.error("Erro ao excluir carrossel");
    } finally {
      setDeleteTarget(null);
    }
  };

  const hasActiveFilter =
    !!debouncedName || (!!clientFilter && clientFilter !== "all");

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="sm:w-64">
          <ClientSearchCombobox
            clients={clientsForCombobox}
            value={clientFilter}
            onValueChange={handleClientFilter}
            includeAllOption={true}
            allOptionLabel="Todos os clientes"
            placeholder="Todos os clientes"
          />
        </div>
      </div>

      {/* Grid */}
      {projects.length === 0 ? (
        <EmptyState hasFilter={hasActiveFilter} onCreateNew={onCreateNew} />
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() =>
                navigate(`/geradores/carrosseis/studio/${project.id}`)
              }
              onDelete={() => setDeleteTarget(project)}
            />
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Próximo
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* AlertDialog de confirmação de exclusão */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir carrossel?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O projeto{" "}
              <strong>{deleteTarget?.title}</strong> será removido
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
