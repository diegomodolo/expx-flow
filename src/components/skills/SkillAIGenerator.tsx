import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Skill } from "@/hooks/useSkills";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";

interface Props {
  onGenerate: (skill: Partial<Skill>) => void;
}

export function SkillAIGenerator({ onGenerate }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Descreva o que a skill deve fazer");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-skill-ai", {
        body: { prompt: prompt.trim() },
      });
      if (error) throw error;
      if (!data?.success || !data?.skill) {
        throw new Error(data?.error || "Erro ao gerar skill");
      }

      const s = data.skill;
      onGenerate({
        id: s.id || "",
        name: s.name || "",
        description: s.description || "",
        category: s.category || "action",
        edge_function: s.edge_function || "",
        edge_function_code: s.edge_function_code || null,
        requires_client: s.requires_client ?? false,
        model: s.model || null,
        system_prompt: s.system_prompt || null,
        temperature: s.temperature ?? 0.7,
        max_tokens: s.max_tokens ?? 2048,
        tool_parameters: s.tool_parameters || null,
      });

      toast.success("Skill gerada com sucesso!");
      setOpen(false);
      setPrompt("");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="h-4 w-4 mr-1" /> Gerar com IA
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerar Skill com IA</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Descreva o que a skill deve fazer</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Uma skill que analisa as métricas de uma campanha e gera um relatório com recomendações de otimização..."
              rows={5}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            A IA vai gerar o ID, nome, descrição, parâmetros, system prompt e o código da Edge Function automaticamente.
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {loading ? "Gerando..." : "Gerar Skill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
