import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Trash2, 
  Settings, 
  Users, 
  GripVertical, 
  Plus, 
  X,
  Loader2,
  Save,
  DollarSign
} from "lucide-react";
import { CRMBoard } from "@/hooks/useCRMBoards";
import { useCRMUsers, CRMUser } from "@/hooks/useCRMUsers";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface EditBoardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  board: CRMBoard | null;
  onUpdate: (boardId: string, updates: { name?: string; description?: string | null; queue_enabled?: boolean; default_value?: number | null }) => Promise<void>;
  onDelete: (boardId: string) => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
}

interface QueueUser {
  id: string;
  board_id: string;
  user_id: string;
  queue_position: number;
  is_active: boolean;
  user?: CRMUser;
}

const menuItems = [
  { id: "geral", label: "Geral", icon: Settings },
  { id: "fila", label: "Fila de Atribuição", icon: Users },
];

export function EditBoardDialog({
  isOpen,
  onClose,
  board,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}: EditBoardDialogProps) {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("geral");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [queueEnabled, setQueueEnabled] = useState(false);
  const [defaultValue, setDefaultValue] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get workspace ID from board
  const workspaceId = board?.workspace_id;

  // Fetch users for the workspace
  const { users } = useCRMUsers(workspaceId);

  // Fetch queue users for this board
  const { data: queueUsers = [], isLoading: isLoadingQueue } = useQuery({
    queryKey: ['crm-board-queue', board?.id],
    queryFn: async () => {
      if (!board?.id) return [];
      
      const { data, error } = await supabase
        .from('crm_board_user_queue')
        .select('*')
        .eq('board_id', board.id)
        .order('queue_position', { ascending: true });

      if (error) throw error;
      return data as QueueUser[];
    },
    enabled: !!board?.id && isOpen,
  });

  // Update state when board changes
  useEffect(() => {
    if (board) {
      setName(board.name || "");
      setDescription(board.description || "");
      setQueueEnabled(board.queue_enabled || false);
      setDefaultValue(board.default_value ? String(board.default_value) : "");
    }
  }, [board]);

  // Reset section when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveSection("geral");
    }
  }, [isOpen]);

  // Add user to queue mutation
  const addToQueue = useMutation({
    mutationFn: async (userId: string) => {
      if (!board?.id) throw new Error("Board ID is required");

      // Get max position
      const maxPosition = queueUsers.length > 0 
        ? Math.max(...queueUsers.map(q => q.queue_position)) + 1 
        : 0;

      const { error } = await supabase
        .from('crm_board_user_queue')
        .insert({
          board_id: board.id,
          user_id: userId,
          queue_position: maxPosition,
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-board-queue', board?.id] });
      toast.success("Usuário adicionado à fila");
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error("Usuário já está na fila");
      } else {
        toast.error("Erro ao adicionar usuário à fila");
      }
    },
  });

  // Remove user from queue mutation
  const removeFromQueue = useMutation({
    mutationFn: async (queueId: string) => {
      const { error } = await supabase
        .from('crm_board_user_queue')
        .delete()
        .eq('id', queueId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-board-queue', board?.id] });
      toast.success("Usuário removido da fila");
    },
    onError: () => {
      toast.error("Erro ao remover usuário da fila");
    },
  });

  // Reorder queue mutation
  const reorderQueue = useMutation({
    mutationFn: async (newOrder: { id: string; position: number }[]) => {
      const promises = newOrder.map(item =>
        supabase
          .from('crm_board_user_queue')
          .update({ queue_position: item.position })
          .eq('id', item.id)
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-board-queue', board?.id] });
    },
    onError: () => {
      toast.error("Erro ao reordenar fila");
    },
  });

  const handleSave = async () => {
    if (!board || !name.trim()) return;
    
    const parsedDefaultValue = defaultValue.trim() ? parseFloat(defaultValue.replace(',', '.')) : null;
    
    await onUpdate(board.id, {
      name: name.trim(),
      description: description.trim() || null,
      queue_enabled: queueEnabled,
      default_value: parsedDefaultValue,
    });
    
    onClose();
  };

  const handleDelete = async () => {
    if (!board) return;
    
    try {
      await onDelete(board.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      setShowDeleteConfirm(false);
    }
  };

  const moveUserInQueue = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= queueUsers.length) return;

    const newOrder = [...queueUsers];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    
    reorderQueue.mutate(
      newOrder.map((item, idx) => ({ id: item.id, position: idx }))
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get users not in queue
  const availableUsers = users.filter(
    user => !queueUsers.some(q => q.user_id === user.id) && user.is_active
  );

  // Merge queue with user data
  const queueWithUserData = queueUsers.map(q => ({
    ...q,
    user: users.find(u => u.id === q.user_id),
  }));

  if (!board) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[800px] w-full max-h-[85vh] p-0 gap-0 overflow-hidden">
          <div className="flex h-[500px]">
            {/* Sidebar Menu */}
            <div className="w-48 border-r bg-muted/30 p-4 flex-shrink-0">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configurações
              </h2>
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {board.is_default && (
                <div className="mt-4 pt-4 border-t">
                  <Badge variant="secondary" className="w-full justify-center">
                    Quadro Padrão
                  </Badge>
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
              <ScrollArea className="flex-1 p-6">
                {activeSection === "geral" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Informações do Quadro</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="board-name">Nome do Quadro *</Label>
                          <Input
                            id="board-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Pipeline de Vendas"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="board-description">Descrição</Label>
                          <Textarea
                            id="board-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descreva o propósito deste quadro..."
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="board-default-value">Valor Padrão dos Negócios</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="board-default-value"
                              type="text"
                              inputMode="decimal"
                              value={defaultValue}
                              onChange={(e) => setDefaultValue(e.target.value)}
                              placeholder="0,00"
                              className="pl-9"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Novos negócios criados neste quadro terão este valor por padrão
                          </p>
                        </div>
                      </div>
                    </div>

                    {!board.is_default && (
                      <div className="pt-4 border-t border-border">
                        <h3 className="text-lg font-semibold mb-4 text-destructive">Zona de Perigo</h3>
                        <Button
                          variant="destructive"
                          onClick={() => setShowDeleteConfirm(true)}
                          disabled={isDeleting}
                          className="w-full"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {isDeleting ? "Deletando..." : "Deletar Quadro"}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          Esta ação não pode ser desfeita. Todos os leads serão movidos para o quadro padrão.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeSection === "fila" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Fila de Atribuição</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Quando habilitada, novos leads serão automaticamente atribuídos aos colaboradores 
                        seguindo a ordem da fila (round-robin).
                      </p>

                      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                        <div>
                          <Label htmlFor="queue-enabled" className="font-medium">
                            Habilitar Fila
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Ativar atribuição automática de leads
                          </p>
                        </div>
                        <Switch
                          id="queue-enabled"
                          checked={queueEnabled}
                          onCheckedChange={setQueueEnabled}
                        />
                      </div>
                    </div>

                    {queueEnabled && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Colaboradores na Fila</h4>
                          {availableUsers.length > 0 && (
                            <div className="flex items-center gap-2">
                              <select
                                className="text-sm border rounded-md px-2 py-1 bg-background"
                                onChange={(e) => {
                                  if (e.target.value) {
                                    addToQueue.mutate(e.target.value);
                                    e.target.value = "";
                                  }
                                }}
                                defaultValue=""
                              >
                                <option value="" disabled>Adicionar usuário...</option>
                                {availableUsers.map(user => (
                                  <option key={user.id} value={user.id}>
                                    {user.full_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {isLoadingQueue ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : queueWithUserData.length === 0 ? (
                          <div className="text-center py-8 border rounded-lg bg-muted/20">
                            <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">Nenhum colaborador na fila</p>
                            <p className="text-sm text-muted-foreground">
                              Adicione colaboradores para ativar a atribuição automática
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {queueWithUserData.map((queueItem, index) => (
                              <div
                                key={queueItem.id}
                                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                              >
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    onClick={() => moveUserInQueue(index, 'up')}
                                    disabled={index === 0}
                                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <GripVertical className="w-4 h-4 rotate-180" />
                                  </button>
                                  <button
                                    onClick={() => moveUserInQueue(index, 'down')}
                                    disabled={index === queueWithUserData.length - 1}
                                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </button>
                                </div>
                                
                                <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center p-0">
                                  {index + 1}
                                </Badge>

                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {queueItem.user ? getInitials(queueItem.user.full_name) : "?"}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">
                                    {queueItem.user?.full_name || "Usuário não encontrado"}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {queueItem.user?.email}
                                  </div>
                                </div>

                                {index === 0 && (
                                  <Badge variant="default" className="text-xs">
                                    Próximo
                                  </Badge>
                                )}

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFromQueue.mutate(queueItem.id)}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                          O colaborador no topo da fila receberá o próximo lead. Após receber, 
                          ele vai para o final da fila.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Footer */}
              <div className="border-t p-4 flex justify-end gap-2 bg-background">
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={!name.trim() || isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O quadro "{board.name}" será deletado permanentemente 
              e todos os leads serão movidos para o quadro padrão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Deletar Quadro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}