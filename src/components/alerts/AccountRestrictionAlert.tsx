import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Ban, AlertOctagon, Clock, XCircle } from "lucide-react";

interface AccountRestrictionAlertProps {
  isRestricted?: boolean;
  restrictionReason?: string;
  canAdvertise?: boolean;
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
  // Status codes that indicate restriction: 2 (DISABLED), 3 (UNSETTLED), 7 (PENDING_RISK_REVIEW), 8 (PENDING_SETTLEMENT), 100 (PENDING_CLOSURE), 101 (CLOSED)
  const restrictedStatuses = [2, 3, 7, 8, 100, 101];
  
  // Robust logic: prioritize explicit flags, fallback to status codes
  // 1. If canAdvertise is explicitly false -> restricted
  // 2. If isRestricted is explicitly true -> restricted
  // 3. Fallback: check if accountStatus is in restricted list
  const isAccountRestricted = 
    canAdvertise === false || 
    isRestricted === true || 
    restrictedStatuses.includes(accountStatus);
  
  const canAccountAdvertise = 
    canAdvertise === true || 
    (!isRestricted && [1, 9].includes(accountStatus));
  
  if (!isAccountRestricted && canAccountAdvertise) return null;

  // Helper function to get human-readable disable reason
  const getDisableReasonText = (reason: string | undefined, status: number): string => {
    if (!reason) return "";
    
    // Parse the reason - could be a number or a descriptive string from backend
    const reasonNum = parseInt(reason, 10);
    
    // If it's a number, map to human-readable text
    if (!isNaN(reasonNum)) {
      const disableReasonMap: Record<number, string> = {
        0: "Nenhuma restrição identificada",
        1: "A conta foi desabilitada por violação das políticas de anúncios do Meta.",
        2: "A conta foi desabilitada por problemas de pagamento ou faturamento.",
        3: "A conta foi desabilitada por atividade suspeita detectada.",
        4: "A conta foi desabilitada por solicitação do usuário.",
        5: "A conta foi desabilitada por questões legais ou regulatórias.",
      };
      return disableReasonMap[reasonNum] || `A conta foi desabilitada pelo Meta. (Código: ${reasonNum})`;
    }
    
    // If it's already descriptive text (from our backend), clean it up
    if (reason.startsWith("Meta account_status=")) {
      return "A conta possui restrições aplicadas pelo Meta. Verifique o Gerenciador de Anúncios para mais detalhes.";
    }
    
    return reason;
  };

  const getAlertContent = () => {
    // Get human-readable restriction reason
    const humanReadableReason = getDisableReasonText(restrictionReason, accountStatus);
    
    // Account status mapping:
    // 1 = ACTIVE, 2 = DISABLED, 3 = UNSETTLED, 7 = PENDING_RISK_REVIEW
    // 8 = PENDING_SETTLEMENT, 9 = IN_GRACE_PERIOD, 100 = PENDING_CLOSURE, 101 = CLOSED
    
    // If we have a meaningful restriction reason, use it
    if (humanReadableReason && humanReadableReason !== "Nenhuma restrição identificada") {
      return {
        icon: <Ban className="h-4 w-4" />,
        title: "Conta Restrita",
        description: humanReadableReason,
        severity: "high"
      };
    }
    
    switch (accountStatus) {
      case 2: // DISABLED
        return {
          icon: <Ban className="h-4 w-4" />,
          title: "Conta Desabilitada",
          description: `${accountName} foi desabilitada pelo Meta. Não é possível veicular anúncios.`,
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
        if (!canAccountAdvertise || isAccountRestricted) {
          return {
            icon: <AlertOctagon className="h-4 w-4" />,
            title: "Anúncios Bloqueados",
            description: `${accountName} não pode veicular anúncios no momento.`,
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
