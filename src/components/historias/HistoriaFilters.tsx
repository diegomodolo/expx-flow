import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

interface HistoriaFiltersProps {
  teams: { id: string; name: string; color: string }[];
  clients: { id: string; name: string }[];
  filters: {
    teamId: string;
    clientId: string;
    statusFilter: "open" | "in_progress" | "done" | "all";
    titleSearch: string;
  };
  onFilterChange: (filters: any) => void;
}

export function HistoriaFilters({ teams, clients, filters, onFilterChange }: HistoriaFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-[320px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar história..."
          value={filters.titleSearch}
          onChange={(e) => onFilterChange({ ...filters, titleSearch: e.target.value })}
          className="pl-9 h-9"
        />
      </div>

      <Select
        value={filters.clientId}
        onValueChange={(value) => onFilterChange({ ...filters, clientId: value })}
      >
        <SelectTrigger className="w-[200px] h-9">
          <SelectValue placeholder="Cliente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Clientes</SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.teamId}
        onValueChange={(value) => onFilterChange({ ...filters, teamId: value })}
      >
        <SelectTrigger className="w-[180px] h-9">
          <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Squad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Squads</SelectItem>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.statusFilter}
        onValueChange={(value) => onFilterChange({ ...filters, statusFilter: value as any })}
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="open">Abertas</SelectItem>
          <SelectItem value="in_progress">Em Andamento</SelectItem>
          <SelectItem value="done">Concluídas</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
