import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ClientContact {
  id: string;
  company_id: string;
  client_id: string;
  contact_name: string;
  phone: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

export function useClientContacts(companyId: string | undefined, clientId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch contacts for a specific client
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['client-contacts', companyId, clientId],
    queryFn: async () => {
      if (!companyId || !clientId) return [];

      const { data, error } = await supabase
        .from('whatsapp_client_contacts')
        .select('*')
        .eq('company_id', companyId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ClientContact[];
    },
    enabled: !!companyId && !!clientId,
  });

  // Fetch contacts by client ID (for use when clientId is passed dynamically)
  const fetchContactsByClientId = async (targetClientId: string) => {
    if (!companyId) return [];

    const { data, error } = await supabase
      .from('whatsapp_client_contacts')
      .select('*')
      .eq('company_id', companyId)
      .eq('client_id', targetClientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ClientContact[];
  };

  // Create contact
  const createContactMutation = useMutation({
    mutationFn: async (contact: { 
      clientId: string; 
      contactName: string; 
      phone: string; 
      email?: string 
    }) => {
      if (!companyId) throw new Error('Company ID required');

      const { data, error } = await supabase
        .from('whatsapp_client_contacts')
        .insert({
          company_id: companyId,
          client_id: contact.clientId,
          contact_name: contact.contactName,
          phone: contact.phone,
          email: contact.email || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ClientContact;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-contacts', companyId, variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-client-contacts'] });
      toast({ title: 'Contato adicionado!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao adicionar contato', description: error.message, variant: 'destructive' });
    },
  });

  // Update contact
  const updateContactMutation = useMutation({
    mutationFn: async (contact: { 
      id: string; 
      contactName?: string; 
      phone?: string; 
      email?: string; 
      isActive?: boolean 
    }) => {
      const updateData: Record<string, any> = {};
      if (contact.contactName !== undefined) updateData.contact_name = contact.contactName;
      if (contact.phone !== undefined) updateData.phone = contact.phone;
      if (contact.email !== undefined) updateData.email = contact.email;
      if (contact.isActive !== undefined) updateData.is_active = contact.isActive;

      const { error } = await supabase
        .from('whatsapp_client_contacts')
        .update(updateData)
        .eq('id', contact.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-client-contacts'] });
      toast({ title: 'Contato atualizado!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar contato', description: error.message, variant: 'destructive' });
    },
  });

  // Delete contact
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from('whatsapp_client_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-client-contacts'] });
      toast({ title: 'Contato removido!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover contato', description: error.message, variant: 'destructive' });
    },
  });

  return {
    contacts,
    isLoading,
    fetchContactsByClientId,
    createContact: createContactMutation.mutate,
    createContactAsync: createContactMutation.mutateAsync,
    isCreating: createContactMutation.isPending,
    updateContact: updateContactMutation.mutate,
    isUpdating: updateContactMutation.isPending,
    deleteContact: deleteContactMutation.mutate,
    isDeleting: deleteContactMutation.isPending,
  };
}
