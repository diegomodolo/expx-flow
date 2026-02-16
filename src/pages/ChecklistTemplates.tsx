import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, ListChecks, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { useChecklistTemplates } from '@/hooks/useChecklistTemplates';
import { ChecklistTemplateDialog } from '@/components/checklist-templates/ChecklistTemplateDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ChecklistTemplates() {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, fetchTemplateItems } = useChecklistTemplates();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<any>(null);

  const filtered = useMemo(() => {
    return templates.filter(t =>
      !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase())
    );
  }, [templates, search]);

  const handleCreate = (data: { name: string; description?: string; items: string[] }) => {
    createTemplate.mutate(data, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  const handleEdit = async (template: any) => {
    const items = await fetchTemplateItems(template.id);
    setEditingTemplate({
      id: template.id,
      name: template.name,
      description: template.description || '',
      items: items.map((i: any) => i.text),
    });
    setDialogOpen(true);
  };

  const handleUpdate = (data: { name: string; description?: string; items: string[] }) => {
    if (!editingTemplate) return;
    updateTemplate.mutate({ id: editingTemplate.id, ...data }, {
      onSuccess: () => {
        setDialogOpen(false);
        setEditingTemplate(null);
      },
    });
  };

  const handleDelete = () => {
    if (!deletingTemplate) return;
    deleteTemplate.mutate(deletingTemplate.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setDeletingTemplate(null);
      },
    });
  };

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ListChecks className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-semibold">Templates de Checklist</h1>
          </div>
          <Button onClick={() => { setEditingTemplate(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Template
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar templates..."
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ListChecks className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <h3 className="text-lg font-medium text-foreground">Nenhum template encontrado</h3>
            <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro template de checklist para reutilizar em tarefas.</p>
            <Button className="mt-4" onClick={() => { setEditingTemplate(null); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Criar Template
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(template => (
              <div
                key={template.id}
                className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <ListChecks className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{template.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(template.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(template)}>
                        <Pencil className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => { setDeletingTemplate(template); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{template.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ChecklistTemplateDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTemplate(null);
        }}
        onSave={editingTemplate ? handleUpdate : handleCreate}
        initialData={editingTemplate}
        loading={createTemplate.isPending || updateTemplate.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{deletingTemplate?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
