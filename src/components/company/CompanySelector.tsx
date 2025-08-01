import { Check, ChevronsUpDown, Plus } from "lucide-react";
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
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between"
        >
          {activeCompany ? (
            <div className="flex items-center gap-2">
              <span className="truncate">{activeCompany.company?.name}</span>
              <Badge variant={getRoleBadgeVariant(activeCompany.role)} className="text-xs">
                {getRoleLabel(activeCompany.role)}
              </Badge>
            </div>
          ) : (
            "Selecionar empresa..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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