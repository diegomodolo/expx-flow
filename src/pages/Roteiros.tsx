import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, BookOpen, MoreVertical } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useRoteiros } from '@/hooks/useRoteiros';
import { useRoteiroCategorias } from '@/hooks/useRoteiroCategorias';
import { RoteiroDialog } from '@/components/roteiros/RoteiroDialog';
import { RoteiroSourceDialog, type RoteiroSource } from '@/components/roteiros/RoteiroSourceDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function Roteiros() {
  const navigate = useNavigate();
  const { roteiros, isLoading, createRoteiro } = useRoteiros();
  const { categorias } = useRoteiroCategorias();
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('all');
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [prefillData, setPrefillData] = useState<{ nome?: string; objetivo?: string } | null>(null);

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

  const handleSourceSelect = async (source: RoteiroSource) => {
    if (source.type === 'scratch') {
      setPrefillData(null);
      setSourceDialogOpen(false);
      setDialogOpen(true);
      return;
    }

    setSourceLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('roteiro-from-source', {
        body: { type: source.type, url: source.url },
      });

      if (error) throw error;

      setPrefillData({
        nome: data?.nome || '',
        objetivo: data?.objetivo || '',
      });
      setSourceDialogOpen(false);
      setDialogOpen(true);
      toast.success('Conteúdo extraído com sucesso!');
    } catch (err) {
      console.error('Erro ao extrair conteúdo:', err);
      toast.error('Erro ao extrair conteúdo da fonte. Tente novamente.');
    } finally {
      setSourceLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Início</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Roteiros</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Roteiros</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Gerencie seus templates reutilizáveis</p>
            </div>
          </div>
          <Button onClick={() => setSourceDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Novo Roteiro
          </Button>
        </div>

        {/* Card container */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          {/* Search + Category filter */}
          <div className="flex items-center gap-3 flex-wrap">
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

         {/* Content */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <h3 className="text-lg font-medium text-foreground">Nenhum roteiro encontrado</h3>
              <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro roteiro clicando no botão acima.</p>
              <Button className="mt-4" onClick={() => setSourceDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Criar Roteiro
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile: Card layout */}
              <div className="md:hidden space-y-2">
                {filtered.map(roteiro => {
                  const Icon = (LucideIcons as any)[roteiro.icone || 'BookOpen'] || LucideIcons.BookOpen;
                  return (
                    <div
                      key={roteiro.id}
                      className="p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/roteiros/${roteiro.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{roteiro.nome}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {roteiro.roteiro_categorias?.nome && (
                              <span className="text-xs text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                                {roteiro.roteiro_categorias.nome}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(roteiro.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                      {roteiro.objetivo && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 pl-12">{roteiro.objetivo}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop: Table layout */}
              <div className="hidden md:block rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Objetivo</TableHead>
                      <TableHead className="w-[160px]">Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(roteiro => {
                      const Icon = (LucideIcons as any)[roteiro.icone || 'BookOpen'] || LucideIcons.BookOpen;
                      return (
                        <TableRow
                          key={roteiro.id}
                          className="hover:bg-muted/30 cursor-pointer"
                          onClick={() => navigate(`/roteiros/${roteiro.id}`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4 text-primary" />
                              </div>
                              <span className="font-medium text-foreground">{roteiro.nome}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {roteiro.roteiro_categorias?.nome || '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">
                            {roteiro.objetivo || '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(roteiro.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>

      <RoteiroSourceDialog
        open={sourceDialogOpen}
        onOpenChange={setSourceDialogOpen}
        onSelect={handleSourceSelect}
        loading={sourceLoading}
      />

      <RoteiroDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleCreate}
        loading={createRoteiro.isPending}
        prefill={prefillData}
      />
    </DashboardLayout>
  );
}
