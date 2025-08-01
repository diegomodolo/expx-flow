import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrafficCone } from "lucide-react";

const statusData = [
  { label: "Verde", count: 23, color: "bg-success", dotColor: "bg-success" },
  { label: "Amarelo", count: 8, color: "bg-warning", dotColor: "bg-warning" },
  { label: "Vermelho", count: 4, color: "bg-danger", dotColor: "bg-danger" },
];

export function StatusCard() {
  const total = statusData.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="shadow-sm border border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
            <TrafficCone className="text-success text-xl w-5 h-5" />
          </div>
          <CardTitle className="text-lg font-semibold text-foreground">Status dos Clientes</CardTitle>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
          Ver Detalhes
        </Button>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-48 h-48">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {statusData.map((item, index) => {
                const percentage = (item.count / total) * 100;
                const strokeDasharray = `${percentage} ${100 - percentage}`;
                const strokeDashoffset = statusData
                  .slice(0, index)
                  .reduce((sum, prev) => sum + (prev.count / total) * 100, 0);
                
                return (
                  <circle
                    key={item.label}
                    cx="50"
                    cy="50"
                    r="35"
                    fill="none"
                    stroke={item.color === "bg-success" ? "hsl(var(--success))" : 
                           item.color === "bg-warning" ? "hsl(var(--warning))" : 
                           "hsl(var(--danger))"}
                    strokeWidth="10"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={-strokeDashoffset}
                    className="transition-all duration-300"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{total}</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          {statusData.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 ${item.dotColor} rounded-full`}></div>
                <span className="text-sm text-muted-foreground">{item.label}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{item.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}