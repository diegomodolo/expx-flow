import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Brain, MoreVertical, Trash2, Pencil } from 'lucide-react';
import { useMindMaps } from '@/hooks/useMindMaps';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MapasMentais() {
  const navigate = useNavigate();
  const { mindMaps, isLoading, createMindMap, deleteMindMap } = useMindMaps();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return mindMaps;
    const q = search.toLowerCase();
    return mindMaps.filter(m => m.title.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q));
  }, [mindMaps, search]);

  const handleCreate = async () => {
    const result = await createMindMap.mutateAsync({});
    if (result?.id) navigate(`/mapas-mentais/${result.id}`);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/">Início</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Mapas Mentais</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Mapas Mentais</h1>
              <p className="text-sm text-muted-foreground">Organize suas ideias visualmente</p>
            </div>
          </div>
          <Button onClick={handleCreate} disabled={createMindMap.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Mapa
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar mapas..." className="pl-9" />
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Brain className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <h3 className="text-lg font-medium text-foreground">Nenhum mapa mental encontrado</h3>
              <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro mapa clicando no botão acima.</p>
              <Button className="mt-4" onClick={handleCreate} disabled={createMindMap.isPending}>
                <Plus className="w-4 h-4 mr-2" /> Criar Mapa
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[160px]">Atualizado em</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(map => (
                    <TableRow key={map.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/mapas-mentais/${map.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                            <Brain className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">{map.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">
                        {map.description || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(map.updated_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={e => { e.stopPropagation(); navigate(`/mapas-mentais/${map.id}`); }}>
                              <Pencil className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); deleteMindMap.mutate(map.id); }}>
                              <Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
