import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { useCRMUsers, CRMUser } from "@/hooks/useCRMUsers";
import { CRMUserDialog } from "./CRMUserDialog";
import { UserPlus, MoreVertical, Edit, Ban, CheckCircle, Trash2, Shield } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface CRMUsersManagerProps {
  workspaceId: string;
}

export function CRMUsersManager({ workspaceId }: CRMUsersManagerProps) {
  const { users, isLoading, createUser, updateUser, toggleUserStatus, deleteUser, resetPassword } = useCRMUsers(workspaceId);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<CRMUser | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<CRMUser | undefined>();
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [userToBlock, setUserToBlock] = useState<CRMUser | undefined>();

  const handleCreateUser = () => {
    setDialogMode('create');
    setSelectedUser(undefined);
    setDialogOpen(true);
  };

  const handleEditUser = (user: CRMUser) => {
    setDialogMode('edit');
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (dialogMode === 'create') {
        await createUser.mutateAsync({
          email: data.email,
          fullName: data.fullName,
          role: data.role,
          password: data.password,
        });
      } else if (selectedUser) {
        await updateUser.mutateAsync({
          id: selectedUser.id,
          updates: {
            email: data.email,
            full_name: data.fullName,
            role: data.role,
          },
        });
      }
      setDialogOpen(false);
    } catch (error) {
      console.error("Error submitting user:", error);
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!selectedUser) return;
    
    try {
      await resetPassword.mutateAsync({
        id: selectedUser.id,
        newPassword,
      });
    } catch (error) {
      console.error("Error resetting password:", error);
    }
  };

  const handleToggleStatus = (user: CRMUser) => {
    if (user.role === 'admin' && user.is_active) {
      const adminCount = users.filter(u => u.role === 'admin' && u.is_active).length;
      if (adminCount <= 1) {
        toast.error("Não é possível bloquear o último administrador ativo");
        return;
      }
      setUserToBlock(user);
      setBlockDialogOpen(true);
    } else {
      toggleUserStatus.mutate({ id: user.id, isActive: !user.is_active });
    }
  };

  const confirmBlock = () => {
    if (userToBlock) {
      toggleUserStatus.mutate({ id: userToBlock.id, isActive: false });
      setBlockDialogOpen(false);
      setUserToBlock(undefined);
    }
  };

  const handleDeleteClick = (user: CRMUser) => {
    const adminCount = users.filter(u => u.role === 'admin').length;
    if (user.role === 'admin' && adminCount <= 1) {
      toast.error("Não é possível remover o último administrador");
      return;
    }
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUser.mutate(userToDelete.id);
      setDeleteDialogOpen(false);
      setUserToDelete(undefined);
    }
  };

  const activeUsers = users.filter(u => u.is_active).length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const collaboratorCount = users.filter(u => u.role === 'collaborator').length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usuários do CRM</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando usuários...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usuários do CRM</CardTitle>
              <CardDescription>
                Gerencie os usuários que têm acesso ao CRM deste cliente
              </CardDescription>
            </div>
            <Button onClick={handleCreateUser}>
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <div className="text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Nenhum usuário cadastrado</p>
                <p className="text-sm">Cadastre o primeiro usuário para liberar o acesso ao CRM</p>
              </div>
              <Button onClick={handleCreateUser} variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Cadastrar Primeiro Usuário
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cadastrado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? 'Admin' : 'Colaborador'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? 'default' : 'destructive'}>
                            {user.is_active ? 'Ativo' : 'Bloqueado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                                {user.is_active ? (
                                  <>
                                    <Ban className="h-4 w-4 mr-2" />
                                    Bloquear
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Ativar
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(user)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span>📊 {activeUsers} usuários ativos</span>
                <span>•</span>
                <span>{adminCount} admin{adminCount !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>{collaboratorCount} colaborador{collaboratorCount !== 1 ? 'es' : ''}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <CRMUserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        mode={dialogMode}
        user={selectedUser}
        isLoading={createUser.isPending || updateUser.isPending}
        onResetPassword={handleResetPassword}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o usuário <strong>{userToDelete?.full_name}</strong>?
              Esta ação não pode ser desfeita e o usuário perderá acesso ao CRM.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear Administrador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja bloquear o administrador <strong>{userToBlock?.full_name}</strong>?
              Ele perderá acesso ao CRM até que seja reativado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Bloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
