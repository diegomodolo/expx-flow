import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useGroupOpsEvents, EVENT_TYPES } from '@/hooks/useGroupOpsEvents';
import { useGroupOpsGroups } from '@/hooks/useGroupOpsGroups';
import { Activity, Search, RefreshCw, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GroupOpsEventsFeed() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');

  const { groups } = useGroupOpsGroups();
  const { events, isLoading, refetch } = useGroupOpsEvents(selectedGroupId);

  const filtered = events.filter((e) => {
    if (filterType !== 'all' && e.type !== filterType) return false;
    if (search) {
      const payload = JSON.stringify(e.payload_json ?? '').toLowerCase();
      if (!e.type.toLowerCase().includes(search.toLowerCase()) && !payload.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const getEventType = (type: string) => EVENT_TYPES.find((t) => t.value === type);
  const getGroupName = (gid: string) => groups.find((g) => g.id === gid)?.name ?? 'Grupo';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Feed de Eventos</h2>
          <p className="text-sm text-muted-foreground">Atividades em tempo real dos grupos</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar eventos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={selectedGroupId ?? 'all'} onValueChange={(v) => setSelectedGroupId(v === 'all' ? undefined : v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todos os grupos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os grupos</SelectItem>
            {groups.map((g) => (<SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {EVENT_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {/* Events Timeline */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando eventos...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Nenhum evento encontrado</h3>
          <p className="text-sm text-muted-foreground mt-1">Eventos aparecerão conforme atividades ocorrem nos grupos</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-1">
          {filtered.map((event, idx) => {
            const typeInfo = getEventType(event.type);
            const showDateHeader = idx === 0 || format(new Date(event.timestamp), 'yyyy-MM-dd') !== format(new Date(filtered[idx - 1].timestamp), 'yyyy-MM-dd');

            return (
              <React.Fragment key={event.id}>
                {showDateHeader && (
                  <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 px-1 z-10">
                    <span className="text-xs font-medium text-muted-foreground">
                      {format(new Date(event.timestamp), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${typeInfo?.color ?? 'bg-gray-500'} text-white`}>
                    {typeInfo?.icon ?? '📌'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{typeInfo?.label ?? event.type}</Badge>
                      <span className="text-xs text-muted-foreground">{getGroupName(event.group_id)}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{format(new Date(event.timestamp), 'HH:mm')}</span>
                    </div>
                    {event.payload_json && (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        {typeof event.payload_json === 'string' ? event.payload_json : (event.payload_json as any)?.description ?? (event.payload_json as any)?.text ?? JSON.stringify(event.payload_json).slice(0, 100)}
                      </p>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
