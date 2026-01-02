import { AlertTriangle, Sun, Moon, LogOut, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { CompanySelector } from "@/components/company/CompanySelector";
import { Link, useNavigate } from "react-router-dom";
import { useLeadDisqualificationNotifications } from "@/hooks/useLeadDisqualificationNotifications";
import { Badge } from "@/components/ui/badge";
import { PendingAdsNotification } from "@/components/notifications/PendingAdsNotification";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export function DashboardHeader() {
  const navigate = useNavigate();
  
  let user = null;
  let signOut = null;
  let toast = null;
  let profile = null;
  let unviewedCount = 0;
  let markAllAsViewed = null;
  
  try {
    const auth = useAuth();
    const toastHook = useToast();
    const userProfile = useUserProfile();
    const notifications = useLeadDisqualificationNotifications();
    user = auth.user;
    signOut = auth.signOut;
    toast = toastHook.toast;
    profile = userProfile.profile;
    unviewedCount = notifications.unviewedCount;
    markAllAsViewed = notifications.markAllAsViewed;
  } catch (error) {
    toast = () => {};
    signOut = async () => ({ error: null });
    profile = null;
  }

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    if (!signOut) return;
    
    const { error } = await signOut();
    if (error && toast) {
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: error.message
      });
    } else if (toast) {
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso"
      });
    }
  };

  const getUserInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = profile?.full_name || user?.email || "Usuário";

  const handleNotificationClick = async () => {
    if (markAllAsViewed) {
      await markAllAsViewed();
    }
    navigate('/leads-desqualificados');
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    if (toast) {
      toast({
        title: `Tema ${newTheme === "dark" ? "escuro" : "claro"} ativado`,
        description: "O tema foi alterado com sucesso"
      });
    }
  };

  return (
    <header className="h-16 bg-card shadow-google-sm z-20 shrink-0">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left side - empty for alignment */}
        <div className="flex items-center">
          {/* Space for potential breadcrumbs or page title */}
        </div>
        
        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Notification Icon */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNotificationClick}
            className="relative w-10 h-10 rounded-full hover:bg-muted/60"
          >
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            {unviewedCount > 0 && (
              <Badge 
                className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 flex items-center justify-center text-xs bg-destructive hover:bg-destructive"
              >
                {unviewedCount > 99 ? '99+' : unviewedCount}
              </Badge>
            )}
          </Button>

          {/* Pending Ads Notification */}
          <PendingAdsNotification />
          
          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full hover:bg-muted/60"
              title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
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
                  <AvatarImage src={profile?.avatar_url || undefined} alt="User" />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {profile?.full_name ? getUserInitials(profile.full_name) : 
                     user?.email ? getUserInitials(user.email) : <User className="h-4 w-4" />}
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
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-3 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
