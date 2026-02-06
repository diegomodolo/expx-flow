import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, UserPlus } from "lucide-react";
import { useWorkspaceShares } from "@/hooks/useWorkspaceShares";
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WorkspaceShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: 'folder' | 'document';
  resourceId: string;
  resourceName: string;
}

export function WorkspaceShareDialog({
  open,
  onOpenChange,
  resourceType,
  resourceId,
  resourceName,
}: WorkspaceShareDialogProps) {
  const { user } = useAuth();
  const { shares, companyUsers, createShare, updateShare, deleteShare, isLoading } = useWorkspaceShares(
    resourceType,
    resourceId
  );
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedPermission, setSelectedPermission] = useState<'view' | 'edit' | 'admin'>('view');

  // Filter out users who already have access and the current user
  const availableUsers = companyUsers.filter(
    u => u.user_id !== user?.id && !shares.some(s => s.shared_with_user_id === u.user_id)
  );

  const handleAddShare = async () => {
    if (!selectedUser) return;
    
    await createShare.mutateAsync({
      resourceType,
      resourceId,
      sharedWithUserId: selectedUser,
      permission: selectedPermission,
    });
    
    setSelectedUser('');
  };

  const handlePermissionChange = async (shareId: string, permission: 'view' | 'edit' | 'admin') => {
    await updateShare.mutateAsync({ id: shareId, permission });
  };

  const handleRemoveShare = async (shareId: string) => {
    await deleteShare.mutateAsync(shareId);
  };

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case 'view': return 'Visualizar';
      case 'edit': return 'Editar';
      case 'admin': return 'Administrador';
      default: return permission;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Compartilhar "{resourceName}"</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add new share */}
          {availableUsers.length > 0 && (
            <div className="flex gap-2">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={u.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {u.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span>{u.full_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPermission} onValueChange={(v: any) => setSelectedPermission(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Visualizar</SelectItem>
                  <SelectItem value="edit">Editar</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={handleAddShare} 
                disabled={!selectedUser || createShare.isPending}
                size="icon"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Current shares */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Pessoas com acesso
            </h4>
            
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {shares.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum compartilhamento ainda
                  </p>
                ) : (
                  shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={share.shared_with_user?.avatar_url} />
                          <AvatarFallback>
                            {share.shared_with_user?.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {share.shared_with_user?.full_name || 'Usuário'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={share.permission}
                          onValueChange={(v: any) => handlePermissionChange(share.id, v)}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="view">Visualizar</SelectItem>
                            <SelectItem value="edit">Editar</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveShare(share.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
