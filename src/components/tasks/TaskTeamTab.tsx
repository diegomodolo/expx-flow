import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, Crown, Users, Eye, Loader2, Plus, Filter } from "lucide-react";
import { useTaskMembers, TaskMemberRole } from "@/hooks/useTaskMembers";
import { useEmployees } from "@/hooks/useEmployees";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface TaskTeamTabProps {
  taskId: string | undefined;
  companyId: string | undefined;
  defaultTeamId?: string;
  fallbackResponsible?: {
    name: string;
    avatar: string;
    employeeId: string;
  };
}

const ROLE_CONFIG: Record<TaskMemberRole, { label: string; icon: React.ElementType; color: string; description: string }> = {
  responsible: {
    label: 'Responsável',
    icon: Crown,
    color: 'text-amber-500',
    description: 'Responsável principal pela execução',
  },
  contributor: {
    label: 'Contribuinte',
    icon: Users,
    color: 'text-blue-500',
    description: 'Colabora ativamente na execução',
  },
  observer: {
    label: 'Observador',
    icon: Eye,
    color: 'text-muted-foreground',
    description: 'Acompanha o progresso',
  },
};

function MemberCard({ member, onRemove }: {
  member: { id: string; employee_name?: string; employee_avatar?: string; role: TaskMemberRole };
  onRemove: (id: string) => void;
}) {
  const config = ROLE_CONFIG[member.role];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2.5 p-2 rounded-lg border border-border bg-card">
      <Avatar className="h-8 w-8">
        {member.employee_avatar && <AvatarImage src={member.employee_avatar} />}
        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
          {(member.employee_name || '?').charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{member.employee_name}</p>
        <div className="flex items-center gap-1 text-[11px]">
          <Icon className={`w-3 h-3 ${config.color}`} />
          <span className={config.color}>{config.label}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
        onClick={() => onRemove(member.id)}
        title="Remover membro"
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}

function RoleDropZone({
  role,
  members,
  onRemove,
  onDrop,
}: {
  role: TaskMemberRole;
  members: Array<{ id: string; employee_name?: string; employee_avatar?: string; role: TaskMemberRole }>;
  onRemove: (id: string) => void;
  onDrop: (employeeId: string, role: TaskMemberRole) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const config = ROLE_CONFIG[role];
  const Icon = config.icon;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const eid = e.dataTransfer.getData('employeeId');
        if (eid) onDrop(eid, role);
      }}
      className={`rounded-lg border-2 border-dashed p-2.5 transition-colors ${
        isDragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/10'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`w-3.5 h-3.5 ${config.color}`} />
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          {config.label} ({members.length})
        </span>
      </div>
      {members.length > 0 ? (
        <div className="space-y-1.5">
          {members.map(m => (
            <MemberCard key={m.id} member={m} onRemove={onRemove} />
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground text-center py-1.5">
          {isDragOver ? 'Solte aqui' : 'Arraste ou clique para adicionar'}
        </p>
      )}
    </div>
  );
}

function EmployeeChip({
  employee,
  onAdd,
  isAdding,
}: {
  employee: { id: string; name: string; avatar?: string; profile_avatar_url?: string };
  onAdd: (employeeId: string, role: TaskMemberRole) => void;
  isAdding: boolean;
}) {
  const [showRoles, setShowRoles] = useState(false);
  const avatarSrc = employee.avatar || employee.profile_avatar_url || '';

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('employeeId', employee.id);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              draggable
              onDragStart={handleDragStart}
              onClick={() => setShowRoles(!showRoles)}
              className="flex flex-col items-center gap-0.5 cursor-grab active:cursor-grabbing group"
            >
              <div className="relative">
                <Avatar className="h-8 w-8 border-2 border-transparent group-hover:border-primary/40 transition-colors">
                  {avatarSrc && <AvatarImage src={avatarSrc} />}
                  <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                    {employee.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-2 h-2" />
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground truncate w-full text-center leading-tight">
                {employee.name.split(' ')[0]}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">{employee.name}</TooltipContent>
        </Tooltip>

        {showRoles && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full bg-popover border border-border rounded-lg shadow-lg p-1.5 z-20 min-w-[120px]">
            {(Object.entries(ROLE_CONFIG) as [TaskMemberRole, typeof ROLE_CONFIG.responsible][]).map(([role, cfg]) => {
              const RoleIcon = cfg.icon;
              return (
                <button
                  key={role}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd(employee.id, role);
                    setShowRoles(false);
                  }}
                  disabled={isAdding}
                  className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-1.5 rounded-md hover:bg-muted transition-colors w-full ${cfg.color}`}
                >
                  <RoleIcon className="w-3 h-3" />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export function TaskTeamTab({ taskId, companyId, fallbackResponsible, defaultTeamId }: TaskTeamTabProps) {
  const { members, responsible, contributors, observers, isLoading, addMember, isAdding, updateRole, removeMember } = useTaskMembers(taskId, companyId);
  const { employees } = useEmployees();
  const [search, setSearch] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(defaultTeamId || 'all');

  const assignedEmployeeIds = new Set(members.map(m => m.employee_id));

  const teams = useMemo(() => {
    if (!employees) return [];
    const teamMap = new Map<string, { id: string; name: string; color: string }>();
    employees.forEach(e => {
      if (e.team) teamMap.set(e.team.id, e.team);
    });
    return Array.from(teamMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  const availableEmployees = useMemo(() => {
    return (employees || [])
      .filter(e => !assignedEmployeeIds.has(e.id))
      .filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
      .filter(e => selectedTeamId === 'all' || e.team_id === selectedTeamId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, assignedEmployeeIds, search, selectedTeamId]);

  const handleAddToRole = (employeeId: string, role: TaskMemberRole) => {
    addMember({ employeeId, role });
  };

  if (!taskId) {
    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-semibold text-foreground mb-1">Equipe</h3>
          <p className="text-sm text-muted-foreground">
            Salve a tarefa primeiro para gerenciar os membros da equipe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-0.5">Equipe</h3>
        <p className="text-[11px] text-muted-foreground">
          Arraste colaboradores para as áreas ou clique para selecionar o papel.
        </p>
      </div>

      {/* Role zones */}
      <div className="space-y-2">
        {/* Responsible */}
        <div
          className="rounded-lg border-2 border-dashed border-amber-500/30 p-2.5 bg-amber-500/5"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const eid = e.dataTransfer.getData('employeeId');
            if (eid) handleAddToRole(eid, 'responsible');
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Responsável
            </span>
          </div>
          {responsible ? (
            <MemberCard member={responsible} onRemove={removeMember} />
          ) : fallbackResponsible?.name ? (
            <div className="flex items-center gap-2.5 p-2 rounded-lg border border-primary/30 bg-card">
              <Avatar className="h-8 w-8">
                {fallbackResponsible.avatar && <AvatarImage src={fallbackResponsible.avatar} />}
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {fallbackResponsible.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{fallbackResponsible.name}</p>
                <div className="flex items-center gap-1 text-[11px]">
                  <Crown className="w-3 h-3 text-amber-500" />
                  <span className="text-amber-500">Responsável</span>
                  <span className="text-muted-foreground ml-1">(aba Principal)</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground text-center py-1.5">
              Arraste um colaborador aqui
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <>
            <RoleDropZone role="contributor" members={contributors} onRemove={removeMember} onDrop={handleAddToRole} />
            <RoleDropZone role="observer" members={observers} onRemove={removeMember} onDrop={handleAddToRole} />
          </>
        )}
      </div>

      <Separator />

      {/* Available employees */}
      <div className="flex-1 min-h-0">
        {/* Team filter above the list */}
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue placeholder="Filtrar por equipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as equipes</SelectItem>
              {teams.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color || 'hsl(var(--muted))' }} />
                    {t.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>

        {/* Compact avatar grid */}
        <div className="grid grid-cols-6 gap-2 max-h-[140px] overflow-y-auto pr-1">
          {availableEmployees.map(emp => (
            <EmployeeChip
              key={emp.id}
              employee={emp}
              onAdd={handleAddToRole}
              isAdding={isAdding}
            />
          ))}
          {availableEmployees.length === 0 && (
            <div className="col-span-6 text-[11px] text-muted-foreground text-center py-3">
              {search ? 'Nenhum encontrado' : 'Todos já adicionados'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
