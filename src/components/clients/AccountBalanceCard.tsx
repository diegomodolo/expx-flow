import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertTriangle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface AccountBalanceCardProps {
  balance: number;
  currency: string;
  accountStatus: number;
  disableReason?: string;
  hasFundingIssues: boolean;
  accountName: string;
  lastBalanceCheck?: string;
  accountId: string;
  clientId: string;
  paymentType?: 'prepaid' | 'postpaid';
}

export const AccountBalanceCard = ({
  balance,
  currency,
  accountStatus,
  disableReason,
  hasFundingIssues,
  accountName,
  lastBalanceCheck,
  accountId,
  clientId,
  paymentType = 'prepaid'
}: AccountBalanceCardProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Se for pós-pago, mostrar card especial
  if (paymentType === 'postpaid') {
    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tipo de Pagamento</p>
              <div className="flex items-center gap-2 mt-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h2 className="text-2xl font-bold text-blue-700">Pós-pago</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cliente utiliza cartão de crédito (sem limite de saldo)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleRefreshBalance = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('refresh-account-balance', {
        body: { clientId }
      });
      
      if (error) throw error;
      
      toast.success('Saldo atualizado com sucesso!');
      
      // Trigger refetch do client details
      window.dispatchEvent(new CustomEvent('refreshClientDetails'));
    } catch (err: any) {
      console.error('Erro ao atualizar saldo:', err);
      toast.error(err.message || 'Erro ao atualizar saldo');
    } finally {
      setIsRefreshing(false);
    }
  };
  const formatCurrency = (amount: number, currencyCode: string) => {
    const currencySymbols: { [key: string]: string } = {
      'BRL': 'R$',
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    };
    
    const symbol = currencySymbols[currencyCode] || currencyCode;
    return `${symbol} ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusInfo = () => {
    if (accountStatus !== 1) {
      return {
        icon: XCircle,
        label: "Conta Desabilitada",
        color: "text-red-600",
        bgColor: "bg-red-50",
        badgeColor: "bg-red-100 text-red-800"
      };
    }
    
    if (hasFundingIssues || balance <= 0) {
      return {
        icon: AlertTriangle,
        label: "Sem Saldo",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        badgeColor: "bg-yellow-100 text-yellow-800"
      };
    }
    
    if (balance < 100) {
      return {
        icon: AlertTriangle,
        label: "Saldo Baixo",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        badgeColor: "bg-yellow-100 text-yellow-800"
      };
    }
    
    return {
      icon: CheckCircle,
      label: "Saldo OK",
      color: "text-green-600",
      bgColor: "bg-green-50",
      badgeColor: "bg-green-100 text-green-800"
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const formatLastCheck = (dateString?: string) => {
    if (!dateString) return "Nunca verificado";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return "Verificado agora";
    } else if (diffInHours < 24) {
      return `Verificado há ${Math.floor(diffInHours)}h`;
    } else {
      return `Verificado há ${Math.floor(diffInHours / 24)}d`;
    }
  };

  return (
    <Card className={`${statusInfo.bgColor} border-l-4 ${hasFundingIssues || accountStatus !== 1 ? 'border-l-red-500' : balance < 100 ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Saldo da Conta
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefreshBalance}
            disabled={isRefreshing}
            className="h-6 w-6"
            title="Atualizar saldo"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="text-2xl font-bold">
              {formatCurrency(balance, currency)}
            </div>
            <p className="text-xs text-muted-foreground truncate" title={accountName}>
              {accountName}
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <Badge className={statusInfo.badgeColor}>
              {statusInfo.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatLastCheck(lastBalanceCheck)}
            </span>
          </div>
          
          {disableReason && accountStatus !== 1 && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
              <strong>Motivo:</strong> {disableReason}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};