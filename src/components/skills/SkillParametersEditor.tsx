import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

interface ParamField {
  name: string;
  type: string;
  description: string;
}

interface Props {
  toolParameters: Record<string, unknown> | null;
  onChange: (params: Record<string, unknown>) => void;
  label?: string;
  description?: string;
}

function parseFields(params: Record<string, unknown> | null): ParamField[] {
  if (!params || typeof params !== "object") return [];
  const properties = (params as any)?.properties;
  if (!properties) return [];
  return Object.entries(properties).map(([name, schema]: [string, any]) => ({
    name,
    type: schema?.type || "string",
    description: schema?.description || "",
  }));
}

function fieldsToSchema(fields: ParamField[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  fields.forEach((f) => {
    properties[f.name] = { type: f.type, description: f.description };
    required.push(f.name);
  });
  return { type: "object", properties, required };
}

export function SkillParametersEditor({ toolParameters, onChange, label = "Parâmetros (tool_parameters)", description }: Props) {
  const [fields, setFields] = useState<ParamField[]>(() => parseFields(toolParameters));

  const addField = () => {
    const updated = [...fields, { name: "", type: "string", description: "" }];
    setFields(updated);
  };

  const removeField = (idx: number) => {
    const updated = fields.filter((_, i) => i !== idx);
    setFields(updated);
    onChange(fieldsToSchema(updated));
  };

  const updateField = (idx: number, key: keyof ParamField, value: string) => {
    const updated = fields.map((f, i) => (i === idx ? { ...f, [key]: value } : f));
    setFields(updated);
    onChange(fieldsToSchema(updated));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{label}</CardTitle>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <Button size="sm" variant="outline" onClick={addField}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum parâmetro definido. Clique em "Adicionar" para criar.
            </p>
          )}
          {fields.map((field, idx) => (
            <div key={idx} className="flex gap-2 items-start border rounded-md p-3">
              <div className="flex-1 grid gap-2 md:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome</Label>
                  <Input
                    value={field.name}
                    onChange={(e) => updateField(idx, "name", e.target.value.replace(/[^a-z0-9_]/g, ""))}
                    placeholder="param_name"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={field.type} onValueChange={(v) => updateField(idx, "type", v)}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">string</SelectItem>
                      <SelectItem value="number">number</SelectItem>
                      <SelectItem value="boolean">boolean</SelectItem>
                      <SelectItem value="array">array</SelectItem>
                      <SelectItem value="object">object</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descrição</Label>
                  <Input
                    value={field.description}
                    onChange={(e) => updateField(idx, "description", e.target.value)}
                    placeholder="Descreva o parâmetro"
                    className="text-sm"
                  />
                </div>
              </div>
              <Button variant="ghost" size="icon" className="mt-5" onClick={() => removeField(idx)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Preview JSON */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Preview JSON</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            value={JSON.stringify(fieldsToSchema(fields), null, 2)}
            readOnly
            rows={10}
            className="font-mono text-xs"
          />
        </CardContent>
      </Card>
    </div>
  );
}
