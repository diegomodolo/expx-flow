import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CreditCard, DollarSign } from "lucide-react";

interface FundingAlertProps {
  accountStatus: number;
  balance: number;
  disableReason?: string;
  hasFundingIssues: boolean;
  accountName?: string;
  className?: string;
}

export const FundingAlert = ({ 
  accountStatus, 
  balance, 
  disableReason, 
  hasFundingIssues, 
  accountName = "Conta de anúncios",
  className = ""
}: FundingAlertProps) => {
  if (!hasFundingIssues) return null;

  const getAlertContent = () => {
    // Conta desabilitada
    if (accountStatus !== 1) {
      return {
        variant: "destructive" as const,
        icon: <AlertTriangle className="h-4 w-4" />,
        title: "Conta de Anúncios Desabilitada",
        description: disableReason 
          ? `${accountName} foi desabilitada: ${getDisableReasonMessage(disableReason)}`
          : `${accountName} está desabilitada. Verifique as configurações de pagamento.`
      };
    }

    // Saldo baixo ou zerado
    if (balance <= 0) {
      return {
        variant: "destructive" as const,
        icon: <CreditCard className="h-4 w-4" />,
        title: "Saldo Insuficiente",
        description: `${accountName} está sem saldo. Adicione fundos para continuar exibindo anúncios.`
      };
    }

    // Saldo baixo (menos de R$ 50)
    if (balance < 50) {
      return {
        variant: "default" as const,
        icon: <DollarSign className="h-4 w-4" />,
        title: "Saldo Baixo",
        description: `${accountName} tem saldo baixo (R$ ${balance.toFixed(2)}). Considere adicionar mais fundos.`
      };
    }

    return null;
  };

  const alertContent = getAlertContent();
  if (!alertContent) return null;

  return (
    <Alert variant={alertContent.variant} className={`border-l-4 ${className}`}>
      {alertContent.icon}
      <AlertTitle className="font-semibold">{alertContent.title}</AlertTitle>
      <AlertDescription className="text-sm">
        {alertContent.description}
      </AlertDescription>
    </Alert>
  );
};

const getDisableReasonMessage = (reason: string): string => {
  const reasonMap: { [key: string]: string } = {
    'FUNDING_SOURCE_ISSUE': 'Problema com método de pagamento',
    'ACCOUNT_CLOSURE': 'Conta encerrada',
    'POLICY_VIOLATION': 'Violação de políticas',
    'SECURITY_HOLD': 'Retenção de segurança',
    'BILLING_ISSUE': 'Problema de faturamento',
    'SPEND_LIMIT_REACHED': 'Limite de gastos atingido'
  };

  return reasonMap[reason] || reason;
};