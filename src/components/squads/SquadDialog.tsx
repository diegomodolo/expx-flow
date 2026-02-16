import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Team } from "@/hooks/useTeams";
import { useEmployees } from "@/hooks/useEmployees";
import { 
  Megaphone, 
  Palette, 
  Code, 
  BarChart3, 
  Users, 
  Target,
  Briefcase,
  Lightbulb,
  Crown,
  MessageSquare,
  ShieldCheck
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
  const { employees } = useEmployees();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "bg-blue-100 text-blue-800",
    icon: "Megaphone",
    icon_color: "text-blue-600",
    icon_bg: "bg-blue-100",
    leader_id: "" as string | null,
    whatsapp_responsible_id: "" as string | null,
    authorizer_id: "" as string | null,
  });
  const [loading, setLoading] = useState(false);

  // Fetch fresh squad data from DB when editing
  const { data: freshSquadData } = useQuery({
    queryKey: ["squad-edit-details", squad?.id, open],
    queryFn: async () => {
      if (!squad?.id) return null;
      const { data, error } = await supabase
        .from("teams")
        .select("name, description, color, icon, icon_color, icon_bg, leader_id, whatsapp_responsible_id, authorizer_id")
        .eq("id", squad.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!squad?.id && open,
    staleTime: 0,
  });

  // Get members of this squad for role selectors
  const squadMembers = employees || [];

  useEffect(() => {
    if (squad && open) {
      setFormData({
        name: freshSquadData?.name || squad.name || "",
        description: freshSquadData?.description || squad.description || "",
        color: freshSquadData?.color || squad.color || "bg-blue-100 text-blue-800",
        icon: freshSquadData?.icon || squad.icon || "Megaphone",
        icon_color: freshSquadData?.icon_color || squad.icon_color || "text-blue-600",
        icon_bg: freshSquadData?.icon_bg || squad.icon_bg || "bg-blue-100",
        leader_id: freshSquadData?.leader_id || squad.leader_id || "",
        whatsapp_responsible_id: freshSquadData?.whatsapp_responsible_id || squad.whatsapp_responsible_id || "",
        authorizer_id: freshSquadData?.authorizer_id || squad.authorizer_id || "",
      });
    } else if (!squad) {
      setFormData({
        name: "",
        description: "",
        color: "bg-blue-100 text-blue-800",
        icon: "Megaphone",
        icon_color: "text-blue-600",
        icon_bg: "bg-blue-100",
        leader_id: "",
        whatsapp_responsible_id: "",
        authorizer_id: "",
      });
    }
  }, [squad, open, freshSquadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onSubmit({
        ...formData,
        leader_id: formData.leader_id || null,
        whatsapp_responsible_id: formData.whatsapp_responsible_id || null,
        authorizer_id: formData.authorizer_id || null,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting squad:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderMemberSelect = (
    label: string,
    icon: React.ReactNode,
    value: string | null,
    onChange: (v: string) => void,
  ) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-sm">
        {icon}
        {label}
      </Label>
      <Select
        value={value || "none"}
        onValueChange={(v) => onChange(v === "none" ? "" : v)}
        disabled={readOnly}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Não definido</SelectItem>
          {squadMembers.map((emp) => (
            <SelectItem key={emp.id} value={emp.id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={emp.avatar || emp.profile_avatar_url || undefined} />
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                    {emp.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {emp.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Row 1: Basic Info - 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Squad *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Marketing Digital"
                  required
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Cor do Squad</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) => {
                    const selectedColor = colorOptions.find(c => c.value === value);
                    if (selectedColor) {
                      setFormData({
                        ...formData,
                        color: value,
                        icon_color: selectedColor.iconColor,
                        icon_bg: selectedColor.iconBg
                      });
                    }
                  }}
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma cor" />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${color.bg} border border-border`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Icon - Full width */}
            <div className="space-y-2">
              <Label>Ícone do Squad</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {iconOptions.map((option) => {
                  const IconComponent = option.icon;
                  const isSelected = formData.icon === option.value;
                  const selectedColor = colorOptions.find(c => c.value === formData.color);
                  
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`p-3 rounded-lg border transition-all ${
                        isSelected 
                          ? `border-primary bg-primary/10` 
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setFormData({ ...formData, icon: option.value })}
                      disabled={readOnly}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={`p-2 rounded-lg ${selectedColor?.iconBg || 'bg-gray-100'}`}>
                          <IconComponent className={`w-4 h-4 ${selectedColor?.iconColor || 'text-gray-600'}`} />
                        </div>
                        <span className="text-xs font-medium">{option.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 3: Description - Full width */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva as responsabilidades e objetivos do squad..."
                rows={3}
                required
                disabled={readOnly}
              />
            </div>

            {/* Row 4: Roles - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderMemberSelect(
                "Líder",
                <Crown className="h-3.5 w-3.5 text-yellow-500" />,
                formData.leader_id,
                (v) => setFormData({ ...formData, leader_id: v }),
              )}
              {renderMemberSelect(
                "Resp. WhatsApp",
                <MessageSquare className="h-3.5 w-3.5 text-green-500" />,
                formData.whatsapp_responsible_id,
                (v) => setFormData({ ...formData, whatsapp_responsible_id: v }),
              )}
              {renderMemberSelect(
                "Autorizador",
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />,
                formData.authorizer_id,
                (v) => setFormData({ ...formData, authorizer_id: v }),
              )}
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview do Squad</Label>
              <div className="p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${formData.icon_bg}`}>
                    {(() => {
                      const IconComponent = iconOptions.find(opt => opt.value === formData.icon)?.icon || iconOptions[0].icon;
                      return <IconComponent className={`w-5 h-5 ${formData.icon_color}`} />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{formData.name || "Nome do Squad"}</h3>
                    <p className="text-sm text-muted-foreground">{formData.description || "Descrição do squad..."}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${formData.color}`}>
                    Squad
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {readOnly ? "Fechar" : "Cancelar"}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : squad ? "Atualizar" : "Criar Squad"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
