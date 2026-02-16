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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Roteiros</h1>
              <p className="text-sm text-muted-foreground">Gerencie seus templates reutilizáveis de tarefas</p>
            </div>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
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
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Criar Roteiro
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
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
          )}
        </div>
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
