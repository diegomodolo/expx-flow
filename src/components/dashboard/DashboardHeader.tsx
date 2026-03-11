import { Sun, Moon, LogOut, User, ChevronDown, FileText } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { CompanySelector } from "@/components/company/CompanySelector";
import { UniversalCommandBar } from "./UniversalCommandBar";
import { Link, useNavigate } from "react-router-dom";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { WhatsAppInboxDrawer } from "@/components/whatsapp/WhatsAppInboxDrawer";
import { useUserWhatsAppInstances } from "@/hooks/useUserWhatsAppInstances";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { TaskApprovalIndicator } from "@/components/tasks/TaskApprovalIndicator";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function DashboardHeader() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { toast } = useToast();
  const userProfile = useUserProfile();

  const user = auth.user;
  const signOut = auth.signOut;
  const profile = userProfile.profile;

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const { hasInstances: hasWhatsAppInstances } = useUserWhatsAppInstances();
  const queryClient = useQueryClient();
  const [approvalTaskOpen, setApprovalTaskOpen] = useState(false);
  const [approvalTask, setApprovalTask] = useState<unknown>(null);

  const handleOpenApprovalTask = async (taskId: string) => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();
    if (data) {
      setApprovalTask(data);
      setApprovalTaskOpen(true);
    }
  };

  const handleSaveApprovalTask = async (taskData: unknown) => {
    setApprovalTaskOpen(false);
    setApprovalTask(null);
    queryClient.invalidateQueries({ queryKey: ["tasks-awaiting-approval"] });
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: error.message,
      });
    } else {
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso",
      });
    }
  };

  const getUserInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = profile?.full_name || user?.email || "Usuário";

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    toast({
      title: `Tema ${newTheme === "dark" ? "escuro" : "claro"} ativado`,
      description: "O tema foi alterado com sucesso",
    });
  };

  return (
    <header className="h-16 bg-card shadow-google-sm z-20 shrink-0">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left side - Universal Search */}
        <div className="flex items-center">
          <UniversalCommandBar />
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Task Approval Indicator */}
          <TaskApprovalIndicator onOpenTask={handleOpenApprovalTask} />

          {/* Unified Notification Center */}
          <NotificationCenter />

          {/* Workspace Quick Access */}
          <Button aria-label="Fechar"
            variant="ghost"
            size="icon"
            onClick={() => navigate("/workspace")}
            className="w-10 h-10 rounded-full hover:bg-muted/60"
            title="Workspace"
          >
            <FileText className="h-5 w-5 text-muted-foreground" />
          </Button>

          {/* WhatsApp Chat - Only show if user has instances assigned */}
          {hasWhatsAppInstances && (
            <Button aria-label="Fechar"
              variant="ghost"
              size="icon"
              onClick={() => setIsWhatsAppOpen(true)}
              className="w-10 h-10 rounded-full hover:bg-muted/60"
              title="WhatsApp"
            >
              <FaWhatsapp className="h-5 w-5 text-[hsl(142,70%,45%)]" />
            </Button>
          )}

          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full hover:bg-muted/60"
              title={
                theme === "dark"
                  ? "Mudar para tema claro"
                  : "Mudar para tema escuro"
              }
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Moon className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
          )}

          <CompanySelector />

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-3 h-10 px-3 rounded-full hover:bg-muted/60"
              >
                <Avatar className="w-8 h-8 ring-2 ring-transparent hover:ring-primary/20 transition-all">
                  <AvatarImage
                    src={profile?.avatar_url || undefined}
                    alt="User"
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {profile?.full_name ? (
                      getUserInitials(profile.full_name)
                    ) : user?.email ? (
                      getUserInitials(user.email)
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground leading-tight">
                    {displayName}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-3">
                <p className="text-sm font-medium leading-none text-foreground">
                  {displayName}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/perfil" className="flex items-center">
                  <User className="mr-3 h-4 w-4 text-muted-foreground" />
                  <span>Meu Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-3 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* WhatsApp Inbox Drawer */}
      <WhatsAppInboxDrawer
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
      />

      {/* Task Approval Dialog - rendered conditionally to avoid mounting useEmployees on every page */}
      {approvalTaskOpen && (
        <TaskDialog
          open={approvalTaskOpen}
          onOpenChange={(open) => {
            setApprovalTaskOpen(open);
            if (!open) {
              setApprovalTask(null);
              queryClient.invalidateQueries({
                queryKey: ["tasks-awaiting-approval"],
              });
            }
          }}
          task={approvalTask}
          onSave={handleSaveApprovalTask}
        />
      )}
    </header>
  );
}
