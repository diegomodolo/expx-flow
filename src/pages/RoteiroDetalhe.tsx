import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useRoteiros } from '@/hooks/useRoteiros';
import { useRoteiroAtividades } from '@/hooks/useRoteiroAtividades';
import { RoteiroDialog } from '@/components/roteiros/RoteiroDialog';
import { AtividadeDialog } from '@/components/roteiros/AtividadeDialog';
import { AtividadeList } from '@/components/roteiros/AtividadeList';
import type { RoteiroAtividade, AtividadeInput } from '@/hooks/useRoteiroAtividades';
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

export default function RoteiroDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { roteiros, updateRoteiro, deleteRoteiro } = useRoteiros();
  const { atividades, isLoading, createAtividade, updateAtividade, deleteAtividade, reorderAtividades } = useRoteiroAtividades(id);

  const roteiro = roteiros.find(r => r.id === id);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [atividadeDialogOpen, setAtividadeDialogOpen] = useState(false);
  const [editingAtividade, setEditingAtividade] = useState<RoteiroAtividade | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!roteiro) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center py-12 text-muted-foreground">
          Roteiro não encontrado
        </div>
      </DashboardLayout>
    );
  }

  const Icon = (LucideIcons as any)[roteiro.icone || 'BookOpen'] || LucideIcons.BookOpen;

  const handleUpdateRoteiro = (data: any) => {
    updateRoteiro.mutate({ id: roteiro.id, ...data }, {
      onSuccess: () => setEditDialogOpen(false),
    });
  };

  const handleDeleteRoteiro = () => {
    deleteRoteiro.mutate(roteiro.id, {
      onSuccess: () => navigate('/roteiros'),
    });
  };

  const handleSaveAtividade = (data: AtividadeInput) => {
    if (editingAtividade) {
      updateAtividade.mutate({ id: editingAtividade.id, ...data }, {
        onSuccess: () => { setAtividadeDialogOpen(false); setEditingAtividade(null); },
      });
    } else {
      createAtividade.mutate(data, {
        onSuccess: () => setAtividadeDialogOpen(false),
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/roteiros')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{roteiro.nome}</h1>
            <div className="flex items-center gap-2 mt-1">
              {roteiro.roteiro_categorias && (
                <Badge variant="secondary">{roteiro.roteiro_categorias.nome}</Badge>
              )}
              {roteiro.publico && <Badge variant="outline">Público</Badge>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="w-4 h-4 mr-1" /> Editar
            </Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="w-4 h-4 mr-1" /> Excluir
            </Button>
          </div>
        </div>

        {roteiro.objetivo && (
          <p className="text-sm text-muted-foreground max-w-2xl">{roteiro.objetivo}</p>
        )}

        {/* Atividades */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Atividades ({atividades.length})</h2>
            <Button onClick={() => { setEditingAtividade(null); setAtividadeDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar Atividade
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <AtividadeList
              atividades={atividades}
              onEdit={(a) => { setEditingAtividade(a); setAtividadeDialogOpen(true); }}
              onDelete={(id) => deleteAtividade.mutate(id)}
              onReorder={(ids) => reorderAtividades.mutate(ids)}
            />
          )}
        </div>
      </div>

      <RoteiroDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleUpdateRoteiro}
        roteiro={roteiro}
        loading={updateRoteiro.isPending}
      />

      <AtividadeDialog
        open={atividadeDialogOpen}
        onOpenChange={(open) => { setAtividadeDialogOpen(open); if (!open) setEditingAtividade(null); }}
        onSave={handleSaveAtividade}
        atividade={editingAtividade}
        loading={createAtividade.isPending || updateAtividade.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Roteiro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o roteiro "{roteiro.nome}"? Todas as atividades serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRoteiro} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
