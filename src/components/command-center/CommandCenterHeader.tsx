import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { CheckCircle2, Users } from "lucide-react";

interface HeaderProps {
  metrics: {
    completed: number;
    total: number;
    busy: number;
    totalMembers: number;
    busyPercent: number;
  };
  teamName: string;
}

export function CommandCenterHeader({ metrics, teamName }: HeaderProps) {
  const available = metrics.totalMembers - metrics.busy;
  const donutData = [
    { name: "Ocupados", value: metrics.busy },
    { name: "Disponíveis", value: available > 0 ? available : 0 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Donut - Disponibilidade */}
      <div className="rounded-2xl bg-card border border-border p-5 flex items-center gap-4">
        <div className="w-16 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={18} outerRadius={28} dataKey="value" strokeWidth={0}>
                <Cell fill="hsl(var(--primary))" />
                <Cell fill="hsl(var(--muted))" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-xs text-primary font-medium uppercase tracking-wider">Disponibilidade</p>
          <p className="text-2xl font-bold text-foreground">{100 - metrics.busyPercent}%</p>
          <p className="text-xs text-muted-foreground">{available} de {metrics.totalMembers} livres</p>
        </div>
      </div>

      {/* Vazão */}
      <div className="rounded-2xl bg-card border border-border p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-xs text-primary font-medium uppercase tracking-wider">Vazão do Dia</p>
          <p className="text-2xl font-bold text-foreground">{metrics.completed}/{metrics.total}</p>
          <p className="text-xs text-muted-foreground">tarefas concluídas</p>
        </div>
      </div>

      {/* Squad Info */}
      <div className="rounded-2xl bg-card border border-border p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-xs text-primary font-medium uppercase tracking-wider">Squad Ativa</p>
          <p className="text-lg font-bold text-foreground truncate">{teamName}</p>
          <p className="text-xs text-muted-foreground">{metrics.totalMembers} membros</p>
        </div>
      </div>
    </div>
  );
}
