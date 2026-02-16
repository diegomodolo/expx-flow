import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, Crown, Users, Eye, Loader2, Plus, Filter } from "lucide-react";
import { useTaskMembers, TaskMemberRole } from "@/hooks/useTaskMembers";
import { useEmployees } from "@/hooks/useEmployees";

interface TaskTeamTabProps {
  taskId: string | undefined;
  companyId: string | undefined;
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
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
      <Avatar className="h-9 w-9">
        {member.employee_avatar && <AvatarImage src={member.employee_avatar} />}
        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
          {(member.employee_name || '?').charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{member.employee_name}</p>
        <div className="flex items-center gap-1 text-xs">
          <Icon className={`w-3 h-3 ${config.color}`} />
          <span className={config.color}>{config.label}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
        onClick={() => onRemove(member.id)}
        title="Remover membro"
      >
        <X className="w-3.5 h-3.5" />
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const employeeId = e.dataTransfer.getData('employeeId');
    if (employeeId) onDrop(employeeId, role);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-lg border-2 border-dashed p-3 transition-colors ${
        isDragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/10'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${config.color}`} />
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {config.label} ({members.length})
        </Label>
      </div>
      {members.length > 0 ? (
        <div className="space-y-2">
          {members.map(m => (
            <MemberCard key={m.id} member={m} onRemove={onRemove} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">
          {isDragOver ? 'Solte aqui para adicionar' : `Arraste um colaborador aqui ou clique em +`}
        </p>
      )}
    </div>
  );
}

function EmployeeCard({
  employee,
  onAdd,
  isAdding,
}: {
  employee: { id: string; name: string; avatar?: string; profile_avatar_url?: string; team?: { name: string; color: string } | null };
  onAdd: (employeeId: string, role: TaskMemberRole) => void;
  isAdding: boolean;
}) {
  const [showRoles, setShowRoles] = useState(false);
  const avatarSrc = employee.avatar || employee.profile_avatar_url || '';

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('employeeId', employee.id);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="relative flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-border bg-card hover:shadow-md cursor-grab active:cursor-grabbing transition-shadow group"
    >
      <Avatar className="h-10 w-10">
        {avatarSrc && <AvatarImage src={avatarSrc} />}
        <AvatarFallback className="bg-muted text-muted-foreground text-sm">
          {employee.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <p className="text-[11px] font-medium text-foreground text-center truncate w-full leading-tight">
        {employee.name.split(' ')[0]}
      </p>

      {/* Quick add button */}
      {!showRoles ? (
        <button
          onClick={() => setShowRoles(true)}
          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
          disabled={isAdding}
        >
          <Plus className="w-3 h-3" />
        </button>
      ) : (
        <div className="absolute inset-0 bg-card/95 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center gap-1 z-10">
          {(Object.entries(ROLE_CONFIG) as [TaskMemberRole, typeof ROLE_CONFIG.responsible][]).map(([role, cfg]) => {
            const RoleIcon = cfg.icon;
            return (
              <button
                key={role}
                onClick={() => {
                  onAdd(employee.id, role);
                  setShowRoles(false);
                }}
                disabled={isAdding}
                className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-md hover:bg-muted transition-colors w-full ${cfg.color}`}
              >
                <RoleIcon className="w-3 h-3" />
                {cfg.label}
              </button>
            );
          })}
          <button
            onClick={() => setShowRoles(false)}
            className="text-[10px] text-muted-foreground mt-0.5"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

export function TaskTeamTab({ taskId, companyId, fallbackResponsible }: TaskTeamTabProps) {
  const { members, responsible, contributors, observers, isLoading, addMember, isAdding, updateRole, removeMember } = useTaskMembers(taskId, companyId);
  const { employees } = useEmployees();
  const [search, setSearch] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');

  const assignedEmployeeIds = new Set(members.map(m => m.employee_id));

  // Get unique teams
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
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">Equipe</h3>
        <p className="text-xs text-muted-foreground">
          Arraste colaboradores para as zonas de papel ou clique no <Plus className="w-3 h-3 inline" /> para adicionar.
        </p>
      </div>

      {/* Role zones */}
      <div className="space-y-3">
        {/* Responsible */}
        <div
          className="rounded-lg border-2 border-dashed border-amber-500/30 p-3 bg-amber-500/5"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const eid = e.dataTransfer.getData('employeeId');
            if (eid) handleAddToRole(eid, 'responsible');
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Responsável
            </Label>
          </div>
          {responsible ? (
            <MemberCard member={responsible} onRemove={removeMember} />
          ) : fallbackResponsible?.name ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-card">
              <Avatar className="h-9 w-9">
                {fallbackResponsible.avatar && <AvatarImage src={fallbackResponsible.avatar} />}
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {fallbackResponsible.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{fallbackResponsible.name}</p>
                <div className="flex items-center gap-1 text-xs">
                  <Crown className="w-3 h-3 text-amber-500" />
                  <span className="text-amber-500">Responsável</span>
                  <span className="text-muted-foreground ml-1">(aba Principal)</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              Arraste um colaborador aqui
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
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

      {/* Available employees grid */}
      <div className="flex-1 min-h-0">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
          Colaboradores Disponíveis
        </Label>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar colaborador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>

        {/* Employee avatar grid */}
        <div className="grid grid-cols-4 gap-2 max-h-[180px] overflow-y-auto pr-1">
          {availableEmployees.map(emp => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              onAdd={handleAddToRole}
              isAdding={isAdding}
            />
          ))}
          {availableEmployees.length === 0 && (
            <div className="col-span-4 text-xs text-muted-foreground text-center py-4">
              {search ? 'Nenhum colaborador encontrado' : 'Todos já foram adicionados'}
            </div>
          )}
        </div>
      </div>

      {/* Team filter at bottom */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Filtrar por equipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as equipes</SelectItem>
              {teams.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color || 'hsl(var(--muted))' }} />
                    {t.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
