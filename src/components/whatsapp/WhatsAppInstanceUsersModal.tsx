import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, User, Eye, Send, Star } from "lucide-react";
import { WhatsAppInstance, WhatsAppInstanceUser } from "@/hooks/useWhatsAppInstances";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

interface WhatsAppInstanceUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: WhatsAppInstance | null;
  fetchInstanceUsers: (instanceId: string) => Promise<WhatsAppInstanceUser[]>;
  onAssignUser: (data: {
    instance_id: string;
    user_id: string;
    can_view: boolean;
    can_send: boolean;
    is_default: boolean;
  }) => void;
  onRemoveUser: (data: { instance_id: string; user_id: string }) => void;
}

interface CompanyUser {
  user_id: string;
  full_name: string;
  role: string;
}

export function WhatsAppInstanceUsersModal({
  open,
  onOpenChange,
  instance,
  fetchInstanceUsers,
  onAssignUser,
  onRemoveUser,
}: WhatsAppInstanceUsersModalProps) {
  const { activeCompany } = useCompany();
  const [isLoading, setIsLoading] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<WhatsAppInstanceUser[]>([]);
  const [userPermissions, setUserPermissions] = useState<Record<string, {
    assigned: boolean;
    can_view: boolean;
    can_send: boolean;
    is_default: boolean;
  }>>({});

  useEffect(() => {
    if (open && instance && activeCompany) {
      loadData();
    }
  }, [open, instance, activeCompany]);

  const loadData = async () => {
    if (!instance || !activeCompany) return;

    setIsLoading(true);
    try {
      // Fetch company members
      const { data: members, error: membersError } = await supabase
        .from("company_members")
        .select(`
          user_id,
          role,
          profiles:user_id (
            full_name
          )
        `)
        .eq("company_id", activeCompany.company_id);

      if (membersError) throw membersError;

      const users: CompanyUser[] = members?.map(m => ({
        user_id: m.user_id,
        full_name: (m.profiles as any)?.full_name || "Usuário",
        role: m.role,
      })) || [];

      setCompanyUsers(users);

      // Fetch assigned users
      const assigned = await fetchInstanceUsers(instance.id);
      setAssignedUsers(assigned);

      // Initialize permissions
      const perms: Record<string, any> = {};
      users.forEach(user => {
        const assignedUser = assigned.find(a => a.user_id === user.user_id);
        perms[user.user_id] = {
          assigned: !!assignedUser,
          can_view: assignedUser?.can_view ?? true,
          can_send: assignedUser?.can_send ?? true,
          is_default: assignedUser?.is_default ?? false,
        };
      });
      setUserPermissions(perms);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUser = (userId: string) => {
    if (!instance) return;

    const currentPerms = userPermissions[userId];
    
    if (currentPerms.assigned) {
      // Remove user
      onRemoveUser({ instance_id: instance.id, user_id: userId });
      setUserPermissions(prev => ({
        ...prev,
        [userId]: { ...prev[userId], assigned: false },
      }));
    } else {
      // Assign user
      onAssignUser({
        instance_id: instance.id,
        user_id: userId,
        can_view: true,
        can_send: true,
        is_default: false,
      });
      setUserPermissions(prev => ({
        ...prev,
        [userId]: { ...prev[userId], assigned: true },
      }));
    }
  };

  const handleTogglePermission = (userId: string, permission: 'can_view' | 'can_send' | 'is_default') => {
    if (!instance) return;

    const currentPerms = userPermissions[userId];
    if (!currentPerms.assigned) return;

    const newValue = !currentPerms[permission];
    
    onAssignUser({
      instance_id: instance.id,
      user_id: userId,
      can_view: permission === 'can_view' ? newValue : currentPerms.can_view,
      can_send: permission === 'can_send' ? newValue : currentPerms.can_send,
      is_default: permission === 'is_default' ? newValue : currentPerms.is_default,
    });

    setUserPermissions(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [permission]: newValue },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Usuários da Instância: {instance?.instance_name}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {companyUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum usuário encontrado na empresa
                </p>
              ) : (
                companyUsers.map(user => {
                  const perms = userPermissions[user.user_id] || {
                    assigned: false,
                    can_view: true,
                    can_send: true,
                    is_default: false,
                  };

                  return (
                    <div
                      key={user.user_id}
                      className={`p-3 rounded-lg border transition-colors ${
                        perms.assigned 
                          ? "bg-primary/5 border-primary/20" 
                          : "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`user-${user.user_id}`}
                          checked={perms.assigned}
                          onCheckedChange={() => handleToggleUser(user.user_id)}
                        />
                        <div className="flex-1 min-w-0">
                          <Label
                            htmlFor={`user-${user.user_id}`}
                            className="font-medium cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">{user.full_name}</span>
                              <span className="text-xs text-muted-foreground capitalize">
                                ({user.role})
                              </span>
                            </div>
                          </Label>
                        </div>
                      </div>

                      {perms.assigned && (
                        <div className="flex items-center gap-4 mt-3 ml-7">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`view-${user.user_id}`}
                              checked={perms.can_view}
                              onCheckedChange={() => handleTogglePermission(user.user_id, 'can_view')}
                            />
                            <Label htmlFor={`view-${user.user_id}`} className="text-xs flex items-center gap-1 cursor-pointer">
                              <Eye className="h-3 w-3" />
                              Ver
                            </Label>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`send-${user.user_id}`}
                              checked={perms.can_send}
                              onCheckedChange={() => handleTogglePermission(user.user_id, 'can_send')}
                            />
                            <Label htmlFor={`send-${user.user_id}`} className="text-xs flex items-center gap-1 cursor-pointer">
                              <Send className="h-3 w-3" />
                              Enviar
                            </Label>
                          </div>

                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`default-${user.user_id}`}
                              checked={perms.is_default}
                              onCheckedChange={() => handleTogglePermission(user.user_id, 'is_default')}
                            />
                            <Label htmlFor={`default-${user.user_id}`} className="text-xs flex items-center gap-1 cursor-pointer">
                              <Star className="h-3 w-3" />
                              Padrão
                            </Label>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        )}

        <div className="border-t pt-4 mt-2">
          <p className="text-xs text-muted-foreground">
            <strong>Ver:</strong> pode visualizar conversas desta instância •{" "}
            <strong>Enviar:</strong> pode enviar mensagens •{" "}
            <strong>Padrão:</strong> instância padrão ao abrir o chat
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
