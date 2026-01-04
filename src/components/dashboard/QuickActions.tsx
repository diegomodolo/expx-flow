import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Image, 
  LayoutGrid, 
  ListTodo, 
  Bell, 
  RefreshCw, 
  FileText,
  Zap,
  Users
} from "lucide-react";

interface QuickAction {
  label: string;
  icon: React.ElementType;
  path: string;
  color: string;
  bgColor: string;
}

const quickActions: QuickAction[] = [
  {
    label: "Gerar Criativo",
    icon: Image,
    path: "/geradores",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50",
  },
  {
    label: "Gerar Carrossel",
    icon: LayoutGrid,
    path: "/geradores?tab=carousel",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50",
  },
  {
    label: "Nova Tarefa",
    icon: ListTodo,
    path: "/tarefas",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50",
  },
  {
    label: "Ver Alertas",
    icon: Bell,
    path: "/alertas",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50",
  },
  {
    label: "Clientes",
    icon: Users,
    path: "/clientes",
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-100 dark:bg-pink-900/30 hover:bg-pink-200 dark:hover:bg-pink-900/50",
  },
  {
    label: "Relatórios",
    icon: FileText,
    path: "/relatorios",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30 hover:bg-cyan-200 dark:hover:bg-cyan-900/50",
  },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Ações Rápidas</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.path}
                variant="ghost"
                className={`h-auto py-4 flex flex-col items-center gap-2 ${action.bgColor} border-0`}
                onClick={() => navigate(action.path)}
              >
                <Icon className={`w-6 h-6 ${action.color}`} />
                <span className="text-xs font-medium text-foreground">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
