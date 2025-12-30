import { useState } from "react";
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
import { useClients } from "@/hooks/useClients";
import { Loader2 } from "lucide-react";

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

  const selectedClient = clients?.find((c) => c.id === clientId);

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

  // Sort clients alphabetically
  const sortedClients = clients
    ?.filter((c) => !c.is_canceled)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Planejamento de Conteúdo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="client">Cliente</Label>
            <Select value={clientId} onValueChange={handleClientChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {sortedClients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
