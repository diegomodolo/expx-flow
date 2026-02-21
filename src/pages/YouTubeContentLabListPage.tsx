import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { useYouTubeContentLabs } from "@/hooks/useYouTubeContentLabs";
import { Youtube, Plus, Loader2, Users, Beaker, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function YouTubeContentLabListPage() {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id || "";
  const { labs, loading, createLab, deleteLab } = useYouTubeContentLabs(companyId);

  const [createOpen, setCreateOpen] = useState(false);
  const [newLabName, setNewLabName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteLabId, setDeleteLabId] = useState<string | null>(null);

  const clientLabs = labs.filter(l => l.client_id);
  const standaloneLabs = labs.filter(l => !l.client_id);

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

      {/* Client Labs */}
      {clientLabs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Labs de Clientes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientLabs.map(lab => (
              <Card
                key={lab.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/youtube-content-lab/${lab.id}`)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="truncate">{lab.name}</span>
                    <Badge variant="secondary" className="ml-2 shrink-0">Cliente</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Youtube className="h-3.5 w-3.5" />
                      {lab.channels_count || 0} canais
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Standalone Labs */}
      {standaloneLabs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Beaker className="h-5 w-5 text-muted-foreground" />
            Meus Labs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {standaloneLabs.map(lab => (
              <Card
                key={lab.id}
                className="cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => navigate(`/youtube-content-lab/${lab.id}`)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="truncate">{lab.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteLabId(lab.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Youtube className="h-3.5 w-3.5" />
                      {lab.channels_count || 0} canais
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {labs.length === 0 && (
        <div className="text-center py-16 space-y-4">
          <Youtube className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <div>
            <h3 className="text-lg font-medium">Nenhum lab criado</h3>
            <p className="text-muted-foreground">
              Crie seu primeiro YouTube Content Lab para começar a analisar canais e gerar roteiros.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar Lab
          </Button>
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
