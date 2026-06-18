import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TOTAL_ONBOARDING_STEPS,
  type OnboardingData,
  ONBOARDING_INITIAL_DATA,
} from "@/components/onboarding/onboardingState";
import { WelcomeStep } from "@/components/onboarding/steps/WelcomeStep";
import { VercelTokenStep } from "@/components/onboarding/steps/VercelTokenStep";
import { SupabaseTokenStep } from "@/components/onboarding/steps/SupabaseTokenStep";
import { OrgProjectStep } from "@/components/onboarding/steps/OrgProjectStep";
import { InstallingStep } from "@/components/onboarding/steps/InstallingStep";
import { AdminStep } from "@/components/onboarding/steps/AdminStep";
import { CompletedStep } from "@/components/onboarding/steps/CompletedStep";

export interface OnboardingWizardProps {
  /**
   * Apenas para testes: força o passo inicial e/ou injeta dados pré-carregados
   * (ex.: projectRef + serviceRoleKey para o passo admin sem rodar a instalação).
   * Não usado em produção.
   */
  __testStartStep?: number;
  __testSeed?: Partial<OnboardingData>;
}

const STEP_TITLES = [
  "Boas-vindas",
  "Token da Vercel",
  "Token do Supabase",
  "Organização e projeto",
  "Instalando",
  "Administrador",
  "Concluído",
] as const;

export function OnboardingWizard({
  __testStartStep,
  __testSeed,
}: OnboardingWizardProps) {
  const [step, setStep] = useState<number>(
    Math.min(Math.max(__testStartStep ?? 0, 0), TOTAL_ONBOARDING_STEPS - 1),
  );
  const [data, setData] = useState<OnboardingData>({
    ...ONBOARDING_INITIAL_DATA,
    ...(__testSeed ?? {}),
  });

  const goTo = useCallback((next: number) => {
    setStep(Math.min(Math.max(next, 0), TOTAL_ONBOARDING_STEPS - 1));
  }, []);

  const next = useCallback(() => goTo(step + 1), [goTo, step]);
  const back = useCallback(() => goTo(step - 1), [goTo, step]);

  const update = useCallback((patch: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  // Permite que um passo force o avanço (ex.: InstallingStep ao receber done).
  const advance = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOTAL_ONBOARDING_STEPS - 1));
  }, []);

  // Botão "Entrar" do passo Concluído: volta para a home. Usa
  // `window.location.href` (hard reload) para forçar o `<InstallationGuard>`
  // a remontar e refazer o fetch de `/api/installer/status` — necessário
  // porque o guard (já montado desde /onboarding) mantém o status antigo em
  // memória e não refaz sozinho. Com o reload, o guard vê `configured:true`
  // e libera o app.
  const handleEnterApp = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, []);

  // Hook de teste (E2E): permite que um ambiente de testes injete dados
  // adicionais no estado do wizard após o mount, disparando o evento custom
  // `onboarding:seed` na window. Em produção este listener nunca é acionado.
  // Usado pelos E2E para fornecer `serviceRoleKey` ao passo admin (que em
  // produção viria por um canal seguro separado, ainda não implementado).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | Partial<OnboardingData>
        | undefined;
      if (detail && typeof detail === "object") {
        setData((prev) => ({ ...prev, ...detail }));
      }
    };
    window.addEventListener("onboarding:seed", handler);
    return () => window.removeEventListener("onboarding:seed", handler);
  }, []);

  const currentStep = useMemo(() => {
    switch (step) {
      case 0:
        return <WelcomeStep onNext={next} />;
      case 1:
        return (
          <VercelTokenStep
            data={data}
            onUpdate={update}
            onNext={next}
            onBack={back}
          />
        );
      case 2:
        return (
          <SupabaseTokenStep
            data={data}
            onUpdate={update}
            onNext={next}
            onBack={back}
          />
        );
      case 3:
        return (
          <OrgProjectStep
            data={data}
            onUpdate={update}
            onNext={next}
            onBack={back}
          />
        );
      case 4:
        return (
          <InstallingStep
            data={data}
            onUpdate={update}
            onDone={advance}
            onBack={back}
          />
        );
      case 5:
        return (
          <AdminStep
            data={data}
            onUpdate={update}
            onNext={next}
            onBack={back}
          />
        );
      case 6:
        return <CompletedStep data={data} onEnter={handleEnterApp} />;
      default:
        return null;
    }
  }, [step, data, update, next, back, advance, handleEnterApp]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-xl">
        <Card className="border-border/60">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span aria-live="polite" data-testid="onboarding-step-indicator">
                Passo {step + 1} de {TOTAL_ONBOARDING_STEPS}
              </span>
              <span className="font-medium uppercase tracking-wide">
                {STEP_TITLES[step]}
              </span>
            </div>
            <ProgressDots current={step} total={TOTAL_ONBOARDING_STEPS} />
          </CardHeader>
          <CardContent className="pt-2">{currentStep}</CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Expx Flow · Assistente de configuração inicial
        </p>
      </div>
    </div>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5 pt-1" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors",
            i <= current ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}
