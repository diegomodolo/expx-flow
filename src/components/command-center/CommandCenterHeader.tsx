import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Activity, CheckCircle2, Clock, Users } from "lucide-react";

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
      <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-5 flex items-center gap-4 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
        <div className="w-16 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={18} outerRadius={28} dataKey="value" strokeWidth={0}>
                <Cell fill="hsl(187 90% 50%)" />
                <Cell fill="hsl(0 0% 30%)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-xs text-cyan-400 font-medium uppercase tracking-wider">Disponibilidade</p>
          <p className="text-2xl font-bold text-white">{100 - metrics.busyPercent}%</p>
          <p className="text-xs text-white/50">{available} de {metrics.totalMembers} livres</p>
        </div>
      </div>

      {/* Vazão */}
      <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-5 flex items-center gap-4 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <p className="text-xs text-purple-400 font-medium uppercase tracking-wider">Vazão do Dia</p>
          <p className="text-2xl font-bold text-white">{metrics.completed}/{metrics.total}</p>
          <p className="text-xs text-white/50">tarefas concluídas</p>
        </div>
      </div>

      {/* Squad Info */}
      <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-5 flex items-center gap-4 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <Users className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Squad Ativa</p>
          <p className="text-lg font-bold text-white truncate">{teamName}</p>
          <p className="text-xs text-white/50">{metrics.totalMembers} membros</p>
        </div>
      </div>
    </div>
  );
}
