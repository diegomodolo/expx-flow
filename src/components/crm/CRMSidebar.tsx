import { LayoutDashboard, Users, Contact, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  title: string;
  icon: typeof LayoutDashboard;
  view: string;
}

const menuItems: MenuItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, view: "dashboard" },
  { title: "Quadros", icon: Users, view: "leads" },
  { title: "Leads", icon: Contact, view: "contacts" },
  { title: "Relatórios", icon: FileText, view: "reports" },
  { title: "Configurações", icon: Settings, view: "settings" },
];

interface CRMSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function CRMSidebar({ activeView, onViewChange }: CRMSidebarProps) {
  return (
    <aside className="w-64 bg-card border-r border-border flex-shrink-0">
      <div className="h-full flex flex-col">
        {/* Logo/Branding */}
        <div className="h-20 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">C</span>
            </div>
            <span className="text-xl font-bold text-foreground">CRM</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.view;

              return (
                <li key={item.view}>
                  <button
                    onClick={() => onViewChange(item.view)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
