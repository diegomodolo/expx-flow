import { Check, ChevronsUpDown, ChevronDown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const CompanySelector = () => {
  const [open, setOpen] = useState(false);
  const { activeCompany, companies, setActiveCompany } = useCompany();

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Proprietário';
      case 'admin':
        return 'Admin';
      default:
        return 'Membro';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="flex items-center gap-2 h-auto p-2 hover:bg-muted/50"
        >
          {activeCompany ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded flex items-center justify-center overflow-hidden">
                {activeCompany.company?.logo ? (
                  <img 
                    src={activeCompany.company.logo} 
                    alt={`${activeCompany.company.name} logo`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium text-foreground">
                    {activeCompany.company?.name}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {getRoleLabel(activeCompany.role)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                <Building2 className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium text-foreground">Selecionar empresa</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">Nenhuma selecionada</span>
              </div>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Buscar empresa..." />
          <CommandList>
            <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
            <CommandGroup>
              {companies.map((companyMember) => (
                <CommandItem
                  key={companyMember.id}
                  value={companyMember.company?.name}
                  onSelect={() => {
                    setActiveCompany(companyMember);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      activeCompany?.id === companyMember.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate">{companyMember.company?.name}</span>
                    <Badge variant={getRoleBadgeVariant(companyMember.role)} className="text-xs ml-2">
                      {getRoleLabel(companyMember.role)}
                    </Badge>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};