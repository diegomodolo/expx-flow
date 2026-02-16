import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useTaskFlows } from "@/hooks/useTaskFlows";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Loader2,
  GitBranch,
  Trash2,
  MoreHorizontal,
  Search,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TaskFlows() {
  const navigate = useNavigate();
  const { flows, isLoading, createFlow, deleteFlow, isCreating } = useTaskFlows();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredFlows = flows.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    const flow = await createFlow("Novo Fluxo");
    if (flow) navigate(`/fluxos/${flow.id}`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fluxos de Tarefas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Crie fluxos visuais conectando quadros e definindo ações automáticas
            </p>
          </div>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Novo Fluxo
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fluxo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredFlows.length === 0 ? (
          <Card className="p-12 text-center">
            <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {search ? "Nenhum fluxo encontrado" : "Nenhum fluxo criado"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search
                ? "Tente buscar com outro termo."
                : "Crie seu primeiro fluxo de tarefas para conectar quadros e automatizar movimentações."}
            </p>
            {!search && (
              <Button onClick={handleCreate} disabled={isCreating}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Fluxo
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFlows.map((flow) => (
              <Card
                key={flow.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => navigate(`/fluxos/${flow.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <GitBranch className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{flow.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(flow.updated_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(flow.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {flow.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{flow.description}</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fluxo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O fluxo será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteFlow(deleteId); setDeleteId(null); } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
