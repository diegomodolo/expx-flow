import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { IconPicker } from './IconPicker';
import { CategoriaDialog } from './CategoriaDialog';
import { useRoteiroCategorias } from '@/hooks/useRoteiroCategorias';
import type { Roteiro } from '@/hooks/useRoteiros';

interface RoteiroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { nome: string; categoria_id?: string | null; icone?: string; objetivo?: string; publico?: boolean }) => void;
  roteiro?: Roteiro | null;
  loading?: boolean;
}

export function RoteiroDialog({ open, onOpenChange, onSave, roteiro, loading }: RoteiroDialogProps) {
  const [nome, setNome] = useState('');
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [icone, setIcone] = useState('BookOpen');
  const [objetivo, setObjetivo] = useState('');
  const [publico, setPublico] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);

  const { categorias, createCategoria } = useRoteiroCategorias();

  useEffect(() => {
    if (roteiro) {
      setNome(roteiro.nome);
      setCategoriaId(roteiro.categoria_id);
      setIcone(roteiro.icone || 'BookOpen');
      setObjetivo(roteiro.objetivo || '');
      setPublico(roteiro.publico);
    } else {
      setNome(''); setCategoriaId(null); setIcone('BookOpen'); setObjetivo(''); setPublico(false);
    }
  }, [roteiro, open]);

  const handleSave = () => {
    if (!nome.trim()) return;
    onSave({ nome: nome.trim(), categoria_id: categoriaId, icone, objetivo, publico });
  };

  const handleCreateCategoria = (catNome: string) => {
    createCategoria.mutate(catNome, {
      onSuccess: (data) => {
        setCategoriaId(data.id);
        setCatDialogOpen(false);
      }
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{roteiro ? 'Editar Roteiro' : 'Novo Roteiro'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do roteiro" />
            </div>
            <div>
              <Label>Categoria</Label>
              <div className="flex gap-2">
                <Select value={categoriaId || ''} onValueChange={v => setCategoriaId(v || null)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setCatDialogOpen(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Ícone</Label>
              <IconPicker value={icone} onChange={setIcone} />
            </div>
            <div>
              <Label>Objetivo</Label>
              <Textarea value={objetivo} onChange={e => setObjetivo(e.target.value)} placeholder="Descreva o objetivo deste roteiro" rows={3} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={publico} onCheckedChange={setPublico} />
              <Label>Público (visível para todos)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!nome.trim() || loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CategoriaDialog
        open={catDialogOpen}
        onOpenChange={setCatDialogOpen}
        onSave={handleCreateCategoria}
        loading={createCategoria.isPending}
      />
    </>
  );
}
