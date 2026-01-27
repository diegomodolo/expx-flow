import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface WhatsAppConfig {
  id: string;
  company_id: string;
  instance_id: string | null;
  token: string | null;
  client_token: string | null;
  is_active: boolean;
  is_connected: boolean;
  connected_phone: string | null;
  last_connection_test: string | null;
  provider: string;
  uazapi_endpoint: string | null;
  uazapi_token: string | null;
  uazapi_session: string | null;
}

interface WhatsAppPreferences {
  id: string;
  company_id: string;
  notify_high_cpa: boolean;
  notify_low_balance: boolean;
  notify_disabled_account: boolean;
  notify_presentation_summary: boolean;
  notify_post_published: boolean;
  notify_post_failed: boolean;
  cpa_threshold_percentage: number;
  balance_threshold_days: number;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

interface WhatsAppRecipient {
  id: string;
  company_id: string;
  name: string;
  phone: string;
  role: string | null;
  receive_alerts: boolean;
  receive_reports: boolean;
  client_id: string | null;
}

export function useWhatsAppConfig(companyId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch config
  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["whatsapp-config", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("whatsapp_configs")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw error;
      return data as WhatsAppConfig | null;
    },
    enabled: !!companyId,
  });

  // Fetch preferences
  const { data: preferences, isLoading: isLoadingPrefs } = useQuery({
    queryKey: ["whatsapp-preferences", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("whatsapp_notification_preferences")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw error;
      return data as WhatsAppPreferences | null;
    },
    enabled: !!companyId,
  });

  // Fetch recipients
  const { data: recipients, isLoading: isLoadingRecipients } = useQuery({
    queryKey: ["whatsapp-recipients", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("whatsapp_recipients")
        .select("*")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      return data as WhatsAppRecipient[];
    },
    enabled: !!companyId,
  });

  // Save config mutation (Z-API)
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: Partial<WhatsAppConfig>) => {
      if (!companyId) throw new Error("Company ID required");
      
      const { error } = await supabase
        .from("whatsapp_configs")
        .upsert({
          company_id: companyId,
          provider: "zapi",
          ...configData,
        }, { onConflict: "company_id" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-config", companyId] });
      toast({ title: "Configuração salva com sucesso" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao salvar configuração", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Save UazapiGO config mutation
  const saveUazapiConfigMutation = useMutation({
    mutationFn: async (configData: { endpoint: string; token: string; session: string }) => {
      if (!companyId) throw new Error("Company ID required");
      
      const { error } = await supabase
        .from("whatsapp_configs")
        .upsert({
          company_id: companyId,
          provider: "uazapi",
          uazapi_endpoint: configData.endpoint,
          uazapi_token: configData.token,
          uazapi_session: configData.session,
        }, { onConflict: "company_id" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-config", companyId] });
      toast({ title: "Configuração UazapiGO salva com sucesso" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao salvar configuração", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Test Z-API connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (credentials: { instance_id: string; token: string; client_token?: string }) => {
      const { data, error } = await supabase.functions.invoke("test-whatsapp-connection", {
        body: {
          ...credentials,
          company_id: companyId,
        },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-config", companyId] });
      if (data.is_connected) {
        toast({ 
          title: "Conexão estabelecida!", 
          description: data.connected_phone ? `Conectado: ${data.connected_phone}` : "WhatsApp conectado" 
        });
      } else {
        toast({ 
          title: "WhatsApp não conectado", 
          description: "Escaneie o QR Code no painel da Z-API",
          variant: "destructive" 
        });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao testar conexão", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Test UazapiGO connection mutation
  const testUazapiConnectionMutation = useMutation({
    mutationFn: async (credentials: { endpoint: string; token: string; session: string }) => {
      const { data, error } = await supabase.functions.invoke("test-uazapi-connection", {
        body: {
          ...credentials,
          company_id: companyId,
        },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-config", companyId] });
      if (data.is_connected) {
        toast({ 
          title: "Conexão estabelecida!", 
          description: data.connected_phone ? `Conectado: ${data.connected_phone}` : "WhatsApp conectado" 
        });
      } else {
        toast({ 
          title: "WhatsApp não conectado", 
          description: "Use o botão 'Ver QR Code' para conectar",
          variant: "destructive" 
        });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao testar conexão", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Save preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async (prefsData: Partial<WhatsAppPreferences>) => {
      if (!companyId) throw new Error("Company ID required");
      
      const { error } = await supabase
        .from("whatsapp_notification_preferences")
        .upsert({
          company_id: companyId,
          ...prefsData,
        }, { onConflict: "company_id" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-preferences", companyId] });
      toast({ title: "Preferências salvas" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao salvar preferências", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Add recipient mutation
  const addRecipientMutation = useMutation({
    mutationFn: async (recipient: Omit<WhatsAppRecipient, "id" | "company_id">) => {
      if (!companyId) throw new Error("Company ID required");
      
      const { error } = await supabase
        .from("whatsapp_recipients")
        .insert({
          company_id: companyId,
          ...recipient,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-recipients", companyId] });
      toast({ title: "Destinatário adicionado" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao adicionar destinatário", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Update recipient mutation
  const updateRecipientMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<WhatsAppRecipient> & { id: string }) => {
      const { error } = await supabase
        .from("whatsapp_recipients")
        .update(data)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-recipients", companyId] });
      toast({ title: "Destinatário atualizado" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao atualizar destinatário", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Delete recipient mutation
  const deleteRecipientMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_recipients")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-recipients", companyId] });
      toast({ title: "Destinatário removido" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao remover destinatário", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Send test message mutation
  const sendTestMessageMutation = useMutation({
    mutationFn: async (phone: string) => {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-notification", {
        body: {
          company_id: companyId,
          recipient_phone: phone,
          message: "✅ *Teste de Conexão*\n\nSua integração com WhatsApp está funcionando corretamente!\n\n_Enviado pelo Expx Flow_",
          notification_type: "test",
        },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Mensagem de teste enviada!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao enviar mensagem", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  return {
    config,
    preferences,
    recipients: recipients || [],
    isLoading: isLoadingConfig || isLoadingPrefs || isLoadingRecipients,
    saveConfig: saveConfigMutation.mutate,
    isSavingConfig: saveConfigMutation.isPending,
    saveUazapiConfig: saveUazapiConfigMutation.mutate,
    isSavingUazapiConfig: saveUazapiConfigMutation.isPending,
    testConnection: testConnectionMutation.mutate,
    isTestingConnection: testConnectionMutation.isPending,
    testUazapiConnection: testUazapiConnectionMutation.mutate,
    isTestingUazapiConnection: testUazapiConnectionMutation.isPending,
    savePreferences: savePreferencesMutation.mutate,
    isSavingPreferences: savePreferencesMutation.isPending,
    addRecipient: addRecipientMutation.mutate,
    isAddingRecipient: addRecipientMutation.isPending,
    updateRecipient: updateRecipientMutation.mutate,
    deleteRecipient: deleteRecipientMutation.mutate,
    sendTestMessage: sendTestMessageMutation.mutate,
    isSendingTestMessage: sendTestMessageMutation.isPending,
  };
}
