import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ExternalLink, Key, Loader2, Save } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProviderConfig {
  provider: string;
  label: string;
  description: string;
  signupUrl: string;
  placeholder: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    provider: "pexels",
    label: "Pexels",
    description:
      "Banco de imagens gratuito. Usado para buscar fotos prontas em vez de gerar com IA, economizando tokens.",
    signupUrl: "https://www.pexels.com/api/new/",
    placeholder: "Cole aqui sua API key do Pexels",
  },
];

export const ExternalApiKeysSettings = () => {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  const [keys, setKeys] = useState<Record<string, string>>({});
  const [initialKeys, setInitialKeys] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("company_external_api_keys")
        .select("provider, api_key")
        .eq("company_id", companyId);
      if (cancelled) return;
      if (error) {
        toast.error("Erro ao carregar API keys externas");
        setLoading(false);
        return;
      }
      const map: Record<string, string> = {};
      (data ?? []).forEach((row: { provider: string; api_key: string }) => {
        map[row.provider] = row.api_key ?? "";
      });
      setKeys(map);
      setInitialKeys(map);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const handleSave = async (provider: string) => {
    if (!companyId) return;
    const value = (keys[provider] ?? "").trim();
    if (!value) {
      toast.error("API key não pode ser vazia");
      return;
    }
    setSavingKey(provider);
    try {
      const { error } = await supabase.from("company_external_api_keys").upsert(
        {
          company_id: companyId,
          provider,
          api_key: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id,provider" },
      );
      if (error) throw error;
      setInitialKeys((prev) => ({ ...prev, [provider]: value }));
      toast.success(`API key do ${provider} salva`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao salvar");
    } finally {
      setSavingKey(null);
    }
  };

  const handleRemove = async (provider: string) => {
    if (!companyId) return;
    setSavingKey(provider);
    try {
      const { error } = await supabase
        .from("company_external_api_keys")
        .delete()
        .eq("company_id", companyId)
        .eq("provider", provider);
      if (error) throw error;
      setKeys((prev) => ({ ...prev, [provider]: "" }));
      setInitialKeys((prev) => ({ ...prev, [provider]: "" }));
      toast.success("API key removida");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao remover");
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          API Keys de Serviços Externos
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure chaves de APIs de terceiros usadas pelo sistema (buscas de
          imagens, integrações etc.).
        </p>
      </div>

      {PROVIDERS.map((p) => {
        const value = keys[p.provider] ?? "";
        const saved = initialKeys[p.provider] ?? "";
        const dirty = value !== saved;
        const isVisible = !!visible[p.provider];

        return (
          <Card key={p.provider}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{p.label}</CardTitle>
                  <CardDescription>{p.description}</CardDescription>
                </div>
                <a
                  href={p.signupUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 whitespace-nowrap"
                >
                  Obter API key
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs mb-1 block">API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={isVisible ? "text" : "password"}
                      value={value}
                      onChange={(e) =>
                        setKeys((prev) => ({
                          ...prev,
                          [p.provider]: e.target.value,
                        }))
                      }
                      placeholder={p.placeholder}
                      className="pr-9 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setVisible((prev) => ({
                          ...prev,
                          [p.provider]: !isVisible,
                        }))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {isVisible ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    onClick={() => handleSave(p.provider)}
                    disabled={!dirty || savingKey === p.provider}
                    size="sm"
                  >
                    {savingKey === p.provider ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1" />
                        Salvar
                      </>
                    )}
                  </Button>
                  {saved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemove(p.provider)}
                      disabled={savingKey === p.provider}
                    >
                      Remover
                    </Button>
                  )}
                </div>
                {saved && !dirty && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Chave configurada
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
