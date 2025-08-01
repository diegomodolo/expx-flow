import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Check,
  CheckCheck,
  Play,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  CalendarDays
} from "lucide-react";

type StatusType = "all" | "progress" | "todo" | "done" | "review";
type PriorityType = "high" | "medium" | "low";

interface Task {
  id: string;
  title: string;
  description: string;
  team: string;
  teamColor: string;
  responsible: {
    name: string;
    avatar: string;
  };
  status: "progress" | "todo" | "review" | "done";
  priority: PriorityType;
  deadline: string;
  progress: number;
}

const mockTasks: Task[] = [
  {
    id: "1",
    title: "Criação de landing page Black Friday",
    description: "Desenvolver página de conversão para campanha",
    team: "Desenvolvimento",
    teamColor: "bg-green-100 text-green-800",
    responsible: {
      name: "Carlos Mendes",
      avatar: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=32&h=32&fit=crop&crop=face"
    },
    status: "progress",
    priority: "high",
    deadline: "25/11/2024",
    progress: 65
  },
  {
    id: "2",
    title: "Design de banners para redes sociais",
    description: "Criar peças visuais para Instagram e Facebook",
    team: "Design & Criativo",
    teamColor: "bg-purple-100 text-purple-800",
    responsible: {
      name: "Ana Costa",
      avatar: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=32&h=32&fit=crop&crop=face"
    },
    status: "todo",
    priority: "medium",
    deadline: "28/11/2024",
    progress: 0
  },
  {
    id: "3",
    title: "Análise de performance Q3",
    description: "Relatório completo de métricas do trimestre",
    team: "Analytics & Data",
    teamColor: "bg-orange-100 text-orange-800",
    responsible: {
      name: "Beatriz Santos",
      avatar: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=32&h=32&fit=crop&crop=face"
    },
    status: "review",
    priority: "high",
    deadline: "22/11/2024",
    progress: 90
  },
  {
    id: "4",
    title: "Configuração Google Analytics 4",
    description: "Setup completo de tracking para nova campanha",
    team: "Marketing Digital",
    teamColor: "bg-blue-100 text-blue-800",
    responsible: {
      name: "Fernanda Lima",
      avatar: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=32&h=32&fit=crop&crop=face"
    },
    status: "done",
    priority: "low",
    deadline: "20/11/2024",
    progress: 100
  },
  {
    id: "5",
    title: "Copywriting para email marketing",
    description: "Sequência de 5 emails para nutrição de leads",
    team: "Marketing Digital",
    teamColor: "bg-blue-100 text-blue-800",
    responsible: {
      name: "Ricardo Alves",
      avatar: "https://images.unsplash.com/photo-1485833077593-4278bba3f11f?w=32&h=32&fit=crop&crop=face"
    },
    status: "progress",
    priority: "medium",
    deadline: "30/11/2024",
    progress: 40
  },
  {
    id: "6",
    title: "Otimização de performance mobile",
    description: "Melhorar velocidade de carregamento em dispositivos móveis",
    team: "Desenvolvimento",
    teamColor: "bg-green-100 text-green-800",
    responsible: {
      name: "Julia Rodrigues",
      avatar: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=32&h=32&fit=crop&crop=face"
    },
    status: "todo",
    priority: "low",
    deadline: "05/12/2024",
    progress: 0
  }
];

const statusConfig = {
  progress: { label: "Em Andamento", color: "bg-blue-100 text-blue-800" },
  todo: { label: "Pendente", color: "bg-gray-100 text-gray-800" },
  review: { label: "Em Revisão", color: "bg-yellow-100 text-yellow-800" },
  done: { label: "Concluída", color: "bg-green-100 text-green-800" }
};

const priorityConfig = {
  high: { label: "Alta", color: "bg-red-100 text-red-800" },
  medium: { label: "Média", color: "bg-yellow-100 text-yellow-800" },
  low: { label: "Baixa", color: "bg-green-100 text-green-800" }
};

const Tarefas = () => {
  const [statusFilter, setStatusFilter] = useState<StatusType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [tasks, setTasks] = useState(mockTasks);
  
  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.responsible.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalTasks = filteredTasks.length;
  const itemsPerPage = 8;
  const totalPages = Math.ceil(totalTasks / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + itemsPerPage);

  const handleTaskStatusChange = (taskId: string, newStatus: "progress" | "done") => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { 
            ...task, 
            status: newStatus,
            progress: newStatus === "done" ? 100 : task.progress
          }
        : task
    ));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">Gerenciar Tarefas</h2>
            <Badge variant="secondary" className="px-3 py-1">
              {totalTasks} tarefas
            </Badge>
          </div>
          <Button className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Nova Tarefa</span>
          </Button>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={statusFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("all")}
                      className="flex items-center space-x-2"
                    >
                      <span>Todas</span>
                    </Button>
                    <Button
                      variant={statusFilter === "progress" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("progress")}
                      className="flex items-center space-x-2"
                    >
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Em Andamento</span>
                    </Button>
                    <Button
                      variant={statusFilter === "todo" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("todo")}
                      className="flex items-center space-x-2"
                    >
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      <span>Pendentes</span>
                    </Button>
                    <Button
                      variant={statusFilter === "done" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("done")}
                      className="flex items-center space-x-2"
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Concluídas</span>
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar tarefas..."
                    className="w-64 pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Filter className="w-4 h-4" />
                  <span>Filtros</span>
                </Button>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Exportar</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Table */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Todas as Tarefas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarefa
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipe
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Responsável
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prioridade
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prazo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progresso
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{task.title}</div>
                        <div className="text-sm text-gray-500">{task.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={task.teamColor}>
                        {task.team}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={task.responsible.avatar} alt={task.responsible.name} />
                          <AvatarFallback>{task.responsible.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{task.responsible.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={statusConfig[task.status].color}>
                        {statusConfig[task.status].label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={priorityConfig[task.priority].color}>
                        {priorityConfig[task.priority].label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <CalendarDays className="w-4 h-4 text-gray-400" />
                        <span>{task.deadline}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Progress value={task.progress} className="w-20 h-2" />
                        <span className="text-sm font-medium text-gray-900">{task.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {task.status !== "done" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0"
                            title="Marcar como concluída"
                            onClick={() => handleTaskStatusChange(task.id, "done")}
                          >
                            <CheckCheck className="w-4 h-4" />
                          </Button>
                        )}
                        {task.status === "todo" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0"
                            title="Iniciar tarefa"
                            onClick={() => handleTaskStatusChange(task.id, "progress")}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0"
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0"
                              title="Mais opções"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              Arquivar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="bg-white px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{startIndex + 1}</span> a{" "}
                <span className="font-medium">{Math.min(startIndex + itemsPerPage, totalTasks)}</span> de{" "}
                <span className="font-medium">{totalTasks}</span> tarefas
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center space-x-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </Button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
                
                {totalPages > 5 && (
                  <>
                    <span className="px-3 py-2 text-sm text-gray-500">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-8 h-8 p-0"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center space-x-1"
                >
                  <span>Próximo</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Tarefas;