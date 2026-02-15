import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Play, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Skill } from "@/hooks/useSkills";

interface Props {
  skill: Skill;
}

export function SkillTestPlayground({ skill }: Props) {
  const [params, setParams] = useState("{}");
  const [result, setResult] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    try {
      const parsedParams = JSON.parse(params);
      const { data, error } = await supabase.functions.invoke(skill.edge_function, {
        body: { ...parsedParams, _test: true },
      });
      if (error) throw error;
      setResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResult(`Erro: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  // Build template from tool_parameters
  const generateTemplate = () => {
    const tp = skill.tool_parameters as any;
    if (!tp?.properties) return;
    const template: Record<string, unknown> = {};
    Object.entries(tp.properties).forEach(([key, schema]: [string, any]) => {
      switch (schema.type) {
        case "string": template[key] = ""; break;
        case "number": template[key] = 0; break;
        case "boolean": template[key] = false; break;
        case "array": template[key] = []; break;
        case "object": template[key] = {}; break;
        default: template[key] = null;
      }
    });
    setParams(JSON.stringify(template, null, 2));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Playground de Teste</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={generateTemplate}>
              Gerar template
            </Button>
            <Button size="sm" onClick={handleRun} disabled={running || !skill.edge_function}>
              {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
              Executar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Parâmetros (JSON)</Label>
            <Textarea
              value={params}
              onChange={(e) => setParams(e.target.value)}
              rows={8}
              className="font-mono text-sm"
              placeholder='{ "param": "valor" }'
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Edge Function: <code className="bg-muted px-1 rounded">{skill.edge_function || "não definida"}</code>
            {skill.model && <> | Modelo: <code className="bg-muted px-1 rounded">{skill.model}</code></>}
          </div>
        </CardContent>
      </Card>

      {result !== null && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Resultado</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={result} readOnly rows={12} className="font-mono text-xs" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
