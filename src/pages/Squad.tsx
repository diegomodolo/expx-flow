import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, 
  Eye, 
  Edit,
  Megaphone,
  Palette,
  Code,
  BarChart3
} from "lucide-react";

interface TeamMember {
  name: string;
  avatar: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  iconBg: string;
  members: TeamMember[];
  additionalMembers?: number;
  progress: number;
  activeTasks: number;
  color: string;
}

const teams: Team[] = [
  {
    id: "1",
    name: "Marketing Digital",
    description: "Campanhas e conteúdo",
    icon: Megaphone,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100",
    members: [
      { name: "Fernanda Lima", avatar: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=32&h=32&fit=crop&crop=face" },
      { name: "Ricardo Alves", avatar: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=32&h=32&fit=crop&crop=face" },
      { name: "Carla Santos", avatar: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=32&h=32&fit=crop&crop=face" }
    ],
    additionalMembers: 2,
    progress: 73,
    activeTasks: 12,
    color: "bg-blue-100 text-blue-800"
  },
  {
    id: "2",
    name: "Design & Criativo",
    description: "Peças visuais e branding",
    icon: Palette,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100",
    members: [
      { name: "Ana Costa", avatar: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=32&h=32&fit=crop&crop=face" },
      { name: "Diego Martins", avatar: "https://images.unsplash.com/photo-1485833077593-4278bba3f11f?w=32&h=32&fit=crop&crop=face" }
    ],
    progress: 85,
    activeTasks: 8,
    color: "bg-purple-100 text-purple-800"
  },
  {
    id: "3",
    name: "Desenvolvimento",
    description: "Landing pages e sistemas",
    icon: Code,
    iconColor: "text-green-600",
    iconBg: "bg-green-100",
    members: [
      { name: "Carlos Mendes", avatar: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=32&h=32&fit=crop&crop=face" },
      { name: "Julia Rodrigues", avatar: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=32&h=32&fit=crop&crop=face" },
      { name: "Pedro Silva", avatar: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=32&h=32&fit=crop&crop=face" }
    ],
    progress: 62,
    activeTasks: 15,
    color: "bg-green-100 text-green-800"
  },
  {
    id: "4",
    name: "Analytics & Data",
    description: "Métricas e relatórios",
    icon: BarChart3,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-100",
    members: [
      { name: "Beatriz Santos", avatar: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=32&h=32&fit=crop&crop=face" },
      { name: "Lucas Oliveira", avatar: "https://images.unsplash.com/photo-1485833077593-4278bba3f11f?w=32&h=32&fit=crop&crop=face" }
    ],
    progress: 91,
    activeTasks: 6,
    color: "bg-orange-100 text-orange-800"
  }
];

const Squad = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">Gerenciar Squad</h2>
            <Badge variant="secondary" className="px-3 py-1">
              {teams.length} equipes
            </Badge>
          </div>
          <Button className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Nova Equipe</span>
          </Button>
        </div>

        {/* Teams Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Equipes Ativas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {teams.map((team) => {
              const IconComponent = team.icon;
              return (
                <Card key={team.id} className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{team.name}</h4>
                        <p className="text-sm text-gray-500">{team.description}</p>
                      </div>
                      <div className={`w-12 h-12 ${team.iconBg} rounded-full flex items-center justify-center`}>
                        <IconComponent className={`w-6 h-6 ${team.iconColor}`} />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="flex -space-x-2">
                        {team.members.slice(0, 3).map((member, index) => (
                          <Avatar key={index} className="w-8 h-8 border-2 border-white">
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      {team.additionalMembers && (
                        <span className="text-sm text-gray-600">+{team.additionalMembers} membros</span>
                      )}
                      {!team.additionalMembers && (
                        <span className="text-sm text-gray-600">{team.members.length} membros</span>
                      )}
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Progresso</span>
                        <span className="text-sm font-medium text-gray-900">{team.progress}%</span>
                      </div>
                      <Progress value={team.progress} className="h-2" />
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-600">{team.activeTasks} tarefas ativas</span>
                      <Badge className={team.color}>
                        {team.progress >= 80 ? "Excelente" : team.progress >= 60 ? "Bom" : "Precisa atenção"}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between space-x-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Team Members Section */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Todos os Membros</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.flatMap(team => 
                team.members.map((member, index) => (
                  <div key={`${team.id}-${index}`} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{team.name}</p>
                    </div>
                    <Badge className={team.color} variant="secondary">
                      {team.name.split(' ')[0]}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Squad;