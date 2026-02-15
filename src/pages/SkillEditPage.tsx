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
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { SkillAIGenerator } from "@/components/skills/SkillAIGenerator";
import { toast } from "sonner";
import { SkillParametersEditor } from "@/components/skills/SkillParametersEditor";
import { SkillTestPlayground } from "@/components/skills/SkillTestPlayground";
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
};

export default function SkillEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSkill, saveSkill, deleteSkill } = useSkills();
  const isNew = !id;
  const [form, setForm] = useState<Skill>(emptySkill);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      getSkill(id).then((s) => {
        if (s) setForm(s);
        setLoading(false);
      });
    }
  }, [id, getSkill]);

  const handleSave = async () => {
    if (!form.id || !form.name || !form.description || !form.edge_function) {
      toast.error("Preencha os campos obrigatórios: ID, Nome, Descrição e Edge Function");
      return;
    }
    setSaving(true);
    try {
      await saveSkill(form);
      if (isNew) navigate(`/ia/skills/${form.id}/edit`, { replace: true });
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
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
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="execucao">Execução</TabsTrigger>
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
                <div className="flex items-center gap-3 pt-6">
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
                <Input value={form.edge_function} onChange={(e) => update("edge_function", e.target.value)} placeholder="nome-da-edge-function" />
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

        {/* TAB PARÂMETROS */}
        <TabsContent value="parametros">
          <SkillParametersEditor
            toolParameters={form.tool_parameters}
            onChange={(params) => update("tool_parameters", params)}
          />
        </TabsContent>

        {/* TAB TESTE */}
        <TabsContent value="teste">
          <SkillTestPlayground skill={form} />
        </TabsContent>
      </Tabs>
    </div>
    </DashboardLayout>
  );
}
