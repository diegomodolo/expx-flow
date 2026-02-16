import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TaskClient {
  id: string;
  task_id: string;
  client_id: string;
  company_id: string;
  created_at: string;
  client_name?: string;
  client_avatar?: string;
}

export interface TaskClientContactPerson {
  id: string;
  task_client_id: string;
  contact_id: string;
  company_id: string;
  created_at: string;
  contact_name?: string;
  phone?: string;
  email?: string | null;
}

export function useTaskClients(taskId: string | undefined, companyId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: taskClients = [], isLoading } = useQuery({
    queryKey: ['task-clients', taskId],
    queryFn: async () => {
      if (!taskId || !companyId) return [];
      const { data, error } = await supabase
        .from('task_clients' as any)
        .select('*, clients:client_id(name, avatar)')
        .eq('task_id', taskId)
        .eq('company_id', companyId);
      if (error) throw error;
      return (data || []).map((tc: any) => ({
        id: tc.id,
        task_id: tc.task_id,
        client_id: tc.client_id,
        company_id: tc.company_id,
        created_at: tc.created_at,
        client_name: tc.clients?.name || '',
        client_avatar: tc.clients?.avatar || null,
      })) as TaskClient[];
    },
    enabled: !!taskId && !!companyId,
  });

  const addClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      if (!taskId || !companyId) throw new Error('Missing task/company');
      const { data, error } = await supabase
        .from('task_clients' as any)
        .insert({ task_id: taskId, client_id: clientId, company_id: companyId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-clients', taskId] });
      toast({ title: 'Cliente adicionado à tarefa!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const removeClientMutation = useMutation({
    mutationFn: async (taskClientId: string) => {
      const { error } = await supabase
        .from('task_clients' as any)
        .delete()
        .eq('id', taskClientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-clients', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-client-contacts'] });
      toast({ title: 'Cliente removido da tarefa!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  return {
    taskClients,
    isLoading,
    addClient: addClientMutation.mutate,
    isAdding: addClientMutation.isPending,
    removeClient: removeClientMutation.mutate,
    isRemoving: removeClientMutation.isPending,
  };
}

export function useTaskClientContacts(taskClientId: string | undefined, companyId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contactPersons = [], isLoading } = useQuery({
    queryKey: ['task-client-contacts', taskClientId],
    queryFn: async () => {
      if (!taskClientId || !companyId) return [];
      const { data, error } = await supabase
        .from('task_client_contact_persons' as any)
        .select('*, whatsapp_client_contacts:contact_id(contact_name, phone, email)')
        .eq('task_client_id', taskClientId)
        .eq('company_id', companyId);
      if (error) throw error;
      return (data || []).map((cp: any) => ({
        id: cp.id,
        task_client_id: cp.task_client_id,
        contact_id: cp.contact_id,
        company_id: cp.company_id,
        created_at: cp.created_at,
        contact_name: cp.whatsapp_client_contacts?.contact_name || '',
        phone: cp.whatsapp_client_contacts?.phone || '',
        email: cp.whatsapp_client_contacts?.email || null,
      })) as TaskClientContactPerson[];
    },
    enabled: !!taskClientId && !!companyId,
  });

  const addContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      if (!taskClientId || !companyId) throw new Error('Missing data');
      const { data, error } = await supabase
        .from('task_client_contact_persons' as any)
        .insert({ task_client_id: taskClientId, contact_id: contactId, company_id: companyId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-client-contacts', taskClientId] });
      toast({ title: 'Contato adicionado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const removeContactMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('task_client_contact_persons' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-client-contacts', taskClientId] });
      toast({ title: 'Contato removido!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  return {
    contactPersons,
    isLoading,
    addContact: addContactMutation.mutate,
    isAdding: addContactMutation.isPending,
    removeContact: removeContactMutation.mutate,
    isRemoving: removeContactMutation.isPending,
  };
}
