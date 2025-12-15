import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ClientNotificationSettings {
  id: string;
  company_id: string;
  client_id: string;
  gestor_employee_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    name: string;
    company: string;
  };
  gestor?: {
    id: string;
    name: string;
    phone: string | null;
  };
}

export interface TriggerSubscription {
  id: string;
  client_settings_id: string;
  trigger_id: string;
  destination: 'gestor' | 'cliente' | 'ambos';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  trigger?: {
    id: string;
    trigger_name: string;
    trigger_type: string;
  };
}

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

export function useClientNotificationSettings(companyId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch client notification settings with related data
  const { data: clientSettings = [], isLoading: isLoadingSettings } = useQuery({
    queryKey: ['whatsapp-client-settings', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('whatsapp_client_notification_settings')
        .select(`
          *,
          client:clients(id, name, company),
          gestor:employees(id, name, phone)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ClientNotificationSettings[];
    },
    enabled: !!companyId,
  });

  // Fetch trigger subscriptions for a specific client settings
  const fetchSubscriptions = async (clientSettingsId: string) => {
    const { data, error } = await supabase
      .from('whatsapp_client_trigger_subscriptions')
      .select(`
        *,
        trigger:whatsapp_notification_triggers(id, trigger_name, trigger_type)
      `)
      .eq('client_settings_id', clientSettingsId);

    if (error) throw error;
    return data as TriggerSubscription[];
  };

  // Fetch contacts for a specific client
  const fetchClientContacts = async (clientId: string) => {
    if (!companyId) return [];

    const { data, error } = await supabase
      .from('whatsapp_client_contacts')
      .select('*')
      .eq('company_id', companyId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ClientContact[];
  };

  // Create client notification settings
  const createSettingsMutation = useMutation({
    mutationFn: async (data: { clientId: string; gestorEmployeeId?: string }) => {
      if (!companyId) throw new Error('Company ID required');

      const { data: settings, error } = await supabase
        .from('whatsapp_client_notification_settings')
        .insert({
          company_id: companyId,
          client_id: data.clientId,
          gestor_employee_id: data.gestorEmployeeId || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-client-settings'] });
      toast({ title: 'Cliente adicionado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao adicionar cliente', description: error.message, variant: 'destructive' });
    },
  });

  // Update client notification settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { id: string; gestorEmployeeId?: string | null; isActive?: boolean }) => {
      const updateData: Record<string, any> = {};
      if (data.gestorEmployeeId !== undefined) updateData.gestor_employee_id = data.gestorEmployeeId;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;

      const { error } = await supabase
        .from('whatsapp_client_notification_settings')
        .update(updateData)
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-client-settings'] });
      toast({ title: 'Configurações atualizadas!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  // Delete client notification settings
  const deleteSettingsMutation = useMutation({
    mutationFn: async (settingsId: string) => {
      const { error } = await supabase
        .from('whatsapp_client_notification_settings')
        .delete()
        .eq('id', settingsId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-client-settings'] });
      toast({ title: 'Cliente removido das notificações!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    },
  });

  // Add/Update trigger subscription
  const upsertSubscriptionMutation = useMutation({
    mutationFn: async (data: { 
      clientSettingsId: string; 
      triggerId: string; 
      destination: 'gestor' | 'cliente' | 'ambos';
      isActive: boolean;
    }) => {
      const { error } = await supabase
        .from('whatsapp_client_trigger_subscriptions')
        .upsert({
          client_settings_id: data.clientSettingsId,
          trigger_id: data.triggerId,
          destination: data.destination,
          is_active: data.isActive,
        }, {
          onConflict: 'client_settings_id,trigger_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-subscriptions'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar inscrição', description: error.message, variant: 'destructive' });
    },
  });

  // Delete trigger subscription
  const deleteSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase
        .from('whatsapp_client_trigger_subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-subscriptions'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover inscrição', description: error.message, variant: 'destructive' });
    },
  });

  // Create contact
  const createContactMutation = useMutation({
    mutationFn: async (contact: { clientId: string; contactName: string; phone: string; email?: string }) => {
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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-client-contacts'] });
      toast({ title: 'Contato adicionado!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao adicionar contato', description: error.message, variant: 'destructive' });
    },
  });

  // Update contact
  const updateContactMutation = useMutation({
    mutationFn: async (contact: { id: string; contactName?: string; phone?: string; email?: string; isActive?: boolean }) => {
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
      queryClient.invalidateQueries({ queryKey: ['whatsapp-client-contacts'] });
      toast({ title: 'Contato removido!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover contato', description: error.message, variant: 'destructive' });
    },
  });

  return {
    clientSettings,
    isLoadingSettings,
    fetchSubscriptions,
    fetchClientContacts,
    createSettings: createSettingsMutation.mutate,
    isCreatingSettings: createSettingsMutation.isPending,
    updateSettings: updateSettingsMutation.mutate,
    isUpdatingSettings: updateSettingsMutation.isPending,
    deleteSettings: deleteSettingsMutation.mutate,
    isDeletingSettings: deleteSettingsMutation.isPending,
    upsertSubscription: upsertSubscriptionMutation.mutate,
    deleteSubscription: deleteSubscriptionMutation.mutate,
    createContact: createContactMutation.mutate,
    isCreatingContact: createContactMutation.isPending,
    updateContact: updateContactMutation.mutate,
    isUpdatingContact: updateContactMutation.isPending,
    deleteContact: deleteContactMutation.mutate,
    isDeletingContact: deleteContactMutation.isPending,
  };
}
