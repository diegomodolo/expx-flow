import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CategoriaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (nome: string) => void;
  loading?: boolean;
}

export function CategoriaDialog({ open, onOpenChange, onSave, loading }: CategoriaDialogProps) {
  const [nome, setNome] = useState('');

  const handleSave = () => {
    if (!nome.trim()) return;
    onSave(nome.trim());
    setNome('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Categoria</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome da Categoria</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Onboarding" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!nome.trim() || loading}>
            {loading ? 'Salvando...' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
