import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ConversionEventSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  campaignObjective?: string;
}

const CONVERSION_EVENTS = [
  {
    group: "Vendas",
    events: [
      { value: "PURCHASE", label: "Compra", description: "Quando alguém completa uma compra" },
      { value: "ADD_TO_CART", label: "Adicionar ao Carrinho", description: "Quando alguém adiciona um item ao carrinho" },
      { value: "INITIATE_CHECKOUT", label: "Iniciar Checkout", description: "Quando alguém inicia o checkout" },
      { value: "ADD_PAYMENT_INFO", label: "Adicionar Pagamento", description: "Quando alguém adiciona info de pagamento" },
    ]
  },
  {
    group: "Leads",
    events: [
      { value: "LEAD", label: "Lead", description: "Quando alguém se torna um lead" },
      { value: "COMPLETE_REGISTRATION", label: "Cadastro Completo", description: "Quando alguém completa um cadastro" },
      { value: "CONTACT", label: "Contato", description: "Quando alguém entra em contato" },
      { value: "SCHEDULE", label: "Agendamento", description: "Quando alguém agenda algo" },
      { value: "SUBMIT_APPLICATION", label: "Enviar Aplicação", description: "Quando alguém envia uma aplicação" },
    ]
  },
  {
    group: "Engajamento",
    events: [
      { value: "VIEW_CONTENT", label: "Visualizar Conteúdo", description: "Quando alguém visualiza conteúdo" },
      { value: "SEARCH", label: "Pesquisar", description: "Quando alguém faz uma pesquisa" },
      { value: "FIND_LOCATION", label: "Encontrar Local", description: "Quando alguém busca um local" },
    ]
  },
  {
    group: "Assinaturas",
    events: [
      { value: "START_TRIAL", label: "Iniciar Trial", description: "Quando alguém inicia um período de teste" },
      { value: "SUBSCRIBE", label: "Assinar", description: "Quando alguém assina um serviço" },
    ]
  },
];

// Objetivos que requerem seleção de evento de conversão
const CONVERSION_OBJECTIVES = ['OUTCOME_SALES', 'OUTCOME_LEADS'];

export function ConversionEventSelector({ 
  value, 
  onChange, 
  disabled,
  campaignObjective 
}: ConversionEventSelectorProps) {
  // Mostra apenas para objetivos de conversão
  const showSelector = campaignObjective && CONVERSION_OBJECTIVES.includes(campaignObjective);
  
  if (!showSelector) {
    return null;
  }

  const selectedEvent = CONVERSION_EVENTS
    .flatMap(g => g.events)
    .find(e => e.value === value);

  return (
    <div className="space-y-2">
      <Label htmlFor="conversion-event">
        Evento de Conversão {!disabled && "*"}
      </Label>
      <Select
        value={value || "none"}
        onValueChange={(v) => onChange(v === "none" ? "" : v)}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={disabled ? "Selecione um pixel primeiro" : "Selecione o evento de conversão"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Nenhum evento</SelectItem>
          {CONVERSION_EVENTS.map((group) => (
            <SelectGroup key={group.group}>
              <SelectLabel>{group.group}</SelectLabel>
              {group.events.map((event) => (
                <SelectItem key={event.value} value={event.value}>
                  {event.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      {selectedEvent && (
        <p className="text-xs text-muted-foreground">
          {selectedEvent.description}
        </p>
      )}
      {disabled && (
        <p className="text-xs text-muted-foreground">
          Selecione um pixel para habilitar a seleção de evento
        </p>
      )}
    </div>
  );
}
