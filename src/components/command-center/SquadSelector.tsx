import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Team } from "@/hooks/useTeams";
import { UsersRound } from "lucide-react";

interface Props {
  teams: Team[];
  selectedTeamId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

export function SquadSelector({ teams, selectedTeamId, onSelect, loading }: Props) {
  if (loading) {
    return <div className="h-10 w-64 rounded-lg bg-muted animate-pulse" />;
  }

  return (
    <div className="flex items-center gap-3">
      <UsersRound className="w-5 h-5 text-primary" />
      <Select value={selectedTeamId || ""} onValueChange={onSelect}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Selecionar Squad" />
        </SelectTrigger>
        <SelectContent>
          {teams.map(team => (
            <SelectItem key={team.id} value={team.id}>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
                {team.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
