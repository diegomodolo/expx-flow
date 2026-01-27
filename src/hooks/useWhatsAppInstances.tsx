import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface WhatsAppInstance {
  id: string;
  company_id: string;
  instance_name: string;
  session_id: string;
  is_connected: boolean;
  connected_phone: string | null;
  last_connection_test: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // New v2 fields
  uazapi_instance_id?: string | null;
  uazapi_token?: string | null;
  status?: string | null;
  profile_name?: string | null;
  profile_pic_url?: string | null;
}

export interface WhatsAppInstanceUser {
  id: string;
  instance_id: string;
  user_id: string;
  can_view: boolean;
  can_send: boolean;
  is_default: boolean;
  created_at: string;
  // Joined from profiles
  user_name?: string;
  user_email?: string;
}

export function useWhatsAppInstances(companyId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all instances for a company
  const { data: instances, isLoading: isLoadingInstances } = useQuery({
    queryKey: ["whatsapp-instances", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("instance_name");
      if (error) throw error;
      return data as WhatsAppInstance[];
    },
    enabled: !!companyId,
  });

  // Fetch instances assigned to the current user
  const { data: userInstances, isLoading: isLoadingUserInstances } = useQuery({
    queryKey: ["whatsapp-user-instances", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("whatsapp_instance_users")
        .select(`
          *,
          whatsapp_instances!inner (
            id,
            company_id,
            instance_name,
            session_id,
            is_connected,
            connected_phone,
            last_connection_test,
            is_active
          )
        `)
        .eq("user_id", user.id)
        .eq("whatsapp_instances.company_id", companyId)
        .eq("whatsapp_instances.is_active", true);

      if (error) throw error;
      
      return data?.map(item => ({
        ...(item.whatsapp_instances as unknown as WhatsAppInstance),
        can_view: item.can_view,
        can_send: item.can_send,
        is_default: item.is_default,
      })) || [];
    },
    enabled: !!companyId,
  });

  // Create instance mutation - now uses edge function to create on UazapiGO
  const createInstanceMutation = useMutation({
    mutationFn: async (data: { instance_name: string }) => {
      if (!companyId) throw new Error("Company ID required");

      // Call edge function to create instance on UazapiGO
      const { data: result, error } = await supabase.functions.invoke("create-uazapi-instance", {
        body: {
          company_id: companyId,
          instance_name: data.instance_name,
        },
      });

      if (error) throw error;
      if (!result.success) throw new Error(result.error || "Erro ao criar instância");
      
      return result.instance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instances", companyId] });
      toast({ title: "Instância criada com sucesso na UazapiGO" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar instância",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update instance mutation
  const updateInstanceMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<WhatsAppInstance> & { id: string }) => {
      const { error } = await supabase
        .from("whatsapp_instances")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instances", companyId] });
      toast({ title: "Instância atualizada" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar instância",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete instance mutation (soft delete - set is_active to false)
  const deleteInstanceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_instances")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instances", companyId] });
      toast({ title: "Instância removida" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover instância",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test instance connection
  const testConnectionMutation = useMutation({
    mutationFn: async (instanceId: string) => {
      const instance = instances?.find(i => i.id === instanceId);
      if (!instance) throw new Error("Instância não encontrada");

      // Get base config
      const { data: config, error: configError } = await supabase
        .from("whatsapp_configs")
        .select("uazapi_endpoint, uazapi_token")
        .eq("company_id", companyId)
        .single();

      if (configError || !config) throw new Error("Configuração base não encontrada");

      const { data, error } = await supabase.functions.invoke("test-uazapi-connection", {
        body: {
          endpoint: config.uazapi_endpoint,
          token: config.uazapi_token,
          session: instance.session_id,
          company_id: companyId,
          instance_id: instanceId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, instanceId) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instances", companyId] });
      if (data.is_connected) {
        toast({
          title: "Conexão estabelecida!",
          description: data.connected_phone ? `Conectado: ${data.connected_phone}` : "WhatsApp conectado",
        });
      } else {
        toast({
          title: "WhatsApp não conectado",
          description: "Use o botão 'Ver QR Code' para conectar",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao testar conexão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Configure webhook for an instance
  const configureWebhookMutation = useMutation({
    mutationFn: async (instanceId: string) => {
      const { data, error } = await supabase.functions.invoke("configure-uazapi-webhook", {
        body: { instance_id: instanceId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao configurar webhook");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instances", companyId] });
      toast({ 
        title: "Webhook configurado!", 
        description: `URL: ${data.webhook_url}` 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao configurar webhook",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch users assigned to an instance
  const fetchInstanceUsers = async (instanceId: string): Promise<WhatsAppInstanceUser[]> => {
    const { data, error } = await supabase
      .from("whatsapp_instance_users")
      .select(`
        *,
        profiles:user_id (
          full_name,
          user_id
        )
      `)
      .eq("instance_id", instanceId);

    if (error) throw error;

    return data?.map(item => ({
      ...item,
      user_name: (item.profiles as any)?.full_name || "Usuário",
    })) || [];
  };

  // Assign user to instance mutation
  const assignUserMutation = useMutation({
    mutationFn: async (data: {
      instance_id: string;
      user_id: string;
      can_view?: boolean;
      can_send?: boolean;
      is_default?: boolean;
    }) => {
      const { error } = await supabase
        .from("whatsapp_instance_users")
        .upsert({
          instance_id: data.instance_id,
          user_id: data.user_id,
          can_view: data.can_view ?? true,
          can_send: data.can_send ?? true,
          is_default: data.is_default ?? false,
        }, { onConflict: "instance_id,user_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instance-users"] });
      toast({ title: "Usuário atribuído" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atribuir usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove user from instance mutation
  const removeUserMutation = useMutation({
    mutationFn: async (data: { instance_id: string; user_id: string }) => {
      const { error } = await supabase
        .from("whatsapp_instance_users")
        .delete()
        .eq("instance_id", data.instance_id)
        .eq("user_id", data.user_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instance-users"] });
      toast({ title: "Usuário removido da instância" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    instances: instances || [],
    userInstances: userInstances || [],
    isLoading: isLoadingInstances || isLoadingUserInstances,
    createInstance: createInstanceMutation.mutate,
    isCreating: createInstanceMutation.isPending,
    updateInstance: updateInstanceMutation.mutate,
    isUpdating: updateInstanceMutation.isPending,
    deleteInstance: deleteInstanceMutation.mutate,
    isDeleting: deleteInstanceMutation.isPending,
    testConnection: testConnectionMutation.mutate,
    isTesting: testConnectionMutation.isPending,
    configureWebhook: configureWebhookMutation.mutate,
    isConfiguringWebhook: configureWebhookMutation.isPending,
    fetchInstanceUsers,
    assignUser: assignUserMutation.mutate,
    isAssigning: assignUserMutation.isPending,
    removeUser: removeUserMutation.mutate,
    isRemoving: removeUserMutation.isPending,
  };
}
