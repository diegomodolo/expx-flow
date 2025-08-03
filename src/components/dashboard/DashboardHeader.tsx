import { Search, Bell, Settings, LogOut, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { CompanySelector } from "@/components/company/CompanySelector";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DashboardHeader() {
  // Check if we're within AuthProvider context
  let user = null;
  let signOut = null;
  let toast = null;
  let profile = null;
  
  try {
    const auth = useAuth();
    const toastHook = useToast();
    const userProfile = useUserProfile();
    user = auth.user;
    signOut = auth.signOut;
    toast = toastHook.toast;
    profile = userProfile.profile;
  } catch (error) {
    // Not within AuthProvider, use fallback values
    toast = () => {}; // No-op function
    signOut = async () => ({ error: null });
    profile = null;
  }

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

  return (
    <header className="h-16 bg-card border-b border-border z-20 shrink-0">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center space-x-6">
          <SidebarTrigger className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground" />
          <img 
            src="/lovable-uploads/9e57fd65-0f5a-477a-99bb-948a28292f48.png" 
            alt="Controle de Trafego" 
            className="w-8 h-8 object-contain"
          />
          <div className="h-6 w-px bg-border"></div>
          <h1 className="text-lg font-semibold text-foreground">Controle de Trafego</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <CompanySelector />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-auto p-2 hover:bg-muted/50">
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-foreground">
                      {displayName}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profile?.avatar_url || undefined} alt="User" />
                  <AvatarFallback>
                    {profile?.full_name ? getUserInitials(profile.full_name) : 
                     user?.email ? getUserInitials(user.email) : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">
                  {displayName}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/configuracoes" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}