import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useSkills, Skill } from "@/hooks/useSkills";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Save, Trash2, Rocket } from "lucide-react";
import { SkillAIGenerator } from "@/components/skills/SkillAIGenerator";
import { SkillCodeEditor, DEFAULT_TEMPLATE } from "@/components/skills/SkillCodeEditor";
import { SkillExternalApiConfig, ExternalApiConfig } from "@/components/skills/SkillExternalApiConfig";
import { SkillDeployModal, DeployStep } from "@/components/skills/SkillDeployModal";
import { toast } from "sonner";
import { SkillParametersEditor } from "@/components/skills/SkillParametersEditor";
import { SkillTestPlayground } from "@/components/skills/SkillTestPlayground";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const AI_MODELS = [
  "google/gemini-3-pro-image-preview",
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "openai/gpt-5",
  "openai/gpt-4.1",
  "openai/gpt-4.1-mini",
  "anthropic/claude-sonnet-4",
];

const CATEGORIES = ["data", "action", "generation", "communication", "analysis", "content"];

const emptySkill: Skill = {
  id: "",
  name: "",
  description: "",
  category: "action",
  edge_function: "",
  requires_client: false,
  tool_parameters: null,
  required_params: null,
  optional_params: null,
  created_at: null,
  model: null,
  system_prompt: null,
  temperature: 0.7,
  max_tokens: 2048,
  config: null,
  is_active: true,
  updated_at: null,
  edge_function_code: null,
  external_api_config: null,
  skill_type: "edge_function",
  output_parameters: null,
};

