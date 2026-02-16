import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, Crown, Users, Eye, Loader2 } from "lucide-react";
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

const ROLE_CONFIG: Record<TaskMemberRole, { label: string; icon: React.ElementType; color: string; badgeVariant: string; description: string }> = {
  responsible: {
    label: 'Responsável',
    icon: Crown,
    color: 'text-amber-500',
    badgeVariant: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    description: 'Responsável principal pela execução da tarefa',
  },
  contributor: {
    label: 'Contribuinte',
    icon: Users,
    color: 'text-blue-500',
    badgeVariant: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    description: 'Colabora ativamente na execução da tarefa',
  },
  observer: {
    label: 'Observador',
    icon: Eye,
    color: 'text-muted-foreground',
    badgeVariant: 'bg-muted text-muted-foreground border-border',
    description: 'Acompanha o progresso sem participar da execução',
  },
};

function MemberCard({ member, onRemove, onChangeRole }: {
  member: { id: string; employee_name?: string; employee_avatar?: string; role: TaskMemberRole };
  onRemove: (id: string) => void;
  onChangeRole: (id: string, role: TaskMemberRole) => void;
}) {
  const config = ROLE_CONFIG[member.role];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
      <Avatar className="h-9 w-9">
        {member.employee_avatar && <AvatarImage src={member.employee_avatar} />}
        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
          {(member.employee_name || '?').charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{member.employee_name}</p>
        <Select
          value={member.role}
          onValueChange={(v) => onChangeRole(member.id, v as TaskMemberRole)}
        >
          <SelectTrigger className="h-6 w-auto border-0 bg-transparent p-0 text-xs gap-1 shadow-none focus:ring-0">
            <div className="flex items-center gap-1">
              <Icon className={`w-3 h-3 ${config.color}`} />
              <span className={config.color}>{config.label}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(ROLE_CONFIG) as [TaskMemberRole, typeof config][]).map(([role, cfg]) => (
              <SelectItem key={role} value={role}>
                <div className="flex items-center gap-2">
                  <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  <span>{cfg.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
        onClick={() => onRemove(member.id)}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

export function TaskTeamTab({ taskId, companyId, fallbackResponsible }: TaskTeamTabProps) {
  const { members, responsible, contributors, observers, isLoading, addMember, isAdding, updateRole, removeMember } = useTaskMembers(taskId, companyId);
  const { employees } = useEmployees();
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<TaskMemberRole>('contributor');

  const assignedEmployeeIds = new Set(members.map(m => m.employee_id));

  const filteredEmployees = employees
    ?.slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter(e =>
      !assignedEmployeeIds.has(e.id) &&
      e.name.toLowerCase().includes(search.toLowerCase())
    ) || [];

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
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">Equipe</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Gerencie os participantes desta tarefa e seus papéis.
        </p>
      </div>

      {/* Responsible - always show immediately using fallback */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Crown className="w-4 h-4 text-amber-500" />
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Responsável
          </Label>
        </div>
        {responsible ? (
          <MemberCard
            member={responsible}
            onRemove={removeMember}
            onChangeRole={(id, role) => updateRole({ id, role })}
          />
        ) : fallbackResponsible?.name ? (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
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
                <span className="text-muted-foreground ml-1">(definido na aba Principal)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg border border-dashed border-border text-sm text-muted-foreground text-center">
            Nenhum responsável definido
          </div>
        )}
      </div>

      <Separator />

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando equipe...
        </div>
      ) : (
        <>

          {/* Contributors */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-500" />
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Contribuintes ({contributors.length})
              </Label>
            </div>
            {contributors.length > 0 ? (
              <div className="space-y-2">
                {contributors.map(m => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    onRemove={removeMember}
                    onChangeRole={(id, role) => updateRole({ id, role })}
                  />
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-dashed border-border text-sm text-muted-foreground text-center">
                Nenhum contribuinte adicionado
              </div>
            )}
          </div>

          <Separator />

          {/* Observers */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Observadores ({observers.length})
              </Label>
            </div>
            {observers.length > 0 ? (
              <div className="space-y-2">
                {observers.map(m => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    onRemove={removeMember}
                    onChangeRole={(id, role) => updateRole({ id, role })}
                  />
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-dashed border-border text-sm text-muted-foreground text-center">
                Nenhum observador adicionado
              </div>
            )}
          </div>

          <Separator />

          {/* Add member */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Adicionar Participante
            </Label>
            <div className="flex gap-2 mt-1.5">
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as TaskMemberRole)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ROLE_CONFIG) as [TaskMemberRole, typeof ROLE_CONFIG.responsible][]).map(([role, cfg]) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                        <span>{cfg.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-between font-normal" disabled={isAdding}>
                    {isAdding ? (
                      <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Adicionando...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Search className="w-4 h-4" /> Selecionar membro</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Buscar colaborador..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="max-h-[250px] overflow-y-auto">
                    {filteredEmployees.map(emp => (
                      <div
                        key={emp.id}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-muted flex items-center gap-2"
                        onClick={() => {
                          addMember({ employeeId: emp.id, role: selectedRole });
                          setSearch('');
                        }}
                      >
                        <Avatar className="h-6 w-6">
                          {(emp.avatar || emp.profile_avatar_url) && (
                            <AvatarImage src={emp.avatar || emp.profile_avatar_url || ''} />
                          )}
                          <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                            {emp.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{emp.name}</span>
                      </div>
                    ))}
                    {filteredEmployees.length === 0 && (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        {search ? 'Nenhum colaborador encontrado' : 'Todos já foram adicionados'}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Role descriptions */}
            <div className="mt-3 space-y-1.5">
              {(Object.entries(ROLE_CONFIG) as [TaskMemberRole, typeof ROLE_CONFIG.responsible][]).map(([role, cfg]) => (
                <div key={role} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <cfg.icon className={`w-3 h-3 mt-0.5 shrink-0 ${cfg.color}`} />
                  <span><strong className={cfg.color}>{cfg.label}:</strong> {cfg.description}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
