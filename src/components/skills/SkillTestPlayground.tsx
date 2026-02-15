import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Loader2, Code, FormInput } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import type { Skill } from "@/hooks/useSkills";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";

interface Props {
  skill: Skill;
}

// Known entity parameter names that should render as combo selectors
const ENTITY_PARAMS: Record<string, { table: string; labelColumn: string; valueColumn: string; label: string }> = {
  client_id: { table: "clients", labelColumn: "company_name", valueColumn: "id", label: "Cliente" },
  campaign_id: { table: "campaigns", labelColumn: "name", valueColumn: "id", label: "Campanha" },
  ad_set_id: { table: "ad_sets", labelColumn: "name", valueColumn: "id", label: "Conjunto de Anúncios" },
  ad_id: { table: "ads", labelColumn: "name", valueColumn: "id", label: "Anúncio" },
  competitor_id: { table: "competitors", labelColumn: "name", valueColumn: "id", label: "Concorrente" },
  agent_id: { table: "ia_agents", labelColumn: "agent_name", valueColumn: "id", label: "Agente" },
};

function useEntityOptions(table: string, labelColumn: string, valueColumn: string, companyId: string | undefined) {
  return useQuery({
    queryKey: ["entity-options", table, companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from(table as any)
        .select(`${valueColumn}, ${labelColumn}`)
        .eq("company_id", companyId)
        .order(labelColumn)
        .limit(200);
      if (error) {
        console.error(`Error loading ${table}:`, error);
        return [];
      }
      return (data || []).map((row: any) => ({
        value: row[valueColumn],
        label: row[labelColumn] || row[valueColumn],
      }));
    },
    enabled: !!companyId,
  });
}

function EntitySelector({ paramName, value, onChange, companyId }: {
  paramName: string;
  value: string;
  onChange: (v: string) => void;
  companyId: string | undefined;
}) {
  const config = ENTITY_PARAMS[paramName];
  const { data: options = [], isLoading } = useEntityOptions(
    config.table, config.labelColumn, config.valueColumn, companyId
  );

  return (
    <div className="space-y-1">
      <Label className="text-sm">{config.label}</Label>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Carregando..." : `Selecione ${config.label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SmartParamField({ name, schema, value, onChange, companyId }: {
  name: string;
  schema: any;
  value: any;
  onChange: (v: any) => void;
  companyId: string | undefined;
}) {
  // Check if this is a known entity param
  if (ENTITY_PARAMS[name]) {
    return <EntitySelector paramName={name} value={value || ""} onChange={onChange} companyId={companyId} />;
  }

  const type = schema?.type || "string";
  const description = schema?.description || "";

  if (type === "boolean") {
    return (
      <div className="flex items-center gap-3">
        <Switch checked={!!value} onCheckedChange={onChange} />
        <Label className="text-sm">{name} {description && <span className="text-muted-foreground">— {description}</span>}</Label>
      </div>
    );
  }

  if (type === "number" || type === "integer") {
    return (
      <div className="space-y-1">
        <Label className="text-sm">{name} {description && <span className="text-muted-foreground text-xs">— {description}</span>}</Label>
        <Input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          placeholder={description || name}
        />
      </div>
    );
  }

  // Check if it looks like it should be a textarea (long text)
  const isLongText = name.includes("prompt") || name.includes("text") || name.includes("content") || name.includes("description") || name.includes("body");

  if (isLongText) {
    return (
      <div className="space-y-1">
        <Label className="text-sm">{name} {description && <span className="text-muted-foreground text-xs">— {description}</span>}</Label>
        <Textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={description || name}
          rows={4}
        />
      </div>
    );
  }

  // Default: string input
  return (
    <div className="space-y-1">
      <Label className="text-sm">{name} {description && <span className="text-muted-foreground text-xs">— {description}</span>}</Label>
      <Input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={description || name}
      />
    </div>
  );
}

export function SkillTestPlayground({ skill }: Props) {
  const [rawParams, setRawParams] = useState("{}");
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [result, setResult] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<"form" | "json">("form");
  const { activeCompany } = useCompany();

  const tp = skill.tool_parameters as any;
  const properties = tp?.properties || {};
  const paramKeys = Object.keys(properties);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    try {
      const params = mode === "json" ? JSON.parse(rawParams) : { ...formValues };
      // Clean empty values
      Object.keys(params).forEach(k => {
        if (params[k] === "" || params[k] === undefined) delete params[k];
      });
      
      // Use test-skill-execution which tries the real function first, then simulates
      const { data, error } = await supabase.functions.invoke("test-skill-execution", {
        body: { skill_id: skill.id, params },
      });
      if (error) throw error;
      setResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResult(`Erro: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const updateFormValue = (key: string, value: any) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const generateTemplate = () => {
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
    setRawParams(JSON.stringify(template, null, 2));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Playground de Teste</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleRun} disabled={running || !skill.edge_function}>
              {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
              Executar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "form" | "json")}>
            <TabsList className="grid w-full grid-cols-2 max-w-[300px]">
              <TabsTrigger value="form" className="gap-2">
                <FormInput className="h-3.5 w-3.5" /> Formulário
              </TabsTrigger>
              <TabsTrigger value="json" className="gap-2">
                <Code className="h-3.5 w-3.5" /> JSON
              </TabsTrigger>
            </TabsList>

            <TabsContent value="form" className="space-y-4 mt-4">
              {paramKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum parâmetro definido na aba "Parâmetros". Defina os parâmetros primeiro ou use o modo JSON.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {paramKeys.map((key) => (
                    <SmartParamField
                      key={key}
                      name={key}
                      schema={properties[key]}
                      value={formValues[key]}
                      onChange={(v) => updateFormValue(key, v)}
                      companyId={activeCompany?.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="json" className="space-y-2 mt-4">
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={generateTemplate}>
                  Gerar template
                </Button>
              </div>
              <Textarea
                value={rawParams}
                onChange={(e) => setRawParams(e.target.value)}
                rows={8}
                className="font-mono text-sm"
                placeholder='{ "param": "valor" }'
              />
            </TabsContent>
          </Tabs>

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
