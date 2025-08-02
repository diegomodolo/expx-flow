import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Users, User, Calendar, UserPlus } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";

interface OrganizationScope {
  type: 'all' | 'specific';
  employeeId?: string;
  includePeriod: number; // dias
  includeUnassigned: boolean;
}

interface OrganizationScopeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (scope: OrganizationScope) => void;
  onCancel: () => void;
}

export const OrganizationScopeModal: React.FC<OrganizationScopeModalProps> = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}) => {
  const [scope, setScope] = useState<OrganizationScope>({
    type: 'all',
    includePeriod: 7,
    includeUnassigned: true,
  });
  
  const { employees } = useEmployees();

  const handleConfirm = () => {
    onConfirm(scope);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Configurar Organização IA
          </DialogTitle>
          <DialogDescription>
            Configure o escopo e as opções para a organização inteligente de tarefas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tipo de Organização */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Escopo da Organização</Label>
            
            <div className="grid grid-cols-1 gap-2">
              <Card 
                className={`cursor-pointer transition-colors ${
                  scope.type === 'all' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent'
                }`}
                onClick={() => setScope({ ...scope, type: 'all' })}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Todos os Colaboradores</p>
                      <p className="text-sm text-muted-foreground">
                        Organizar tarefas de toda a equipe
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-colors ${
                  scope.type === 'specific' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent'
                }`}
                onClick={() => setScope({ ...scope, type: 'specific' })}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Colaborador Específico</p>
                      <p className="text-sm text-muted-foreground">
                        Organizar tarefas de um colaborador
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Seleção de Colaborador */}
          {scope.type === 'specific' && (
            <div className="space-y-2">
              <Label htmlFor="employee-select">Selecionar Colaborador</Label>
              <Select
                value={scope.employeeId || ""}
                onValueChange={(value) => setScope({ ...scope, employeeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.user_id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {employee.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Período */}
          <div className="space-y-2">
            <Label htmlFor="period-select" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Período de Organização
            </Label>
            <Select
              value={scope.includePeriod.toString()}
              onValueChange={(value) => setScope({ ...scope, includePeriod: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Hoje (1 dia)</SelectItem>
                <SelectItem value="3">3 dias</SelectItem>
                <SelectItem value="7">1 semana (7 dias)</SelectItem>
                <SelectItem value="14">2 semanas (14 dias)</SelectItem>
                <SelectItem value="30">1 mês (30 dias)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Incluir Tarefas Sem Responsável */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="include-unassigned">
                Incluir tarefas sem responsável
              </Label>
            </div>
            <Switch
              id="include-unassigned"
              checked={scope.includeUnassigned}
              onCheckedChange={(checked) => setScope({ ...scope, includeUnassigned: checked })}
            />
          </div>
          
          {scope.includeUnassigned && (
            <p className="text-xs text-muted-foreground pl-6">
              A IA irá atribuir automaticamente tarefas sem responsável para colaboradores com tempo disponível.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={scope.type === 'specific' && !scope.employeeId}
          >
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};