import { useEffect, useState } from "react";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Building2,
} from "lucide-react";
import {
  listOrgs,
  InstallerApiError,
  type SupabaseOrg,
} from "@/components/onboarding/api/installerClient";
import type { OnboardingData } from "@/components/onboarding/onboardingState";

interface OrgProjectStepProps {
  data: OnboardingData;
  onUpdate: (patch: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

function generateDbPassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let pwd = "";
  for (let i = 0; i < bytes.length; i++) {
    pwd += chars[bytes[i] % chars.length];
  }
  return pwd;
}

export function OrgProjectStep({
  data,
  onUpdate,
  onNext,
  onBack,
}: OrgProjectStepProps) {
  const [orgs, setOrgs] = useState<SupabaseOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listOrgs({ supabaseToken: data.supabaseToken })
      .then((res) => {
        if (!active) return;
        setOrgs(res.orgs ?? []);
        // Pré-seleciona a primeira org se houver.
        if (res.orgs.length > 0 && !data.orgId) {
          onUpdate({
            orgId: res.orgs[0].id,
            orgName: res.orgs[0].name,
          });
        }
      })
      .catch((err) => {
        if (!active) return;
        const message =
          err instanceof InstallerApiError
            ? err.message
            : "Não foi possível carregar as organizações do Supabase.";
        setError(message);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.supabaseToken]);

  // Senha forte default gerada uma vez ao montar (não muda entre renders).
  const [generatedPwd] = useState(() => generateDbPassword());
  useEffect(() => {
    if (!data.dbPassword) {
      onUpdate({ dbPassword: generatedPwd });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedPwd]);

  const projectNameValid =
    data.projectName.trim().length >= 3 &&
    /^[a-z0-9-]+$/.test(data.projectName.trim());
  const orgValid = data.orgId.length > 0;
  const canAdvance = projectNameValid && orgValid && !loading && !error;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <CardTitle className="text-xl">Organização e projeto</CardTitle>
        <CardDescription>
          Escolha em qual organização do Supabase o projeto vai ser criado e dê
          um nome a ele (somente letras minúsculas, números e hifens).
        </CardDescription>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="org-select">Organização</Label>
          {loading ? (
            <div className="flex h-10 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Carregando organizações...
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : orgs.length === 0 ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
              <Building2
                className="mt-0.5 h-4 w-4 text-amber-600"
                aria-hidden="true"
              />
              <div>
                <p className="font-medium text-foreground">
                  Nenhuma organização encontrada.
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  Crie uma organização no Supabase em{" "}
                  <a
                    href="https://supabase.com/dashboard/organizations/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    supabase.com/dashboard
                  </a>{" "}
                  e volte aqui para continuar.
                </p>
              </div>
            </div>
          ) : (
            <Select
              value={data.orgId}
              onValueChange={(id) => {
                const found = orgs.find((o) => o.id === id);
                onUpdate({ orgId: id, orgName: found?.name ?? "" });
              }}
            >
              <SelectTrigger id="org-select">
                <SelectValue placeholder="Selecione a organização" />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="project-name">Nome do projeto</Label>
          <Input
            id="project-name"
            name="project-name"
            placeholder="expx-flow"
            value={data.projectName}
            onChange={(e) => onUpdate({ projectName: e.target.value })}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Use apenas letras minúsculas, números e hifens. Mínimo 3 caracteres.
          </p>
        </div>

        <details className="rounded-md border bg-muted/30 p-3 text-sm">
          <summary className="cursor-pointer font-medium text-muted-foreground">
            Senha do banco de dados (gerada automaticamente)
          </summary>
          <p className="mt-2 break-all font-mono text-xs text-foreground">
            {data.dbPassword || generatedPwd}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Esta senha é usada apenas internamente durante a instalação. Guarde
            em um cofre de senhas caso precise acessar o banco diretamente.
          </p>
        </details>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </Button>
        <Button type="button" onClick={onNext} disabled={!canAdvance}>
          Avançar
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
