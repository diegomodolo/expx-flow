import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetaPixel, SendEventParams } from "@/hooks/useMetaPixels";
import { Loader2 } from "lucide-react";

interface SendEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pixel: MetaPixel | null;
  onSend: (params: SendEventParams) => Promise<any>;
}

const STANDARD_EVENTS = [
  { value: "Lead", label: "Lead - Cadastro de lead" },
  { value: "Purchase", label: "Purchase - Compra realizada" },
  { value: "AddToCart", label: "AddToCart - Adicionado ao carrinho" },
  { value: "InitiateCheckout", label: "InitiateCheckout - Iniciou checkout" },
  { value: "CompleteRegistration", label: "CompleteRegistration - Registro completo" },
  { value: "Contact", label: "Contact - Contato realizado" },
  { value: "Schedule", label: "Schedule - Agendamento" },
  { value: "ViewContent", label: "ViewContent - Visualizou conteúdo" },
  { value: "Search", label: "Search - Pesquisa" },
  { value: "AddPaymentInfo", label: "AddPaymentInfo - Info de pagamento" },
  { value: "Subscribe", label: "Subscribe - Assinatura" },
  { value: "StartTrial", label: "StartTrial - Início de trial" },
];

const ACTION_SOURCES = [
  { value: "website", label: "Website" },
  { value: "app", label: "Aplicativo" },
  { value: "phone_call", label: "Ligação telefônica" },
  { value: "chat", label: "Chat" },
  { value: "email", label: "Email" },
  { value: "physical_store", label: "Loja física" },
  { value: "system_generated", label: "Sistema (automático)" },
  { value: "other", label: "Outro" },
];

export function SendEventModal({
  open,
  onOpenChange,
  pixel,
  onSend,
}: SendEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [eventName, setEventName] = useState("Lead");
  const [actionSource, setActionSource] = useState("system_generated");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [contentName, setContentName] = useState("");

  const handleSend = async () => {
    if (!pixel) return;

    setLoading(true);
    try {
      const params: SendEventParams = {
        pixelId: pixel.pixel_id,
        eventName,
        actionSource: actionSource as any,
        userData: {
          ...(email && { email }),
          ...(phone && { phone }),
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
        },
      };

      // Add custom data if provided
      if (value || contentName) {
        params.customData = {
          ...(value && { value: parseFloat(value) }),
          ...(value && { currency }),
          ...(contentName && { contentName }),
        };
      }

      await onSend(params);
      onOpenChange(false);
      
      // Reset form
      setEmail("");
      setPhone("");
      setFirstName("");
      setLastName("");
      setValue("");
      setContentName("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Enviar Evento de Conversão</DialogTitle>
          <DialogDescription>
            Envie um evento para o pixel {pixel?.pixel_name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="event" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="event">Evento</TabsTrigger>
            <TabsTrigger value="user">Dados do Usuário</TabsTrigger>
            <TabsTrigger value="custom">Dados Adicionais</TabsTrigger>
          </TabsList>

          <TabsContent value="event" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Tipo de Evento</Label>
              <Select value={eventName} onValueChange={setEventName}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STANDARD_EVENTS.map((event) => (
                    <SelectItem key={event.value} value={event.value}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Origem da Ação</Label>
              <Select value={actionSource} onValueChange={setActionSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_SOURCES.map((source) => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="user" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Os dados serão automaticamente hasheados (SHA256) antes de enviar ao Meta.
            </p>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                type="tel"
                placeholder="+5511999999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  placeholder="Nome"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Sobrenome</Label>
                <Input
                  placeholder="Sobrenome"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL - Real</SelectItem>
                    <SelectItem value="USD">USD - Dólar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome do Conteúdo</Label>
              <Input
                placeholder="Nome do produto ou serviço"
                value={contentName}
                onChange={(e) => setContentName(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={loading || !email && !phone}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enviar Evento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
