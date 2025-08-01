import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const alerts = [
  {
    type: "CPL Alto",
    client: "Fitness Academy",
    severity: "critical",
    bgColor: "bg-danger/10",
    borderColor: "border-l-danger",
    buttonColor: "bg-danger hover:bg-danger/90"
  },
  {
    type: "Budget Excedido", 
    client: "AutoPeças Express",
    severity: "critical",
    bgColor: "bg-danger/10",
    borderColor: "border-l-danger",
    buttonColor: "bg-danger hover:bg-danger/90"
  },
  {
    type: "Baixa Performance",
    client: "Consultoria Empresarial", 
    severity: "critical",
    bgColor: "bg-danger/10",
    borderColor: "border-l-danger",
    buttonColor: "bg-danger hover:bg-danger/90"
  },
  {
    type: "Revisão Necessária",
    client: "EcoTech Solutions",
    severity: "warning", 
    bgColor: "bg-warning/10",
    borderColor: "border-l-warning",
    buttonColor: "bg-warning hover:bg-warning/90"
  }
];

export function AlertsCard() {
  return (
    <Card className="shadow-sm border border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-danger/10 rounded-lg flex items-center justify-center">
            <AlertTriangle className="text-danger text-xl w-5 h-5" />
          </div>
          <CardTitle className="text-lg font-semibold text-foreground">Alertas Críticos</CardTitle>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
          Ver Todos
        </Button>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {alerts.map((alert, index) => (
            <div key={index} className={`flex items-center justify-between p-3 ${alert.bgColor} rounded-lg border-l-4 ${alert.borderColor}`}>
              <div>
                <div className="font-medium text-foreground">{alert.type}</div>
                <div className="text-sm text-muted-foreground">{alert.client}</div>
              </div>
              <Button 
                size="sm" 
                className={`${alert.buttonColor} text-white text-xs h-7 px-3`}
              >
                {alert.severity === "critical" ? "Ação" : "Revisar"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}