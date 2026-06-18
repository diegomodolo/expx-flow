import { TokenStepShared } from "@/components/onboarding/steps/TokenStepShared";
import type { OnboardingData } from "@/components/onboarding/onboardingState";

interface SupabaseTokenStepProps {
  data: OnboardingData;
  onUpdate: (patch: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function SupabaseTokenStep(props: SupabaseTokenStepProps) {
  return (
    <TokenStepShared
      data={props.data}
      field="supabaseToken"
      otherField="vercelToken"
      otherToken={props.data.vercelToken}
      label="Token do Supabase"
      onUpdate={props.onUpdate}
      onNext={props.onNext}
      onBack={props.onBack}
      description="O token do Supabase autoriza a criação do projeto, do banco de dados e da publicação das funções (Edge Functions) automaticamente."
      helpText="Para gerar o token, acesse sua conta do Supabase → Account → Access Tokens e crie um novo token."
      helpLink={{
        href: "https://supabase.com/dashboard/account/tokens",
        label: "supabase.com/dashboard/account/tokens",
      }}
      validHint="Token do Supabase confirmado."
      invalidHint="Token do Supabase inválido ou expirado."
    />
  );
}
