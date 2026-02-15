import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Globe } from "lucide-react";

export interface ExternalApiConfig {
  url: string;
  method: string;
  auth_type: string;
  auth_config: Record<string, string>;
  headers: Record<string, string>;
  body_template?: string;
}

interface Props {
  config: ExternalApiConfig | null;
  onChange: (config: ExternalApiConfig | null) => void;
}

const AUTH_TYPES = [
  { value: "none", label: "Nenhuma" },
  { value: "bearer", label: "Bearer Token" },
  { value: "api_key_header", label: "API Key (Header)" },
  { value: "api_key_query", label: "API Key (Query Param)" },
  { value: "basic", label: "Basic Auth (user:pass)" },
];

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const emptyConfig: ExternalApiConfig = {
  url: "",
  method: "GET",
  auth_type: "none",
  auth_config: {},
  headers: {},
};

export function SkillExternalApiConfig({ config, onChange }: Props) {
  const [enabled, setEnabled] = useState(!!config);
  const current = config || emptyConfig;

  const update = (partial: Partial<ExternalApiConfig>) => {
    onChange({ ...current, ...partial });
  };

  const handleToggle = () => {
    if (enabled) {
      onChange(null);
      setEnabled(false);
    } else {
      onChange(emptyConfig);
      setEnabled(true);
    }
  };

  const addHeader = () => {
    update({ headers: { ...current.headers, "": "" } });
  };

  const updateHeader = (oldKey: string, newKey: string, newValue: string) => {
    const newHeaders = { ...current.headers };
    if (oldKey !== newKey) delete newHeaders[oldKey];
    newHeaders[newKey] = newValue;
    update({ headers: newHeaders });
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...current.headers };
    delete newHeaders[key];
    update({ headers: newHeaders });
  };

  const updateAuthConfig = (key: string, value: string) => {
    update({ auth_config: { ...current.auth_config, [key]: value } });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <CardTitle>API Externa</CardTitle>
        </div>
        <Button size="sm" variant={enabled ? "destructive" : "default"} onClick={handleToggle}>
          {enabled ? "Desativar" : "Ativar API Externa"}
        </Button>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          {/* URL + Method */}
          <div className="grid gap-4 md:grid-cols-[1fr_150px]">
            <div className="space-y-2">
              <Label>URL da API *</Label>
              <Input
                value={current.url}
                onChange={(e) => update({ url: e.target.value })}
                placeholder="https://api.example.com/v1/endpoint"
              />
            </div>
            <div className="space-y-2">
              <Label>Método</Label>
              <Select value={current.method} onValueChange={(v) => update({ method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HTTP_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Authentication */}
          <div className="space-y-2">
            <Label>Tipo de Autenticação</Label>
            <Select value={current.auth_type} onValueChange={(v) => update({ auth_type: v, auth_config: {} })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUTH_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auth config fields */}
          {current.auth_type === "bearer" && (
            <div className="space-y-2">
              <Label>Token</Label>
              <Input
                type="password"
                value={current.auth_config.token || ""}
                onChange={(e) => updateAuthConfig("token", e.target.value)}
                placeholder="seu-token-aqui"
              />
              <p className="text-xs text-muted-foreground">Será enviado como: Authorization: Bearer {"{token}"}</p>
            </div>
          )}

          {current.auth_type === "api_key_header" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome do Header</Label>
                <Input
                  value={current.auth_config.header_name || ""}
                  onChange={(e) => updateAuthConfig("header_name", e.target.value)}
                  placeholder="X-API-Key"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor da API Key</Label>
                <Input
                  type="password"
                  value={current.auth_config.api_key || ""}
                  onChange={(e) => updateAuthConfig("api_key", e.target.value)}
                  placeholder="sua-api-key"
                />
              </div>
            </div>
          )}

          {current.auth_type === "api_key_query" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome do Parâmetro</Label>
                <Input
                  value={current.auth_config.param_name || ""}
                  onChange={(e) => updateAuthConfig("param_name", e.target.value)}
                  placeholder="api_key"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor da API Key</Label>
                <Input
                  type="password"
                  value={current.auth_config.api_key || ""}
                  onChange={(e) => updateAuthConfig("api_key", e.target.value)}
                  placeholder="sua-api-key"
                />
              </div>
            </div>
          )}

          {current.auth_type === "basic" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Usuário</Label>
                <Input
                  value={current.auth_config.username || ""}
                  onChange={(e) => updateAuthConfig("username", e.target.value)}
                  placeholder="username"
                />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={current.auth_config.password || ""}
                  onChange={(e) => updateAuthConfig("password", e.target.value)}
                  placeholder="password"
                />
              </div>
            </div>
          )}

          {/* Custom Headers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Headers Customizados</Label>
              <Button size="sm" variant="outline" onClick={addHeader}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
              </Button>
            </div>
            {Object.entries(current.headers).map(([key, value], idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  placeholder="Header-Name"
                  value={key}
                  onChange={(e) => updateHeader(key, e.target.value, value)}
                  className="flex-1"
                />
                <Input
                  placeholder="valor"
                  value={value}
                  onChange={(e) => updateHeader(key, key, e.target.value)}
                  className="flex-1"
                />
                <Button size="icon" variant="ghost" onClick={() => removeHeader(key)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
