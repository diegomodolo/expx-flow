import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface ChecklistTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; description?: string; items: string[] }) => void;
  initialData?: { name: string; description?: string; items: string[] };
  loading?: boolean;
}

export function ChecklistTemplateDialog({ open, onOpenChange, onSave, initialData, loading }: ChecklistTemplateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setDescription(initialData?.description || '');
      setItems(initialData?.items || []);
      setNewItem('');
    }
  }, [open, initialData]);

  const addItem = () => {
    if (newItem.trim()) {
      setItems(prev => [...prev, newItem.trim()]);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim() || undefined, items });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Template' : 'Novo Template de Checklist'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-6">
          {/* Coluna esquerda - Configuração */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Nome</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Onboarding de cliente"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">Descrição</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descrição breve do template..."
                className="mt-1.5"
                rows={4}
              />
            </div>
          </div>

          {/* Coluna direita - Itens do Checklist */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Itens do Checklist</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Novo item..."
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem())}
              />
              <Button variant="outline" size="icon" onClick={addItem} disabled={!newItem.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="h-[320px] rounded-lg border border-border p-2">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum item adicionado</p>
              ) : (
                <div className="space-y-2 pr-2">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/20">
                      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm flex-1 truncate">{item}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name.trim() || loading}>
            {loading ? 'Salvando...' : (initialData ? 'Atualizar' : 'Criar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
