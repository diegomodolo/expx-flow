import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Phone, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useApi4ComConfig } from "@/hooks/useVoiceCalls";

interface WhatsAppApi4ComSettingsProps {
  companyId: string;
}

export function WhatsAppApi4ComSettings({
  companyId,
}: WhatsAppApi4ComSettingsProps) {
  const queryClient = useQueryClient();
  const { data: config } = useApi4ComConfig(companyId);
  const [token, setToken] = useState("");
  const [extension, setExtension] = useState("");
  const [domain, setDomain] = useState("");
  const [password, setPassword] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setToken(config.token);
      setExtension(config.extension);
      setDomain(config.domain);
      setPassword(config.password);
    }
  }, [config]);

  const handleSave = async () => {
    if (!token.trim() || !extension.trim()) {
      toast.error("Preencha o token e o ramal");
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.from("whatsapp_configs").upsert(
        {
          company_id: companyId,
          api4com_token: token.trim(),
          api4com_extension: extension.trim(),
          api4com_domain: domain.trim() || null,
          api4com_password: password.trim() || null,
        },
        { onConflict: "company_id" },
      );
      if (error) throw error;
      toast.success("Configuração API4Com salva!");
      queryClient.invalidateQueries({
        queryKey: ["api4com-config", companyId],
      });
    } catch (err) {
      toast.error("Erro ao salvar", { description: (err as Error).message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Phone className="h-4 w-4" />
          Ligações — API4Com
          {config?.hasSipConfig && (
            <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
          )}
        </CardTitle>
        <CardDescription>
          Configure as credenciais API4Com para habilitar ligações diretamente
          do chat WhatsApp. Obtenha o token em{" "}
          <a
            href="https://developers.api4com.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            developers.api4com.com
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api4com-token">Token de autenticação</Label>
          <div className="relative">
            <Input
              id="api4com-token"
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Cole o token obtido no login da API4Com"
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowToken((v) => !v)}
            >
              {showToken ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="api4com-extension">Ramal do agente</Label>
          <Input
            id="api4com-extension"
            type="text"
            value={extension}
            onChange={(e) => setExtension(e.target.value)}
            placeholder="Ex: 1000"
          />
          <p className="text-xs text-muted-foreground">
            Número do ramal configurado na API4Com.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="api4com-domain">Domínio SIP</Label>
          <Input
            id="api4com-domain"
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="Ex: expx.api4com.com"
          />
          <p className="text-xs text-muted-foreground">
            Domínio da sua conta API4Com (termina com .api4com.com). Necessário
            para o webphone embutido.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="api4com-password">Senha do ramal SIP</Label>
          <div className="relative">
            <Input
              id="api4com-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha do ramal (gerada automaticamente pela API4Com)"
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Senha SIP do ramal. Encontrada em Configurar Ramal no painel
            API4Com.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? "Salvando..." : "Salvar configuração"}
        </Button>
      </CardContent>
    </Card>
  );
}
