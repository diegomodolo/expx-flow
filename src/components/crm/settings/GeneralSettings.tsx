import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface GeneralSettingsProps {
  workspaceId: string;
}

interface WorkspaceSettings {
  clientName: string;
}

export function GeneralSettings({ workspaceId }: GeneralSettingsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientName, setClientName] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: workspace, error } = await supabase
          .from("crm_workspaces")
          .select("client_id")
          .eq("id", workspaceId)
          .single();

        if (error) throw error;

        // Buscar nome do cliente
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .select("name")
          .eq("id", workspace.client_id)
          .single();

        if (clientError) throw clientError;

        setClientName(client.name);
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast({
          title: "Erro ao carregar configurações",
          description: "Não foi possível carregar as configurações.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [workspaceId, toast]);

  const handleSave = async () => {
    toast({
      title: "Workspace vinculado ao cliente",
      description: "Este workspace está vinculado diretamente a um cliente.",
    });
  };


  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Configurações Gerais</h2>
          <p className="text-muted-foreground">
            Informações básicas do workspace CRM.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente Vinculado</Label>
            <Input
              value={clientName}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Este workspace está vinculado ao cliente acima. Para alterar, edite o cliente nas configurações principais.
            </p>
          </div>

          <div className="space-y-2">
            <Label>ID do Workspace</Label>
            <Input
              value={workspaceId}
              disabled
              className="bg-muted font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Use este ID para integrações e automações.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
