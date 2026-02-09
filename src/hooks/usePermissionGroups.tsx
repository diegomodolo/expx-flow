import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { MenuItemType } from "@/hooks/useEmployeePermissions";

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
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  const fetchGroups = useCallback(async () => {
    if (!activeCompany?.company_id) return;
    try {
      setLoading(true);
      const { data: groupsData, error: groupsError } = await supabase
        .from('permission_groups')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .order('name');

      if (groupsError) throw groupsError;

      const groupIds = groupsData?.map(g => g.id) || [];
      if (groupIds.length === 0) {
        setGroups([]);
        return;
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

      setGroups(result);
    } catch (err: any) {
      console.error('Error fetching permission groups:', err);
      toast({ title: "Erro", description: "Erro ao carregar grupos de permissão", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeCompany?.company_id]);

  const createGroup = async (name: string, description: string) => {
    if (!activeCompany?.company_id) return;
    try {
      const { data, error } = await supabase
        .from('permission_groups')
        .insert({ name, description: description || null, company_id: activeCompany.company_id })
        .select()
        .single();

      if (error) throw error;
      toast({ title: "Grupo criado", description: `Grupo "${name}" criado com sucesso.` });
      await fetchGroups();
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const updateGroup = async (groupId: string, name: string, description: string) => {
    try {
      const { error } = await supabase
        .from('permission_groups')
        .update({ name, description: description || null })
        .eq('id', groupId);

      if (error) throw error;
      toast({ title: "Grupo atualizado" });
      await fetchGroups();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('permission_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      toast({ title: "Grupo excluído" });
      await fetchGroups();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const toggleGroupItem = async (groupId: string, menuItem: MenuItemType) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    try {
      if (group.items.includes(menuItem)) {
        const { error } = await supabase
          .from('permission_group_items')
          .delete()
          .eq('group_id', groupId)
          .eq('menu_item', menuItem as any);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('permission_group_items')
          .insert({ group_id: groupId, menu_item: menuItem as any });
        if (error) throw error;
      }

      // Update local state optimistically
      setGroups(prev => prev.map(g => {
        if (g.id !== groupId) return g;
        const items = g.items.includes(menuItem)
          ? g.items.filter(i => i !== menuItem)
          : [...g.items, menuItem];
        return { ...g, items };
      }));
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const addMember = async (groupId: string, employeeId: string) => {
    try {
      const { error } = await supabase
        .from('permission_group_members')
        .insert({ group_id: groupId, employee_id: employeeId });

      if (error) {
        if (error.code === '23505') {
          toast({ title: "Aviso", description: "Colaborador já está neste grupo." });
          return;
        }
        throw error;
      }
      toast({ title: "Membro adicionado" });
      await fetchGroups();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const removeMember = async (groupId: string, employeeId: string) => {
    try {
      const { error } = await supabase
        .from('permission_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('employee_id', employeeId);

      if (error) throw error;
      toast({ title: "Membro removido" });
      await fetchGroups();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (activeCompany?.company_id) {
      fetchGroups();
    }
  }, [activeCompany?.company_id, fetchGroups]);

  return {
    groups,
    loading,
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    toggleGroupItem,
    addMember,
    removeMember,
  };
}
