import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, User, Eye, Send, Star, Trash2, Search, UserPlus } from "lucide-react";
import { WhatsAppInstance, WhatsAppInstanceUser } from "@/hooks/useWhatsAppInstances";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

interface AssignedUserWithProfile extends WhatsAppInstanceUser {
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
  const [assignedUsers, setAssignedUsers] = useState<AssignedUserWithProfile[]>([]);
  const [comboOpen, setComboOpen] = useState(false);

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
        .select("user_id, role")
        .eq("company_id", activeCompany.company_id);

      if (membersError) throw membersError;

      // Fetch profiles separately
      const userIds = members?.map(m => m.user_id) || [];
      let profilesMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        profiles?.forEach(p => {
          profilesMap[p.id] = p.full_name || "Usuário";
        });
      }

      const users: CompanyUser[] = members?.map(m => ({
        user_id: m.user_id,
        full_name: profilesMap[m.user_id] || "Usuário",
        role: m.role,
      })) || [];

      setCompanyUsers(users);

      // Fetch assigned users
      const assigned = await fetchInstanceUsers(instance.id);
      
      // Merge with profile data
      const assignedWithProfiles: AssignedUserWithProfile[] = assigned.map(a => {
        const companyUser = users.find(u => u.user_id === a.user_id);
        return {
          ...a,
          full_name: companyUser?.full_name || "Usuário",
          role: companyUser?.role || "member",
        };
      });
      
      setAssignedUsers(assignedWithProfiles);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Users available to add (not yet assigned)
  const availableUsers = useMemo(() => {
    const assignedIds = new Set(assignedUsers.map(u => u.user_id));
    return companyUsers.filter(u => !assignedIds.has(u.user_id));
  }, [companyUsers, assignedUsers]);

  const handleAddUser = (user: CompanyUser) => {
    if (!instance) return;

    onAssignUser({
      instance_id: instance.id,
      user_id: user.user_id,
      can_view: true,
      can_send: true,
      is_default: false,
    });

    // Add to local state immediately
    setAssignedUsers(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        instance_id: instance.id,
        user_id: user.user_id,
        can_view: true,
        can_send: true,
        is_default: false,
        created_at: new Date().toISOString(),
        full_name: user.full_name,
        role: user.role,
      },
    ]);

    setComboOpen(false);
  };

  const handleRemoveUser = (userId: string) => {
    if (!instance) return;

    onRemoveUser({ instance_id: instance.id, user_id: userId });
    setAssignedUsers(prev => prev.filter(u => u.user_id !== userId));
  };

  const handleTogglePermission = (userId: string, permission: 'can_view' | 'can_send' | 'is_default', newValue: boolean) => {
    if (!instance) return;

    const user = assignedUsers.find(u => u.user_id === userId);
    if (!user) return;

    onAssignUser({
      instance_id: instance.id,
      user_id: userId,
      can_view: permission === 'can_view' ? newValue : user.can_view ?? true,
      can_send: permission === 'can_send' ? newValue : user.can_send ?? true,
      is_default: permission === 'is_default' ? newValue : user.is_default ?? false,
    });

    setAssignedUsers(prev =>
      prev.map(u =>
        u.user_id === userId ? { ...u, [permission]: newValue } : u
      )
    );
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
          <div className="space-y-4">
            {/* Combobox to add users */}
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboOpen}
                  className="w-full justify-start gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="text-muted-foreground">Adicionar colaborador...</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Pesquisar colaborador..." />
                  <CommandList>
                    <CommandEmpty>Nenhum colaborador disponível</CommandEmpty>
                    <CommandGroup>
                      {availableUsers.map(user => (
                        <CommandItem
                          key={user.user_id}
                          value={user.full_name}
                          onSelect={() => handleAddUser(user)}
                          className="cursor-pointer"
                        >
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{user.full_name}</span>
                          <span className="ml-2 text-xs text-muted-foreground capitalize">
                            ({user.role})
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Assigned users list */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Usuários com acesso ({assignedUsers.length})
              </Label>
              
              <ScrollArea className="max-h-[300px]">
                {assignedUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum usuário atribuído a esta instância
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignedUsers.map(user => (
                      <div
                        key={user.user_id}
                        className="p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{user.full_name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveUser(user.user_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-6 pl-10">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`view-${user.user_id}`}
                              checked={user.can_view ?? true}
                              onCheckedChange={(checked) => handleTogglePermission(user.user_id, 'can_view', checked)}
                            />
                            <Label htmlFor={`view-${user.user_id}`} className="text-xs flex items-center gap-1 cursor-pointer">
                              <Eye className="h-3 w-3" />
                              Ver
                            </Label>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`send-${user.user_id}`}
                              checked={user.can_send ?? true}
                              onCheckedChange={(checked) => handleTogglePermission(user.user_id, 'can_send', checked)}
                            />
                            <Label htmlFor={`send-${user.user_id}`} className="text-xs flex items-center gap-1 cursor-pointer">
                              <Send className="h-3 w-3" />
                              Enviar
                            </Label>
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              id={`default-${user.user_id}`}
                              checked={user.is_default ?? false}
                              onCheckedChange={(checked) => handleTogglePermission(user.user_id, 'is_default', checked)}
                            />
                            <Label htmlFor={`default-${user.user_id}`} className="text-xs flex items-center gap-1 cursor-pointer">
                              <Star className="h-3 w-3" />
                              Padrão
                            </Label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}

        <div className="border-t pt-4 mt-2">
          <p className="text-xs text-muted-foreground">
            <strong>Ver:</strong> pode visualizar conversas •{" "}
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
