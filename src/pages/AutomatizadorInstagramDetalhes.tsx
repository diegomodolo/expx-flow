import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { InstagramAutoPostsManager } from "@/components/instagram/InstagramAutoPostsManager";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function AutomatizadorInstagramDetalhes() {
  const { configId } = useParams<{ configId: string }>();
  const navigate = useNavigate();

  const { data: config, isLoading } = useQuery({
    queryKey: ['instagram-auto-post-config-by-id', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_auto_post_configs')
        .select(`
          *,
          instagram_accounts!instagram_auto_post_configs_instagram_account_id_fkey (
            id,
            username,
            profile_picture_url
          )
        `)
        .eq('id', configId!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!configId
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!config) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground mb-4">Automação não encontrada</p>
          <Button onClick={() => navigate('/automatizadores/instagram')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <InstagramAutoPostsManager
        configId={configId!}
        clientId={config.client_id}
        instagramAccountId={config.instagram_account_id}
        onBack={() => navigate('/automatizadores/instagram')}
      />
    </DashboardLayout>
  );
}
