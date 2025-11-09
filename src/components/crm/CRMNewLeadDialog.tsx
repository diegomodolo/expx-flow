import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCRMLeads, CRMStage } from "@/hooks/useCRMLeads";
import { Loader2 } from "lucide-react";

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const temperatureOptions = [
  { value: 'cold', label: '❄️ Frio - Sem interesse imediato', color: '#3b82f6' },
  { value: 'warm', label: '☀️ Morno - Interesse moderado', color: '#f59e0b' },
  { value: 'hot', label: '🔥 Quente - Pronto para fechar', color: '#ef4444' },
];

interface CRMNewLeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stages: CRMStage[];
  workspaceId: string;
  boardId: string;
}

export function CRMNewLeadDialog({ isOpen, onClose, stages, workspaceId, boardId }: CRMNewLeadDialogProps) {
  const { createLead, isCreatingLead } = useCRMLeads(workspaceId, boardId);
  
  const [formData, setFormData] = useState({
    // Básico
    full_name: '',
    email: '',
    phone: '',
    company_name: '',
    temperature: '',
    stage_id: stages[0]?.id || '',
    
    // Contato e Social
    facebook: '',
    instagram: '',
    website: '',
    city: '',
    state: '',
    
    // Rastreamento
    utm_source: '',
    utm_media: '',
    utm_campaign: '',
    
    // Vendas
    start_date: '',
    expected_close_date: '',
    quantity: '1',
    value: '',
    
    // Observações
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.full_name.trim()) {
      alert("Nome completo é obrigatório");
      return;
    }

    if (!formData.email && !formData.phone) {
      alert("Preencha pelo menos Email ou Telefone");
      return;
    }

    if (!formData.stage_id) {
      alert("Selecione um estágio inicial");
      return;
    }

    await createLead({
      stage_id: formData.stage_id,
      full_name: formData.full_name.trim(),
      email: formData.email || null,
      phone: formData.phone || null,
      company_name: formData.company_name || null,
      facebook: formData.facebook || null,
      instagram: formData.instagram || null,
      website: formData.website || null,
      city: formData.city || null,
      state: formData.state || null,
      utm_source: formData.utm_source || null,
      utm_media: formData.utm_media || null,
      utm_campaign: formData.utm_campaign || null,
      temperature: formData.temperature || null,
      start_date: formData.start_date || null,
      expected_close_date: formData.expected_close_date || null,
      quantity: parseInt(formData.quantity) || 1,
      value: formData.value ? parseFloat(formData.value) : null,
      notes: formData.notes || null,
    } as any);

    // Reset form
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      company_name: '',
      temperature: '',
      stage_id: stages[0]?.id || '',
      facebook: '',
      instagram: '',
      website: '',
      city: '',
      state: '',
      utm_source: '',
      utm_media: '',
      utm_campaign: '',
      start_date: '',
      expected_close_date: '',
      quantity: '1',
      value: '',
      notes: '',
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="contact">Contato</TabsTrigger>
              <TabsTrigger value="tracking">Rastreamento</TabsTrigger>
              <TabsTrigger value="sales">Vendas</TabsTrigger>
              <TabsTrigger value="notes">Observações</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Nome completo do lead"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <Label htmlFor="company_name">Empresa</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Nome da empresa"
                  />
                </div>

                <div>
                  <Label htmlFor="temperature">Temperatura</Label>
                  <Select value={formData.temperature} onValueChange={(value) => setFormData({ ...formData, temperature: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a temperatura" />
                    </SelectTrigger>
                    <SelectContent>
                      {temperatureOptions.map((temp) => (
                        <SelectItem key={temp.value} value={temp.value}>
                          {temp.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="stage_id">Estágio Inicial *</Label>
                  <Select value={formData.stage_id} onValueChange={(value) => setFormData({ ...formData, stage_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o estágio" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    placeholder="facebook.com/usuario"
                  />
                </div>

                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="@usuario"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://exemplo.com"
                  />
                </div>

                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="São Paulo"
                  />
                </div>

                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Select value={formData.state} onValueChange={(value) => setFormData({ ...formData, state: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {brazilianStates.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tracking" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="utm_source">UTM Source</Label>
                  <Input
                    id="utm_source"
                    value={formData.utm_source}
                    onChange={(e) => setFormData({ ...formData, utm_source: e.target.value })}
                    placeholder="google, facebook, instagram"
                  />
                </div>

                <div>
                  <Label htmlFor="utm_media">UTM Media</Label>
                  <Input
                    id="utm_media"
                    value={formData.utm_media}
                    onChange={(e) => setFormData({ ...formData, utm_media: e.target.value })}
                    placeholder="cpc, organic, social"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="utm_campaign">UTM Campaign</Label>
                  <Input
                    id="utm_campaign"
                    value={formData.utm_campaign}
                    onChange={(e) => setFormData({ ...formData, utm_campaign: e.target.value })}
                    placeholder="Nome da campanha"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sales" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Data de Início</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="expected_close_date">Previsão de Fechamento</Label>
                  <Input
                    id="expected_close_date"
                    type="datetime-local"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="value">Valor (R$)</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Adicione observações sobre o lead..."
                  rows={8}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreatingLead}>
              {isCreatingLead && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
