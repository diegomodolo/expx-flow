import { TokenStepShared } from "@/components/onboarding/steps/TokenStepShared";
import type { OnboardingData } from "@/components/onboarding/onboardingState";

interface VercelTokenStepProps {
  data: OnboardingData;
  onUpdate: (patch: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function VercelTokenStep(props: VercelTokenStepProps) {
  return (
    <TokenStepShared
      data={props.data}
      field="vercelToken"
      otherField="supabaseToken"
      otherToken={props.data.supabaseToken}
      label="Token da Vercel"
      onUpdate={props.onUpdate}
      onNext={props.onNext}
      onBack={props.onBack}
      description="O token da Vercel autoriza o Expx Flow a configurar as variáveis de ambiente e reiniciar a aplicação automaticamente após a instalação."
      helpText="Para gerar o token, acesse sua conta da Vercel → Account Settings → Tokens e crie um token com escopo total (Full Account)."
      helpLink={{
        href: "https://vercel.com/account/tokens",
        label: "vercel.com/account/tokens",
      }}
      validHint="Token da Vercel confirmado."
      invalidHint="Token da Vercel inválido ou expirado."
    />
  );
}
