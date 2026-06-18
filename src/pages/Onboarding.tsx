import React, { Suspense } from "react";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

/**
 * Rota pública `/onboarding` — assistente de configuração inicial.
 * Sem `<DashboardLayout>` (rota pública, antes do app existir). O guard
 * (`InstallationGuard`) redireciona para cá quando `configured=false` e
 * libera para `/` quando `configured=true`.
 *
 * Referência: docs/onboarding-installer/SPRINT-3-wizard-admin-e2e.md
 */
const Onboarding: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      }
    >
      <OnboardingWizard />
    </Suspense>
  );
};

export default Onboarding;
