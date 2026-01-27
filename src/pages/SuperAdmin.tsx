import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperAdmin, SuperAdminUser } from "@/hooks/useSuperAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Shield, Users, Building2, Trash2, UserMinus, Search, RefreshCw, LogOut, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SuperAdmin() {
  const navigate = useNavigate();
  const { isSuperAdmin, isLoading, users, isLoadingUsers, loadUsers, removeFromCompany, deleteUser } = useSuperAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<SuperAdminUser | null>(null);

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      toast.error("Acesso negado. Apenas super admins.");
      navigate("/");
    }
  }, [isLoading, isSuperAdmin, navigate]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadUsers();
    }
  }, [isSuperAdmin]);

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRemoveFromCompany = async (userId: string, companyId: string, companyName: string) => {
    try {
      await removeFromCompany(userId, companyId);
      toast.success(`Usuário removido de "${companyName}"`);
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover usuário");
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      await deleteUser(userId);
      toast.success(`Usuário "${userName}" deletado do sistema`);
      setSelectedUser(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao deletar usuário");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Super Admin</h1>
              <p className="text-sm text-muted-foreground">Gerenciamento global da plataforma</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            <LogOut className="h-4 w-4 mr-2" />
            Voltar ao sistema
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Com Empresa</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.companies.length > 0).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sem Empresa</CardTitle>
              <UserMinus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.companies.length === 0).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Usuários da Plataforma</CardTitle>
                <CardDescription>
                  Gerencie todos os usuários cadastrados no sistema
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-[300px]"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={loadUsers} disabled={isLoadingUsers}>
                  <RefreshCw className={`h-4 w-4 ${isLoadingUsers ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Empresas</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Último acesso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum usuário encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback>
                                  {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{user.full_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.companies.length === 0 ? (
                                <Badge variant="outline" className="text-muted-foreground">
                                  Nenhuma
                                </Badge>
                              ) : (
                                user.companies.slice(0, 2).map((company) => (
                                  <Badge key={company.id} variant="secondary" className="text-xs">
                                    {company.name}
                                  </Badge>
                                ))
                              )}
                              {user.companies.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{user.companies.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {user.created_at ? format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {user.last_sign_in_at ? format(new Date(user.last_sign_in_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "Nunca"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setSelectedUser(user)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-3">
                                      <Avatar className="h-10 w-10">
                                        <AvatarImage src={user.avatar_url} />
                                        <AvatarFallback>
                                          {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p>{user.full_name}</p>
                                        <p className="text-sm font-normal text-muted-foreground">{user.email}</p>
                                      </div>
                                    </DialogTitle>
                                    <DialogDescription>
                                      Empresas associadas a este usuário
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="space-y-4 mt-4">
                                    {user.companies.length === 0 ? (
                                      <p className="text-center text-muted-foreground py-4">
                                        Este usuário não está associado a nenhuma empresa
                                      </p>
                                    ) : (
                                      <div className="space-y-2">
                                        {user.companies.map((company) => (
                                          <div 
                                            key={company.id} 
                                            className="flex items-center justify-between p-3 rounded-lg border bg-card"
                                          >
                                            <div className="flex items-center gap-3">
                                              <Building2 className="h-5 w-5 text-muted-foreground" />
                                              <div>
                                                <p className="font-medium">{company.name}</p>
                                                <p className="text-xs text-muted-foreground capitalize">{company.role}</p>
                                              </div>
                                            </div>
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                                                  <UserMinus className="h-4 w-4 mr-1" />
                                                  Remover
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Remover de "{company.name}"?</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    O usuário "{user.full_name}" será removido desta empresa. 
                                                    Ele perderá acesso a todos os dados e recursos da empresa.
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                  <AlertDialogAction 
                                                    onClick={() => handleRemoveFromCompany(user.id, company.id, company.name)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                  >
                                                    Remover
                                                  </AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    <div className="border-t pt-4 mt-4">
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="destructive" className="w-full">
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Excluir usuário completamente
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Esta ação não pode ser desfeita. O usuário "{user.full_name}" será 
                                              removido de todas as empresas e deletado permanentemente do sistema.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction 
                                              onClick={() => handleDeleteUser(user.id, user.full_name)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Excluir permanentemente
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
