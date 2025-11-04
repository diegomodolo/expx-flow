import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Settings } from "lucide-react";

interface ConfigureOfflineEventSetDialogProps {
  clientId: string;
}

export const ConfigureOfflineEventSetDialog = ({ clientId }: ConfigureOfflineEventSetDialogProps) => {
  const [open, setOpen] = useState(false);
  const [eventSetId, setEventSetId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadCurrentEventSetId();
    }
  }, [open, clientId]);

  const loadCurrentEventSetId = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('offline_event_set_id')
        .eq('id', clientId)
        .single();

      if (error) throw error;

      setEventSetId(data?.offline_event_set_id || '');
    } catch (err: any) {
      console.error('Error loading offline event set ID:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!eventSetId.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o Offline Event Set ID.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ offline_event_set_id: eventSetId.trim() })
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: "Configuração salva",
        description: "O Offline Event Set ID foi configurado com sucesso.",
      });
      setOpen(false);
    } catch (err: any) {
      console.error('Error saving offline event set ID:', err);
      toast({
        title: "Erro ao salvar",
        description: err.message || "Não foi possível salvar a configuração.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Configurar Offline Event Set
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar Offline Event Set ID</DialogTitle>
          <DialogDescription>
            Para enviar conversões offline, você precisa criar um Offline Event Set no Meta Events Manager.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">📝 Como criar um Offline Event Set:</p>
              <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                <li>
                  Acesse o{" "}
                  <a 
                    href="https://business.facebook.com/events_manager2" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline hover:no-underline"
                  >
                    Meta Events Manager
                  </a>
                </li>
                <li>Clique em "Conectar fontes de dados" → "Offline"</li>
                <li>Crie um novo conjunto de eventos offline</li>
                <li>Vincule sua conta de anúncios ao conjunto criado</li>
                <li>Copie o ID do conjunto (aparece na URL ou nas configurações)</li>
                <li>Cole o ID no campo abaixo</li>
              </ol>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="eventSetId">Offline Event Set ID *</Label>
              <Input 
                id="eventSetId"
                value={eventSetId} 
                onChange={(e) => setEventSetId(e.target.value)} 
                placeholder="1234567890123456"
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                O ID é um número longo que identifica seu conjunto de eventos offline.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-sm text-blue-900">
                💡 <strong>Dica:</strong> Após configurar, você poderá enviar conversões offline e o Meta otimizará suas campanhas com base nos dados reais de conversão.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !eventSetId.trim() || loading}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar Configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
