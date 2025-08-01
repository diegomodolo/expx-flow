import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Check, 
  Star, 
  Users, 
  BarChart3, 
  Shield, 
  Clock,
  Download
} from "lucide-react";

export const PlansSettings = () => {
  const { toast } = useToast();
  const [currentPlan] = useState("pro");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const plans = {
    free: {
      name: "Gratuito",
      price: { monthly: 0, yearly: 0 },
      features: [
        "Até 3 usuários",
        "5 campanhas por mês",
        "Relatórios básicos",
        "Suporte por email",
      ],
      limits: {
        users: 3,
        campaigns: 5,
        storage: "1GB",
      }
    },
    pro: {
      name: "Profissional",
      price: { monthly: 49, yearly: 490 },
      features: [
        "Até 10 usuários",
        "Campanhas ilimitadas",
        "Relatórios avançados",
        "Suporte prioritário",
        "Integrações premium",
        "Backup automático",
      ],
      limits: {
        users: 10,
        campaigns: "Ilimitado",
        storage: "50GB",
      }
    },
    enterprise: {
      name: "Empresarial",
      price: { monthly: 149, yearly: 1490 },
      features: [
        "Usuários ilimitados",
        "Campanhas ilimitadas",
        "Analytics personalizados",
        "Suporte 24/7",
        "API personalizada",
        "Backup em tempo real",
        "SSO integrado",
        "Gerente de conta dedicado",
      ],
      limits: {
        users: "Ilimitado",
        campaigns: "Ilimitado",
        storage: "500GB",
      }
    }
  };

  const currentPlanData = plans[currentPlan as keyof typeof plans];
  const usageData = {
    users: { 
      current: 7, 
      max: typeof currentPlanData.limits.users === "number" ? currentPlanData.limits.users : 100 
    },
    campaigns: { 
      current: 12, 
      max: typeof currentPlanData.limits.campaigns === "number" ? currentPlanData.limits.campaigns : 100 
    },
    storage: { current: 23.5, max: parseFloat(currentPlanData.limits.storage) },
  };

  const handleUpgrade = (planKey: string) => {
    toast({
      title: "Redirecionando...",
      description: `Você será redirecionado para atualizar para o plano ${plans[planKey as keyof typeof plans].name}.`,
    });
  };

  const handleDownloadInvoice = () => {
    toast({
      title: "Download iniciado",
      description: "Sua fatura está sendo preparada para download.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Plano Atual
          </CardTitle>
          <CardDescription>
            Gerencie sua assinatura e veja o uso atual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {currentPlanData.name}
                {currentPlan === "pro" && <Badge variant="default">Atual</Badge>}
              </h3>
              <p className="text-muted-foreground">
                R$ {currentPlanData.price[billingCycle]}{billingCycle === "monthly" ? "/mês" : "/ano"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Próxima cobrança</p>
              <p className="font-medium">15 de Janeiro, 2024</p>
            </div>
          </div>

          {/* Usage */}
          <div className="space-y-4">
            <h4 className="font-medium">Uso Atual</h4>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Usuários</span>
                  <span>{usageData.users.current} / {usageData.users.max}</span>
                </div>
                <Progress value={(usageData.users.current / usageData.users.max) * 100} />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Campanhas este mês</span>
                  <span>{usageData.campaigns.current} / {typeof currentPlanData.limits.campaigns === 'number' ? usageData.campaigns.max : '∞'}</span>
                </div>
                <Progress value={(usageData.campaigns.current / usageData.campaigns.max) * 100} />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Armazenamento</span>
                  <span>{usageData.storage.current}GB / {usageData.storage.max}GB</span>
                </div>
                <Progress value={(usageData.storage.current / usageData.storage.max) * 100} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Planos Disponíveis</CardTitle>
          <CardDescription>
            Compare os planos e escolha o melhor para sua equipe
          </CardDescription>
          
          <div className="flex items-center gap-4 pt-4">
            <Button
              variant={billingCycle === "monthly" ? "default" : "outline"}
              size="sm"
              onClick={() => setBillingCycle("monthly")}
            >
              Mensal
            </Button>
            <Button
              variant={billingCycle === "yearly" ? "default" : "outline"}
              size="sm"
              onClick={() => setBillingCycle("yearly")}
            >
              Anual
              <Badge variant="secondary" className="ml-2">-20%</Badge>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {Object.entries(plans).map(([key, plan]) => (
              <Card key={key} className={`relative ${currentPlan === key ? 'ring-2 ring-primary' : ''}`}>
                {key === "pro" && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Mais Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {currentPlan === key && <Check className="h-5 w-5 text-green-500" />}
                  </CardTitle>
                  <div className="text-2xl font-bold">
                    R$ {plan.price[billingCycle]}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{billingCycle === "monthly" ? "mês" : "ano"}
                    </span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className="w-full" 
                    variant={currentPlan === key ? "outline" : "default"}
                    onClick={() => handleUpgrade(key)}
                    disabled={currentPlan === key}
                  >
                    {currentPlan === key ? "Plano Atual" : "Escolher Plano"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Cobrança
          </CardTitle>
          <CardDescription>
            Visualize suas faturas anteriores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { date: "01/12/2023", amount: "R$ 49,00", status: "Pago", invoice: "INV-001" },
              { date: "01/11/2023", amount: "R$ 49,00", status: "Pago", invoice: "INV-002" },
              { date: "01/10/2023", amount: "R$ 49,00", status: "Pago", invoice: "INV-003" },
            ].map((bill, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">{bill.invoice}</p>
                    <p className="text-sm text-muted-foreground">{bill.date}</p>
                  </div>
                  <Badge variant="secondary">{bill.status}</Badge>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium">{bill.amount}</span>
                  <Button size="sm" variant="outline" onClick={handleDownloadInvoice}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};