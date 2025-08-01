import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Employee } from "@/hooks/useEmployees";
import { useTeams } from "@/hooks/useTeams";

interface EmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (employeeData: Omit<Employee, "id" | "created_at" | "updated_at" | "team">) => Promise<any>;
  employee?: Employee;
  title: string;
  readOnly?: boolean;
}

export function EmployeeDialog({ open, onOpenChange, onSubmit, employee, title, readOnly = false }: EmployeeDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    team_id: "",
    status: "active" as Employee['status'],
    start_date: "",
    skills: "",
    avatar: ""
  });
  const [loading, setLoading] = useState(false);
  const { teams } = useTeams();

  // Update form data when employee prop changes
  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || "",
        email: employee.email || "",
        phone: employee.phone || "",
        role: employee.role || "",
        team_id: employee.team_id || "",
        status: employee.status || "active",
        start_date: employee.start_date || "",
        skills: employee.skills || "",
        avatar: employee.avatar || ""
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        role: "",
        team_id: "",
        status: "active",
        start_date: "",
        skills: "",
        avatar: ""
      });
    }
  }, [employee, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar colaborador:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={readOnly}
                placeholder="Ex: João Silva Santos"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={readOnly}
                placeholder="joao.silva@empresa.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="team">Squad</Label>
              <Select 
                value={formData.team_id} 
                onValueChange={(value) => setFormData({ ...formData, team_id: value })}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o squad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem-squad">Sem Squad</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="role">Cargo</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
                disabled={readOnly}
                placeholder="Ex: Desenvolvedor Frontend"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="start_date">Data de Admissão</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
                disabled={readOnly}
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: Employee['status']) => setFormData({ ...formData, status: value })}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="vacation">Férias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={readOnly}
              placeholder="(11) 99999-9999"
            />
          </div>

          <div>
            <Label htmlFor="skills">Habilidades</Label>
            <Textarea
              id="skills"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              disabled={readOnly}
              placeholder="Liste as principais habilidades do colaborador"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {readOnly ? "Fechar" : "Cancelar"}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : employee ? "Atualizar" : "Criar"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}