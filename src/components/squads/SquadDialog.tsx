import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Team } from "@/hooks/useTeams";
import { 
  Megaphone, 
  Palette, 
  Code, 
  BarChart3, 
  Users, 
  Target,
  Briefcase,
  Lightbulb
} from "lucide-react";

interface SquadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (squadData: Omit<Team, "id" | "progress" | "active_tasks" | "members">) => Promise<any>;
  squad?: Team;
  title: string;
  readOnly?: boolean;
}

const iconOptions = [
  { value: "Megaphone", label: "Marketing", icon: Megaphone },
  { value: "Palette", label: "Design", icon: Palette },
  { value: "Code", label: "Desenvolvimento", icon: Code },
  { value: "BarChart3", label: "Analytics", icon: BarChart3 },
  { value: "Users", label: "Recursos Humanos", icon: Users },
  { value: "Target", label: "Vendas", icon: Target },
  { value: "Briefcase", label: "Administrativo", icon: Briefcase },
  { value: "Lightbulb", label: "Inovação", icon: Lightbulb },
];

const colorOptions = [
  { value: "bg-blue-100 text-blue-800", label: "Azul", bg: "bg-blue-100", iconColor: "text-blue-600", iconBg: "bg-blue-100" },
  { value: "bg-purple-100 text-purple-800", label: "Roxo", bg: "bg-purple-100", iconColor: "text-purple-600", iconBg: "bg-purple-100" },
  { value: "bg-green-100 text-green-800", label: "Verde", bg: "bg-green-100", iconColor: "text-green-600", iconBg: "bg-green-100" },
  { value: "bg-orange-100 text-orange-800", label: "Laranja", bg: "bg-orange-100", iconColor: "text-orange-600", iconBg: "bg-orange-100" },
  { value: "bg-red-100 text-red-800", label: "Vermelho", bg: "bg-red-100", iconColor: "text-red-600", iconBg: "bg-red-100" },
  { value: "bg-yellow-100 text-yellow-800", label: "Amarelo", bg: "bg-yellow-100", iconColor: "text-yellow-600", iconBg: "bg-yellow-100" },
  { value: "bg-indigo-100 text-indigo-800", label: "Índigo", bg: "bg-indigo-100", iconColor: "text-indigo-600", iconBg: "bg-indigo-100" },
  { value: "bg-pink-100 text-pink-800", label: "Rosa", bg: "bg-pink-100", iconColor: "text-pink-600", iconBg: "bg-pink-100" },
];

export function SquadDialog({ open, onOpenChange, onSubmit, squad, title, readOnly = false }: SquadDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "Users",
    icon_color: "text-blue-600",
    icon_bg: "bg-blue-100",
    color: "bg-blue-100 text-blue-800"
  });
  const [loading, setLoading] = useState(false);

  // Update form data when squad prop changes
  useEffect(() => {
    if (squad) {
      setFormData({
        name: squad.name || "",
        description: squad.description || "",
        icon: squad.icon || "Users",
        icon_color: squad.icon_color || "text-blue-600",
        icon_bg: squad.icon_bg || "bg-blue-100",
        color: squad.color || "bg-blue-100 text-blue-800"
      });
    } else {
      setFormData({
        name: "",
        description: "",
        icon: "Users",
        icon_color: "text-blue-600",
        icon_bg: "bg-blue-100",
        color: "bg-blue-100 text-blue-800"
      });
    }
  }, [squad, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar squad:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (colorValue: string) => {
    const selectedColor = colorOptions.find(option => option.value === colorValue);
    if (selectedColor) {
      setFormData({
        ...formData,
        color: colorValue,
        icon_color: selectedColor.iconColor,
        icon_bg: selectedColor.iconBg
      });
    }
  };

  const getSelectedIcon = () => {
    const selectedIcon = iconOptions.find(option => option.value === formData.icon);
    return selectedIcon ? selectedIcon.icon : Users;
  };

  const SelectedIconComponent = getSelectedIcon();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preview da Squad */}
          <div className="flex items-center justify-center p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 ${formData.icon_bg} rounded-full flex items-center justify-center`}>
                <SelectedIconComponent className={`w-6 h-6 ${formData.icon_color}`} />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {formData.name || "Nome da Squad"}
                </h4>
                <p className="text-sm text-gray-500">
                  {formData.description || "Descrição da squad"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nome
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="col-span-3"
              required
              disabled={readOnly}
              placeholder="Ex: Marketing Digital"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Descrição
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="col-span-3"
              required
              disabled={readOnly}
              placeholder="Ex: Responsável por campanhas e conteúdo"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="icon" className="text-right">
              Ícone
            </Label>
            <Select 
              value={formData.icon} 
              onValueChange={(value) => setFormData({ ...formData, icon: value })}
              disabled={readOnly}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione um ícone" />
              </SelectTrigger>
              <SelectContent>
                {iconOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center space-x-2">
                        <IconComponent className="w-4 h-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="color" className="text-right">
              Cor
            </Label>
            <Select 
              value={formData.color} 
              onValueChange={handleColorChange}
              disabled={readOnly}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione uma cor" />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-4 h-4 ${option.bg} rounded border`}></div>
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {readOnly ? "Fechar" : "Cancelar"}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : squad ? "Atualizar" : "Criar"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}