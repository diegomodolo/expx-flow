import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, BookOpen } from 'lucide-react';
import { useRoteiros } from '@/hooks/useRoteiros';
import { useRoteiroCategorias } from '@/hooks/useRoteiroCategorias';
import { RoteiroCard } from '@/components/roteiros/RoteiroCard';
import { RoteiroDialog } from '@/components/roteiros/RoteiroDialog';

export default function Roteiros() {
  const navigate = useNavigate();
  const { roteiros, isLoading, createRoteiro } = useRoteiros();
  const { categorias } = useRoteiroCategorias();
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    return roteiros.filter(r => {
      const matchSearch = !search || r.nome.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategoria === 'all' || r.categoria_id === selectedCategoria;
      return matchSearch && matchCat;
    });
  }, [roteiros, search, selectedCategoria]);

  const handleCreate = (data: any) => {
    createRoteiro.mutate(data, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-semibold">Roteiros</h1>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Roteiro
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar roteiros..."
              className="pl-9"
            />
          </div>
        </div>

        {categorias.length > 0 && (
          <Tabs value={selectedCategoria} onValueChange={setSelectedCategoria}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              {categorias.map(c => (
                <TabsTrigger key={c.id} value={c.id}>{c.nome}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum roteiro encontrado</p>
            <p className="text-sm mt-1">Crie seu primeiro roteiro clicando no botão acima</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(roteiro => (
              <RoteiroCard
                key={roteiro.id}
                roteiro={roteiro}
                onClick={() => navigate(`/roteiros/${roteiro.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <RoteiroDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleCreate}
        loading={createRoteiro.isPending}
      />
    </DashboardLayout>
  );
}
