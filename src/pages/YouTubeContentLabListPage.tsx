import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { useYouTubeContentLabs } from "@/hooks/useYouTubeContentLabs";
import { Youtube, Plus, Loader2, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useDebounce } from "@/hooks/useDebounce";

export default function YouTubeContentLabListPage() {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id || "";
  const { labs, loading, createLab, deleteLab } = useYouTubeContentLabs(companyId);

  const [createOpen, setCreateOpen] = useState(false);
  const [newLabName, setNewLabName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteLabId, setDeleteLabId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredLabs = labs.filter(l =>
    l.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newLabName.trim()) return;
    setCreating(true);
    const lab = await createLab(newLabName.trim());
    setCreating(false);
    if (lab) {
      setCreateOpen(false);
      setNewLabName("");
      navigate(`/youtube-content-lab/${lab.id}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteLabId) return;
    await deleteLab(deleteLabId);
    setDeleteLabId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <Youtube className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">YouTube Content Lab</h1>
            <p className="text-muted-foreground">
              Analise canais, identifique tendências e crie roteiros com IA
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Lab
        </Button>
      </div>

      {/* Filters Card */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar labs por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {filteredLabs.length} {filteredLabs.length === 1 ? "lab" : "labs"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {filteredLabs.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Canais</TableHead>
                <TableHead className="text-center">Criado em</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLabs.map(lab => (
                <TableRow
                  key={lab.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/youtube-content-lab/${lab.id}`)}
                >
                  <TableCell className="font-medium">{lab.name}</TableCell>
                  <TableCell>
                    <Badge variant={lab.client_id ? "secondary" : "outline"}>
                      {lab.client_id ? "Cliente" : "Standalone"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {lab.channels_count || 0}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {new Date(lab.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    {!lab.client_id && (
                      <Button aria-label="Excluir"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteLabId(lab.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="text-center py-16 space-y-4">
          <Youtube className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <div>
            <h3 className="text-lg font-medium">
              {debouncedSearch ? "Nenhum lab encontrado" : "Nenhum lab criado"}
            </h3>
            <p className="text-muted-foreground">
              {debouncedSearch
                ? "Tente outro termo de busca."
                : "Crie seu primeiro YouTube Content Lab para começar a analisar canais e gerar roteiros."}
            </p>
          </div>
          {!debouncedSearch && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Lab
            </Button>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo YouTube Content Lab</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Lab</Label>
              <Input
                value={newLabName}
                onChange={(e) => setNewLabName(e.target.value)}
                placeholder="Ex: Pesquisa Concorrentes, Canais de Referência..."
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!newLabName.trim() || creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteLabId} onOpenChange={() => setDeleteLabId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lab?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os canais, análises, sugestões e roteiros deste lab serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
