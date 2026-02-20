import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Pencil, Zap, MessageSquare, Clock, ChevronDown, ChevronUp, RefreshCw, Check, Copy } from "lucide-react";
import { InstagramFlowEditor } from "./InstagramFlowEditor";

interface KeywordTrigger {
  id: string;
  trigger_name: string;
  keywords: string[];
  match_mode: string;
  flow_id: string;
  instagram_account_id: string;
  is_active: boolean;
  created_at: string;
  instagram_automation_flows?: { flow_name: string; flow_data: any };
  instagram_accounts?: { username: string };
}

export function InstagramKeywordAutomation() {
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isTriggerDialogOpen, setIsTriggerDialogOpen] = useState(false);
  const [isFlowDialogOpen, setIsFlowDialogOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<KeywordTrigger | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [savingToken, setSavingToken] = useState(false);
  const [selectedTokenAccountId, setSelectedTokenAccountId] = useState<string>("");

  // Form state
  const [triggerName, setTriggerName] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [matchMode, setMatchMode] = useState("any");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedFlow, setSelectedFlow] = useState("");

  const companyId = activeCompany?.company_id;

  const generateToken = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 32; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
    return token;
  };


  const { data: instagramAccounts, refetch: refetchAccounts } = useQuery({
    queryKey: ["company-instagram-accounts", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("instagram_accounts").select("*").eq("company_id", companyId!);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const saveVerifyToken = async (accountId: string, token: string) => {
    setSavingToken(true);
    try {
      const { error } = await supabase
        .from("instagram_accounts")
        .update({ webhook_verify_token: token })
        .eq("id", accountId);
      if (error) throw error;
      await refetchAccounts();
      toast({ title: "Token salvo!", description: "O Verificar Token foi salvo na conta do Instagram." });
    } catch (err: any) {
      toast({ title: "Erro ao salvar token", description: err.message, variant: "destructive" });
    } finally {
      setSavingToken(false);
    }
  };


  const { data: flows } = useQuery({
    queryKey: ["instagram-automation-flows", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instagram_automation_flows")
        .select("*")
        .eq("company_id", companyId!)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: triggers, isLoading } = useQuery({
    queryKey: ["instagram-keyword-triggers", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instagram_keyword_triggers")
        .select(`
          *,
          instagram_automation_flows(flow_name, flow_data),
          instagram_accounts(username)
        `)
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as KeywordTrigger[];
    },
    enabled: !!companyId,
  });

  const { data: logs } = useQuery({
    queryKey: ["instagram-automation-logs", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instagram_automation_logs")
        .select("*")
        .eq("company_id", companyId!)
        .order("executed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const saveTrigger = useMutation({
    mutationFn: async () => {
      const keywords = keywordsInput
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

      if (editingTrigger) {
        const { error } = await supabase
          .from("instagram_keyword_triggers")
          .update({ trigger_name: triggerName, keywords, match_mode: matchMode, instagram_account_id: selectedAccount, flow_id: selectedFlow })
          .eq("id", editingTrigger.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("instagram_keyword_triggers").insert({
          company_id: companyId!,
          trigger_name: triggerName,
          keywords,
          match_mode: matchMode,
          instagram_account_id: selectedAccount,
          flow_id: selectedFlow,
          is_active: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagram-keyword-triggers"] });
      toast({ title: editingTrigger ? "Trigger atualizado!" : "Trigger criado!" });
      setIsTriggerDialogOpen(false);
      resetTriggerForm();
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const toggleTrigger = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("instagram_keyword_triggers").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["instagram-keyword-triggers"] }),
  });

  const deleteTrigger = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("instagram_keyword_triggers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagram-keyword-triggers"] });
      toast({ title: "Trigger removido" });
    },
  });

  const resetTriggerForm = () => {
    setTriggerName("");
    setKeywordsInput("");
    setMatchMode("any");
    setSelectedAccount("");
    setSelectedFlow("");
    setEditingTrigger(null);
  };

  const openEditTrigger = (trigger: KeywordTrigger) => {
    setEditingTrigger(trigger);
    setTriggerName(trigger.trigger_name);
    setKeywordsInput(trigger.keywords.join(", "));
    setMatchMode(trigger.match_mode);
    setSelectedAccount(trigger.instagram_account_id);
    setSelectedFlow(trigger.flow_id);
    setIsTriggerDialogOpen(true);
  };

  const matchModeLabel = (mode: string) => {
    if (mode === "exact") return "Exata";
    if (mode === "all") return "Todas";
    return "Qualquer";
  };

  const webhookUrl = `https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/instagram-messaging-webhook`;

  return (
    <div className="space-y-6">
      {/* Webhook Info */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Webhook do Instagram
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">Configure este URL no seu App Meta para receber mensagens diretas do Instagram:</p>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-3 py-2 rounded flex-1 break-all">{webhookUrl}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { navigator.clipboard.writeText(webhookUrl); toast({ title: "URL copiada!" }); }}
            >
              Copiar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">No Meta for Developers: adicione o produto "Messenger" ao seu App, habilite "Instagram Messaging" e configure o webhook com o URL acima. Use o token de verificação configurado na sua conta Instagram.</p>
        </CardContent>
      </Card>

      {/* Flows Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Fluxos de Mensagens</h3>
          <p className="text-sm text-muted-foreground">Sequências de mensagens enviadas quando um trigger é acionado</p>
        </div>
        <Button size="sm" onClick={() => setIsFlowDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Fluxo
        </Button>
      </div>

      {flows && flows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {flows.map((flow: any) => (
            <Card key={flow.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setIsFlowDialogOpen(true)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{flow.flow_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {flow.flow_data?.steps?.length ?? 0} passos
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquare className="w-3 h-3" />
                    {flow.flow_data?.steps?.filter((s: any) => s.type === "message").length ?? 0} msgs
                    <Clock className="w-3 h-3 ml-2" />
                    {flow.flow_data?.steps?.filter((s: any) => s.type === "delay").length ?? 0} delays
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <MessageSquare className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum fluxo criado. Crie um fluxo antes de configurar triggers.</p>
          </CardContent>
        </Card>
      )}

      {/* Triggers Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Triggers por Palavra-Chave</h3>
          <p className="text-sm text-muted-foreground">Regras que disparam um fluxo quando uma palavra é detectada</p>
        </div>
        <Button size="sm" onClick={() => { resetTriggerForm(); setIsTriggerDialogOpen(true); }} disabled={!flows || flows.length === 0}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Trigger
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
      ) : triggers && triggers.length > 0 ? (
        <div className="space-y-3">
          {triggers.map((trigger) => (
            <Card key={trigger.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{trigger.trigger_name}</span>
                      <Badge variant={trigger.is_active ? "default" : "secondary"} className="text-xs">
                        {trigger.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{matchModeLabel(trigger.match_mode)}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {trigger.keywords.map((kw) => (
                        <span key={kw} className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                          {kw}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>@{(trigger as any).instagram_accounts?.username ?? "—"}</span>
                      <span>→ {(trigger as any).instagram_automation_flows?.flow_name ?? "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={trigger.is_active}
                      onCheckedChange={(checked) => toggleTrigger.mutate({ id: trigger.id, is_active: checked })}
                    />
                    <Button variant="ghost" size="icon" onClick={() => openEditTrigger(trigger)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteTrigger.mutate(trigger.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Zap className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum trigger configurado.</p>
          </CardContent>
        </Card>
      )}

      {/* Recent Logs */}
      {logs && logs.length > 0 && (
        <div>
          <button
            className="flex items-center gap-2 text-sm font-medium mb-3 hover:text-primary transition-colors"
            onClick={() => setExpandedLogs(expandedLogs ? null : "logs")}
          >
            {expandedLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Execuções Recentes ({logs.length})
          </button>
          {expandedLogs && (
            <div className="space-y-2">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between text-xs bg-muted/50 rounded px-3 py-2">
                  <span className="text-muted-foreground">{new Date(log.executed_at).toLocaleString("pt-BR")}</span>
                  <span>Usuário: {log.ig_user_id.substring(0, 12)}...</span>
                  <span>Palavra: <strong>{log.matched_keyword}</strong></span>
                  <Badge variant={log.status === "completed" ? "default" : "destructive"} className="text-xs">
                    {log.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trigger Dialog */}
      <Dialog open={isTriggerDialogOpen} onOpenChange={(open) => { if (!open) resetTriggerForm(); setIsTriggerDialogOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTrigger ? "Editar Trigger" : "Novo Trigger por Palavra-Chave"}</DialogTitle>
            <DialogDescription>Configure palavras que disparam um fluxo de mensagens automáticas</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do Trigger</Label>
              <Input value={triggerName} onChange={(e) => setTriggerName(e.target.value)} placeholder="Ex: Interesse em orçamento" />
            </div>
            <div className="space-y-1.5">
              <Label>Conta do Instagram</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                <SelectContent>
                  {instagramAccounts?.map((acc: any) => (
                    <SelectItem key={acc.id} value={acc.id}>@{acc.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Palavras-Chave <span className="text-muted-foreground text-xs">(separadas por vírgula)</span></Label>
              <Input value={keywordsInput} onChange={(e) => setKeywordsInput(e.target.value)} placeholder="orcamento, preco, valor, quanto custa" />
            </div>
            <div className="space-y-1.5">
              <Label>Modo de Correspondência</Label>
              <Select value={matchMode} onValueChange={setMatchMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualquer uma (OR) — mensagem contém pelo menos uma</SelectItem>
                  <SelectItem value="all">Todas (AND) — mensagem contém todas</SelectItem>
                  <SelectItem value="exact">Exata — mensagem é exatamente a palavra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fluxo de Mensagens</Label>
              <Select value={selectedFlow} onValueChange={setSelectedFlow}>
                <SelectTrigger><SelectValue placeholder="Selecione o fluxo" /></SelectTrigger>
                <SelectContent>
                  {flows?.map((flow: any) => (
                    <SelectItem key={flow.id} value={flow.id}>{flow.flow_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetTriggerForm(); setIsTriggerDialogOpen(false); }}>Cancelar</Button>
            <Button
              onClick={() => saveTrigger.mutate()}
              disabled={saveTrigger.isPending || !triggerName || !selectedAccount || !keywordsInput || !selectedFlow}
            >
              {saveTrigger.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flow Editor Dialog */}
      <Dialog open={isFlowDialogOpen} onOpenChange={setIsFlowDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editor de Fluxos de Mensagens</DialogTitle>
            <DialogDescription>Crie ou edite sequências de mensagens e delays</DialogDescription>
          </DialogHeader>
          <InstagramFlowEditor companyId={companyId!} onClose={() => { setIsFlowDialogOpen(false); queryClient.invalidateQueries({ queryKey: ["instagram-automation-flows"] }); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
