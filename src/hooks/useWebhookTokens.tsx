import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WebhookToken {
  id: string;
  client_id: string;
  company_id: string;
  token: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useWebhookTokens = (clientId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: token, isLoading } = useQuery({
    queryKey: ['webhook-token', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offline_conversion_webhook_tokens')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as WebhookToken | null;
    },
    enabled: !!clientId,
  });

  const generateToken = useMutation({
    mutationFn: async () => {
      // Get company_id from clients table
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('company_id')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      const { data, error } = await supabase
        .from('offline_conversion_webhook_tokens')
        .insert({
          client_id: clientId,
          company_id: client.company_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as WebhookToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-token', clientId] });
      toast({
        title: "Token gerado",
        description: "URL do webhook criada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar token",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const regenerateToken = useMutation({
    mutationFn: async () => {
      // Deactivate old token
      if (token) {
        await supabase
          .from('offline_conversion_webhook_tokens')
          .update({ is_active: false })
          .eq('id', token.id);
      }

      // Generate new token
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('company_id')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      const { data, error } = await supabase
        .from('offline_conversion_webhook_tokens')
        .insert({
          client_id: clientId,
          company_id: client.company_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as WebhookToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-token', clientId] });
      toast({
        title: "Token regenerado",
        description: "Nova URL do webhook gerada. A URL antiga não funcionará mais.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao regenerar token",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testWebhook = useMutation({
    mutationFn: async (webhookToken: string) => {
      const webhookUrl = getWebhookUrl(webhookToken);
      
      const testPayload = {
        eventName: "Purchase",
        eventTime: Math.floor(Date.now() / 1000),
        value: 99.90,
        currency: "BRL",
        userData: {
          email: "test@example.com",
          phone: "11999999999",
          firstName: "Teste",
          lastName: "Webhook",
          city: "São Paulo",
          state: "SP",
          country: "BR"
        },
        customData: {
          content_name: "Teste Webhook",
          order_id: "TEST-" + Date.now()
        }
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao testar webhook');
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Teste realizado com sucesso!",
        description: `Conversão de teste enviada ao Meta. ${data.eventsReceived || 0} evento(s) recebido(s).`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no teste do webhook",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getWebhookUrl = (webhookToken: string) => {
    return `https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/webhook-offline-conversion/${webhookToken}`;
  };

  return {
    token,
    isLoading,
    generateToken: generateToken.mutate,
    isGenerating: generateToken.isPending,
    regenerateToken: regenerateToken.mutate,
    isRegenerating: regenerateToken.isPending,
    testWebhook: testWebhook.mutate,
    isTesting: testWebhook.isPending,
    getWebhookUrl,
  };
};
