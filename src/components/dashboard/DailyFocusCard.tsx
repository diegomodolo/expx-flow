import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarCheck } from "lucide-react";

const focusItems = [
  {
    company: "Digital Ventures",
    meeting: "Reunião estratégica - 14:00",
    bgColor: "bg-primary/10",
    avatar: "DV"
  },
  {
    company: "RetailMax", 
    meeting: "Análise de performance - 16:30",
    bgColor: "bg-success/10",
    avatar: "RM"
  },
  {
    company: "StartupHub",
    meeting: "Otimização de campanha - 18:00", 
    bgColor: "bg-warning/10",
    avatar: "SH"
  }
];

export function DailyFocusCard() {
  return (
    <Card className="shadow-sm border border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <CalendarCheck className="text-primary text-xl w-5 h-5" />
          </div>
          <CardTitle className="text-lg font-semibold text-foreground">Foco do Dia</CardTitle>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
          Ver Agenda
        </Button>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {focusItems.map((item, index) => (
            <div key={index} className={`flex items-center space-x-3 p-3 ${item.bgColor} rounded-lg`}>
              <Avatar className="w-10 h-10">
                <AvatarFallback className="text-xs font-medium">{item.avatar}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-medium text-foreground">{item.company}</div>
                <div className="text-sm text-muted-foreground">{item.meeting}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}