import { Search, Bell, Settings, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function DashboardHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center space-x-6">
          <SidebarTrigger className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground" />
          <div className="flex items-center space-x-3">
            <div className="font-bold text-xl text-primary" style={{ fontFamily: 'Pacifico, cursive' }}>
              logo
            </div>
            <div className="h-6 w-px bg-border"></div>
            <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Buscar campanhas, clientes..." 
              className="w-80 h-10 pl-10 pr-4 bg-muted border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
            />
          </div>
          
          <div className="relative">
            <Button size="icon" variant="ghost" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-danger-foreground text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </Button>
          </div>
          
          <div className="flex items-center space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src="/placeholder-avatar.jpg" alt="Marina Silva" />
              <AvatarFallback>MS</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground">Marina Silva</span>
          </div>
          
          <Button size="icon" variant="ghost">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}