export default function SkillEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSkill, saveSkill, deleteSkill } = useSkills();
  const isNew = !id;
  const [form, setForm] = useState<Skill>(emptySkill);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Deploy modal state
  const [deployOpen, setDeployOpen] = useState(false);
  const [deploySteps, setDeploySteps] = useState<DeployStep[]>([]);
  const [deployFinished, setDeployFinished] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      getSkill(id).then((s) => {
        if (s) setForm(s);
        setLoading(false);
      });
    }
  }, [id, getSkill]);

  const updateStep = (stepId: string, update: Partial<DeployStep>) => {
    setDeploySteps(prev => prev.map(s => s.id === stepId ? { ...s, ...update } : s));
  };

  const handleSaveAndDeploy = async () => {
    if (!form.id || !form.name || !form.description) {
      toast.error("Preencha os campos obrigatórios: ID, Nome e Descrição");
      return;
    }

    const isJS = form.skill_type === "javascript";
    // Auto-generate edge_function name if empty and not JS
    const edgeFunctionName = isJS ? (form.edge_function || "") : (form.edge_function || `skill-${form.id.replace(/_/g, "-")}`);

    const steps: DeployStep[] = [
      { id: "validate", label: "Validando dados da skill...", status: "pending" },
      { id: "save_db", label: "Salvando no banco de dados...", status: "pending" },
      { id: "deploy_code", label: isJS ? "Registrando código JavaScript..." : "Salvando código da Edge Function...", status: "pending" },
      { id: "test", label: "Verificando execução...", status: "pending" },
      { id: "done", label: "Skill publicada com sucesso!", status: "pending" },
    ];

    setDeploySteps(steps);
    setDeployOpen(true);
    setDeployFinished(false);
    setDeployError(null);
    setSaving(true);

    try {
      // Step 1: Validate
      updateStep("validate", { status: "running" });
      await new Promise(r => setTimeout(r, 400));

      if (isJS && !form.edge_function_code) {
        throw new Error("Skill JavaScript precisa de código definido na aba Código");
      }

      const updatedForm = { ...form, edge_function: edgeFunctionName };
      updateStep("validate", { status: "done", detail: `Skill "${updatedForm.name}" validada (${isJS ? "JavaScript" : "Edge Function"})` });

      // Step 2: Save to DB
      updateStep("save_db", { status: "running" });
      await saveSkill(updatedForm);
      updateStep("save_db", { status: "done", detail: "Registro salvo na tabela ia_agent_skills" });

      // Step 3: Deploy/register code
      updateStep("deploy_code", { status: "running" });
      
      if (updatedForm.edge_function_code) {
        if (isJS) {
          // JS skills: code is already saved in DB, executor will run it
          updateStep("deploy_code", { status: "done", detail: "Código JavaScript registrado no executor universal" });
        } else {
          // Edge function skills: save via deploy function
          const { data, error } = await supabase.functions.invoke("deploy-skill-function", {
            body: {
              skill_id: updatedForm.id,
              edge_function_name: edgeFunctionName,
              code: updatedForm.edge_function_code,
              external_api_config: updatedForm.external_api_config,
            },
          });
          if (error) throw new Error(error.message);
          if (!data?.success) throw new Error(data?.error || "Erro no deploy");
          updateStep("deploy_code", { status: "done", detail: `Function "${edgeFunctionName}" salva` });
        }
      } else {
        updateStep("deploy_code", { status: "done", detail: "Nenhum código para deploy" });
      }

      // Step 4: Quick test execution
      updateStep("test", { status: "running" });
      if (updatedForm.edge_function_code) {
        try {
          const { data: testResult, error: testError } = await supabase.functions.invoke("execute-skill", {
            body: { skill_id: updatedForm.id, params: {} },
          });
          if (testError) {
            updateStep("test", { status: "done", detail: `⚠️ Teste retornou erro: ${testError.message}` });
          } else if (testResult?.success) {
            updateStep("test", { status: "done", detail: `✅ Executou com sucesso (source: ${testResult.source})` });
          } else {
            updateStep("test", { status: "done", detail: `⚠️ ${testResult?.error || "Resultado inesperado"}` });
          }
        } catch {
          updateStep("test", { status: "done", detail: "⚠️ Não foi possível testar automaticamente" });
        }
      } else {
        updateStep("test", { status: "done", detail: "Sem código para testar" });
      }

      // Step 5: Done
      updateStep("done", { status: "done" });
      setDeployFinished(true);

      setForm(updatedForm);
      if (isNew) navigate(`/ia/skills/${updatedForm.id}/edit`, { replace: true });
    } catch (err: any) {
      const currentRunning = steps.find(s => s.status === "running");
      if (currentRunning) {
        setDeploySteps(prev => prev.map(s => 
          s.status === "running" ? { ...s, status: "error", detail: err.message } : s
        ));
      }
      setDeployError(err.message);
      toast.error("Erro no deploy: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSkill(form.id);
      navigate("/ia/skills");
    } catch (err: any) {
      toast.error("Erro ao remover: " + err.message);
    }
  };

  const update = <K extends keyof Skill>(key: K, value: Skill[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (loading) return <div className="py-12 text-center text-muted-foreground">Carregando...</div>;

  return (
    <DashboardLayout>
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ia/skills")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{isNew ? "Nova Skill" : form.name}</h1>
          {!isNew && <p className="text-xs text-muted-foreground font-mono">{form.id}</p>}
        </div>
        <div className="flex gap-2">
          {isNew && (
            <SkillAIGenerator onGenerate={(generated) => setForm(prev => ({ ...prev, ...generated }))} />
          )}
          {!isNew && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir skill?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Essa ação é irreversível. A skill será removida de todos os agentes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={handleSaveAndDeploy} disabled={saving}>
            <Rocket className="h-4 w-4 mr-1" /> {saving ? "Publicando..." : "Salvar e Publicar"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="execucao">Execução</TabsTrigger>
          <TabsTrigger value="codigo">Código</TabsTrigger>
          <TabsTrigger value="api">API Externa</TabsTrigger>
          <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
          <TabsTrigger value="teste">Teste</TabsTrigger>
        </TabsList>

        {/* TAB GERAL */}
        <TabsContent value="geral">
          <Card>
            <CardHeader><CardTitle>Informações Gerais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>ID (slug único) *</Label>
                  <Input
                    value={form.id}
                    onChange={(e) => update("id", e.target.value.replace(/[^a-z0-9_]/g, ""))}
                    placeholder="minha_skill"
                    disabled={!isNew}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Nome da skill" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="O que esta skill faz..." rows={3} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={(v) => update("category", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Skill</Label>
                  <Select value={form.skill_type || "edge_function"} onValueChange={(v) => update("skill_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="edge_function">Edge Function</SelectItem>
                      <SelectItem value="javascript">JavaScript (código direto)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {form.skill_type === "javascript" 
                      ? "O código será executado diretamente pelo executor universal, sem precisar deployar uma Edge Function."
                      : "O código será salvo como Edge Function. Se deployada no Supabase, será chamada diretamente."}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 pt-2">
                  <Switch checked={!!form.requires_client} onCheckedChange={(v) => update("requires_client", v)} />
                  <Label>Requer cliente vinculado</Label>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active !== false} onCheckedChange={(v) => update("is_active", v)} />
                <Label>Skill ativa</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB EXECUÇÃO */}
        <TabsContent value="execucao">
          <Card>
            <CardHeader><CardTitle>Configuração de Execução</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Edge Function *</Label>
                <Input value={form.edge_function} onChange={(e) => update("edge_function", e.target.value)} placeholder="nome-da-edge-function (auto-gerado se vazio)" />
                <p className="text-xs text-muted-foreground">
                  Se vazio, será gerado automaticamente como: <code className="bg-muted px-1 rounded">skill-{form.id.replace(/_/g, "-") || "..."}</code>
                </p>
              </div>
              <div className="space-y-2">
                <Label>Modelo de IA</Label>
                <Select value={form.model || ""} onValueChange={(v) => update("model", v || null)}>
                  <SelectTrigger><SelectValue placeholder="Nenhum (usa padrão da function)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {AI_MODELS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Temperatura: {form.temperature ?? 0.7}</Label>
                  <Slider
                    value={[form.temperature ?? 0.7]}
                    onValueChange={([v]) => update("temperature", v)}
                    min={0} max={2} step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input
                    type="number"
                    value={form.max_tokens ?? 2048}
                    onChange={(e) => update("max_tokens", parseInt(e.target.value) || 2048)}
                    min={1} max={100000}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea
                  value={form.system_prompt || ""}
                  onChange={(e) => update("system_prompt", e.target.value || null)}
                  placeholder="Instruções de sistema para o modelo de IA..."
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB CÓDIGO */}
        <TabsContent value="codigo">
          <SkillCodeEditor
            code={form.edge_function_code || ""}
            onChange={(code) => update("edge_function_code", code)}
            edgeFunctionName={form.edge_function || `skill-${form.id.replace(/_/g, "-")}`}
            skillType={form.skill_type}
          />
        </TabsContent>

        {/* TAB API EXTERNA */}
        <TabsContent value="api">
          <SkillExternalApiConfig
            config={(form.external_api_config as unknown as ExternalApiConfig) || null}
            onChange={(config) => update("external_api_config", config as any)}
          />
        </TabsContent>

        {/* TAB PARÂMETROS */}
        <TabsContent value="parametros">
          <div className="space-y-6">
            <SkillParametersEditor
              toolParameters={form.tool_parameters}
              onChange={(params) => update("tool_parameters", params)}
              label="Parâmetros de Entrada"
              description="Defina os parâmetros que o agente deve fornecer ao chamar esta skill."
            />
            <SkillParametersEditor
              toolParameters={form.output_parameters as Record<string, unknown> | null}
              onChange={(params) => update("output_parameters", params)}
              label="Parâmetros de Saída"
              description="Defina o formato da resposta que esta skill retorna."
            />
          </div>
        </TabsContent>

        {/* TAB TESTE */}
        <TabsContent value="teste">
          <SkillTestPlayground skill={form} />
        </TabsContent>
      </Tabs>
    </div>

    <SkillDeployModal
      open={deployOpen}
      onOpenChange={setDeployOpen}
      steps={deploySteps}
      finished={deployFinished}
      error={deployError}
    />
    </DashboardLayout>
  );
}
