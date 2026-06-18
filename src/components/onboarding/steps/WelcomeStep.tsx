import React from "react";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Sparkles, Wallet, Rocket } from "lucide-react";

interface WelcomeStepProps {
  onNext: () => void;
}

const FEATURES: Array<{
  icon: React.ElementType;
  title: string;
  desc: string;
}> = [
  {
    icon: Wallet,
    title: "Você só paga o que usar",
    desc: "Criamos as contas na Vercel e no Supabase em tier gratuito para começar.",
  },
  {
    icon: Shield,
    title: "Seus dados são seus",
    desc: "Tudo fica no seu próprio Supabase — nenhum dado seu passa pelos nossos servidores.",
  },
  {
    icon: Sparkles,
    title: "Sem terminal, sem código",
    desc: "Basta colar dois tokens e dar um nome ao projeto. O resto é com a gente.",
  },
  {
    icon: Rocket,
    title: "Pronto em minutos",
    desc: "Criamos o banco, publicamos as funções e configuramos as variáveis automaticamente.",
  },
];

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2 text-center">
        <CardTitle className="text-2xl">Bem-vindo(a) ao Expx Flow</CardTitle>
        <CardDescription className="text-base">
          Em poucos minutos vamos configurar a sua instância. Você vai precisar
          de dois tokens (um da Vercel e um do Supabase) — vamos te ensinar a
          pegar cada um na hora certa.
        </CardDescription>
      </div>

      <ul className="space-y-3">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <li
            key={title}
            className="flex items-start gap-3 rounded-lg border bg-card/40 p-3"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex justify-end pt-1">
        <Button onClick={onNext} size="lg">
          Começar
        </Button>
      </div>
    </div>
  );
}
