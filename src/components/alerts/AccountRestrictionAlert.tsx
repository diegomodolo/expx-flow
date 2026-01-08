import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Ban, AlertOctagon, Clock, XCircle } from "lucide-react";

interface AccountRestrictionAlertProps {
  isRestricted: boolean;
  restrictionReason?: string;
  canAdvertise: boolean;
  accountStatus: number;
  accountName?: string;
  className?: string;
}

export const AccountRestrictionAlert = ({ 
  isRestricted,
  restrictionReason,
  canAdvertise,
  accountStatus,
  accountName = "Conta de anúncios",
  className = ""
}: AccountRestrictionAlertProps) => {
  if (!isRestricted && canAdvertise) return null;

  const getAlertContent = () => {
    // Account status mapping:
    // 1 = ACTIVE, 2 = DISABLED, 3 = UNSETTLED, 7 = PENDING_RISK_REVIEW
    // 8 = PENDING_SETTLEMENT, 9 = IN_GRACE_PERIOD, 100 = PENDING_CLOSURE, 101 = CLOSED
    
    switch (accountStatus) {
      case 2: // DISABLED
        return {
          icon: <Ban className="h-4 w-4" />,
          title: "Conta Desabilitada",
          description: restrictionReason || `${accountName} foi desabilitada pelo Meta. Não é possível veicular anúncios.`,
          severity: "high"
        };
      case 7: // PENDING_RISK_REVIEW
        return {
          icon: <AlertOctagon className="h-4 w-4" />,
          title: "Conta em Análise",
          description: `${accountName} está em análise de risco pelo Meta. Os anúncios estão pausados temporariamente.`,
          severity: "medium"
        };
      case 100: // PENDING_CLOSURE
        return {
          icon: <Clock className="h-4 w-4" />,
          title: "Fechamento Pendente",
          description: `${accountName} está pendente de fechamento. Não é possível veicular novos anúncios.`,
          severity: "high"
        };
      case 101: // CLOSED
        return {
          icon: <XCircle className="h-4 w-4" />,
          title: "Conta Encerrada",
          description: `${accountName} foi permanentemente encerrada.`,
          severity: "high"
        };
      case 3: // UNSETTLED
        return {
          icon: <AlertOctagon className="h-4 w-4" />,
          title: "Pagamento Pendente",
          description: `${accountName} possui pagamentos pendentes que precisam ser regularizados.`,
          severity: "medium"
        };
      case 9: // IN_GRACE_PERIOD
        return {
          icon: <Clock className="h-4 w-4" />,
          title: "Período de Carência",
          description: `${accountName} está em período de carência. Regularize a situação para evitar suspensão.`,
          severity: "low"
        };
      default:
        if (!canAdvertise) {
          return {
            icon: <AlertOctagon className="h-4 w-4" />,
            title: "Anúncios Bloqueados",
            description: restrictionReason || `${accountName} não pode veicular anúncios no momento.`,
            severity: "high"
          };
        }
        return null;
    }
  };

  const alertContent = getAlertContent();
  if (!alertContent) return null;

  const severityStyles = {
    high: "border-l-destructive bg-destructive/5",
    medium: "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20",
    low: "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
  };

  return (
    <Alert 
      variant={alertContent.severity === "high" ? "destructive" : "default"} 
      className={`border-l-4 ${severityStyles[alertContent.severity as keyof typeof severityStyles]} ${className}`}
    >
      {alertContent.icon}
      <AlertTitle className="font-semibold">{alertContent.title}</AlertTitle>
      <AlertDescription className="text-sm">
        {alertContent.description}
      </AlertDescription>
    </Alert>
  );
};
