import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, User } from "lucide-react";

interface Employee {
  id: string;
  user_id: string;
  name: string;
  avatar?: string;
  role: string;
}

interface BoardSelectorProps {
  selectedUserId: string | null | "all";
  onSelectUser: (userId: string | null | "all") => void;
  employees: Employee[];
  currentUserId?: string;
  canViewOthersBoards: boolean;
  isManager: boolean;
}

export function BoardSelector({
  selectedUserId,
  onSelectUser,
  employees,
  currentUserId,
  canViewOthersBoards,
  isManager,
}: BoardSelectorProps) {
  const currentEmployee = employees.find(e => e.user_id === currentUserId);

  // Se não pode ver quadros de outros, mostrar apenas info do próprio quadro
  if (!canViewOthersBoards && !isManager) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-border">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Meu Quadro</span>
        {currentEmployee && (
          <Avatar className="h-5 w-5 ml-1">
            <AvatarImage src={currentEmployee.avatar} alt={currentEmployee.name} />
            <AvatarFallback className="text-[10px]">
              {currentEmployee.name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  }

  return (
    <Select
      value={selectedUserId === "all" ? "all-boards" : selectedUserId || "my-board"}
      onValueChange={(value) => {
        if (value === "my-board") {
          onSelectUser(null);
        } else if (value === "all-boards") {
          onSelectUser("all");
        } else {
          onSelectUser(value);
        }
      }}
    >
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Selecionar quadro">
          {selectedUserId === "all" ? (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>Todos os Quadros</span>
            </div>
          ) : selectedUserId ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage 
                  src={employees.find(e => e.user_id === selectedUserId)?.avatar} 
                  alt="Avatar" 
                />
                <AvatarFallback className="text-[10px]">
                  {employees.find(e => e.user_id === selectedUserId)?.name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {employees.find(e => e.user_id === selectedUserId)?.name || 'Colaborador'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Meu Quadro</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="my-board">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span>Meu Quadro</span>
          </div>
        </SelectItem>
        
        {isManager && (
          <SelectItem value="all-boards">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>Todos os Quadros</span>
            </div>
          </SelectItem>
        )}

        <div className="h-px bg-border my-1" />
        
        {employees
          .filter(e => e.user_id !== currentUserId)
          .map((employee) => (
            <SelectItem key={employee.user_id} value={employee.user_id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={employee.avatar} alt={employee.name} />
                  <AvatarFallback className="text-[10px]">
                    {employee.name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{employee.name}</span>
                <span className="text-xs text-muted-foreground">({employee.role})</span>
              </div>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
