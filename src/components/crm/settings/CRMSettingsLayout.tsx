import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Settings, Tag, Target, GitBranch, LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface SettingsNavItem {
  title: string;
  icon: LucideIcon;
  path: string;
  description: string;
}

const settingsNavItems: SettingsNavItem[] = [
  {
    title: "Geral",
    icon: Settings,
    path: "geral",
    description: "Configurações do workspace",
  },
  {
    title: "Tags",
    icon: Tag,
    path: "tags",
    description: "Gerenciar tags dos leads",
  },
  {
    title: "Metas",
    icon: Target,
    path: "metas",
    description: "Configurar metas mensais",
  },
  {
    title: "Funil de Vendas",
    icon: GitBranch,
    path: "funil",
    description: "Gerenciar quadros e estágios",
  },
];

interface CRMSettingsLayoutProps {
  children: React.ReactNode;
  workspaceToken: string;
}

export function CRMSettingsLayout({ children, workspaceToken }: CRMSettingsLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname.split("/").pop() || "geral";

  return (
    <div className="flex gap-6 h-full">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0">
        <Card className="p-4">
          <nav className="space-y-1">
            {settingsNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(`/crm/${workspaceToken}/settings/${item.path}`)}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-medium text-sm">{item.title}</div>
                    <div
                      className={cn(
                        "text-xs mt-0.5",
                        isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </Card>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
