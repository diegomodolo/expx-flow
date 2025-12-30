import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useClients } from "@/hooks/useClients";
import { Loader2, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    client_id: string;
    name: string;
    month: number;
    year: number;
  }) => void;
  isLoading?: boolean;
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const currentYear = new Date().getFullYear();
const years = [currentYear, currentYear + 1, currentYear + 2];

export function CreatePlanDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreatePlanDialogProps) {
  const { clients } = useClients();
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState(currentYear.toString());
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);

  const selectedClient = clients?.find((c) => c.id === clientId);

  // Sort clients alphabetically
  const sortedClients = useMemo(() => {
    return clients
      ?.filter((c) => !c.is_canceled)
      .sort((a, b) => a.name.localeCompare(b.name)) ?? [];
  }, [clients]);

  const handleSubmit = () => {
    if (!clientId || !name) return;

    onSubmit({
      client_id: clientId,
      name,
      month: parseInt(month),
      year: parseInt(year),
    });
  };

  const handleClientChange = (value: string) => {
    setClientId(value);
    const client = clients?.find((c) => c.id === value);
    if (client) {
      const monthName = monthNames[parseInt(month) - 1];
      setName(`Planejamento ${monthName} ${year} - ${client.name}`);
    }
  };

  const handleMonthChange = (value: string) => {
    setMonth(value);
    if (selectedClient) {
      const monthName = monthNames[parseInt(value) - 1];
      setName(`Planejamento ${monthName} ${year} - ${selectedClient.name}`);
    }
  };

  const handleYearChange = (value: string) => {
    setYear(value);
    if (selectedClient) {
      const monthName = monthNames[parseInt(month) - 1];
      setName(`Planejamento ${monthName} ${value} - ${selectedClient.name}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Planejamento de Conteúdo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="client">Cliente</Label>
            <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientPopoverOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedClient ? selectedClient.name : "Selecione o cliente"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar cliente..." />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                    <CommandGroup>
                      {sortedClients.map((client) => (
                        <CommandItem
                          key={client.id}
                          value={client.name}
                          onSelect={() => {
                            handleClientChange(client.id);
                            setClientPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              clientId === client.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {client.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Mês</Label>
              <Select value={month} onValueChange={handleMonthChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((monthName, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {monthName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Ano</Label>
              <Select value={year} onValueChange={handleYearChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome do Planejamento</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Planejamento Janeiro 2026 - Cliente"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!clientId || !name || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              "Criar Planejamento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
