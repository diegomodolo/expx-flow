import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { MenuItemType } from "@/hooks/useEmployeePermissions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface PermissionGroup {
  id: string;
  name: string;
  description: string | null;
  company_id: string;
  created_at: string;
  updated_at: string;
  items: MenuItemType[];
  members: { id: string; employee_id: string }[];
}

export function usePermissionGroups() {
  const { toast } = useToast();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const queryKey = ["permission_groups", activeCompany?.company_id];

  const fetchGroupsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const { data: groupsData, error: groupsError } = await supabase
        .from('permission_groups')
        .select('*')
        .eq('company_id', activeCompany!.company_id)
        .order('name');

      if (groupsError) throw groupsError;

      const groupIds = groupsData?.map(g => g.id) || [];
      if (groupIds.length === 0) {
        return [];
      }

      const [{ data: items }, { data: members }] = await Promise.all([
        supabase.from('permission_group_items').select('*').in('group_id', groupIds),
        supabase.from('permission_group_members').select('*').in('group_id', groupIds),
      ]);

      const result: PermissionGroup[] = (groupsData || []).map(g => ({
        ...g,
        items: (items || []).filter(i => i.group_id === g.id).map(i => i.menu_item as MenuItemType),
        members: (members || []).filter(m => m.group_id === g.id).map(m => ({ id: m.id, employee_id: m.employee_id })),
      }));

      return result;
    },
    enabled: !!activeCompany?.company_id,
  });

  const groups = fetchGroupsQuery.data || [];

  const createGroupMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      if (!activeCompany?.company_id) throw new Error("Missing company_id");
      const { data, error } = await supabase
        .from('permission_groups')
        .insert({ name, description: description || null, company_id: activeCompany.company_id })
        .select()
        .single();

      if (error) throw error;
      return { data, name };
    },
    onSuccess: (result) => {
      toast({ title: "Grupo criado", description: `Grupo "${result.name}" criado com sucesso.` });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ groupId, name, description }: { groupId: string; name: string; description: string }) => {
      const { error } = await supabase
        .from('permission_groups')
        .update({ name, description: description || null })
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Grupo atualizado" });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('permission_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Grupo excluído" });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const toggleGroupItemMutation = useMutation({
    mutationFn: async ({ groupId, menuItem }: { groupId: string; menuItem: MenuItemType }) => {
      const group = groups.find(g => g.id === groupId);
      if (!group) throw new Error("Grupo não encontrado");

      if (group.items.includes(menuItem)) {
        const { error } = await supabase
          .from('permission_group_items')
          .delete()
          .eq('group_id', groupId)
          .eq('menu_item', menuItem as unknown);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('permission_group_items')
          .insert({ group_id: groupId, menu_item: menuItem as unknown });
        if (error) throw error;
      }
    },
    onMutate: async ({ groupId, menuItem }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousGroups = queryClient.getQueryData<PermissionGroup[]>(queryKey);

      queryClient.setQueryData<PermissionGroup[]>(queryKey, old => {
        if (!old) return old;
        return old.map(g => {
          if (g.id !== groupId) return g;
          const items = g.items.includes(menuItem)
            ? g.items.filter(i => i !== menuItem)
            : [...g.items, menuItem];
          return { ...g, items };
        });
      });

      return { previousGroups };
    },
    onError: (err: Error, newGroup, context) => {
      if (context?.previousGroups) {
        queryClient.setQueryData(queryKey, context.previousGroups);
      }
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const setAllGroupItemsMutation = useMutation({
    mutationFn: async ({ groupId, allMenuItems, enable }: { groupId: string; allMenuItems: MenuItemType[]; enable: boolean }) => {
      if (enable) {
        const group = groups.find(g => g.id === groupId);
        const existingItems = group?.items || [];
        const newItems = allMenuItems.filter(item => !existingItems.includes(item));
        if (newItems.length > 0) {
          const { error } = await supabase
            .from('permission_group_items')
            .insert(newItems.map(item => ({ group_id: groupId, menu_item: item as unknown })));
          if (error) throw error;
        }
      } else {
        const { error } = await supabase
          .from('permission_group_items')
          .delete()
          .eq('group_id', groupId);
        if (error) throw error;
      }
      return enable;
    },
    onMutate: async ({ groupId, allMenuItems, enable }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousGroups = queryClient.getQueryData<PermissionGroup[]>(queryKey);

      queryClient.setQueryData<PermissionGroup[]>(queryKey, old => {
        if (!old) return old;
        return old.map(g => {
          if (g.id !== groupId) return g;
          return { ...g, items: enable ? [...allMenuItems] : [] };
        });
      });

      return { previousGroups };
    },
    onSuccess: (enable) => {
      toast({ title: enable ? "Todas permissões ativadas" : "Todas permissões desativadas" });
    },
    onError: (err: Error, newGroup, context) => {
      if (context?.previousGroups) {
        queryClient.setQueryData(queryKey, context.previousGroups);
      }
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ groupId, employeeId }: { groupId: string; employeeId: string }) => {
      const { error } = await supabase
        .from('permission_group_members')
        .insert({ group_id: groupId, employee_id: employeeId });

      if (error) {
        if (error.code === '23505') {
          throw new Error("Colaborador já está neste grupo.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Membro adicionado" });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => {
      if (err.message === "Colaborador já está neste grupo.") {
        toast({ title: "Aviso", description: err.message });
      } else {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      }
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ groupId, employeeId }: { groupId: string; employeeId: string }) => {
      const { error } = await supabase
        .from('permission_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('employee_id', employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Membro removido" });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  return {
    groups,
    loading: fetchGroupsQuery.isLoading,
    fetchGroups: fetchGroupsQuery.refetch,
    createGroup: async (name: string, description: string) => {
      const result = await createGroupMutation.mutateAsync({ name, description }).catch(() => null);
      return result?.data;
    },
    updateGroup: async (groupId: string, name: string, description: string) => {
      await updateGroupMutation.mutateAsync({ groupId, name, description }).catch(() => {});
    },
    deleteGroup: async (groupId: string) => {
      await deleteGroupMutation.mutateAsync(groupId).catch(() => {});
    },
    toggleGroupItem: async (groupId: string, menuItem: MenuItemType) => {
      await toggleGroupItemMutation.mutateAsync({ groupId, menuItem }).catch(() => {});
    },
    setAllGroupItems: async (groupId: string, allMenuItems: MenuItemType[], enable: boolean) => {
      await setAllGroupItemsMutation.mutateAsync({ groupId, allMenuItems, enable }).catch(() => {});
    },
    addMember: async (groupId: string, employeeId: string) => {
      await addMemberMutation.mutateAsync({ groupId, employeeId }).catch(() => {});
    },
    removeMember: async (groupId: string, employeeId: string) => {
      await removeMemberMutation.mutateAsync({ groupId, employeeId }).catch(() => {});
    },
  };
}
