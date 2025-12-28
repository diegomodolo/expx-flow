import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useClientDirectory, useClientDirectoryFilter } from "@/hooks/useClientDirectory";
import { Search, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientQuickSwitchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentClientId: string;
}

export function ClientQuickSwitch({ open, onOpenChange, currentClientId }: ClientQuickSwitchProps) {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const { clients, loading } = useClientDirectory();
  const filteredClients = useClientDirectoryFilter(clients, search);

  const handleSelectClient = (clientId: string) => {
    // Get the current sub-route (e.g., /campanhas, /criativos, etc.)
    const currentPath = location.pathname;
    const currentClientPath = `/clientes/${currentClientId}`;
    const subRoute = currentPath.replace(currentClientPath, "") || "";
    
    // Navigate to the same sub-route for the new client
    const newPath = `/clientes/${clientId}${subRoute}`;
    navigate(newPath);
    
    setSearch("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Trocar de Cliente</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        <ScrollArea className="h-[420px] -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Nenhum cliente encontrado
            </div>
          ) : (
            <div className="space-y-1">
              {filteredClients.map((client) => {
                const isCurrentClient = client.id === currentClientId;
                return (
                  <button
                    key={client.id}
                    onClick={() => !isCurrentClient && handleSelectClient(client.id)}
                    disabled={isCurrentClient}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                      isCurrentClient
                        ? "bg-primary/10 cursor-default"
                        : "hover:bg-muted cursor-pointer"
                    )}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={client.avatar || undefined} alt={client.name} />
                      <AvatarFallback className="text-xs">
                        {client.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium truncate",
                        isCurrentClient && "text-primary"
                      )}>
                        {client.name}
                        {isCurrentClient && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            (atual)
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {client.company}
                      </p>
                    </div>
                    {!isCurrentClient && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
