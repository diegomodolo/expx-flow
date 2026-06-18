import { CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, LogIn, Sparkles } from "lucide-react";
import type { OnboardingData } from "@/components/onboarding/onboardingState";

interface CompletedStepProps {
  data: OnboardingData;
  onEnter: () => void;
}

export function CompletedStep({ data, onEnter }: CompletedStepProps) {
  return (
    <div className="space-y-5 text-center">
      <div className="space-y-2">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </span>
        <CardTitle className="text-2xl">Tudo pronto!</CardTitle>
        <CardDescription className="text-base">
          A sua instância do Expx Flow está configurada e pronta para uso.
        </CardDescription>
      </div>

      {data.adminEmail && (
        <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
          Administrador:{" "}
          <span className="font-medium text-foreground">{data.adminEmail}</span>
        </p>
      )}

      <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-left text-sm">
        <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          Próximos passos sugeridos
        </div>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            Configure as integrações (Meta, Google Ads etc.) em Configurações →
            Sistema.
          </li>
          <li>Convide sua equipe na área de Colaboradores.</li>
          <li>Importe seus contatos e crie sua primeira campanha.</li>
        </ul>
      </div>

      <div className="flex justify-center pt-1">
        <Button size="lg" onClick={onEnter}>
          <LogIn className="h-4 w-4" aria-hidden="true" />
          Entrar
        </Button>
      </div>
    </div>
  );
}
