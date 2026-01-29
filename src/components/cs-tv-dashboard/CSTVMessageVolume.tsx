import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, MessageSquare, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface HourlyVolume {
  hour: number;
  inbound: number;
  outbound: number;
}

interface CSTVMessageVolumeProps {
  hourlyVolume: HourlyVolume[];
  totalMessagesToday: number;
  totalMessagesThisWeek: number;
}

export function CSTVMessageVolume({ hourlyVolume, totalMessagesToday, totalMessagesThisWeek }: CSTVMessageVolumeProps) {
  const maxVolume = Math.max(...hourlyVolume.map(h => h.inbound + h.outbound), 1);
  const currentHour = new Date().getHours();
  
  const todayInbound = hourlyVolume.reduce((sum, h) => sum + h.inbound, 0);
  const todayOutbound = hourlyVolume.reduce((sum, h) => sum + h.outbound, 0);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5 text-primary" />
            Volume de Mensagens Hoje
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <ArrowDownLeft className="w-4 h-4 text-blue-500" />
              <span className="text-muted-foreground">Recebidas:</span>
              <span className="font-bold text-blue-500">{todayInbound}</span>
            </div>
            <div className="flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              <span className="text-muted-foreground">Enviadas:</span>
              <span className="font-bold text-emerald-500">{todayOutbound}</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Hour bars */}
        <div className="flex items-end gap-1 h-32">
          {hourlyVolume.map((hour) => {
            const totalHeight = ((hour.inbound + hour.outbound) / maxVolume) * 100;
            const inboundHeight = totalHeight > 0 ? (hour.inbound / (hour.inbound + hour.outbound)) * totalHeight : 0;
            const outboundHeight = totalHeight > 0 ? (hour.outbound / (hour.inbound + hour.outbound)) * totalHeight : 0;
            const isCurrentHour = hour.hour === currentHour;
            
            return (
              <div 
                key={hour.hour} 
                className="flex-1 flex flex-col items-center gap-0.5"
              >
                <div 
                  className="w-full flex flex-col justify-end rounded-t"
                  style={{ height: '100%' }}
                >
                  {outboundHeight > 0 && (
                    <div 
                      className={`w-full bg-emerald-500 rounded-t transition-all ${isCurrentHour ? 'opacity-100' : 'opacity-70'}`}
                      style={{ height: `${outboundHeight}%` }}
                    />
                  )}
                  {inboundHeight > 0 && (
                    <div 
                      className={`w-full bg-blue-500 transition-all ${outboundHeight > 0 ? '' : 'rounded-t'} ${isCurrentHour ? 'opacity-100' : 'opacity-70'}`}
                      style={{ height: `${inboundHeight}%` }}
                    />
                  )}
                </div>
                <span className={`text-[9px] ${isCurrentHour ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                  {hour.hour}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-muted-foreground">Recebidas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-muted-foreground">Enviadas</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
